import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "redis";
import { ChatSDKError } from "../errors";
import {
  type CreditBalance,
  type CreditTransaction,
  creditBalance,
  creditTransaction,
  type GuestSession,
  guestSession,
} from "../db/schema";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Redis client for guest session management
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    await redisClient.connect();
  }

  return redisClient;
}

/**
 * Calculate credits for a given text output.
 * Formula: credits = (character_count / 20) rounded to 2 decimal places
 * 
 * @param text - The text to calculate credits for
 * @returns The calculated credits, always >= 0 and rounded to 2 decimal places
 */
export function calculateCredits(text: string): number {
  // Count all characters including whitespace, punctuation, and Unicode
  const characterCount = text.length;
  
  // Apply formula: credits = character_count / 20
  const rawCredits = characterCount / 20;
  
  // Round to 2 decimal places
  const roundedCredits = Math.round(rawCredits * 100) / 100;
  
  // Ensure non-negative
  return Math.max(0, roundedCredits);
}

/**
 * Get credit balance for an authenticated user.
 * 
 * @param userId - The user's ID
 * @returns The user's credit balance
 * @throws ChatSDKError if the user doesn't have a credit balance record
 */
export async function getBalance(userId: string): Promise<CreditBalance> {
  try {
    const [balance] = await db
      .select()
      .from(creditBalance)
      .where(eq(creditBalance.userId, userId));

    if (!balance) {
      throw new ChatSDKError(
        "not_found:database",
        "Credit balance not found for user"
      );
    }

    return balance;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get credit balance"
    );
  }
}

/**
 * Get credit balance for a guest session.
 * 
 * @param sessionId - The guest session ID
 * @returns The guest session's credit balance
 * @throws ChatSDKError if the session doesn't exist
 */
export async function getGuestBalance(sessionId: string): Promise<number> {
  try {
    const [session] = await db
      .select()
      .from(guestSession)
      .where(eq(guestSession.sessionId, sessionId));

    if (!session) {
      throw new ChatSDKError(
        "not_found:database",
        "Guest session not found"
      );
    }

    // Convert decimal string to number
    return Number.parseFloat(session.balance);
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get guest balance"
    );
  }
}

/**
 * Deduct credits from an authenticated user's balance.
 * Uses database transaction with row-level locking to prevent race conditions.
 * 
 * @param params - Deduction parameters
 * @param params.userId - The user's ID
 * @param params.amount - The amount of credits to deduct
 * @param params.description - Description of the transaction
 * @param params.metadata - Optional metadata for the transaction
 * @returns The created credit transaction record
 * @throws ChatSDKError if insufficient credits or database error
 */
export async function deductCredits(params: {
  userId: string;
  amount: number;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<CreditTransaction> {
  const { userId, amount, description, metadata } = params;

  // Validate amount is positive
  if (amount < 0) {
    throw new ChatSDKError(
      "bad_request:database",
      "Credit deduction amount must be positive"
    );
  }

  // Round amount to 2 decimal places
  const roundedAmount = Math.round(amount * 100) / 100;

  try {
    // Use database transaction with row-level locking
    const result = await db.transaction(async (tx) => {
      // Lock the user's credit balance row for update
      const [balance] = await tx
        .select()
        .from(creditBalance)
        .where(eq(creditBalance.userId, userId))
        .for("update");

      if (!balance) {
        throw new ChatSDKError(
          "not_found:database",
          "Credit balance not found for user"
        );
      }

      // Convert balance to number for comparison
      const currentBalance = Number.parseFloat(balance.balance);

      // Validate sufficient balance
      if (currentBalance < roundedAmount) {
        throw new ChatSDKError(
          "bad_request:database",
          `Insufficient credits. Current balance: ${currentBalance}, Required: ${roundedAmount}`
        );
      }

      // Calculate new balance
      const newBalance = Math.round((currentBalance - roundedAmount) * 100) / 100;

      // Update credit balance
      await tx
        .update(creditBalance)
        .set({
          balance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(creditBalance.userId, userId));

      // Record transaction
      const [transaction] = await tx
        .insert(creditTransaction)
        .values({
          userId,
          type: "deduction",
          amount: roundedAmount.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description,
          metadata: metadata ? metadata : null,
        })
        .returning();

      return transaction;
    });

    return result;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    console.error("Failed to deduct credits:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to deduct credits"
    );
  }
}


/**
 * Deduct credits from a guest session.
 * Updates Redis session storage if available, otherwise falls back to database.
 * 
 * @param sessionId - The guest session ID
 * @param amount - The amount of credits to deduct
 * @returns The new balance after deduction
 * @throws ChatSDKError if insufficient credits or session not found
 */
export async function deductGuestCredits(
  sessionId: string,
  amount: number
): Promise<number> {
  // Validate amount is positive
  if (amount < 0) {
    throw new ChatSDKError(
      "bad_request:database",
      "Credit deduction amount must be positive"
    );
  }

  // Round amount to 2 decimal places
  const roundedAmount = Math.round(amount * 100) / 100;

  try {
    const redis = await getRedisClient();

    if (redis) {
      // Use Redis for guest session storage
      const key = `guest:${sessionId}`;
      const sessionData = await redis.get(key);

      if (!sessionData) {
        throw new ChatSDKError(
          "not_found:database",
          "Guest session not found"
        );
      }

      const session = JSON.parse(sessionData) as GuestSession;
      const currentBalance = Number.parseFloat(session.balance);

      // Validate sufficient balance
      if (currentBalance < roundedAmount) {
        throw new ChatSDKError(
          "bad_request:database",
          `Insufficient credits. Current balance: ${currentBalance}, Required: ${roundedAmount}`
        );
      }

      // Calculate new balance
      const newBalance = Math.round((currentBalance - roundedAmount) * 100) / 100;

      // Update session in Redis
      session.balance = newBalance.toFixed(2);
      await redis.set(key, JSON.stringify(session), {
        EX: 24 * 60 * 60, // 24 hours TTL
      });

      return newBalance;
    }

    // Fallback to database if Redis is not available
    const result = await db.transaction(async (tx) => {
      // Lock the guest session row for update
      const [session] = await tx
        .select()
        .from(guestSession)
        .where(eq(guestSession.sessionId, sessionId))
        .for("update");

      if (!session) {
        throw new ChatSDKError(
          "not_found:database",
          "Guest session not found"
        );
      }

      const currentBalance = Number.parseFloat(session.balance);

      // Validate sufficient balance
      if (currentBalance < roundedAmount) {
        throw new ChatSDKError(
          "bad_request:database",
          `Insufficient credits. Current balance: ${currentBalance}, Required: ${roundedAmount}`
        );
      }

      // Calculate new balance
      const newBalance = Math.round((currentBalance - roundedAmount) * 100) / 100;

      // Update guest session balance
      await tx
        .update(guestSession)
        .set({
          balance: newBalance.toFixed(2),
        })
        .where(eq(guestSession.sessionId, sessionId));

      return newBalance;
    });

    return result;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    console.error("Failed to deduct guest credits:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to deduct guest credits"
    );
  }
}

/**
 * Add credits to an authenticated user's balance.
 * Uses database transaction with row-level locking to prevent race conditions.
 * Supports types: purchase, bonus, monthly_allowance
 * 
 * @param params - Addition parameters
 * @param params.userId - The user's ID
 * @param params.amount - The amount of credits to add
 * @param params.type - The type of credit addition (purchase, bonus, monthly_allowance)
 * @param params.description - Description of the transaction
 * @param params.metadata - Optional metadata for the transaction
 * @returns The created credit transaction record
 * @throws ChatSDKError if invalid parameters or database error
 */
export async function addCredits(params: {
  userId: string;
  amount: number;
  type: "purchase" | "bonus" | "monthly_allowance";
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<CreditTransaction> {
  const { userId, amount, type, description, metadata } = params;

  // Validate amount is positive
  if (amount <= 0) {
    throw new ChatSDKError(
      "bad_request:database",
      "Credit addition amount must be positive"
    );
  }

  // Validate type
  const validTypes = ["purchase", "bonus", "monthly_allowance"];
  if (!validTypes.includes(type)) {
    throw new ChatSDKError(
      "bad_request:database",
      `Invalid credit type. Must be one of: ${validTypes.join(", ")}`
    );
  }

  // Round amount to 2 decimal places
  const roundedAmount = Math.round(amount * 100) / 100;

  try {
    // Use database transaction with row-level locking
    const result = await db.transaction(async (tx) => {
      // Lock the user's credit balance row for update
      const [balance] = await tx
        .select()
        .from(creditBalance)
        .where(eq(creditBalance.userId, userId))
        .for("update");

      if (!balance) {
        throw new ChatSDKError(
          "not_found:database",
          "Credit balance not found for user"
        );
      }

      // Convert balance to number for calculation
      const currentBalance = Number.parseFloat(balance.balance);

      // Calculate new balance
      const newBalance = Math.round((currentBalance + roundedAmount) * 100) / 100;

      // Update credit balance
      await tx
        .update(creditBalance)
        .set({
          balance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(creditBalance.userId, userId));

      // Record transaction
      const [transaction] = await tx
        .insert(creditTransaction)
        .values({
          userId,
          type,
          amount: roundedAmount.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description,
          metadata: metadata ? metadata : null,
        })
        .returning();

      return transaction;
    });

    return result;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    console.error("Failed to add credits:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to add credits"
    );
  }
}

/**
 * Allocate new user bonus credits (1000 credits).
 * Checks isNewUser flag to prevent duplicate allocation.
 * 
 * @param userId - The user's ID
 * @throws ChatSDKError if user not found, already received bonus, or database error
 */
export async function allocateNewUserBonus(userId: string): Promise<void> {
  try {
    // Use database transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // Lock the user's credit balance row for update
      const [balance] = await tx
        .select()
        .from(creditBalance)
        .where(eq(creditBalance.userId, userId))
        .for("update");

      if (!balance) {
        throw new ChatSDKError(
          "not_found:database",
          "Credit balance not found for user"
        );
      }

      // Check if user has already received the bonus
      if (!balance.isNewUser) {
        throw new ChatSDKError(
          "bad_request:database",
          "User has already received the new user bonus"
        );
      }

      // Convert balance to number for calculation
      const currentBalance = Number.parseFloat(balance.balance);

      // Add 1000 credits
      const bonusAmount = 1000.0;
      const newBalance = Math.round((currentBalance + bonusAmount) * 100) / 100;

      // Update credit balance and set isNewUser to false
      await tx
        .update(creditBalance)
        .set({
          balance: newBalance.toFixed(2),
          isNewUser: false,
          updatedAt: new Date(),
        })
        .where(eq(creditBalance.userId, userId));

      // Record transaction
      await tx
        .insert(creditTransaction)
        .values({
          userId,
          type: "bonus",
          amount: bonusAmount.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: "New user bonus",
          metadata: null,
        });
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    console.error("Failed to allocate new user bonus:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to allocate new user bonus"
    );
  }
}

/**
 * Allocate monthly credits (200 credits).
 * Checks lastMonthlyAllocation to prevent duplicate allocation in the same month.
 * 
 * @param userId - The user's ID
 * @throws ChatSDKError if user not found, already received allocation this month, or database error
 */
export async function allocateMonthlyCredits(userId: string): Promise<void> {
  try {
    // Use database transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // Lock the user's credit balance row for update
      const [balance] = await tx
        .select()
        .from(creditBalance)
        .where(eq(creditBalance.userId, userId))
        .for("update");

      if (!balance) {
        throw new ChatSDKError(
          "not_found:database",
          "Credit balance not found for user"
        );
      }

      // Check if user has already received monthly allocation this month
      const now = new Date();
      if (balance.lastMonthlyAllocation) {
        const lastAllocation = new Date(balance.lastMonthlyAllocation);
        
        // Check if we're in the same month and year
        if (
          lastAllocation.getMonth() === now.getMonth() &&
          lastAllocation.getFullYear() === now.getFullYear()
        ) {
          throw new ChatSDKError(
            "bad_request:database",
            "User has already received monthly allocation for this month"
          );
        }
      }

      // Convert balance to number for calculation
      const currentBalance = Number.parseFloat(balance.balance);

      // Add 200 credits
      const monthlyAmount = 200.0;
      const newBalance = Math.round((currentBalance + monthlyAmount) * 100) / 100;

      // Update credit balance and lastMonthlyAllocation timestamp
      await tx
        .update(creditBalance)
        .set({
          balance: newBalance.toFixed(2),
          lastMonthlyAllocation: now,
          updatedAt: new Date(),
        })
        .where(eq(creditBalance.userId, userId));

      // Record transaction
      await tx
        .insert(creditTransaction)
        .values({
          userId,
          type: "monthly_allowance",
          amount: monthlyAmount.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: "Monthly credit allowance",
          metadata: null,
        });
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    console.error("Failed to allocate monthly credits:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to allocate monthly credits"
    );
  }
}

/**
 * Get transaction history for an authenticated user.
 * Returns transactions in reverse chronological order (newest first).
 * Supports pagination with limit and offset.
 * 
 * @param params - Query parameters
 * @param params.userId - The user's ID
 * @param params.limit - Maximum number of transactions to return (default: 10)
 * @param params.offset - Number of transactions to skip (default: 0)
 * @returns Array of credit transactions
 * @throws ChatSDKError if database error occurs
 */
export async function getTransactionHistory(params: {
  userId: string;
  limit?: number;
  offset?: number;
}): Promise<CreditTransaction[]> {
  const { userId, limit = 10, offset = 0 } = params;

  try {
    const transactions = await db
      .select()
      .from(creditTransaction)
      .where(eq(creditTransaction.userId, userId))
      .orderBy(desc(creditTransaction.createdAt))
      .limit(limit)
      .offset(offset);

    return transactions;
  } catch (error) {
    console.error("Failed to get transaction history:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to retrieve transaction history"
    );
  }
}

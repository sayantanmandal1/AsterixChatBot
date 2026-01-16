import "server-only";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "redis";
import { ChatSDKError } from "../errors";
import {
  type GuestSession,
  guestSession,
  chat,
  message,
  creditBalance,
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
 * Initialize a guest session with 200 credits.
 * Stores in Redis with 24-hour TTL if available, otherwise falls back to database.
 * 
 * @param sessionId - The guest session ID
 * @throws ChatSDKError if session initialization fails
 */
export async function initializeGuestSession(sessionId: string): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const session: GuestSession = {
      sessionId,
      balance: "200.00",
      createdAt: now,
      expiresAt,
    };

    const redis = await getRedisClient();

    if (redis) {
      // Store in Redis with 24-hour TTL
      const key = `guest:${sessionId}`;
      await redis.set(key, JSON.stringify(session), {
        EX: 24 * 60 * 60, // 24 hours TTL
      });
    } else {
      // Fallback to database if Redis is not available
      await db.insert(guestSession).values(session);
    }
  } catch (error) {
    console.error("Failed to initialize guest session:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to initialize guest session"
    );
  }
}

/**
 * Migrate guest session data to a user account.
 * Transfers chats and messages from guest user to authenticated user.
 * Also transfers any remaining credits from the guest session.
 * 
 * @param guestUserId - The guest user's ID (from the session)
 * @param userId - The authenticated user's ID
 * @throws ChatSDKError if migration fails
 */
export async function migrateGuestToUser(
  guestUserId: string,
  userId: string
): Promise<void> {
  try {
    // Use database transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // Migrate all chats from guest user to authenticated user
      await tx
        .update(chat)
        .set({ userId })
        .where(eq(chat.userId, guestUserId));

      // Note: Messages are linked to chats, so they automatically belong to the new user
      // through the chat relationship

      // Transfer any remaining guest credits to the authenticated user
      // First, check if guest has a credit balance
      const [guestBalance] = await tx
        .select()
        .from(creditBalance)
        .where(eq(creditBalance.userId, guestUserId));

      if (guestBalance) {
        const guestCredits = Number.parseFloat(guestBalance.balance);

        if (guestCredits > 0) {
          // Get authenticated user's balance
          const [userBalance] = await tx
            .select()
            .from(creditBalance)
            .where(eq(creditBalance.userId, userId))
            .for("update");

          if (userBalance) {
            // Add guest credits to user balance
            const currentBalance = Number.parseFloat(userBalance.balance);
            const newBalance = Math.round((currentBalance + guestCredits) * 100) / 100;

            await tx
              .update(creditBalance)
              .set({
                balance: newBalance.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(creditBalance.userId, userId));
          }
        }

        // Delete guest credit balance
        await tx
          .delete(creditBalance)
          .where(eq(creditBalance.userId, guestUserId));
      }
    });
  } catch (error) {
    console.error("Failed to migrate guest to user:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to migrate guest session to user account"
    );
  }
}

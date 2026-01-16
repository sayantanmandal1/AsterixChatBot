import "server-only";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { creditBalance, user } from "../db/schema";
import { allocateMonthlyCredits } from "../services/credit-service";
import { ChatSDKError } from "../errors";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Get all authenticated users who have credit balance records.
 * Excludes guest users (those with email starting with "guest-").
 * 
 * @returns Array of user IDs
 */
async function getAllAuthenticatedUsers(): Promise<string[]> {
  try {
    // Get all users with credit balance records
    const usersWithBalance = await db
      .select({
        userId: creditBalance.userId,
        email: user.email,
      })
      .from(creditBalance)
      .innerJoin(user, eq(creditBalance.userId, user.id));

    // Filter out guest users (email starts with "guest-")
    const authenticatedUserIds = usersWithBalance
      .filter((u) => !u.email.startsWith("guest-"))
      .map((u) => u.userId);

    return authenticatedUserIds;
  } catch (error) {
    console.error("Failed to get authenticated users:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to retrieve authenticated users"
    );
  }
}

/**
 * Check if a user is eligible for monthly allocation.
 * A user is eligible if:
 * - They have a credit balance record
 * - They haven't received allocation this month
 * 
 * @param userId - The user's ID
 * @returns True if eligible, false otherwise
 */
async function isEligibleForMonthlyAllocation(userId: string): Promise<boolean> {
  try {
    const [balance] = await db
      .select()
      .from(creditBalance)
      .where(eq(creditBalance.userId, userId));

    if (!balance) {
      return false;
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
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(`Failed to check eligibility for user ${userId}:`, error);
    return false;
  }
}

/**
 * Process monthly credit allocation for all eligible users.
 * This function should be called by a cron job daily at midnight UTC.
 * 
 * It will:
 * 1. Get all authenticated users
 * 2. Check each user's eligibility
 * 3. Allocate 200 credits to eligible users
 * 4. Log results
 * 
 * @returns Summary of allocation results
 */
export async function processMonthlyAllocations(): Promise<{
  totalUsers: number;
  eligibleUsers: number;
  successfulAllocations: number;
  failedAllocations: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const startTime = Date.now();
  console.log("[Monthly Allocation] Starting monthly credit allocation process...");

  const results = {
    totalUsers: 0,
    eligibleUsers: 0,
    successfulAllocations: 0,
    failedAllocations: 0,
    errors: [] as Array<{ userId: string; error: string }>,
  };

  try {
    // Get all authenticated users
    const userIds = await getAllAuthenticatedUsers();
    results.totalUsers = userIds.length;

    console.log(`[Monthly Allocation] Found ${results.totalUsers} authenticated users`);

    // Process each user
    for (const userId of userIds) {
      try {
        // Check eligibility
        const isEligible = await isEligibleForMonthlyAllocation(userId);

        if (!isEligible) {
          console.log(`[Monthly Allocation] User ${userId} is not eligible (already received allocation this month)`);
          continue;
        }

        results.eligibleUsers++;

        // Allocate monthly credits
        await allocateMonthlyCredits(userId);
        results.successfulAllocations++;

        console.log(`[Monthly Allocation] Successfully allocated 200 credits to user ${userId}`);
      } catch (error) {
        results.failedAllocations++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.errors.push({ userId, error: errorMessage });

        console.error(`[Monthly Allocation] Failed to allocate credits to user ${userId}:`, errorMessage);
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Monthly Allocation] Process completed in ${duration}ms. ` +
      `Total: ${results.totalUsers}, Eligible: ${results.eligibleUsers}, ` +
      `Successful: ${results.successfulAllocations}, Failed: ${results.failedAllocations}`
    );

    return results;
  } catch (error) {
    console.error("[Monthly Allocation] Fatal error during monthly allocation process:", error);
    throw error;
  }
}

/**
 * Cron job handler for Vercel Cron.
 * This function is designed to be called by Vercel Cron Jobs.
 * 
 * @returns Response object with status and results
 */
export async function monthlyAllocationCronHandler(): Promise<{
  success: boolean;
  message: string;
  results?: {
    totalUsers: number;
    eligibleUsers: number;
    successfulAllocations: number;
    failedAllocations: number;
  };
  error?: string;
}> {
  try {
    const results = await processMonthlyAllocations();

    return {
      success: true,
      message: "Monthly allocation process completed successfully",
      results: {
        totalUsers: results.totalUsers,
        eligibleUsers: results.eligibleUsers,
        successfulAllocations: results.successfulAllocations,
        failedAllocations: results.failedAllocations,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Monthly Allocation Cron] Error:", errorMessage);

    return {
      success: false,
      message: "Monthly allocation process failed",
      error: errorMessage,
    };
  }
}

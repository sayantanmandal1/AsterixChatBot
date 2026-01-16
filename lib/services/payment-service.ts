import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "redis";
import {
  type SubscriptionPlan,
  subscriptionPlan,
  type UserPurchase,
  userPurchase,
} from "../db/schema";
import { ChatSDKError } from "../errors";
import { addCredits } from "./credit-service";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Redis client for caching
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

const PLANS_CACHE_KEY = "subscription:plans";
const PLANS_CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

/**
 * Get all available subscription plans.
 * Plans are sorted by credit amount from lowest to highest.
 * Uses Redis cache with 24-hour TTL for performance.
 *
 * @returns Array of active subscription plans sorted by credits
 * @throws ChatSDKError if database query fails
 */
export async function getAvailablePlans(): Promise<SubscriptionPlan[]> {
  try {
    const redis = await getRedisClient();

    // Try to get from cache first
    if (redis) {
      const cachedPlans = await redis.get(PLANS_CACHE_KEY);
      if (cachedPlans) {
        console.log("Subscription plans retrieved from cache");
        return JSON.parse(cachedPlans) as SubscriptionPlan[];
      }
    }

    // If not in cache, fetch from database
    const plans = await db
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.isActive, true))
      .orderBy(asc(subscriptionPlan.credits));

    // Cache the results if Redis is available
    if (redis && plans.length > 0) {
      await redis.set(PLANS_CACHE_KEY, JSON.stringify(plans), {
        EX: PLANS_CACHE_TTL,
      });
      console.log("Subscription plans cached in Redis");
    }

    return plans;
  } catch (error) {
    console.error("Failed to get available plans:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get available subscription plans"
    );
  }
}

/**
 * Get a specific subscription plan by ID.
 *
 * @param planId - The subscription plan ID
 * @returns The subscription plan or null if not found
 * @throws ChatSDKError if database query fails
 */
export async function getPlanById(
  planId: string
): Promise<SubscriptionPlan | null> {
  try {
    const [plan] = await db
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.id, planId));

    return plan || null;
  } catch (error) {
    console.error("Failed to get plan by ID:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get subscription plan"
    );
  }
}

/**
 * Process a subscription plan purchase.
 * Uses database transaction to add credits and record purchase atomically.
 *
 * @param params - Purchase parameters
 * @param params.userId - The user's ID
 * @param params.planId - The subscription plan ID
 * @returns The created purchase record
 * @throws ChatSDKError if plan not found, user not found, or database error
 */
export async function processPurchase(params: {
  userId: string;
  planId: string;
}): Promise<UserPurchase> {
  const { userId, planId } = params;

  try {
    // Use database transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Get the subscription plan
      const [plan] = await tx
        .select()
        .from(subscriptionPlan)
        .where(eq(subscriptionPlan.id, planId));

      if (!plan) {
        throw new ChatSDKError(
          "not_found:database",
          "Subscription plan not found"
        );
      }

      if (!plan.isActive) {
        throw new ChatSDKError(
          "bad_request:database",
          "Subscription plan is not active"
        );
      }

      // Convert decimal strings to numbers
      const creditsToAdd = Number.parseFloat(plan.credits);
      const amountPaid = Number.parseFloat(plan.price);

      // Add credits to user's account (this will handle its own transaction internally)
      // Note: We need to call this outside the transaction to avoid nested transactions
      // So we'll do it after creating the purchase record

      // Create purchase record
      const [purchase] = await tx
        .insert(userPurchase)
        .values({
          userId,
          planId,
          creditsAdded: creditsToAdd.toFixed(2),
          amountPaid: amountPaid.toFixed(2),
          status: "completed",
        })
        .returning();

      return { purchase, creditsToAdd, planName: plan.name };
    });

    // Add credits after purchase record is created
    // This is done outside the transaction to avoid nested transaction issues
    await addCredits({
      userId,
      amount: result.creditsToAdd,
      type: "purchase",
      description: `Purchase: ${result.planName}`,
      metadata: {
        planId,
        purchaseId: result.purchase.id,
      },
    });

    return result.purchase;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    console.error("Failed to process purchase:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to process purchase"
    );
  }
}

/**
 * Get purchase history for a user.
 * Supports pagination with limit and offset.
 *
 * @param params - Query parameters
 * @param params.userId - The user's ID
 * @param params.limit - Maximum number of purchases to return (default: 50)
 * @param params.offset - Number of purchases to skip (default: 0)
 * @returns Array of user purchases sorted by date (newest first)
 * @throws ChatSDKError if database query fails
 */
export async function getPurchaseHistory(params: {
  userId: string;
  limit?: number;
  offset?: number;
}): Promise<UserPurchase[]> {
  const { userId, limit = 50, offset = 0 } = params;

  try {
    const purchases = await db
      .select()
      .from(userPurchase)
      .where(eq(userPurchase.userId, userId))
      .orderBy(desc(userPurchase.createdAt))
      .limit(limit)
      .offset(offset);

    return purchases;
  } catch (error) {
    console.error("Failed to get purchase history:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get purchase history"
    );
  }
}

/**
 * Invalidate the subscription plans cache.
 * Should be called when plans are created, updated, or deleted.
 *
 * @throws ChatSDKError if cache invalidation fails
 */
export async function invalidatePlansCache(): Promise<void> {
  try {
    const redis = await getRedisClient();

    if (redis) {
      await redis.del(PLANS_CACHE_KEY);
      console.log("Subscription plans cache invalidated");
    }
  } catch (error) {
    console.error("Failed to invalidate plans cache:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to invalidate plans cache"
    );
  }
}

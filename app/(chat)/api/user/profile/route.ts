import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { getBalance } from "@/lib/services/credit-service";
import { getPurchaseHistory } from "@/lib/services/payment-service";
import { RATE_LIMITS, withRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { subscriptionPlan, user } from "@/lib/db/schema";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * GET /api/user/profile
 * 
 * Returns comprehensive user profile information including:
 * - User data (id, email)
 * - Credit balance and last monthly allocation
 * - Active subscription plan (most recent purchase)
 * 
 * Requires authentication - returns 401 for unauthenticated users.
 * 
 * @returns User profile with credit balance and active plan
 */
async function handler(request: NextRequest) {
  try {
    const session = await auth();

    // Validate authentication
    if (!session?.user) {
      console.warn("Unauthenticated request to user profile endpoint");
      return new ChatSDKError(
        "unauthorized:chat",
        "Authentication required to view profile"
      ).toResponse();
    }

    // Guest users should not access this endpoint
    if (session.user.type === "guest") {
      console.warn("Guest user attempted to access profile", {
        sessionId: session.user.id,
      });
      return new ChatSDKError(
        "unauthorized:chat",
        "Guest users cannot access profile. Please register for an account."
      ).toResponse();
    }

    const userId = session.user.id;

    // Retrieve user data
    const [userData] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId));

    if (!userData) {
      console.error("User not found in database", { userId });
      return new ChatSDKError(
        "not_found:database",
        "User not found"
      ).toResponse();
    }

    // Retrieve credit balance
    const creditBalance = await getBalance(userId);

    // Get most recent purchase to determine active plan
    const purchases = await getPurchaseHistory({
      userId,
      limit: 1,
      offset: 0,
    });

    let activePlan = null;
    if (purchases.length > 0) {
      const [recentPurchase] = purchases;
      
      // Get the plan details
      const [planDetails] = await db
        .select()
        .from(subscriptionPlan)
        .where(eq(subscriptionPlan.id, recentPurchase.planId));

      if (planDetails) {
        activePlan = {
          id: planDetails.id,
          name: planDetails.name,
          credits: Number.parseFloat(planDetails.credits),
          price: Number.parseFloat(planDetails.price),
          description: planDetails.description,
          purchasedAt: recentPurchase.createdAt,
        };
      }
    }

    console.log("User profile retrieved successfully", {
      userId,
      hasActivePlan: activePlan !== null,
      balance: creditBalance.balance,
    });

    // Format response
    return Response.json({
      user: {
        id: userData.id,
        email: userData.email,
      },
      creditBalance: {
        balance: Number.parseFloat(creditBalance.balance),
        lastMonthlyAllocation: creditBalance.lastMonthlyAllocation,
        isNewUser: creditBalance.isNewUser,
        createdAt: creditBalance.createdAt,
        updatedAt: creditBalance.updatedAt,
      },
      activePlan,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Failed to get user profile via API", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new ChatSDKError(
      "bad_request:api",
      "Failed to retrieve user profile"
    ).toResponse();
  }
}

// Export with rate limiting
export const GET = withRateLimit(handler, RATE_LIMITS.USER_PROFILE);

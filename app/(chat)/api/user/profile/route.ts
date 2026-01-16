import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { getBalance } from "@/lib/services/credit-service";
import { getPurchaseHistory } from "@/lib/services/payment-service";
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
export async function GET() {
  try {
    const session = await auth();

    // Validate authentication
    if (!session?.user) {
      return new ChatSDKError(
        "unauthorized:chat",
        "Authentication required to view profile"
      ).toResponse();
    }

    // Guest users should not access this endpoint
    if (session.user.type === "guest") {
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

    console.error("Failed to get user profile:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to retrieve user profile"
    ).toResponse();
  }
}

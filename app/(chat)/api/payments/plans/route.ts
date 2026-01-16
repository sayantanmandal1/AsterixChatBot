import { ChatSDKError } from "@/lib/errors";
import { getAvailablePlans } from "@/lib/services/payment-service";
import { RATE_LIMITS, withRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

/**
 * GET /api/payments/plans
 * 
 * Returns all available subscription plans sorted by credit amount.
 * No authentication required - plans are public information.
 * 
 * @returns Array of subscription plans with id, name, credits, price, description
 */
async function handler(request: NextRequest) {
  try {
    const plans = await getAvailablePlans();

    console.log("Subscription plans retrieved successfully", {
      count: plans.length,
    });

    // Convert decimal strings to numbers for JSON response
    const formattedPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      credits: Number.parseFloat(plan.credits),
      price: Number.parseFloat(plan.price),
      description: plan.description,
      displayOrder: plan.displayOrder,
      createdAt: plan.createdAt,
    }));

    return Response.json({ plans: formattedPlans });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Failed to get subscription plans via API", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new ChatSDKError(
      "bad_request:api",
      "Failed to retrieve subscription plans"
    ).toResponse();
  }
}

// Export with rate limiting
export const GET = withRateLimit(handler, RATE_LIMITS.PAYMENT_PLANS);

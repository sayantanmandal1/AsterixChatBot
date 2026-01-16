import { ChatSDKError } from "@/lib/errors";
import { getAvailablePlans } from "@/lib/services/payment-service";

/**
 * GET /api/payments/plans
 * 
 * Returns all available subscription plans sorted by credit amount.
 * No authentication required - plans are public information.
 * 
 * @returns Array of subscription plans with id, name, credits, price, description
 */
export async function GET() {
  try {
    const plans = await getAvailablePlans();

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

    console.error("Failed to get subscription plans:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to retrieve subscription plans"
    ).toResponse();
  }
}

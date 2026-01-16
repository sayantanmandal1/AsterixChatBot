import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { getBalance } from "@/lib/services/credit-service";
import { processPurchase } from "@/lib/services/payment-service";
import { z } from "zod";

const purchaseRequestSchema = z.object({
  planId: z.string().uuid("Plan ID must be a valid UUID"),
});

/**
 * POST /api/payments/purchase
 * 
 * Processes a subscription plan purchase for authenticated users.
 * Validates authentication, processes the purchase, and returns updated balance.
 * 
 * @param request - Request body containing planId
 * @returns Purchase details and new credit balance
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    // Validate authentication - only authenticated users can purchase
    if (!session?.user) {
      return new ChatSDKError(
        "unauthorized:chat",
        "Authentication required to purchase credits"
      ).toResponse();
    }

    // Guest users cannot purchase - redirect to login
    if (session.user.type === "guest") {
      return new ChatSDKError(
        "unauthorized:chat",
        "Guest users must register to purchase credits"
      ).toResponse();
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = purchaseRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return new ChatSDKError(
        "bad_request:api",
        `Invalid request body: ${validationResult.error.errors.map((e) => e.message).join(", ")}`
      ).toResponse();
    }

    const { planId } = validationResult.data;

    // Process the purchase
    const purchase = await processPurchase({
      userId: session.user.id,
      planId,
    });

    // Get updated balance
    const creditBalance = await getBalance(session.user.id);

    return Response.json({
      success: true,
      purchase: {
        id: purchase.id,
        planId: purchase.planId,
        creditsAdded: Number.parseFloat(purchase.creditsAdded),
        amountPaid: Number.parseFloat(purchase.amountPaid),
        status: purchase.status,
        createdAt: purchase.createdAt,
      },
      newBalance: Number.parseFloat(creditBalance.balance),
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Failed to process purchase:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to process purchase"
    ).toResponse();
  }
}

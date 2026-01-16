import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { getBalance } from "@/lib/services/credit-service";
import { processPurchase } from "@/lib/services/payment-service";
import { RATE_LIMITS, withRateLimit } from "@/lib/rate-limit";
import { withCSRFProtection } from "@/lib/csrf";
import { purchaseRequestSchema, validateRequestBody } from "@/lib/validation/schemas";
import { NextRequest } from "next/server";

/**
 * POST /api/payments/purchase
 * 
 * Processes a subscription plan purchase for authenticated users.
 * Validates authentication, processes the purchase, and returns updated balance.
 * 
 * @param request - Request body containing planId
 * @returns Purchase details and new credit balance
 */
async function handler(request: NextRequest) {
  try {
    const session = await auth();

    // Validate authentication - only authenticated users can purchase
    if (!session?.user) {
      console.warn("Unauthenticated request to purchase endpoint");
      return new ChatSDKError(
        "unauthorized:chat",
        "Authentication required to purchase credits"
      ).toResponse();
    }

    // Guest users cannot purchase - redirect to login
    if (session.user.type === "guest") {
      console.warn("Guest user attempted to purchase credits", {
        sessionId: session.user.id,
      });
      return new ChatSDKError(
        "unauthorized:chat",
        "Guest users must register to purchase credits"
      ).toResponse();
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.warn("Invalid JSON in purchase request", {
        userId: session.user.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return new ChatSDKError(
        "bad_request:api",
        "Invalid JSON in request body"
      ).toResponse();
    }

    const validation = validateRequestBody(purchaseRequestSchema, body);

    if (!validation.success) {
      console.warn("Invalid request body for purchase", {
        userId: session.user.id,
        errors: validation.errors,
      });
      return new ChatSDKError(
        "bad_request:api",
        `Invalid request body: ${validation.errors}`
      ).toResponse();
    }

    const { planId } = validation.data;

    // Process the purchase
    const purchase = await processPurchase({
      userId: session.user.id,
      planId,
    });

    // Get updated balance
    const creditBalance = await getBalance(session.user.id);

    console.log("Purchase processed successfully", {
      userId: session.user.id,
      planId,
      purchaseId: purchase.id,
      creditsAdded: purchase.creditsAdded,
      newBalance: creditBalance.balance,
    });

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

    console.error("Failed to process purchase via API", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new ChatSDKError(
      "bad_request:api",
      "Failed to process purchase"
    ).toResponse();
  }
}

// Export with rate limiting and CSRF protection
export const POST = withCSRFProtection(withRateLimit(handler, RATE_LIMITS.PAYMENT_PURCHASE));

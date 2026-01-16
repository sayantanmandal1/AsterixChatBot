import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { getPurchaseHistory } from "@/lib/services/payment-service";
import { RATE_LIMITS, withRateLimit } from "@/lib/rate-limit";
import { purchaseHistoryQuerySchema, validateQueryParams } from "@/lib/validation/schemas";
import { NextRequest } from "next/server";

/**
 * GET /api/payments/history
 * 
 * Returns purchase history for the authenticated user.
 * Supports pagination via query parameters.
 * 
 * @param request - Request with optional query params: limit, offset
 * @returns Array of user purchases sorted by date (newest first)
 */
async function handler(request: NextRequest) {
  try {
    const session = await auth();

    // Validate authentication
    if (!session?.user) {
      console.warn("Unauthenticated request to payment history endpoint");
      return new ChatSDKError(
        "unauthorized:chat",
        "Authentication required to view purchase history"
      ).toResponse();
    }

    // Guest users don't have purchase history
    if (session.user.type === "guest") {
      console.log("Guest user requested purchase history", {
        sessionId: session.user.id,
      });
      return Response.json({
        purchases: [],
        total: 0,
      });
    }

    // Parse and validate query parameters
    const { searchParams } = request.nextUrl;
    const validation = validateQueryParams(purchaseHistoryQuerySchema, {
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
    });

    if (!validation.success) {
      console.warn("Invalid query parameters for purchase history", {
        userId: session.user.id,
        errors: validation.errors,
      });
      return new ChatSDKError(
        "bad_request:api",
        `Invalid query parameters: ${validation.errors}`
      ).toResponse();
    }

    const { limit, offset } = validation.data;

    // Get purchase history
    const purchases = await getPurchaseHistory({
      userId: session.user.id,
      limit,
      offset,
    });

    console.log("Purchase history retrieved successfully", {
      userId: session.user.id,
      count: purchases.length,
      limit,
      offset,
    });

    // Format purchases for response
    const formattedPurchases = purchases.map((purchase) => ({
      id: purchase.id,
      planId: purchase.planId,
      creditsAdded: Number.parseFloat(purchase.creditsAdded),
      amountPaid: Number.parseFloat(purchase.amountPaid),
      status: purchase.status,
      createdAt: purchase.createdAt,
    }));

    return Response.json({
      purchases: formattedPurchases,
      total: formattedPurchases.length,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Failed to get purchase history via API", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new ChatSDKError(
      "bad_request:api",
      "Failed to retrieve purchase history"
    ).toResponse();
  }
}

// Export with rate limiting
export const GET = withRateLimit(handler, RATE_LIMITS.PAYMENT_HISTORY);

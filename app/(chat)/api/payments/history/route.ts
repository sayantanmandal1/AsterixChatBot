import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { getPurchaseHistory } from "@/lib/services/payment-service";
import { z } from "zod";

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * GET /api/payments/history
 * 
 * Returns purchase history for the authenticated user.
 * Supports pagination via query parameters.
 * 
 * @param request - Request with optional query params: limit, offset
 * @returns Array of user purchases sorted by date (newest first)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    // Validate authentication
    if (!session?.user) {
      return new ChatSDKError(
        "unauthorized:chat",
        "Authentication required to view purchase history"
      ).toResponse();
    }

    // Guest users don't have purchase history
    if (session.user.type === "guest") {
      return Response.json({
        purchases: [],
        total: 0,
      });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const validationResult = historyQuerySchema.safeParse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
    });

    if (!validationResult.success) {
      return new ChatSDKError(
        "bad_request:api",
        `Invalid query parameters: ${validationResult.error.errors.map((e) => e.message).join(", ")}`
      ).toResponse();
    }

    const { limit, offset } = validationResult.data;

    // Get purchase history
    const purchases = await getPurchaseHistory({
      userId: session.user.id,
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

    console.error("Failed to get purchase history:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to retrieve purchase history"
    ).toResponse();
  }
}

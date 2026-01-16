import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { getTransactionHistory } from "@/lib/services/credit-service";
import { RATE_LIMITS, withRateLimit } from "@/lib/rate-limit";
import { transactionHistoryQuerySchema, validateQueryParams } from "@/lib/validation/schemas";

async function handler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      console.warn("Unauthenticated request to transaction history endpoint");
      return new ChatSDKError(
        "unauthorized:chat",
        "Authentication required to view transaction history"
      ).toResponse();
    }

    // Guest users don't have transaction history
    if (session.user.type === "guest") {
      console.log("Guest user requested transaction history", {
        sessionId: session.user.id,
      });
      return Response.json({
        transactions: [],
        total: 0,
      });
    }

    // Parse query parameters
    const { searchParams } = request.nextUrl;
    const validation = validateQueryParams(transactionHistoryQuerySchema, {
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
    });

    if (!validation.success) {
      console.warn("Invalid pagination parameters", {
        errors: validation.errors,
      });
      return new ChatSDKError(
        "bad_request:api",
        `Invalid query parameters: ${validation.errors}`
      ).toResponse();
    }

    const { limit, offset } = validation.data;

    // Get transaction history
    const transactions = await getTransactionHistory({
      userId: session.user.id,
      limit,
      offset,
    });

    console.log("Transaction history retrieved successfully", {
      userId: session.user.id,
      count: transactions.length,
      limit,
      offset,
    });

    // Convert decimal strings to numbers for JSON response
    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: Number.parseFloat(transaction.amount),
      balanceAfter: Number.parseFloat(transaction.balanceAfter),
      description: transaction.description,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
    }));

    return Response.json({
      transactions: formattedTransactions,
      total: formattedTransactions.length,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Failed to get transaction history via API", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new ChatSDKError(
      "bad_request:api",
      "Failed to retrieve transaction history"
    ).toResponse();
  }
}

// Export with rate limiting
export const GET = withRateLimit(handler, RATE_LIMITS.CREDIT_TRANSACTIONS);

import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { getTransactionHistory } from "@/lib/services/credit-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError(
        "unauthorized:chat",
        "Authentication required to view transaction history"
      ).toResponse();
    }

    // Guest users don't have transaction history
    if (session.user.type === "guest") {
      return Response.json({
        transactions: [],
        total: 0,
      });
    }

    // Parse query parameters
    const { searchParams } = request.nextUrl;
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      return new ChatSDKError(
        "bad_request:api",
        "Limit must be between 1 and 100"
      ).toResponse();
    }

    if (offset < 0) {
      return new ChatSDKError(
        "bad_request:api",
        "Offset must be non-negative"
      ).toResponse();
    }

    // Get transaction history
    const transactions = await getTransactionHistory({
      userId: session.user.id,
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

    console.error("Failed to get transaction history:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to retrieve transaction history"
    ).toResponse();
  }
}

import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import {
  deductCredits,
  deductGuestCredits,
  getBalance,
  getGuestBalance,
} from "@/lib/services/credit-service";
import { RATE_LIMITS, withRateLimit } from "@/lib/rate-limit";
import { withCSRFProtection } from "@/lib/csrf";
import { creditDeductSchema, validateRequestBody } from "@/lib/validation/schemas";
import { NextRequest } from "next/server";

async function handler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      console.warn("Unauthenticated request to deduct credits endpoint");
      return new ChatSDKError(
        "unauthorized:chat",
        "Authentication required to deduct credits"
      ).toResponse();
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.warn("Invalid JSON in deduct credits request", {
        error: error instanceof Error ? error.message : String(error),
      });
      return new ChatSDKError(
        "bad_request:api",
        "Invalid JSON in request body"
      ).toResponse();
    }

    const validation = validateRequestBody(creditDeductSchema, body);

    if (!validation.success) {
      console.warn("Invalid request body for deduct credits", {
        errors: validation.errors,
        userId: session.user.id,
      });
      return new ChatSDKError(
        "bad_request:api",
        `Invalid request body: ${validation.errors}`
      ).toResponse();
    }

    const { amount, description, metadata } = validation.data;

    // Check if this is a guest user
    if (session.user.type === "guest") {
      try {
        const newBalance = await deductGuestCredits(session.user.id, amount);

        console.log("Guest credits deducted successfully via API", {
          sessionId: session.user.id,
          amount,
          newBalance,
        });

        return Response.json({
          success: true,
          newBalance,
          transaction: {
            type: "deduction",
            amount,
            description,
            balanceAfter: newBalance,
          },
        });
      } catch (error) {
        if (error instanceof ChatSDKError) {
          // Handle insufficient credits error with specific status code
          if (error.message.includes("Insufficient credits")) {
            console.warn("Guest user has insufficient credits", {
              sessionId: session.user.id,
              requestedAmount: amount,
            });
            return new ChatSDKError(
              "bad_request:credits",
              error.message
            ).toResponse();
          }
          return error.toResponse();
        }
        throw error;
      }
    }

    // Authenticated user - deduct credits
    try {
      const transaction = await deductCredits({
        userId: session.user.id,
        amount,
        description,
        metadata,
      });

      // Get updated balance
      const creditBalance = await getBalance(session.user.id);

      console.log("User credits deducted successfully via API", {
        userId: session.user.id,
        amount,
        newBalance: creditBalance.balance,
        transactionId: transaction.id,
      });

      return Response.json({
        success: true,
        newBalance: Number.parseFloat(creditBalance.balance),
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: Number.parseFloat(transaction.amount),
          balanceAfter: Number.parseFloat(transaction.balanceAfter),
          description: transaction.description,
          createdAt: transaction.createdAt,
        },
      });
    } catch (error) {
      if (error instanceof ChatSDKError) {
        // Handle insufficient credits error with specific status code
        if (error.message.includes("Insufficient credits")) {
          console.warn("User has insufficient credits", {
            userId: session.user.id,
            requestedAmount: amount,
          });
          return new ChatSDKError(
            "bad_request:credits",
            error.message
          ).toResponse();
        }
        return error.toResponse();
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Failed to deduct credits via API", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new ChatSDKError(
      "bad_request:api",
      "Failed to deduct credits"
    ).toResponse();
  }
}

// Export with rate limiting and CSRF protection
export const POST = withCSRFProtection(withRateLimit(handler, RATE_LIMITS.CREDIT_DEDUCT));

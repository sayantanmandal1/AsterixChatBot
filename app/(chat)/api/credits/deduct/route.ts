import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import {
  deductCredits,
  deductGuestCredits,
  getBalance,
  getGuestBalance,
} from "@/lib/services/credit-service";
import { z } from "zod";

const deductRequestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError(
        "unauthorized:chat",
        "Authentication required to deduct credits"
      ).toResponse();
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = deductRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return new ChatSDKError(
        "bad_request:api",
        `Invalid request body: ${validationResult.error.errors.map((e) => e.message).join(", ")}`
      ).toResponse();
    }

    const { amount, description, metadata } = validationResult.data;

    // Check if this is a guest user
    if (session.user.type === "guest") {
      try {
        const newBalance = await deductGuestCredits(session.user.id, amount);

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
          // Handle insufficient credits error
          if (error.message.includes("Insufficient credits")) {
            return new ChatSDKError(
              "bad_request:api",
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
        // Handle insufficient credits error
        if (error.message.includes("Insufficient credits")) {
          return new ChatSDKError(
            "bad_request:api",
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

    console.error("Failed to deduct credits:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to deduct credits"
    ).toResponse();
  }
}

import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { getBalance, getGuestBalance } from "@/lib/services/credit-service";
import { initializeGuestSession } from "@/lib/services/session-service";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      // Guest user - return error indicating they need to be authenticated
      // or handle guest session if they have one
      return new ChatSDKError(
        "unauthorized:chat",
        "Authentication required to check credit balance"
      ).toResponse();
    }

    // Check if this is a guest user
    if (session.user.type === "guest") {
      // For guest users, try to get their session balance
      try {
        const balance = await getGuestBalance(session.user.id);
        return Response.json({
          balance,
          lastMonthlyAllocation: null,
          isGuest: true,
        });
      } catch (error) {
        // If guest session doesn't exist, initialize it
        if (
          error instanceof ChatSDKError &&
          error.type === "not_found" &&
          error.surface === "database"
        ) {
          await initializeGuestSession(session.user.id);
          return Response.json({
            balance: 200.0,
            lastMonthlyAllocation: null,
            isGuest: true,
          });
        }
        throw error;
      }
    }

    // Authenticated user - get their credit balance
    const creditBalance = await getBalance(session.user.id);

    return Response.json({
      balance: Number.parseFloat(creditBalance.balance),
      lastMonthlyAllocation: creditBalance.lastMonthlyAllocation,
      isGuest: false,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Failed to get credit balance:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to retrieve credit balance"
    ).toResponse();
  }
}

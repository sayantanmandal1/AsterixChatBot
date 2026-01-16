import { monthlyAllocationCronHandler } from "@/lib/cron/monthly-allocation";
import { NextResponse } from "next/server";

/**
 * Vercel Cron Job endpoint for monthly credit allocation.
 * This endpoint should be called daily at midnight UTC by Vercel Cron.
 * 
 * Security: In production, this endpoint should be protected by:
 * 1. Vercel Cron secret verification (CRON_SECRET environment variable)
 * 2. IP allowlist (only allow Vercel's cron IPs)
 * 
 * @returns JSON response with allocation results
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security (optional but recommended)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron] Unauthorized cron request");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Monthly allocation cron job triggered");

    // Execute the monthly allocation process
    const result = await monthlyAllocationCronHandler();

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: result.message,
          results: result.results,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: result.message,
        error: result.error,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("[Cron] Fatal error in monthly allocation cron:", error);
    
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Disable body parsing for cron endpoints
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

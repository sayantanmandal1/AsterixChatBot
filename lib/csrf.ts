import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

/**
 * CSRF Protection Utilities
 * 
 * NextAuth v5 provides built-in CSRF protection for authentication routes.
 * This module provides additional CSRF verification for custom API routes
 * that perform state-changing operations.
 */

/**
 * Verify CSRF token for state-changing operations
 * 
 * NextAuth automatically handles CSRF tokens via cookies and headers.
 * This function verifies that the request comes from an authenticated session
 * and includes proper origin/referer headers.
 * 
 * @param request - The incoming request
 * @returns true if CSRF check passes, false otherwise
 */
export async function verifyCSRF(request: NextRequest): Promise<boolean> {
  try {
    // Check if user is authenticated (NextAuth handles CSRF for auth)
    const session = await auth();
    if (!session?.user) {
      return false;
    }

    // Verify origin/referer headers match the request host
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");

    // For same-origin requests, verify origin or referer
    if (origin) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        console.warn("CSRF check failed: origin mismatch", {
          origin: originHost,
          host,
        });
        return false;
      }
    } else if (referer) {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        console.warn("CSRF check failed: referer mismatch", {
          referer: refererHost,
          host,
        });
        return false;
      }
    } else {
      // No origin or referer header - could be a direct API call
      // In production, you might want to reject these
      console.warn("CSRF check: no origin or referer header", {
        path: request.nextUrl.pathname,
      });
      
      // Allow in development, reject in production
      if (process.env.NODE_ENV === "production") {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("CSRF verification error:", error);
    return false;
  }
}

/**
 * Middleware to enforce CSRF protection on API routes
 * 
 * Usage:
 * ```typescript
 * export const POST = withCSRFProtection(async (req) => {
 *   // Your handler code
 * });
 * ```
 */
export function withCSRFProtection(
  handler: (req: NextRequest) => Promise<Response | NextResponse>
) {
  return async (req: NextRequest): Promise<Response | NextResponse> => {
    // Only check CSRF for state-changing methods
    const method = req.method.toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const isValid = await verifyCSRF(req);
      
      if (!isValid) {
        return NextResponse.json(
          {
            error: "CSRF validation failed",
            message: "Invalid request origin or missing authentication",
          },
          { status: 403 }
        );
      }
    }

    return handler(req);
  };
}

/**
 * Get CSRF token for client-side use
 * 
 * NextAuth manages CSRF tokens automatically via cookies.
 * This is primarily for documentation purposes.
 */
export function getCSRFToken(): string {
  // NextAuth handles CSRF tokens automatically
  // Clients should include credentials in fetch requests
  return "managed-by-nextauth";
}

/**
 * Configuration for CSRF protection
 */
export const CSRF_CONFIG = {
  // Cookie name used by NextAuth for CSRF token
  cookieName: "next-auth.csrf-token",
  
  // Header name for CSRF token (if using custom implementation)
  headerName: "x-csrf-token",
  
  // Methods that require CSRF protection
  protectedMethods: ["POST", "PUT", "PATCH", "DELETE"],
  
  // Paths that are exempt from CSRF checks
  exemptPaths: [
    "/api/auth/callback",
    "/api/auth/signin",
    "/api/auth/signout",
    "/api/auth/session",
    "/api/auth/csrf",
  ],
} as const;

/**
 * Check if a path is exempt from CSRF protection
 */
export function isExemptPath(pathname: string): boolean {
  return CSRF_CONFIG.exemptPaths.some((path) => pathname.startsWith(path));
}

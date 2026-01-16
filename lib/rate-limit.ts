import { createClient } from "redis";
import { NextRequest, NextResponse } from "next/server";

// Rate limit configuration per endpoint
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

// Default rate limit configurations
export const RATE_LIMITS = {
  // Credit operations - more restrictive
  CREDIT_DEDUCT: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
  CREDIT_BALANCE: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 per minute
  CREDIT_TRANSACTIONS: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute

  // Payment operations - restrictive
  PAYMENT_PURCHASE: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  PAYMENT_PLANS: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
  PAYMENT_HISTORY: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute

  // User operations
  USER_PROFILE: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute

  // Chat operations - more lenient
  CHAT_MESSAGE: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 per minute

  // Default for other endpoints
  DEFAULT: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute
} as const;

// In-memory store for development
class InMemoryStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.resetTime > now) {
      existing.count += 1;
      this.store.set(key, existing);
      return existing;
    }

    const resetTime = now + windowMs;
    const newEntry = { count: 1, resetTime };
    this.store.set(key, newEntry);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of this.store.entries()) {
        if (v.resetTime <= now) {
          this.store.delete(k);
        }
      }
    }

    return newEntry;
  }
}

// Redis store for production
class RedisStore {
  private client: ReturnType<typeof createClient> | null = null;

  constructor() {
    if (process.env.REDIS_URL) {
      this.client = createClient({
        url: process.env.REDIS_URL,
      });
    }
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    if (!this.client) {
      throw new Error("Redis client not initialized");
    }

    const now = Date.now();
    const resetTime = now + windowMs;
    const ttlSeconds = Math.ceil(windowMs / 1000);

    // Use Redis pipeline for atomic operations
    const pipeline = this.client.multi();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    
    const results = await pipeline.exec();
    // Redis returns an array of results, first one is the incr result
    const count = typeof results?.[0] === "number" ? results[0] : 1;

    return { count, resetTime };
  }
}

// Singleton store instance
let store: InMemoryStore | RedisStore;

function getStore(): InMemoryStore | RedisStore {
  if (!store) {
    store = process.env.REDIS_URL ? new RedisStore() : new InMemoryStore();
  }
  return store;
}

/**
 * Get client IP address from request
 */
function getClientIP(req: NextRequest): string {
  // Try various headers for IP address
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  
  return "unknown";
}

/**
 * Rate limiting middleware for API routes
 * @param config Rate limit configuration
 * @param identifier Function to extract identifier from request (defaults to IP address)
 */
export function rateLimit(
  config: RateLimitConfig,
  identifier?: (req: NextRequest) => string
) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    try {
      // Get identifier (IP address or custom identifier)
      const id = identifier ? identifier(req) : getClientIP(req);

      // Create rate limit key
      const key = `ratelimit:${req.nextUrl.pathname}:${id}`;

      // Increment counter
      const storeInstance = getStore();
      const { count, resetTime } = await storeInstance.increment(key, config.windowMs);

      // Set rate limit headers
      const headers = new Headers();
      headers.set("X-RateLimit-Limit", config.maxRequests.toString());
      headers.set("X-RateLimit-Remaining", Math.max(0, config.maxRequests - count).toString());
      headers.set("X-RateLimit-Reset", new Date(resetTime).toISOString());

      // Check if rate limit exceeded
      if (count > config.maxRequests) {
        return NextResponse.json(
          {
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers,
          }
        );
      }

      // Rate limit not exceeded, return null to continue
      return null;
    } catch (error) {
      // Log error but don't block request on rate limit failure
      console.error("Rate limit error:", error);
      return null;
    }
  };
}

/**
 * Helper to apply rate limiting to API route handlers
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response | NextResponse>,
  config: RateLimitConfig,
  identifier?: (req: NextRequest) => string
) {
  return async (req: NextRequest): Promise<Response | NextResponse> => {
    const rateLimitResponse = await rateLimit(config, identifier)(req);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(req);
  };
}

/**
 * Helper to get user-based rate limit identifier
 */
export function getUserIdentifier(req: NextRequest): string {
  // Try to get user ID from session/token
  // This is a simplified version - in production, extract from JWT token
  const userId = req.headers.get("x-user-id");
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  return getClientIP(req);
}

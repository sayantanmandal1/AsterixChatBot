import { z } from "zod";

/**
 * Centralized Zod validation schemas for API endpoints
 * This ensures consistent validation across all API routes
 */

// ============================================================================
// Credit API Schemas
// ============================================================================

/**
 * Schema for credit deduction requests
 * POST /api/credits/deduct
 */
export const creditDeductSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(10000, "Amount cannot exceed 10,000 credits")
    .refine((val) => Number.isFinite(val), "Amount must be a finite number"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description cannot exceed 500 characters")
    .trim(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for transaction history query parameters
 * GET /api/credits/transactions
 */
export const transactionHistoryQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be positive")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(10),
  offset: z.coerce
    .number()
    .int("Offset must be an integer")
    .nonnegative("Offset must be non-negative")
    .optional()
    .default(0),
});

// ============================================================================
// Payment API Schemas
// ============================================================================

/**
 * Schema for purchase requests
 * POST /api/payments/purchase
 */
export const purchaseRequestSchema = z.object({
  planId: z
    .string()
    .uuid("Plan ID must be a valid UUID")
    .min(1, "Plan ID is required"),
});

/**
 * Schema for purchase history query parameters
 * GET /api/payments/history
 */
export const purchaseHistoryQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be positive")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(50),
  offset: z.coerce
    .number()
    .int("Offset must be an integer")
    .nonnegative("Offset must be non-negative")
    .optional()
    .default(0),
});

// ============================================================================
// User API Schemas
// ============================================================================

/**
 * Schema for user registration
 * POST /api/auth/register
 */
export const userRegistrationSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .min(3, "Email must be at least 3 characters")
    .max(255, "Email cannot exceed 255 characters")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

/**
 * Schema for user login
 * POST /api/auth/login
 */
export const userLoginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),
  password: z.string().min(1, "Password is required"),
});

// ============================================================================
// Chat API Schemas
// ============================================================================

/**
 * Schema for chat message requests
 * POST /api/chat
 */
export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(10000, "Message cannot exceed 10,000 characters")
    .trim(),
  chatId: z.string().uuid("Chat ID must be a valid UUID").optional(),
  model: z.string().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        contentType: z.string(),
        url: z.string().url("Invalid attachment URL"),
      })
    )
    .optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to validate request body and return formatted errors
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; errors: string } {
  const result = schema.safeParse(body);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");

  return { success: false, errors };
}

/**
 * Helper to validate query parameters
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  params: Record<string, string | null>
): { success: true; data: T } | { success: false; errors: string } {
  const result = schema.safeParse(params);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");

  return { success: false, errors };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .trim();
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

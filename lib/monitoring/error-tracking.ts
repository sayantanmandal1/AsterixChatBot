/**
 * Error tracking and monitoring utilities
 * Integrates with error tracking services like Sentry
 */

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private enabled: boolean;

  private constructor() {
    this.enabled = process.env.NODE_ENV === 'production';
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Capture an error with context
   */
  captureError(error: Error, context?: ErrorContext): void {
    if (!this.enabled) {
      console.error('Error:', error, 'Context:', context);
      return;
    }

    // TODO: Integrate with error tracking service
    // Example: Sentry.captureException(error, { extra: context });

    console.error('[ERROR]', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Capture a message (non-error event)
   */
  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error',
    context?: ErrorContext
  ): void {
    if (!this.enabled) {
      console.log(`[${level.toUpperCase()}]`, message, context);
      return;
    }

    // TODO: Integrate with error tracking service
    // Example: Sentry.captureMessage(message, { level, extra: context });

    console.log(`[${level.toUpperCase()}]`, {
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Set user context for error tracking
   */
  setUserContext(userId: string, email?: string): void {
    if (!this.enabled) return;

    // TODO: Integrate with error tracking service
    // Example: Sentry.setUser({ id: userId, email });
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    if (!this.enabled) return;

    // TODO: Integrate with error tracking service
    // Example: Sentry.setUser(null);
  }
}

export const errorTracker = ErrorTracker.getInstance();

/**
 * Wrapper for async functions with error tracking
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  operation: string
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorTracker.captureError(error as Error, { operation });
      throw error;
    }
  }) as T;
}

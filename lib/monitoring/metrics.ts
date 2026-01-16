/**
 * Metrics collection for credit operations
 */

interface CreditMetric {
  operation: 'deduction' | 'addition' | 'purchase';
  amount: number;
  userId: string;
  success: boolean;
  duration: number;
  timestamp: Date;
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: CreditMetric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Flush metrics every 60 seconds
    if (typeof window === 'undefined') {
      // Only run in Node.js environment
      this.flushInterval = setInterval(() => {
        this.flush();
      }, 60000);
    }
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Record a credit operation metric
   */
  recordCreditOperation(metric: CreditMetric): void {
    this.metrics.push(metric);
  }

  /**
   * Flush metrics to monitoring service
   */
  private async flush(): Promise<void> {
    if (this.metrics.length === 0) return;

    const metricsToFlush = [...this.metrics];
    this.metrics = [];

    try {
      // TODO: Send to monitoring service
      // Example: await sendToDataDog(metricsToFlush);
      // Example: await sendToCloudWatch(metricsToFlush);

      console.log('[METRICS]', {
        count: metricsToFlush.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Re-add metrics for retry
      this.metrics.push(...metricsToFlush);
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
  } {
    const total = this.metrics.length;
    const successful = this.metrics.filter((m) => m.success).length;
    const avgDuration =
      this.metrics.reduce((sum, m) => sum + m.duration, 0) / total;

    return {
      totalOperations: total,
      successRate: total > 0 ? successful / total : 0,
      averageDuration: avgDuration || 0,
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

export const metricsCollector = MetricsCollector.getInstance();

/**
 * Wrapper for credit operations with metrics
 */
export async function withMetrics<T>(
  operation: CreditMetric['operation'],
  userId: string,
  amount: number,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = false;

  try {
    const result = await fn();
    success = true;
    return result;
  } finally {
    const duration = Date.now() - startTime;
    metricsCollector.recordCreditOperation({
      operation,
      amount,
      userId,
      success,
      duration,
      timestamp: new Date(),
    });
  }
}

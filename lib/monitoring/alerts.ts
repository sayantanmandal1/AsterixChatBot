/**
 * Alert management system
 */

import { db } from '@/lib/db';
import { creditBalance } from '@/lib/db/schema';
import { lt } from 'drizzle-orm';

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface Alert {
  title: string;
  message: string;
  severity: AlertSeverity;
  metadata?: Record<string, unknown>;
}

class AlertManager {
  private static instance: AlertManager;

  private constructor() {}

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * Send an alert
   */
  async sendAlert(alert: Alert): Promise<void> {
    console.error('[ALERT]', {
      ...alert,
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrate with alerting service
    // Example: await sendToSlack(alert);
    // Example: await sendToPagerDuty(alert);

    // For critical alerts, could also send email
    if (alert.severity === 'critical') {
      // await sendEmail(alert);
    }
  }

  /**
   * Check for negative balances and alert
   */
  async checkNegativeBalances(): Promise<void> {
    try {
      const negativeBalances = await db
        .select()
        .from(creditBalance)
        .where(lt(creditBalance.balance, '0'));

      if (negativeBalances.length > 0) {
        await this.sendAlert({
          title: 'Negative Credit Balances Detected',
          message: `Found ${negativeBalances.length} users with negative balances`,
          severity: 'critical',
          metadata: {
            userIds: negativeBalances.map((b) => b.userId),
          },
        });
      }
    } catch (error) {
      console.error('Failed to check negative balances:', error);
    }
  }

  /**
   * Check for failed cron jobs
   */
  async checkCronJobHealth(): Promise<void> {
    // TODO: Implement cron job health check
    // Check last successful run timestamp
    // Alert if > 25 hours since last run
  }
}

export const alertManager = AlertManager.getInstance();

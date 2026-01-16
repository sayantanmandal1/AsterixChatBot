import { db } from '@/lib/db';
import { createClient } from 'redis';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'healthy' | 'unhealthy' | 'unknown';
    redis: 'healthy' | 'unhealthy' | 'unknown';
    application: 'healthy' | 'unhealthy';
  };
}

export async function GET() {
  const checks: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
      application: 'healthy',
    },
  };

  // Check database
  try {
    await db.execute('SELECT 1');
    checks.services.database = 'healthy';
  } catch (error) {
    checks.services.database = 'unhealthy';
    checks.status = 'degraded';
    console.error('Database health check failed:', error);
  }

  // Check Redis
  if (process.env.REDIS_URL) {
    const redis = createClient({ url: process.env.REDIS_URL });
    try {
      await redis.connect();
      await redis.ping();
      checks.services.redis = 'healthy';
      await redis.disconnect();
    } catch (error) {
      checks.services.redis = 'unhealthy';
      checks.status = 'degraded';
      console.error('Redis health check failed:', error);
      try {
        await redis.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
  } else {
    // Redis not configured
    checks.services.redis = 'unknown';
  }

  // Determine overall status
  if (
    checks.services.database === 'unhealthy' ||
    checks.services.redis === 'unhealthy'
  ) {
    checks.status = 'unhealthy';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}

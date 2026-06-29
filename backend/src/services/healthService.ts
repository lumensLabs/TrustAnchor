import pg from 'pg';
import { getPool } from '../config/database.js';

export type CheckStatus = 'ok' | 'error' | 'skipped';

export interface DependencyCheck {
  status: CheckStatus;
  message?: string;
}

export interface HealthReport {
  status: 'ok' | 'error';
  uptime: number;
  timestamp: number;
  checks: {
    database: DependencyCheck;
    horizon: DependencyCheck;
  };
}

const DEFAULT_HORIZON_URL = 'https://horizon.stellar.org';
const HEALTH_CHECK_TIMEOUT_MS = 5_000;

export async function checkDatabase(
  pool: pg.Pool | null = getPool(),
): Promise<DependencyCheck> {
  if (!pool) {
    return {
      status: 'skipped',
      message: 'DATABASE_URL not configured',
    };
  }

  try {
    await pool.query('SELECT 1');
    return { status: 'ok' };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

export async function checkHorizon(
  horizonUrl = process.env.HORIZON_URL ?? DEFAULT_HORIZON_URL,
  fetchFn: typeof fetch = fetch,
): Promise<DependencyCheck> {
  const baseUrl = horizonUrl.replace(/\/$/, '');

  try {
    const response = await fetchFn(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        status: 'error',
        message: `Horizon returned HTTP ${response.status}`,
      };
    }

    const body = (await response.json()) as { status?: string };
    if (body.status !== 'healthy') {
      return {
        status: 'error',
        message: 'Horizon reported an unhealthy status',
      };
    }

    return { status: 'ok' };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Horizon health check failed',
    };
  }
}

export async function getHealthReport(
  options: {
    pool?: pg.Pool | null;
    horizonUrl?: string;
    fetchFn?: typeof fetch;
  } = {},
): Promise<HealthReport> {
  const [database, horizon] = await Promise.all([
    checkDatabase(options.pool ?? getPool()),
    checkHorizon(options.horizonUrl, options.fetchFn),
  ]);

  const checks = { database, horizon };
  const hasError = Object.values(checks).some((check) => check.status === 'error');

  return {
    status: hasError ? 'error' : 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    checks,
  };
}

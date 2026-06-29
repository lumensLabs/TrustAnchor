import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type pg from 'pg';
import { resetPool } from '../config/database.js';
import {
  checkDatabase,
  checkHorizon,
  getHealthReport,
} from '../services/healthService.js';

describe('healthService', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalHorizonUrl = process.env.HORIZON_URL;

  beforeEach(() => {
    resetPool();
    delete process.env.DATABASE_URL;
    delete process.env.HORIZON_URL;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetPool();
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    if (originalHorizonUrl) {
      process.env.HORIZON_URL = originalHorizonUrl;
    } else {
      delete process.env.HORIZON_URL;
    }
  });

  describe('checkDatabase', () => {
    it('should skip when no pool is available', async () => {
      const result = await checkDatabase(null);

      expect(result).toEqual({
        status: 'skipped',
        message: 'DATABASE_URL not configured',
      });
    });

    it('should return ok when the database responds', async () => {
      const pool = {
        query: jest.fn<() => Promise<{ rows: unknown[] }>>().mockResolvedValue({ rows: [] }),
      } as unknown as pg.Pool;

      const result = await checkDatabase(pool);

      expect(result).toEqual({ status: 'ok' });
    });

    it('should return error when the database query fails', async () => {
      const pool = {
        query: jest
          .fn<() => Promise<{ rows: unknown[] }>>()
          .mockRejectedValue(new Error('Connection refused')),
      } as unknown as pg.Pool;

      const result = await checkDatabase(pool);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Connection refused');
    });
  });

  describe('checkHorizon', () => {
    it('should return ok when Horizon reports healthy', async () => {
      const fetchFn = jest.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      } as Response);

      const result = await checkHorizon('https://horizon.stellar.org', fetchFn);

      expect(result).toEqual({ status: 'ok' });
      expect(fetchFn).toHaveBeenCalledWith(
        'https://horizon.stellar.org/health',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('should return error when Horizon responds with a non-OK status', async () => {
      const fetchFn = jest.fn<typeof fetch>().mockResolvedValue({
        ok: false,
        status: 503,
      } as Response);

      const result = await checkHorizon('https://horizon.stellar.org', fetchFn);

      expect(result).toEqual({
        status: 'error',
        message: 'Horizon returned HTTP 503',
      });
    });

    it('should return error when Horizon reports unhealthy', async () => {
      const fetchFn = jest.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'starting' }),
      } as Response);

      const result = await checkHorizon('https://horizon.stellar.org', fetchFn);

      expect(result.status).toBe('error');
    });
  });

  describe('getHealthReport', () => {
    it('should return ok when no dependency checks fail', async () => {
      const fetchFn = jest.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      } as Response);

      const report = await getHealthReport({ pool: null, fetchFn });

      expect(report.status).toBe('ok');
      expect(report.checks.horizon.status).toBe('ok');
      expect(report.checks.database.status).toBe('skipped');
    });

    it('should return error when Horizon is unavailable', async () => {
      const fetchFn = jest
        .fn<typeof fetch>()
        .mockRejectedValue(new Error('Network error'));

      const report = await getHealthReport({ pool: null, fetchFn });

      expect(report.status).toBe('error');
      expect(report.checks.horizon.status).toBe('error');
    });
  });
});

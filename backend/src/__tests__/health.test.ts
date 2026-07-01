import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { resetPool } from '../config/database.js';

describe('GET /health', () => {
  const originalFetch = global.fetch;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    resetPool();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    resetPool();
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  it('should return 200 when Horizon is healthy and database is skipped', async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    } as Response);

    const response = await request(app).get('/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.checks.horizon.status).toBe('ok');
    expect(response.body.checks.database.status).toBe('skipped');
    expect(typeof response.body.uptime).toBe('number');
    expect(typeof response.body.timestamp).toBe('number');
  });

  it('should return 503 when Horizon is unavailable', async () => {
    global.fetch = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('Network error'));

    const response = await request(app).get('/health').expect(503);

    expect(response.body.status).toBe('error');
    expect(response.body.checks.horizon.status).toBe('error');
  });

  it('should return 503 when the database check fails', async () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/test';
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    } as Response);

    const { getPool } = await import('../config/database.js');
    const pool = getPool();
    if (pool) {
      jest.spyOn(pool, 'query').mockRejectedValue(new Error('Connection refused'));
    }

    const response = await request(app).get('/health').expect(503);

    expect(response.body.status).toBe('error');
    expect(response.body.checks.database.status).toBe('error');
  });
});

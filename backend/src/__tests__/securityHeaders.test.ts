import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';

describe('Security headers (Helmet)', () => {
  it('should include key security headers on API responses', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['strict-transport-security']).toMatch(
      /max-age=\d+/,
    );
  });

  it('should serve Swagger UI with security headers applied', async () => {
    const response = await request(app).get('/api/docs/').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("'self'");
  });
});

import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('./lib/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ value: 1 }]),
    users: { count: vi.fn().mockResolvedValue(0) },
  },
}));
vi.mock('./modules/resources/router.js', async () => {
  const { Router } = await import('express');
  return { domainRouter: Router() };
});
vi.mock('./config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
    JWT_EXPIRES_IN: 3600,
    COOKIE_NAME: 'test_session',
    COOKIE_SAME_SITE: 'lax',
    ALLOW_PUBLIC_SIGNUP: true,
    TRUST_PROXY: 0,
    CORS_ORIGINS: ['http://localhost:5173'],
  },
}));

import { createApp } from './app.js';

describe('application health and security headers', () => {
  it('serves health and database readiness without authentication', async () => {
    const application = createApp();
    const health = await request(application).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.data.status).toBe('ok');
    expect(health.headers['x-content-type-options']).toBe('nosniff');
    expect(health.headers['x-powered-by']).toBeUndefined();
    expect(health.headers['cache-control']).toBe('no-store');
    const ready = await request(application).get('/api/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.data.database).toBe('connected');
  });

  it('reports an empty database as requiring setup without inserting data', async () => {
    const response = await request(createApp()).get('/api/v1/setup/status');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { setupRequired: true, allowPublicSignup: true } });
  });

  it('rejects an unlisted origin and never sends a credentialed wildcard', async () => {
    const response = await request(createApp())
      .get('/api/health')
      .set('Origin', 'https://untrusted.example');
    expect(response.status).toBe(403);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  users: {
    count: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  roles: { upsert: vi.fn() },
  workspaces: { create: vi.fn() },
  workspace_members: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  audit_logs: { create: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: db }));
vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
    JWT_EXPIRES_IN: 3600,
    COOKIE_NAME: 'test_session',
    COOKIE_SAME_SITE: 'lax',
    ALLOW_PUBLIC_SIGNUP: true,
    CORS_ORIGINS: ['http://localhost:5173'],
  },
}));

import { authRouter } from './router.js';
import { bootstrap, login, signup } from './service.js';
import { issueSession, matchesFingerprint, passwordFingerprint } from './session.js';
import { authorize, hasPermission, requireAuth, requireWorkspace } from '../../middleware/auth.js';
import { errorHandler } from '../../lib/errors.js';
import { jsonReplacer } from '../../lib/serialization.js';
import { requireTrustedOrigin, sanitizeInput } from '../../middleware/security.js';

function app() {
  const application = express();
  application.set('json replacer', jsonReplacer);
  application.use(express.json(), cookieParser(), requireTrustedOrigin, sanitizeInput);
  application.use('/api/v1', authRouter);
  application.get('/protected', requireAuth, requireWorkspace, authorize('sales'), (_req, res) => {
    res.json({ data: { allowed: true } });
  });
  application.get('/issue', (_req, res) => {
    issueSession(res, { id: 5n, password_hash: 'stored-hash' });
    res.json({ data: {} });
  });
  application.use(errorHandler);
  return application;
}

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(db));
  db.audit_logs.create.mockResolvedValue({});
  db.workspace_members.findMany.mockResolvedValue([]);
});

describe('bootstrap and registration', () => {
  it('blocks a second setup, releases the advisory lock, and inserts nothing', async () => {
    db.$queryRaw
      .mockResolvedValueOnce([{ acquired: 1n }])
      .mockResolvedValueOnce([{ id: 9n }])
      .mockResolvedValueOnce([{ released: 1 }]);
    await expect(
      bootstrap({
        full_name: 'Test Owner',
        email: 'owner@example.com',
        password: 'safe-password-123',
        workspace_name: '3D Printing',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'SETUP_COMPLETE' });
    expect(db.users.create).not.toHaveBeenCalled();
    expect(db.workspaces.create).not.toHaveBeenCalled();
    expect(db.$queryRaw).toHaveBeenCalledTimes(3);
  });

  it('creates only the first user, owner role, workspace, membership, and audit in one transaction', async () => {
    db.$queryRaw
      .mockResolvedValueOnce([{ acquired: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ released: 1 }]);
    db.roles.upsert.mockResolvedValue({ id: 2n });
    db.users.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      id: 5n,
    }));
    db.workspaces.create.mockResolvedValue({ id: 7n, name: '3D Printing' });
    db.workspace_members.create.mockResolvedValue({ id: 1n });
    const user = await bootstrap({
      full_name: 'Test Owner',
      email: 'owner@example.com',
      password: 'safe-password-123',
      workspace_name: '3D Printing',
    });
    expect(user.account_status).toBe('ACTIVE');
    expect(await bcrypt.compare('safe-password-123', user.password_hash)).toBe(true);
    expect(db.workspace_members.create).toHaveBeenCalledWith({
      data: { workspace_id: 7n, user_id: 5n, role_id: 2n, membership_status: 'ACTIVE' },
    });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('registration cannot bypass the first-run setup', async () => {
    db.users.count.mockResolvedValue(0);
    await expect(
      signup({
        full_name: 'Pending User',
        email: 'pending@example.com',
        password: 'safe-password-123',
      }),
    ).rejects.toMatchObject({ code: 'SETUP_REQUIRED' });
    expect(db.users.create).not.toHaveBeenCalled();
  });

  it('registers a pending user with a bcrypt hash and no membership', async () => {
    db.users.count.mockResolvedValue(1);
    db.users.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      id: 8n,
    }));
    const user = await signup({
      full_name: 'Pending User',
      email: 'pending@example.com',
      password: 'safe-password-123',
    });
    expect(user.account_status).toBe('PENDING');
    expect(await bcrypt.compare('safe-password-123', user.password_hash)).toBe(true);
    expect(db.workspace_members.create).not.toHaveBeenCalled();
  });

  it('validates login against the stored hash and hides failure details', async () => {
    const hash = await bcrypt.hash('safe-password-123', 4);
    db.users.findUnique.mockResolvedValue({
      id: 5n,
      password_hash: hash,
      account_status: 'ACTIVE',
      is_active: true,
    });
    await expect(login('owner@example.com', 'incorrect')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    });
    const user = await login('owner@example.com', 'safe-password-123');
    expect(user.id).toBe(5n);
    expect(db.users.update).toHaveBeenCalledTimes(1);
  });
});

describe('HTTP security and workspace isolation', () => {
  it('rejects unauthenticated requests', async () => {
    const result = await request(app()).get('/protected').set('X-Workspace-Id', '7');
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects browser mutations without a trusted Origin', async () => {
    const result = await request(app())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@example.com', password: 'test' });
    expect(result.status).toBe(403);
    expect(db.users.findUnique).not.toHaveBeenCalled();
  });

  it('never trusts a client-supplied workspace ID without checking membership', async () => {
    const application = app();
    const session = await request(application).get('/issue');
    db.users.findUnique.mockResolvedValue({
      id: 5n,
      password_hash: 'stored-hash',
      account_status: 'ACTIVE',
      is_active: true,
    });
    db.workspace_members.findFirst.mockResolvedValue(null);
    const result = await request(application)
      .get('/protected')
      .set('Cookie', session.headers['set-cookie'])
      .set('X-Workspace-Id', '99');
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe('WORKSPACE_FORBIDDEN');
    expect(db.workspace_members.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspace_id: 99n,
          user_id: 5n,
          membership_status: 'ACTIVE',
        }),
      }),
    );
  });

  it('denies write permission even to a member when their role lacks it', async () => {
    const application = app();
    const session = await request(application).get('/issue');
    db.users.findUnique.mockResolvedValue({
      id: 5n,
      password_hash: 'stored-hash',
      account_status: 'ACTIVE',
      is_active: true,
    });
    db.workspace_members.findFirst.mockResolvedValue({
      roles: { code: 'OPERATOR', is_active: true },
    });
    const result = await request(application)
      .get('/protected')
      .set('Cookie', session.headers['set-cookie'])
      .set('X-Workspace-Id', '7');
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe('FORBIDDEN');
  });

  it('invalidates an existing cookie when the password hash changes', async () => {
    const application = app();
    const session = await request(application).get('/issue');
    db.users.findUnique.mockResolvedValue({
      id: 5n,
      password_hash: 'new-password-hash',
      account_status: 'ACTIVE',
      is_active: true,
    });
    const result = await request(application)
      .get('/protected')
      .set('Cookie', session.headers['set-cookie'])
      .set('X-Workspace-Id', '7');
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('SESSION_EXPIRED');
    expect(db.workspace_members.findFirst).not.toHaveBeenCalled();
  });

  it('sets an HttpOnly cookie and never serializes credential fields', async () => {
    const session = await request(app()).get('/issue');
    expect(session.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(session.headers['set-cookie'][0]).toContain('SameSite=Lax');
    const json = JSON.stringify(
      {
        id: 9007199254740993n,
        password_hash: 'private',
        nested: { token_hash: 'private', object_key: 'private' },
      },
      jsonReplacer,
    );
    expect(JSON.parse(json)).toEqual({ id: '9007199254740993', nested: {} });
  });

  it('returns field errors without leaking submitted secrets', async () => {
    const result = await request(app())
      .post('/api/v1/auth/signup')
      .set('Origin', 'http://localhost:5173')
      .send({ full_name: 'A', email: 'invalid', password: 'secret' });
    expect(result.status).toBe(422);
    expect(JSON.stringify(result.body)).not.toContain('secret');
    expect(db.users.create).not.toHaveBeenCalled();
  });

  it('gives supported roles explicit broad permissions and denies unknown roles', () => {
    expect(hasPermission('OWNER', 'settings')).toBe(true);
    expect(hasPermission('MANAGER', 'finance')).toBe(true);
    expect(hasPermission('MANAGER', 'settings')).toBe(false);
    expect(hasPermission('DESIGNER', 'production')).toBe(false);
    expect(hasPermission('UNKNOWN', 'read')).toBe(false);
    expect(matchesFingerprint('old', passwordFingerprint('new'))).toBe(false);
  });
});

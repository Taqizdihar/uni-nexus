import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  users: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  roles: { findFirst: vi.fn() },
  workspaces: { create: vi.fn() },
  workspace_members: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  system_bootstrap: { update: vi.fn() },
  audit_logs: { create: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: db }));
vi.mock('../user-management/service.js', () => ({ notifyReviewers: vi.fn() }));
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
import { changePassword, login, signup } from './service.js';
import { issueSession, matchesFingerprint, passwordFingerprint } from './session.js';
import {
  authorize,
  hasPermission,
  requireAuth,
  requireWorkspace,
} from '../../middleware/auth.js';
import { errorHandler } from '../../lib/errors.js';
import { jsonReplacer } from '../../lib/serialization.js';
import { requireTrustedOrigin, sanitizeInput } from '../../middleware/security.js';

const validSignup = {
  full_name: 'Pending User',
  username: 'pendinguser',
  email: 'pending@example.com',
  phone: '+62 812-0000-0000',
  password: 'safe-password-123',
};
const bootstrapEmail = 'm.taqizdihar@gmail.com';

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
  db.users.findFirst.mockResolvedValue(null);
  db.$queryRaw.mockResolvedValue([
    { id: 1, cto_email: bootstrapEmail, default_workspace_id: null, claimed_at: null },
  ]);
});

describe('registration and the one-time CTO bootstrap', () => {
  // Each case hashes a real password at bcrypt cost 12; under parallel test-worker load this can
  // occasionally exceed vitest's 5s default.
  it('registers a pending user with no role, no membership, and no session', { timeout: 15000 }, async () => {
    db.users.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      id: 8n,
    }));
    const result = await signup(validSignup);
    expect(result.bootstrapped).toBe(false);
    expect(result.user.account_status).toBe('PENDING');
    expect(await bcrypt.compare('safe-password-123', result.user.password_hash as string)).toBe(
      true,
    );
    expect(db.workspace_members.create).not.toHaveBeenCalled();
    expect(db.workspaces.create).not.toHaveBeenCalled();
    expect(db.roles.findFirst).not.toHaveBeenCalled();
  });

  it('enforces username uniqueness with a friendly error', { timeout: 15000 }, async () => {
    db.users.findFirst.mockResolvedValueOnce({ id: 1n });
    await expect(signup(validSignup)).rejects.toMatchObject({
      code: 'USERNAME_TAKEN',
      status: 409,
    });
    expect(db.users.create).not.toHaveBeenCalled();
  });

  it('enforces email uniqueness', { timeout: 15000 }, async () => {
    db.users.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 1n });
    await expect(signup(validSignup)).rejects.toMatchObject({ code: 'EMAIL_TAKEN', status: 409 });
    expect(db.users.create).not.toHaveBeenCalled();
  });

  it('claims the CTO bootstrap the first time, case-insensitively', { timeout: 15000 }, async () => {
    db.$queryRaw.mockResolvedValue([
      { id: 1, cto_email: 'M.Taqizdihar@Gmail.com', default_workspace_id: null, claimed_at: null },
    ]);
    db.roles.findFirst.mockResolvedValue({ id: 3n, code: 'CTO' });
    db.workspaces.create.mockResolvedValue({ id: 9n, name: '3D Printing', code: 'WS_ABC' });
    db.users.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      id: 1n,
    }));
    db.workspace_members.create.mockResolvedValue({ id: 1n });
    db.system_bootstrap.update.mockResolvedValue({});
    const result = await signup({ ...validSignup, username: 'taqi', email: bootstrapEmail });
    expect(result.bootstrapped).toBe(true);
    expect(result.user.account_status).toBe('ACTIVE');
    expect(result.user.default_workspace_id).toBe(9n);
    expect(db.workspace_members.create).toHaveBeenCalledWith({
      data: { workspace_id: 9n, user_id: 1n, role_id: 3n, membership_status: 'ACTIVE' },
    });
    expect(db.system_bootstrap.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ claimed_by_user_id: 1n, default_workspace_id: 9n }),
    });
  });

  it('cannot be claimed a second time even by the same email', { timeout: 15000 }, async () => {
    db.$queryRaw.mockResolvedValue([
      { id: 1, cto_email: bootstrapEmail, default_workspace_id: 9n, claimed_at: new Date() },
    ]);
    db.users.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      id: 2n,
    }));
    const result = await signup({ ...validSignup, username: 'taqi2', email: bootstrapEmail });
    expect(result.bootstrapped).toBe(false);
    expect(result.user.account_status).toBe('PENDING');
    expect(db.workspaces.create).not.toHaveBeenCalled();
    expect(db.workspace_members.create).not.toHaveBeenCalled();
  });

  it('never grants the bootstrap to any other email', { timeout: 15000 }, async () => {
    db.users.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      id: 4n,
    }));
    const result = await signup(validSignup);
    expect(result.bootstrapped).toBe(false);
    expect(db.roles.findFirst).not.toHaveBeenCalled();
  });
});

describe('login account-status behavior', () => {
  it('blocks a pending account with the correct password', async () => {
    const hash = await bcrypt.hash('safe-password-123', 4);
    db.users.findUnique.mockResolvedValue({
      id: 5n,
      password_hash: hash,
      account_status: 'PENDING',
      is_active: true,
    });
    await expect(login('pending@example.com', 'safe-password-123')).rejects.toMatchObject({
      code: 'ACCOUNT_PENDING',
      status: 403,
    });
    expect(db.users.update).not.toHaveBeenCalled();
  });

  it('blocks a rejected account and surfaces the reason', async () => {
    const hash = await bcrypt.hash('safe-password-123', 4);
    db.users.findUnique.mockResolvedValue({
      id: 5n,
      password_hash: hash,
      account_status: 'REJECTED',
      is_active: true,
      rejection_reason: 'Not affiliated with the team.',
    });
    await expect(login('rejected@example.com', 'safe-password-123')).rejects.toMatchObject({
      code: 'ACCOUNT_REJECTED',
      status: 403,
      details: { reason: 'Not affiliated with the team.' },
    });
  });

  it('blocks a suspended account', async () => {
    const hash = await bcrypt.hash('safe-password-123', 4);
    db.users.findUnique.mockResolvedValue({
      id: 5n,
      password_hash: hash,
      account_status: 'SUSPENDED',
      is_active: true,
    });
    await expect(login('suspended@example.com', 'safe-password-123')).rejects.toMatchObject({
      code: 'ACCOUNT_SUSPENDED',
      status: 403,
    });
  });

  it('logs an active account in and hides failure details for a bad password', async () => {
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

describe('password change', () => {
  it('updates password_changed_at and rejects a reused password', { timeout: 15000 }, async () => {
    const hash = await bcrypt.hash('old-password-123456', 4);
    db.users.findUnique.mockResolvedValue({ id: 5n, password_hash: hash });
    db.users.updateMany.mockResolvedValue({ count: 1 });
    await changePassword(5n, 'old-password-123456', 'new-password-abcdef');
    expect(db.users.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password_changed_at: expect.any(Date) }) }),
    );
    await expect(
      changePassword(5n, 'old-password-123456', 'old-password-123456'),
    ).rejects.toMatchObject({ code: 'PASSWORD_UNCHANGED' });
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
  });

  it('rejects a pending account even with a previously valid session', async () => {
    const application = app();
    const session = await request(application).get('/issue');
    db.users.findUnique.mockResolvedValue({
      id: 5n,
      password_hash: 'stored-hash',
      account_status: 'PENDING',
      is_active: true,
    });
    const result = await request(application)
      .get('/protected')
      .set('Cookie', session.headers['set-cookie'])
      .set('X-Workspace-Id', '7');
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('SESSION_EXPIRED');
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
      roles: { code: 'STAFF', is_active: true },
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

  it('gives every official role its intended user_management access', () => {
    expect(hasPermission('CEO', 'user_management')).toBe(true);
    expect(hasPermission('COO', 'user_management')).toBe(true);
    expect(hasPermission('CTO', 'user_management')).toBe(true);
    expect(hasPermission('CVO', 'user_management')).toBe(true);
    expect(hasPermission('3D_DESIGNER', 'user_management')).toBe(false);
    expect(hasPermission('STAFF_OF_SPECIALTY', 'user_management')).toBe(false);
    expect(hasPermission('STAFF', 'user_management')).toBe(false);
    expect(hasPermission('CTO', 'finance')).toBe(true);
    expect(hasPermission('UNKNOWN', 'read')).toBe(false);
    expect(matchesFingerprint('old', passwordFingerprint('new'))).toBe(false);
  });
});

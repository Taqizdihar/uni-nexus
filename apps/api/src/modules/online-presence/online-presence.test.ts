import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  users: { findUnique: vi.fn() },
  workspace_members: { findFirst: vi.fn(), findMany: vi.fn() },
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: db }));
vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
    JWT_EXPIRES_IN: 3600,
    COOKIE_NAME: 'test_session',
    COOKIE_SAME_SITE: 'lax',
    LOCAL_STORAGE_PATH: '/tmp/uni-nexus-test-uploads',
    MAX_UPLOAD_SIZE: 20971520,
  },
}));

import { onlinePresenceRouter } from './router.js';
import { HEARTBEAT_TTL_MS, listOnline, recordHeartbeat, removeSession } from './service.js';
import { issueSession } from '../auth/session.js';
import { errorHandler } from '../../lib/errors.js';
import { jsonReplacer } from '../../lib/serialization.js';

const activeUser = { id: 1n, password_hash: 'stored-hash', is_active: true, account_status: 'ACTIVE' };
const activeMembership = { roles: { is_active: true, code: 'STAFF' } };

const member = (overrides: Record<string, unknown> = {}) => ({
  users: {
    id: 1n,
    full_name: 'Budi Santoso',
    username: 'budi',
    presence_status: 'DEFAULT',
    user_profile_assets: [],
  },
  roles: { code: 'STAFF', name: 'Staff' },
  ...overrides,
});

function app() {
  const application = express();
  application.set('json replacer', jsonReplacer);
  application.use(express.json(), cookieParser());
  application.use('/api/v1', onlinePresenceRouter);
  application.get('/issue/:id', (request_, response) => {
    issueSession(response, { id: BigInt(request_.params.id), password_hash: 'stored-hash' });
    response.json({ data: {} });
  });
  application.use(errorHandler);
  return application;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('online-presence router: auth and workspace gating', () => {
  it('rejects a heartbeat with no session', async () => {
    const response = await request(app()).post('/api/v1/online-presence/heartbeat');
    expect(response.status).toBe(401);
  });

  it('rejects a heartbeat without a valid workspace membership', async () => {
    db.users.findUnique.mockResolvedValue(activeUser);
    db.workspace_members.findFirst.mockResolvedValue(null);
    const agent = request.agent(app());
    await agent.get('/issue/1');
    const response = await agent.post('/api/v1/online-presence/heartbeat').set('X-Workspace-Id', '7');
    expect(response.status).toBe(403);
  });

  it('lets an ACTIVE user with an ACTIVE membership heartbeat', async () => {
    db.users.findUnique.mockResolvedValue(activeUser);
    db.workspace_members.findFirst.mockResolvedValue(activeMembership);
    const agent = request.agent(app());
    await agent.get('/issue/1');
    const response = await agent.post('/api/v1/online-presence/heartbeat').set('X-Workspace-Id', '7');
    expect(response.status).toBe(204);
  });

  it('blocks a non-ACTIVE account at requireAuth, before any workspace check runs', async () => {
    db.users.findUnique.mockResolvedValue({ ...activeUser, account_status: 'SUSPENDED' });
    const agent = request.agent(app());
    await agent.get('/issue/1');
    const response = await agent.post('/api/v1/online-presence/heartbeat').set('X-Workspace-Id', '7');
    expect(response.status).toBe(401);
    expect(db.workspace_members.findFirst).not.toHaveBeenCalled();
  });

  it('requires authentication to read the online list too', async () => {
    const response = await request(app()).get('/api/v1/online-presence');
    expect(response.status).toBe(401);
  });
});

describe('presence registry (service)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns nobody when there has been no heartbeat', async () => {
    // A workspace id no other test in this file ever heartbeats into — the in-memory
    // registry is real, process-wide state, so this avoids order-dependent pollution.
    const result = await listOnline(999n);
    expect(result).toEqual([]);
    expect(db.workspace_members.findMany).not.toHaveBeenCalled();
  });

  it('returns a recently active user, including the caller themself', async () => {
    db.workspace_members.findMany.mockResolvedValue([member()]);
    recordHeartbeat('00000000-0000-4000-8000-000000000001', 1n, 7n);
    const result = await listOnline(7n);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 1n, full_name: 'Budi Santoso', username: 'budi' });
  });

  it('excludes a heartbeat once it has expired past the TTL', async () => {
    vi.useFakeTimers();
    db.workspace_members.findMany.mockResolvedValue([member()]);
    recordHeartbeat('00000000-0000-4000-8000-000000000002', 1n, 7n);
    vi.advanceTimersByTime(HEARTBEAT_TTL_MS + 1000);
    const result = await listOnline(7n);
    expect(result).toEqual([]);
  });

  it('never returns a user heartbeating in a different workspace', async () => {
    db.workspace_members.findMany.mockResolvedValue([member()]);
    recordHeartbeat('00000000-0000-4000-8000-000000000003', 1n, 7n);
    const result = await listOnline(99n);
    expect(result).toEqual([]);
  });

  it('does not leak email, phone, or other private fields', async () => {
    db.workspace_members.findMany.mockResolvedValue([
      member({ users: { ...member().users, email: 'leak@example.com', phone: '0812' } }),
    ]);
    recordHeartbeat('00000000-0000-4000-8000-000000000004', 1n, 7n);
    const result = await listOnline(7n);
    expect(Object.keys(result[0]).sort()).toEqual(
      ['full_name', 'id', 'photo_url', 'presence_status', 'role', 'username'].sort(),
    );
  });

  it('keeps a user online across repeated heartbeats that refresh their lastSeen', async () => {
    vi.useFakeTimers();
    db.workspace_members.findMany.mockResolvedValue([member()]);
    recordHeartbeat('00000000-0000-4000-8000-000000000005', 1n, 7n);
    vi.advanceTimersByTime(HEARTBEAT_TTL_MS - 10_000);
    recordHeartbeat('00000000-0000-4000-8000-000000000005', 1n, 7n);
    vi.advanceTimersByTime(HEARTBEAT_TTL_MS - 10_000);
    const result = await listOnline(7n);
    expect(result).toHaveLength(1);
  });

  it('removes only the session that explicitly signs out', async () => {
    db.workspace_members.findMany.mockResolvedValue([member()]);
    const session = '00000000-0000-4000-8000-000000000006';
    recordHeartbeat(session, 1n, 70n);
    removeSession(session);
    await expect(listOnline(70n)).resolves.toEqual([]);
  });

  it('deduplicates multiple sessions, but keeps the user online until the final session ends', async () => {
    db.workspace_members.findMany.mockResolvedValue([member()]);
    const one = '00000000-0000-4000-8000-000000000007';
    const two = '00000000-0000-4000-8000-000000000008';
    recordHeartbeat(one, 1n, 71n);
    recordHeartbeat(two, 1n, 71n);
    expect(await listOnline(71n)).toHaveLength(1);
    removeSession(one);
    expect(await listOnline(71n)).toHaveLength(1);
    removeSession(two);
    expect(await listOnline(71n)).toEqual([]);
  });

  it('queries only active users with an active workspace membership and current presence', async () => {
    db.workspace_members.findMany.mockResolvedValue([member({ users: { ...member().users, presence_status: 'BUSY' } })]);
    recordHeartbeat('00000000-0000-4000-8000-000000000009', 1n, 7n);
    const result = await listOnline(7n);
    expect(result[0]).toMatchObject({ presence_status: 'BUSY' });
    expect(db.workspace_members.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ membership_status: 'ACTIVE', users: { is_active: true, account_status: 'ACTIVE' } }) }));
  });
});

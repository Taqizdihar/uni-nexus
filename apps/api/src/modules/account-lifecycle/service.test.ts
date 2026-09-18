import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
const db = vi.hoisted(() => ({
  users: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  workspace_members: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  account_deactivation_requests: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  system_bootstrap: { findUnique: vi.fn() },
  audit_logs: { create: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));
const send = vi.hoisted(() => vi.fn());
vi.mock('../../lib/prisma.js', () => ({ prisma: db }));
vi.mock('../../services/notifications.js', () => ({
  InAppNotificationProvider: class {
    send = send;
  },
}));
import {
  deactivateAccount,
  getOwnDeactivationRequest,
  listDeactivationRequests,
  reactivateAccount,
  reviewDeactivationRequest,
  submitDeactivationRequest,
  withdrawDeactivationRequest,
} from './service.js';
import { repository } from '../resources/repository.js';
import { userManagementRouter } from '../user-management/router.js';
import { issueSession } from '../auth/session.js';
import { env } from '../../config/env.js';
import { errorHandler } from '../../lib/errors.js';
import { jsonReplacer } from '../../lib/serialization.js';
const member = (code: string, workspace_id = 9n) => ({ workspace_id, roles: { code, name: code } });
const account = (id: bigint, code: string, account_status = 'ACTIVE') => ({
  id,
  is_active: true,
  account_status,
  workspace_members: [member(code)],
  password_hash: 'fixture-password-hash',
  full_name: `User ${id}`,
  username: `user${id}`,
  user_profile_assets: [],
});
let accounts: Map<bigint, ReturnType<typeof account>>;
let requestRow: {
  id: bigint;
  user_id: bigint;
  request_status: string;
  request_reason: string | null;
};
beforeEach(() => {
  vi.resetAllMocks();
  accounts = new Map([
    [1n, account(1n, 'CEO')],
    [2n, account(2n, 'STAFF')],
  ]);
  requestRow = {
    id: 10n,
    user_id: 2n,
    request_status: 'PENDING',
    request_reason: 'Saya ingin berhenti.',
  };
  db.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(db));
  db.$queryRaw.mockResolvedValue([{ id: 1n }]);
  db.users.findUnique.mockImplementation(({ where }: { where: { id: bigint } }) =>
    accounts.get(where.id),
  );
  db.users.count.mockResolvedValue(1);
  db.users.findUniqueOrThrow.mockResolvedValue({ email: 'cto@example.test' });
  db.system_bootstrap.findUnique.mockResolvedValue(null);
  db.users.findMany.mockImplementation(() => [...accounts.values()]);
  db.users.update.mockImplementation(({ where, data }: { where: { id: bigint }; data: object }) => {
    const updated = { ...accounts.get(where.id)!, ...data };
    accounts.set(where.id, updated);
    return updated;
  });
  db.workspace_members.findFirst.mockResolvedValue({ workspace_id: 9n });
  db.account_deactivation_requests.findFirst.mockResolvedValue(null);
  db.account_deactivation_requests.create.mockImplementation(({ data }: { data: object }) => ({
    id: 10n,
    ...data,
  }));
  db.account_deactivation_requests.findUnique.mockImplementation(() => ({ ...requestRow }));
  db.account_deactivation_requests.findUniqueOrThrow.mockImplementation(() => ({ ...requestRow }));
  db.account_deactivation_requests.updateMany.mockImplementation(({ data }: { data: object }) => {
    if (requestRow.request_status !== 'PENDING') return { count: 0 };
    requestRow = { ...requestRow, ...data };
    return { count: 1 };
  });
});
describe('self request and withdrawal', () => {
  it('creates PENDING without changing account or memberships, and notifies eligible reviewers only', async () => {
    const result = await submitDeactivationRequest(2n);
    expect(result.request_status).toBe('PENDING');
    expect(db.users.update).not.toHaveBeenCalled();
    expect(db.account_deactivation_requests.create.mock.calls[0][0].data).not.toHaveProperty(
      'pending_user_id',
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].recipientUserId).toBe(1n);
  });
  it.each(['PENDING', 'REJECTED', 'SUSPENDED'])(
    'refuses new requests from %s accounts',
    async (status) => {
      accounts.set(2n, account(2n, 'STAFF', status));
      await expect(submitDeactivationRequest(2n)).rejects.toMatchObject({
        code: 'ACCOUNT_ACTION_FORBIDDEN',
      });
      expect(db.account_deactivation_requests.create).not.toHaveBeenCalled();
    },
  );
  it('handles both existing pending requests and the database unique constraint', async () => {
    db.account_deactivation_requests.findFirst.mockResolvedValue(requestRow);
    await expect(submitDeactivationRequest(2n)).rejects.toMatchObject({
      code: 'DEACTIVATION_REQUEST_ALREADY_PENDING',
    });
    db.account_deactivation_requests.findFirst.mockResolvedValue(null);
    db.account_deactivation_requests.create.mockRejectedValue({ code: 'P2002' });
    await expect(submitDeactivationRequest(2n)).rejects.toMatchObject({
      code: 'DEACTIVATION_REQUEST_ALREADY_PENDING',
    });
  });
  it('owner withdraws without changing account status', async () => {
    expect((await withdrawDeactivationRequest(2n, 10n)).request_status).toBe('WITHDRAWN');
    expect(db.account_deactivation_requests.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10n, request_status: 'PENDING' },
        data: expect.objectContaining({ withdrawn_at: expect.any(Date) }),
      }),
    );
    expect(db.users.update).not.toHaveBeenCalled();
    expect(db.audit_logs.create.mock.calls[0][0].data.action).toBe(
      'ACCOUNT_DEACTIVATION_WITHDRAWN',
    );
  });
  it('another user cannot withdraw', async () => {
    await expect(withdrawDeactivationRequest(1n, 10n)).rejects.toMatchObject({
      code: 'DEACTIVATION_REQUEST_FORBIDDEN',
    });
    expect(db.account_deactivation_requests.updateMany).not.toHaveBeenCalled();
  });
  it.each(['APPROVED', 'REJECTED', 'WITHDRAWN'])('cannot withdraw %s requests', async (status) => {
    requestRow.request_status = status;
    await expect(withdrawDeactivationRequest(2n, 10n)).rejects.toMatchObject({
      code: 'DEACTIVATION_REQUEST_ALREADY_RESOLVED',
    });
  });
  it('returns a stable not-found error', async () => {
    db.account_deactivation_requests.findUnique.mockResolvedValue(null);
    await expect(withdrawDeactivationRequest(2n, 10n)).rejects.toMatchObject({
      code: 'DEACTIVATION_REQUEST_NOT_FOUND',
    });
  });
  it('loads the latest own request, independently of registration status', async () => {
    db.account_deactivation_requests.findFirst.mockResolvedValue(requestRow);
    expect(await getOwnDeactivationRequest(2n)).toMatchObject({ user_id: 2n });
    expect(db.account_deactivation_requests.findFirst.mock.calls[0][0].where).toEqual({
      user_id: 2n,
    });
  });
});
describe('review and lifecycle invariants', () => {
  it('protects the last reviewer, while allowing the claimed bootstrap CTO recovery path', async () => {
    db.users.count.mockResolvedValue(0);
    accounts.set(2n, account(2n, 'CEO'));
    await expect(reviewDeactivationRequest(2n, 10n, 'APPROVED')).rejects.toMatchObject({
      code: 'LAST_REVIEWER',
    });
    accounts.set(2n, account(2n, 'CTO'));
    db.system_bootstrap.findUnique.mockResolvedValue({
      id: 1,
      claimed_by_user_id: 2n,
      cto_email: 'cto@example.test',
    });
    expect((await reviewDeactivationRequest(2n, 10n, 'APPROVED')).session_ended).toBe(true);
  });
  it('approval suspends with metadata while preserving role, membership and is_active', async () => {
    const originalMemberships = accounts.get(2n)!.workspace_members;
    const result = await reviewDeactivationRequest(1n, 10n, 'APPROVED', 'Disetujui');
    expect(result).toMatchObject({ request_status: 'APPROVED', session_ended: false });
    expect(accounts.get(2n)).toMatchObject({
      account_status: 'SUSPENDED',
      is_active: true,
      workspace_members: originalMemberships,
    });
    expect(db.users.update.mock.calls[0][0].data).toMatchObject({
      deactivation_source: 'SELF_REQUEST',
      deactivated_by_user_id: 1n,
      deactivated_at: expect.any(Date),
      deactivation_reason: requestRow.request_reason,
      reactivated_by_user_id: null,
      reactivated_at: null,
    });
    expect(db.users.update.mock.calls[0][0].data).not.toHaveProperty('is_active');
    for (const action of ['update', 'updateMany', 'deleteMany'] as const)
      expect(db.workspace_members[action]).not.toHaveBeenCalled();
    expect(db.audit_logs.create.mock.calls.map((call) => call[0].data.action)).toEqual([
      'USER_DEACTIVATED',
      'ACCOUNT_DEACTIVATION_APPROVED',
    ]);
  });
  it('rejection requires a note and leaves account active', async () => {
    await expect(reviewDeactivationRequest(1n, 10n, 'REJECTED', ' ')).rejects.toThrow();
    expect(
      (await reviewDeactivationRequest(1n, 10n, 'REJECTED', 'Masih diperlukan')).request_status,
    ).toBe('REJECTED');
    expect(accounts.get(2n)!.account_status).toBe('ACTIVE');
    expect(db.users.update).not.toHaveBeenCalled();
  });
  it.each(['WITHDRAWN', 'APPROVED', 'REJECTED'])('cannot approve %s requests', async (status) => {
    requestRow.request_status = status;
    await expect(reviewDeactivationRequest(1n, 10n, 'APPROVED')).rejects.toMatchObject({
      code: 'DEACTIVATION_REQUEST_ALREADY_RESOLVED',
    });
    expect(db.users.update).not.toHaveBeenCalled();
  });
  it('conditional resolution detects competing review or withdrawal', async () => {
    db.account_deactivation_requests.updateMany.mockResolvedValue({ count: 0 });
    await expect(reviewDeactivationRequest(1n, 10n, 'APPROVED')).rejects.toMatchObject({
      code: 'DEACTIVATION_REQUEST_ALREADY_RESOLVED',
    });
    await expect(withdrawDeactivationRequest(2n, 10n)).rejects.toMatchObject({
      code: 'DEACTIVATION_REQUEST_ALREADY_RESOLVED',
    });
    expect(db.users.update).not.toHaveBeenCalled();
    expect(db.audit_logs.create).not.toHaveBeenCalled();
  });
  it.each(['CTO', 'CEO', 'COO', 'CVO'])(
    'eligible %s self approval requests session termination',
    async (role) => {
      accounts.set(2n, account(2n, role));
      expect((await reviewDeactivationRequest(2n, 10n, 'APPROVED')).session_ended).toBe(true);
    },
  );
  it('re-reads roles and target status inside the transaction', async () => {
    accounts.set(1n, account(1n, 'STAFF'));
    await expect(reviewDeactivationRequest(1n, 10n, 'APPROVED')).rejects.toMatchObject({
      code: 'DEACTIVATION_REQUEST_FORBIDDEN',
    });
    accounts.set(1n, account(1n, 'CEO'));
    accounts.set(2n, account(2n, 'STAFF', 'SUSPENDED'));
    await expect(reviewDeactivationRequest(1n, 10n, 'APPROVED')).rejects.toMatchObject({
      code: 'DEACTIVATION_REQUEST_FORBIDDEN',
    });
    expect(db.users.update).not.toHaveBeenCalled();
  });
  it('direct deactivation requires 10 characters and creates no fake request', async () => {
    await expect(deactivateAccount(1n, 2n, 'short')).rejects.toThrow();
    expect((await deactivateAccount(1n, 2n, 'Akses tidak diperlukan')).account_status).toBe(
      'SUSPENDED',
    );
    expect(db.users.update.mock.calls[0][0].data.deactivation_source).toBe('DIRECT_ADMIN');
    expect(db.account_deactivation_requests.create).not.toHaveBeenCalled();
  });
  it('the service denies direct CTO/CEO actions and peer deactivation', async () => {
    for (const role of ['CTO', 'CEO']) {
      accounts.set(2n, account(2n, role));
      await expect(deactivateAccount(1n, 2n, 'Akses tidak diperlukan')).rejects.toMatchObject({
        code: 'ACCOUNT_ACTION_FORBIDDEN',
      });
    }
    accounts.set(1n, account(1n, 'COO'));
    accounts.set(2n, account(2n, 'CVO'));
    await expect(deactivateAccount(1n, 2n, 'Akses tidak diperlukan')).rejects.toMatchObject({
      code: 'ACCOUNT_ACTION_FORBIDDEN',
    });
  });
  it('reactivates with actor and timestamp while retaining deactivation history', async () => {
    accounts.set(2n, account(2n, 'STAFF', 'SUSPENDED'));
    await reactivateAccount(1n, 2n, 'Kembali bekerja');
    expect(db.users.update.mock.calls[0][0].data).toEqual({
      account_status: 'ACTIVE',
      reactivated_by_user_id: 1n,
      reactivated_at: expect.any(Date),
    });
    expect(db.account_deactivation_requests.updateMany).not.toHaveBeenCalled();
  });
  it('reactivation does not bypass CEO protection or status checks', async () => {
    accounts.set(2n, account(2n, 'CEO', 'SUSPENDED'));
    await expect(reactivateAccount(1n, 2n)).rejects.toMatchObject({
      code: 'ACCOUNT_ACTION_FORBIDDEN',
    });
    accounts.set(2n, account(2n, 'STAFF'));
    await expect(reactivateAccount(1n, 2n)).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_SUSPENDED',
    });
  });
});
describe('capabilities, notifications and dedicated-resource security', () => {
  it('does not send CEO/CTO requests to unauthorized reviewers', async () => {
    accounts.set(2n, account(2n, 'CTO'));
    accounts.set(3n, account(3n, 'COO'));
    await submitDeactivationRequest(2n);
    expect(send.mock.calls.map((call) => call[0].recipientUserId)).toEqual([2n]);
  });
  it('COO request notifies CEO and self, excluding CVO', async () => {
    accounts.set(2n, account(2n, 'COO'));
    accounts.set(3n, account(3n, 'CVO'));
    await submitDeactivationRequest(2n);
    expect(send.mock.calls.map((call) => call[0].recipientUserId)).toEqual([1n, 2n]);
  });
  it('request list hides private fields and returns role-specific capabilities', async () => {
    const target = account(2n, 'CTO');
    db.account_deactivation_requests.findMany.mockResolvedValue([
      { ...requestRow, users_account_deactivation_requests_user_idTousers: target },
    ]);
    db.account_deactivation_requests.count.mockResolvedValue(1);
    const result = await listDeactivationRequests(1n, { page: 1, pageSize: 20 });
    expect(result.pending_count).toBe(1);
    expect(result.data[0].allowed_actions).toEqual({ approve: false, reject: false });
    expect(result.data[0].user).not.toHaveProperty('password_hash');
    expect(result.data[0]).not.toHaveProperty('pending_user_id');
  });
  it.each([
    'users',
    'roles',
    'workspace_members',
    'system_bootstrap',
    'account_deactivation_requests',
  ])('blocks generic %s writes', (table) => {
    expect(() => repository(db as unknown as Prisma.TransactionClient, table)).toThrow(
      'dedicated account API',
    );
  });
});
describe('HTTP lifecycle contracts', () => {
  function app(actorId = 1n) {
    const application = express();
    application.set('json replacer', jsonReplacer);
    application.use(express.json(), cookieParser());
    application.get('/fixture-session', (_request, response) => {
      issueSession(response, accounts.get(actorId)!);
      response.json({ data: {} });
    });
    application.use('/api/v1', userManagementRouter);
    application.use(errorHandler);
    return application;
  }
  it('self approval clears the cookie and the suspended account cannot reuse its old session', async () => {
    accounts.set(2n, account(2n, 'CTO'));
    const application = app(2n);
    const fixtureSession = await request(application).get('/fixture-session');
    const cookie = fixtureSession.headers['set-cookie'][0].split(';')[0];
    const result = await request(application)
      .post('/api/v1/user-management/deactivation-requests/10/approve')
      .set('Cookie', cookie)
      .send({});
    expect(result.status).toBe(200);
    expect(result.body.data.session_ended).toBe(true);
    expect(result.headers['set-cookie'][0]).toContain(`${env.COOKIE_NAME}=;`);
    expect(
      (await request(application).get('/api/v1/user-management/summary').set('Cookie', cookie))
        .status,
    ).toBe(401);
  });
  it.each(['deactivate', 'suspend'])(
    'the %s route requires a reason and cannot bypass protected targets',
    async (action) => {
      const application = app();
      const fixtureSession = await request(application).get('/fixture-session');
      const cookie = fixtureSession.headers['set-cookie'][0].split(';')[0];
      const missing = await request(application)
        .post(`/api/v1/user-management/2/${action}`)
        .set('Cookie', cookie)
        .send({});
      expect(missing.status).toBe(422);
      accounts.set(2n, account(2n, 'CTO'));
      const protectedTarget = await request(application)
        .post(`/api/v1/user-management/2/${action}`)
        .set('Cookie', cookie)
        .send({ reason: 'Akses tidak diperlukan' });
      expect(protectedTarget.status).toBe(403);
      expect(protectedTarget.body.error.code).toBe('ACCOUNT_ACTION_FORBIDDEN');
      expect(db.users.update).not.toHaveBeenCalled();
    },
  );
});

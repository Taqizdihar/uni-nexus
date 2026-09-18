import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  workspace_members: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), upsert: vi.fn() },
  roles: { findFirst: vi.fn(), findMany: vi.fn() },
  workspaces: { findFirst: vi.fn(), findMany: vi.fn() },
  users: { update: vi.fn() },
  audit_logs: { create: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: db }));
vi.mock('../../services/notifications.js', () => ({
  InAppNotificationProvider: class {
    async send() {
      /* no-op in tests */
    }
  },
}));

import { approveAccount, referenceData, rejectAccount } from './service.js';

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(db));
  db.audit_logs.create.mockResolvedValue({});
  db.workspace_members.findMany.mockResolvedValue([]);
});

describe('account approval', () => {
  it('approves a pending user, assigning the requested role and workspace membership', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n });
    db.$queryRaw.mockResolvedValue([{ id: 42n, account_status: 'PENDING' }]);
    db.roles.findFirst.mockResolvedValue({ id: 5n, code: 'STAFF' });
    db.workspaces.findFirst.mockResolvedValue({ id: 9n, name: '3D Printing' });
    db.users.update.mockResolvedValue({
      workspace_members: [], is_active: true,
      id: 42n,
      account_status: 'ACTIVE',
      users_users_approved_by_user_idTousers: { id: 1n, full_name: 'Reviewer' },
      users_users_rejected_by_user_idTousers: null,
      user_profile_assets: [],
    });
    const result = await approveAccount(1n, 42n, { role_code: 'STAFF', workspace_id: 9n });
    expect(result.account_status).toBe('ACTIVE');
    expect(db.workspace_members.upsert).toHaveBeenCalledWith({
      where: { workspace_id_user_id: { workspace_id: 9n, user_id: 42n } },
      create: { workspace_id: 9n, user_id: 42n, role_id: 5n, membership_status: 'ACTIVE' },
      update: { role_id: 5n, membership_status: 'ACTIVE' },
    });
    expect(db.audit_logs.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'USER_APPROVED' }) }),
    );
  });

  it('runs the approval transaction under READ COMMITTED, not the MySQL default REPEATABLE READ', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n });
    db.$queryRaw.mockResolvedValue([{ id: 42n, account_status: 'PENDING' }]);
    db.roles.findFirst.mockResolvedValue({ id: 5n, code: 'STAFF' });
    db.workspaces.findFirst.mockResolvedValue({ id: 9n, name: '3D Printing' });
    db.users.update.mockResolvedValue({
      workspace_members: [], is_active: true,
      id: 42n, account_status: 'ACTIVE',
      users_users_approved_by_user_idTousers: { id: 1n, full_name: 'Reviewer' },
      users_users_rejected_by_user_idTousers: null,
      user_profile_assets: [],
    });
    await approveAccount(1n, 42n, { role_code: 'STAFF', workspace_id: 9n });
    expect(db.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }),
    );
  });

  it('refuses to approve a non-pending account', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n });
    db.$queryRaw.mockResolvedValue([{ id: 42n, account_status: 'ACTIVE' }]);
    await expect(
      approveAccount(1n, 42n, { role_code: 'STAFF', workspace_id: 9n }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE', status: 409 });
    expect(db.users.update).not.toHaveBeenCalled();
  });

  it('denies approval to a reviewer who lost their privileged role', async () => {
    db.workspace_members.findFirst.mockResolvedValue(null);
    await expect(
      approveAccount(1n, 42n, { role_code: 'STAFF', workspace_id: 9n }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(db.users.update).not.toHaveBeenCalled();
  });

  it('records a rejection reason and clears prior approval fields', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n });
    db.$queryRaw.mockResolvedValue([{ id: 42n, account_status: 'PENDING' }]);
    db.users.update.mockResolvedValue({
      workspace_members: [], is_active: true,
      id: 42n,
      account_status: 'REJECTED',
      rejection_reason: 'Not affiliated with the team.',
      users_users_approved_by_user_idTousers: null,
      users_users_rejected_by_user_idTousers: { id: 1n, full_name: 'Reviewer' },
      user_profile_assets: [],
    });
    const result = await rejectAccount(1n, 42n, 'Not affiliated with the team.');
    expect(result.account_status).toBe('REJECTED');
    expect(db.users.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          account_status: 'REJECTED',
          rejection_reason: 'Not affiliated with the team.',
          approved_by_user_id: null,
          approved_at: null,
        }),
      }),
    );
  });
});

describe('executive role singleton enforcement', () => {
  function mockApprovable(roleCode: string) {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n });
    db.$queryRaw.mockResolvedValue([{ id: 42n, account_status: 'PENDING' }]);
    db.roles.findFirst.mockResolvedValue({ id: 5n, code: roleCode });
    db.workspaces.findFirst.mockResolvedValue({ id: 9n, name: '3D Printing' });
    db.users.update.mockResolvedValue({
      workspace_members: [], is_active: true,
      id: 42n, account_status: 'ACTIVE',
      users_users_approved_by_user_idTousers: { id: 1n, full_name: 'Reviewer' },
      users_users_rejected_by_user_idTousers: null,
      user_profile_assets: [],
    });
  }

  it.each(['CEO', 'COO', 'CTO', 'CVO'] as const)('approves the first %s when the seat is vacant', async (code) => {
    mockApprovable(code);
    db.workspace_members.findMany.mockResolvedValue([]);
    const result = await approveAccount(1n, 42n, { role_code: code, workspace_id: 9n });
    expect(result.account_status).toBe('ACTIVE');
    expect(db.workspace_members.upsert).toHaveBeenCalled();
  });

  it.each(['CEO', 'COO', 'CTO', 'CVO'] as const)('rejects a second %s with 409 EXECUTIVE_ROLE_OCCUPIED', async (code) => {
    mockApprovable(code);
    db.workspace_members.findMany.mockResolvedValue([{ user_id: 100n, roles: { code } }]);
    await expect(approveAccount(1n, 42n, { role_code: code, workspace_id: 9n })).rejects.toMatchObject({
      status: 409,
      code: 'EXECUTIVE_ROLE_OCCUPIED',
      details: { role_code: code },
    });
    expect(db.workspace_members.upsert).not.toHaveBeenCalled();
  });

  it('lets 3D_DESIGNER, STAFF_OF_SPECIALTY, and STAFF be approved without limit', async () => {
    for (const code of ['3D_DESIGNER', 'STAFF_OF_SPECIALTY', 'STAFF']) {
      mockApprovable(code);
      // Occupancy for non-executive codes is never even queried, but seed a "many holders" list
      // anyway to prove it has no bearing on the outcome.
      db.workspace_members.findMany.mockResolvedValue([
        { user_id: 1n, roles: { code } },
        { user_id: 2n, roles: { code } },
      ]);
      const result = await approveAccount(1n, 42n, { role_code: code as never, workspace_id: 9n });
      expect(result.account_status).toBe('ACTIVE');
    }
  });

  it("treats a suspended executive's seat as still occupied — occupancy never checks the user's account_status", async () => {
    mockApprovable('CEO');
    db.workspace_members.findMany.mockResolvedValue([{ user_id: 100n, roles: { code: 'CEO' } }]);
    await expect(approveAccount(1n, 42n, { role_code: 'CEO', workspace_id: 9n })).rejects.toMatchObject({
      code: 'EXECUTIVE_ROLE_OCCUPIED',
    });
    const [{ where }] = db.workspace_members.findMany.mock.calls.at(-1)!;
    expect(where).not.toHaveProperty('users');
  });

  it('locks the executive role row (SELECT ... FOR UPDATE) before re-reading occupancy, never after', async () => {
    mockApprovable('CEO');
    db.workspace_members.findMany.mockResolvedValue([]);
    await approveAccount(1n, 42n, { role_code: 'CEO', workspace_id: 9n });
    const roleLockCallOrder = db.$queryRaw.mock.calls.findIndex((call) =>
      String(call[0]?.[0] ?? call[0]).includes('FROM roles'),
    );
    expect(roleLockCallOrder).toBeGreaterThanOrEqual(0);
    const lockInvocationOrder = db.$queryRaw.mock.invocationCallOrder[roleLockCallOrder];
    const occupancyInvocationOrder = db.workspace_members.findMany.mock.invocationCallOrder[0];
    expect(lockInvocationOrder).toBeLessThan(occupancyInvocationOrder);
  });

  it('checks occupancy globally, with no workspace_id filter — a seat held in one workspace blocks assignment anywhere', async () => {
    mockApprovable('CEO');
    db.workspace_members.findMany.mockResolvedValue([{ user_id: 100n, roles: { code: 'CEO' } }]);
    await expect(approveAccount(1n, 42n, { role_code: 'CEO', workspace_id: 9n })).rejects.toMatchObject({
      code: 'EXECUTIVE_ROLE_OCCUPIED',
    });
    const [{ where }] = db.workspace_members.findMany.mock.calls.at(-1)!;
    expect(where).not.toHaveProperty('workspace_id');
  });
});

describe('reference data', () => {
  it('omits an occupied executive role from assignable roles but reports it in executive_slots', async () => {
    db.roles.findMany.mockResolvedValue([
      { id: 1n, code: 'CEO', name: 'Chief Executive Officer' },
      { id: 2n, code: 'CTO', name: 'Chief Technology Officer' },
      { id: 3n, code: 'STAFF', name: 'Staff' },
    ]);
    db.workspaces.findMany.mockResolvedValue([{ id: 9n, name: '3D Printing', code: 'WS_X' }]);
    // Mirrors the current real database: CTO occupied, CEO/COO/CVO vacant.
    db.workspace_members.findMany.mockResolvedValue([{ user_id: 7n, roles: { code: 'CTO' } }]);
    const result = await referenceData();
    expect(result.roles.map((role) => role.code)).toEqual(['CEO', 'STAFF']);
    expect(result.executive_slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'CTO', status: 'OCCUPIED' }),
        expect.objectContaining({ code: 'CEO', status: 'VACANT' }),
        expect.objectContaining({ code: 'COO', status: 'VACANT' }),
        expect.objectContaining({ code: 'CVO', status: 'VACANT' }),
      ]),
    );
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  workspace_members: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), upsert: vi.fn() },
  roles: { findFirst: vi.fn() },
  workspaces: { findFirst: vi.fn() },
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

import { approveAccount, rejectAccount, suspendAccount } from './service.js';

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(db));
  db.audit_logs.create.mockResolvedValue({});
});

describe('account approval', () => {
  it('approves a pending user, assigning the requested role and workspace membership', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n });
    db.$queryRaw.mockResolvedValue([{ id: 42n, account_status: 'PENDING' }]);
    db.roles.findFirst.mockResolvedValue({ id: 5n, code: 'STAFF' });
    db.workspaces.findFirst.mockResolvedValue({ id: 9n, name: '3D Printing' });
    db.users.update.mockResolvedValue({
      id: 42n,
      account_status: 'ACTIVE',
      users_users_approved_by_user_idTousers: { id: 1n, full_name: 'Reviewer' },
      users_users_rejected_by_user_idTousers: null,
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
      id: 42n,
      account_status: 'REJECTED',
      rejection_reason: 'Not affiliated with the team.',
      users_users_approved_by_user_idTousers: null,
      users_users_rejected_by_user_idTousers: { id: 1n, full_name: 'Reviewer' },
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

describe('suspension safeguards against lockout', () => {
  it('blocks suspending the last active CEO/COO/CTO/CVO reviewer', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n });
    db.$queryRaw.mockResolvedValue([{ id: 7n, account_status: 'ACTIVE' }]);
    db.workspace_members.findMany.mockResolvedValue([{ roles: { code: 'CEO' } }]);
    db.workspace_members.count.mockResolvedValue(0);
    await expect(suspendAccount(1n, 7n)).rejects.toMatchObject({
      code: 'LAST_REVIEWER',
      status: 409,
    });
    expect(db.users.update).not.toHaveBeenCalled();
  });

  it('allows suspending a reviewer when another active reviewer remains', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n });
    db.$queryRaw.mockResolvedValue([{ id: 7n, account_status: 'ACTIVE' }]);
    db.workspace_members.findMany.mockResolvedValue([{ roles: { code: 'CEO' } }]);
    db.workspace_members.count.mockResolvedValue(1);
    db.users.update.mockResolvedValue({ id: 7n, account_status: 'SUSPENDED' });
    const result = await suspendAccount(1n, 7n);
    expect(result.account_status).toBe('SUSPENDED');
  });

  it('allows suspending a non-reviewer without checking the reviewer count', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n });
    db.$queryRaw.mockResolvedValue([{ id: 8n, account_status: 'ACTIVE' }]);
    db.workspace_members.findMany.mockResolvedValue([{ roles: { code: 'STAFF' } }]);
    db.users.update.mockResolvedValue({ id: 8n, account_status: 'SUSPENDED' });
    const result = await suspendAccount(1n, 8n);
    expect(result.account_status).toBe('SUSPENDED');
    expect(db.workspace_members.count).not.toHaveBeenCalled();
  });
});

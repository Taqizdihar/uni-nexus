import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
  users: { findUnique: vi.fn(), update: vi.fn() },
  roles: { findFirst: vi.fn() },
  workspace_members: { findFirst: vi.fn(), count: vi.fn(), update: vi.fn(), create: vi.fn() },
  audit_logs: { create: vi.fn() },
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: db }));
vi.mock('../auth/service.js', () => ({
  safeUserSelect: { id: true, full_name: true, email: true, account_status: true },
}));
vi.mock('../../middleware/auth.js', () => ({
  hasPermission: (role: string, permission: string) =>
    ['OWNER', 'CEO', 'ADMIN'].includes(role) && permission === 'settings',
}));
import { addMember, updateMember } from './service.js';

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(db));
  db.$queryRaw.mockResolvedValue([{ id: 7n }]);
});

describe('workspace membership administration', () => {
  it('prevents removing the last active owner', async () => {
    db.workspace_members.findFirst
      .mockResolvedValueOnce({ roles: { code: 'OWNER', is_active: true } })
      .mockResolvedValueOnce({
        id: 9n,
        workspace_id: 7n,
        user_id: 5n,
        membership_status: 'ACTIVE',
        roles: { id: 2n, code: 'OWNER', is_active: true },
      });
    db.workspace_members.count.mockResolvedValue(1);
    await expect(
      updateMember(7n, 5n, 'OWNER', 9n, { membership_status: 'INACTIVE' }),
    ).rejects.toMatchObject({ code: 'LAST_OWNER', status: 409 });
    expect(db.workspace_members.update).not.toHaveBeenCalled();
  });

  it('prevents an admin granting owner access', async () => {
    db.workspace_members.findFirst.mockResolvedValueOnce({
      roles: { code: 'ADMIN', is_active: true },
    });
    db.roles.findFirst.mockResolvedValue({ id: 2n, code: 'OWNER', is_active: true });
    await expect(addMember(7n, 5n, 'ADMIN', 'pending@example.com', 2n)).rejects.toMatchObject({
      code: 'ROLE_HIERARCHY',
      status: 403,
    });
    expect(db.workspace_members.create).not.toHaveBeenCalled();
  });

  it('scopes the edited membership to the current workspace', async () => {
    db.workspace_members.findFirst
      .mockResolvedValueOnce({ roles: { code: 'OWNER', is_active: true } })
      .mockResolvedValueOnce(null);
    await expect(
      updateMember(7n, 5n, 'OWNER', 99n, { membership_status: 'INACTIVE' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(db.workspace_members.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 99n, workspace_id: 7n } }),
    );
  });
});

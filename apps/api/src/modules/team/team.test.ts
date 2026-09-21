import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ workspace_members: { findMany: vi.fn(), findFirst: vi.fn() } }));
vi.mock('../../lib/prisma.js', () => ({ prisma: db }));

import { getTeamMember, listTeam } from './service.js';

const member = (overrides: Record<string, unknown> = {}) => ({
  users: {
    id: 1n,
    full_name: 'Budi Santoso',
    username: 'budi',
    email: 'budi@example.com',
    phone: '08123456789',
    bio: null,
    presence_status: 'DEFAULT',
    pets: null,
    user_tags: [],
    user_profile_assets: [],
  },
  roles: { code: 'STAFF', name: 'Staff' },
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('team directory', () => {
  it('only queries ACTIVE workspace members with an ACTIVE, active account', async () => {
    db.workspace_members.findMany.mockResolvedValue([member()]);
    await listTeam(7n, undefined);
    expect(db.workspace_members.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspace_id: 7n,
          membership_status: 'ACTIVE',
          users: expect.objectContaining({ is_active: true, account_status: 'ACTIVE' }),
        }),
      }),
    );
  });

  it('is readable regardless of the caller role — no permission filter narrows this query', async () => {
    db.workspace_members.findMany.mockResolvedValue([member(), member({ users: { ...member().users, id: 2n, full_name: 'Ani' } })]);
    const result = await listTeam(7n, undefined);
    expect(result).toHaveLength(2);
  });

  it('returns 404 for a member outside the current workspace', async () => {
    db.workspace_members.findFirst.mockResolvedValue(null);
    await expect(getTeamMember(7n, 99n)).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('returns the read-only member profile shape without account security fields', async () => {
    db.workspace_members.findFirst.mockResolvedValue(member());
    const result = await getTeamMember(7n, 1n);
    expect(result.role).toEqual({ code: 'STAFF', name: 'Staff' });
    expect(result.tags).toEqual([]);
    expect(result.pet).toBeNull();
    expect(result).toMatchObject({ email: 'budi@example.com', phone: '08123456789' });
    expect(result).not.toHaveProperty('password_hash');
    expect(result).not.toHaveProperty('password_changed_at');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  users: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  workspace_members: { findFirst: vi.fn() },
  user_tags: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  pets: { findFirst: vi.fn() },
  audit_logs: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: db }));

import { presenceSchema, updateProfileSchema } from './validation.js';
import { addTag, updateDefaultWorkspace, updateProfile } from './service.js';

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(db));
  db.audit_logs.create.mockResolvedValue({});
});

describe('profile validation boundaries', () => {
  it('rejects role and account-status fields — they are not part of this schema', () => {
    expect(() =>
      updateProfileSchema.parse({ full_name: 'A B', role_id: '5', account_status: 'ACTIVE' }),
    ).toThrow();
  });

  it('rejects an unknown presence status', () => {
    expect(() => presenceSchema.parse({ presence_status: 'AWAY' })).toThrow();
  });
});

const profileRow = {
  id: 1n,
  full_name: 'Old Name',
  username: 'olduser',
  email: 'user@example.com',
  phone: '0812',
  bio: null,
  presence_status: 'DEFAULT',
  password_changed_at: null,
  default_workspace_id: null,
  pets: null,
  user_tags: [],
  user_profile_assets: [],
  workspace_members: [],
};

describe('profile self-service', () => {
  it('updates editable fields and returns the refreshed profile', async () => {
    db.users.findFirst.mockResolvedValue(null);
    db.users.update.mockResolvedValue({});
    db.users.findUnique.mockResolvedValue({ ...profileRow, full_name: 'New Name' });
    const result = await updateProfile(1n, { full_name: 'New Name' });
    expect(db.users.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1n }, data: { full_name: 'New Name' } }),
    );
    expect(result.full_name).toBe('New Name');
    expect(db.audit_logs.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'PROFILE_UPDATED' }) }),
    );
  });

  it('enforces username uniqueness before updating', async () => {
    db.users.findFirst.mockResolvedValue({ id: 2n });
    await expect(updateProfile(1n, { username: 'taken' })).rejects.toMatchObject({
      code: 'USERNAME_TAKEN',
      status: 409,
    });
    expect(db.users.update).not.toHaveBeenCalled();
  });

  it("requires the target workspace to be one of the user's active memberships", async () => {
    db.workspace_members.findFirst.mockResolvedValue(null);
    await expect(updateDefaultWorkspace(1n, 9n)).rejects.toMatchObject({
      code: 'INVALID_WORKSPACE',
      status: 422,
    });
    expect(db.users.update).not.toHaveBeenCalled();
  });
});

describe('tag limit', () => {
  it('refuses a sixth tag', async () => {
    db.user_tags.findMany.mockResolvedValue([{}, {}, {}, {}, {}]);
    await expect(addTag(1n, 'sixth')).rejects.toMatchObject({ code: 'TAG_LIMIT', status: 422 });
    expect(db.user_tags.create).not.toHaveBeenCalled();
  });

  it('refuses a case-insensitive duplicate tag', async () => {
    db.user_tags.findMany.mockResolvedValue([{ tag_text: 'Pilot' }]);
    await expect(addTag(1n, 'pilot')).rejects.toMatchObject({ code: 'TAG_DUPLICATE', status: 409 });
    expect(db.user_tags.create).not.toHaveBeenCalled();
  });
});

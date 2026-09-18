import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_CODES } from '@uni-nexus/shared';
import {
  assertExecutiveRoleAvailable,
  getAvailableApprovalRoles,
  getExecutiveRoleOccupancy,
  getExecutiveSlots,
  isSingletonExecutiveRole,
} from './policy.js';

const db = {
  $queryRaw: async () => [],
  workspace_members: { findMany: async (_args: unknown) => [] as unknown[] },
};
let occupants: Array<{ user_id: bigint; roles: { code: string } }> = [];

beforeEach(() => {
  occupants = [];
  db.workspace_members.findMany = async () => occupants;
});

describe('isSingletonExecutiveRole', () => {
  it('flags exactly CEO/COO/CTO/CVO', () => {
    for (const code of ROLE_CODES)
      expect(isSingletonExecutiveRole(code)).toBe(['CEO', 'COO', 'CTO', 'CVO'].includes(code));
  });
});

describe('getExecutiveRoleOccupancy', () => {
  it('reports all four seats vacant when no memberships exist', async () => {
    const occupancy = await getExecutiveRoleOccupancy(db as never);
    expect(occupancy).toEqual({ CEO: [], COO: [], CTO: [], CVO: [] });
  });

  it('collapses duplicate rows for the same person into one occupant', async () => {
    occupants = [
      { user_id: 42n, roles: { code: 'CTO' } },
      { user_id: 42n, roles: { code: 'CTO' } }, // same person, e.g. a second future workspace
    ];
    const occupancy = await getExecutiveRoleOccupancy(db as never);
    expect(occupancy.CTO).toEqual([42n]);
  });

  it('never consults the occupant\'s own account status', async () => {
    occupants = [{ user_id: 42n, roles: { code: 'CEO' } }];
    let seenWhere: Record<string, unknown> | undefined;
    db.workspace_members.findMany = async (args: unknown) => {
      seenWhere = (args as { where: Record<string, unknown> }).where;
      return occupants;
    };
    await getExecutiveRoleOccupancy(db as never);
    expect(seenWhere).not.toHaveProperty('users');
    expect(seenWhere).not.toHaveProperty('workspace_id');
    expect(seenWhere).toMatchObject({ membership_status: 'ACTIVE' });
  });
});

describe('getExecutiveSlots / getAvailableApprovalRoles', () => {
  it('marks CTO occupied and the rest vacant, matching the current real database state', async () => {
    occupants = [{ user_id: 1n, roles: { code: 'CTO' } }];
    const slots = await getExecutiveSlots(db as never);
    expect(slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'CTO', status: 'OCCUPIED' }),
        expect.objectContaining({ code: 'CEO', status: 'VACANT' }),
        expect.objectContaining({ code: 'COO', status: 'VACANT' }),
        expect.objectContaining({ code: 'CVO', status: 'VACANT' }),
      ]),
    );
    const available = await getAvailableApprovalRoles(db as never);
    expect(available).not.toContain('CTO');
    expect(available).toEqual(expect.arrayContaining(['CEO', 'COO', 'CVO', '3D_DESIGNER', 'STAFF_OF_SPECIALTY', 'STAFF']));
  });

  it('keeps all non-executive roles available regardless of occupancy', async () => {
    occupants = [
      { user_id: 1n, roles: { code: 'CEO' } },
      { user_id: 2n, roles: { code: 'COO' } },
      { user_id: 3n, roles: { code: 'CTO' } },
      { user_id: 4n, roles: { code: 'CVO' } },
    ];
    const available = await getAvailableApprovalRoles(db as never);
    expect(available).toEqual(['3D_DESIGNER', 'STAFF_OF_SPECIALTY', 'STAFF']);
  });
});

describe('assertExecutiveRoleAvailable', () => {
  it('is a no-op for non-executive roles, taking no lock and no occupancy query', async () => {
    let queried = false;
    db.workspace_members.findMany = async () => {
      queried = true;
      return [];
    };
    await expect(assertExecutiveRoleAvailable(db as never, 'STAFF')).resolves.toBeUndefined();
    expect(queried).toBe(false);
  });

  it('allows assignment when the seat is vacant', async () => {
    await expect(assertExecutiveRoleAvailable(db as never, 'CEO')).resolves.toBeUndefined();
  });

  it('allows re-affirming the seat for its current occupant', async () => {
    occupants = [{ user_id: 42n, roles: { code: 'CEO' } }];
    await expect(assertExecutiveRoleAvailable(db as never, 'CEO', 42n)).resolves.toBeUndefined();
  });

  it('rejects a different user with EXECUTIVE_ROLE_OCCUPIED when the seat is already held', async () => {
    occupants = [{ user_id: 42n, roles: { code: 'CEO' } }];
    await expect(assertExecutiveRoleAvailable(db as never, 'CEO', 99n)).rejects.toMatchObject({
      status: 409,
      code: 'EXECUTIVE_ROLE_OCCUPIED',
      details: { role_code: 'CEO' },
    });
  });

  it.each(['CEO', 'COO', 'CTO', 'CVO'] as const)(
    'enforces the same singleton rule for %s',
    async (code) => {
      occupants = [{ user_id: 1n, roles: { code } }];
      await expect(assertExecutiveRoleAvailable(db as never, code, 2n)).rejects.toMatchObject({
        code: 'EXECUTIVE_ROLE_OCCUPIED',
      });
    },
  );

  it('locks the roles row before re-reading occupancy (serializes concurrent approvals)', async () => {
    const calls: string[] = [];
    db.$queryRaw = (async (..._args: unknown[]) => {
      calls.push('lock');
      return [];
    }) as typeof db.$queryRaw;
    db.workspace_members.findMany = async () => {
      calls.push('read');
      return [];
    };
    await assertExecutiveRoleAvailable(db as never, 'CEO');
    expect(calls).toEqual(['lock', 'read']);
  });
});

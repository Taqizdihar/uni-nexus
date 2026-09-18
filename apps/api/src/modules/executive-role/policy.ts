import type { Prisma } from '@prisma/client';
import {
  EXECUTIVE_SINGLETON_ROLE_CODES,
  ROLE_CODES,
  ROLE_LABELS,
  isSingletonExecutiveRole,
  type ExecutiveSlot,
  type RoleCode,
} from '@uni-nexus/shared';
import { AppError } from '../../lib/errors.js';

export { isSingletonExecutiveRole };

/**
 * Global occupancy of the 4 singleton executive seats: distinct occupying user IDs per role code,
 * from ACTIVE memberships only. A user's own account_status (e.g. SUSPENDED) never frees the seat —
 * only the membership_status of their workspace_members row matters here.
 */
export async function getExecutiveRoleOccupancy(
  db: Prisma.TransactionClient,
): Promise<Record<RoleCode, bigint[]>> {
  const rows = await db.workspace_members.findMany({
    where: {
      membership_status: 'ACTIVE',
      roles: { code: { in: [...EXECUTIVE_SINGLETON_ROLE_CODES] }, is_active: true },
      workspaces: { is_active: true },
    },
    select: { user_id: true, roles: { select: { code: true } } },
    distinct: ['user_id', 'role_id'],
  });
  const occupancy = Object.fromEntries(
    EXECUTIVE_SINGLETON_ROLE_CODES.map((code) => [code, [] as bigint[]]),
  ) as Record<RoleCode, bigint[]>;
  for (const row of rows) {
    const code = row.roles?.code as RoleCode | undefined;
    if (code && isSingletonExecutiveRole(code) && !occupancy[code].includes(row.user_id))
      occupancy[code].push(row.user_id);
  }
  return occupancy;
}

export async function getExecutiveSlots(db: Prisma.TransactionClient): Promise<ExecutiveSlot[]> {
  const occupancy = await getExecutiveRoleOccupancy(db);
  return EXECUTIVE_SINGLETON_ROLE_CODES.map((code) => ({
    code,
    label: ROLE_LABELS[code],
    status: occupancy[code].length > 0 ? 'OCCUPIED' : 'VACANT',
  }));
}

/** Roles a new/updated assignment may currently use: non-executive roles plus any vacant executive seat. */
export async function getAvailableApprovalRoles(db: Prisma.TransactionClient): Promise<RoleCode[]> {
  const occupancy = await getExecutiveRoleOccupancy(db);
  return ROLE_CODES.filter((code) => !isSingletonExecutiveRole(code) || occupancy[code].length === 0);
}

/** Serializes every concurrent attempt to assign this role code against the shared `roles` row. */
export async function lockExecutiveRoleSlot(tx: Prisma.TransactionClient, roleCode: RoleCode) {
  await tx.$queryRaw`SELECT id FROM roles WHERE code = ${roleCode} FOR UPDATE`;
}

/**
 * Locks the role slot, then re-checks occupancy inside the same transaction — call this immediately
 * before writing role_id. `targetUserId`, when given, exempts a user who already legitimately holds
 * the seat (e.g. re-saving their own membership), so only a genuinely different occupant blocks it.
 */
export async function assertExecutiveRoleAvailable(
  tx: Prisma.TransactionClient,
  roleCode: RoleCode,
  targetUserId?: bigint,
): Promise<void> {
  if (!isSingletonExecutiveRole(roleCode)) return;
  await lockExecutiveRoleSlot(tx, roleCode);
  const occupancy = await getExecutiveRoleOccupancy(tx);
  const heldByAnotherUser = occupancy[roleCode].some((userId) => userId !== targetUserId);
  if (heldByAnotherUser)
    throw new AppError(
      409,
      `Jabatan ${ROLE_LABELS[roleCode]} sudah terisi.`,
      'EXECUTIVE_ROLE_OCCUPIED',
      { role_code: roleCode },
    );
}

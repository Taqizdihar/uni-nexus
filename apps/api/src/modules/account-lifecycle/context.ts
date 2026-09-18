import type { Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { officialRoles, type LifecycleContext } from './policy.js';

export const lifecycleSelect = {
  id: true,
  is_active: true,
  account_status: true,
  deactivation_source: true,
  deactivated_by_user_id: true,
  deactivated_at: true,
  deactivation_reason: true,
  reactivated_by_user_id: true,
  reactivated_at: true,
  workspace_members: {
    where: {
      membership_status: 'ACTIVE',
      roles: { is_active: true },
      workspaces: { is_active: true },
    },
    select: { workspace_id: true, roles: { select: { code: true, name: true } } },
  },
} satisfies Prisma.usersSelect;
type ContextRow = Prisma.usersGetPayload<{ select: typeof lifecycleSelect }>;
export function lifecycleContext(
  row: Pick<ContextRow, 'id' | 'account_status' | 'is_active' | 'workspace_members'>,
): LifecycleContext {
  return {
    id: row.id,
    account_status: row.account_status,
    is_active: row.is_active,
    roles: officialRoles(
      row.workspace_members.flatMap((member) => (member.roles ? [member.roles.code] : [])),
    ),
  };
}
export async function loadContext(
  db: Prisma.TransactionClient,
  id: bigint,
): Promise<LifecycleContext> {
  const row = await db.users.findUnique({ where: { id }, select: lifecycleSelect });
  if (!row) throw new AppError(404, 'Akun tidak ditemukan.', 'NOT_FOUND');
  return lifecycleContext(row);
}
/** All lifecycle writes lock accounts in ID order, then memberships, before re-reading authority. */
export async function lockLifecycleUsers(tx: Prisma.TransactionClient, ids: bigint[]) {
  for (const id of [...new Set(ids)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const rows = await tx.$queryRaw<
      Array<{ id: bigint }>
    >`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw new AppError(404, 'Akun tidak ditemukan.', 'NOT_FOUND');
    await tx.$queryRaw`SELECT m.id FROM workspace_members m JOIN roles r ON r.id=m.role_id
      JOIN workspaces w ON w.id=m.workspace_id WHERE m.user_id=${id} FOR UPDATE`;
  }
}

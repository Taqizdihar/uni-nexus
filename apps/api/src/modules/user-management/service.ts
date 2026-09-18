import { Prisma } from '@prisma/client';
import { ACCOUNT_STATUSES, ROLE_CODES, type AccountStatus, type RoleCode } from '@uni-nexus/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { lifecycleContext, lifecycleSelect, loadContext } from '../account-lifecycle/context.js';
import { getAllowedAccountActions, isExecutive } from '../account-lifecycle/policy.js';
import { assertExecutiveRoleAvailable, getAvailableApprovalRoles, getExecutiveSlots } from '../executive-role/policy.js';
import { resolveAssetUrl } from '../profile/asset-url.js';
import { reviewerRoleCodes } from '../../middleware/auth.js';
import { InAppNotificationProvider } from '../../services/notifications.js';

const accountSelect = {
  ...lifecycleSelect,
  id: true,
  full_name: true,
  username: true,
  email: true,
  phone: true,
  bio: true,
  account_status: true,
  presence_status: true,
  created_at: true,
  approved_at: true,
  rejected_at: true,
  rejection_reason: true,
  users_users_approved_by_user_idTousers: { select: { id: true, full_name: true } },
  users_users_rejected_by_user_idTousers: { select: { id: true, full_name: true } },
  user_profile_assets: {
    where: { asset_type: 'PROFILE_PHOTO' },
    select: { asset_type: true, object_key: true, storage_provider: true, public_url: true },
  },
} satisfies Prisma.usersSelect;
type AccountRow = Prisma.usersGetPayload<{ select: typeof accountSelect }>;
async function loadReviewer(actorId: bigint) {
  const actor = await loadContext(prisma, actorId);
  if (!isExecutive(actor) || !actor.is_active || actor.account_status !== 'ACTIVE')
    throw new AppError(403, 'Anda tidak dapat mengakses Manajemen Pengguna.', 'ACCOUNT_ACTION_FORBIDDEN');
  return actor;
}

function serializeAccount(row: AccountRow, actor?: Awaited<ReturnType<typeof loadContext>>) {
  const {
    users_users_approved_by_user_idTousers: approved_by,
    users_users_rejected_by_user_idTousers: rejected_by,
    user_profile_assets: assets,
    ...rest
  } = row;
  return { ...rest, approved_by, rejected_by,
    photo_url: resolveAssetUrl(rest.id, assets[0]),
    roles: lifecycleContext(row).roles,
    ...(actor ? { allowed_actions: getAllowedAccountActions(actor, lifecycleContext(row)) } : {}),
  };
}

/** Notifies currently active CEO/COO/CTO/CVO members that a new account needs review. */
export async function notifyReviewers(tx: Prisma.TransactionClient, applicantFullName: string) {
  const reviewers = await tx.workspace_members.findMany({
    where: {
      membership_status: 'ACTIVE',
      roles: { code: { in: reviewerRoleCodes }, is_active: true },
      users: { is_active: true, account_status: 'ACTIVE' },
      workspaces: { is_active: true },
    },
    select: { workspace_id: true, user_id: true },
  });
  const provider = new InAppNotificationProvider(tx);
  for (const reviewer of reviewers) {
    await provider.send({
      workspaceId: reviewer.workspace_id,
      recipientUserId: reviewer.user_id,
      event: 'ACCOUNT_APPROVAL_REQUESTED',
      title: 'New account awaiting approval',
      message: `${applicantFullName} signed up and is awaiting review in User Management.`,
    });
  }
}

/** Authoritative re-check inside the transaction; the router's requireUserManagement is a fast-path only. */
async function assertReviewer(tx: Prisma.TransactionClient, reviewerId: bigint): Promise<void> {
  const membership = await tx.workspace_members.findFirst({
    where: {
      user_id: reviewerId,
      membership_status: 'ACTIVE',
      roles: { code: { in: reviewerRoleCodes }, is_active: true },
      workspaces: { is_active: true },
      users: { is_active: true, account_status: 'ACTIVE' },
    },
  });
  if (!membership)
    throw new AppError(403, 'Only CEO, COO, CTO, or CVO may manage accounts.', 'FORBIDDEN');
}

/** ReadCommitted avoids a stale REPEATABLE READ snapshot masking a just-committed executive assignment. */
const approvalTransactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 20000,
};

async function lockAccount(tx: Prisma.TransactionClient, id: bigint) {
  const rows = await tx.$queryRaw<
    Array<{ id: bigint; account_status: string }>
  >`SELECT id, account_status FROM users WHERE id = ${id} FOR UPDATE`;
  const row = rows[0];
  if (!row) throw new AppError(404, 'Account not found.', 'NOT_FOUND');
  return row;
}

export async function summary(): Promise<Record<AccountStatus, number>> {
  const rows = await prisma.users.groupBy({ by: ['account_status'], _count: { _all: true } });
  const counts = Object.fromEntries(ACCOUNT_STATUSES.map((status) => [status, 0])) as Record<
    AccountStatus,
    number
  >;
  for (const row of rows)
    if (ACCOUNT_STATUSES.includes(row.account_status as AccountStatus))
      counts[row.account_status as AccountStatus] = row._count._all;
  return counts;
}

export async function listAccounts(actorId: bigint, query: {
  status?: AccountStatus;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const actor = await loadReviewer(actorId);
  const where: Prisma.usersWhereInput = {
    ...(query.status ? { account_status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { full_name: { contains: query.search } },
            { username: { contains: query.search } },
            { email: { contains: query.search } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.users.findMany({
      where,
      select: accountSelect,
      orderBy: { created_at: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.users.count({ where }),
  ]);
  return {
    data: rows.map((row) => serializeAccount(row, actor)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getAccount(id: bigint, actorId: bigint) {
  const actor = await loadReviewer(actorId);
  const row = await prisma.users.findUnique({ where: { id }, select: accountSelect });
  if (!row) throw new AppError(404, 'Account not found.', 'NOT_FOUND');
  return serializeAccount(row, actor);
}

export async function referenceData() {
  const [roles, workspaces, availableCodes, executiveSlots] = await Promise.all([
    prisma.roles.findMany({
      where: { code: { in: [...ROLE_CODES] }, is_active: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.workspaces.findMany({
      where: { is_active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
    getAvailableApprovalRoles(prisma),
    getExecutiveSlots(prisma),
  ]);
  const assignable = new Set<string>(availableCodes);
  return {
    roles: roles.filter((role) => assignable.has(role.code)),
    executive_slots: executiveSlots,
    workspaces,
  };
}

export async function approveAccount(
  reviewerId: bigint,
  targetId: bigint,
  input: { role_code: RoleCode; workspace_id: bigint },
) {
  return prisma.$transaction(async (tx) => {
    await assertReviewer(tx, reviewerId);
    const target = await lockAccount(tx, targetId);
    if (target.account_status !== 'PENDING')
      throw new AppError(409, 'Only pending accounts can be approved.', 'INVALID_STATE');
    const role = await tx.roles.findFirst({ where: { code: input.role_code, is_active: true } });
    if (!role) throw new AppError(422, 'Select an active role.', 'INVALID_ROLE');
    await assertExecutiveRoleAvailable(tx, input.role_code, targetId);
    const workspace = await tx.workspaces.findFirst({
      where: { id: input.workspace_id, is_active: true },
    });
    if (!workspace) throw new AppError(422, 'Select an active workspace.', 'INVALID_WORKSPACE');
    const updated = await tx.users.update({
      where: { id: targetId },
      data: {
        account_status: 'ACTIVE',
        approved_by_user_id: reviewerId,
        approved_at: new Date(),
        rejected_by_user_id: null,
        rejected_at: null,
        rejection_reason: null,
        default_workspace_id: workspace.id,
      },
      select: accountSelect,
    });
    await tx.workspace_members.upsert({
      where: { workspace_id_user_id: { workspace_id: workspace.id, user_id: targetId } },
      create: {
        workspace_id: workspace.id,
        user_id: targetId,
        role_id: role.id,
        membership_status: 'ACTIVE',
      },
      update: { role_id: role.id, membership_status: 'ACTIVE' },
    });
    await tx.audit_logs.create({
      data: {
        workspace_id: workspace.id,
        user_id: reviewerId,
        action: 'USER_APPROVED',
        entity_type: 'users',
        entity_id: targetId,
        new_value_json: { role: role.code, workspace_id: workspace.id.toString() },
      },
    });
    await new InAppNotificationProvider(tx).send({
      workspaceId: workspace.id,
      recipientUserId: targetId,
      event: 'ACCOUNT_APPROVED',
      title: 'Your account has been approved',
      message: `You now have access to ${workspace.name}.`,
    });
    return serializeAccount(updated);
  }, approvalTransactionOptions);
}

export async function rejectAccount(reviewerId: bigint, targetId: bigint, reason: string) {
  return prisma.$transaction(async (tx) => {
    await assertReviewer(tx, reviewerId);
    const target = await lockAccount(tx, targetId);
    if (target.account_status !== 'PENDING')
      throw new AppError(409, 'Only pending accounts can be rejected.', 'INVALID_STATE');
    const updated = await tx.users.update({
      where: { id: targetId },
      data: {
        account_status: 'REJECTED',
        rejected_by_user_id: reviewerId,
        rejected_at: new Date(),
        rejection_reason: reason,
        approved_by_user_id: null,
        approved_at: null,
      },
      select: accountSelect,
    });
    await tx.audit_logs.create({
      data: {
        user_id: reviewerId,
        action: 'USER_REJECTED',
        entity_type: 'users',
        entity_id: targetId,
        new_value_json: { reason },
      },
    });
    return serializeAccount(updated);
  });
}

export { deactivateAccount, reactivateAccount } from '../account-lifecycle/service.js';

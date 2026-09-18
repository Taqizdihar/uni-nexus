import { Prisma } from '@prisma/client';
import { REVIEWER_ROLE_CODES, type DeactivationRequestStatus } from '@uni-nexus/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { InAppNotificationProvider } from '../../services/notifications.js';
import { lifecycleContext, lifecycleSelect, loadContext, lockLifecycleUsers } from './context.js';
import {
  canApproveDeactivationRequest,
  canDirectDeactivate,
  canReactivate,
  canRejectDeactivationRequest,
  canRecoverBootstrapCto,
  canSubmitSelfDeactivationRequest,
  getAllowedAccountActions,
  isExecutive,
  protectedRole,
} from './policy.js';
import {
  deactivateSchema,
  noteSchema,
  rejectRequestSchema,
  selfRequestSchema,
} from './validation.js';
import { resolveAssetUrl } from '../profile/asset-url.js';

const requestSelect = {
  id: true,
  user_id: true,
  request_status: true,
  request_reason: true,
  requested_at: true,
  withdrawn_at: true,
  reviewed_by_user_id: true,
  reviewed_at: true,
  review_note: true,
} satisfies Prisma.account_deactivation_requestsSelect;
const requestDetailSelect = {
  ...requestSelect,
  users_account_deactivation_requests_user_idTousers: {
    select: {
      ...lifecycleSelect,
      full_name: true,
      username: true,
      user_profile_assets: {
        where: { asset_type: 'PROFILE_PHOTO' },
        select: { asset_type: true, object_key: true, storage_provider: true, public_url: true },
      },
    },
  },
} satisfies Prisma.account_deactivation_requestsSelect;
const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 20000,
};

async function audit(
  tx: Prisma.TransactionClient,
  actorId: bigint,
  targetId: bigint,
  action: string,
  metadata: Prisma.InputJsonObject = {},
) {
  const member = await tx.workspace_members.findFirst({
    where: { user_id: targetId, membership_status: 'ACTIVE', workspaces: { is_active: true } },
    orderBy: { id: 'asc' },
    select: { workspace_id: true },
  });
  await tx.audit_logs.create({
    data: {
      workspace_id: member?.workspace_id,
      user_id: actorId,
      action,
      entity_type: 'users',
      entity_id: targetId,
      new_value_json: {
        target_user_id: targetId.toString(),
        actor_user_id: actorId.toString(),
        ...metadata,
      },
    },
  });
}
async function notifyTarget(
  tx: Prisma.TransactionClient,
  targetId: bigint,
  event: string,
  title: string,
  message: string,
) {
  const member = await tx.workspace_members.findFirst({
    where: { user_id: targetId, membership_status: 'ACTIVE', workspaces: { is_active: true } },
    orderBy: { id: 'asc' },
    select: { workspace_id: true },
  });
  if (member)
    await new InAppNotificationProvider(tx).send({
      workspaceId: member.workspace_id,
      recipientUserId: targetId,
      event,
      title,
      message,
      entityType: 'users',
      entityId: targetId,
    });
}
async function suspend(
  tx: Prisma.TransactionClient,
  actorId: bigint,
  targetId: bigint,
  source: 'DIRECT_ADMIN' | 'SELF_REQUEST',
  reason: string,
) {
  return tx.users.update({
    where: { id: targetId },
    data: {
      account_status: 'SUSPENDED',
      deactivation_source: source,
      deactivated_by_user_id: actorId,
      deactivated_at: new Date(),
      deactivation_reason: reason,
      reactivated_by_user_id: null,
      reactivated_at: null,
    },
    select: lifecycleSelect,
  });
}
async function preserveReviewerContinuity(
  tx: Prisma.TransactionClient,
  target: Awaited<ReturnType<typeof loadContext>>,
) {
  if (!isExecutive(target)) return;
  // Serialize last-reviewer checks without changing the historical bootstrap record.
  await tx.$queryRaw`SELECT id FROM system_bootstrap WHERE id=1 FOR UPDATE`;
  const others = await tx.users.count({
    where: {
      id: { not: target.id },
      is_active: true,
      account_status: 'ACTIVE',
      workspace_members: {
        some: {
          membership_status: 'ACTIVE',
          roles: { code: { in: [...REVIEWER_ROLE_CODES] }, is_active: true },
          workspaces: { is_active: true },
        },
      },
    },
  });
  if (others > 0) return;
  const bootstrap = await tx.system_bootstrap.findUnique({
    where: { id: 1 },
    select: { id: true, cto_email: true, claimed_by_user_id: true },
  });
  const identity = await tx.users.findUniqueOrThrow({
    where: { id: target.id },
    select: { email: true },
  });
  if (
    canRecoverBootstrapCto(
      { ...target, account_status: 'SUSPENDED', email: identity.email },
      identity.email,
      bootstrap,
    )
  )
    return;
  throw new AppError(
    409,
    'Tetapkan eksekutif Aktif lainnya sebelum menonaktifkan peninjau terakhir.',
    'LAST_REVIEWER',
  );
}

export async function deactivateAccount(actorId: bigint, targetId: bigint, reason: string) {
  const input = deactivateSchema.parse({ reason });
  return prisma.$transaction(async (tx) => {
    await lockLifecycleUsers(tx, [actorId, targetId]);
    const actor = await loadContext(tx, actorId),
      target = await loadContext(tx, targetId);
    if (target.account_status === 'SUSPENDED')
      throw new AppError(409, 'Akun sudah Nonaktif.', 'ACCOUNT_ALREADY_SUSPENDED');
    if (!canDirectDeactivate(actor, target))
      throw new AppError(
        403,
        'Anda tidak dapat menonaktifkan akun ini.',
        'ACCOUNT_ACTION_FORBIDDEN',
      );
    const updated = await suspend(tx, actorId, targetId, 'DIRECT_ADMIN', input.reason);
    await audit(tx, actorId, targetId, 'USER_DEACTIVATED', {
      source: 'DIRECT_ADMIN',
      target_role: protectedRole(target),
    });
    await notifyTarget(
      tx,
      targetId,
      'USER_DEACTIVATED',
      'Akun Anda Nonaktif',
      'Akun Anda telah dinonaktifkan. Data dan membership tetap tersimpan.',
    );
    return updated;
  }, transactionOptions);
}
export async function reactivateAccount(actorId: bigint, targetId: bigint, note?: string) {
  const input = noteSchema.parse({ note });
  return prisma.$transaction(async (tx) => {
    await lockLifecycleUsers(tx, [actorId, targetId]);
    const actor = await loadContext(tx, actorId),
      target = await loadContext(tx, targetId);
    if (target.account_status !== 'SUSPENDED')
      throw new AppError(409, 'Akun belum Nonaktif.', 'ACCOUNT_NOT_SUSPENDED');
    if (!canReactivate(actor, target))
      throw new AppError(
        403,
        'Anda tidak dapat mengaktifkan kembali akun ini.',
        'ACCOUNT_ACTION_FORBIDDEN',
      );
    const at = new Date();
    const updated = await tx.users.update({
      where: { id: targetId },
      data: {
        account_status: 'ACTIVE',
        reactivated_by_user_id: actorId,
        reactivated_at: at,
      },
      select: lifecycleSelect,
    });
    await audit(tx, actorId, targetId, 'USER_REACTIVATED', {
      previous_state: 'SUSPENDED',
      reactivated_at: at.toISOString(),
      note: input.note ?? null,
    });
    await notifyTarget(
      tx,
      targetId,
      'USER_REACTIVATED',
      'Akun Diaktifkan Kembali',
      'Anda dapat masuk dan menggunakan UNI-NEXUS kembali.',
    );
    return updated;
  }, transactionOptions);
}
export async function getOwnDeactivationRequest(userId: bigint) {
  return prisma.account_deactivation_requests.findFirst({
    where: { user_id: userId },
    select: requestSelect,
    orderBy: { id: 'desc' },
  });
}
export async function submitDeactivationRequest(userId: bigint, reason?: string) {
  const input = selfRequestSchema.parse({ reason });
  try {
    return await prisma.$transaction(async (tx) => {
      await lockLifecycleUsers(tx, [userId]);
      const user = await loadContext(tx, userId);
      if (!canSubmitSelfDeactivationRequest(user))
        throw new AppError(
          403,
          'Hanya akun Aktif yang dapat mengajukan permintaan.',
          'ACCOUNT_ACTION_FORBIDDEN',
        );
      const pending = await tx.account_deactivation_requests.findFirst({
        where: { user_id: userId, request_status: 'PENDING' },
        select: { id: true },
      });
      if (pending)
        throw new AppError(
          409,
          'Permintaan Anda masih menunggu peninjauan.',
          'DEACTIVATION_REQUEST_ALREADY_PENDING',
        );
      // pending_user_id is generated by MySQL; never write it from Prisma.
      const request = await tx.account_deactivation_requests.create({
        data: {
          user_id: userId,
          request_status: 'PENDING',
          request_reason: input.reason || null,
          requested_at: new Date(),
        },
        select: requestSelect,
      });
      await audit(tx, userId, userId, 'ACCOUNT_DEACTIVATION_REQUESTED', {
        request_id: request.id.toString(),
      });
      const candidates = await tx.users.findMany({
        where: {
          is_active: true,
          account_status: 'ACTIVE',
          workspace_members: {
            some: {
              membership_status: 'ACTIVE',
              roles: { code: { in: [...REVIEWER_ROLE_CODES] }, is_active: true },
              workspaces: { is_active: true },
            },
          },
        },
        select: lifecycleSelect,
      });
      for (const candidate of candidates) {
        if (canApproveDeactivationRequest(lifecycleContext(candidate), user)) {
          await notifyTarget(
            tx,
            candidate.id,
            'ACCOUNT_DEACTIVATION_REQUESTED',
            'Permintaan Penghapusan Akun',
            candidate.id === userId
              ? 'Permintaan Anda menunggu konfirmasi di Manajemen Pengguna.'
              : 'Ada permintaan penghapusan akun yang dapat Anda tinjau di Manajemen Pengguna.',
          );
        }
      }
      return request;
    }, transactionOptions);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')
      throw new AppError(
        409,
        'Permintaan Anda masih menunggu peninjauan.',
        'DEACTIVATION_REQUEST_ALREADY_PENDING',
      );
    throw error;
  }
}

async function pendingRequest(tx: Prisma.TransactionClient, requestId: bigint) {
  const request = await tx.account_deactivation_requests.findUnique({
    where: { id: requestId },
    select: requestSelect,
  });
  if (!request)
    throw new AppError(404, 'Permintaan tidak ditemukan.', 'DEACTIVATION_REQUEST_NOT_FOUND');
  if (request.request_status !== 'PENDING')
    throw new AppError(
      409,
      'Permintaan telah diselesaikan. Muat ulang halaman.',
      'DEACTIVATION_REQUEST_ALREADY_RESOLVED',
    );
  return request;
}
async function resolveRequest(
  tx: Prisma.TransactionClient,
  requestId: bigint,
  data: Prisma.account_deactivation_requestsUncheckedUpdateManyInput,
) {
  const result = await tx.account_deactivation_requests.updateMany({
    where: { id: requestId, request_status: 'PENDING' },
    data,
  });
  if (result.count !== 1)
    throw new AppError(
      409,
      'Permintaan telah diselesaikan. Muat ulang halaman.',
      'DEACTIVATION_REQUEST_ALREADY_RESOLVED',
    );
  return tx.account_deactivation_requests.findUniqueOrThrow({
    where: { id: requestId },
    select: requestSelect,
  });
}
export async function withdrawDeactivationRequest(userId: bigint, requestId: bigint) {
  return prisma.$transaction(async (tx) => {
    await lockLifecycleUsers(tx, [userId]);
    const request = await pendingRequest(tx, requestId);
    if (request.user_id !== userId)
      throw new AppError(
        403,
        'Hanya pemilik permintaan yang dapat menariknya.',
        'DEACTIVATION_REQUEST_FORBIDDEN',
      );
    const result = await resolveRequest(tx, requestId, {
      request_status: 'WITHDRAWN',
      withdrawn_at: new Date(),
    });
    await audit(tx, userId, userId, 'ACCOUNT_DEACTIVATION_WITHDRAWN', {
      request_id: requestId.toString(),
    });
    return result;
  }, transactionOptions);
}
export async function reviewDeactivationRequest(
  actorId: bigint,
  requestId: bigint,
  decision: 'APPROVED' | 'REJECTED',
  note?: string,
) {
  const input =
    decision === 'REJECTED' ? rejectRequestSchema.parse({ note }) : noteSchema.parse({ note });
  const lookup = await prisma.account_deactivation_requests.findUnique({
    where: { id: requestId },
    select: { user_id: true },
  });
  if (!lookup)
    throw new AppError(404, 'Permintaan tidak ditemukan.', 'DEACTIVATION_REQUEST_NOT_FOUND');
  return prisma.$transaction(async (tx) => {
    await lockLifecycleUsers(tx, [actorId, lookup.user_id]);
    const request = await pendingRequest(tx, requestId);
    const actor = await loadContext(tx, actorId),
      target = await loadContext(tx, request.user_id);
    const allowed =
      decision === 'APPROVED'
        ? canApproveDeactivationRequest(actor, target)
        : canRejectDeactivationRequest(actor, target);
    if (!allowed)
      throw new AppError(
        403,
        'Anda tidak dapat meninjau permintaan ini.',
        'DEACTIVATION_REQUEST_FORBIDDEN',
      );
    if (decision === 'APPROVED') await preserveReviewerContinuity(tx, target);
    const result = await resolveRequest(tx, requestId, {
      request_status: decision,
      reviewed_by_user_id: actorId,
      reviewed_at: new Date(),
      review_note: input.note || null,
    });
    if (decision === 'APPROVED') {
      await suspend(
        tx,
        actorId,
        target.id,
        'SELF_REQUEST',
        request.request_reason || 'Permintaan penghapusan akun disetujui.',
      );
      await audit(tx, actorId, target.id, 'USER_DEACTIVATED', {
        source: 'SELF_REQUEST',
        request_id: requestId.toString(),
        target_role: protectedRole(target),
      });
    }
    await audit(tx, actorId, target.id, `ACCOUNT_DEACTIVATION_${decision}`, {
      request_id: requestId.toString(),
      source: 'SELF_REQUEST',
    });
    await notifyTarget(
      tx,
      target.id,
      `ACCOUNT_DEACTIVATION_${decision}`,
      decision === 'APPROVED' ? 'Permintaan Disetujui' : 'Permintaan Ditolak',
      decision === 'APPROVED'
        ? 'Akun Anda kini Nonaktif. Data dan membership tetap tersimpan.'
        : `Akun Anda tetap Aktif. ${input.note}`,
    );
    return { ...result, session_ended: decision === 'APPROVED' && actorId === target.id };
  }, transactionOptions);
}

function serializeRequest(
  row: Prisma.account_deactivation_requestsGetPayload<{ select: typeof requestDetailSelect }>,
  actor: Awaited<ReturnType<typeof loadContext>>,
) {
  const { users_account_deactivation_requests_user_idTousers: user, ...request } = row;
  const target = lifecycleContext(user),
    pending = row.request_status === 'PENDING';
  return {
    ...request,
    user: {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      account_status: user.account_status,
      role: protectedRole(target),
      roles: target.roles,
      photo_url:
        user.account_status === 'ACTIVE'
          ? resolveAssetUrl(user.id, user.user_profile_assets[0])
          : null,
    },
    allowed_actions: {
      approve: pending && canApproveDeactivationRequest(actor, target),
      reject: pending && canRejectDeactivationRequest(actor, target),
    },
  };
}
async function reviewerContext(actorId: bigint) {
  const actor = await loadContext(prisma, actorId);
  if (!isExecutive(actor) || !actor.is_active || actor.account_status !== 'ACTIVE')
    throw new AppError(
      403,
      'Anda tidak dapat mengakses Manajemen Pengguna.',
      'ACCOUNT_ACTION_FORBIDDEN',
    );
  return actor;
}
export async function listDeactivationRequests(
  actorId: bigint,
  query: { status?: DeactivationRequestStatus; page: number; pageSize: number },
) {
  const actor = await reviewerContext(actorId),
    where = query.status ? { request_status: query.status } : {};
  const [rows, total, pendingCount] = await Promise.all([
    prisma.account_deactivation_requests.findMany({
      where,
      select: requestDetailSelect,
      orderBy: { requested_at: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.account_deactivation_requests.count({ where }),
    prisma.account_deactivation_requests.count({ where: { request_status: 'PENDING' } }),
  ]);
  return {
    data: rows.map((row) => serializeRequest(row, actor)),
    pending_count: pendingCount,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}
export async function getDeactivationRequest(actorId: bigint, requestId: bigint) {
  const actor = await reviewerContext(actorId);
  const row = await prisma.account_deactivation_requests.findUnique({
    where: { id: requestId },
    select: requestDetailSelect,
  });
  if (!row)
    throw new AppError(404, 'Permintaan tidak ditemukan.', 'DEACTIVATION_REQUEST_NOT_FOUND');
  return serializeRequest(row, actor);
}

export { getAllowedAccountActions };

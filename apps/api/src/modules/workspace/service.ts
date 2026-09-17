import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { safeUserSelect } from '../auth/service.js';
import { hasPermission } from '../../middleware/auth.js';

const memberInclude = {
  users: { select: safeUserSelect },
  roles: { select: { id: true, name: true, code: true, is_active: true } },
} as const;

export async function workspaceMembers(workspaceId: bigint) {
  const rows = await prisma.workspace_members.findMany({
    where: { workspace_id: workspaceId },
    include: memberInclude,
    orderBy: { joined_at: 'asc' },
  });
  return rows.map(({ users, roles, ...member }) => ({ ...member, user: users, role: roles }));
}

function mayManageRole(actorRole: string, targetRole: string): void {
  const actor = actorRole.toUpperCase();
  const target = targetRole.toUpperCase();
  if (
    (target === 'OWNER' && actor !== 'OWNER') ||
    (target === 'CEO' && !['OWNER', 'CEO'].includes(actor))
  ) {
    throw new AppError(
      403,
      'Only an owner can manage owner access; CEO access requires an owner or CEO.',
      'ROLE_HIERARCHY',
    );
  }
}

async function lockWorkspace(tx: Prisma.TransactionClient, workspaceId: bigint, actorId: bigint) {
  // Serialize membership changes so concurrent demotions cannot remove all owners.
  const rows = await tx.$queryRaw<
    Array<{ id: bigint }>
  >`SELECT id FROM workspaces WHERE id = ${workspaceId} FOR UPDATE`;
  if (rows.length === 0) throw new AppError(404, 'Workspace not found.', 'NOT_FOUND');
  const actor = await tx.workspace_members.findFirst({
    where: {
      workspace_id: workspaceId,
      user_id: actorId,
      membership_status: 'ACTIVE',
      users: { is_active: true, account_status: 'ACTIVE' },
    },
    include: { roles: true },
  });
  if (!actor?.roles?.is_active || !hasPermission(actor.roles.code, 'settings'))
    throw new AppError(
      403,
      'Your workspace administrator access has changed. Refresh and try again.',
      'FORBIDDEN',
    );
  return actor.roles.code;
}

export async function addMember(
  workspaceId: bigint,
  actorId: bigint,
  actorRole: string,
  email: string,
  roleId: bigint,
) {
  return prisma.$transaction(
    async (tx) => {
      actorRole = await lockWorkspace(tx, workspaceId, actorId);
      const role = await tx.roles.findFirst({ where: { id: roleId, is_active: true } });
      if (!role) throw new AppError(422, 'Select an active role.', 'INVALID_ROLE');
      mayManageRole(actorRole, role.code);
      const user = await tx.users.findUnique({
        where: { email },
        select: { ...safeUserSelect, is_active: true },
      });
      // Only an already-approved account may join another workspace here — this endpoint
      // grants a second membership, not initial approval. See modules/user-management for that.
      if (!user || !user.is_active || user.account_status !== 'ACTIVE')
        throw new AppError(
          422,
          'No eligible active account was found for this email. The account must already be approved.',
          'USER_NOT_AVAILABLE',
        );
      if (
        await tx.workspace_members.findFirst({
          where: { workspace_id: workspaceId, user_id: user.id },
        })
      )
        throw new AppError(
          409,
          'This user already has a membership. Edit their existing membership instead.',
          'MEMBERSHIP_EXISTS',
        );
      const member = await tx.workspace_members.create({
        data: {
          workspace_id: workspaceId,
          user_id: user.id,
          role_id: role.id,
          membership_status: 'ACTIVE',
        },
        include: memberInclude,
      });
      await tx.audit_logs.create({
        data: {
          workspace_id: workspaceId,
          user_id: actorId,
          action: 'MEMBER_ADDED',
          entity_type: 'workspace_members',
          entity_id: member.id,
          new_value_json: {
            user_id: user.id.toString(),
            role: role.code,
            membership_status: 'ACTIVE',
          },
        },
      });
      const { users, roles, ...record } = member;
      return { ...record, user: users, role: roles };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}

export async function updateMember(
  workspaceId: bigint,
  actorId: bigint,
  actorRole: string,
  memberId: bigint,
  input: { role_id?: bigint; membership_status?: 'ACTIVE' | 'INACTIVE' },
) {
  return prisma.$transaction(
    async (tx) => {
      actorRole = await lockWorkspace(tx, workspaceId, actorId);
      const current = await tx.workspace_members.findFirst({
        where: { id: memberId, workspace_id: workspaceId },
        include: memberInclude,
      });
      if (!current) throw new AppError(404, 'Membership not found.', 'NOT_FOUND');
      if (current.roles) mayManageRole(actorRole, current.roles.code);
      const role = input.role_id
        ? await tx.roles.findFirst({ where: { id: input.role_id, is_active: true } })
        : current.roles;
      if (!role?.is_active) throw new AppError(422, 'Select an active role.', 'INVALID_ROLE');
      mayManageRole(actorRole, role.code);
      const membership_status = input.membership_status ?? current.membership_status;
      if (
        current.roles?.code.toUpperCase() === 'OWNER' &&
        current.membership_status === 'ACTIVE' &&
        (role.code.toUpperCase() !== 'OWNER' || membership_status !== 'ACTIVE')
      ) {
        const owners = await tx.workspace_members.count({
          where: {
            workspace_id: workspaceId,
            membership_status: 'ACTIVE',
            roles: { code: 'OWNER', is_active: true },
            users: { is_active: true, account_status: 'ACTIVE' },
          },
        });
        if (owners <= 1)
          throw new AppError(
            409,
            'Assign another active owner before removing or demoting the last owner.',
            'LAST_OWNER',
          );
      }
      if (membership_status === 'ACTIVE') {
        const user = await tx.users.findUnique({
          where: { id: current.user_id },
          select: { is_active: true, account_status: true },
        });
        // Approval (PENDING -> ACTIVE) only happens through modules/user-management;
        // reactivating a membership never bypasses that gate.
        if (!user?.is_active || user.account_status !== 'ACTIVE')
          throw new AppError(
            422,
            'This account is not an approved, active account.',
            'USER_NOT_AVAILABLE',
          );
      }
      const member = await tx.workspace_members.update({
        where: { id: memberId },
        data: { role_id: role.id, membership_status },
        include: memberInclude,
      });
      await tx.audit_logs.create({
        data: {
          workspace_id: workspaceId,
          user_id: actorId,
          action: 'MEMBER_UPDATED',
          entity_type: 'workspace_members',
          entity_id: memberId,
          old_value_json: {
            role: current.roles?.code ?? null,
            membership_status: current.membership_status,
          },
          new_value_json: { role: role.code, membership_status },
        },
      });
      const { users, roles, ...record } = member;
      return { ...record, user: users, role: roles };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}

export async function updateWorkspace(
  workspaceId: bigint,
  actorId: bigint,
  input: { name?: string; description?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.workspaces.findUniqueOrThrow({ where: { id: workspaceId } });
    const workspace = await tx.workspaces.update({ where: { id: workspaceId }, data: input });
    await tx.audit_logs.create({
      data: {
        workspace_id: workspaceId,
        user_id: actorId,
        action: 'WORKSPACE_UPDATED',
        entity_type: 'workspaces',
        entity_id: workspaceId,
        old_value_json: { name: before.name, description: before.description },
        new_value_json: { name: workspace.name, description: workspace.description },
      },
    });
    return workspace;
  });
}

export async function ensureRole(
  workspaceId: bigint,
  actorId: bigint,
  actorRole: string,
  input: { code: string; name?: string; description?: string },
) {
  mayManageRole(actorRole, input.code);
  return prisma.$transaction(async (tx) => {
    const role = await tx.roles.upsert({
      where: { code: input.code },
      create: {
        code: input.code,
        name: input.name ?? input.code.charAt(0) + input.code.slice(1).toLowerCase(),
        description: input.description,
      },
      update: {},
    });
    if (!role.is_active)
      throw new AppError(
        409,
        'This role is disabled. A database administrator must review it before reuse.',
        'ROLE_DISABLED',
      );
    await tx.audit_logs.create({
      data: {
        workspace_id: workspaceId,
        user_id: actorId,
        action: 'ROLE_ENABLED_FOR_ASSIGNMENT',
        entity_type: 'roles',
        entity_id: role.id,
        new_value_json: { code: role.code },
      },
    });
    return role;
  });
}

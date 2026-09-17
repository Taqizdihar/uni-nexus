import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { notifyReviewers } from '../user-management/service.js';
import type { signupSchema } from './validation.js';

export const safeUserSelect = {
  id: true,
  full_name: true,
  username: true,
  email: true,
  phone: true,
  account_status: true,
  presence_status: true,
} as const;
const dummyHash = bcrypt.hash(randomBytes(32).toString('hex'), 12);

export async function authConfig() {
  return { allowPublicSignup: env.ALLOW_PUBLIC_SIGNUP };
}

interface BootstrapRow {
  id: number;
  cto_email: string;
  default_workspace_id: bigint | null;
  claimed_at: Date | null;
}

/** Only the caller (signup, holding the system_bootstrap row lock) may invoke this. */
async function claimCtoBootstrap(
  tx: Prisma.TransactionClient,
  input: z.infer<typeof signupSchema>,
  password_hash: string,
  bootstrapRow: BootstrapRow,
) {
  let workspaceId = bootstrapRow.default_workspace_id;
  if (!workspaceId) {
    const workspace = await tx.workspaces.create({
      data: { name: '3D Printing', code: `WS_${randomBytes(6).toString('hex').toUpperCase()}` },
    });
    workspaceId = workspace.id;
  }
  const role = await tx.roles.findFirst({ where: { code: 'CTO' } });
  if (!role) throw new AppError(500, 'The CTO role is not configured.', 'ROLE_MISSING');
  const user = await tx.users.create({
    data: {
      full_name: input.full_name,
      username: input.username,
      email: input.email,
      phone: input.phone,
      password_hash,
      password_changed_at: new Date(),
      account_status: 'ACTIVE',
      presence_status: 'DEFAULT',
      default_workspace_id: workspaceId,
    },
  });
  await tx.workspace_members.create({
    data: { workspace_id: workspaceId, user_id: user.id, role_id: role.id, membership_status: 'ACTIVE' },
  });
  await tx.system_bootstrap.update({
    where: { id: bootstrapRow.id },
    data: { claimed_by_user_id: user.id, claimed_at: new Date(), default_workspace_id: workspaceId },
  });
  await tx.audit_logs.create({
    data: {
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'USER_REGISTERED',
      entity_type: 'users',
      entity_id: user.id,
    },
  });
  await tx.audit_logs.create({
    data: {
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'BOOTSTRAP_CTO_CLAIMED',
      entity_type: 'system_bootstrap',
      entity_id: BigInt(bootstrapRow.id),
      new_value_json: { workspace_id: workspaceId.toString(), role: 'CTO' },
    },
  });
  return { user, bootstrapped: true as const };
}

export async function signup(input: z.infer<typeof signupSchema>) {
  if (!env.ALLOW_PUBLIC_SIGNUP)
    throw new AppError(
      403,
      'Public registration is disabled. Contact a workspace administrator.',
      'SIGNUP_DISABLED',
    );
  const password_hash = await bcrypt.hash(input.password, 12);
  return prisma.$transaction(
    async (tx) => {
      // Locking this singleton row serializes every signup, which is what makes the
      // one-time CTO bootstrap claim race-free without a separate advisory lock.
      const bootstrapRows = await tx.$queryRaw<
        BootstrapRow[]
      >`SELECT id, cto_email, default_workspace_id, claimed_at FROM system_bootstrap WHERE id = 1 FOR UPDATE`;
      if (await tx.users.findFirst({ where: { username: input.username } }))
        throw new AppError(409, 'This username is already taken.', 'USERNAME_TAKEN');
      if (await tx.users.findFirst({ where: { email: input.email } }))
        throw new AppError(409, 'An account with this email already exists.', 'EMAIL_TAKEN');
      const bootstrapRow = bootstrapRows[0];
      const eligible =
        bootstrapRow != null &&
        bootstrapRow.claimed_at == null &&
        bootstrapRow.cto_email.trim().toLowerCase() === input.email;
      if (eligible) return claimCtoBootstrap(tx, input, password_hash, bootstrapRow);
      const user = await tx.users.create({
        data: {
          full_name: input.full_name,
          username: input.username,
          email: input.email,
          phone: input.phone,
          password_hash,
          password_changed_at: new Date(),
          account_status: 'PENDING',
          presence_status: 'DEFAULT',
        },
      });
      await tx.audit_logs.create({
        data: { user_id: user.id, action: 'USER_REGISTERED', entity_type: 'users', entity_id: user.id },
      });
      await notifyReviewers(tx, user.full_name);
      return { user, bootstrapped: false as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 },
  );
}

export async function login(email: string, password: string) {
  const user = await prisma.users.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.password_hash ?? (await dummyHash));
  if (!valid || !user || !user.is_active)
    throw new AppError(401, 'The email or password is incorrect.', 'INVALID_CREDENTIALS');
  if (user.account_status === 'PENDING')
    throw new AppError(
      403,
      'Your account is awaiting approval from an authorized executive.',
      'ACCOUNT_PENDING',
    );
  if (user.account_status === 'REJECTED')
    throw new AppError(
      403,
      'Your account registration was not approved.',
      'ACCOUNT_REJECTED',
      user.rejection_reason ? { reason: user.rejection_reason } : undefined,
    );
  if (user.account_status === 'SUSPENDED')
    throw new AppError(403, 'Your account has been suspended.', 'ACCOUNT_SUSPENDED');
  await prisma.users.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
  return user;
}

export async function currentUser(userId: bigint) {
  const record = await prisma.users.findUnique({
    where: { id: userId },
    select: { ...safeUserSelect, default_workspace_id: true },
  });
  if (!record) throw new AppError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
  const { default_workspace_id, ...user } = record;
  return {
    user,
    workspaces: await listWorkspaces(userId),
    default_workspace_id: default_workspace_id?.toString() ?? null,
  };
}

export async function listWorkspaces(userId: bigint) {
  const memberships = await prisma.workspace_members.findMany({
    where: {
      user_id: userId,
      membership_status: 'ACTIVE',
      workspaces: { is_active: true },
      roles: { is_active: true },
      users: { is_active: true, account_status: 'ACTIVE' },
    },
    include: { workspaces: true, roles: true },
    orderBy: { joined_at: 'asc' },
  });
  return memberships.map(({ workspaces: workspace, roles: role }) => ({
    id: workspace.id,
    name: workspace.name,
    code: workspace.code,
    description: workspace.description,
    role: role!.code,
  }));
}

export async function changePassword(
  userId: bigint,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash)))
    throw new AppError(400, 'Current password is incorrect.', 'INVALID_PASSWORD');
  if (await bcrypt.compare(newPassword, user.password_hash))
    throw new AppError(422, 'Choose a different password.', 'PASSWORD_UNCHANGED');
  const password_hash = await bcrypt.hash(newPassword, 12);
  const password_changed_at = new Date();
  return prisma.$transaction(async (tx) => {
    // A conditional update rejects a second concurrent change using an old password.
    const result = await tx.users.updateMany({
      where: { id: userId, password_hash: user.password_hash },
      data: { password_hash, password_changed_at },
    });
    if (result.count !== 1)
      throw new AppError(
        409,
        'Your password was changed in another session. Sign in again.',
        'PASSWORD_CHANGED',
      );
    await tx.audit_logs.create({
      data: {
        user_id: userId,
        action: 'PASSWORD_CHANGED',
        entity_type: 'users',
        entity_id: userId,
      },
    });
    return { id: userId, password_hash };
  });
}

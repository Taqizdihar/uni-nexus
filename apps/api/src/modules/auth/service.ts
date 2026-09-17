import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import type { setupSchema, signupSchema } from './validation.js';

export const safeUserSelect = {
  id: true,
  full_name: true,
  email: true,
  phone: true,
  account_status: true,
} as const;
const dummyHash = bcrypt.hash(randomBytes(32).toString('hex'), 12);

export async function setupStatus() {
  return {
    setupRequired: (await prisma.users.count()) === 0,
    allowPublicSignup: env.ALLOW_PUBLIC_SIGNUP,
  };
}

export async function bootstrap(input: z.infer<typeof setupSchema>) {
  const password_hash = await bcrypt.hash(input.password, 12);
  return prisma.$transaction(
    async (tx) => {
      const lock = await tx.$queryRaw<
        Array<{ acquired: number | bigint | null }>
      >`SELECT GET_LOCK('uni-nexus:first-run-setup', 10) AS acquired`;
      if (Number(lock[0]?.acquired) !== 1)
        throw new AppError(409, 'Setup is already running. Please try again.', 'SETUP_BUSY');
      try {
        // A locking read is current even under repeatable-read. It also waits for an
        // earlier setup commit if that connection just released the advisory lock.
        const users = await tx.$queryRaw<
          Array<{ id: bigint }>
        >`SELECT id FROM users ORDER BY id LIMIT 1 FOR UPDATE`;
        if (users.length > 0)
          throw new AppError(409, 'Initial setup has already been completed.', 'SETUP_COMPLETE');
        const role = await tx.roles.upsert({
          where: { code: 'OWNER' },
          create: {
            code: 'OWNER',
            name: 'Owner',
            description: 'Full workspace control',
            is_active: true,
          },
          update: { is_active: true },
        });
        const user = await tx.users.create({
          data: {
            full_name: input.full_name,
            email: input.email,
            password_hash,
            account_status: 'ACTIVE',
          },
        });
        const workspace = await tx.workspaces.create({
          data: {
            name: input.workspace_name,
            code: `WS_${randomBytes(6).toString('hex').toUpperCase()}`,
          },
        });
        await tx.workspace_members.create({
          data: {
            workspace_id: workspace.id,
            user_id: user.id,
            role_id: role.id,
            membership_status: 'ACTIVE',
          },
        });
        await tx.audit_logs.create({
          data: {
            workspace_id: workspace.id,
            user_id: user.id,
            action: 'SETUP_COMPLETED',
            entity_type: 'workspaces',
            entity_id: workspace.id,
            new_value_json: { name: workspace.name },
          },
        });
        return user;
      } finally {
        // MySQL advisory locks are connection-scoped and must always be released.
        await tx.$queryRaw`SELECT RELEASE_LOCK('uni-nexus:first-run-setup')`;
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 },
  );
}

export async function signup(input: z.infer<typeof signupSchema>) {
  if (!env.ALLOW_PUBLIC_SIGNUP)
    throw new AppError(
      403,
      'Public registration is disabled. Contact a workspace administrator.',
      'SIGNUP_DISABLED',
    );
  if ((await prisma.users.count()) === 0)
    throw new AppError(
      409,
      'Complete initial setup before registering additional accounts.',
      'SETUP_REQUIRED',
    );
  const password_hash = await bcrypt.hash(input.password, 12);
  return prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: {
        full_name: input.full_name,
        email: input.email,
        password_hash,
        account_status: 'PENDING',
      },
    });
    await tx.audit_logs.create({
      data: {
        user_id: user.id,
        action: 'USER_REGISTERED',
        entity_type: 'users',
        entity_id: user.id,
      },
    });
    return user;
  });
}

export async function login(email: string, password: string) {
  const user = await prisma.users.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.password_hash ?? (await dummyHash));
  if (!valid || !user || !user.is_active || !['ACTIVE', 'PENDING'].includes(user.account_status))
    throw new AppError(401, 'The email or password is incorrect.', 'INVALID_CREDENTIALS');
  await prisma.users.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
  return user;
}

export async function currentUser(userId: bigint) {
  const user = await prisma.users.findUnique({ where: { id: userId }, select: safeUserSelect });
  if (!user) throw new AppError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
  return { user, workspaces: await listWorkspaces(userId) };
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

export async function changePassword(userId: bigint, currentPassword: string, newPassword: string) {
  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash)))
    throw new AppError(400, 'Current password is incorrect.', 'INVALID_PASSWORD');
  if (await bcrypt.compare(newPassword, user.password_hash))
    throw new AppError(422, 'Choose a different password.', 'PASSWORD_UNCHANGED');
  const password_hash = await bcrypt.hash(newPassword, 12);
  return prisma.$transaction(async (tx) => {
    // A conditional update rejects a second concurrent change using an old password.
    const result = await tx.users.updateMany({
      where: { id: userId, password_hash: user.password_hash },
      data: { password_hash },
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

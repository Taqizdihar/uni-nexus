import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { matchesFingerprint, verifySession } from '../modules/auth/session.js';

export const rolePermissions: Readonly<Record<string, readonly string[]>> = {
  OWNER: ['*'],
  CEO: ['*'],
  ADMIN: ['*'],
  MANAGER: ['read', 'sales', 'design', 'production', 'finance', 'audit'],
  DESIGNER: ['read', 'design'],
  OPERATOR: ['read', 'production'],
};

export function hasPermission(role: string, permission: string): boolean {
  const permissions = rolePermissions[role.toUpperCase()] ?? [];
  return permissions.includes('*') || permissions.includes(permission);
}

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    const token: unknown = request.cookies?.[env.COOKIE_NAME];
    const session = typeof token === 'string' ? verifySession(token) : null;
    if (!session) throw new AppError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
    const user = await prisma.users.findUnique({
      where: { id: session.userId },
      select: { id: true, password_hash: true, is_active: true, account_status: true },
    });
    if (
      !user ||
      !user.is_active ||
      !['ACTIVE', 'PENDING'].includes(user.account_status) ||
      !matchesFingerprint(user.password_hash, session.fingerprint)
    )
      throw new AppError(401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
    request.auth = { userId: user.id };
    next();
  } catch (error) {
    next(error);
  }
};

export function parseId(value: unknown, label = 'ID'): bigint {
  if (typeof value !== 'string' || !/^[1-9]\d{0,19}$/.test(value))
    throw new AppError(400, `A valid ${label} is required.`, 'INVALID_ID');
  const id = BigInt(value);
  if (id > 18446744073709551615n)
    throw new AppError(400, `A valid ${label} is required.`, 'INVALID_ID');
  return id;
}

export const requireWorkspace: RequestHandler = async (request, _response, next) => {
  try {
    if (!request.auth) throw new AppError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
    const id = parseId(request.params.workspaceId ?? request.get('X-Workspace-Id'), 'workspace ID');
    const membership = await prisma.workspace_members.findFirst({
      where: {
        workspace_id: id,
        user_id: request.auth.userId,
        membership_status: 'ACTIVE',
        workspaces: { is_active: true },
        users: { is_active: true, account_status: 'ACTIVE' },
      },
      include: { roles: true },
    });
    if (!membership || !membership.roles?.is_active)
      throw new AppError(403, 'You do not have access to this workspace.', 'WORKSPACE_FORBIDDEN');
    request.workspace = { id, role: membership.roles.code.toUpperCase() };
    next();
  } catch (error) {
    next(error);
  }
};

export function authorize(permission: string): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth)
      return next(new AppError(401, 'Please sign in to continue.', 'UNAUTHENTICATED'));
    if (!request.workspace || !hasPermission(request.workspace.role, permission))
      return next(new AppError(403, 'Your role does not permit this action.', 'FORBIDDEN'));
    next();
  };
}

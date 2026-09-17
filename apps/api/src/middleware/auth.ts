import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { matchesFingerprint, verifySession } from '../modules/auth/session.js';

// user_management gates the account-approval module (see modules/user-management). CEO already
// carries '*' from the legacy role map, which already implies user_management via the wildcard
// check below; CTO is the primary system administrator and gets the same full wildcard access.
export const rolePermissions: Readonly<Record<string, readonly string[]>> = {
  // Legacy codes: no rows use these anymore, kept only as compatibility artifacts.
  OWNER: ['*'],
  ADMIN: ['*'],
  MANAGER: ['read', 'sales', 'design', 'production', 'finance', 'audit'],
  DESIGNER: ['read', 'design'],
  OPERATOR: ['read', 'production'],
  // Official UNI-NEXUS roles.
  CEO: ['*'],
  CTO: ['*'],
  COO: ['user_management'],
  CVO: ['user_management'],
  '3D_DESIGNER': ['read', 'design'],
  STAFF_OF_SPECIALTY: ['read', 'production'],
  STAFF: ['read'],
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
      user.account_status !== 'ACTIVE' ||
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

/**
 * Account approval is a cross-workspace, executive-only capability (CEO/COO/CTO/CVO), so unlike
 * `authorize` it does not depend on an X-Workspace-Id: it checks for the user_management
 * permission on any active membership, in any workspace. This is a fast-path UX gate only —
 * user-management/service.ts re-checks authoritatively with row locking inside each transaction.
 */
export const reviewerRoleCodes = Object.entries(rolePermissions)
  .filter(([, permissions]) => permissions.includes('*') || permissions.includes('user_management'))
  .map(([code]) => code);
export const requireUserManagement: RequestHandler = async (request, _response, next) => {
  try {
    if (!request.auth) throw new AppError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
    // A user may hold different roles across workspaces; any one reviewer role is enough.
    const membership = await prisma.workspace_members.findFirst({
      where: {
        user_id: request.auth.userId,
        membership_status: 'ACTIVE',
        roles: { code: { in: reviewerRoleCodes }, is_active: true },
        workspaces: { is_active: true },
      },
    });
    if (!membership)
      throw new AppError(
        403,
        'Only CEO, COO, CTO, or CVO may access User Management.',
        'FORBIDDEN',
      );
    next();
  } catch (error) {
    next(error);
  }
};

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { resolveAssetUrl } from '../profile/service.js';

/**
 * MVP "who's online" registry. In-memory and scoped to a single backend process — a user counts as
 * online while a heartbeat for them has arrived within TTL_MS. A future multi-instance deployment
 * would swap this Map for Redis (or similar shared ephemeral state); not needed while there's one
 * backend instance. Nothing here is persisted to MySQL — presence is intentionally ephemeral.
 */
export const HEARTBEAT_TTL_MS = 90_000;

type PresenceEntry = { workspaceId: bigint; lastSeen: number };
const registry = new Map<bigint, PresenceEntry>();

export function recordHeartbeat(userId: bigint, workspaceId: bigint): void {
  registry.set(userId, { workspaceId, lastSeen: Date.now() });
}

function onlineUserIds(workspaceId: bigint): bigint[] {
  const now = Date.now();
  const ids: bigint[] = [];
  for (const [userId, entry] of registry) {
    const expired = now - entry.lastSeen > HEARTBEAT_TTL_MS;
    if (expired) registry.delete(userId);
    else if (entry.workspaceId === workspaceId) ids.push(userId);
  }
  return ids;
}

const onlineUserSelect = {
  id: true,
  full_name: true,
  username: true,
  presence_status: true,
  user_profile_assets: {
    select: { asset_type: true, object_key: true, storage_provider: true, public_url: true },
  },
} satisfies Prisma.usersSelect;

/** Safe, workspace-scoped identity fields only — no email, phone, or approval metadata. */
export async function listOnline(workspaceId: bigint) {
  const ids = onlineUserIds(workspaceId);
  if (!ids.length) return [];
  const members = await prisma.workspace_members.findMany({
    where: {
      workspace_id: workspaceId,
      user_id: { in: ids },
      membership_status: 'ACTIVE',
      roles: { is_active: true },
      users: { is_active: true, account_status: 'ACTIVE' },
    },
    include: { users: { select: onlineUserSelect }, roles: { select: { code: true, name: true } } },
  });
  return members.map(({ users: user, roles: role }) => ({
    id: user.id,
    full_name: user.full_name,
    username: user.username,
    presence_status: user.presence_status,
    role: role ? { code: role.code, name: role.name } : null,
    photo_url: resolveAssetUrl(
      user.id,
      user.user_profile_assets.find((asset) => asset.asset_type === 'PROFILE_PHOTO'),
    ),
  }));
}

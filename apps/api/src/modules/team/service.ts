import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { resolveAssetUrl } from '../profile/service.js';

const teamUserSelect = {
  id: true,
  full_name: true,
  username: true,
  bio: true,
  presence_status: true,
  pets: { select: { id: true, name: true, subtitle: true, image_url: true } },
  user_tags: { select: { tag_text: true }, orderBy: { sort_order: 'asc' } },
  user_profile_assets: {
    select: { asset_type: true, object_key: true, storage_provider: true, public_url: true },
  },
} satisfies Prisma.usersSelect;
type TeamUserRow = Prisma.usersGetPayload<{ select: typeof teamUserSelect }>;

function serializeTeamUser(user: TeamUserRow) {
  const { pets: pet, user_tags: tags, user_profile_assets: assets, ...rest } = user;
  return {
    ...rest,
    pet: pet ? { id: pet.id, name: pet.name, subtitle: pet.subtitle, image_url: pet.image_url } : null,
    tags: tags.map((tag) => tag.tag_text),
    photo_url: resolveAssetUrl(rest.id, assets.find((asset) => asset.asset_type === 'PROFILE_PHOTO')),
    banner_url: resolveAssetUrl(rest.id, assets.find((asset) => asset.asset_type === 'PROFILE_BANNER')),
  };
}

export async function listTeam(workspaceId: bigint, search?: string) {
  const rows = await prisma.workspace_members.findMany({
    where: {
      workspace_id: workspaceId,
      membership_status: 'ACTIVE',
      roles: { is_active: true },
      users: {
        is_active: true,
        account_status: 'ACTIVE',
        ...(search
          ? {
              OR: [
                { full_name: { contains: search } },
                { username: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {}),
      },
    },
    include: { users: { select: teamUserSelect }, roles: { select: { code: true, name: true } } },
  });
  return rows
    .map(({ users: user, roles: role }) => ({
      ...serializeTeamUser(user),
      role: role ? { code: role.code, name: role.name } : null,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function getTeamMember(workspaceId: bigint, userId: bigint) {
  const member = await prisma.workspace_members.findFirst({
    where: {
      workspace_id: workspaceId,
      user_id: userId,
      membership_status: 'ACTIVE',
      roles: { is_active: true },
      users: { is_active: true, account_status: 'ACTIVE' },
    },
    include: { users: { select: teamUserSelect }, roles: { select: { code: true, name: true } } },
  });
  if (!member) throw new AppError(404, 'Team member not found.', 'NOT_FOUND');
  return {
    ...serializeTeamUser(member.users),
    role: member.roles ? { code: member.roles.code, name: member.roles.name } : null,
  };
}

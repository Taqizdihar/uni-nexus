import type { Prisma } from '@prisma/client';
import { MAX_USER_TAGS, type PresenceStatus, type ProfileAssetType } from '@uni-nexus/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { LocalStorageService, validateUpload } from '../../services/storage.js';

export const assetStorage = new LocalStorageService(env.LOCAL_STORAGE_PATH);

const profileSelect = {
  id: true,
  full_name: true,
  username: true,
  email: true,
  phone: true,
  bio: true,
  presence_status: true,
  password_changed_at: true,
  default_workspace_id: true,
  pets: { select: { id: true, name: true, subtitle: true, description: true, image_url: true } },
  user_tags: { select: { id: true, tag_text: true }, orderBy: { sort_order: 'asc' } },
  user_profile_assets: {
    select: { asset_type: true, object_key: true, storage_provider: true, public_url: true },
  },
  workspace_members: {
    where: { membership_status: 'ACTIVE', workspaces: { is_active: true }, roles: { is_active: true } },
    select: {
      workspaces: { select: { id: true, name: true, code: true } },
      roles: { select: { code: true, name: true } },
    },
  },
} satisfies Prisma.usersSelect;
type ProfileRow = Prisma.usersGetPayload<{ select: typeof profileSelect }>;

export function resolveAssetUrl(
  userId: bigint,
  asset?: { asset_type: string; object_key: string | null; storage_provider: string | null; public_url: string | null },
) {
  if (!asset) return null;
  if (asset.public_url) return asset.public_url;
  if (asset.storage_provider === 'LOCAL' && asset.object_key)
    return `/api/v1/profile/assets/${userId.toString()}/${asset.asset_type}`;
  return null;
}

function serializeProfile(user: ProfileRow) {
  const { pets: pet, user_tags: tags, user_profile_assets: assets, workspace_members: memberships, default_workspace_id, ...rest } = user;
  const active = memberships.map((member) => ({
    workspace: member.workspaces,
    role: member.roles ? { code: member.roles.code, name: member.roles.name } : null,
  }));
  const defaultMembership = active.find((member) => member.workspace.id === default_workspace_id) ?? active[0] ?? null;
  return {
    ...rest,
    tags,
    pet: pet ? { id: pet.id, name: pet.name, subtitle: pet.subtitle, description: pet.description, image_url: pet.image_url } : null,
    photo_url: resolveAssetUrl(rest.id, assets.find((asset) => asset.asset_type === 'PROFILE_PHOTO')),
    banner_url: resolveAssetUrl(rest.id, assets.find((asset) => asset.asset_type === 'PROFILE_BANNER')),
    memberships: active,
    default_workspace: defaultMembership?.workspace ?? null,
    role: defaultMembership?.role ?? null,
  };
}

export async function getOwnProfile(userId: bigint) {
  const user = await prisma.users.findUnique({ where: { id: userId }, select: profileSelect });
  if (!user) throw new AppError(404, 'Profile not found.', 'NOT_FOUND');
  return serializeProfile(user);
}

export async function updateProfile(
  userId: bigint,
  input: { full_name?: string; username?: string; phone?: string; bio?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    if (input.username) {
      const existing = await tx.users.findFirst({
        where: { username: input.username, id: { not: userId } },
      });
      if (existing) throw new AppError(409, 'This username is already taken.', 'USERNAME_TAKEN');
    }
    await tx.users.update({ where: { id: userId }, data: input, select: { id: true } });
    await tx.audit_logs.create({
      data: {
        user_id: userId,
        action: 'PROFILE_UPDATED',
        entity_type: 'users',
        entity_id: userId,
        new_value_json: input,
      },
    });
    return getOwnProfile(userId);
  });
}

export async function updatePresence(userId: bigint, presence: PresenceStatus) {
  return prisma.$transaction(async (tx) => {
    await tx.users.update({
      where: { id: userId },
      data: { presence_status: presence },
      select: { id: true },
    });
    await tx.audit_logs.create({
      data: {
        user_id: userId,
        action: 'PRESENCE_CHANGED',
        entity_type: 'users',
        entity_id: userId,
        new_value_json: { presence_status: presence },
      },
    });
    return getOwnProfile(userId);
  });
}

export async function updateDefaultWorkspace(userId: bigint, workspaceId: bigint) {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.workspace_members.findFirst({
      where: { user_id: userId, workspace_id: workspaceId, membership_status: 'ACTIVE' },
      include: { workspaces: true },
    });
    if (!membership || !membership.workspaces.is_active)
      throw new AppError(422, 'Select one of your active workspaces.', 'INVALID_WORKSPACE');
    await tx.users.update({
      where: { id: userId },
      data: { default_workspace_id: workspaceId },
      select: { id: true },
    });
    await tx.audit_logs.create({
      data: {
        workspace_id: workspaceId,
        user_id: userId,
        action: 'PROFILE_UPDATED',
        entity_type: 'users',
        entity_id: userId,
        new_value_json: { default_workspace_id: workspaceId.toString() },
      },
    });
    return getOwnProfile(userId);
  });
}

export async function listActivePets() {
  return prisma.pets.findMany({
    where: { is_active: true },
    orderBy: { sort_order: 'asc' },
    select: { id: true, code: true, name: true, subtitle: true, description: true, image_url: true },
  });
}

export async function updatePet(userId: bigint, petId: bigint | null) {
  return prisma.$transaction(async (tx) => {
    if (petId !== null) {
      const pet = await tx.pets.findFirst({ where: { id: petId, is_active: true } });
      if (!pet) throw new AppError(422, 'Select an active pet.', 'INVALID_PET');
    }
    await tx.users.update({ where: { id: userId }, data: { pet_id: petId }, select: { id: true } });
    await tx.audit_logs.create({
      data: {
        user_id: userId,
        action: 'PROFILE_UPDATED',
        entity_type: 'users',
        entity_id: userId,
        new_value_json: { pet_id: petId?.toString() ?? null },
      },
    });
    return getOwnProfile(userId);
  });
}

export async function listTags(userId: bigint) {
  return prisma.user_tags.findMany({
    where: { user_id: userId },
    orderBy: { sort_order: 'asc' },
    select: { id: true, tag_text: true },
  });
}

export async function addTag(userId: bigint, text: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user_tags.findMany({ where: { user_id: userId } });
    if (existing.length >= MAX_USER_TAGS)
      throw new AppError(422, `You can add at most ${MAX_USER_TAGS} tags.`, 'TAG_LIMIT');
    if (existing.some((tag) => tag.tag_text.toLowerCase() === text.toLowerCase()))
      throw new AppError(409, 'This tag already exists.', 'TAG_DUPLICATE');
    const created = await tx.user_tags.create({
      data: { user_id: userId, tag_text: text, sort_order: existing.length + 1 },
    });
    await tx.audit_logs.create({
      data: {
        user_id: userId,
        action: 'PROFILE_UPDATED',
        entity_type: 'user_tags',
        entity_id: created.id,
        new_value_json: { tag_text: text },
      },
    });
    return listTags(userId);
  });
}

export async function removeTag(userId: bigint, tagId: bigint) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user_tags.findFirst({ where: { id: tagId, user_id: userId } });
    if (!target) throw new AppError(404, 'Tag not found.', 'NOT_FOUND');
    await tx.user_tags.delete({ where: { id: tagId } });
    // Original sort_order values stay contiguous, so re-numbering ascending never collides:
    // each row's new position was either already vacant or vacated by the row before it.
    const remaining = await tx.user_tags.findMany({
      where: { user_id: userId },
      orderBy: { sort_order: 'asc' },
    });
    for (const [index, tag] of remaining.entries())
      if (tag.sort_order !== index + 1)
        await tx.user_tags.update({ where: { id: tag.id }, data: { sort_order: index + 1 } });
    await tx.audit_logs.create({
      data: {
        user_id: userId,
        action: 'PROFILE_UPDATED',
        entity_type: 'user_tags',
        entity_id: tagId,
        old_value_json: { tag_text: target.tag_text },
      },
    });
    return listTags(userId);
  });
}

export async function reorderTags(userId: bigint, orderedIds: bigint[]) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user_tags.findMany({ where: { user_id: userId } });
    const byId = new Map(existing.map((tag) => [tag.id.toString(), tag]));
    if (
      orderedIds.length !== existing.length ||
      !orderedIds.every((id) => byId.has(id.toString()))
    )
      throw new AppError(422, 'The tag list must match your current tags.', 'TAG_MISMATCH');
    // Delete-and-recreate sidesteps the (user_id, sort_order) unique constraint entirely —
    // an arbitrary permutation can't be applied as sequential updates without a collision.
    await tx.user_tags.deleteMany({ where: { user_id: userId } });
    for (const [index, id] of orderedIds.entries()) {
      const tag = byId.get(id.toString())!;
      await tx.user_tags.create({
        data: { user_id: userId, tag_text: tag.tag_text, sort_order: index + 1 },
      });
    }
    await tx.audit_logs.create({
      data: { user_id: userId, action: 'PROFILE_UPDATED', entity_type: 'user_tags', entity_id: userId },
    });
    return listTags(userId);
  });
}

export async function uploadProfileAsset(
  userId: bigint,
  type: ProfileAssetType,
  file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
) {
  const validated = validateUpload(file, env.MAX_UPLOAD_SIZE, true);
  const stored = await assetStorage.save(userId, file.buffer);
  try {
    const previous = await prisma.$transaction(async (tx) => {
      const old = await tx.user_profile_assets.findFirst({
        where: { user_id: userId, asset_type: type },
      });
      const record = await tx.user_profile_assets.upsert({
        where: { user_id_asset_type: { user_id: userId, asset_type: type } },
        create: {
          user_id: userId,
          asset_type: type,
          original_file_name: validated.filename,
          mime_type: validated.mime,
          file_size_bytes: BigInt(stored.size),
          storage_provider: 'LOCAL',
          object_key: stored.key,
        },
        update: {
          original_file_name: validated.filename,
          mime_type: validated.mime,
          file_size_bytes: BigInt(stored.size),
          storage_provider: 'LOCAL',
          object_key: stored.key,
          public_url: null,
        },
      });
      await tx.audit_logs.create({
        data: {
          user_id: userId,
          action: 'PROFILE_UPDATED',
          entity_type: 'user_profile_assets',
          entity_id: record.id,
          new_value_json: { asset_type: type },
        },
      });
      return old;
    });
    if (previous?.object_key && previous.object_key !== stored.key)
      await assetStorage.remove(previous.object_key);
    return { asset_type: type, url: `/api/v1/profile/assets/${userId.toString()}/${type}` };
  } catch (error) {
    await assetStorage.remove(stored.key);
    throw error;
  }
}

export async function getProfileAssetForDownload(
  viewerId: bigint,
  targetUserId: bigint,
  type: ProfileAssetType,
) {
  const target = await prisma.users.findUnique({
    where: { id: targetUserId },
    select: { account_status: true },
  });
  if (!target || (viewerId !== targetUserId && target.account_status !== 'ACTIVE'))
    throw new AppError(404, 'Asset not found.', 'NOT_FOUND');
  const record = await prisma.user_profile_assets.findFirst({
    where: { user_id: targetUserId, asset_type: type },
  });
  if (!record || record.storage_provider !== 'LOCAL' || !record.object_key)
    throw new AppError(404, 'Asset not found.', 'NOT_FOUND');
  return record;
}

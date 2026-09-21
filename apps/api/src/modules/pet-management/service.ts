import type { Prisma } from '@prisma/client';
import { petDisplayName } from '@uni-nexus/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { createImageStorageService, LocalStorageService, validateUpload } from '../../services/storage.js';
import { normalizePetCode } from './validation.js';

export const PET_DEFAULT_BUILTIN_KEY = 'UNI_INU';
export const petStorage = new LocalStorageService(env.LOCAL_STORAGE_PATH || 'storage');
const imageStorage = createImageStorageService();

export const BUILTIN_PET_SEEDS = [
  { builtin_key: 'UNI_INU', label: 'Uni-Inu', object_key: 'pets/Uni-Inu/Idle/Uni-Inu.avif', sort_order: 0 },
  { builtin_key: 'AZZY', label: 'Azzy', object_key: 'pets/Azzy/Idle/Azzy.avif', sort_order: 10 },
  { builtin_key: 'CIPHER', label: 'Cipher', object_key: 'pets/Cipher/Idle/Cipher.avif', sort_order: 20 },
  { builtin_key: 'CRAFTY_CAT', label: 'Crafty Cat', object_key: 'pets/Crafty Cat/Idle/Crafty Cat.avif', sort_order: 30 },
  { builtin_key: 'DESSY', label: 'Dessy', object_key: 'pets/Dessy/Idle/Dessy.avif', sort_order: 40 },
] as const;

export const petSelect = {
  id: true,
  builtin_key: true,
  code: true,
  name: true,
  subtitle: true,
  description: true,
  image_storage_provider: true,
  image_bucket_name: true,
  image_object_key: true,
  image_url: true,
  is_active: true,
  sort_order: true,
  pet_media: {
    where: { is_active: true },
    orderBy: [{ state: 'asc' }, { frame_index: 'asc' }],
    select: {
      id: true, state: true, frame_index: true, duration_ms: true,
      cloudinary_secure_url: true, width_px: true, height_px: true,
    },
  },
} satisfies Prisma.petsSelect;
export type PetRow = Prisma.petsGetPayload<{ select: typeof petSelect }>;

export function petImageUrl(pet: Pick<PetRow, 'id' | 'image_storage_provider' | 'image_object_key' | 'image_url'>): string | null {
  if (pet.image_storage_provider === 'LOCAL' && pet.image_object_key)
    return `/api/v1/pet-management/${pet.id.toString()}/image`;
  return pet.image_url ?? null;
}

export function serializePet(pet: PetRow) {
  const media = (pet.pet_media ?? []).reduce<Record<string, Array<{ id: bigint; frame_index: number; duration_ms: number | null; url: string | null; width: number | null; height: number | null }>>>((states, frame) => {
    const key = frame.state.toUpperCase();
    (states[key] ??= []).push({ id: frame.id, frame_index: frame.frame_index, duration_ms: frame.duration_ms, url: frame.cloudinary_secure_url, width: frame.width_px, height: frame.height_px });
    return states;
  }, {});
  const idleUrl = media.IDLE?.[0]?.url ?? null;
  return {
    id: pet.id,
    builtin_key: pet.builtin_key,
    code: pet.code,
    name: pet.name,
    display_name: petDisplayName(pet),
    subtitle: pet.subtitle,
    description: pet.description,
    image_storage_provider: pet.image_storage_provider,
    image_url: idleUrl ?? petImageUrl(pet),
    media,
    is_active: pet.is_active,
    sort_order: pet.sort_order,
  };
}

export async function assertCto(tx: Prisma.TransactionClient, actorId: bigint): Promise<void> {
  const membership = await tx.workspace_members.findFirst({
    where: {
      user_id: actorId,
      membership_status: 'ACTIVE',
      roles: { code: 'CTO', is_active: true },
      workspaces: { is_active: true },
      users: { is_active: true, account_status: 'ACTIVE' },
    },
    select: { id: true, roles: { select: { code: true } } },
  });
  if (!membership || membership.roles?.code !== 'CTO')
    throw new AppError(403, 'Hanya CTO yang dapat mengelola data Pet.', 'PET_MANAGEMENT_FORBIDDEN');
}

type PetDb = Pick<Prisma.TransactionClient, 'pets'>;

/**
 * Repairs only missing system rows and missing built-in image identity. Existing
 * metadata and uploaded images are deliberately left untouched.
 */
export async function ensureBuiltinPets(db: PetDb = prisma): Promise<void> {
  for (const seed of BUILTIN_PET_SEEDS) {
    let pet = await db.pets.findUnique({ where: { builtin_key: seed.builtin_key }, select: petSelect });
    if (!pet) {
      const legacy = await db.pets.findUnique({ where: { code: seed.builtin_key }, select: petSelect });
      if (legacy) {
        pet = await db.pets.update({
          where: { id: legacy.id },
          data: { builtin_key: seed.builtin_key, code: null, is_active: true, sort_order: seed.sort_order },
          select: petSelect,
        });
      } else {
        pet = await db.pets.create({
          data: {
            builtin_key: seed.builtin_key,
            code: null,
            name: null,
            subtitle: null,
            description: null,
            image_storage_provider: 'BUILTIN',
            image_object_key: seed.object_key,
            is_active: true,
            sort_order: seed.sort_order,
          },
          select: petSelect,
        });
      }
    }
    const repair: Prisma.petsUpdateInput = {};
    if (pet.code === seed.builtin_key) repair.code = null;
    if (!pet.image_storage_provider && !pet.image_object_key && !pet.image_url) {
      repair.image_storage_provider = 'BUILTIN';
      repair.image_object_key = seed.object_key;
    } else if (pet.image_storage_provider === 'BUILTIN' && !pet.image_object_key) {
      repair.image_object_key = seed.object_key;
    }
    if (!pet.is_active) repair.is_active = true;
    if (pet.sort_order !== seed.sort_order) repair.sort_order = seed.sort_order;
    if (Object.keys(repair).length > 0)
      await db.pets.update({ where: { id: pet.id }, data: repair, select: { id: true } });
  }
}

export async function requireDefaultPetId(tx: Prisma.TransactionClient): Promise<bigint> {
  const pet = await tx.pets.findFirst({
    where: { builtin_key: PET_DEFAULT_BUILTIN_KEY, is_active: true },
    select: { id: true },
  });
  if (!pet)
    throw new AppError(500, 'Pet default Uni-Inu belum tersedia. Jalankan migrasi Pet terlebih dahulu.', 'DEFAULT_PET_MISSING');
  return pet.id;
}

export async function listActivePets() {
  const pets = await prisma.pets.findMany({
    where: { is_active: true },
    orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    select: petSelect,
  });
  return pets.map(serializePet);
}

export async function listManagedPets(actorId: bigint) {
  await assertCto(prisma, actorId);
  const pets = await prisma.pets.findMany({
    orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    select: petSelect,
  });
  return pets.map(serializePet);
}

type PetMetadataInput = { code?: string | null; name?: string | null; subtitle?: string | null; description?: string | null };

function cleanText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value?.trim() ?? '';
  return trimmed || null;
}

function auditPetMetadata(data: PetMetadataInput) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

export async function createPet(actorId: bigint, input: Required<Pick<PetMetadataInput, 'code'>> & Omit<PetMetadataInput, 'code'>) {
  return prisma.$transaction(async (tx) => {
    await assertCto(tx, actorId);
    const code = cleanText(input.code);
    const name = cleanText(input.name);
    const subtitle = cleanText(input.subtitle);
    const description = cleanText(input.description);
    if (!code || !name || !subtitle || !description)
      throw new AppError(422, 'Kode, nama, subtitle, dan deskripsi wajib diisi.', 'PET_METADATA_REQUIRED');
    const normalizedCode = normalizePetCode(code);
    if (await tx.pets.findUnique({ where: { code: normalizedCode }, select: { id: true } }))
      throw new AppError(409, 'Kode Pet sudah digunakan.', 'PET_CODE_TAKEN');
    const last = await tx.pets.findFirst({ orderBy: { sort_order: 'desc' }, select: { sort_order: true } });
    const pet = await tx.pets.create({
      data: {
        code: normalizedCode,
        name,
        subtitle,
        description,
        sort_order: (last?.sort_order ?? -10) + 10,
        is_active: true,
      },
      select: petSelect,
    });
    await tx.audit_logs.create({
      data: {
        user_id: actorId,
        action: 'PET_CREATED',
        entity_type: 'pets',
        entity_id: pet.id,
        new_value_json: { pet_code: pet.code, ...auditPetMetadata({ code: normalizedCode, name, subtitle, description }) },
      },
    });
    return serializePet(pet);
  });
}

export async function updatePet(actorId: bigint, petId: bigint, input: PetMetadataInput) {
  return prisma.$transaction(async (tx) => {
    await assertCto(tx, actorId);
    const current = await tx.pets.findUnique({ where: { id: petId }, select: petSelect });
    if (!current) throw new AppError(404, 'Pet tidak ditemukan.', 'PET_NOT_FOUND');
    const data: Prisma.petsUpdateInput = {};
    if (input.code !== undefined) {
      const code = cleanText(input.code);
      if (!current.builtin_key && !code)
        throw new AppError(422, 'Kode, nama, subtitle, dan deskripsi wajib diisi.', 'PET_METADATA_REQUIRED');
      const normalizedCode = code ? normalizePetCode(code) : null;
      if (normalizedCode !== current.code && normalizedCode && await tx.pets.findUnique({ where: { code: normalizedCode }, select: { id: true } }))
        throw new AppError(409, 'Kode Pet sudah digunakan.', 'PET_CODE_TAKEN');
      data.code = normalizedCode;
    }
    if (input.name !== undefined) data.name = cleanText(input.name);
    if (input.subtitle !== undefined) data.subtitle = cleanText(input.subtitle);
    if (input.description !== undefined) data.description = cleanText(input.description);
    if (!current.builtin_key) {
      const next = {
        code: input.code !== undefined ? cleanText(input.code) : current.code,
        name: input.name !== undefined ? cleanText(input.name) : current.name,
        subtitle: input.subtitle !== undefined ? cleanText(input.subtitle) : current.subtitle,
        description: input.description !== undefined ? cleanText(input.description) : current.description,
      };
      if (!next.code || !next.name || !next.subtitle || !next.description)
        throw new AppError(422, 'Kode, nama, subtitle, dan deskripsi wajib diisi.', 'PET_METADATA_REQUIRED');
    }
    const updated = await tx.pets.update({ where: { id: petId }, data, select: petSelect });
    await tx.audit_logs.create({
      data: {
        user_id: actorId,
        action: 'PET_UPDATED',
        entity_type: 'pets',
        entity_id: petId,
        old_value_json: { pet_code: current.code, changed_fields: Object.keys(data) },
        new_value_json: { pet_code: updated.code, changed_fields: Object.keys(data) },
      },
    });
    return serializePet(updated);
  });
}

type UploadedFile = { originalname: string; mimetype: string; buffer: Buffer; size: number };
type PetFrameInput = { state?: string; duration_ms?: number | null; frame_index?: number };

function normalizeState(value: string | undefined): string {
  const state = (value ?? 'IDLE').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{0,39}$/.test(state))
    throw new AppError(422, 'State Pet tidak valid.', 'INVALID_PET_STATE');
  return state;
}

function serializeFrame(frame: { id: bigint; state: string; frame_index: number; duration_ms: number | null; cloudinary_secure_url: string | null; width_px: number | null; height_px: number | null }) {
  return { id: frame.id, state: frame.state, frame_index: frame.frame_index, duration_ms: frame.duration_ms, url: frame.cloudinary_secure_url, width: frame.width_px, height: frame.height_px };
}

/** Uploads one immutable Pet frame. The old legacy pets image columns remain read-only fallback data. */
export async function uploadPetFrame(actorId: bigint, petId: bigint, file: UploadedFile, input: PetFrameInput = {}) {
  const validated = validateUpload(file, env.MAX_UPLOAD_SIZE, true);
  if (validated.extension !== '.avif')
    throw new AppError(422, 'Format foto Pet harus AVIF.', 'INVALID_PET_IMAGE_FORMAT');
  const state = normalizeState(input.state);
  if (input.duration_ms !== undefined && input.duration_ms !== null && (!Number.isInteger(input.duration_ms) || input.duration_ms < 50 || input.duration_ms > 60_000))
    throw new AppError(422, 'Durasi frame harus antara 50 dan 60000 milidetik.', 'INVALID_FRAME_DURATION');
  await assertCto(prisma, actorId);
  const pet = await prisma.pets.findUnique({ where: { id: petId }, select: { id: true } });
  if (!pet) throw new AppError(404, 'Pet tidak ditemukan.', 'PET_NOT_FOUND');
  const last = await prisma.pet_media.findFirst({ where: { pet_id: petId, state, is_active: true }, orderBy: { frame_index: 'desc' }, select: { frame_index: true } });
  const frameIndex = input.frame_index ?? (last?.frame_index ?? 0) + 1;
  if (!Number.isInteger(frameIndex) || frameIndex < 1)
    throw new AppError(422, 'Urutan frame harus dimulai dari 1.', 'INVALID_FRAME_INDEX');
  const stored = await imageStorage.upload({ bytes: file.buffer, assetFolder: `pets/pet-${petId.toString()}/states/${state.toLowerCase()}` });
  try {
    const frame = await prisma.$transaction(async (tx) => {
      await assertCto(tx, actorId);
      const created = await tx.pet_media.create({ data: {
        pet_id: petId, state, frame_index: frameIndex, duration_ms: input.duration_ms ?? null,
        original_file_name: validated.filename, mime_type: validated.mime, file_size_bytes: BigInt(stored.size),
        storage_provider: stored.provider, cloudinary_asset_id: stored.assetId, cloudinary_public_id: stored.provider === 'CLOUDINARY' ? stored.key : null,
        cloudinary_asset_folder: stored.assetFolder, cloudinary_secure_url: stored.publicUrl,
        cloudinary_resource_type: stored.resourceType, cloudinary_format: stored.format, cloudinary_version: stored.version,
        width_px: stored.width, height_px: stored.height, uploaded_by_user_id: actorId,
      }, select: { id: true, state: true, frame_index: true, duration_ms: true, cloudinary_secure_url: true, width_px: true, height_px: true } });
      await tx.audit_logs.create({ data: {
        user_id: actorId, action: 'PET_MEDIA_UPLOADED', entity_type: 'pet_media', entity_id: created.id,
        new_value_json: { pet_id: petId.toString(), state, frame_index: frameIndex },
      }});
      return created;
    });
    return serializeFrame(frame);
  } catch (error) {
    await imageStorage.remove(stored.key).catch(() => undefined);
    throw error;
  }
}

/** Compatibility endpoint: now creates an IDLE frame instead of mutating pets.image_*. */
export const uploadPetImage = (actorId: bigint, petId: bigint, file: UploadedFile) => uploadPetFrame(actorId, petId, file, { state: 'IDLE' });

export async function replacePetFrame(actorId: bigint, petId: bigint, frameId: bigint, file: UploadedFile, durationMs?: number | null) {
  const validated = validateUpload(file, env.MAX_UPLOAD_SIZE, true);
  if (validated.extension !== '.avif') throw new AppError(422, 'Format foto Pet harus AVIF.', 'INVALID_PET_IMAGE_FORMAT');
  await assertCto(prisma, actorId);
  const old = await prisma.pet_media.findFirst({ where: { id: frameId, pet_id: petId, is_active: true } });
  if (!old) throw new AppError(404, 'Frame Pet tidak ditemukan.', 'PET_FRAME_NOT_FOUND');
  const stored = await imageStorage.upload({ bytes: file.buffer, assetFolder: `pets/pet-${petId.toString()}/states/${old.state.toLowerCase()}` });
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await assertCto(tx, actorId);
      const value = await tx.pet_media.update({ where: { id: frameId }, data: {
        original_file_name: validated.filename, mime_type: validated.mime, file_size_bytes: BigInt(stored.size), storage_provider: stored.provider,
        cloudinary_asset_id: stored.assetId, cloudinary_public_id: stored.provider === 'CLOUDINARY' ? stored.key : null,
        cloudinary_asset_folder: stored.assetFolder, cloudinary_secure_url: stored.publicUrl, cloudinary_resource_type: stored.resourceType,
        cloudinary_format: stored.format, cloudinary_version: stored.version, width_px: stored.width, height_px: stored.height,
        duration_ms: durationMs === undefined ? old.duration_ms : durationMs,
      }, select: { id: true, state: true, frame_index: true, duration_ms: true, cloudinary_secure_url: true, width_px: true, height_px: true } });
      await tx.audit_logs.create({ data: { user_id: actorId, action: 'PET_MEDIA_UPDATED', entity_type: 'pet_media', entity_id: frameId, new_value_json: { pet_id: petId.toString() } } });
      return value;
    });
    if (old.storage_provider === 'CLOUDINARY' && old.cloudinary_public_id) await imageStorage.remove(old.cloudinary_public_id).catch(() => undefined);
    return serializeFrame(updated);
  } catch (error) { await imageStorage.remove(stored.key).catch(() => undefined); throw error; }
}

export async function deletePetFrame(actorId: bigint, petId: bigint, frameId: bigint) {
  const previous = await prisma.$transaction(async (tx) => {
    await assertCto(tx, actorId);
    const frame = await tx.pet_media.findFirst({ where: { id: frameId, pet_id: petId, is_active: true } });
    if (!frame) throw new AppError(404, 'Frame Pet tidak ditemukan.', 'PET_FRAME_NOT_FOUND');
    await tx.pet_media.delete({ where: { id: frameId } });
    await tx.audit_logs.create({ data: { user_id: actorId, action: 'PET_MEDIA_REMOVED', entity_type: 'pet_media', entity_id: frameId, old_value_json: { pet_id: petId.toString() } } });
    return frame;
  });
  if (previous.storage_provider === 'CLOUDINARY' && previous.cloudinary_public_id) await imageStorage.remove(previous.cloudinary_public_id).catch(() => undefined);
}

export async function reorderPetFrames(actorId: bigint, petId: bigint, stateValue: string, frameIds: bigint[]) {
  const state = normalizeState(stateValue);
  await prisma.$transaction(async (tx) => {
    await assertCto(tx, actorId);
    const frames = await tx.pet_media.findMany({ where: { pet_id: petId, state, is_active: true }, orderBy: { frame_index: 'asc' } });
    if (frames.length !== frameIds.length || new Set(frameIds.map(String)).size !== frameIds.length || new Set(frames.map((frame) => frame.id.toString())).size !== new Set(frameIds.map(String)).size || !frameIds.every((id) => frames.some((frame) => frame.id === id)))
      throw new AppError(422, 'Urutan frame harus memuat semua frame tepat satu kali.', 'INVALID_FRAME_ORDER');
    for (const frame of frames) await tx.pet_media.update({ where: { id: frame.id }, data: { frame_index: 1_000_000 + frame.frame_index } });
    for (const [index, id] of frameIds.entries()) await tx.pet_media.update({ where: { id }, data: { frame_index: index + 1 } });
    await tx.audit_logs.create({ data: { user_id: actorId, action: 'PET_MEDIA_REORDERED', entity_type: 'pets', entity_id: petId, new_value_json: { state, frame_ids: frameIds.map(String) } } });
  });
}

export async function getPetImageForDownload(petId: bigint) {
  const pet = await prisma.pets.findFirst({ where: { id: petId, is_active: true }, select: petSelect });
  if (!pet || pet.image_storage_provider !== 'LOCAL' || !pet.image_object_key)
    throw new AppError(404, 'Foto Pet tidak ditemukan.', 'PET_IMAGE_NOT_FOUND');
  return { key: pet.image_object_key };
}

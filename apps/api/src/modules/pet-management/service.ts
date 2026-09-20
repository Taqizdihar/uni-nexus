import type { Prisma } from '@prisma/client';
import { petDisplayName } from '@uni-nexus/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { LocalStorageService, validateUpload } from '../../services/storage.js';
import { normalizePetCode } from './validation.js';

export const PET_DEFAULT_CODE = 'UNI_INU';
export const petStorage = new LocalStorageService(env.LOCAL_STORAGE_PATH || 'storage');

export const petSelect = {
  id: true,
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
} satisfies Prisma.petsSelect;
export type PetRow = Prisma.petsGetPayload<{ select: typeof petSelect }>;

export function petImageUrl(pet: Pick<PetRow, 'id' | 'image_storage_provider' | 'image_object_key' | 'image_url'>): string | null {
  if (pet.image_storage_provider === 'LOCAL' && pet.image_object_key)
    return `/api/v1/pet-management/${pet.id.toString()}/image`;
  return pet.image_url ?? null;
}

export function serializePet(pet: PetRow) {
  return {
    id: pet.id,
    code: pet.code,
    name: pet.name,
    display_name: petDisplayName(pet),
    subtitle: pet.subtitle,
    description: pet.description,
    image_storage_provider: pet.image_storage_provider,
    image_url: petImageUrl(pet),
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

export async function requireDefaultPetId(tx: Prisma.TransactionClient): Promise<bigint> {
  const pet = await tx.pets.findFirst({
    where: { code: PET_DEFAULT_CODE, is_active: true },
    select: { id: true },
  });
  if (!pet)
    throw new AppError(500, 'Pet default UNI_INU belum tersedia. Jalankan migrasi Pet terlebih dahulu.', 'DEFAULT_PET_MISSING');
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

type PetMetadataInput = { code?: string; name?: string | null; subtitle?: string | null; description?: string | null };

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
    const code = normalizePetCode(input.code);
    if (code === PET_DEFAULT_CODE)
      throw new AppError(409, 'Kode UNI_INU dicadangkan untuk Pet default.', 'PET_CODE_RESERVED');
    if (await tx.pets.findUnique({ where: { code }, select: { id: true } }))
      throw new AppError(409, 'Kode Pet sudah digunakan.', 'PET_CODE_TAKEN');
    const last = await tx.pets.findFirst({ orderBy: { sort_order: 'desc' }, select: { sort_order: true } });
    const pet = await tx.pets.create({
      data: {
        code,
        name: cleanText(input.name) ?? null,
        subtitle: cleanText(input.subtitle) ?? null,
        description: cleanText(input.description) ?? null,
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
        new_value_json: { pet_code: pet.code, ...auditPetMetadata(input) },
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
      const code = normalizePetCode(input.code);
      if (current.code === PET_DEFAULT_CODE && code !== PET_DEFAULT_CODE)
        throw new AppError(422, 'Kode UNI_INU tidak dapat diubah.', 'PET_DEFAULT_CODE_LOCKED');
      if (code === PET_DEFAULT_CODE && current.code !== PET_DEFAULT_CODE)
        throw new AppError(409, 'Kode UNI_INU dicadangkan untuk Pet default.', 'PET_CODE_RESERVED');
      if (code !== current.code && await tx.pets.findUnique({ where: { code }, select: { id: true } }))
        throw new AppError(409, 'Kode Pet sudah digunakan.', 'PET_CODE_TAKEN');
      data.code = code;
    }
    if (input.name !== undefined) data.name = cleanText(input.name);
    if (input.subtitle !== undefined) data.subtitle = cleanText(input.subtitle);
    if (input.description !== undefined) data.description = cleanText(input.description);
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

export async function uploadPetImage(actorId: bigint, petId: bigint, file: { originalname: string; mimetype: string; buffer: Buffer; size: number }) {
  const validated = validateUpload(file, env.MAX_UPLOAD_SIZE, true);
  if (validated.extension !== '.avif')
    throw new AppError(422, 'Format foto Pet harus AVIF.', 'INVALID_PET_IMAGE_FORMAT');
  const stored = await petStorage.save(actorId, file.buffer);
  try {
    const result = await prisma.$transaction(async (tx): Promise<{ previous: PetRow; updated: PetRow }> => {
      await assertCto(tx, actorId);
      const current = await tx.pets.findUnique({ where: { id: petId }, select: petSelect });
      if (!current) throw new AppError(404, 'Pet tidak ditemukan.', 'PET_NOT_FOUND');
      const updated = await tx.pets.update({
        where: { id: petId },
        data: { image_storage_provider: 'LOCAL', image_bucket_name: null, image_object_key: stored.key, image_url: null },
        select: petSelect,
      });
      await tx.audit_logs.create({
        data: { user_id: actorId, action: 'PET_IMAGE_UPDATED', entity_type: 'pets', entity_id: petId, new_value_json: { pet_code: current.code, image_updated: true } },
      });
      return { previous: current, updated };
    });
    if (result.previous.image_storage_provider === 'LOCAL' && result.previous.image_object_key && result.previous.image_object_key !== stored.key)
      await petStorage.remove(result.previous.image_object_key);
    return serializePet(result.updated);
  } catch (error) {
    await petStorage.remove(stored.key);
    throw error;
  }
}

export async function getPetImageForDownload(petId: bigint) {
  const pet = await prisma.pets.findFirst({ where: { id: petId, is_active: true }, select: petSelect });
  if (!pet || pet.image_storage_provider !== 'LOCAL' || !pet.image_object_key)
    throw new AppError(404, 'Foto Pet tidak ditemukan.', 'PET_IMAGE_NOT_FOUND');
  return { key: pet.image_object_key };
}

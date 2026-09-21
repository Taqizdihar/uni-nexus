import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/prisma.js';
import { createImageStorageService } from '../services/storage.js';

const apiRoot = fileURLToPath(new URL('../../', import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const builtins = [
  ['UNI_INU', 'Uni-Inu', 'Uni-Inu'], ['AZZY', 'Azzy', 'Azzy'], ['CIPHER', 'Cipher', 'Cipher'],
  ['CRAFTY_CAT', 'Crafty Cat', 'Crafty Cat'], ['DESSY', 'Dessy', 'Dessy'],
] as const;

async function run() {
  const storage = createImageStorageService();
  for (const [builtinKey, directory, filename] of builtins) {
    const pet = await prisma.pets.findUnique({ where: { builtin_key: builtinKey }, select: { id: true } });
    if (!pet) { console.info(`Lewati ${builtinKey}: Pet tidak ditemukan.`); continue; }
    const existing = await prisma.pet_media.findUnique({ where: { pet_id_state_frame_index: { pet_id: pet.id, state: 'IDLE', frame_index: 1 } }, select: { id: true } });
    if (existing) { console.info(`Lewati ${builtinKey}: frame IDLE 1 sudah ada.`); continue; }
    const source = path.resolve(apiRoot, `../../admin/src/assets/pets/${directory}/Idle/${filename}.avif`);
    if (dryRun) { console.info(`[dry-run] Akan unggah ${builtinKey} dari ${source}.`); continue; }
    const bytes = await readFile(source);
    const stored = await storage.upload({ bytes, assetFolder: `pets/pet-${pet.id.toString()}/states/idle` });
    if (stored.provider !== 'CLOUDINARY' || !stored.key || !stored.publicUrl || !stored.resourceType) {
      await storage.remove(stored.key).catch(() => undefined);
      throw new Error('Cloudinary wajib dikonfigurasi sebelum migrasi media Pet dijalankan.');
    }
    try {
      await prisma.pet_media.create({ data: {
        pet_id: pet.id, state: 'IDLE', frame_index: 1, original_file_name: `${filename}.avif`, mime_type: 'image/avif', file_size_bytes: BigInt(stored.size),
        storage_provider: 'CLOUDINARY', cloudinary_asset_id: stored.assetId, cloudinary_public_id: stored.key,
        cloudinary_asset_folder: stored.assetFolder, cloudinary_secure_url: stored.publicUrl, cloudinary_resource_type: stored.resourceType,
        cloudinary_format: stored.format, cloudinary_version: stored.version === null ? null : BigInt(stored.version), width_px: stored.width, height_px: stored.height,
      } });
      console.info(`Berhasil memigrasikan ${builtinKey}.`);
    } catch (error) {
      await storage.remove(stored.key).catch(() => undefined);
      throw error;
    }
  }
}

void run().finally(() => prisma.$disconnect());

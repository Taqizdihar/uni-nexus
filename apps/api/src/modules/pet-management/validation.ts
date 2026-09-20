import { z } from 'zod';

const petCodePattern = /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/;

export function normalizePetCode(value: string): string {
  return value.trim().replace(/[\s-]+/g, '_').replace(/[^A-Za-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

const nullableText = (max: number) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().max(max).nullable().optional(),
);

const requiredText = (max: number, label: string) => z.string().trim().min(1, `${label} wajib diisi.`).max(max);
const code = requiredText(60, 'Kode Pet').regex(petCodePattern, 'Gunakan huruf, angka, spasi, garis bawah, atau tanda hubung.').transform(normalizePetCode);
const optionalCode = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().max(60).regex(petCodePattern, 'Gunakan huruf, angka, spasi, garis bawah, atau tanda hubung.').transform(normalizePetCode).nullable().optional(),
);

export const createPetSchema = z.object({
  code,
  name: requiredText(120, 'Nama Pet'),
  subtitle: requiredText(190, 'Subtitle Pet'),
  description: requiredText(10000, 'Deskripsi Pet'),
}).strict();

export const updatePetSchema = z.object({
  code: optionalCode,
  name: nullableText(120),
  subtitle: nullableText(190),
  description: nullableText(10000),
}).strict().refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan yang disimpan.');

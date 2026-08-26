import { z } from 'zod';

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional().transform(value => value?.trim() || null);
const nullableDate = z.string().date().nullable().optional();
const optionalPhone = z.string().trim().min(3).max(50).nullable().optional().transform(value => value?.trim() || null);

export const customerCreateSchema = z.object({
  party_kind: z.enum(['individual', 'company', 'institution']),
  display_name: z.string().trim().min(1, 'Nama pelanggan wajib diisi.').max(200),
  legal_name: nullableText(250),
  email: z.string().trim().email('Format email tidak valid.').max(190).nullable().optional().or(z.literal('')).transform(value => value || null),
  phone: optionalPhone,
  website: z.string().trim().url('Format website tidak valid.').max(255).nullable().optional().or(z.literal('')).transform(value => value || null),
  tax_id: nullableText(100),
  address_line1: nullableText(255),
  address_line2: nullableText(255),
  city: nullableText(100),
  province: nullableText(100),
  postal_code: nullableText(20),
  country_code: z.string().trim().length(2, 'Kode negara harus terdiri dari 2 karakter.').nullable().optional().transform(value => value ? value.toUpperCase() : 'ID'),
  notes: nullableText(10_000),
  status_code: z.enum(['active', 'inactive']).optional().default('active'),
  confirm_duplicate: z.boolean().optional().default(false),
});

export const customerUpdateSchema = customerCreateSchema.omit({ party_kind: true, confirm_duplicate: true }).extend({
  party_kind: z.enum(['individual', 'company', 'institution', 'internal']).optional(),
}).partial().refine(value => Object.keys(value).length > 0, 'Minimal satu data pelanggan harus diubah.');

export const contactSchema = z.object({
  full_name: z.string().trim().min(1, 'Nama kontak wajib diisi.').max(150),
  job_title: nullableText(120),
  email: z.string().trim().email('Format email tidak valid.').max(190).nullable().optional().or(z.literal('')).transform(value => value || null),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  is_primary: z.boolean().optional().default(false),
  notes: nullableText(500),
});

export const contactUpdateSchema = contactSchema.partial().refine(value => Object.keys(value).length > 0, 'Minimal satu data kontak harus diubah.');

export const partnerSchema = z.object({
  valid_from: nullableDate,
  valid_until: nullableDate,
}).refine(value => !value.valid_from || !value.valid_until || value.valid_from <= value.valid_until, {
  message: 'Tanggal akhir kemitraan tidak boleh sebelum tanggal mulai.',
});

const partnerPriceRuleFields = z.object({
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive().nullable().optional(),
  minimum_qty: z.number().finite().positive().max(9_999_999),
  special_price: z.number().finite().nonnegative().nullable().optional(),
  discount_percent: z.number().finite().min(0).max(100).nullable().optional(),
  valid_from: nullableDate,
  valid_until: nullableDate,
  is_active: z.boolean().optional().default(true),
});

export const partnerPriceRuleSchema = partnerPriceRuleFields.refine(value => value.special_price !== null && value.special_price !== undefined || value.discount_percent !== null && value.discount_percent !== undefined, {
  message: 'Isi harga khusus atau persentase diskon.',
}).refine(value => !value.valid_from || !value.valid_until || value.valid_from <= value.valid_until, {
  message: 'Tanggal akhir tidak boleh sebelum tanggal mulai.',
});

export const partnerPriceRuleUpdateSchema = partnerPriceRuleFields.omit({ product_id: true }).partial().refine(value => Object.keys(value).length > 0, 'Minimal satu data harga mitra harus diubah.');

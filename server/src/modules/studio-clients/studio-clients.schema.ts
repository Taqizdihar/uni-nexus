import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const emailField = z.string().trim().email('Format email tidak valid.').max(190).nullable().optional().or(z.literal(''));

/** Only http(s) is accepted for websites — never javascript:, data:, or file:. */
const websiteField = z.string().trim().max(255).nullable().optional().or(z.literal(''))
  .refine(value => {
    if (!value) return true;
    try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
  }, { message: 'Website harus berupa URL http:// atau https:// yang valid.' });

const partyKind = z.enum(['individual', 'company', 'institution']);

export const clientContactInputSchema = z.object({
  full_name: z.string().trim().min(1, 'Nama kontak wajib diisi.').max(150),
  job_title: optionalText(120),
  email: emailField,
  phone: optionalText(50),
  whatsapp: optionalText(50),
  is_primary: z.boolean().optional(),
  notes: optionalText(500),
});

export const createClientSchema = z.object({
  display_name: z.string().trim().min(1, 'Nama klien wajib diisi.').max(200),
  party_kind: partyKind.default('individual'),
  legal_name: optionalText(250),
  email: emailField,
  phone: optionalText(50),
  website: websiteField,
  tax_id: optionalText(100),
  address_line1: optionalText(255),
  address_line2: optionalText(255),
  city: optionalText(100),
  province: optionalText(100),
  postal_code: optionalText(20),
  country_code: z.string().trim().length(2).optional(),
  notes: optionalText(2000),
  contacts: z.array(clientContactInputSchema).max(20).default([]),
  /** When set, an existing Party is reused and only granted the studio_client role. */
  use_existing_party_id: z.number().int().positive().nullable().optional(),
});

/** No `.default()` anywhere — a partial patch must never resubmit an unrelated field's default. */
export const updateClientSchema = z.object({
  party_kind: partyKind.optional(),
  display_name: z.string().trim().min(1, 'Nama klien wajib diisi.').max(200).optional(),
  legal_name: optionalText(250),
  email: emailField,
  phone: optionalText(50),
  website: websiteField,
  tax_id: optionalText(100),
  address_line1: optionalText(255),
  address_line2: optionalText(255),
  city: optionalText(100),
  province: optionalText(100),
  postal_code: optionalText(20),
  country_code: z.string().trim().length(2).optional(),
  notes: optionalText(2000),
}).refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan yang dikirim.' });

export const clientDuplicateSchema = z.object({
  display_name: optionalText(200),
  legal_name: optionalText(250),
  email: emailField,
  phone: optionalText(50),
  tax_id: optionalText(100),
});

export const deactivateClientSchema = z.object({
  reason: optionalText(500),
  confirm_active_projects: z.boolean().default(false),
});

export const clientContactUpdateSchema = z.object({
  full_name: z.string().trim().min(1, 'Nama kontak wajib diisi.').max(150).optional(),
  job_title: optionalText(120),
  email: emailField,
  phone: optionalText(50),
  whatsapp: optionalText(50),
  is_primary: z.boolean().optional(),
  notes: optionalText(500),
}).refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan kontak yang dikirim.' });

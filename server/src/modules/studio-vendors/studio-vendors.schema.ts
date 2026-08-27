import { z } from 'zod';
import { STUDIO_EXTERNAL_ROLES } from '../../shared/party/studio-external-party.service';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const email = z.string().trim().email('Format email tidak valid.').max(190).nullable().optional().or(z.literal(''));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal(''));
const website = z.string().trim().max(255).nullable().optional().or(z.literal('')).refine(value => {
  if (!value) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, { message: 'Website harus berupa URL http:// atau https:// yang valid.' });

export const managedRoleSchema = z.enum(STUDIO_EXTERNAL_ROLES);
export const contactInputSchema = z.object({
  full_name: z.string().trim().min(1, 'Nama kontak wajib diisi.').max(150),
  job_title: optionalText(120), email, phone: optionalText(50), whatsapp: optionalText(50),
  is_primary: z.boolean().optional(), notes: optionalText(500),
});
export const contactUpdateSchema = contactInputSchema.partial().refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan kontak yang dikirim.' });

const identity = {
  party_kind: z.enum(['individual', 'company', 'institution']).optional(),
  display_name: z.string().trim().min(1, 'Nama pihak wajib diisi.').max(200),
  legal_name: optionalText(250), email, phone: optionalText(50), website, tax_id: optionalText(100),
  address_line1: optionalText(255), address_line2: optionalText(255), city: optionalText(100),
  province: optionalText(100), postal_code: optionalText(20), country_code: z.string().trim().length(2).optional(), notes: optionalText(2000),
};

export const createExternalPartySchema = z.object({
  ...identity,
  party_kind: z.enum(['individual', 'company', 'institution']).default('individual'),
  roles: z.array(managedRoleSchema).min(1, 'Pilih minimal satu peran.').max(3),
  contacts: z.array(contactInputSchema).max(20).default([]),
  use_existing_party_id: z.number().int().positive().nullable().optional(),
  confirm_duplicate: z.boolean().default(false),
});
export const updateExternalPartySchema = z.object({
  ...identity,
  display_name: z.string().trim().min(1, 'Nama pihak wajib diisi.').max(200).optional(),
}).refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan yang dikirim.' });
export const duplicateSchema = z.object({
  display_name: optionalText(200), legal_name: optionalText(250), email, phone: optionalText(50), tax_id: optionalText(100),
});
export const deactivateRoleSchema = z.object({ reason: optionalText(500), confirm_active_assignments: z.boolean().default(false) });
export const assignmentSchema = z.object({
  project_id: z.number().int().positive(),
  assignment_role: z.enum(['vendor', 'freelancer', 'partner', 'talent', 'other']),
  scope_description: optionalText(2000), agreed_fee: z.number().min(0).max(999999999999).default(0),
  start_date: date, end_date: date, notes: optionalText(500),
});
export const assignmentUpdateSchema = assignmentSchema.omit({ project_id: true }).partial().refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan penugasan yang dikirim.' });
export const assignmentEndSchema = z.object({ end_date: date });

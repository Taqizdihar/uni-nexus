import { z } from 'zod';
import { DELIVERABLE_STATUSES, EXTERNAL_ROLES, PROJECT_PRIORITIES, PROJECT_STATUSES } from './studio-projects.types';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const dateString = z.string().trim().min(1).nullable().optional();

/** Quantity is decimal because Studio bills hours, days, sessions and units. */
const quantity = z.number().positive('Jumlah harus lebih besar dari 0.').max(99999999);
const unitPrice = z.number().min(0, 'Harga satuan tidak boleh negatif.').max(999999999999);

export const projectServiceInputSchema = z.object({
  service_id: z.number().int().positive().nullable().optional(),
  package_id: z.number().int().positive().nullable().optional(),
  description: z.string().trim().min(1, 'Deskripsi layanan wajib diisi.').max(255),
  quantity: quantity.default(1),
  unit_price: unitPrice.default(0),
});

export const projectMemberInputSchema = z.object({
  user_id: z.number().int().positive(),
  role_label: optionalText(100),
  allocation_percent: z.number().min(0).max(100).nullable().optional(),
});

export const projectMilestoneInputSchema = z.object({
  title: z.string().trim().min(1, 'Judul tahapan wajib diisi.').max(180),
  description: optionalText(2000),
  due_at: dateString,
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export const projectDeliverableInputSchema = z.object({
  milestone_id: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1, 'Judul deliverable wajib diisi.').max(180),
  description: optionalText(2000),
  due_at: dateString,
  external_url: optionalText(500),
});

export const createProjectSchema = z.object({
  client_party_id: z.number().int().positive({ message: 'Klien wajib dipilih.' }),
  project_name: z.string().trim().min(1, 'Nama proyek wajib diisi.').max(220),
  project_type: optionalText(100),
  priority_code: z.enum(PROJECT_PRIORITIES as [string, ...string[]]).default('normal'),
  start_date: dateString,
  deadline_at: dateString,
  currency_code: z.string().trim().length(3).default('IDR'),
  contract_value: z.number().min(0).max(999999999999).nullable().optional(),
  estimated_cost: z.number().min(0).max(999999999999).nullable().optional(),
  brief: optionalText(5000),
  notes: optionalText(5000),
  project_manager_user_id: z.number().int().positive().nullable().optional(),
  services: z.array(projectServiceInputSchema).max(100).default([]),
  members: z.array(projectMemberInputSchema).max(50).default([]),
  milestones: z.array(projectMilestoneInputSchema).max(50).default([]),
  deliverables: z.array(projectDeliverableInputSchema.omit({ milestone_id: true })).max(50).default([]),
});

/** Financial results (actual_cost, paid_amount, payment_status_code) are deliberately absent. */
export const updateProjectSchema = z.object({
  project_name: z.string().trim().min(1).max(220).optional(),
  project_type: optionalText(100),
  priority_code: z.enum(PROJECT_PRIORITIES as [string, ...string[]]).optional(),
  start_date: dateString,
  deadline_at: dateString,
  currency_code: z.string().trim().length(3).optional(),
  contract_value: z.number().min(0).max(999999999999).optional(),
  estimated_cost: z.number().min(0).max(999999999999).optional(),
  brief: optionalText(5000),
  notes: optionalText(5000),
  project_manager_user_id: z.number().int().positive().nullable().optional(),
  client_party_id: z.number().int().positive().optional(),
});

export const projectStatusSchema = z.object({
  status: z.enum(PROJECT_STATUSES as [string, ...string[]]),
  reason: optionalText(500),
});

export const projectCancelSchema = z.object({
  reason: z.string().trim().min(3, 'Alasan pembatalan wajib diisi.').max(500),
});

/**
 * Declared without `.default()` on purpose: `.partial()` keeps defaults, so a
 * patch that only touches `quantity` would silently reset `unit_price` to 0.
 */
export const projectServiceUpdateSchema = z.object({
  service_id: z.number().int().positive().nullable().optional(),
  package_id: z.number().int().positive().nullable().optional(),
  description: z.string().trim().min(1, 'Deskripsi layanan wajib diisi.').max(255).optional(),
  quantity: quantity.optional(),
  unit_price: unitPrice.optional(),
}).refine(
  value => Object.keys(value).length > 0,
  { message: 'Tidak ada perubahan layanan yang dikirim.' },
);

export const projectMemberUpdateSchema = z.object({
  role_label: optionalText(100),
  allocation_percent: z.number().min(0).max(100).nullable().optional(),
});

export const projectMilestoneUpdateSchema = projectMilestoneInputSchema.partial();

export const milestoneStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  reason: optionalText(500),
});

export const milestoneReorderSchema = z.object({
  milestone_ids: z.array(z.number().int().positive()).min(1, 'Urutan tahapan tidak boleh kosong.').max(200),
});

export const projectDeliverableUpdateSchema = projectDeliverableInputSchema.partial();

export const deliverableStatusSchema = z.object({
  status: z.enum(DELIVERABLE_STATUSES as [string, ...string[]]),
  reason: optionalText(500),
});

export const externalAssignmentSchema = z.object({
  party_id: z.number().int().positive({ message: 'Pihak eksternal wajib dipilih.' }),
  assignment_role: z.enum(EXTERNAL_ROLES as [string, ...string[]]),
  scope_description: optionalText(2000),
  agreed_fee: z.number().min(0).max(999999999999).default(0),
  start_date: dateString,
  end_date: dateString,
  notes: optionalText(500),
});

/** Same reason as the service update schema: no `.default()` that a patch could re-apply. */
export const externalAssignmentUpdateSchema = z.object({
  assignment_role: z.enum(EXTERNAL_ROLES as [string, ...string[]]).optional(),
  scope_description: optionalText(2000),
  agreed_fee: z.number().min(0).max(999999999999).optional(),
  start_date: dateString,
  end_date: dateString,
  notes: optionalText(500),
});

export const externalAssignmentEndSchema = z.object({
  end_date: dateString,
});

export const quickClientSchema = z.object({
  display_name: z.string().trim().min(1, 'Nama klien wajib diisi.').max(200),
  party_kind: z.enum(['individual', 'company', 'institution']).default('individual'),
  legal_name: optionalText(250),
  email: z.string().trim().email('Format email tidak valid.').max(190).nullable().optional().or(z.literal('')),
  phone: optionalText(50),
  tax_id: optionalText(100),
  city: optionalText(100),
  notes: optionalText(500),
  /** When set, the existing party is reused and simply gains the studio_client role. */
  use_existing_party_id: z.number().int().positive().nullable().optional(),
});

export const clientDuplicateSchema = quickClientSchema.pick({ display_name: true, legal_name: true, email: true, phone: true, tax_id: true }).partial();

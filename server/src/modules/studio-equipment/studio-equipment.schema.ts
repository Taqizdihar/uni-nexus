import { z } from 'zod';
import { ASSET_STATUSES } from './studio-equipment.types';

const text = (max: number) => z.string().trim().max(max).nullable().optional();
const date = z.string().trim().date('Tanggal tidak valid.').nullable().optional();
const dateTime = z.string().trim().min(1).refine(value => !Number.isNaN(Date.parse(value)), 'Tanggal/waktu tidak valid.').nullable().optional();
const money = z.number().finite().min(0).max(999999999999).nullable().optional();
const id = z.number().int().positive();

const assetFields = z.object({
  name: z.string().trim().min(1, 'Nama aset wajib diisi.').max(180),
  category: z.string().trim().min(1, 'Kategori aset wajib diisi.').max(100),
  brand: text(100), model: text(120), serial_number: text(150),
  initial_status: z.enum(['available', 'maintenance', 'borrowed']).default('available'),
  purchase_date: date, purchase_cost: money, current_book_value: money,
  depreciation_method: text(30), useful_life_months: z.number().int().positive().max(1200).nullable().optional(),
  location_name: text(150), assigned_user_id: id.nullable().optional(), notes: text(10000),
});

export const createAssetSchema = assetFields.superRefine((value, ctx) => {
  if (value.initial_status === 'borrowed' && !value.notes?.trim()) ctx.addIssue({ code: 'custom', path: ['notes'], message: 'Catatan/alasan wajib diisi untuk aset yang dipinjamkan.' });
});

export const updateAssetSchema = assetFields.omit({ initial_status: true }).partial().refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan aset yang dikirim.' });

export const assetStatusSchema = z.object({
  status: z.enum(ASSET_STATUSES as [string, ...string[]]),
  reason: z.string().trim().max(500).nullable().optional(),
  notes: text(10000),
});

export const assignmentSchema = z.object({
  project_id: id,
  assigned_from: z.string().trim().min(1).refine(value => !Number.isNaN(Date.parse(value)), 'Waktu mulai tidak valid.'),
  assigned_until: dateTime,
  notes: text(500),
}).superRefine((value, ctx) => {
  if (value.assigned_until && new Date(value.assigned_until).getTime() <= new Date(value.assigned_from).getTime()) {
    ctx.addIssue({ code: 'custom', path: ['assigned_until'], message: 'Waktu selesai harus setelah waktu mulai.' });
  }
});

export const returnAssignmentSchema = z.object({
  returned_at: dateTime,
});

const maintenanceFields = z.object({
  maintenance_type: z.string().trim().min(1, 'Jenis perawatan wajib diisi.').max(100),
  performed_at: z.string().trim().min(1).refine(value => !Number.isNaN(Date.parse(value)), 'Waktu perawatan tidak valid.'),
  performed_by_party_id: id.nullable().optional(),
  cost: z.number().finite().min(0).max(999999999999).default(0),
  next_due_at: dateTime,
  notes: text(10000),
});

export const maintenanceSchema = maintenanceFields.superRefine((value, ctx) => {
  const performed = new Date(value.performed_at).getTime();
  if (performed > Date.now() + 60_000) ctx.addIssue({ code: 'custom', path: ['performed_at'], message: 'Waktu perawatan tidak boleh di masa depan.' });
  if (value.next_due_at && new Date(value.next_due_at).getTime() <= performed) ctx.addIssue({ code: 'custom', path: ['next_due_at'], message: 'Jadwal berikutnya harus setelah waktu perawatan.' });
});

export const maintenanceUpdateSchema = maintenanceFields.partial().refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan perawatan yang dikirim.' });
export const maintenanceCompleteSchema = maintenanceFields.extend({ outcome_status: z.enum(['available', 'retired', 'lost']).optional() }).superRefine((value, ctx) => {
  const performed = new Date(value.performed_at).getTime();
  if (performed > Date.now() + 60_000) ctx.addIssue({ code: 'custom', path: ['performed_at'], message: 'Waktu perawatan tidak boleh di masa depan.' });
  if (value.next_due_at && new Date(value.next_due_at).getTime() <= performed) ctx.addIssue({ code: 'custom', path: ['next_due_at'], message: 'Jadwal berikutnya harus setelah waktu perawatan.' });
});

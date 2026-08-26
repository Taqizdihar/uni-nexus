import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max).nullable().optional();
const positiveId = z.number().int().positive().nullable().optional();
const positive = z.number().finite().positive().nullable().optional();
const date = z.string().date().nullable().optional();
const dateTime = z.string().min(1).refine(value => !Number.isNaN(Date.parse(value)), 'Tanggal/waktu tidak valid.').nullable().optional();

export const printerSchema = z.object({
  code: text(60), name: z.string().trim().min(1).max(150), brand: text(100), model: text(120), serial_number: text(150),
  printer_type: z.enum(['FDM', 'SLA', 'SLS', 'other']).default('FDM'), nozzle_diameter_mm: positive,
  build_volume_x_mm: positive, build_volume_y_mm: positive, build_volume_z_mm: positive,
  location_name: text(150), purchase_date: date, purchase_cost: z.number().finite().nonnegative().nullable().optional(), warranty_until: date,
  notes: text(10_000), initial_status: z.enum(['available', 'offline']).default('available'),
});
export const printerUpdateSchema = printerSchema.omit({ initial_status: true }).partial().refine(value => Object.keys(value).length > 0, { message: 'Minimal satu data printer harus diubah.' });

export const scheduleSchema = z.object({
  printer_id: z.number().int().positive(), maintenance_type: z.string().trim().min(1).max(100), trigger_type: z.enum(['date', 'print_hours', 'job_count']),
  interval_value: z.number().finite().positive(), next_due_at: dateTime, notes: text(500), is_active: z.boolean().optional(),
}).superRefine((data, ctx) => { if (data.trigger_type === 'date' && data.next_due_at && Number.isNaN(Date.parse(data.next_due_at))) ctx.addIssue({ code: 'custom', path: ['next_due_at'], message: 'Tanggal jatuh tempo tidak valid.' }); });
export const scheduleUpdateSchema = z.object({
  maintenance_type: z.string().trim().min(1).max(100).optional(), trigger_type: z.enum(['date', 'print_hours', 'job_count']).optional(),
  interval_value: z.number().finite().positive().optional(), next_due_at: dateTime, notes: text(500), is_active: z.boolean().optional(),
}).refine(value => Object.keys(value).length > 0, { message: 'Minimal satu data jadwal harus diubah.' });

export const completeMaintenanceSchema = z.object({ maintenance_type: z.string().trim().min(1).max(100), schedule_id: positiveId, performed_at: dateTime, performed_by: positiveId, cost: z.number().finite().nonnegative().default(0), notes: text(10_000) });
export const issueSchema = z.object({ printer_id: z.number().int().positive(), title: z.string().trim().min(1).max(180), severity_code: z.enum(['low', 'medium', 'high', 'critical']).default('medium'), description: text(10_000), assigned_to: positiveId });
export const issueUpdateSchema = z.object({ status_code: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(), assigned_to: positiveId, severity_code: z.enum(['low', 'medium', 'high', 'critical']).optional(), title: z.string().trim().min(1).max(180).optional(), description: text(10_000), resolution_notes: text(10_000) }).refine(value => Object.keys(value).length > 0, { message: 'Minimal satu data masalah harus diubah.' }).superRefine((data, ctx) => { if (data.status_code === 'resolved' && !data.resolution_notes?.trim()) ctx.addIssue({ code: 'custom', path: ['resolution_notes'], message: 'Catatan penyelesaian wajib diisi.' }); });

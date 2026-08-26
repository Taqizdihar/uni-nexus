import { z } from 'zod';

const nullablePositiveId = z.number().int().positive().nullable().optional();
const nullableNonNegative = z.number().nonnegative().nullable().optional();
const nullableText = z.string().max(5000).nullable().optional();
const dateTimeString = z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), 'Tanggal/waktu tidak valid.');

export const plannedMaterialSchema = z.object({
  material_id: z.number().int().positive(),
  material_batch_id: nullablePositiveId,
  planned_qty: z.number().positive(),
  unit_id: z.number().int().positive(),
  reserve: z.boolean().optional(),
});

export const createPrintJobSchema = z.object({
  queue_item_id: nullablePositiveId,
  product_id: nullablePositiveId,
  variant_id: nullablePositiveId,
  printer_id: z.number().int().positive(),
  job_name: z.string().trim().min(1).max(200),
  quantity: z.number().positive(),
  operator_user_id: nullablePositiveId,
  scheduled_start_at: dateTimeString.nullable().optional(),
  print_profile_id: nullablePositiveId,
  design_file_id: nullablePositiveId,
  estimated_print_minutes: z.number().int().positive().nullable().optional(),
  estimated_material_g: nullableNonNegative,
  notes: nullableText,
  materials: z.array(plannedMaterialSchema).default([]),
}).superRefine((data, ctx) => {
  const seen = new Set<string>();
  data.materials.forEach((material, index) => {
    const key = `${material.material_id}:${material.material_batch_id ?? 'none'}`;
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', path: ['materials', index], message: 'Material dan batch yang sama tidak boleh diduplikasi.' });
    }
    seen.add(key);
  });
});

export const updatePrintJobPlanningSchema = z.object({
  job_name: z.string().trim().min(1).max(200).optional(),
  printer_id: z.number().int().positive().optional(),
  operator_user_id: nullablePositiveId,
  scheduled_start_at: dateTimeString.nullable().optional(),
  print_profile_id: nullablePositiveId,
  design_file_id: nullablePositiveId,
  estimated_print_minutes: z.number().int().positive().nullable().optional(),
  estimated_material_g: nullableNonNegative,
  notes: nullableText,
  materials: z.array(plannedMaterialSchema).optional(),
}).strict().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'Minimal satu field perencanaan harus dikirim.' });
  }
  const seen = new Set<string>();
  (data.materials || []).forEach((material, index) => {
    const key = `${material.material_id}:${material.material_batch_id ?? 'none'}`;
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', path: ['materials', index], message: 'Material dan batch yang sama tidak boleh diduplikasi.' });
    }
    seen.add(key);
  });
});

export const startPrintSchema = z.object({ operator_user_id: nullablePositiveId }).default({});
export const reasonSchema = z.object({ reason: z.string().trim().max(500).nullable().optional() }).default({});
export const cancelPrintSchema = z.object({ reason: z.string().trim().min(1).max(500) });
export const progressSchema = z.object({
  progress_percent: z.number().min(0).max(100),
  reason: z.string().trim().max(500).nullable().optional(),
});
export const scheduleSchema = z.object({
  scheduled_start_at: dateTimeString.nullable(),
  estimated_print_minutes: z.number().int().positive().nullable().optional(),
});

export const actualMaterialSchema = z.object({
  print_job_material_id: z.number().int().positive().optional(),
  material_id: z.number().int().positive(),
  material_batch_id: nullablePositiveId,
  actual_qty: z.number().nonnegative(),
  unit_id: z.number().int().positive(),
});

export const finishPrintSchema = z.object({
  actual_print_minutes: z.number().int().nonnegative().nullable().optional(),
  actual_material_g: nullableNonNegative,
  notes: nullableText,
  materials: z.array(actualMaterialSchema).default([]),
});

export const failPrintSchema = z.object({
  failure_type: z.enum(['spaghetti', 'layer_shift', 'warping', 'adhesion', 'filament', 'power', 'human_error', 'other']),
  failure_stage: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(5000),
  material_wasted_qty: nullableNonNegative,
  material_id: nullablePositiveId,
  batch_id: nullablePositiveId,
  estimated_loss: nullableNonNegative,
  requires_reprint: z.boolean().default(true),
  printer_has_issue: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.batch_id && !data.material_id) {
    ctx.addIssue({ code: 'custom', path: ['material_id'], message: 'Material wajib dipilih ketika batch dipilih.' });
  }
});

export const qcInspectionSchema = z.object({
  template_id: nullablePositiveId,
  result_code: z.enum(['pass', 'fail', 'conditional']),
  notes: nullableText,
  requires_reprint: z.boolean().optional(),
  items: z.array(z.object({
    template_item_id: nullablePositiveId,
    item_label: z.string().trim().min(1).max(150),
    value_text: z.string().max(5000).nullable().optional(),
    passed: z.boolean().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })).min(1, 'Minimal satu item pemeriksaan QC diperlukan.'),
}).superRefine((data, ctx) => {
  if (data.result_code === 'conditional' && !data.notes?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['notes'], message: 'Catatan wajib untuk hasil QC bersyarat.' });
  }
});

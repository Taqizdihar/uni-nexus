import { z } from 'zod';

const nullableText = (maximum: number) => z.string().trim().max(maximum).nullable().optional();
const nullableId = z.coerce.number().int().positive().nullable().optional();
const decimal = z.coerce.number().finite();

export const categoryTypes = ['filament', 'resin', 'hardware', 'packaging', 'consumable', 'other'] as const;

const materialFields = {
  category_id: z.coerce.number().int().positive(),
  sku: nullableText(80),
  name: z.string().trim().min(1).max(180),
  brand: nullableText(120),
  material_type: nullableText(80),
  color_name: nullableText(100),
  color_hex: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'HEX warna harus #RRGGBB.').nullable().optional(),
  base_unit_id: z.coerce.number().int().positive(),
  default_unit_cost: decimal.min(0).optional(),
  low_stock_threshold: decimal.min(0).optional(),
  reorder_qty: decimal.min(0).optional(),
  preferred_supplier_id: nullableId,
  notes: nullableText(10_000),
  is_active: z.boolean().optional(),
};

export const materialSchema = z.object(materialFields);
export const materialUpdateSchema = z.object(materialFields).partial();

export const categorySchema = z.object({
  code: nullableText(50),
  name: z.string().trim().min(1).max(100),
  category_type: z.enum(categoryTypes),
  is_active: z.boolean().optional(),
});

export const categoryUpdateSchema = z.object({
  code: nullableText(50),
  name: z.string().trim().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
});

export const receiveStockSchema = z.object({
  batch_code: nullableText(80),
  quantity: decimal.positive(),
  unit_cost: decimal.min(0).optional(),
  supplier_id: nullableId,
  received_at: nullableText(40),
  expiry_date: nullableText(10),
  location_code: nullableText(80),
  notes: nullableText(500),
  create_spool: z.boolean().optional(),
  spool_code: nullableText(80),
  diameter_mm: decimal.positive().max(10).optional(),
  nominal_net_weight_g: decimal.positive().nullable().optional(),
  tare_weight_g: decimal.min(0).nullable().optional(),
  storage_location: nullableText(120),
});

export const adjustmentSchema = z.object({
  material_batch_id: z.coerce.number().int().positive(),
  direction: z.enum(['in', 'out']),
  quantity: decimal.positive(),
  spool_id: nullableId,
  notes: z.string().trim().min(1).max(500),
});

export const spoolUpdateSchema = z.object({
  current_net_weight_g: decimal.min(0).nullable().optional(),
  storage_location: nullableText(120),
  notes: nullableText(500),
  opened: z.boolean().optional(),
  dried: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan spool.');

export const wasteSchema = z.object({
  material_id: z.coerce.number().int().positive(),
  material_batch_id: z.coerce.number().int().positive(),
  quantity: decimal.positive(),
  waste_reason: z.enum(['support', 'purge', 'calibration', 'scrap', 'other']),
  notes: nullableText(500),
});

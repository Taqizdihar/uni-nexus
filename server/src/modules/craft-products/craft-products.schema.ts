import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const optionalPositiveId = z.number().int().positive().nullable().optional();
const optionalNonNegative = z.number().finite().nonnegative().nullable().optional();
const optionalPositive = z.number().finite().positive().nullable().optional();

export const productSchema = z.object({
  sku: optionalText(80),
  name: z.string().trim().min(1).max(180),
  category_id: optionalPositiveId,
  description: optionalText(10_000),
  product_type: z.enum(['premade', 'customizable', 'custom_service']).default('premade'),
  base_selling_price: z.number().finite().nonnegative().default(0),
  estimated_cost: z.number().finite().nonnegative().default(0),
  estimated_weight_g: optionalNonNegative,
  estimated_print_minutes: z.number().int().nonnegative().nullable().optional(),
  default_margin_percent: z.number().finite().min(0).max(100).nullable().optional(),
});

export const productUpdateSchema = productSchema.partial().refine(value => Object.keys(value).length > 0, {
  message: 'Minimal satu data produk harus diubah.',
});

export const categorySchema = z.object({
  code: optionalText(50),
  name: z.string().trim().min(1).max(120),
  parent_id: optionalPositiveId,
  is_active: z.boolean().optional(),
});

export const categoryUpdateSchema = categorySchema.partial().refine(value => Object.keys(value).length > 0, {
  message: 'Minimal satu data kategori harus diubah.',
});

const attributesSchema = z.record(z.string().trim().min(1).max(80), z.string().trim().max(180));
export const variantSchema = z.object({
  sku: optionalText(80),
  name: z.string().trim().min(1).max(180),
  attributes: attributesSchema.nullable().optional(),
  selling_price: optionalNonNegative,
  estimated_cost: optionalNonNegative,
  estimated_weight_g: optionalNonNegative,
  estimated_print_minutes: z.number().int().nonnegative().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const variantUpdateSchema = variantSchema.partial().refine(value => Object.keys(value).length > 0, {
  message: 'Minimal satu data varian harus diubah.',
});

export const bomItemSchema = z.object({
  material_id: z.number().int().positive(),
  quantity: z.number().finite().positive(),
  unit_id: z.number().int().positive(),
  waste_factor_percent: z.number().finite().min(0).max(100).default(0),
  is_optional: z.boolean().default(false),
  notes: optionalText(500),
});

function uniqueBomMaterials(items: Array<{ material_id: number }>, ctx: z.RefinementCtx) {
  const materialIds = new Set<number>();
  items.forEach((item, index) => {
    if (materialIds.has(item.material_id)) ctx.addIssue({ code: 'custom', path: ['items', index, 'material_id'], message: 'Material tidak boleh muncul dua kali di satu BOM.' });
    materialIds.add(item.material_id);
  });
}

export const bomSchema = z.object({
  name: z.string().trim().min(1).max(180),
  variant_id: optionalPositiveId,
  notes: optionalText(500),
  items: z.array(bomItemSchema).min(1),
}).superRefine((data, ctx) => uniqueBomMaterials(data.items, ctx));

export const bomUpdateSchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  notes: optionalText(500),
  items: z.array(bomItemSchema).min(1).optional(),
}).superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) ctx.addIssue({ code: 'custom', message: 'Minimal satu data BOM harus diubah.' });
  if (data.items) uniqueBomMaterials(data.items, ctx);
});

const profileFields = {
  product_id: optionalPositiveId,
  variant_id: optionalPositiveId,
  printer_id: optionalPositiveId,
  name: z.string().trim().min(1).max(180),
  slicer_name: optionalText(120),
  nozzle_diameter_mm: optionalPositive,
  layer_height_mm: optionalPositive,
  infill_percent: z.number().finite().min(0).max(100).nullable().optional(),
  support_enabled: z.boolean().nullable().optional(),
  estimated_print_minutes: z.number().int().positive().nullable().optional(),
  estimated_material_qty: optionalNonNegative,
  estimated_material_unit_id: optionalPositiveId,
  settings_json: z.record(z.string().max(80), z.unknown()).nullable().optional(),
  is_default: z.boolean().optional(),
};
export const printProfileSchema = z.object(profileFields);
export const printProfileUpdateSchema = z.object(profileFields).partial().refine(value => Object.keys(value).length > 0, {
  message: 'Minimal satu data profil cetak harus diubah.',
});

export const designMetadataSchema = z.object({
  product_id: optionalPositiveId,
  variant_id: optionalPositiveId,
  name: z.string().trim().min(1).max(200),
  version_label: optionalText(50),
  is_final: z.boolean().optional(),
  notes: optionalText(500),
});
export const designUpdateSchema = designMetadataSchema.partial().refine(value => Object.keys(value).length > 0, {
  message: 'Minimal satu data file desain harus diubah.',
});

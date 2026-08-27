import { z } from 'zod';

const optionalString = z.string().trim().max(500).nullable().optional();
const money = z.number().finite();
const safeUrl = z.string().trim().max(500).url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'http:' || protocol === 'https:';
}, 'URL harus memakai http:// atau https://');

export const channelSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[A-Z][A-Z0-9_]*$/, 'Kode harus berupa slug huruf besar.'),
  name: z.string().trim().min(1).max(100),
  channel_type: z.enum(['marketplace', 'direct', 'partner', 'internal']),
  external_url: safeUrl.nullable().optional(),
  is_active: z.boolean().default(true),
});
export const channelUpdateSchema = channelSchema.partial().omit({ code: true });

export const productMappingSchema = z.object({
  sales_channel_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive().nullable().optional(),
  external_product_id: z.string().trim().max(190).nullable().optional(),
  external_sku: z.string().trim().min(1).max(190),
  external_url: safeUrl.nullable().optional(),
  sync_status_code: z.enum(['manual', 'synced', 'pending', 'error']).default('manual'),
});
export const productMappingUpdateSchema = productMappingSchema.omit({ sales_channel_id: true }).partial();

const feeRuleBaseSchema = z.object({
  sales_channel_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  fee_type: z.enum(['percentage', 'fixed', 'mixed']),
  percentage_rate: z.number().min(0).max(100).default(0),
  fixed_amount: z.number().min(0).default(0),
  applies_to: z.enum(['gross_sales', 'item_subtotal', 'net_after_discount']).default('gross_sales'),
  effective_from: z.string().date(),
  effective_until: z.string().date().nullable().optional(),
  is_active: z.boolean().default(true),
});
export const feeRuleSchema = feeRuleBaseSchema.superRefine((data, context) => {
  if (data.fee_type === 'percentage' && data.percentage_rate <= 0) context.addIssue({ code: 'custom', message: 'Tarif persentase harus lebih dari nol.', path: ['percentage_rate'] });
  if (data.fee_type === 'fixed' && data.fixed_amount <= 0) context.addIssue({ code: 'custom', message: 'Biaya tetap harus lebih dari nol.', path: ['fixed_amount'] });
  if (data.fee_type === 'mixed' && data.percentage_rate <= 0 && data.fixed_amount <= 0) context.addIssue({ code: 'custom', message: 'Aturan campuran memerlukan tarif atau biaya tetap.', path: ['fee_type'] });
  if (data.effective_until && data.effective_until < data.effective_from) context.addIssue({ code: 'custom', message: 'Tanggal akhir tidak boleh sebelum tanggal mulai.', path: ['effective_until'] });
});
export const feeRuleUpdateSchema = feeRuleBaseSchema.omit({ sales_channel_id: true }).partial().superRefine((data, context) => {
  if (data.fee_type === 'percentage' && data.percentage_rate !== undefined && data.percentage_rate <= 0) context.addIssue({ code: 'custom', message: 'Tarif persentase harus lebih dari nol.', path: ['percentage_rate'] });
  if (data.fee_type === 'fixed' && data.fixed_amount !== undefined && data.fixed_amount <= 0) context.addIssue({ code: 'custom', message: 'Biaya tetap harus lebih dari nol.', path: ['fixed_amount'] });
  if (data.effective_from && data.effective_until && data.effective_until < data.effective_from) context.addIssue({ code: 'custom', message: 'Tanggal akhir tidak boleh sebelum tanggal mulai.', path: ['effective_until'] });
});

const secretKey = /(secret|token|password|credential|api[_-]?key)/i;
const configJson = z.record(z.string(), z.unknown()).default({}).superRefine((value, context) => {
  const inspect = (node: unknown, path: Array<string | number>) => {
    if (Array.isArray(node)) node.forEach((child, index) => inspect(child, [...path, index]));
    if (node && typeof node === 'object') Object.entries(node as Record<string, unknown>).forEach(([key, child]) => {
      if (secretKey.test(key)) context.addIssue({ code: 'custom', path: [...path, key], message: 'Rahasia API tidak boleh disimpan di config_json.' });
      inspect(child, [...path, key]);
    });
  };
  inspect(value, []);
});
export const integrationSchema = z.object({
  sales_channel_id: z.number().int().positive(),
  display_name: z.string().trim().min(1).max(150),
  provider_name: z.string().trim().min(1).max(120),
  mode: z.enum(['api', 'manual_import']),
  config_json: configJson,
});
export const integrationUpdateSchema = integrationSchema.omit({ sales_channel_id: true }).partial();

export const settlementItemSchema = z.object({
  external_order_id: z.string().trim().max(190).nullable().optional(),
  order_id: z.number().int().positive().nullable().optional(),
  gross_amount: money.default(0),
  fee_amount: money.default(0),
  adjustment_amount: money.default(0),
  net_amount: money,
});
const settlementBaseSchema = z.object({
  sales_channel_id: z.number().int().positive(),
  settlement_code: z.string().trim().max(100).nullable().optional(),
  period_start: z.string().date().nullable().optional(),
  period_end: z.string().date().nullable().optional(),
  settled_at: z.string().datetime().nullable().optional(),
  gross_sales: money.min(0),
  platform_fees: money.min(0),
  vouchers_subsidies: money.default(0),
  shipping_adjustments: money.default(0),
  other_adjustments: money.default(0),
  net_settlement: money.min(0),
  external_reference: z.string().trim().max(190).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  items: z.array(settlementItemSchema).default([]),
});
export const settlementSchema = settlementBaseSchema.superRefine((data, context) => {
  if (data.period_start && data.period_end && data.period_end < data.period_start) context.addIssue({ code: 'custom', path: ['period_end'], message: 'Periode akhir tidak boleh sebelum periode mulai.' });
  const expected = data.gross_sales - data.platform_fees + data.vouchers_subsidies + data.shipping_adjustments + data.other_adjustments;
  if (Math.abs(expected - data.net_settlement) > 0.01) context.addIssue({ code: 'custom', path: ['net_settlement'], message: 'Net settlement tidak sesuai dengan komponen settlement.' });
});
export const settlementUpdateSchema = settlementBaseSchema.omit({ sales_channel_id: true, items: true }).partial().superRefine((data, context) => {
  if (data.period_start && data.period_end && data.period_end < data.period_start) context.addIssue({ code: 'custom', path: ['period_end'], message: 'Periode akhir tidak boleh sebelum periode mulai.' });
});
export const receiveSettlementSchema = z.object({ treasury_account_id: z.number().int().positive(), received_at: z.string().datetime().optional() });
export const settlementMatchSchema = z.object({ matches: z.array(z.object({ item_id: z.number().int().positive(), order_id: z.number().int().positive().nullable() })).default([]) });

export const importCommitSchema = z.object({
  customer_resolutions: z.record(z.string(), z.object({ strategy: z.enum(['existing', 'new', 'generic']), party_id: z.number().int().positive().optional() })).default({}),
  product_resolutions: z.record(z.string(), z.object({ product_id: z.number().int().positive().nullable().optional(), variant_id: z.number().int().positive().nullable().optional(), as_custom: z.boolean().optional(), save_mapping: z.boolean().optional() })).default({}),
});

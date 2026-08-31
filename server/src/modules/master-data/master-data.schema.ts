import { z } from 'zod';

const code = z.string().trim().min(1).max(60).regex(/^[A-Z][A-Z0-9_-]*$/, 'Kode harus menggunakan huruf besar, angka, tanda hubung, atau underscore.');
const optionalId = z.coerce.number().int().positive().nullable().optional();
const active = z.boolean().optional();
const hasChanges = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => schema.refine(value => Object.keys(value).length > 0, 'Minimal satu perubahan harus dikirim.');

export const masterDataListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  unit_group: z.enum(['weight', 'count', 'length', 'volume', 'time', 'other']).optional(),
  channel_type: z.enum(['marketplace', 'direct', 'partner', 'internal']).optional(),
  transaction_type: z.enum(['income', 'expense']).optional(),
  business_unit: z.enum(['craft', 'studio', 'shared']).optional(),
  parent_id: z.coerce.number().int().positive().nullable().optional(),
}).strict();

export const masterDataExportSchema = masterDataListSchema.extend({
  dataset: z.string().trim().min(1).max(80),
  format: z.enum(['csv', 'xlsx']).default('csv'),
}).strict();

export const createSchemas = {
  units: z.object({ code: code.max(20), name: z.string().trim().min(1).max(60), symbol: z.string().trim().min(1).max(20), unit_group: z.enum(['weight', 'count', 'length', 'volume', 'time', 'other']), decimal_places: z.coerce.number().int().min(0).max(6), is_active: active }).strict(),
  'payment-methods': z.object({ code: code.max(50), name: z.string().trim().min(1).max(100), method_type: z.enum(['cash', 'bank_transfer', 'ewallet', 'marketplace', 'other']), is_active: active }).strict(),
  'craft-product-categories': z.object({ code: code.max(50), name: z.string().trim().min(1).max(120), parent_id: optionalId, is_active: active }).strict(),
  'craft-material-categories': z.object({ code: code.max(50), name: z.string().trim().min(1).max(100), category_type: z.enum(['filament', 'resin', 'hardware', 'packaging', 'consumable', 'other']), is_active: active }).strict(),
  'craft-sales-channels': z.object({ code: code.max(50), name: z.string().trim().min(1).max(100), channel_type: z.enum(['marketplace', 'direct', 'partner', 'internal']), external_url: z.string().trim().max(500).url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'URL harus memakai http:// atau https://').nullable().optional(), is_active: active }).strict(),
  'studio-service-categories': z.object({ code: code.max(50), name: z.string().trim().min(1).max(120), is_active: active }).strict(),
  'finance-transaction-categories': z.object({ scope: z.enum(['craft', 'studio', 'shared']), code: code.max(60), name: z.string().trim().min(1).max(120), transaction_type: z.enum(['income', 'expense']), default_coa_account_id: optionalId, is_active: active }).strict(),
};

export const updateSchemas = {
  units: hasChanges(z.object({ name: z.string().trim().min(1).max(60).optional(), symbol: z.string().trim().min(1).max(20).optional(), unit_group: z.enum(['weight', 'count', 'length', 'volume', 'time', 'other']).optional(), decimal_places: z.coerce.number().int().min(0).max(6).optional() }).strict()),
  'payment-methods': hasChanges(z.object({ name: z.string().trim().min(1).max(100).optional(), method_type: z.enum(['cash', 'bank_transfer', 'ewallet', 'marketplace', 'other']).optional() }).strict()),
  'craft-product-categories': hasChanges(z.object({ name: z.string().trim().min(1).max(120).optional(), parent_id: optionalId }).strict()),
  'craft-material-categories': hasChanges(z.object({ name: z.string().trim().min(1).max(100).optional(), category_type: z.enum(['filament', 'resin', 'hardware', 'packaging', 'consumable', 'other']).optional() }).strict()),
  'craft-sales-channels': hasChanges(z.object({ name: z.string().trim().min(1).max(100).optional(), channel_type: z.enum(['marketplace', 'direct', 'partner', 'internal']).optional(), external_url: z.string().trim().max(500).url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'URL harus memakai http:// atau https://').nullable().optional() }).strict()),
  'studio-service-categories': hasChanges(z.object({ name: z.string().trim().min(1).max(120).optional() }).strict()),
  'finance-transaction-categories': hasChanges(z.object({ name: z.string().trim().min(1).max(120).optional(), default_coa_account_id: optionalId }).strict()),
};

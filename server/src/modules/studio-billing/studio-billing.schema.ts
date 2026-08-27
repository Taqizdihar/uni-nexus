import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max).nullable().optional();
const date = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Gunakan format tanggal YYYY-MM-DD.').nullable().optional();
const money = z.coerce.number().finite().min(0, 'Nilai tidak boleh negatif.').max(999999999999999.99);
const positiveId = z.coerce.number().int().positive();
const quantity = z.coerce.number().finite().positive('Jumlah harus lebih besar dari 0.').max(99999999999999.9999);

export const commercialLineSchema = z.object({
  service_id: positiveId.nullable().optional(),
  description: z.string().trim().min(1, 'Deskripsi item wajib diisi.').max(255),
  quantity,
  unit_price: money,
  discount_amount: money.default(0),
  tax_amount: money.default(0),
});

export const paymentScheduleSchema = z.object({
  label: text(120),
  due_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal termin wajib diisi.'),
  amount: money,
  notes: text(500),
});

const quotationFields = {
  party_id: positiveId,
  project_id: positiveId.nullable().optional(),
  issue_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  valid_until: date,
  currency_code: z.string().trim().length(3).default('IDR'),
  discount_amount: money.default(0),
  tax_amount: money.default(0),
  terms: text(12000),
  notes: text(12000),
  items: z.array(commercialLineSchema).min(1, 'Penawaran minimal memiliki satu item.').max(100),
};

export const createQuotationSchema = z.object(quotationFields);
export const updateQuotationSchema = z.object(quotationFields).partial().refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan penawaran yang dikirim.' });

const templateItemSchema = z.object({
  service_id: positiveId.nullable().optional(),
  description: z.string().trim().min(1).max(255),
  quantity: quantity.default(1),
  unit_price: money.nullable().optional(),
});

const templateFields = {
  name: z.string().trim().min(1, 'Nama template wajib diisi.').max(180),
  title_template: text(220),
  intro_text: text(12000),
  terms_text: text(12000),
  footer_text: text(12000),
  default_valid_days: z.coerce.number().int().min(0).max(3650).default(14),
  config_json: z.record(z.string(), z.unknown()).nullable().optional(),
  is_active: z.boolean().default(true),
  items: z.array(templateItemSchema).max(100).default([]),
};
export const createQuotationTemplateSchema = z.object(templateFields);
export const updateQuotationTemplateSchema = z.object(templateFields).partial().refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan template yang dikirim.' });

const invoiceFields = {
  party_id: positiveId,
  quotation_id: positiveId.nullable().optional(),
  source_type: z.enum(['studio_project', 'manual']).nullable().optional(),
  source_id: positiveId.nullable().optional(),
  issue_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: date,
  currency_code: z.string().trim().length(3).default('IDR'),
  discount_amount: money.default(0),
  payment_terms: text(255),
  notes: text(12000),
  items: z.array(commercialLineSchema).min(1, 'Invoice minimal memiliki satu item.').max(100),
  schedules: z.array(paymentScheduleSchema).max(24).default([]),
};
export const createInvoiceSchema = z.object(invoiceFields);
export const updateInvoiceSchema = z.object(invoiceFields).partial().refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan invoice yang dikirim.' });

export const reasonSchema = z.object({ reason: z.string().trim().min(3, 'Alasan wajib diisi.').max(500) });

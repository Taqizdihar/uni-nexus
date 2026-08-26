import { z } from "zod";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value?.trim() || null);
const nullableDate = z.string().date().nullable().optional();
const nullableNumber = z.number().finite().nonnegative().nullable().optional();
const phone = z
  .string()
  .trim()
  .min(3)
  .max(50)
  .nullable()
  .optional()
  .transform((value) => value?.trim() || null);

const supplierFields = z.object({
  party_kind: z.enum(["individual", "company", "institution"]).optional(),
  display_name: z.string().trim().min(1).max(200).optional(),
  legal_name: nullableText(250),
  email: z
    .string()
    .trim()
    .email()
    .max(190)
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || null),
  phone,
  website: z
    .string()
    .trim()
    .url()
    .max(255)
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || null),
  tax_id: nullableText(100),
  address_line1: nullableText(255),
  address_line2: nullableText(255),
  city: nullableText(100),
  province: nullableText(100),
  postal_code: nullableText(20),
  country_code: z
    .string()
    .trim()
    .length(2)
    .nullable()
    .optional()
    .transform((value) => (value ? value.toUpperCase() : "ID")),
  notes: nullableText(10_000),
});

export const supplierCreateSchema = supplierFields
  .extend({
    existing_party_id: z.number().int().positive().nullable().optional(),
    confirm_duplicate: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    if (!value.existing_party_id && (!value.display_name || !value.party_kind))
      ctx.addIssue({
        code: "custom",
        message: "Nama dan jenis pemasok wajib diisi untuk Party baru.",
      });
  });
export const supplierUpdateSchema = supplierFields
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Minimal satu data pemasok harus diubah.",
  );

export const contactSchema = z.object({
  full_name: z.string().trim().min(1).max(150),
  job_title: nullableText(120),
  email: z
    .string()
    .trim()
    .email()
    .max(190)
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || null),
  phone,
  whatsapp: phone,
  is_primary: z.boolean().optional().default(false),
  notes: nullableText(500),
});
export const contactUpdateSchema = contactSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Minimal satu data kontak harus diubah.",
  );

const requestItemSchema = z.object({
  material_id: z.number().int().positive().nullable().optional(),
  description: z.string().trim().min(1).max(255),
  quantity: z.number().finite().positive().max(9_999_999),
  unit_id: z.number().int().positive().nullable().optional(),
  estimated_unit_cost: nullableNumber,
  notes: nullableText(500),
});
export const purchaseRequestSchema = z.object({
  required_by: nullableDate,
  purpose: nullableText(500),
  items: z.array(requestItemSchema).min(1).max(100),
});
export const purchaseRequestUpdateSchema = purchaseRequestSchema;

const orderItemSchema = z.object({
  purchase_request_item_id: z.number().int().positive().nullable().optional(),
  material_id: z.number().int().positive().nullable().optional(),
  description: z.string().trim().min(1).max(255),
  quantity: z.number().finite().positive().max(9_999_999),
  unit_id: z.number().int().positive().nullable().optional(),
  unit_price: z.number().finite().nonnegative().max(9_999_999_999),
});
export const purchaseOrderSchema = z.object({
  supplier_party_id: z.number().int().positive(),
  purchase_request_id: z.number().int().positive().nullable().optional(),
  order_date: z.string().date(),
  expected_date: nullableDate,
  currency_code: z
    .string()
    .trim()
    .length(3)
    .optional()
    .default("IDR")
    .transform((value) => value.toUpperCase()),
  tax_amount: z.number().finite().nonnegative().optional().default(0),
  shipping_amount: z.number().finite().nonnegative().optional().default(0),
  notes: nullableText(10_000),
  items: z.array(orderItemSchema).min(1).max(100),
});
export const purchaseOrderUpdateSchema = purchaseOrderSchema
  .omit({ supplier_party_id: true, purchase_request_id: true })
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Minimal satu data PO harus diubah.",
  );

const receiptItemSchema = z
  .object({
    purchase_order_item_id: z.number().int().positive(),
    accepted_qty: z.number().finite().nonnegative().max(9_999_999),
    rejected_qty: z
      .number()
      .finite()
      .nonnegative()
      .max(9_999_999)
      .optional()
      .default(0),
    rejection_reason: nullableText(500),
    batch_code: nullableText(80),
    expiry_date: nullableDate,
    location_code: nullableText(80),
    create_spool: z.boolean().optional().default(true),
    spool_code: nullableText(80),
    diameter_mm: z.number().finite().positive().max(10).nullable().optional(),
    tare_weight_g: nullableNumber,
    storage_location: nullableText(120),
    notes: nullableText(500),
  })
  .superRefine((value, ctx) => {
    if (value.accepted_qty + value.rejected_qty <= 0)
      ctx.addIssue({
        code: "custom",
        message: "Jumlah diterima atau ditolak harus lebih dari nol.",
      });
    if (value.rejected_qty > 0 && !value.rejection_reason)
      ctx.addIssue({
        code: "custom",
        message: "Alasan penolakan wajib diisi.",
      });
  });
export const goodsReceiptSchema = z.object({
  purchase_order_id: z.number().int().positive(),
  received_at: nullableDate,
  notes: nullableText(10_000),
  items: z.array(receiptItemSchema).min(1).max(100),
});

export const supplierInvoiceSchema = z.object({
  supplier_party_id: z.number().int().positive(),
  purchase_order_id: z.number().int().positive().nullable().optional(),
  supplier_invoice_number: z.string().trim().min(1).max(120),
  invoice_date: z.string().date(),
  due_date: nullableDate,
  total_amount: z.number().finite().positive().max(9_999_999_999),
  currency_code: z
    .string()
    .trim()
    .length(3)
    .optional()
    .default("IDR")
    .transform((value) => value.toUpperCase()),
  document_path: nullableText(500),
  notes: nullableText(500),
});

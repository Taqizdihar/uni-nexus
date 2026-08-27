import { z } from 'zod';

export const createOrderSchema = z.object({
  draft_id: z.number().int().positive().nullable().optional(),
  customer_party_id: z.number().int().positive(),
  sales_channel_id: z.number().int().positive(),
  external_order_id: z.string().nullable().optional(),
  order_type: z.enum(['standard', 'custom', 'partner', 'internal']).default('standard'),
  deadline_at: z.string().nullable().optional(),
  priority_code: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  priority_reason: z.string().nullable().optional(),
  is_priority_manual: z.boolean().default(false),
  currency_code: z.string().default('IDR'),
  discount_amount: z.number().min(0).default(0),
  shipping_amount: z.number().min(0).default(0),
  marketplace_fee_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  customer_notes: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  shipping_recipient_name: z.string().nullable().optional(),
  shipping_phone: z.string().nullable().optional(),
  shipping_address: z.string().nullable().optional(),
  courier_name: z.string().nullable().optional(),
  
  items: z.array(z.object({
    product_id: z.number().int().positive().nullable().optional(),
    variant_id: z.number().int().positive().nullable().optional(),
    item_name: z.string().min(1),
    item_description: z.string().nullable().optional(),
    quantity: z.number().int().positive(),
    unit_price: z.number().min(0),
    discount_amount: z.number().min(0).default(0),
    estimated_material_g: z.number().nonnegative().nullable().optional(),
    estimated_print_minutes: z.number().int().positive().nullable().optional(),
    print_profile_id: z.number().int().positive().nullable().optional(),
    custom_spec_json: z.any().nullable().optional(),
  })).min(1, 'Pesanan harus memiliki minimal 1 item')
});

export const updateOrderStatusSchema = z.object({
  status_code: z.enum(['new', 'confirmed', 'waiting', 'ready', 'in_production', 'qc', 'completed', 'packed', 'shipped', 'cancelled', 'returned']),
  reason: z.string().nullable().optional()
});

export const updateOrderPrioritySchema = z.object({
  priority_code: z.enum(['low', 'normal', 'high', 'critical']),
  reason: z.string().nullable().optional(),
  is_priority_manual: z.boolean().default(true)
});

export const updateOrderSchema = z.object({
  deadline_at: z.string().nullable().optional(),
  customer_notes: z.string().max(5000).nullable().optional(),
  internal_notes: z.string().max(5000).nullable().optional(),
  shipping_recipient_name: z.string().max(180).nullable().optional(),
  shipping_phone: z.string().max(50).nullable().optional(),
  shipping_address: z.string().max(5000).nullable().optional(),
  courier_name: z.string().max(100).nullable().optional(),
});

export const createInvoiceSchema = z.object({
  due_date: z.string().nullable().optional(),
  payment_terms: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

export const recordPaymentSchema = z.object({
  payment_date: z.string(),
  amount: z.number().positive(),
  payment_method_id: z.number().int().positive(),
  treasury_account_id: z.number().int().positive(),
  reference_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

export const enqueueOrderItemsSchema = z.object({
  item_ids: z.array(z.number().int().positive()).min(1)
});

export const quickCreateCustomerSchema = z.object({
  display_name: z.string().min(1),
  party_kind: z.enum(['individual', 'company', 'institution']).default('individual'),
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: z.string().nullable().optional()
});

const draftFormSchema = z.object({
  customer_party_id: z.union([z.string(), z.number()]).optional(),
  sales_channel_id: z.union([z.string(), z.number()]).optional(),
  external_order_id: z.string().max(255).optional(),
  order_type: z.enum(['standard', 'custom', 'partner', 'internal']).optional(),
  deadline_at: z.string().optional(),
  priority_mode: z.enum(['automatic', 'manual']).optional(),
  priority_code: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  priority_reason: z.string().optional(),
  discount_amount: z.union([z.number().nonnegative(), z.literal('')]).optional(),
  shipping_amount: z.union([z.number().nonnegative(), z.literal('')]).optional(),
  marketplace_fee_amount: z.union([z.number().nonnegative(), z.literal('')]).optional(),
  tax_amount: z.union([z.number().nonnegative(), z.literal('')]).optional(),
  customer_notes: z.string().optional(),
  internal_notes: z.string().optional(),
  shipping_recipient_name: z.string().optional(),
  shipping_phone: z.string().optional(),
  shipping_address: z.string().optional(),
  courier_name: z.string().optional(),
}).passthrough();

const draftItemSchema = z.object({
  mode: z.enum(['catalog', 'custom']).optional(),
  product_id: z.union([z.string(), z.number()]).optional(),
  variant_id: z.union([z.string(), z.number()]).optional(),
  item_name: z.string().optional(),
  item_description: z.string().optional(),
  quantity: z.union([z.number(), z.string()]).optional(),
  unit_price: z.union([z.number(), z.string()]).optional(),
  discount_amount: z.union([z.number(), z.string()]).optional(),
  estimated_material_g: z.union([z.number(), z.string()]).optional(),
  estimated_print_minutes: z.union([z.number(), z.string()]).optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  specification: z.string().optional(),
}).passthrough();

export const saveOrderDraftSchema = z.object({
  title: z.string().max(180).nullable().optional(),
  payload: z.object({
    schema_version: z.number().int().positive().default(1),
    form: draftFormSchema,
    items: z.array(draftItemSchema).default([]),
  }).passthrough(),
});

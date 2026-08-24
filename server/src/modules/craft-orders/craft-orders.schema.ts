import { z } from 'zod';

export const createOrderSchema = z.object({
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
    quantity: z.number().min(0.0001),
    unit_price: z.number().min(0),
    discount_amount: z.number().min(0).default(0),
    estimated_material_g: z.number().nullable().optional(),
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
  treasury_account_id: z.number().int().positive().nullable().optional(),
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

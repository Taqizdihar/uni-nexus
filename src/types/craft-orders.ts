export type OrderStatus = 'new' | 'confirmed' | 'waiting' | 'ready' | 'in_production' | 'qc' | 'completed' | 'packed' | 'shipped' | 'cancelled' | 'returned';
export type PriorityCode = 'low' | 'normal' | 'high' | 'critical';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded' | 'cancelled';

export interface CraftOrder {
  id: number;
  order_code: string;
  order_type: 'standard' | 'custom' | 'partner' | 'internal';
  order_date: string;
  deadline_at: string | null;
  priority_code: PriorityCode;
  priority_score: number;
  priority_reason?: string | null;
  status_code: OrderStatus;
  payment_status_code: PaymentStatus;
  total_amount: number;
  paid_amount: number;
  external_order_id: string | null;
  customer_name: string;
  customer_type: string;
  sales_channel_name: string;
  item_count: number;
  total_quantity: number;
  item_summary: string | null;
  total_print_minutes?: number;
  is_overdue: boolean | number;
}

export interface CraftOrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  variant_id: number | null;
  item_name: string;
  item_description: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  estimated_material_g: number | null;
  estimated_print_minutes: number | null;
  print_profile_id: number | null;
  custom_spec_json: Record<string, string> | null;
  product_name?: string | null;
  variant_name?: string | null;
}

export interface CraftOrderDetail extends CraftOrder {
  customer_party_id: number;
  sales_channel_id: number;
  customer_name: string;
  customer_type: string;
  email: string | null;
  phone: string | null;
  sales_channel_name: string;
  channel_type: string;
  is_priority_manual: boolean | number;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  marketplace_fee_amount: number;
  tax_amount: number;
  customer_notes: string | null;
  internal_notes: string | null;
  shipping_recipient_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  courier_name: string | null;
}

export interface StatusHistoryEntry {
  id: number;
  from_status_code: OrderStatus | null;
  to_status_code: OrderStatus;
  reason: string | null;
  changed_at: string;
  changed_by_name: string | null;
}

export interface CustomerOption {
  id: number;
  display_name: string;
  party_kind: 'individual' | 'company' | 'institution';
  email: string | null;
  phone: string | null;
}

export interface SalesChannelOption {
  id: number;
  name: string;
  channel_type: string;
  is_integrated: boolean | number;
}

export interface ProductVariantOption {
  id: number;
  sku: string;
  name: string;
  selling_price: number;
  estimated_cost: number | null;
  estimated_weight_g: number | null;
  estimated_print_minutes: number | null;
}

export interface ProductOption {
  id: number;
  name: string;
  sku: string;
  base_selling_price: number;
  estimated_cost: number | null;
  estimated_weight_g: number | null;
  estimated_print_minutes: number | null;
  variants: ProductVariantOption[];
}

export interface PaymentMethodOption { id: number; code: string; name: string; method_type: string; }
export interface TreasuryAccountOption { id: number; name: string; }

export interface InvoiceSummary { id: number; invoice_number: string; status_code: string; total_amount: number; balance_due: number; }
export interface PaymentSummary { id: number; payment_code: string; payment_date: string; amount: number; method_name: string | null; }
export interface AttachmentSummary { id: number; file_name: string; file_type: string | null; file_size_bytes: number | null; attachment_type: string; uploaded_at: string; uploaded_by_name: string | null; }
export interface ProductionQueueItem { id: number; queue_position: number; priority_code: PriorityCode; priority_score: number; status_code: string; order_id: number; order_code: string; deadline_at: string | null; customer_name: string; item_name: string; quantity: number; estimated_print_minutes: number | null; }

export interface OrderDetailResponse { order: CraftOrderDetail; items: CraftOrderItem[]; history: StatusHistoryEntry[]; invoices: InvoiceSummary[]; payments: PaymentSummary[]; attachments: AttachmentSummary[]; }

export interface CreateOrderItem {
  product_id: number | null;
  variant_id: number | null;
  item_name: string;
  item_description?: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  estimated_material_g?: number | null;
  estimated_print_minutes?: number | null;
  custom_spec_json?: Record<string, string> | null;
}

export interface CreateCraftOrderRequest {
  draft_id?: number | null;
  customer_party_id: number;
  sales_channel_id: number;
  external_order_id?: string | null;
  order_type: 'standard' | 'custom' | 'partner' | 'internal';
  deadline_at?: string | null;
  priority_code: PriorityCode;
  priority_reason?: string | null;
  is_priority_manual: boolean;
  discount_amount: number;
  shipping_amount: number;
  marketplace_fee_amount: number;
  tax_amount: number;
  customer_notes?: string | null;
  internal_notes?: string | null;
  shipping_recipient_name?: string | null;
  shipping_phone?: string | null;
  shipping_address?: string | null;
  courier_name?: string | null;
  items: CreateOrderItem[];
}

export interface CraftOrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  statuses?: OrderStatus[];
  priority?: PriorityCode;
  paymentStatus?: PaymentStatus;
  channel?: number;
  orderType?: CraftOrder['order_type'];
  dateFrom?: string;
  dateTo?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  overdue?: boolean;
  activeOnly?: boolean;
  sortBy?: 'priority' | 'deadline' | 'date' | 'total';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number; }; }

export type DraftStatus = 'active' | 'converted' | 'discarded';
export type DraftItemMode = 'catalog' | 'custom';

export interface OrderDraftFormData {
  customer_party_id: string;
  sales_channel_id: string;
  external_order_id: string;
  order_type: CraftOrder['order_type'];
  deadline_at: string;
  priority_mode: 'automatic' | 'manual';
  priority_code: PriorityCode | string;
  priority_reason: string;
  discount_amount: number | '';
  shipping_amount: number | '';
  marketplace_fee_amount: number | '';
  tax_amount: number | '';
  customer_notes: string;
  internal_notes: string;
  shipping_recipient_name: string;
  shipping_phone: string;
  shipping_address: string;
  courier_name: string;
}

export interface OrderDraftItemData {
  mode: DraftItemMode;
  product_id: string;
  variant_id: string;
  item_name: string;
  item_description: string;
  quantity: number | '';
  unit_price: number | '';
  discount_amount: number | '';
  estimated_material_g: number | '';
  estimated_print_minutes: number | '';
  material: string;
  color: string;
  size: string;
  specification: string;
}

export interface OrderDraftPayload {
  schema_version: number;
  form: OrderDraftFormData;
  items: OrderDraftItemData[];
}

export interface CraftOrderDraftSummary {
  id: number;
  draft_code: string;
  title: string | null;
  status_code: DraftStatus;
  created_by: number;
  created_by_name: string | null;
  customer_name: string | null;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface CraftOrderDraft extends CraftOrderDraftSummary {
  business_unit_id: number;
  payload: OrderDraftPayload;
  schema_version: number;
  converted_order_id: number | null;
  updated_by: number | null;
  converted_at: string | null;
  deleted_at: string | null;
}

export interface SaveOrderDraftRequest {
  title?: string | null;
  payload: OrderDraftPayload;
}

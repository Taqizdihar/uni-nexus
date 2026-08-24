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

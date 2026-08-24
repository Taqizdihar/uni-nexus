export interface CraftOrder {
  id: number;
  business_unit_id: number;
  order_code: string;
  customer_party_id: number;
  sales_channel_id: number;
  external_order_id: string | null;
  order_type: 'standard' | 'custom' | 'partner' | 'internal';
  order_date: string;
  deadline_at: string | null;
  priority_code: 'low' | 'normal' | 'high' | 'critical';
  priority_score: number;
  priority_reason: string | null;
  is_priority_manual: boolean;
  status_code: 'new' | 'confirmed' | 'waiting' | 'ready' | 'in_production' | 'qc' | 'completed' | 'packed' | 'shipped' | 'cancelled' | 'returned';
  payment_status_code: 'unpaid' | 'partial' | 'paid' | 'refunded' | 'cancelled';
  currency_code: string;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  marketplace_fee_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  customer_notes: string | null;
  internal_notes: string | null;
  shipping_recipient_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  deleted_at: string | null;
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
  custom_spec_json: any | null;
  created_at: string;
  updated_at: string;
}

export interface CraftOrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  statuses?: string[];
  priority?: string;
  paymentStatus?: string;
  channel?: number;
  orderType?: string;
  dateFrom?: string;
  dateTo?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  overdue?: boolean;
  activeOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CraftOrder {
  id: number;
  order_code: string;
  order_type: 'standard' | 'custom' | 'partner' | 'internal';
  order_date: string;
  deadline_at: string | null;
  priority_code: 'low' | 'normal' | 'high' | 'critical';
  priority_score: number;
  status_code: 'new' | 'confirmed' | 'waiting' | 'ready' | 'in_production' | 'qc' | 'completed' | 'packed' | 'shipped' | 'cancelled' | 'returned';
  payment_status_code: 'unpaid' | 'partial' | 'paid' | 'refunded' | 'cancelled';
  total_amount: number;
  paid_amount: number;
  external_order_id: string | null;
  customer_name: string;
  customer_type: string;
  sales_channel_name: string;
  item_count: number;
  total_quantity: number;
  item_summary: string;
  is_overdue: boolean;
}

export interface CraftOrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  paymentStatus?: string;
  channel?: number;
  orderType?: string;
  dateFrom?: string;
  dateTo?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  overdue?: boolean;
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

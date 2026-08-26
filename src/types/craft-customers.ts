export type PartyKind = 'individual' | 'company' | 'institution' | 'internal';
export type PartyStatus = 'active' | 'inactive';

export interface CraftCustomer {
  id: number;
  code: string;
  party_kind: PartyKind;
  display_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  website?: string | null;
  tax_id: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  notes?: string | null;
  status_code: PartyStatus | string;
  is_active: boolean;
  is_partner: boolean;
  created_at: string;
  updated_at?: string;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  total_orders: number;
  total_order_value: number;
  last_order_at: string | null;
  customer_role_active?: number;
  customer_valid_from?: string | null;
  customer_valid_until?: string | null;
  partner_role_active?: number | null;
  partner_valid_from?: string | null;
  partner_valid_until?: string | null;
}

export interface CustomerSummaryCards {
  total_customers: number;
  active_customers: number;
  active_partners: number;
  active_orders: number;
}

export interface PartyContact {
  id: number;
  party_id: number;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerOrderSummary {
  id: number;
  order_code: string;
  order_type: string;
  order_date: string;
  deadline_at: string | null;
  status_code: string;
  payment_status_code: string;
  total_amount: number;
  sales_channel_name: string;
  item_count: number;
}

export interface CustomerCommercialSummary {
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_order_value: number;
  confirmed_payments: number;
  outstanding_invoice_balance: number;
  last_order_at: string | null;
  sales_channels: Array<{ id: number; name: string; order_count: number; last_order_at: string | null }>;
}

export interface PartnerPriceRule {
  id: number;
  partner_party_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  variant_id: number | null;
  variant_name: string | null;
  variant_sku: string | null;
  minimum_qty: number;
  normal_price: number;
  special_price: number | null;
  discount_percent: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface ResolvedPartnerPrice {
  rule_id: number;
  product_id: number;
  variant_id: number | null;
  minimum_qty: number;
  normal_price: number;
  resolved_price: number;
  special_price: number | null;
  discount_percent: number | null;
}

export interface DuplicateCustomerCandidate {
  id: number;
  code: string;
  display_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  party_kind: PartyKind;
  status_code: string;
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  kind?: Exclude<PartyKind, 'internal'>;
  relationship?: 'customer' | 'partner';
  status?: PartyStatus;
  hasActiveOrder?: boolean;
  salesChannelId?: number;
  sortBy?: 'name' | 'last_order' | 'order_value' | 'order_count' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerFormData {
  party_kind: Exclude<PartyKind, 'internal'>;
  display_name: string;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  tax_id?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  notes?: string | null;
  status_code?: PartyStatus;
  confirm_duplicate?: boolean;
}

export interface CustomerDetailResponse {
  customer: CraftCustomer;
  contacts: PartyContact[];
  orders: PaginatedResult<CustomerOrderSummary>;
  commercial: CustomerCommercialSummary;
  price_rules: PartnerPriceRule[];
}

export interface PaginatedResult<T> { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }


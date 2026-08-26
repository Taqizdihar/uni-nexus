export type PartyKind = 'individual' | 'company' | 'institution' | 'internal';
export type CustomerStatus = 'active' | 'inactive';
export type CustomerRelationship = 'customer' | 'partner';

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  kind?: PartyKind;
  relationship?: CustomerRelationship;
  status?: CustomerStatus;
  hasActiveOrder?: boolean;
  salesChannelId?: number;
  sortBy?: 'name' | 'last_order' | 'order_value' | 'order_count' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  partnersOnly?: boolean;
}

export interface CustomerCreateInput {
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
  status_code?: CustomerStatus;
  confirm_duplicate?: boolean;
}

export type CustomerUpdateInput = Partial<Omit<CustomerCreateInput, 'confirm_duplicate' | 'party_kind'>> & { party_kind?: PartyKind };

export interface ContactInput {
  full_name: string;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  is_primary?: boolean;
  notes?: string | null;
}

export interface PartnerInput {
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface PartnerPriceRuleInput {
  product_id: number;
  variant_id?: number | null;
  minimum_qty: number;
  special_price?: number | null;
  discount_percent?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

export type PartnerPriceRuleUpdateInput = Partial<Omit<PartnerPriceRuleInput, 'product_id'>>;

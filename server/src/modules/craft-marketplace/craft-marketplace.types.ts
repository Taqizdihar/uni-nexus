export type MarketplaceChannelType = 'marketplace' | 'direct' | 'partner' | 'internal';
export type MarketplaceFeeType = 'percentage' | 'fixed' | 'mixed';
export type SettlementStatus = 'pending' | 'received' | 'reconciled';

export interface ImportColumnMapping {
  external_order_id: string;
  order_date: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  recipient_name?: string;
  recipient_phone?: string;
  shipping_address?: string;
  courier?: string;
  deadline?: string;
  external_product_id?: string;
  external_sku?: string;
  item_name: string;
  quantity: string;
  unit_price: string;
  item_discount?: string;
  order_discount?: string;
  shipping_amount?: string;
  marketplace_fee?: string;
  tax?: string;
  external_order_total?: string;
}

export interface NormalizedImportItem {
  row_number: number;
  external_product_id: string | null;
  external_sku: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  item_discount: number;
  product_id: number | null;
  variant_id: number | null;
  mapping_status: 'mapped' | 'unmapped';
}

export interface NormalizedImportOrder {
  external_order_id: string;
  order_date: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  shipping_address: string | null;
  courier: string | null;
  deadline: string | null;
  order_discount: number;
  shipping_amount: number;
  marketplace_fee: number;
  tax: number;
  external_order_total: number | null;
  rows: NormalizedImportItem[];
  duplicate: boolean;
  errors: Array<{ row_number?: number; message: string }>;
  customer: { status: 'matched' | 'new' | 'ambiguous' | 'needs_resolution'; candidate_ids: number[]; party_id?: number };
}

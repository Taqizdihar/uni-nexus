export type SalesChannelType = 'marketplace' | 'direct' | 'partner' | 'internal';
export type IntegrationStatus = 'not_connected' | 'connected' | 'error' | 'disabled' | 'planned';
export type SettlementStatus = 'pending' | 'received' | 'reconciled';

export interface MarketplaceChannel {
  id: number;
  code: string;
  name: string;
  channel_type: SalesChannelType;
  external_url: string | null;
  is_integrated: boolean | number;
  is_active: boolean | number;
  order_count?: number;
  month_order_value?: number;
  connected_api_count?: number;
  last_api_sync?: string | null;
}

export interface MarketplaceOverview {
  kpis: {
    active_channels: number;
    marketplace_channels: number;
    connected_apis: number;
    marketplace_orders_this_month: number;
    unmapped_products: number;
    unreconciled_settlements: number;
  };
  channels: MarketplaceChannel[];
}

export interface ProductMapping {
  id: number;
  sales_channel_id: number;
  product_id: number;
  variant_id: number | null;
  external_product_id: string | null;
  external_sku: string | null;
  external_url: string | null;
  sync_status_code: string;
  last_synced_at: string | null;
  channel_name: string;
  channel_code: string;
  product_name: string;
  product_sku: string;
  variant_name: string | null;
  variant_sku: string | null;
}

export interface MarketplaceFeeRule {
  id: number;
  sales_channel_id: number;
  channel_name: string;
  name: string;
  fee_type: 'percentage' | 'fixed' | 'mixed';
  percentage_rate: number;
  fixed_amount: number;
  applies_to: string;
  effective_from: string;
  effective_until: string | null;
  is_active: boolean | number;
}

export interface ImportItemPreview {
  row_number: number;
  external_product_id: string | null;
  external_sku: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  mapping_status: 'mapped' | 'unmapped';
  product_id: number | null;
  variant_id: number | null;
}

export interface ImportOrderPreview {
  external_order_id: string;
  customer_name: string | null;
  duplicate: boolean;
  errors: Array<{ row_number?: number; message: string }>;
  customer: { status: 'matched' | 'new' | 'ambiguous' | 'needs_resolution'; candidate_ids: number[]; party_id?: number };
  rows: ImportItemPreview[];
}

export interface ImportPreview {
  import_token: string;
  expires_at: string;
  headers: string[];
  column_mapping: Record<string, string>;
  summary: {
    orders_detected: number;
    rows_detected: number;
    valid_orders: number;
    duplicate_orders: number;
    new_customers: number;
    matched_customers: number;
    ambiguous_customers: number;
    mapped_products: number;
    unmapped_products: number;
    validation_errors: Array<{ row_number?: number; message: string }>;
  };
  orders: ImportOrderPreview[];
}

export interface MarketplaceIntegration {
  id: number;
  sales_channel_id: number;
  integration_code: string;
  provider_name: string;
  display_name: string;
  status_code: IntegrationStatus;
  config_json: Record<string, unknown>;
  mode: 'api' | 'manual_import';
  connector_available: boolean;
  api_status: 'connected' | 'not_configured';
  message: string;
  last_sync_at: string | null;
  channel_name: string;
}

export interface MarketplaceSettlement {
  id: number;
  sales_channel_id: number;
  settlement_code: string;
  channel_name: string;
  period_start: string | null;
  period_end: string | null;
  gross_sales: number;
  platform_fees: number;
  vouchers_subsidies: number;
  shipping_adjustments: number;
  other_adjustments: number;
  net_settlement: number;
  treasury_account_id: number | null;
  financial_transaction_id: number | null;
  status_code: SettlementStatus;
  external_reference: string | null;
  notes: string | null;
  item_count: number;
  matched_item_count: number;
}

export interface SettlementDetail {
  settlement: MarketplaceSettlement & { treasury_name?: string | null; transaction_code?: string | null };
  items: Array<{ id: number; order_id: number | null; external_order_id: string | null; gross_amount: number; fee_amount: number; adjustment_amount: number; net_amount: number; order_code?: string | null; customer_name?: string | null }>;
  matching: { total: number; matched: number; unmatched: number };
}

export interface SyncLog {
  id: number;
  integration_id: number;
  integration_name: string;
  channel_name: string;
  sync_type: string;
  direction: string;
  status_code: string;
  started_at: string;
  finished_at: string | null;
  records_processed: number;
  records_success: number;
  records_failed: number;
  error_message: string | null;
}

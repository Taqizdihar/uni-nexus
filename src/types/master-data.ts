export const masterDataDatasetKeys = [
  'units', 'payment-methods', 'craft-product-categories', 'craft-material-categories',
  'craft-sales-channels', 'studio-service-categories', 'finance-transaction-categories',
] as const;

export type MasterDataDatasetKey = typeof masterDataDatasetKeys[number];
export type FinanceScope = 'craft' | 'studio' | 'shared';

export type MasterDataCapabilities = { canRead: boolean; canManage: boolean; financeScopes?: FinanceScope[] };
export type MasterDataBase<K extends MasterDataDatasetKey, Details> = {
  id: number; dataset: K; code: string; name: string; scope: string; scope_label: string; is_active: boolean;
  is_protected: boolean; is_code_locked: boolean; usage_total?: number; created_at: string | null; updated_at: string | null;
  capabilities: MasterDataCapabilities; details: Details;
};
export type UnitMasterItem = MasterDataBase<'units', { symbol: string; unit_group: string; decimal_places: number }>;
export type PaymentMethodMasterItem = MasterDataBase<'payment-methods', { method_type: string }>;
export type ProductCategoryMasterItem = MasterDataBase<'craft-product-categories', { parent_id: number | null; parent_name: string | null }>;
export type MaterialCategoryMasterItem = MasterDataBase<'craft-material-categories', { category_type: string }>;
export type SalesChannelMasterItem = MasterDataBase<'craft-sales-channels', { channel_type: string; external_url: string | null; is_integrated: boolean }>;
export type ServiceCategoryMasterItem = MasterDataBase<'studio-service-categories', Record<string, never>>;
export type TransactionCategoryMasterItem = MasterDataBase<'finance-transaction-categories', { transaction_type: string; default_coa_account_id: number | null; coa_code: string | null; coa_name: string | null; business_unit_name: string | null }>;
export type MasterDataItem = UnitMasterItem | PaymentMethodMasterItem | ProductCategoryMasterItem | MaterialCategoryMasterItem | SalesChannelMasterItem | ServiceCategoryMasterItem | TransactionCategoryMasterItem;

export type MasterDataDatasetMeta = { key: MasterDataDatasetKey; name: string; description: string; group: string; group_label: string; scope: string; scope_label: string; capabilities: MasterDataCapabilities };
export type MasterDataMeta = {
  datasets: MasterDataDatasetMeta[]; groups: Record<string, string>;
  enums: { unit_groups: string[]; payment_method_types: string[]; material_category_types: string[]; sales_channel_types: string[]; transaction_types: string[] };
  active_units: Array<{ id: number; code: string; name: string; symbol: string; unit_group: string }>;
  finance_scopes: FinanceScope[];
  chart_of_accounts: Array<{ id: number; account_code: string; account_name: string; business_unit_id: number | null }>;
};
export type MasterDataOverviewDataset = { key: MasterDataDatasetKey; name: string; description: string; group: string; group_label: string; scope: string; scope_label: string; row_count: number; active_count: number; inactive_count: number; can_read: boolean; can_manage: boolean; last_updated_at: string | null };
export type MasterDataOverview = { dataset_count: number; total_reference_rows: number; active_rows: number; inactive_rows: number; datasets: MasterDataOverviewDataset[]; groups: Array<{ key: string; label: string; datasets: MasterDataOverviewDataset[] }> };
export type MasterDataUsage = { usage_total: number; usage_breakdown: Array<{ source: string; label: string; count: number }>; deactivation_allowed: boolean; blocking_reason: string | null };
export type MasterDataList = { items: MasterDataItem[]; pagination: { total: number; page: number; limit: number; total_pages: number } };
export type MasterDataFilters = { q?: string; status?: 'active' | 'inactive' | 'all'; page?: number; limit?: number; unit_group?: string; channel_type?: string; transaction_type?: string; business_unit?: FinanceScope; parent_id?: number | null };

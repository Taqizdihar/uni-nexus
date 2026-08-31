export const masterDataDatasetKeys = [
  'units',
  'payment-methods',
  'craft-product-categories',
  'craft-material-categories',
  'craft-sales-channels',
  'studio-service-categories',
  'finance-transaction-categories',
] as const;

export type MasterDataDatasetKey = typeof masterDataDatasetKeys[number];
export type MasterDataGroup = 'general' | 'craft' | 'studio' | 'finance';
export type MasterDataScope = 'system' | 'craft' | 'studio' | 'finance';
export type FinanceScope = 'craft' | 'studio' | 'shared';

export type MasterDataActor = {
  id: number;
  organizationId: number;
  permissions: string[];
  ip?: string | null;
  userAgent?: string | null;
};

export type AccessibleBusinessUnit = {
  id: number;
  code: 'CRAFT' | 'STUDIO' | 'SHARED';
  name: string;
};

export type DatasetCapabilities = {
  canRead: boolean;
  canManage: boolean;
  financeScopes?: FinanceScope[];
};

export type MasterDataAccess = {
  actor: MasterDataActor;
  businessUnits: AccessibleBusinessUnit[];
  datasetCapabilities: Record<MasterDataDatasetKey, DatasetCapabilities>;
};

export type MasterDataListFilters = {
  q?: string;
  status: 'active' | 'inactive' | 'all';
  page: number;
  limit: number;
  unitGroup?: string;
  channelType?: string;
  transactionType?: string;
  businessUnit?: FinanceScope;
  parentId?: number | null;
};

export type MasterDataUsage = {
  usage_total: number;
  usage_breakdown: Array<{ source: string; label: string; count: number }>;
  deactivation_allowed: boolean;
  blocking_reason: string | null;
};

export type MasterDataItem = {
  id: number;
  dataset: MasterDataDatasetKey;
  code: string;
  name: string;
  scope: MasterDataScope | FinanceScope;
  scope_label: string;
  is_active: boolean;
  is_protected: boolean;
  is_code_locked: boolean;
  usage_total?: number;
  created_at: string | null;
  updated_at: string | null;
  capabilities: DatasetCapabilities;
  details: Record<string, unknown>;
};

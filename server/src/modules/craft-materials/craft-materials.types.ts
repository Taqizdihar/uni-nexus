import type { PoolConnection } from 'mysql2/promise';

export type MaterialCategoryType = 'filament' | 'resin' | 'hardware' | 'packaging' | 'consumable' | 'other';

export interface MaterialActor {
  id: number;
  organizationId: number;
  businessUnitId: number;
}

export type DbConnection = PoolConnection;

export interface MaterialInput {
  category_id: number;
  sku?: string | null;
  name: string;
  brand?: string | null;
  material_type?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  base_unit_id: number;
  default_unit_cost?: number;
  low_stock_threshold?: number;
  reorder_qty?: number;
  preferred_supplier_id?: number | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface MaterialFilters {
  search?: string;
  categoryType?: MaterialCategoryType;
  status?: 'active' | 'inactive' | 'all';
}

export interface ReceiveStockInput {
  batch_code?: string | null;
  quantity: number;
  unit_cost?: number;
  supplier_id?: number | null;
  received_at?: string | null;
  expiry_date?: string | null;
  location_code?: string | null;
  notes?: string | null;
  create_spool?: boolean;
  spool_code?: string | null;
  diameter_mm?: number;
  nominal_net_weight_g?: number | null;
  tare_weight_g?: number | null;
  storage_location?: string | null;
}

export interface StockAdjustmentInput {
  material_batch_id: number;
  direction: 'in' | 'out';
  quantity: number;
  spool_id?: number | null;
  notes: string;
}

export interface SpoolUpdateInput {
  current_net_weight_g?: number | null;
  storage_location?: string | null;
  notes?: string | null;
  opened?: boolean;
  dried?: boolean;
}

export interface WasteInput {
  material_id: number;
  material_batch_id: number;
  quantity: number;
  waste_reason: 'support' | 'purge' | 'calibration' | 'scrap' | 'other';
  notes?: string | null;
}

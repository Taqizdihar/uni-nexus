import type { PoolConnection } from 'mysql2/promise';

export type DbConnection = PoolConnection;

export type ProductType = 'premade' | 'customizable' | 'custom_service';

export interface CraftProductFilters {
  search?: string;
  categoryId?: number;
  productType?: ProductType;
  status?: 'active' | 'inactive' | 'all';
}

export interface ProductInput {
  sku?: string | null;
  name: string;
  category_id?: number | null;
  description?: string | null;
  product_type: ProductType;
  base_selling_price?: number;
  estimated_cost?: number;
  estimated_weight_g?: number | null;
  estimated_print_minutes?: number | null;
  default_margin_percent?: number | null;
}

export interface ProductUpdateInput extends Partial<ProductInput> {}

export interface CategoryInput {
  code?: string | null;
  name: string;
  parent_id?: number | null;
  is_active?: boolean;
}

export interface VariantInput {
  sku?: string | null;
  name: string;
  attributes?: Record<string, string> | null;
  selling_price?: number | null;
  estimated_cost?: number | null;
  estimated_weight_g?: number | null;
  estimated_print_minutes?: number | null;
  is_active?: boolean;
}

export interface BomItemInput {
  material_id: number;
  quantity: number;
  unit_id: number;
  waste_factor_percent?: number;
  is_optional?: boolean;
  notes?: string | null;
}

export interface BomInput {
  name: string;
  variant_id?: number | null;
  notes?: string | null;
  items: BomItemInput[];
}

export interface BomUpdateInput {
  name?: string;
  notes?: string | null;
  items?: BomItemInput[];
}

export interface PrintProfileInput {
  product_id?: number | null;
  variant_id?: number | null;
  printer_id?: number | null;
  name: string;
  slicer_name?: string | null;
  nozzle_diameter_mm?: number | null;
  layer_height_mm?: number | null;
  infill_percent?: number | null;
  support_enabled?: boolean | null;
  estimated_print_minutes?: number | null;
  estimated_material_qty?: number | null;
  estimated_material_unit_id?: number | null;
  settings_json?: Record<string, unknown> | null;
  is_default?: boolean;
}

export interface DesignInput {
  product_id?: number | null;
  variant_id?: number | null;
  name: string;
  version_label?: string | null;
  is_final?: boolean;
  notes?: string | null;
}

export interface DesignUpdateInput {
  product_id?: number | null;
  variant_id?: number | null;
  name?: string;
  version_label?: string | null;
  is_final?: boolean;
  notes?: string | null;
}

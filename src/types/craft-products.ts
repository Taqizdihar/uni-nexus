export type ProductType = 'premade' | 'customizable' | 'custom_service';
export type ProductStatus = 'active' | 'inactive' | 'all';
export type ProductVariantAttributes = Record<string, string>;

export interface ProductCosting {
  product_id: number;
  selling_price: number;
  entered_estimated_cost: number;
  bom_id: number | null;
  bom_name: string | null;
  calculated_bom_cost: number | null;
  effective_cost: number | null;
  cost_available: boolean;
  margin_percent: number | null;
  target_margin_percent: number | null;
  suggested_selling_price: number | null;
}

export interface ProductReadiness {
  checks: { active: boolean; price: boolean; bom: boolean; design: boolean; print_profile: boolean };
  warnings: string[];
  ready: boolean;
}

export interface CraftProductSummary {
  id: number;
  business_unit_id: number;
  category_id: number | null;
  sku: string;
  name: string;
  description: string | null;
  product_type: ProductType;
  base_selling_price: number;
  estimated_cost: number;
  estimated_weight_g: number | null;
  estimated_print_minutes: number | null;
  default_margin_percent: number | null;
  image_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category_name: string | null;
  category_code: string | null;
  active_variant_count: number;
  active_bom_count: number;
  design_file_count: number;
  print_profile_count: number;
  bom_cost?: number | null;
  costing: ProductCosting;
  readiness: ProductReadiness;
}

export interface CraftProduct extends Omit<CraftProductSummary, 'costing' | 'readiness' | 'active_variant_count'> {
  active_bom_count: number;
  design_file_count: number;
  print_profile_count: number;
}

export interface ProductCategory {
  id: number;
  business_unit_id: number;
  code: string;
  name: string;
  parent_id: number | null;
  parent_name: string | null;
  is_active: boolean;
  product_count: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  name: string;
  attributes: ProductVariantAttributes | null;
  selling_price: number | null;
  estimated_cost: number | null;
  estimated_weight_g: number | null;
  estimated_print_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DesignFile {
  id: number;
  business_unit_id: number;
  product_id: number | null;
  variant_id: number | null;
  design_code: string;
  name: string;
  file_type: string;
  file_name: string;
  version_label: string | null;
  file_size_bytes: number | null;
  checksum_sha256?: string | null;
  is_final: boolean;
  uploaded_at: string;
  notes: string | null;
  product_name: string | null;
  variant_name: string | null;
  uploaded_by_name: string | null;
}

export interface PrintProfile {
  id: number;
  business_unit_id: number;
  product_id: number | null;
  variant_id: number | null;
  printer_id: number | null;
  name: string;
  slicer_name: string | null;
  nozzle_diameter_mm: number | null;
  layer_height_mm: number | null;
  infill_percent: number | null;
  support_enabled: boolean | null;
  estimated_print_minutes: number | null;
  estimated_material_qty: number | null;
  estimated_material_unit_id: number | null;
  estimated_material_unit_code?: string | null;
  settings_json: Record<string, unknown> | null;
  is_default: boolean;
  product_name?: string | null;
  variant_name?: string | null;
  printer_name?: string | null;
}

export interface ProductBomItem {
  id: number;
  bom_id: number;
  material_id: number;
  quantity: number;
  unit_id: number;
  waste_factor_percent: number;
  is_optional: boolean;
  notes: string | null;
  material_sku: string;
  material_name: string;
  default_unit_cost: number;
  unit_code: string;
  unit_symbol: string;
  estimated_line_cost: number;
}

export interface ProductBom {
  id: number;
  product_id: number;
  variant_id: number | null;
  variant_name: string | null;
  version_no: number;
  name: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: ProductBomItem[];
}

export interface ProductUsageSummary {
  order_count: number;
  last_order_at: string | null;
  print_job_count: number;
  last_print_job_at: string | null;
}

export interface ProductDetailResponse {
  product: CraftProduct;
  variants: ProductVariant[];
  boms: ProductBom[];
  design_files: DesignFile[];
  print_profiles: PrintProfile[];
  costing: ProductCosting;
  readiness: ProductReadiness;
  usage: ProductUsageSummary;
}

export interface ProductPayload {
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

export interface VariantPayload {
  sku?: string | null;
  name: string;
  attributes?: ProductVariantAttributes | null;
  selling_price?: number | null;
  estimated_cost?: number | null;
  estimated_weight_g?: number | null;
  estimated_print_minutes?: number | null;
  is_active?: boolean;
}

export interface BomPayload {
  name: string;
  variant_id?: number | null;
  notes?: string | null;
  items: Array<{ material_id: number; quantity: number; unit_id: number; waste_factor_percent?: number; is_optional?: boolean; notes?: string | null }>;
}

export interface PrintProfilePayload {
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

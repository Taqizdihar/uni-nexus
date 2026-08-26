export type MaterialCategoryType = 'filament' | 'resin' | 'hardware' | 'packaging' | 'consumable' | 'other';
export type MaterialStockStatus = 'normal' | 'low_stock' | 'out_of_stock';

export interface MaterialCategory { id: number; business_unit_id: number; code: string; name: string; category_type: MaterialCategoryType; is_active: boolean; product_count: number; }
export interface UnitOfMeasure { id: number; code: string; name: string; symbol: string; unit_group: string; decimal_places: number; }
export interface SupplierReference { id: number; code: string; display_name: string; legal_name: string | null; }

export interface CraftMaterial {
  id: number; business_unit_id: number; category_id: number; sku: string; name: string; brand: string | null; material_type: string | null;
  color_name: string | null; color_hex: string | null; base_unit_id: number; default_unit_cost: number; low_stock_threshold: number; reorder_qty: number;
  preferred_supplier_id: number | null; notes: string | null; is_active: boolean; created_at: string; updated_at: string;
  category_code: string; category_name: string; category_type: MaterialCategoryType; unit_code: string; unit_symbol: string;
  total_qty: number; reserved_qty: number; available_qty: number; stock_status: MaterialStockStatus; active_spool_count: number; estimated_stock_value: number;
}

export interface MaterialBatch {
  id: number; material_id: number; batch_code: string; supplier_id: number | null; supplier_name?: string | null; received_at: string | null;
  initial_qty: number; current_qty: number; reserved_qty: number; unit_cost: number; expiry_date: string | null; location_code: string | null; status_code: string; created_at: string; updated_at: string;
}
export interface FilamentSpool {
  id: number; material_batch_id: number; spool_code: string; diameter_mm: number; nominal_net_weight_g: number | null; tare_weight_g: number | null;
  current_net_weight_g: number | null; opened_at: string | null; dried_at: string | null; storage_location: string | null; notes: string | null;
  batch_code: string; batch_current_qty: number; material_id?: number; material_sku?: string; material_name?: string; brand?: string | null;
  material_type?: string | null; color_name?: string | null; color_hex?: string | null; unit_code?: string; unit_symbol?: string;
}
export interface StockReservation { id: number; material_id: number; material_batch_id: number | null; quantity: number; unit_id: number; reference_type: string; reference_id: number; status_code: string; reserved_at: string; released_at: string | null; batch_code: string | null; unit_symbol: string; job_code: string | null; }
export interface InventoryMovement { id: number; material_id: number; material_batch_id: number | null; movement_type: string; quantity: number; unit_id: number; unit_cost: number | null; total_cost: number | null; reference_type: string | null; reference_code: string | null; notes: string | null; occurred_at: string; material_sku: string; material_name: string; color_name: string | null; color_hex: string | null; batch_code: string | null; unit_symbol: string; created_by_name: string | null; }
export interface MaterialWaste { id: number; material_id: number; material_batch_id: number | null; quantity: number; unit_id: number; waste_reason: string; print_job_id: number | null; notes: string | null; occurred_at: string; material_sku: string; material_name: string; color_name: string | null; color_hex: string | null; batch_code: string | null; unit_symbol: string; job_code: string | null; created_by_name: string | null; }
export interface MaterialDetail { material: CraftMaterial; batches: MaterialBatch[]; spools: FilamentSpool[]; reservations: StockReservation[]; movements: InventoryMovement[]; waste: MaterialWaste[]; }

export interface MaterialPayload { category_id: number; sku?: string | null; name: string; brand?: string | null; material_type?: string | null; color_name?: string | null; color_hex?: string | null; base_unit_id: number; default_unit_cost?: number; low_stock_threshold?: number; reorder_qty?: number; preferred_supplier_id?: number | null; notes?: string | null; is_active?: boolean; }
export interface ReceiveStockPayload { batch_code?: string | null; quantity: number; unit_cost?: number; supplier_id?: number | null; received_at?: string | null; expiry_date?: string | null; location_code?: string | null; notes?: string | null; create_spool?: boolean; spool_code?: string | null; diameter_mm?: number; nominal_net_weight_g?: number | null; tare_weight_g?: number | null; storage_location?: string | null; }

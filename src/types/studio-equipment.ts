export type StudioAssetStatus = 'available' | 'in_use' | 'maintenance' | 'borrowed' | 'retired' | 'lost';
export type AssetAssignmentState = 'upcoming' | 'active' | 'overdue' | 'returned';
export type MaintenanceDueState = 'overdue' | 'due_soon' | 'scheduled' | 'unscheduled';

export interface StudioAsset {
  id: number; business_unit_id: number; asset_code: string; name: string; category: string; brand: string | null; model: string | null; serial_number: string | null;
  status_code: StudioAssetStatus; purchase_date: string | null; purchase_cost: number | null; current_book_value: number | null; depreciation_method: string | null; useful_life_months: number | null;
  location_name: string | null; assigned_user_id: number | null; notes: string | null; created_at: string; updated_at: string;
  custodian_name?: string | null; current_assignment_id?: number | null; current_project_id?: number | null; current_project_code?: string | null; current_project_name?: string | null;
  current_assigned_from?: string | null; current_assigned_until?: string | null; next_assignment_id?: number | null; next_project_id?: number | null; next_project_code?: string | null; next_project_name?: string | null; next_assigned_from?: string | null; next_assigned_until?: string | null;
  latest_maintenance_id?: number | null; latest_maintenance_type?: string | null; last_maintenance_at?: string | null; next_due_at?: string | null; maintenance_due_state?: MaintenanceDueState; is_effectively_in_use?: boolean;
}
export interface StudioEquipmentOverview {
  total_assets: number; active_assets: number; available_assets: number; in_use_assets: number; maintenance_assets: number; borrowed_assets: number; retired_assets: number; lost_assets: number;
  active_assignments: number; overdue_returns: number; upcoming_bookings: number; maintenance_overdue: number; maintenance_due_soon: number; purchase_value: number; book_value: number;
  recent_activity: StudioAssetActivity[];
}
export interface StudioAssetActivity { id: number; action_code: string; description: string | null; created_at: string; user_name: string | null; old_values?: string | null; new_values?: string | null; }
export interface StudioAssetAssignment { id: number; asset_id: number; project_id: number; assigned_from: string; assigned_until: string | null; returned_at: string | null; assigned_by: number | null; notes: string | null; assignment_state: AssetAssignmentState; asset_code: string; asset_name: string; category: string; asset_status: StudioAssetStatus; project_code: string; project_name: string; project_status: string; client_name: string | null; assigned_by_name: string | null; }
export interface StudioAssetMaintenanceRecord { id: number; asset_id: number; maintenance_type: string; performed_at: string; performed_by_party_id: number | null; cost: number; next_due_at: string | null; notes: string | null; created_at: string; asset_code: string; asset_name: string; category: string; asset_status: StudioAssetStatus; provider_code: string | null; provider_name: string | null; maintenance_state: MaintenanceDueState; }
export interface PaginatedAssets { items: StudioAsset[]; meta: { page: number; limit: number; total: number; totalPages: number }; }
export interface PaginatedAssignments { items: StudioAssetAssignment[]; meta: { page: number; limit: number; total: number; totalPages: number }; }
export interface StudioAssetFilters { page?: number; limit?: number; search?: string; status?: StudioAssetStatus | ''; category?: string; assigned_user_id?: number; location?: string; maintenance_due?: MaintenanceDueState | ''; assignment_state?: AssetAssignmentState | 'none' | ''; sort_by?: string; sort_order?: 'asc' | 'desc'; }
export interface EquipmentReferences { projects: Array<{ id: number; project_code: string; project_name: string; status_code: string; start_date: string | null; deadline_at: string | null; client_name: string }>; users: Array<{ id: number; full_name: string; employee_code: string | null; role_name: string | null }>; external_parties: Array<{ id: number; code: string; display_name: string; party_kind: string; email: string | null; phone: string | null }>; categories: string[]; locations: string[]; depreciation_methods: string[]; }
export interface AssetInput { name: string; category: string; brand?: string | null; model?: string | null; serial_number?: string | null; initial_status?: 'available' | 'maintenance' | 'borrowed'; purchase_date?: string | null; purchase_cost?: number | null; current_book_value?: number | null; depreciation_method?: string | null; useful_life_months?: number | null; location_name?: string | null; assigned_user_id?: number | null; notes?: string | null; }
export interface AvailabilityResult { id: number; asset_code: string; name: string; category: string; brand: string | null; model: string | null; status_code: StudioAssetStatus; location_name: string | null; assigned_user_id: number | null; custodian_name: string | null; }

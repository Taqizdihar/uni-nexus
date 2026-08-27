export type StudioAssetStatus = 'available' | 'in_use' | 'maintenance' | 'borrowed' | 'retired' | 'lost';
export type AssetAssignmentState = 'upcoming' | 'active' | 'overdue' | 'returned';
export type MaintenanceDueState = 'overdue' | 'due_soon' | 'scheduled' | 'unscheduled';

export const ASSET_STATUSES: StudioAssetStatus[] = ['available', 'in_use', 'maintenance', 'borrowed', 'retired', 'lost'];
export const OPERATIONAL_PROJECT_STATUSES = ['approved', 'in_progress', 'review'];

export interface AssetListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  assignedUserId?: number;
  location?: string;
  maintenanceDue?: string;
  assignmentState?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AssignmentListFilters {
  page?: number;
  limit?: number;
  state?: string;
  assetId?: number;
  projectId?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface MaintenanceListFilters {
  assetId?: number;
  category?: string;
  providerId?: number;
  state?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AssetCreateInput {
  name: string;
  category: string;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  initial_status?: Extract<StudioAssetStatus, 'available' | 'maintenance' | 'borrowed'>;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  current_book_value?: number | null;
  depreciation_method?: string | null;
  useful_life_months?: number | null;
  location_name?: string | null;
  assigned_user_id?: number | null;
  notes?: string | null;
}

export interface AssetUpdateInput extends Omit<Partial<AssetCreateInput>, 'initial_status'> {}

export interface AssetAssignmentInput {
  project_id: number;
  assigned_from: string;
  assigned_until?: string | null;
  notes?: string | null;
}

export interface AssetMaintenanceInput {
  maintenance_type: string;
  performed_at: string;
  performed_by_party_id?: number | null;
  cost?: number;
  next_due_at?: string | null;
  notes?: string | null;
}

import type { PoolConnection } from 'mysql2/promise';

export type DbConnection = PoolConnection;
export type PrinterStatus = 'available' | 'busy' | 'maintenance' | 'error' | 'offline';
export type PrinterType = 'FDM' | 'SLA' | 'SLS' | 'other';
export type MaintenanceTrigger = 'date' | 'print_hours' | 'job_count';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface PrinterInput {
  code?: string | null;
  name: string;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  printer_type?: PrinterType;
  nozzle_diameter_mm?: number | null;
  build_volume_x_mm?: number | null;
  build_volume_y_mm?: number | null;
  build_volume_z_mm?: number | null;
  location_name?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  warranty_until?: string | null;
  notes?: string | null;
  initial_status?: 'available' | 'offline';
}
export type PrinterUpdateInput = Partial<Omit<PrinterInput, 'initial_status'>>;

export interface PrinterFilters { search?: string; status?: PrinterStatus; printerType?: PrinterType; location?: string; archived?: boolean; }
export interface HistoryFilters { search?: string; printerId?: number; status?: string; operatorId?: number; dateFrom?: string; dateTo?: string; }
export interface ScheduleInput { printer_id: number; maintenance_type: string; trigger_type: MaintenanceTrigger; interval_value: number; next_due_at?: string | null; notes?: string | null; is_active?: boolean; }
export interface ScheduleUpdateInput { maintenance_type?: string; trigger_type?: MaintenanceTrigger; interval_value?: number; next_due_at?: string | null; notes?: string | null; is_active?: boolean; }
export interface CompleteMaintenanceInput { maintenance_type: string; schedule_id?: number | null; performed_at?: string | null; performed_by?: number | null; cost?: number; notes?: string | null; }
export interface IssueInput { printer_id: number; title: string; severity_code: IssueSeverity; description?: string | null; assigned_to?: number | null; }
export interface IssueUpdateInput { status_code?: IssueStatus; assigned_to?: number | null; severity_code?: IssueSeverity; title?: string; description?: string | null; resolution_notes?: string | null; }

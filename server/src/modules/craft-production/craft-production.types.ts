import type { PoolConnection } from 'mysql2/promise';

export type DbConnection = PoolConnection;

export type PrintJobStatus =
  | 'queued'
  | 'ready'
  | 'printing'
  | 'paused'
  | 'qc'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface CraftContext {
  id: number;
  organizationId: number;
  code: string;
}

export interface PlannedMaterialInput {
  material_id: number;
  material_batch_id?: number | null;
  planned_qty: number;
  unit_id: number;
  reserve?: boolean;
}

export interface CreatePrintJobInput {
  queue_item_id?: number | null;
  product_id?: number | null;
  variant_id?: number | null;
  printer_id: number;
  job_name: string;
  quantity: number;
  operator_user_id?: number | null;
  scheduled_start_at?: string | null;
  print_profile_id?: number | null;
  design_file_id?: number | null;
  estimated_print_minutes?: number | null;
  estimated_material_g?: number | null;
  notes?: string | null;
  materials: PlannedMaterialInput[];
}

export interface UpdatePrintJobPlanningInput {
  job_name?: string;
  printer_id?: number;
  operator_user_id?: number | null;
  scheduled_start_at?: string | null;
  print_profile_id?: number | null;
  design_file_id?: number | null;
  estimated_print_minutes?: number | null;
  estimated_material_g?: number | null;
  notes?: string | null;
  materials?: PlannedMaterialInput[];
}

export interface OrderAttachmentReference {
  id: number;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  attachment_type: string;
  uploaded_at: Date | string;
  uploaded_by_name: string | null;
}

export interface ActualMaterialInput {
  print_job_material_id?: number;
  material_id: number;
  material_batch_id?: number | null;
  actual_qty: number;
  unit_id: number;
}

export interface FinishPrintInput {
  actual_print_minutes?: number | null;
  actual_material_g?: number | null;
  notes?: string | null;
  materials: ActualMaterialInput[];
}

export interface FailPrintInput {
  failure_type: 'spaghetti' | 'layer_shift' | 'warping' | 'adhesion' | 'filament' | 'power' | 'human_error' | 'other';
  failure_stage: string;
  description: string;
  material_wasted_qty?: number | null;
  material_id?: number | null;
  batch_id?: number | null;
  estimated_loss?: number | null;
  requires_reprint: boolean;
  printer_has_issue: boolean;
}

export interface QcInspectionInput {
  template_id?: number | null;
  result_code: 'pass' | 'fail' | 'conditional';
  notes?: string | null;
  requires_reprint?: boolean;
  items: Array<{
    template_item_id?: number | null;
    item_label: string;
    value_text?: string | null;
    passed?: boolean | null;
    notes?: string | null;
  }>;
}

export interface ProductionFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  statuses?: string[];
  printerId?: number;
  operatorId?: number;
  priority?: string;
  orderId?: number;
  deadlineRisk?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FailureFilters {
  page?: number;
  limit?: number;
  failureType?: string;
  printerId?: number;
  dateFrom?: string;
  dateTo?: string;
  requiresReprint?: boolean;
}

export interface JobSource {
  queue_item_id: number | null;
  order_id: number | null;
  order_item_id: number | null;
  product_id: number | null;
  variant_id: number | null;
  item_name?: string | null;
  item_quantity?: number | null;
  item_estimated_print_minutes?: number | null;
  item_estimated_material_g?: number | null;
  item_print_profile_id?: number | null;
}

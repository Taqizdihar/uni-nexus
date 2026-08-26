import type { AttachmentSummary, PriorityCode } from './craft-orders';

export type ProductionJobStatus = 'queued' | 'ready' | 'printing' | 'paused' | 'qc' | 'completed' | 'failed' | 'cancelled';
export type ProductionBoardStatus = Extract<ProductionJobStatus, 'queued' | 'ready' | 'printing' | 'paused' | 'qc' | 'completed'>;
export type ProductionQueueStatus = 'queued' | 'scheduled' | 'printing' | 'completed' | 'cancelled';
export type DeadlineRisk = 'on_track' | 'at_risk' | 'late' | 'unknown';
export type PrinterStatus = 'available' | 'busy' | 'maintenance' | 'error' | 'offline' | string;
export type ProgressSource = 'manual' | 'estimated' | 'none';
export type QcResult = 'pending' | 'pass' | 'fail' | 'conditional';
export type FailureType = 'spaghetti' | 'layer_shift' | 'warping' | 'adhesion' | 'filament' | 'power' | 'human_error' | 'other';
export type CalendarView = 'day' | 'week';

export interface ProductionJob {
  id: number;
  job_code: string;
  job_name: string;
  status_code: ProductionJobStatus;
  queue_item_id: number | null;
  order_id: number | null;
  order_code: string | null;
  order_item_id: number | null;
  item_name: string;
  customer_name: string | null;
  sales_channel_name: string | null;
  product_id?: number | null;
  variant_id?: number | null;
  quantity: number;
  priority_code: PriorityCode;
  priority_score: number;
  deadline_at: string | null;
  deadline_risk: DeadlineRisk;
  printer_id: number | null;
  printer_name: string | null;
  printer_status: PrinterStatus | null;
  operator_user_id: number | null;
  operator_name: string | null;
  design_file_id?: number | null;
  design_file_name?: string | null;
  print_profile_id?: number | null;
  print_profile_name?: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at?: string | null;
  estimated_finish_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  estimated_print_minutes: number | null;
  actual_print_minutes: number | null;
  progress_percent: number;
  progress_source: ProgressSource;
  material_summary: string | null;
  estimated_material_qty?: number | null;
  actual_material_qty?: number | null;
  material_unit?: string | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductionBoardCounts {
  queued: number;
  ready: number;
  printing: number;
  paused: number;
  qc: number;
  completed: number;
  failed_today: number;
}

export interface ProductionBoard {
  jobs: ProductionJob[];
}

export interface ActiveProduction {
  jobs: ProductionJob[];
  printers: ActivePrinter[];
  metrics: {
    printing: number;
    paused: number;
    qc: number;
    available_printers: number;
  };
}

export interface ActivePrinter {
  id: number;
  code?: string | null;
  name: string;
  status_code: PrinterStatus;
  current_job: ProductionJob | null;
}

export interface ProductionQueueItem {
  id: number;
  queue_position: number;
  status_code: ProductionQueueStatus;
  order_id: number;
  order_code: string;
  order_item_id: number;
  item_name: string;
  customer_name: string;
  sales_channel_name?: string | null;
  product_id: number | null;
  variant_id: number | null;
  quantity: number;
  planned_quantity: number;
  completed_good_quantity: number;
  remaining_quantity: number;
  priority_code: PriorityCode;
  priority_score: number;
  deadline_at: string | null;
  deadline_risk: DeadlineRisk;
  estimated_material_qty: number | null;
  material_unit: string | null;
  estimated_print_minutes: number | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  notes?: string | null;
  order_attachments?: AttachmentSummary[];
}

export interface ProductionMaterial {
  id: number;
  print_job_id: number;
  material_id: number | null;
  material_name: string;
  batch_id: number | null;
  batch_code: string | null;
  unit_id: number | null;
  unit_code: string | null;
  planned_qty: number | null;
  actual_qty: number | null;
  available_qty: number | null;
  reserved_qty: number | null;
  planned_cost: number | null;
  actual_cost: number | null;
  is_tracked: boolean | number;
  is_reserved?: boolean | number;
  reservation_status?: string | null;
}

export interface ProductionStatusHistoryEntry {
  id: number;
  from_status_code: ProductionJobStatus | null;
  to_status_code: ProductionJobStatus;
  progress_percent: number | null;
  reason: string | null;
  changed_by_name: string | null;
  changed_at: string;
}

export interface ProductionFailure {
  id: number;
  print_job_id: number;
  job_code: string;
  job_name: string;
  order_id: number | null;
  order_code: string | null;
  item_name: string;
  printer_id: number | null;
  printer_name: string | null;
  failure_type: FailureType;
  failure_stage: string;
  description: string | null;
  material_wasted_qty: number | null;
  material_unit: string | null;
  estimated_loss: number | null;
  reported_by_name: string | null;
  requires_reprint: boolean | number;
  reprint_job_id: number | null;
  reprint_job_code: string | null;
  printer_has_issue?: boolean | number;
  failed_at: string;
}

export interface QcChecklistItem {
  id?: number;
  template_item_id: number | null;
  label: string;
  item_label?: string;
  description?: string | null;
  result: 'pass' | 'fail' | 'na' | 'pending';
  passed?: boolean | number | null;
  value_text?: string | null;
  notes: string;
  sort_order?: number;
}

export interface QcInspection {
  id: number | null;
  print_job_id: number;
  template_id: number | null;
  template_name: string | null;
  inspector_user_id: number | null;
  inspector_name: string | null;
  result_code: QcResult;
  notes: string | null;
  inspected_at: string | null;
  items: QcChecklistItem[];
}

export interface QcQueueItem {
  job: ProductionJob;
  inspection: QcInspection | null;
  qc_state: QcResult;
}

export interface ProductionCalendarEntry {
  id: number;
  print_job_id: number;
  job_code: string;
  job_name: string;
  item_name: string;
  order_id: number | null;
  order_code: string | null;
  printer_id: number;
  printer_name: string;
  priority_code: PriorityCode;
  status_code: ProductionJobStatus;
  scheduled_start_at: string;
  scheduled_end_at: string;
  estimated_finish_at: string | null;
  deadline_at: string | null;
  deadline_risk: DeadlineRisk;
}

export interface UnitOption {
  id: number;
  code: string;
  name: string;
}

export interface QcTemplateOption {
  id: number;
  name: string;
  product_id?: number | null;
  is_default?: boolean | number;
  items: Array<{
    id: number;
    label: string;
    description?: string | null;
    sort_order?: number;
  }>;
}

export interface ProductionReferences {
  printers: PrinterOption[];
  operators: OperatorOption[];
  materials: MaterialOption[];
  units: UnitOption[];
  print_profiles: PrintProfileOption[];
  design_files: DesignFileOption[];
  qc_templates: QcTemplateOption[];
  bom_suggestion?: {
    id: number;
    name: string;
    version_no: number;
    variant_id: number | null;
    items: Array<{
      material_id: number;
      unit_id: number;
      quantity: number;
      waste_factor_percent: number;
      planned_qty: number;
      is_optional: boolean | number;
      material_name: string;
      unit_code: string;
    }>;
  } | null;
}

export interface ProductionJobDetail {
  job: ProductionJob;
  materials: ProductionMaterial[];
  history: ProductionStatusHistoryEntry[];
  qc_inspection: QcInspection | null;
  failure: ProductionFailure | null;
  reprint_job?: ProductionJob | null;
  order_attachments?: AttachmentSummary[];
}

export interface PrinterOption {
  id: number;
  code?: string | null;
  name: string;
  model?: string | null;
  status_code: PrinterStatus;
  is_active: boolean | number;
}

export interface OperatorOption {
  id: number;
  full_name: string;
  username?: string;
}

export interface MaterialBatchOption {
  id: number;
  batch_code: string;
  current_qty: number;
  reserved_qty: number;
  available_qty: number;
  unit_code: string;
}

export interface MaterialOption {
  id: number;
  code?: string | null;
  name: string;
  material_type?: string | null;
  color?: string | null;
  available_qty: number | null;
  reserved_qty: number | null;
  unit_id: number | null;
  unit_code: string | null;
  unit_cost: number | null;
  batches: MaterialBatchOption[];
}

export interface PrintProfileOption {
  id: number;
  name: string;
  product_id: number | null;
  variant_id: number | null;
  printer_id: number | null;
  estimated_print_minutes?: number | null;
  estimated_material_qty?: number | null;
  is_default?: boolean | number;
}

export interface DesignFileOption {
  id: number;
  name: string;
  file_name?: string | null;
  product_id: number | null;
  variant_id: number | null;
  file_type?: string | null;
}

export interface ProductionFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductionJobStatus;
  statuses?: ProductionJobStatus[];
  printerId?: number;
  operatorId?: number;
  priority?: PriorityCode;
  orderId?: number;
  deadlineRisk?: DeadlineRisk;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'priority' | 'deadline' | 'schedule' | 'created' | 'started';
  sortOrder?: 'asc' | 'desc';
}

export interface FailureFilters {
  page?: number;
  limit?: number;
  failureType?: FailureType;
  printerId?: number;
  dateFrom?: string;
  dateTo?: string;
  requiresReprint?: boolean;
}

export interface CalendarFilters {
  view: CalendarView;
  date: string;
  printerId?: number;
}

export interface PaginatedProductionResult<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface PlannedMaterialRequest {
  material_id: number;
  material_batch_id?: number | null;
  planned_qty: number;
  unit_id: number;
  reserve?: boolean;
}

export interface CreatePrintJobRequest {
  queue_item_id?: number | null;
  job_name: string;
  quantity: number;
  printer_id: number;
  operator_user_id?: number | null;
  scheduled_start_at?: string | null;
  print_profile_id?: number | null;
  design_file_id?: number | null;
  estimated_print_minutes?: number | null;
  estimated_material_g?: number | null;
  notes?: string | null;
  materials: PlannedMaterialRequest[];
}

export interface UpdatePrintJobRequest {
  job_name?: string;
  printer_id?: number;
  operator_user_id?: number | null;
  scheduled_start_at?: string | null;
  print_profile_id?: number | null;
  design_file_id?: number | null;
  estimated_print_minutes?: number | null;
  estimated_material_g?: number | null;
  notes?: string | null;
  materials?: PlannedMaterialRequest[];
}

export interface ScheduleJobRequest {
  scheduled_start_at: string | null;
  estimated_print_minutes?: number | null;
}

export interface FinishPrintRequest {
  actual_print_minutes?: number | null;
  actual_material_g?: number | null;
  notes?: string | null;
  materials: Array<{
    print_job_material_id?: number;
    material_id: number;
    material_batch_id?: number | null;
    actual_qty: number;
    unit_id: number;
  }>;
}

export interface FailPrintRequest {
  failure_type: FailureType;
  failure_stage: string;
  description: string;
  material_wasted_qty?: number | null;
  material_id?: number | null;
  batch_id?: number | null;
  estimated_loss?: number | null;
  requires_reprint: boolean;
  printer_has_issue: boolean;
}

export interface SubmitQcInspectionRequest {
  template_id?: number | null;
  result_code: Exclude<QcResult, 'pending'>;
  notes?: string | null;
  items: Array<{
    template_item_id?: number | null;
    item_label: string;
    value_text?: string | null;
    passed?: boolean | null;
    notes?: string | null;
  }>;
  requires_reprint?: boolean;
}

export interface CreateJobResult {
  id: number;
  job_code: string;
}

export interface UpdatePrintJobResult {
  message: string;
  id: number;
  job_code: string;
  status_code: Extract<ProductionJobStatus, 'queued' | 'ready'>;
  materials_replaced: boolean;
}

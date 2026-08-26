import { api } from '../../lib/api';
import type {
  ActiveProduction,
  CreateJobResult,
  CreatePrintJobRequest,
  FailPrintRequest,
  FailureFilters,
  FinishPrintRequest,
  PaginatedProductionResult,
  ProductionBoard,
  ProductionCalendarEntry,
  ProductionFailure,
  ProductionFilters,
  ProductionJob,
  ProductionJobDetail,
  ProductionQueueItem,
  ProductionReferences,
  QcQueueItem,
  ScheduleJobRequest,
  SubmitQcInspectionRequest,
  UpdatePrintJobRequest,
  UpdatePrintJobResult,
} from '../../types/craft-production';

const BASE_PATH = '/craft/production';

function toQuery(values: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const craftProductionApi = {
  getBoard: (filters: ProductionFilters = {}) =>
    api.get<ProductionBoard>(`${BASE_PATH}/board${toQuery(filters)}`),

  getActiveProduction: () =>
    api.get<ActiveProduction>(`${BASE_PATH}/active`),

  getPrintQueue: () =>
    api.get<{ items: ProductionQueueItem[] }>(`${BASE_PATH}/queue`),

  createPrintJob: (data: CreatePrintJobRequest) =>
    api.post<CreateJobResult>(`${BASE_PATH}/jobs`, data),

  updatePrintJob: (id: number, data: UpdatePrintJobRequest) =>
    api.patch<UpdatePrintJobResult>(`${BASE_PATH}/jobs/${id}`, data),

  getPrintJobs: (filters: ProductionFilters = {}) =>
    api.get<PaginatedProductionResult<ProductionJob>>(`${BASE_PATH}/jobs${toQuery(filters)}`),

  getPrintJob: (id: number) =>
    api.get<ProductionJobDetail>(`${BASE_PATH}/jobs/${id}`),

  markReady: (id: number) =>
    api.post<{ message: string }>(`${BASE_PATH}/jobs/${id}/ready`, {}),

  scheduleJob: (id: number, data: ScheduleJobRequest) =>
    api.patch<{ message: string }>(`${BASE_PATH}/jobs/${id}/schedule`, data),

  startJob: (id: number, operatorUserId?: number | null) =>
    api.post<{ message: string }>(`${BASE_PATH}/jobs/${id}/start`, { operator_user_id: operatorUserId ?? null }),

  pauseJob: (id: number, reason?: string) =>
    api.post<{ message: string }>(`${BASE_PATH}/jobs/${id}/pause`, { reason: reason || null }),

  resumeJob: (id: number, reason?: string) =>
    api.post<{ message: string }>(`${BASE_PATH}/jobs/${id}/resume`, { reason: reason || null }),

  updateProgress: (id: number, progressPercent: number, reason?: string) =>
    api.patch<{ message: string }>(`${BASE_PATH}/jobs/${id}/progress`, { progress_percent: progressPercent, reason: reason || null }),

  finishPrinting: (id: number, data: FinishPrintRequest) =>
    api.post<{ message: string }>(`${BASE_PATH}/jobs/${id}/finish`, data),

  failJob: (id: number, data: FailPrintRequest) =>
    api.post<{ failure_id: number; message?: string }>(`${BASE_PATH}/jobs/${id}/fail`, data),

  cancelJob: (id: number, reason: string) =>
    api.post<{ message: string }>(`${BASE_PATH}/jobs/${id}/cancel`, { reason }),

  getFailures: (filters: FailureFilters = {}) =>
    api.get<PaginatedProductionResult<ProductionFailure>>(`${BASE_PATH}/failures${toQuery(filters)}`),

  createReprint: (failureId: number, data: CreatePrintJobRequest) =>
    api.post<CreateJobResult>(`${BASE_PATH}/failures/${failureId}/reprint`, data),

  getQcQueue: () =>
    api.get<{ items: QcQueueItem[] }>(`${BASE_PATH}/qc`),

  submitQcInspection: (jobId: number, data: SubmitQcInspectionRequest) =>
    api.post<{ inspection_id: number; message?: string }>(`${BASE_PATH}/jobs/${jobId}/qc`, data),

  getProductionCalendar: (start: string, end: string, printerId?: number) =>
    api.get<{ events: ProductionCalendarEntry[] }>(`${BASE_PATH}/calendar${toQuery({ start, end, printerId })}`),

  getReferences: (filters: { productId?: number; variantId?: number; printerId?: number } = {}) =>
    api.get<ProductionReferences>(`${BASE_PATH}/references${toQuery(filters)}`),
};

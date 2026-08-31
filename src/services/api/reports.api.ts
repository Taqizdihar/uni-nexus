import { api } from '../../lib/api';

export type ReportGroup = 'global' | 'unified_finance' | 'craft' | 'studio';
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';
export type ReportCatalogItem = { id: number; report_code: string; name: string; description: string; group: ReportGroup; scope: string; report_type: string; supported_formats: ExportFormat[]; can_preview: boolean; can_export: boolean; default_period: string; source_module: string; source_path: string };
export type ReportKpi = { label: string; value: string | number | null; definition?: string; currency?: string | null; format?: 'number' | 'currency' | 'percent' };
export type ReportPreview = { report: { code: string; name: string; description: string; group: ReportGroup; source_module: string; source_path: string }; generated_at: string; period: { start_date: string; end_date: string; timezone: string; currency?: string | null }; filters: Record<string, unknown>; kpis: ReportKpi[]; chart: { title: string; rows: Array<Record<string, string | number | null>> } | null; table: { columns: Array<{ key: string; label: string; format?: 'number' | 'currency' | 'percent' }>; rows: Array<Record<string, string | number | boolean | null>>; pagination?: { page: number; limit: number; total: number; total_pages: number } }; notes: string[] };
export type ReportOverview = { available_report_count: number; available_groups: ReportGroup[]; report_counts: Record<ReportGroup, number>; recent_exports: ReportExportHistoryItem[]; quick_reports: Array<{ report_code: string; name: string; group: ReportGroup }> };
export type ReportExportHistoryItem = { id: number; report_code: string | null; report_name: string; export_format: ExportFormat; status_code: string; generated_at: string; workspace: string; generated_by: string };
export type ReportHistory = { items: ReportExportHistoryItem[]; pagination: { page: number; limit: number; total: number; total_pages: number } };
export type ReportFilters = { period?: 'today' | 'week' | 'month' | 'last_30_days' | 'quarter' | 'year' | 'custom'; start_date?: string; end_date?: string; currency?: string; workspace?: 'all' | 'craft' | 'studio' | 'shared'; compare?: boolean; page?: number; limit?: number };

const query = (filters: ReportFilters & { format?: string; q?: string; from?: string; to?: string }) => { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); }); return params.toString() ? `?${params}` : ''; };
export const reportsApi = {
  overview: () => api.get<ReportOverview>('/reports/overview'), catalog: () => api.get<ReportCatalogItem[]>('/reports/catalog'), meta: () => api.get<{ period_presets: string[]; supported_formats: ExportFormat[]; groups: ReportGroup[]; workspaces: string[] }>('/reports/meta'),
  preview: (code: string, filters: ReportFilters) => api.get<ReportPreview>(`/reports/${encodeURIComponent(code)}/preview${query(filters)}`),
  export: (code: string, format: ExportFormat, filters: ReportFilters) => api.post<{ id: number; file_name: string; format: ExportFormat; generated_at: string; download_path: string }>(`/reports/${encodeURIComponent(code)}/export`, { format, filters }),
  history: (filters: ReportFilters & { format?: string; q?: string; from?: string; to?: string } = {}) => api.get<ReportHistory>(`/reports/exports${query(filters)}`),
  download: (id: number) => api.getBlob(`/reports/exports/${id}/download`),
};

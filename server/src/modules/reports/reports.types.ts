export const reportCodes = [
  'GLOBAL_EXECUTIVE_SUMMARY',
  'UNIFIED_FINANCE_OVERVIEW', 'UNIFIED_FINANCE_TRANSACTIONS', 'UNIFIED_FINANCE_TREASURY', 'UNIFIED_FINANCE_TRANSFERS', 'UNIFIED_FINANCE_CASH_FLOW', 'UNIFIED_FINANCE_PROFIT_LOSS', 'UNIFIED_FINANCE_RECEIVABLES', 'UNIFIED_FINANCE_PAYABLES', 'UNIFIED_FINANCE_BUDGETS', 'UNIFIED_FINANCE_JOURNALS',
  'CRAFT_ANALYTICS_OVERVIEW', 'CRAFT_SALES_ANALYTICS', 'CRAFT_ORDER_ANALYTICS', 'CRAFT_PRODUCT_ANALYTICS', 'CRAFT_CHANNEL_ANALYTICS', 'CRAFT_CUSTOMER_ANALYTICS', 'CRAFT_PRODUCTION_ANALYTICS', 'CRAFT_PRINTER_ANALYTICS', 'CRAFT_MATERIAL_ANALYTICS', 'CRAFT_PROCUREMENT_ANALYTICS', 'CRAFT_PROFITABILITY_ANALYTICS',
  'STUDIO_ANALYTICS_OVERVIEW', 'STUDIO_PROJECT_ANALYTICS', 'STUDIO_CLIENT_ANALYTICS', 'STUDIO_SERVICE_ANALYTICS', 'STUDIO_COMMERCIAL_ANALYTICS', 'STUDIO_REVENUE_ANALYTICS', 'STUDIO_PROFITABILITY_ANALYTICS', 'STUDIO_RECEIVABLE_ANALYTICS', 'STUDIO_VENDOR_ANALYTICS', 'STUDIO_EQUIPMENT_ANALYTICS',
] as const;

export type ReportCode = typeof reportCodes[number];
export type ReportGroup = 'global' | 'unified_finance' | 'craft' | 'studio';
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';
export type ReportActor = { id: number; organization_id: number; permissions: string[] };

export type ReportDefinition = { id: number; organization_id: number; business_unit_id: number | null; report_code: string; name: string; report_type: string; is_active: boolean };
export type AccessibleUnit = { id: number; code: 'CRAFT' | 'STUDIO' | 'SHARED'; name: string };
export type ReportFilters = { period: 'today' | 'week' | 'month' | 'last_30_days' | 'quarter' | 'year' | 'custom'; start_date?: string; end_date?: string; currency?: string; workspace?: 'all' | 'craft' | 'studio' | 'shared'; compare: boolean; page: number; limit: number; client_id?: number; service_id?: number; project_type?: string; sales_channel_id?: number; product_id?: number; customer_id?: number; printer_id?: number; material_id?: number; status?: string };
export type ReportRegistryEntry = { reportCode: ReportCode; displayName: string; description: string; group: ReportGroup; sourceModule: 'dashboard' | 'finance' | 'craft_analytics' | 'studio_analytics'; businessUnitCode?: 'CRAFT' | 'STUDIO'; requiredReadPermissions: string[]; requiredExportPermissions: string[]; supportedFormats: readonly ExportFormat[]; reportKey: string; sourcePath: string; defaultPeriod: ReportFilters['period']; maxRangeDays: number };
export type ReportAccess = { actor: ReportActor; definition: ReportDefinition; registry: ReportRegistryEntry; units: AccessibleUnit[]; canExport: boolean };
export type ReportKpi = { label: string; value: string | number | null; definition?: string; currency?: string | null; format?: 'number' | 'currency' | 'percent' };
export type ReportTable = { columns: Array<{ key: string; label: string; format?: 'number' | 'currency' | 'percent' }>; rows: Array<Record<string, string | number | boolean | null>>; pagination?: { page: number; limit: number; total: number; total_pages: number } };
export type ReportPreview = { report: { code: ReportCode; name: string; description: string; group: ReportGroup; source_module: string; source_path: string }; generated_at: string; period: { start_date: string; end_date: string; timezone: 'Asia/Jakarta'; currency?: string | null }; filters: Record<string, unknown>; kpis: ReportKpi[]; chart: { title: string; rows: Array<Record<string, string | number | null>> } | null; table: ReportTable; notes: string[] };

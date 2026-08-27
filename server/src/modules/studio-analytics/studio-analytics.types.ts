import type { BusinessUnitContext } from '../../shared/utils/business-unit';

export type AnalyticsReport = 'overview' | 'projects' | 'clients' | 'services' | 'commercial' | 'revenue' | 'profitability' | 'receivables' | 'vendors' | 'equipment';
export type AnalyticsExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface StudioAnalyticsFilters {
  startDate: string;
  endDate: string;
  compare: boolean;
  currency?: string;
  projectType?: string;
  clientId?: number;
  serviceId?: number;
  page: number;
  limit: number;
}

export interface StudioAnalyticsContext extends BusinessUnitContext {
  userId: number;
}

export interface MetricValue {
  label: string;
  value: number | null;
  definition: string;
  current_value?: number | null;
  previous_value?: number | null;
  absolute_change?: number | null;
  percent_change?: number | null;
  snapshot?: boolean;
}

export interface ExportRequest {
  report: AnalyticsReport;
  format: AnalyticsExportFormat;
  filters?: Partial<StudioAnalyticsFilters>;
}

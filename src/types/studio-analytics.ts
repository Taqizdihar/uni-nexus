export type AnalyticsReport = 'overview' | 'projects' | 'clients' | 'services' | 'commercial' | 'revenue' | 'profitability' | 'receivables' | 'vendors' | 'equipment';
export type AnalyticsExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface AnalyticsFilters {
  start_date: string;
  end_date: string;
  compare?: boolean;
  currency?: string;
  project_type?: string;
  client_id?: number;
  service_id?: number;
  page?: number;
  limit?: number;
}

export interface AnalyticsPeriod { start_date: string; end_date: string; timezone: string; currency: string | null; }
export interface AnalyticsMetric { label: string; value: number | null; definition: string; current_value?: number | null; previous_value?: number | null; absolute_change?: number | null; percent_change?: number | null; snapshot?: boolean; }
export interface AnalyticsRow { [key: string]: string | number | boolean | null | undefined; }
export interface AnalyticsMeta { page: number; limit: number; total: number; totalPages: number; }
export type AnalyticsKpis = AnalyticsMetric[] | Record<string, AnalyticsMetric[]>;

export interface StudioAnalyticsData {
  period: AnalyticsPeriod;
  comparison?: AnalyticsPeriod | null;
  generated_at?: string;
  kpis?: AnalyticsKpis;
  rows?: AnalyticsRow[];
  meta?: AnalyticsMeta;
  [key: string]: unknown;
}

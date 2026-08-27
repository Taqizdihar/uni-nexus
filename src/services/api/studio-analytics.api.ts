import { api } from '../../lib/api';
import type { AnalyticsExportFormat, AnalyticsFilters, AnalyticsReport, StudioAnalyticsData } from '../../types/studio-analytics';

const BASE = '/studio/analytics';
const query = (filters: Partial<AnalyticsFilters>) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.size ? `?${params.toString()}` : '';
};

export const studioAnalyticsApi = {
  overview: (filters: Partial<AnalyticsFilters>) => api.get<StudioAnalyticsData>(`${BASE}/overview${query(filters)}`),
  projects: (filters: Partial<AnalyticsFilters>) => api.get<StudioAnalyticsData>(`${BASE}/projects${query(filters)}`),
  clients: (filters: Partial<AnalyticsFilters>) => api.get<StudioAnalyticsData>(`${BASE}/clients${query(filters)}`),
  services: (filters: Partial<AnalyticsFilters>) => api.get<StudioAnalyticsData>(`${BASE}/services${query(filters)}`),
  commercial: (filters: Partial<AnalyticsFilters>) => api.get<StudioAnalyticsData>(`${BASE}/commercial${query(filters)}`),
  revenue: (filters: Partial<AnalyticsFilters>) => api.get<StudioAnalyticsData>(`${BASE}/revenue${query(filters)}`),
  profitability: (filters: Partial<AnalyticsFilters>) => api.get<StudioAnalyticsData>(`${BASE}/profitability${query(filters)}`),
  receivables: (filters: Partial<AnalyticsFilters>) => api.get<StudioAnalyticsData>(`${BASE}/receivables${query(filters)}`),
  vendors: (filters: Partial<AnalyticsFilters>) => api.get<StudioAnalyticsData>(`${BASE}/vendors${query(filters)}`),
  equipment: (filters: Partial<AnalyticsFilters>) => api.get<StudioAnalyticsData>(`${BASE}/equipment${query(filters)}`),
  export: (report: AnalyticsReport, format: AnalyticsExportFormat, filters: Partial<AnalyticsFilters>) => api.postBlob(`${BASE}/export`, { report, format, filters }),
};

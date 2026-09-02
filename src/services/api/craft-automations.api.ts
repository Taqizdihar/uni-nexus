import { api } from '../../lib/api';
import type { AutomationCatalog, AutomationOverview, AutomationRule, AutomationRun, AutomationTemplate, DomainEventFilters, DomainEventPage } from '../../types/craft-automations';

const base = '/craft/automations';
const query = (filters: Record<string, string | number | undefined>) => { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); }); const value = params.toString(); return value ? `?${value}` : ''; };
export const craftAutomationsApi = {
  overview: () => api.get<AutomationOverview>(`${base}/overview`),
  catalog: () => api.get<AutomationCatalog>(`${base}/catalog`),
  events: (filters: DomainEventFilters = {}) => api.get<DomainEventPage>(`${base}/events${query(filters as Record<string, string | number | undefined>)}`),
  rules: (filters: Record<string, string | number | undefined> = {}) => api.get<AutomationRule[]>(`${base}/rules${query(filters)}`),
  rule: (id: number) => api.get<AutomationRule>(`${base}/rules/${id}`),
  createRule: (data: Record<string, unknown>) => api.post<{ id: number; rule_code: string }>(`${base}/rules`, data),
  updateRule: (id: number, data: Record<string, unknown>) => api.patch<{ id: number; rule_code: string }>(`${base}/rules/${id}`, data),
  activate: (id: number) => api.post<{ id: number; status_code: string }>(`${base}/rules/${id}/activate`, {}),
  pause: (id: number) => api.post<{ id: number; status_code: string }>(`${base}/rules/${id}/pause`, {}),
  resume: (id: number) => api.post<{ id: number; status_code: string }>(`${base}/rules/${id}/resume`, {}),
  disable: (id: number) => api.post<{ id: number; status_code: string }>(`${base}/rules/${id}/disable`, {}),
  duplicate: (id: number) => api.post<{ id: number; rule_code: string }>(`${base}/rules/${id}/duplicate`, {}),
  test: (id: number, input: Record<string, unknown> = {}) => api.post<Record<string, unknown>>(`${base}/rules/${id}/test`, input),
  run: (id: number, input: Record<string, unknown> = {}) => api.post<{ run: AutomationRun; message: string }>(`${base}/rules/${id}/run`, input),
  runs: (filters: Record<string, string | number | undefined> = {}) => api.get<AutomationRun[]>(`${base}/runs${query(filters)}`),
  runDetail: (id: number) => api.get<AutomationRun>(`${base}/runs/${id}`),
  templates: () => api.get<AutomationTemplate[]>(`${base}/templates`),
  useTemplate: (code: string) => api.post<{ id: number; rule_code: string }>(`${base}/templates/${encodeURIComponent(code)}/use`, {}),
};

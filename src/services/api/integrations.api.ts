import { api } from '../../lib/api';
import type { IntegrationConnection, IntegrationConnectionDetail, IntegrationCredentialMeta, IntegrationMeta, IntegrationOverview, IntegrationSyncLog, ProviderDefinition } from '../../types/integrations';

const base = '/integrations';
const query = (values: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params.toString();
};

export const integrationsApi = {
  overview: () => api.get<IntegrationOverview>(`${base}/overview`),
  meta: () => api.get<IntegrationMeta>(`${base}/meta`),
  providers: () => api.get<ProviderDefinition[]>(`${base}/providers`),
  connections: (filters: Record<string, string | undefined> = {}) => api.get<IntegrationConnection[]>(`${base}/connections?${query(filters)}`),
  connection: (id: number) => api.get<IntegrationConnectionDetail>(`${base}/connections/${id}`),
  createConnection: (data: { provider_code: string; scope: string; display_name: string; config_json: Record<string, unknown> }) =>
    api.post<{ id: number; integration_code: string; status_code: string }>(`${base}/connections`, data),
  updateConnection: (id: number, data: { display_name?: string; config_json?: Record<string, unknown>; expected_updated_at?: string }) =>
    api.patch<{ id: number }>(`${base}/connections/${id}`, data),
  updateCredentials: (id: number, secrets: Record<string, string>, expected_updated_at?: string) =>
    api.post<{ credentials: IntegrationCredentialMeta[] }>(`${base}/connections/${id}/credentials`, { secrets, expected_updated_at }),
  deleteCredential: (id: number, secretName: string) => api.delete<{ removed: boolean }>(`${base}/connections/${id}/credentials/${encodeURIComponent(secretName)}`),
  testConnection: (id: number) => api.post<{ connected: boolean; message: string; status_code: string }>(`${base}/connections/${id}/test`, {}),
  syncConnection: (id: number) => api.post<{ status: string; records_processed: number; records_success: number; records_failed: number; message: string }>(`${base}/connections/${id}/sync`, {}),
  enable: (id: number) => api.post<{ id: number; status_code: string }>(`${base}/connections/${id}/enable`, {}),
  disable: (id: number) => api.post<{ id: number; status_code: string }>(`${base}/connections/${id}/disable`, {}),
  disconnect: (id: number) => api.post<{ id: number; status_code: string }>(`${base}/connections/${id}/disconnect`, {}),
  logs: (filters: Record<string, string | undefined> = {}) => api.get<IntegrationSyncLog[]>(`${base}/logs?${query(filters)}`),
  log: (id: number) => api.get<IntegrationSyncLog>(`${base}/logs/${id}`),
};

import { api } from '../../lib/api';
import type { MasterDataDatasetKey, MasterDataFilters, MasterDataItem, MasterDataList, MasterDataMeta, MasterDataOverview, MasterDataUsage } from '../../types/master-data';

const BASE = '/master-data';
const query = (params: Record<string, unknown>) => {
  const values = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') values.set(key, String(value)); });
  const encoded = values.toString();
  return encoded ? `?${encoded}` : '';
};

export const masterDataApi = {
  overview: () => api.get<MasterDataOverview>(`${BASE}/overview`),
  meta: () => api.get<MasterDataMeta>(`${BASE}/meta`),
  list: (dataset: MasterDataDatasetKey, filters: MasterDataFilters = {}) => api.get<MasterDataList>(`${BASE}/${dataset}${query(filters)}`),
  detail: (dataset: MasterDataDatasetKey, id: number) => api.get<MasterDataItem>(`${BASE}/${dataset}/${id}`),
  usage: (dataset: MasterDataDatasetKey, id: number) => api.get<MasterDataUsage>(`${BASE}/${dataset}/${id}/usage`),
  create: (dataset: MasterDataDatasetKey, body: Record<string, unknown>) => api.post<MasterDataItem>(`${BASE}/${dataset}`, body),
  update: (dataset: MasterDataDatasetKey, id: number, body: Record<string, unknown>) => api.patch<MasterDataItem>(`${BASE}/${dataset}/${id}`, body),
  activate: (dataset: MasterDataDatasetKey, id: number) => api.post<MasterDataItem>(`${BASE}/${dataset}/${id}/activate`, {}),
  deactivate: (dataset: MasterDataDatasetKey, id: number) => api.post<MasterDataItem>(`${BASE}/${dataset}/${id}/deactivate`, {}),
  export: (dataset: MasterDataDatasetKey, format: 'csv' | 'xlsx', filters: MasterDataFilters = {}) => api.getBlob(`${BASE}/export${query({ ...filters, dataset, format })}`),
};

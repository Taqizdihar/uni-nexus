import { api } from '../../lib/api';
import type { ImportPreview, MarketplaceChannel, MarketplaceFeeRule, MarketplaceIntegration, MarketplaceOverview, MarketplaceSettlement, ProductMapping, SettlementDetail, SyncLog } from '../../types/craft-marketplace';

const base = '/craft/marketplace';
const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.toString();
};

export const craftMarketplaceApi = {
  overview: () => api.get<MarketplaceOverview>(`${base}/overview`),
  channels: () => api.get<MarketplaceChannel[]>(`${base}/channels`),
  channel: (id: number) => api.get<Record<string, unknown>>(`${base}/channels/${id}`),
  createChannel: (data: Omit<MarketplaceChannel, 'id'>) => api.post<{ id: number }>(`${base}/channels`, data),
  updateChannel: (id: number, data: Partial<MarketplaceChannel>) => api.patch<{ id: number }>(`${base}/channels/${id}`, data),
  setChannelActive: (id: number, active: boolean) => api.post<{ message: string; active_order_count: number }>(`${base}/channels/${id}/${active ? 'activate' : 'deactivate'}`, {}),
  mappings: (filters: Record<string, string | number | undefined> = {}) => api.get<ProductMapping[]>(`${base}/product-mappings?${query(filters)}`),
  createMapping: (data: Record<string, unknown>) => api.post<{ id: number }>(`${base}/product-mappings`, data),
  updateMapping: (id: number, data: Record<string, unknown>) => api.patch<{ id: number }>(`${base}/product-mappings/${id}`, data),
  deleteMapping: (id: number) => api.delete<{ id: number }>(`${base}/product-mappings/${id}`),
  feeRules: (channel?: number) => api.get<MarketplaceFeeRule[]>(`${base}/fee-rules${channel ? `?channel=${channel}` : ''}`),
  createFeeRule: (data: Record<string, unknown>) => api.post<{ id: number }>(`${base}/fee-rules`, data),
  updateFeeRule: (id: number, data: Record<string, unknown>) => api.patch<{ id: number }>(`${base}/fee-rules/${id}`, data),
  deactivateFeeRule: (id: number) => api.post<{ id: number }>(`${base}/fee-rules/${id}/deactivate`, {}),
  estimateFee: (channelId: number, amount: number) => api.get<{ suggested_fee: number }>(`${base}/channels/${channelId}/fee-estimate?amount=${amount}`),
  previewImport: (data: FormData) => api.post<ImportPreview>(`${base}/imports/preview`, data),
  commitImport: (token: string, data: Record<string, unknown>) => api.post<Record<string, unknown>>(`${base}/imports/${token}/commit`, data),
  cancelImport: (token: string) => api.delete<{ message: string }>(`${base}/imports/${token}`),
  importTemplateUrl: () => `${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1')}${base}/imports/template.csv`,
  integrations: () => api.get<MarketplaceIntegration[]>(`${base}/integrations`),
  createIntegration: (data: Record<string, unknown>) => api.post<{ id: number; status_code: string }>(`${base}/integrations`, data),
  updateIntegration: (id: number, data: Record<string, unknown>) => api.patch<{ id: number }>(`${base}/integrations/${id}`, data),
  testIntegration: (id: number) => api.post<Record<string, unknown>>(`${base}/integrations/${id}/test`, {}),
  syncIntegration: (id: number) => api.post<Record<string, unknown>>(`${base}/integrations/${id}/sync`, {}),
  disableIntegration: (id: number) => api.post<{ id: number }>(`${base}/integrations/${id}/disable`, {}),
  syncHistory: () => api.get<SyncLog[]>(`${base}/sync-history`),
  settlements: () => api.get<MarketplaceSettlement[]>(`${base}/settlements`),
  createSettlement: (data: Record<string, unknown>) => api.post<{ id: number; settlement_code: string }>(`${base}/settlements`, data),
  settlement: (id: number) => api.get<SettlementDetail>(`${base}/settlements/${id}`),
  updateSettlement: (id: number, data: Record<string, unknown>) => api.patch<{ id: number }>(`${base}/settlements/${id}`, data),
  matchSettlement: (id: number, matches: Array<{ item_id: number; order_id: number | null }> = []) => api.post<{ auto_matched: number }>(`${base}/settlements/${id}/match`, { matches }),
  receiveSettlement: (id: number, treasury_account_id: number) => api.post<{ financial_transaction_id: number }>(`${base}/settlements/${id}/receive`, { treasury_account_id }),
  reconcileSettlement: (id: number) => api.post<{ id: number }>(`${base}/settlements/${id}/reconcile`, {}),
};

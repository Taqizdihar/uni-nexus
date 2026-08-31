import { api } from '../../lib/api';

const BASE = '/finance';
const query = (filters: Record<string, string | number | undefined>) => {
  const values = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') values.set(key, String(value)); }); return values.toString() ? `?${values}` : '';
};

export const unifiedFinanceApi = {
  meta: () => api.get<any>(`${BASE}/meta`), overview: (filters: Record<string, any>) => api.get<any>(`${BASE}/overview${query(filters)}`),
  transactions: (filters: Record<string, any>) => api.get<any>(`${BASE}/transactions${query(filters)}`), treasury: (filters: Record<string, any>) => api.get<any>(`${BASE}/treasury${query(filters)}`), transfers: (filters: Record<string, any>) => api.get<any>(`${BASE}/transfers${query(filters)}`),
  cashFlow: (filters: Record<string, any>) => api.get<any>(`${BASE}/cash-flow${query(filters)}`), profitLoss: (filters: Record<string, any>) => api.get<any>(`${BASE}/profit-loss${query(filters)}`), receivables: (filters: Record<string, any>) => api.get<any>(`${BASE}/receivables${query(filters)}`), payables: (filters: Record<string, any>) => api.get<any>(`${BASE}/payables${query(filters)}`), budgets: (filters: Record<string, any>) => api.get<any>(`${BASE}/budgets${query(filters)}`),
  journals: (filters: Record<string, any>) => api.get<any>(`${BASE}/accounting/journals${query(filters)}`), journal: (id: number) => api.get<any>(`${BASE}/accounting/journals/${id}`), periods: () => api.get<any>(`${BASE}/accounting/periods`),
  transfer: (payload: any) => api.post<any>(`${BASE}/transfers`, payload), sharedTransaction: (payload: any) => api.post<any>(`${BASE}/shared/transactions`, payload), reverseSharedTransaction: (id: number, payload: any) => api.post<any>(`${BASE}/shared/transactions/${id}/reverse`, payload), createSharedTreasury: (payload: any) => api.post<any>(`${BASE}/shared/treasury`, payload), setSharedTreasuryStatus: (id: number, is_active: boolean) => api.patch<any>(`${BASE}/shared/treasury/${id}/status`, { is_active }), createPeriod: (payload: any) => api.post<any>(`${BASE}/accounting/periods`, payload), closePeriod: (id: number, reason: string) => api.post<any>(`${BASE}/accounting/periods/${id}/close`, { reason }), reopenPeriod: (id: number, reason: string) => api.post<any>(`${BASE}/accounting/periods/${id}/reopen`, { reason }),
  export: (filters: Record<string, any>) => api.getBlob(`${BASE}/export${query(filters)}`),
};

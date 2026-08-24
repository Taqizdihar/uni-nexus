import { api } from '../../lib/api';
import { CraftOrder, CraftOrderFilters, PaginatedResult } from '../../types/craft-orders';

const BASE_PATH = '/craft/orders';
const REF_PATH = '/craft/references';

export const craftOrdersApi = {
  // Orders
  getOrders: (filters: CraftOrderFilters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    return api.get<PaginatedResult<CraftOrder>>(`${BASE_PATH}?${params.toString()}`);
  },

  getOrder: (id: number) => api.get<any>(`${BASE_PATH}/${id}`),

  createOrder: (data: any) => api.post<any>(BASE_PATH, data),

  updateStatus: (id: number, statusCode: string, reason?: string) =>
    api.patch(`${BASE_PATH}/${id}/status`, { status_code: statusCode, reason }),

  updatePriority: (id: number, priorityCode: string, reason?: string, isManual = true) =>
    api.patch(`${BASE_PATH}/${id}/priority`, { priority_code: priorityCode, reason, is_priority_manual: isManual }),

  recalculatePriorities: () => api.post(`${BASE_PATH}/recalculate-priorities`, {}),

  createInvoice: (id: number, data: any) => api.post(`${BASE_PATH}/${id}/invoice`, data),

  recordPayment: (id: number, data: any) => api.post(`${BASE_PATH}/${id}/payment`, data),

  enqueueItems: (id: number, itemIds: number[]) => api.post(`${BASE_PATH}/${id}/queue`, { item_ids: itemIds }),

  quickCreateCustomer: (data: any) => api.post(`${BASE_PATH}/customers/quick`, data),

  downloadInvoicePdfUrl: (id: number) => {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}${BASE_PATH}/${id}/invoice/pdf`;
  },

  downloadReceiptPdfUrl: (id: number, paymentId: number) => {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}${BASE_PATH}/${id}/receipt/${paymentId}/pdf`;
  },

  // References
  getCustomers: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return api.get<any[]>(`${REF_PATH}/customers${query}`);
  },

  getProducts: () => api.get<any[]>(`${REF_PATH}/products`),
  
  getSalesChannels: () => api.get<any[]>(`${REF_PATH}/sales-channels`),
  
  getPaymentMethods: () => api.get<any[]>(`${REF_PATH}/payment-methods`),
  
  getPrinters: () => api.get<any[]>(`${REF_PATH}/printers`),
};

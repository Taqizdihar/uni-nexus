import { api } from '../../lib/api';
import type {
  AttachmentSummary, CreateCraftOrderRequest, CraftOrder, CraftOrderDetail, CraftOrderFilters, CustomerOption,
  InvoiceSummary, OrderDetailResponse, PaginatedResult, PaymentMethodOption, PaymentSummary, ProductOption,
  ProductionQueueItem, SalesChannelOption, TreasuryAccountOption,
} from '../../types/craft-orders';

const BASE_PATH = '/craft/orders';
const REF_PATH = '/craft/references';

function toQuery(filters: CraftOrderFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return params.toString();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const craftOrdersApi = {
  getOrders: (filters: CraftOrderFilters) => api.get<PaginatedResult<CraftOrder>>(`${BASE_PATH}?${toQuery(filters)}`),
  getOrder: (id: number) => api.get<OrderDetailResponse>(`${BASE_PATH}/${id}`),
  createOrder: (data: CreateCraftOrderRequest) => api.post<{ id: number; order_code: string }>(BASE_PATH, data),
  updateOrder: (id: number, data: Partial<Pick<CraftOrderDetail, 'deadline_at' | 'customer_notes' | 'internal_notes' | 'shipping_recipient_name' | 'shipping_phone' | 'shipping_address' | 'courier_name'>>) => api.patch<{ message: string }>(`${BASE_PATH}/${id}`, data),
  updateStatus: (id: number, statusCode: string, reason?: string) => api.patch<{ message: string }>(`${BASE_PATH}/${id}/status`, { status_code: statusCode, reason }),
  updatePriority: (id: number, priorityCode: string, reason?: string, isManual = true) => api.patch<{ message: string }>(`${BASE_PATH}/${id}/priority`, { priority_code: priorityCode, reason, is_priority_manual: isManual }),
  recalculatePriorities: () => api.post<{ message: string }>(`${BASE_PATH}/recalculate-priorities`, {}),
  createInvoice: (id: number, data: { due_date?: string | null; payment_terms?: string | null; notes?: string | null }) => api.post<{ invoice_id: number }>(`${BASE_PATH}/${id}/invoice`, data),
  recordPayment: (id: number, data: { amount: number; payment_date: string; payment_method_id: number; treasury_account_id?: number | null; reference_number?: string | null; notes?: string | null }) => api.post<{ payment_id: number }>(`${BASE_PATH}/${id}/payment`, data),
  enqueueItems: (id: number, itemIds: number[]) => api.post<{ message: string }>(`${BASE_PATH}/${id}/queue`, { item_ids: itemIds }),
  quickCreateCustomer: (data: Pick<CustomerOption, 'display_name' | 'party_kind' | 'email' | 'phone'>) => api.post<CustomerOption>(`${BASE_PATH}/customers/quick`, data),
  getCustomers: (search?: string) => api.get<CustomerOption[]>(`${REF_PATH}/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getProducts: () => api.get<ProductOption[]>(`${REF_PATH}/products`),
  getSalesChannels: () => api.get<SalesChannelOption[]>(`${REF_PATH}/sales-channels`),
  getPaymentMethods: () => api.get<PaymentMethodOption[]>(`${REF_PATH}/payment-methods`),
  getTreasuryAccounts: () => api.get<TreasuryAccountOption[]>(`${REF_PATH}/treasury-accounts`),
  getProductionQueue: () => api.get<ProductionQueueItem[]>(`${REF_PATH}/production-queue`),
  exportOrders: async (filters: CraftOrderFilters) => downloadBlob(await api.getBlob(`${BASE_PATH}/export?${toQuery(filters)}`), 'craft-orders.csv'),
  downloadInvoicePdf: async (id: number) => downloadBlob(await api.getBlob(`${BASE_PATH}/${id}/invoice/pdf`), `invoice-${id}.pdf`),
  downloadReceiptPdf: async (id: number, paymentId: number) => downloadBlob(await api.getBlob(`${BASE_PATH}/${id}/receipt/${paymentId}/pdf`), `kwitansi-${paymentId}.pdf`),
  uploadAttachment: (id: number, data: FormData) => api.post<AttachmentSummary>(`${BASE_PATH}/${id}/attachments`, data),
  downloadAttachment: async (id: number, attachment: AttachmentSummary) => downloadBlob(await api.getBlob(`${BASE_PATH}/${id}/attachments/${attachment.id}/download`), attachment.file_name),
  deleteAttachment: (id: number, attachmentId: number) => api.delete<{ message: string }>(`${BASE_PATH}/${id}/attachments/${attachmentId}`),
};

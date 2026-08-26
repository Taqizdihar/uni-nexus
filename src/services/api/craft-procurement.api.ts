import { api } from "../../lib/api";
import type {
  GoodsReceipt,
  GoodsReceiptForm,
  PageMeta,
  Paginated,
  ProcurementHistoryItem,
  ProcurementOverview,
  ProcurementReferences,
  PurchaseOrder,
  PurchaseOrderForm,
  PurchaseRequest,
  PurchaseRequestDetail,
  PurchaseRequestForm,
  Supplier,
  SupplierForm,
  SupplierInvoice,
} from "../../types/craft-procurement";

const BASE = "/craft/procurement";
const query = (
  filters: Record<string, string | number | undefined | null> = {},
) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      params.set(key, String(value));
  });
  return params.toString();
};
const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const craftProcurementApi = {
  getOverview: () => api.get<ProcurementOverview>(`${BASE}/overview`),
  getReferences: () => api.get<ProcurementReferences>(`${BASE}/references`),
  getSuppliers: (filters: Record<string, string | number | undefined> = {}) =>
    api.get<Paginated<Supplier>>(`${BASE}/suppliers?${query(filters)}`),
  getSupplier: (id: number) =>
    api.get<{
      supplier: Supplier;
      contacts: any[];
      purchase_orders: PurchaseOrder[];
      receipts: GoodsReceipt[];
      invoices: SupplierInvoice[];
      materials: any[];
      performance: Record<string, number>;
    }>(`${BASE}/suppliers/${id}`),
  createSupplier: (data: SupplierForm) =>
    api.post<{ id: number; code: string }>(`${BASE}/suppliers`, data),
  updateSupplier: (id: number, data: SupplierForm) =>
    api.patch<{ message: string }>(`${BASE}/suppliers/${id}`, data),
  activateSupplier: (id: number) =>
    api.patch<{ message: string }>(`${BASE}/suppliers/${id}/status`, {
      active: true,
    }),
  deactivateSupplier: (id: number) =>
    api.patch<{ message: string }>(`${BASE}/suppliers/${id}/status`, {
      active: false,
    }),
  getSupplierDuplicates: (data: SupplierForm) =>
    api.post<Supplier[]>(`${BASE}/suppliers/duplicates`, data),
  createSupplierContact: (id: number, data: Record<string, unknown>) =>
    api.post<{ id: number }>(`${BASE}/suppliers/${id}/contacts`, data),
  updateSupplierContact: (
    id: number,
    contactId: number,
    data: Record<string, unknown>,
  ) =>
    api.patch<{ message: string }>(
      `${BASE}/suppliers/${id}/contacts/${contactId}`,
      data,
    ),
  deleteSupplierContact: (id: number, contactId: number) =>
    api.delete<{ message: string }>(
      `${BASE}/suppliers/${id}/contacts/${contactId}`,
    ),
  getPurchaseRequests: (
    filters: Record<string, string | number | undefined> = {},
  ) =>
    api.get<Paginated<PurchaseRequest>>(`${BASE}/requests?${query(filters)}`),
  getPurchaseRequest: (id: number) =>
    api.get<PurchaseRequestDetail>(`${BASE}/requests/${id}`),
  createPurchaseRequest: (data: PurchaseRequestForm) =>
    api.post<{ id: number; request_code: string }>(`${BASE}/requests`, data),
  updatePurchaseRequest: (id: number, data: PurchaseRequestForm) =>
    api.patch<{ message: string }>(`${BASE}/requests/${id}`, data),
  submitPurchaseRequest: (id: number) =>
    api.post<{ message: string }>(`${BASE}/requests/${id}/submit`, {}),
  approvePurchaseRequest: (id: number) =>
    api.post<{ message: string }>(`${BASE}/requests/${id}/approve`, {}),
  rejectPurchaseRequest: (id: number, reason: string) =>
    api.post<{ message: string }>(`${BASE}/requests/${id}/reject`, { reason }),
  closePurchaseRequest: (id: number) =>
    api.post<{ message: string }>(`${BASE}/requests/${id}/close`, {}),
  getPurchaseOrders: (
    filters: Record<string, string | number | undefined> = {},
  ) => api.get<Paginated<PurchaseOrder>>(`${BASE}/orders?${query(filters)}`),
  getPurchaseOrder: (id: number) =>
    api.get<{
      order: PurchaseOrder;
      items: any[];
      receipts: GoodsReceipt[];
      invoices: SupplierInvoice[];
    }>(`${BASE}/orders/${id}`),
  createPurchaseOrder: (data: PurchaseOrderForm) =>
    api.post<{ id: number; po_number: string }>(`${BASE}/orders`, data),
  updatePurchaseOrder: (id: number, data: Partial<PurchaseOrderForm>) =>
    api.patch<{ message: string }>(`${BASE}/orders/${id}`, data),
  markPurchaseOrderSent: (id: number) =>
    api.post<{ message: string }>(`${BASE}/orders/${id}/send`, {}),
  confirmPurchaseOrder: (id: number) =>
    api.post<{ message: string }>(`${BASE}/orders/${id}/confirm`, {}),
  cancelPurchaseOrder: (id: number) =>
    api.post<{ message: string }>(`${BASE}/orders/${id}/cancel`, {}),
  closePurchaseOrder: (id: number) =>
    api.post<{ message: string }>(`${BASE}/orders/${id}/close`, {}),
  downloadPurchaseOrderPdf: async (id: number, poNumber = `PO-${id}`) =>
    download(await api.getBlob(`${BASE}/orders/${id}/pdf`), `${poNumber}.pdf`),
  getGoodsReceipts: (
    filters: Record<string, string | number | undefined> = {},
  ) => api.get<Paginated<GoodsReceipt>>(`${BASE}/receipts?${query(filters)}`),
  getGoodsReceipt: (id: number) =>
    api.get<{ receipt: GoodsReceipt; items: any[] }>(`${BASE}/receipts/${id}`),
  createGoodsReceipt: (data: GoodsReceiptForm) =>
    api.post<{ id: number; receipt_number: string }>(`${BASE}/receipts`, data),
  getSupplierInvoices: (
    filters: Record<string, string | number | undefined> = {},
  ) =>
    api.get<Paginated<SupplierInvoice>>(`${BASE}/invoices?${query(filters)}`),
  createSupplierInvoice: (
    data: Omit<
      SupplierInvoice,
      | "id"
      | "supplier_name"
      | "po_number"
      | "paid_amount"
      | "balance_due"
      | "status_code"
    >,
  ) => api.post<{ id: number }>(`${BASE}/invoices`, data),
  voidSupplierInvoice: (id: number) =>
    api.post<{ message: string }>(`${BASE}/invoices/${id}/void`, {}),
  downloadSupplierInvoiceDocument: async (id: number) =>
    download(
      await api.getBlob(`${BASE}/invoices/${id}/document`),
      `supplier-invoice-${id}`,
    ),
  getProcurementHistory: (
    filters: Record<string, string | number | undefined> = {},
  ) =>
    api.get<Paginated<ProcurementHistoryItem>>(
      `${BASE}/history?${query(filters)}`,
    ),
};

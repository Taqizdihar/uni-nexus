import { api } from '../../lib/api';
import type { InvoicePayload, Paginated, QuotationPayload, QuotationTemplatePayload, StudioBillingOverview, StudioBillingReferences, StudioInvoiceDetail, StudioInvoiceSummary, StudioOutstandingResponse, StudioPaymentRecord, StudioPaymentSchedule, StudioProjectScope, StudioQuotationDetail, StudioQuotationSummary, StudioQuotationTemplate, StudioQuotationTemplateSummary } from '../../types/studio-billing';

const BASE = '/studio/billing';
const query = (filters: Record<string, unknown> = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '' && value !== false) params.set(key, String(value)); });
  return params.size ? `?${params}` : '';
};

const download = async (endpoint: string, fallback: string) => {
  const blob = await api.getBlob(endpoint);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = fallback; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const studioBillingApi = {
  getOverview: () => api.get<StudioBillingOverview>(`${BASE}/overview`),
  getOutstanding: (filters: Record<string, unknown> = {}) => api.get<StudioOutstandingResponse>(`${BASE}/outstanding${query(filters)}`),
  getReferences: () => api.get<StudioBillingReferences>(`${BASE}/references`),
  getProjectScope: (id: number) => api.get<StudioProjectScope | null>(`${BASE}/references/projects/${id}/scope`),

  getQuotations: (filters: Record<string, unknown> = {}) => api.get<Paginated<StudioQuotationSummary>>(`${BASE}/quotations${query(filters)}`),
  getQuotation: (id: number) => api.get<StudioQuotationDetail>(`${BASE}/quotations/${id}`),
  createQuotation: (payload: QuotationPayload) => api.post<{ id: number; quotation_number: string }>(`${BASE}/quotations`, payload),
  updateQuotation: (id: number, payload: Partial<QuotationPayload>) => api.patch<{ id: number }>(`${BASE}/quotations/${id}`, payload),
  sendQuotation: (id: number) => api.post<{ id: number; status_code: string }>(`${BASE}/quotations/${id}/send`, {}),
  acceptQuotation: (id: number) => api.post<{ id: number; status_code: string }>(`${BASE}/quotations/${id}/accept`, {}),
  rejectQuotation: (id: number, reason: string) => api.post<{ id: number; status_code: string }>(`${BASE}/quotations/${id}/reject`, { reason }),
  cancelQuotation: (id: number, reason: string) => api.post<{ id: number; status_code: string }>(`${BASE}/quotations/${id}/cancel`, { reason }),
  duplicateQuotation: (id: number) => api.post<{ id: number; quotation_number: string }>(`${BASE}/quotations/${id}/duplicate`, {}),
  createInvoiceFromQuotation: (id: number, payload: Partial<InvoicePayload> = {}) => api.post<{ id: number; invoice_number: string }>(`${BASE}/quotations/${id}/invoice`, payload),
  downloadQuotationPdf: (id: number, number: string) => download(`${BASE}/quotations/${id}/pdf`, `${number}.pdf`),

  getTemplates: (filters: Record<string, unknown> = {}) => api.get<Paginated<StudioQuotationTemplateSummary>>(`${BASE}/quotation-templates${query(filters)}`),
  getTemplate: (id: number) => api.get<StudioQuotationTemplate>(`${BASE}/quotation-templates/${id}`),
  createTemplate: (payload: QuotationTemplatePayload) => api.post<{ id: number; template_code: string }>(`${BASE}/quotation-templates`, payload),
  updateTemplate: (id: number, payload: Partial<QuotationTemplatePayload>) => api.patch<{ id: number }>(`${BASE}/quotation-templates/${id}`, payload),
  activateTemplate: (id: number) => api.post<{ id: number; is_active: boolean }>(`${BASE}/quotation-templates/${id}/activate`, {}),
  deactivateTemplate: (id: number) => api.post<{ id: number; is_active: boolean }>(`${BASE}/quotation-templates/${id}/deactivate`, {}),

  getInvoices: (filters: Record<string, unknown> = {}) => api.get<Paginated<StudioInvoiceSummary>>(`${BASE}/invoices${query(filters)}`),
  getInvoice: (id: number) => api.get<StudioInvoiceDetail>(`${BASE}/invoices/${id}`),
  createInvoice: (payload: InvoicePayload) => api.post<{ id: number; invoice_number: string }>(`${BASE}/invoices`, payload),
  updateInvoice: (id: number, payload: Partial<InvoicePayload>) => api.patch<{ id: number }>(`${BASE}/invoices/${id}`, payload),
  issueInvoice: (id: number) => api.post<{ id: number; status_code: string; already_issued?: boolean }>(`${BASE}/invoices/${id}/issue`, {}),
  voidInvoice: (id: number, reason: string) => api.post<{ id: number; status_code: string }>(`${BASE}/invoices/${id}/void`, { reason }),
  getSchedules: (id: number) => api.get<StudioPaymentSchedule[]>(`${BASE}/invoices/${id}/schedules`),
  getPayments: (id: number) => api.get<StudioPaymentRecord[]>(`${BASE}/invoices/${id}/payments`),
  downloadInvoicePdf: (id: number, number: string) => download(`${BASE}/invoices/${id}/pdf`, `${number}.pdf`),
};

import { api } from '../../lib/api';
import type { CraftCustomer, CustomerCommercialSummary, CustomerDetailResponse, CustomerFilters, CustomerFormData, CustomerSummaryCards, DuplicateCustomerCandidate, PaginatedResult, PartnerPriceRule, PartyContact, ResolvedPartnerPrice } from '../../types/craft-customers';

const BASE = '/craft/customers';
const query = (filters: CustomerFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)); });
  return params.toString();
};
const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob); const element = document.createElement('a'); element.href = url; element.download = filename; document.body.appendChild(element); element.click(); element.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const craftCustomersApi = {
  getCustomers: (filters: CustomerFilters = {}) => api.get<PaginatedResult<CraftCustomer>>(`${BASE}?${query(filters)}`),
  getPartners: (filters: CustomerFilters = {}) => api.get<PaginatedResult<CraftCustomer>>(`${BASE}/partners?${query(filters)}`),
  getSummary: () => api.get<CustomerSummaryCards>(`${BASE}/summary`),
  getCustomer: (id: number) => api.get<CustomerDetailResponse>(`${BASE}/${id}`),
  createCustomer: (data: CustomerFormData) => api.post<{ id: number; code: string }>(BASE, data),
  updateCustomer: (id: number, data: Partial<CustomerFormData>) => api.patch<{ message: string }>(`${BASE}/${id}`, data),
  setStatus: (id: number, active: boolean) => api.patch<{ message: string }>(`${BASE}/${id}/status`, { active }),
  getDuplicates: (data: Pick<CustomerFormData, 'display_name' | 'legal_name' | 'email' | 'phone' | 'tax_id'>) => api.post<DuplicateCustomerCandidate[]>(`${BASE}/duplicates`, data),
  getOrders: (id: number, page = 1, limit = 20) => api.get<PaginatedResult<CustomerDetailResponse['orders']['items'][number]>>(`${BASE}/${id}/orders?page=${page}&limit=${limit}`),
  getCommercial: (id: number) => api.get<CustomerCommercialSummary>(`${BASE}/${id}/commercial-summary`),
  createContact: (id: number, data: Omit<PartyContact, 'id' | 'party_id' | 'created_at' | 'updated_at'>) => api.post<{ id: number }>(`${BASE}/${id}/contacts`, data),
  updateContact: (id: number, contactId: number, data: Partial<Omit<PartyContact, 'id' | 'party_id' | 'created_at' | 'updated_at'>>) => api.patch<{ message: string }>(`${BASE}/${id}/contacts/${contactId}`, data),
  deleteContact: (id: number, contactId: number) => api.delete<{ message: string }>(`${BASE}/${id}/contacts/${contactId}`),
  promotePartner: (id: number, data: { valid_from?: string | null; valid_until?: string | null }) => api.post<{ message: string }>(`${BASE}/${id}/partner`, data),
  updatePartner: (id: number, data: { valid_from?: string | null; valid_until?: string | null }) => api.patch<{ message: string }>(`${BASE}/${id}/partner`, data),
  endPartner: (id: number, endDate?: string | null) => api.delete<{ message: string }>(`${BASE}/${id}/partner`, { body: JSON.stringify({ end_date: endDate || null }) }),
  getPriceRules: (id: number) => api.get<PartnerPriceRule[]>(`${BASE}/${id}/price-rules`),
  createPriceRule: (id: number, data: { product_id: number; variant_id?: number | null; minimum_qty: number; special_price?: number | null; discount_percent?: number | null; valid_from?: string | null; valid_until?: string | null; is_active?: boolean }) => api.post<{ id: number }>(`${BASE}/${id}/price-rules`, data),
  updatePriceRule: (id: number, ruleId: number, data: Partial<Omit<PartnerPriceRule, 'id' | 'partner_party_id' | 'product_id' | 'product_name' | 'product_sku' | 'variant_name' | 'variant_sku' | 'normal_price'>>) => api.patch<{ message: string }>(`${BASE}/${id}/price-rules/${ruleId}`, data),
  deactivatePriceRule: (id: number, ruleId: number) => api.delete<{ message: string }>(`${BASE}/${id}/price-rules/${ruleId}`),
  resolvePrice: (id: number, productId: number, variantId: number | null, quantity: number) => api.get<ResolvedPartnerPrice | null>(`${BASE}/${id}/resolve-price?productId=${productId}&${variantId ? `variantId=${variantId}&` : ''}quantity=${quantity}`),
  exportCustomers: async (filters: CustomerFilters = {}) => download(await api.getBlob(`${BASE}/export?${query(filters)}`), 'craft-customers.csv'),
};

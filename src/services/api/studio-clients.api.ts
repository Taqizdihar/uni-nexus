import { api } from '../../lib/api';
import type {
  ClientActivityEntry, ClientCommercialSummary, ClientContact, ClientDetailResponse, ClientDuplicateCandidate,
  ClientInvoice, ClientListFilters, ClientQuotation, ClientSummary, CreateClientRequest, PaginatedClientProjects,
  PaginatedClients,
} from '../../types/studio-clients';

const BASE = '/studio/clients';

const query = (filters: object = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const studioClientsApi = {
  getSummary: () => api.get<ClientSummary>(`${BASE}/summary`),
  getClients: (filters: ClientListFilters = {}) => api.get<PaginatedClients>(`${BASE}${query(filters)}`),
  exportClients: async (filters: ClientListFilters = {}) => download(await api.getBlob(`${BASE}/export${query(filters)}`), 'studio-clients.csv'),
  findDuplicates: (data: { display_name?: string; legal_name?: string; email?: string; phone?: string; tax_id?: string }) => api.post<ClientDuplicateCandidate[]>(`${BASE}/duplicates`, data),

  createClient: (data: CreateClientRequest) => api.post<{ id: number; code: string; display_name: string; reused: boolean }>(BASE, data),
  getClient: (id: number) => api.get<ClientDetailResponse>(`${BASE}/${id}`),
  updateClient: (id: number, data: Record<string, unknown>) => api.patch<{ id: number }>(`${BASE}/${id}`, data),
  activateClient: (id: number) => api.post<{ id: number }>(`${BASE}/${id}/activate`, {}),
  deactivateClient: (id: number, reason?: string | null, confirmActiveProjects = false) =>
    api.post<{ id: number }>(`${BASE}/${id}/deactivate`, { reason: reason || null, confirm_active_projects: confirmActiveProjects }),

  getContacts: (id: number) => api.get<ClientContact[]>(`${BASE}/${id}/contacts`),
  createContact: (id: number, data: { full_name: string; job_title?: string | null; email?: string | null; phone?: string | null; whatsapp?: string | null; is_primary?: boolean; notes?: string | null }) =>
    api.post<{ id: number; is_primary: boolean }>(`${BASE}/${id}/contacts`, data),
  updateContact: (id: number, contactId: number, data: Record<string, unknown>) => api.patch<{ id: number }>(`${BASE}/${id}/contacts/${contactId}`, data),
  deleteContact: (id: number, contactId: number) => api.delete<{ id: number; promoted_contact_id: number | null }>(`${BASE}/${id}/contacts/${contactId}`),

  getProjects: (id: number, status: 'all' | 'active' | 'completed' | 'cancelled' = 'all', page = 1, limit = 20) =>
    api.get<PaginatedClientProjects>(`${BASE}/${id}/projects${query({ status, page, limit })}`),
  getCommercialSummary: (id: number) => api.get<ClientCommercialSummary>(`${BASE}/${id}/commercial-summary`),
  getQuotations: (id: number) => api.get<ClientQuotation[]>(`${BASE}/${id}/quotations`),
  getInvoices: (id: number) => api.get<ClientInvoice[]>(`${BASE}/${id}/invoices`),
  getActivity: (id: number) => api.get<ClientActivityEntry[]>(`${BASE}/${id}/activity`),
};

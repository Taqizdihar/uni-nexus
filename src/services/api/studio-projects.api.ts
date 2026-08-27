import { api } from '../../lib/api';
import type {
  ActiveProjectsResponse, ClientDuplicateCandidate, CreateProjectRequest, DeliverableStatus,
  ExternalPartyOption, MilestoneBoardResponse, MilestoneStatus, PaginatedProjects, ProjectActivityEntry,
  ProjectDetailResponse, ProjectListFilters, ProjectOverview, ProjectStatus, ServicePackageOption,
  StudioClientOption, StudioServiceOption, StudioUserOption,
} from '../../types/studio-projects';

const BASE = '/studio/projects';
const REFERENCES = '/studio/references';

const query = (filters: object = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

export const studioProjectsApi = {
  getOverview: () => api.get<ProjectOverview>(`${BASE}/overview`),
  getProjects: (filters: ProjectListFilters = {}) => api.get<PaginatedProjects>(`${BASE}${query(filters)}`),
  getActiveProjects: () => api.get<ActiveProjectsResponse>(`${BASE}/active`),
  getMilestoneBoard: (filters: Record<string, unknown> = {}) => api.get<MilestoneBoardResponse>(`${BASE}/milestones${query(filters)}`),
  getProjectTypes: () => api.get<string[]>(`${BASE}/project-types`),
  getProject: (id: number) => api.get<ProjectDetailResponse>(`${BASE}/${id}`),
  getActivity: (id: number) => api.get<ProjectActivityEntry[]>(`${BASE}/${id}/activity`),

  createProject: (data: CreateProjectRequest) => api.post<{ id: number; project_code: string; contract_value: number; service_subtotal: number }>(BASE, data),
  updateProject: (id: number, data: Record<string, unknown>) => api.patch<{ message: string }>(`${BASE}/${id}`, data),
  changeStatus: (id: number, status: ProjectStatus, reason?: string | null) => api.post<{ id: number; status_code: ProjectStatus }>(`${BASE}/${id}/status`, { status, reason: reason || null }),
  cancelProject: (id: number, reason: string) => api.post<{ id: number; status_code: 'cancelled' }>(`${BASE}/${id}/cancel`, { reason }),

  addService: (id: number, data: { service_id?: number | null; package_id?: number | null; description: string; quantity: number; unit_price: number }) =>
    api.post<{ id: number; subtotal: number }>(`${BASE}/${id}/services`, data),
  updateService: (id: number, lineId: number, data: Record<string, unknown>) => api.patch<{ id: number; subtotal: number }>(`${BASE}/${id}/services/${lineId}`, data),
  removeService: (id: number, lineId: number) => api.delete<{ id: number; subtotal: number }>(`${BASE}/${id}/services/${lineId}`),
  syncContractValue: (id: number) => api.post<{ contract_value: number }>(`${BASE}/${id}/services/sync-contract-value`, {}),

  addMember: (id: number, data: { user_id: number; role_label?: string | null; allocation_percent?: number | null }) => api.post<{ user_id: number; rejoined: boolean }>(`${BASE}/${id}/members`, data),
  updateMember: (id: number, userId: number, data: { role_label?: string | null; allocation_percent?: number | null }) => api.patch<{ user_id: number }>(`${BASE}/${id}/members/${userId}`, data),
  endMembership: (id: number, userId: number) => api.delete<{ user_id: number }>(`${BASE}/${id}/members/${userId}`),

  createMilestone: (id: number, data: { title: string; description?: string | null; due_at?: string | null }) => api.post<{ id: number }>(`${BASE}/${id}/milestones`, data),
  updateMilestone: (id: number, milestoneId: number, data: Record<string, unknown>) => api.patch<{ id: number }>(`${BASE}/${id}/milestones/${milestoneId}`, data),
  changeMilestoneStatus: (id: number, milestoneId: number, status: Exclude<MilestoneStatus, 'late'>, reason?: string | null) =>
    api.post<{ id: number; status_code: MilestoneStatus }>(`${BASE}/${id}/milestones/${milestoneId}/status`, { status, reason: reason || null }),
  reorderMilestones: (id: number, milestoneIds: number[]) => api.post<{ order: number[] }>(`${BASE}/${id}/milestones/reorder`, { milestone_ids: milestoneIds }),
  deleteMilestone: (id: number, milestoneId: number) => api.delete<{ id: number }>(`${BASE}/${id}/milestones/${milestoneId}`),

  createDeliverable: (id: number, data: { milestone_id?: number | null; title: string; description?: string | null; due_at?: string | null; external_url?: string | null }) =>
    api.post<{ id: number }>(`${BASE}/${id}/deliverables`, data),
  updateDeliverable: (id: number, deliverableId: number, data: Record<string, unknown>) => api.patch<{ id: number }>(`${BASE}/${id}/deliverables/${deliverableId}`, data),
  changeDeliverableStatus: (id: number, deliverableId: number, status: DeliverableStatus, reason?: string | null) =>
    api.post<{ id: number; status_code: DeliverableStatus }>(`${BASE}/${id}/deliverables/${deliverableId}/status`, { status, reason: reason || null }),
  uploadDeliverableFile: (id: number, deliverableId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ id: number; file_name: string | null }>(`${BASE}/${id}/deliverables/${deliverableId}/file`, form);
  },
  downloadDeliverableFile: async (id: number, deliverableId: number, fileName: string) => {
    const blob = await api.getBlob(`${BASE}/${id}/deliverables/${deliverableId}/download`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'deliverable';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },
  deleteDeliverable: (id: number, deliverableId: number) => api.delete<{ id: number }>(`${BASE}/${id}/deliverables/${deliverableId}`),

  addExternal: (id: number, data: Record<string, unknown>) => api.post<{ id: number }>(`${BASE}/${id}/externals`, data),
  updateExternal: (id: number, assignmentId: number, data: Record<string, unknown>) => api.patch<{ id: number }>(`${BASE}/${id}/externals/${assignmentId}`, data),
  endExternal: (id: number, assignmentId: number, endDate?: string | null) => api.post<{ id: number; end_date: string }>(`${BASE}/${id}/externals/${assignmentId}/end`, { end_date: endDate || null }),

  quickCreateClient: (data: Record<string, unknown>) => api.post<StudioClientOption & { reused: boolean }>(`${BASE}/clients/quick`, data),
  findClientDuplicates: (data: Record<string, unknown>) => api.post<ClientDuplicateCandidate[]>(`${BASE}/clients/duplicates`, data),
};

/** Shared Studio lookups — reusable by future Clients, Services, Billing and Finance modules. */
export const studioReferencesApi = {
  getClients: (search?: string, limit = 50) => api.get<StudioClientOption[]>(`${REFERENCES}/clients${query({ search, limit })}`),
  getServices: () => api.get<StudioServiceOption[]>(`${REFERENCES}/services`),
  getServicePackages: () => api.get<ServicePackageOption[]>(`${REFERENCES}/service-packages`),
  getUsers: (search?: string) => api.get<StudioUserOption[]>(`${REFERENCES}/users${query({ search })}`),
  getExternalParties: (search?: string) => api.get<ExternalPartyOption[]>(`${REFERENCES}/external-parties${query({ search })}`),
};

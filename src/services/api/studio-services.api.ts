import { api } from '../../lib/api';
import type {
  CreateStudioService, CreateStudioServicePackage, PaginatedStudioServices, PaginatedUsage, StudioPackageProjectUsage,
  StudioServiceActivity, StudioServiceCategory, StudioServiceCommercialUsage, StudioServiceDetail, StudioServiceFilters,
  StudioServiceOverview, StudioServicePackage, StudioServicePackageDetail, StudioServicePackageMembership, StudioServiceProjectUsage,
} from '../../types/studio-services';

const BASE = '/studio/services';
const query = (filters: Record<string, unknown> = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)); });
  return params.size ? `?${params.toString()}` : '';
};

export const studioServicesApi = {
  overview: () => api.get<StudioServiceOverview>(`${BASE}/overview`),
  list: (filters: StudioServiceFilters = {}) => api.get<PaginatedStudioServices>(`${BASE}${query(filters as Record<string, unknown>)}`),
  create: (data: CreateStudioService) => api.post<{ id: number; code: string }>(BASE, data),
  get: (id: number) => api.get<{ service: StudioServiceDetail }>(`${BASE}/${id}`),
  update: (id: number, data: Partial<CreateStudioService>) => api.patch<{ id: number }>(`${BASE}/${id}`, data),
  activate: (id: number) => api.post<{ id: number }>(`${BASE}/${id}/activate`, {}),
  deactivate: (id: number) => api.post<{ id: number }>(`${BASE}/${id}/deactivate`, {}),
  projects: (id: number, page = 1) => api.get<PaginatedUsage<StudioServiceProjectUsage>>(`${BASE}/${id}/projects${query({ page, limit: 20 })}`),
  memberships: (id: number) => api.get<StudioServicePackageMembership[]>(`${BASE}/${id}/packages`),
  commercialUsage: (id: number) => api.get<StudioServiceCommercialUsage>(`${BASE}/${id}/commercial-usage`),
  activity: (id: number) => api.get<StudioServiceActivity[]>(`${BASE}/${id}/activity`),

  categories: () => api.get<StudioServiceCategory[]>(`${BASE}/categories`),
  createCategory: (data: { name: string; code?: string; is_active?: boolean }) => api.post<{ id: number; code: string }>(`${BASE}/categories`, data),
  updateCategory: (id: number, data: { name: string }) => api.patch<{ id: number }>(`${BASE}/categories/${id}`, data),
  activateCategory: (id: number) => api.post<{ id: number }>(`${BASE}/categories/${id}/activate`, {}),
  deactivateCategory: (id: number, confirmActiveServices = false) => api.post<{ id: number; active_service_count: number }>(`${BASE}/categories/${id}/deactivate`, { confirm_active_services: confirmActiveServices }),

  packages: (filters: { status?: string; search?: string } = {}) => api.get<StudioServicePackage[]>(`${BASE}/packages${query(filters)}`),
  createPackage: (data: CreateStudioServicePackage) => api.post<{ id: number; code: string }>(`${BASE}/packages`, data),
  getPackage: (id: number) => api.get<{ package: StudioServicePackageDetail }>(`${BASE}/packages/${id}`),
  updatePackage: (id: number, data: Partial<CreateStudioServicePackage>) => api.patch<{ id: number }>(`${BASE}/packages/${id}`, data),
  activatePackage: (id: number) => api.post<{ id: number }>(`${BASE}/packages/${id}/activate`, {}),
  deactivatePackage: (id: number) => api.post<{ id: number }>(`${BASE}/packages/${id}/deactivate`, {}),
  packageProjects: (id: number, page = 1) => api.get<PaginatedUsage<StudioPackageProjectUsage>>(`${BASE}/packages/${id}/projects${query({ page, limit: 20 })}`),
};

import { api } from '../../lib/api';
import type { AssetInput, AvailabilityResult, EquipmentReferences, PaginatedAssignments, PaginatedAssets, StudioAsset, StudioAssetActivity, StudioAssetAssignment, StudioAssetFilters, StudioAssetMaintenanceRecord, StudioEquipmentOverview } from '../../types/studio-equipment';

const BASE = '/studio/equipment';
const query = (filters: object = {}) => { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '' && value !== false) params.set(key, String(value)); }); const result = params.toString(); return result ? `?${result}` : ''; };

export const studioEquipmentApi = {
  overview: () => api.get<StudioEquipmentOverview>(`${BASE}/overview`), references: () => api.get<EquipmentReferences>(`${BASE}/references`),
  listAssets: (filters: StudioAssetFilters = {}) => api.get<PaginatedAssets>(`${BASE}/assets${query(filters)}`), getAsset: (id: number) => api.get<StudioAsset>(`${BASE}/assets/${id}`),
  createAsset: (input: AssetInput) => api.post<{ id: number; asset_code: string }>(`${BASE}/assets`, input), updateAsset: (id: number, input: Partial<AssetInput>) => api.patch<{ id: number }>(`${BASE}/assets/${id}`, input),
  changeStatus: (id: number, status: string, reason?: string | null, notes?: string | null) => api.post<{ id: number; status_code: string }>(`${BASE}/assets/${id}/status`, { status, reason: reason || null, notes: notes || null }),
  assetActivity: (id: number) => api.get<StudioAssetActivity[]>(`${BASE}/assets/${id}/activity`), assetAssignments: (id: number) => api.get<StudioAssetAssignment[]>(`${BASE}/assets/${id}/assignments`), assetMaintenance: (id: number) => api.get<StudioAssetMaintenanceRecord[]>(`${BASE}/assets/${id}/maintenance`),
  assignments: (filters: Record<string, unknown> = {}) => api.get<PaginatedAssignments>(`${BASE}/assignments${query(filters)}`), createAssignment: (assetId: number, input: { project_id: number; assigned_from: string; assigned_until?: string | null; notes?: string | null }) => api.post<StudioAssetAssignment>(`${BASE}/assets/${assetId}/assignments`, input),
  returnAssignment: (assignmentId: number, returned_at?: string | null) => api.post<{ id: number; returned_at: string }>(`${BASE}/assignments/${assignmentId}/return`, { returned_at: returned_at || null }), cancelAssignment: (assignmentId: number) => api.delete<{ id: number; cancelled: boolean }>(`${BASE}/assignments/${assignmentId}`),
  availability: (from: string, until: string, category?: string) => api.get<AvailabilityResult[]>(`${BASE}/availability${query({ from, until, category })}`),
  maintenance: (filters: Record<string, unknown> = {}) => api.get<StudioAssetMaintenanceRecord[]>(`${BASE}/maintenance${query(filters)}`), startMaintenance: (id: number) => api.post<{ id: number; status_code: string; future_bookings: number }>(`${BASE}/assets/${id}/maintenance/start`, {}),
  completeMaintenance: (id: number, input: { maintenance_type: string; performed_at: string; performed_by_party_id?: number | null; cost: number; next_due_at?: string | null; notes?: string | null; outcome_status?: 'available' | 'retired' | 'lost' }) => api.post<{ id: number }>(`${BASE}/assets/${id}/maintenance/complete`, input),
  addMaintenance: (id: number, input: { maintenance_type: string; performed_at: string; performed_by_party_id?: number | null; cost: number; next_due_at?: string | null; notes?: string | null }) => api.post<{ id: number }>(`${BASE}/assets/${id}/maintenance/records`, input),
  updateMaintenance: (assetId: number, recordId: number, input: Record<string, unknown>) => api.patch<{ id: number }>(`${BASE}/assets/${assetId}/maintenance/records/${recordId}`, input),
};

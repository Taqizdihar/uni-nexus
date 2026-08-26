import { api } from '../../lib/api';
import type { CraftMaterial, FilamentSpool, InventoryMovement, MaterialBatch, MaterialCategory, MaterialDetail, MaterialPayload, MaterialWaste, ReceiveStockPayload, SupplierReference, UnitOfMeasure } from '../../types/craft-materials';

const BASE = '/craft/materials';
const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams(); Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.size ? `?${params.toString()}` : '';
};

export const craftMaterialsApi = {
  getMaterials: (filters: { search?: string; categoryType?: string; status?: string } = {}) => api.get<CraftMaterial[]>(`${BASE}${query(filters)}`),
  getMaterial: (id: number) => api.get<MaterialDetail>(`${BASE}/${id}`),
  createMaterial: (data: MaterialPayload) => api.post<{ id: number; sku: string }>(BASE, data),
  updateMaterial: (id: number, data: Partial<MaterialPayload>) => api.patch<MaterialDetail>(`${BASE}/${id}`, data),
  archiveMaterial: (id: number) => api.delete<{ message: string }>(`${BASE}/${id}`),
  reactivateMaterial: (id: number) => api.post<{ message: string }>(`${BASE}/${id}/reactivate`, {}),
  getCategories: () => api.get<MaterialCategory[]>(`${BASE}/categories`),
  createCategory: (data: { code?: string | null; name: string; category_type: string; is_active?: boolean }) => api.post<{ id: number; code: string }>(`${BASE}/categories`, data),
  updateCategory: (id: number, data: { code?: string | null; name?: string; is_active?: boolean }) => api.patch<{ id: number; message: string }>(`${BASE}/categories/${id}`, data),
  getUnits: () => api.get<UnitOfMeasure[]>(`${BASE}/units`), getSuppliers: () => api.get<SupplierReference[]>(`${BASE}/suppliers`),
  receiveStock: (id: number, data: ReceiveStockPayload) => api.post<{ batch_id: number; batch_code: string; spool_id: number | null }>(`${BASE}/${id}/receive`, data),
  adjustStock: (id: number, data: { material_batch_id: number; direction: 'in' | 'out'; quantity: number; spool_id?: number | null; notes: string }) => api.post<{ message: string }>(`${BASE}/${id}/adjustments`, data),
  getSpools: (materialId?: number) => api.get<FilamentSpool[]>(`${BASE}/spools${query({ materialId })}`),
  updateSpool: (id: number, data: { current_net_weight_g?: number | null; storage_location?: string | null; notes?: string | null; opened?: boolean; dried?: boolean }) => api.patch<{ message: string }>(`${BASE}/spools/${id}`, data),
  getMovements: (materialId?: number) => api.get<InventoryMovement[]>(`${BASE}/movements${query({ materialId })}`),
  getLowStock: () => api.get<CraftMaterial[]>(`${BASE}/low-stock`),
  getWaste: () => api.get<MaterialWaste[]>(`${BASE}/waste`),
  recordWaste: (data: { material_id: number; material_batch_id: number; quantity: number; waste_reason: 'support' | 'purge' | 'calibration' | 'scrap' | 'other'; notes?: string | null }) => api.post<{ id: number; message: string }>(`${BASE}/waste`, data),
};

export type { MaterialBatch };

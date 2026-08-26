import { api } from '../../lib/api';
import type {
  BomPayload, CraftProductSummary, DesignFile, PrintProfile, PrintProfilePayload, ProductBom, ProductCategory,
  ProductDetailResponse, ProductPayload, ProductStatus, ProductType, ProductVariant, ProductCosting, ProductUsageSummary, VariantPayload,
} from '../../types/craft-products';

const BASE_PATH = '/craft/products';

function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  const value = params.toString();
  return value ? `?${value}` : '';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const craftProductsApi = {
  getProducts: (filters: { search?: string; categoryId?: number; productType?: ProductType; status?: ProductStatus } = {}) => api.get<CraftProductSummary[]>(`${BASE_PATH}${query(filters)}`),
  getProduct: (id: number) => api.get<ProductDetailResponse>(`${BASE_PATH}/${id}`),
  createProduct: (data: ProductPayload) => api.post<{ id: number; sku: string }>(BASE_PATH, data),
  updateProduct: (id: number, data: Partial<ProductPayload>) => api.patch<ProductDetailResponse>(`${BASE_PATH}/${id}`, data),
  archiveProduct: (id: number) => api.delete<{ message: string }>(`${BASE_PATH}/${id}`),
  reactivateProduct: (id: number) => api.post<{ message: string }>(`${BASE_PATH}/${id}/reactivate`, {}),
  uploadImage: (id: number, file: File) => { const data = new FormData(); data.set('image', file); return api.post<{ image_path: string }>(`${BASE_PATH}/${id}/image`, data); },
  getImageBlob: (id: number) => api.getBlob(`${BASE_PATH}/${id}/image`),
  removeImage: (id: number) => api.delete<{ message: string }>(`${BASE_PATH}/${id}/image`),

  getCategories: () => api.get<ProductCategory[]>(`${BASE_PATH}/categories`),
  createCategory: (data: { code?: string | null; name: string; parent_id?: number | null; is_active?: boolean }) => api.post<ProductCategory>(`${BASE_PATH}/categories`, data),
  updateCategory: (id: number, data: Partial<{ code: string | null; name: string; parent_id: number | null; is_active: boolean }>) => api.patch<ProductCategory>(`${BASE_PATH}/categories/${id}`, data),
  deactivateCategory: (id: number) => api.delete<{ message: string }>(`${BASE_PATH}/categories/${id}`),

  getVariants: (productId: number) => api.get<ProductVariant[]>(`${BASE_PATH}/${productId}/variants`),
  createVariant: (productId: number, data: VariantPayload) => api.post<{ id: number; sku: string }>(`${BASE_PATH}/${productId}/variants`, data),
  updateVariant: (productId: number, variantId: number, data: Partial<VariantPayload>) => api.patch<ProductVariant>(`${BASE_PATH}/${productId}/variants/${variantId}`, data),

  getBoms: (productId: number) => api.get<ProductBom[]>(`${BASE_PATH}/${productId}/boms`),
  createBom: (productId: number, data: BomPayload) => api.post<{ id: number; version_no: number }>(`${BASE_PATH}/${productId}/boms`, data),
  updateBom: (productId: number, bomId: number, data: Partial<BomPayload>) => api.patch<ProductBom[]>(`${BASE_PATH}/${productId}/boms/${bomId}`, data),
  activateBom: (productId: number, bomId: number) => api.post<{ message: string }>(`${BASE_PATH}/${productId}/boms/${bomId}/activate`, {}),

  getDesignFiles: (filters: { productId?: number; variantId?: number } = {}) => api.get<DesignFile[]>(`${BASE_PATH}/design-files${query(filters)}`),
  uploadDesignFile: (data: FormData) => api.post<{ id: number }>(`${BASE_PATH}/design-files`, data),
  updateDesignFile: (designId: number, data: Partial<{ product_id: number | null; variant_id: number | null; name: string; version_label: string | null; is_final: boolean; notes: string | null }>) => api.patch<DesignFile>(`${BASE_PATH}/design-files/${designId}`, data),
  downloadDesignFile: async (file: DesignFile) => downloadBlob(await api.getBlob(`${BASE_PATH}/design-files/${file.id}/download`), file.file_name),
  deleteDesignFile: (designId: number) => api.delete<{ message: string }>(`${BASE_PATH}/design-files/${designId}`),

  getPrintProfiles: (filters: { productId?: number; variantId?: number; printerId?: number } = {}) => api.get<PrintProfile[]>(`${BASE_PATH}/print-profiles${query(filters)}`),
  createPrintProfile: (data: PrintProfilePayload) => api.post<{ id: number }>(`${BASE_PATH}/print-profiles`, data),
  updatePrintProfile: (profileId: number, data: Partial<PrintProfilePayload>) => api.patch<PrintProfile>(`${BASE_PATH}/print-profiles/${profileId}`, data),
  setDefaultPrintProfile: (profileId: number) => api.post<{ message: string }>(`${BASE_PATH}/print-profiles/${profileId}/default`, {}),
  deletePrintProfile: (profileId: number) => api.delete<{ message: string }>(`${BASE_PATH}/print-profiles/${profileId}`),

  getCosting: (id: number) => api.get<ProductCosting & { usage?: ProductUsageSummary }>(`${BASE_PATH}/${id}/costing`),
};

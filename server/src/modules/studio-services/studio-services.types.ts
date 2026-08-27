export type StudioServicePricingModel = 'fixed' | 'hourly' | 'daily' | 'package' | 'custom';
export type StudioServiceStatus = 'active' | 'inactive' | 'all';

export interface ServiceListFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  pricingModel?: StudioServicePricingModel;
  status?: StudioServiceStatus;
  sortBy?: 'name' | 'newest' | 'base_price' | 'most_used';
  sortOrder?: 'asc' | 'desc';
}

export interface ServiceProjectFilters { page?: number; limit?: number; }

export interface PackageItemInput {
  service_id: number;
  quantity: number;
  notes?: string | null;
}

export interface PackageListFilters {
  status?: StudioServiceStatus;
  search?: string;
}

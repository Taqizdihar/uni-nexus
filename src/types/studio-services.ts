export type StudioServicePricingModel = 'fixed' | 'hourly' | 'daily' | 'package' | 'custom';
export type StudioServiceStatus = 'active' | 'inactive' | 'all';

export interface StudioServiceCategory {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  service_count: number;
  active_service_count: number;
}

export interface StudioService {
  id: number;
  business_unit_id: number;
  category_id: number | null;
  category_code: string | null;
  category_name: string | null;
  category_is_active: boolean | null;
  code: string;
  name: string;
  description: string | null;
  pricing_model: StudioServicePricingModel;
  base_price: number;
  unit_label: string | null;
  is_active: boolean;
  project_usage_count: number;
  package_membership_count: number;
  project_scope_value: number;
  created_at: string;
  updated_at: string;
}
export type StudioServiceDetail = StudioService;

export interface StudioServicePackageMembership {
  id: number;
  code: string;
  name: string;
  description: string | null;
  package_price: number;
  is_active: boolean;
  quantity: number;
  notes: string | null;
}

export interface StudioServiceProjectUsage {
  id: number;
  project_id: number;
  project_code: string;
  project_name: string;
  status_code: string;
  client_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

export interface StudioServiceCommercialUsage {
  quotations: Array<{ id: number; quotation_id: number; quotation_number: string; issue_date: string; status_code: string; client_name: string | null; description: string; quantity: number; unit_price: number; line_total: number }>;
  invoices: Array<{ id: number; invoice_id: number; invoice_number: string; issue_date: string; status_code: string; client_name: string | null; description: string; quantity: number; unit_price: number; line_total: number }>;
  quotation_templates: Array<{ id: number; template_id: number; template_code: string; template_name: string; description: string; default_quantity: number; default_unit_price: number | null }>;
}

export interface StudioServiceActivity { id: number; action_code: string; description: string | null; created_at: string; user_name: string | null; }
export interface StudioServiceOverview { active_services: number; inactive_services: number; active_categories: number; active_packages: number; services_used_in_projects: number; }
export interface PaginatedStudioServices { items: StudioService[]; meta: { page: number; limit: number; total: number; totalPages: number }; }

export interface StudioServiceFilters { page?: number; limit?: number; search?: string; category_id?: number; pricing_model?: StudioServicePricingModel | ''; status?: StudioServiceStatus; sort_by?: 'name' | 'newest' | 'base_price' | 'most_used'; sort_order?: 'asc' | 'desc'; }
export interface ServicePackageItemDraft { service_id: number; quantity: number; notes?: string | null; }
export interface StudioServicePackageItem extends ServicePackageItemDraft { id: number; service_code: string; service_name: string; service_description: string | null; base_price: number; unit_label: string | null; pricing_model: StudioServicePricingModel; service_is_active: boolean; }
export interface StudioServicePackage { id: number; code: string; name: string; description: string | null; package_price: number; is_active: boolean; item_count: number; reference_value: number; project_usage_count: number; created_at: string; updated_at: string; }
export interface StudioServicePackageDetail extends StudioServicePackage { items: StudioServicePackageItem[]; }
export interface StudioPackageProjectUsage extends StudioServiceProjectUsage {}
export interface PaginatedUsage<T> { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number }; }

export interface CreateStudioService { name: string; category_id?: number | null; description?: string | null; pricing_model: StudioServicePricingModel; base_price: number; unit_label?: string | null; is_active?: boolean; }
export interface CreateStudioServicePackage { name: string; description?: string | null; package_price: number; is_active?: boolean; items: ServicePackageItemDraft[]; }

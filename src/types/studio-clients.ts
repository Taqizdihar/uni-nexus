export type ClientRelationshipStatus = 'active' | 'role_inactive' | 'party_inactive';
export type ClientPartyKind = 'individual' | 'company' | 'institution';

export interface StudioClient {
  id: number;
  code: string;
  party_kind: ClientPartyKind;
  display_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status_code: string;
  role_is_active: boolean;
  role_valid_from: string | null;
  role_valid_until: string | null;
  relationship_since: string;
  relationship_status: ClientRelationshipStatus;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  total_project_count: number;
  active_project_count: number;
  meaningful_project_count: number;
  committed_contract_value: number;
  outstanding_balance: number;
  last_project_at: string | null;
  repeat_client: boolean;
}

export interface StudioClientDetail {
  id: number;
  code: string;
  party_kind: ClientPartyKind;
  display_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  tax_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country_code: string;
  notes: string | null;
  status_code: string;
  role_id: number;
  role_is_active: boolean;
  role_valid_from: string | null;
  role_valid_until: string | null;
  relationship_since: string;
  relationship_status: ClientRelationshipStatus;
  created_at: string;
  updated_at: string;
}

export interface ClientOtherRole {
  role_code: string;
  label: string;
}

export interface ClientContact {
  id: number;
  party_id: number;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientProjectSummary {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  cancelled_projects: number;
  pipeline_projects: number;
  committed_contract_value: number;
  pipeline_value: number;
  last_project_at: string | null;
  repeat_client: boolean;
}

export interface ClientDetailResponse {
  client: StudioClientDetail;
  other_roles: ClientOtherRole[];
  primary_contact: ClientContact | null;
  contact_count: number;
  project_summary: ClientProjectSummary;
}

export interface ClientProjectRow {
  id: number;
  project_code: string;
  project_name: string;
  project_type: string | null;
  status_code: string;
  priority_code: string;
  start_date: string | null;
  deadline_at: string | null;
  completed_at: string | null;
  contract_value: number;
  payment_status_code: string;
  manager_name: string | null;
}

export interface PaginatedClientProjects {
  items: ClientProjectRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ClientQuotation {
  id: number;
  quotation_number: string;
  project_id: number | null;
  project_code: string | null;
  project_name: string | null;
  issue_date: string;
  valid_until: string | null;
  status_code: string;
  total_amount: number;
  accepted_at: string | null;
}

export interface ClientInvoice {
  id: number;
  invoice_number: string;
  source_type: string | null;
  source_id: number | null;
  project_code: string | null;
  project_name: string | null;
  issue_date: string;
  due_date: string | null;
  status_code: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
}

export interface ClientCommercialSummary {
  invoice_count: number;
  total_invoiced: number;
  total_paid: number;
  outstanding: number;
  quotation_count: number;
  active_quotation_count: number;
  committed_contract_value: number;
  pipeline_value: number;
}

export interface ClientActivityEntry {
  kind: 'audit' | 'project';
  id: string;
  at: string;
  actor: string | null;
  action_code: string;
  title: string;
  detail: string | null;
}

export interface ClientSummary {
  active_clients: number;
  clients_with_active_project: number;
  repeat_clients: number;
  active_projects: number;
  outstanding_receivables: number;
}

export interface PaginatedClients {
  items: StudioClient[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ClientListFilters {
  page?: number;
  limit?: number;
  search?: string;
  relationship_status?: ClientRelationshipStatus;
  party_kind?: string;
  city?: string;
  has_active_project?: boolean;
  repeat_client?: boolean;
  has_outstanding?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ClientDuplicateCandidate {
  id: number;
  code: string;
  display_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  party_kind: string;
  status_code: string;
  match_reason: string;
  is_studio_client: boolean;
}

export interface ClientContactDraft {
  key: string;
  full_name: string;
  job_title: string;
  email: string;
  phone: string;
  whatsapp: string;
  is_primary: boolean;
  notes: string;
}

export interface CreateClientRequest {
  display_name: string;
  party_kind: ClientPartyKind;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  tax_id?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country_code?: string;
  notes?: string | null;
  contacts: Array<{ full_name: string; job_title?: string | null; email?: string | null; phone?: string | null; whatsapp?: string | null; is_primary?: boolean; notes?: string | null }>;
  use_existing_party_id?: number | null;
}

export type ProjectStatus = 'lead' | 'quotation' | 'approved' | 'in_progress' | 'review' | 'completed' | 'paid' | 'cancelled';
export type ProjectPriority = 'low' | 'normal' | 'high' | 'critical';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'late' | 'cancelled';
export type DeliverableStatus = 'pending' | 'submitted' | 'revision' | 'approved' | 'delivered';
export type ExternalRole = 'vendor' | 'freelancer' | 'partner' | 'talent' | 'other';

export interface ProjectProgress {
  source: 'milestones' | 'deliverables' | 'status' | 'none';
  completed: number;
  total: number;
  percent: number | null;
}

export interface StudioProject {
  id: number;
  project_code: string;
  project_name: string;
  project_type: string | null;
  status_code: ProjectStatus;
  priority_code: ProjectPriority;
  start_date: string | null;
  deadline_at: string | null;
  completed_at: string | null;
  currency_code: string;
  contract_value: number;
  estimated_cost: number;
  actual_cost: number;
  paid_amount: number;
  payment_status_code: string;
  client_party_id: number;
  client_name: string;
  client_code: string;
  project_manager_user_id: number | null;
  manager_name: string | null;
  milestone_total: number;
  milestone_done: number;
  deliverable_total: number;
  deliverable_done: number;
  service_count: number;
  service_subtotal: number;
  primary_service: string | null;
  member_count: number;
  is_overdue: boolean;
  progress: ProjectProgress;
  created_at: string;
  updated_at: string;
}

export interface StudioProjectDetail extends StudioProject {
  brief: string | null;
  notes: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_kind: string;
  client_legal_name: string | null;
  created_by_name: string | null;
  contract_value_matches_services: boolean;
  available_transitions: ProjectStatus[];
  can_cancel: boolean;
}

export interface ProjectServiceLine {
  id: number;
  service_id: number | null;
  package_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  service_code: string | null;
  service_name: string | null;
  pricing_model: string | null;
  unit_label: string | null;
  package_code: string | null;
  package_name: string | null;
}

export interface ProjectMember {
  user_id: number;
  full_name: string;
  email: string;
  employee_code: string | null;
  avatar_path: string | null;
  role_label: string | null;
  allocation_percent: number | null;
  joined_at: string;
  left_at: string | null;
}

export interface ProjectMilestone {
  id: number;
  title: string;
  description: string | null;
  due_at: string | null;
  status_code: MilestoneStatus;
  sort_order: number;
  completed_at: string | null;
  is_overdue: boolean;
  deliverable_count: number;
}

export interface ProjectDeliverable {
  id: number;
  milestone_id: number | null;
  milestone_title: string | null;
  title: string;
  description: string | null;
  status_code: DeliverableStatus;
  due_at: string | null;
  delivered_at: string | null;
  external_url: string | null;
  has_file: boolean;
  file_name: string | null;
  is_overdue: boolean;
}

export interface ProjectExternalAssignment {
  id: number;
  party_id: number;
  party_name: string;
  party_code: string;
  party_kind: string;
  email: string | null;
  phone: string | null;
  assignment_role: ExternalRole | string;
  scope_description: string | null;
  agreed_fee: number;
  payment_status_code: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}

export interface ProjectStatusHistoryEntry {
  id: number;
  from_status_code: ProjectStatus | null;
  to_status_code: ProjectStatus;
  reason: string | null;
  changed_at: string;
  changed_by_name: string | null;
}

export interface ProjectCommercialSummary {
  quotations: Array<{ id: number; quotation_number: string; issue_date: string; valid_until: string | null; status_code: string; total_amount: number; accepted_at: string | null }>;
  invoices: Array<{ id: number; invoice_number: string; issue_date: string; due_date: string | null; status_code: string; total_amount: number; paid_amount: number; balance_due: number }>;
  invoice_summary: { count: number; total_invoiced: number; total_paid: number; outstanding: number };
  expenses: Array<{ id: number; expense_code: string; expense_date: string; description: string; amount: number; status_code: string }>;
  expense_summary: { count: number; total: number };
  external_fee_summary: { count: number; total_agreed_fee: number };
  assets: Array<{ id: number; asset_id: number; asset_code: string; asset_name: string; category: string; assigned_from: string; assigned_until: string | null; returned_at: string | null; notes: string | null }>;
  lock: { locked: boolean; reasons: string[] };
}

export interface ProjectDetailResponse {
  project: StudioProjectDetail;
  services: ProjectServiceLine[];
  members: ProjectMember[];
  milestones: ProjectMilestone[];
  deliverables: ProjectDeliverable[];
  externals: ProjectExternalAssignment[];
  commercial: ProjectCommercialSummary;
  status_history: ProjectStatusHistoryEntry[];
}

export interface ProjectActivityEntry {
  kind: 'status' | 'audit';
  id: string;
  at: string;
  actor: string | null;
  action_code: string;
  title: string;
  detail: string | null;
}

export interface ProjectOverview {
  active_projects: number;
  due_in_7_days: number;
  overdue: number;
  in_review: number;
  completed_this_month: number;
  pipeline: number;
  total_projects: number;
  active_contract_value: number;
}

export interface MilestoneBoardEntry extends ProjectMilestone {
  project_id: number;
  project_code: string;
  project_name: string;
  project_status: ProjectStatus;
  priority_code: ProjectPriority;
  client_name: string;
  manager_name: string | null;
  is_due_soon: boolean;
}

export interface MilestoneBoardResponse {
  items: MilestoneBoardEntry[];
  groups: Record<'overdue' | 'due_soon' | 'in_progress' | 'upcoming' | 'completed', MilestoneBoardEntry[]>;
}

export interface ActiveProjectsResponse {
  items: StudioProject[];
  columns: Record<'approved' | 'in_progress' | 'review', StudioProject[]>;
}

export interface PaginatedProjects {
  items: StudioProject[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ProjectListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  project_type?: string;
  client_id?: number | string;
  manager_id?: number | string;
  service_id?: number | string;
  payment_status?: string;
  overdue?: boolean;
  start_date?: string;
  end_date?: string;
  deadline_from?: string;
  deadline_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface StudioClientOption {
  id: number;
  code: string;
  display_name: string;
  legal_name: string | null;
  party_kind: string;
  email: string | null;
  phone: string | null;
  city: string | null;
}

export interface StudioServiceOption {
  id: number;
  code: string;
  name: string;
  description: string | null;
  pricing_model: string;
  base_price: number;
  unit_label: string | null;
}

export interface ServicePackageOption {
  id: number;
  code: string;
  name: string;
  description: string | null;
  package_price: number;
  item_count: number;
}

export interface StudioUserOption {
  id: number;
  full_name: string;
  email: string;
  employee_code: string | null;
  avatar_path: string | null;
  role_name: string | null;
}

export interface ExternalPartyOption {
  id: number;
  code: string;
  display_name: string;
  party_kind: string;
  email: string | null;
  phone: string | null;
  role_codes: string[];
  is_preferred: boolean;
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

export interface ProjectServiceDraft {
  key: string;
  service_id: string;
  package_id: string;
  description: string;
  quantity: string;
  unit_price: string;
}

export interface ProjectMemberDraft {
  key: string;
  user_id: string;
  role_label: string;
  allocation_percent: string;
}

export interface ProjectMilestoneDraft {
  key: string;
  title: string;
  description: string;
  due_at: string;
}

export interface ProjectDeliverableDraft {
  key: string;
  title: string;
  description: string;
  due_at: string;
  external_url: string;
}

export interface CreateProjectRequest {
  client_party_id: number;
  project_name: string;
  project_type?: string | null;
  priority_code: ProjectPriority;
  start_date?: string | null;
  deadline_at?: string | null;
  currency_code?: string;
  contract_value?: number | null;
  estimated_cost?: number | null;
  brief?: string | null;
  notes?: string | null;
  project_manager_user_id?: number | null;
  services: Array<{ service_id?: number | null; package_id?: number | null; description: string; quantity: number; unit_price: number }>;
  members: Array<{ user_id: number; role_label?: string | null; allocation_percent?: number | null }>;
  milestones: Array<{ title: string; description?: string | null; due_at?: string | null }>;
  deliverables: Array<{ title: string; description?: string | null; due_at?: string | null; external_url?: string | null }>;
}

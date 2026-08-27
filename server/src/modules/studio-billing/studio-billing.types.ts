export type StudioQuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
export type StudioInvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'overdue' | 'void' | 'refunded';

export interface CommercialLineInput {
  service_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_amount?: number;
}

export interface PaymentScheduleInput {
  label?: string | null;
  due_date: string;
  amount: number;
  notes?: string | null;
}

export interface QuotationInput {
  party_id: number;
  project_id?: number | null;
  issue_date: string;
  valid_until?: string | null;
  currency_code?: string;
  discount_amount?: number;
  tax_amount?: number;
  terms?: string | null;
  notes?: string | null;
  items: CommercialLineInput[];
}

export interface QuotationTemplateInput {
  name: string;
  title_template?: string | null;
  intro_text?: string | null;
  terms_text?: string | null;
  footer_text?: string | null;
  default_valid_days?: number;
  config_json?: Record<string, unknown> | null;
  is_active?: boolean;
  items: Array<{ service_id?: number | null; description: string; quantity: number; unit_price?: number | null }>;
}

export interface InvoiceInput {
  party_id: number;
  quotation_id?: number | null;
  source_type?: 'studio_project' | 'manual' | null;
  source_id?: number | null;
  issue_date: string;
  due_date?: string | null;
  currency_code?: string;
  discount_amount?: number;
  payment_terms?: string | null;
  notes?: string | null;
  items: CommercialLineInput[];
  schedules?: PaymentScheduleInput[];
}

export interface QuotationListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  clientId?: number;
  projectId?: number;
  issueFrom?: string;
  issueTo?: string;
  validity?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  clientId?: number;
  projectId?: number;
  issueFrom?: string;
  issueTo?: string;
  dueFrom?: string;
  dueTo?: string;
  outstandingOnly?: boolean;
  overdueOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OutstandingFilters {
  page?: number;
  limit?: number;
  clientId?: number;
  projectId?: number;
  overdue?: boolean;
  dueFrom?: string;
  dueTo?: string;
  groupBy?: 'invoice' | 'client' | 'due_date';
}

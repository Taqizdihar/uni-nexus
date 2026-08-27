export type StudioQuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
export type StudioInvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'overdue' | 'void' | 'refunded';
export type StudioScheduleStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface StudioBillingClientReference { id: number; code: string; display_name: string; legal_name: string | null; email: string | null; phone: string | null; city: string | null; }
export interface StudioBillingProjectReference { id: number; project_code: string; project_name: string; status_code: string; client_party_id: number; client_code: string; client_name: string; contract_value: number; currency_code: string; service_count: number; }
export interface StudioBillingServiceReference { id: number; code: string; name: string; description: string | null; pricing_model: string; base_price: number; unit_label: string | null; }
export interface StudioBillingServicePackageReference { id: number; code: string; name: string; description: string | null; package_price: number; item_count: number; }

export interface StudioQuotationItem { id?: number; quotation_id?: number; service_id: number | null; service_code?: string | null; service_name?: string | null; description: string; quantity: number; unit_price: number; discount_amount: number; line_total: number; sort_order?: number; }
export interface StudioQuotationSummary { id: number; quotation_number: string; party_id: number; project_id: number | null; issue_date: string; valid_until: string | null; status_code: StudioQuotationStatus; effective_status: StudioQuotationStatus; currency_code: string; total_amount: number; client_code: string; client_name: string; project_code: string | null; project_name: string | null; created_by_name: string | null; created_at: string; }
export interface StudioQuotation extends StudioQuotationSummary { order_id: number | null; subtotal: number; discount_amount: number; tax_amount: number; terms: string | null; notes: string | null; accepted_at: string | null; client_email: string | null; client_phone: string | null; updated_at: string; }
export interface StudioQuotationDetail { quotation: StudioQuotation; items: StudioQuotationItem[]; activity: StudioBillingActivity[]; document: StudioBillingDocument | null; }

export interface StudioQuotationTemplateItem { id?: number; service_id: number | null; service_code?: string | null; service_name?: string | null; description: string; default_quantity: number; default_unit_price: number | null; sort_order?: number; }
export interface StudioQuotationTemplate { id: number; template_code: string; name: string; title_template: string | null; intro_text: string | null; terms_text: string | null; footer_text: string | null; default_valid_days: number; config_json: Record<string, unknown> | null; is_active: boolean; item_count?: number; created_at: string; updated_at: string; items: StudioQuotationTemplateItem[]; }
export interface StudioQuotationTemplateSummary extends Omit<StudioQuotationTemplate, 'items'> { item_count: number; created_by_name?: string | null; }

export interface StudioInvoiceItem { id?: number; invoice_id?: number; service_id: number | null; service_code?: string | null; service_name?: string | null; description: string; quantity: number; unit_price: number; discount_amount: number; tax_amount: number; line_total: number; sort_order?: number; }
export interface StudioInvoiceSummary { id: number; invoice_number: string; party_id: number; quotation_id: number | null; source_type: 'studio_project' | 'manual'; source_id: number | null; issue_date: string; due_date: string | null; status_code: StudioInvoiceStatus; effective_status: StudioInvoiceStatus; currency_code: string; total_amount: number; paid_amount: number; balance_due: number; client_code: string; client_name: string; project_code: string | null; project_name: string | null; quotation_number: string | null; created_at: string; }
export interface StudioInvoice extends StudioInvoiceSummary { subtotal: number; discount_amount: number; tax_amount: number; payment_terms: string | null; notes: string | null; pdf_path?: never; issued_at: string | null; paid_at: string | null; client_email: string | null; client_phone: string | null; updated_at: string; }
export interface StudioInvoiceDetail { invoice: StudioInvoice; items: StudioInvoiceItem[]; schedules: StudioPaymentSchedule[]; payments: StudioPaymentRecord[]; activity: StudioBillingActivity[]; document: StudioBillingDocument | null; }

export interface StudioPaymentSchedule { id: number; invoice_id: number; installment_no: number; label: string | null; due_date: string; amount: number; paid_amount: number; status_code: StudioScheduleStatus; effective_status: StudioScheduleStatus; paid_at: string | null; notes: string | null; }
export interface StudioPaymentRecord { id: number; payment_code: string; payment_date: string; amount: number; currency_code: string; reference_number: string | null; status_code: string; notes: string | null; payment_method_name: string | null; schedule_label: string | null; installment_no: number | null; }

export interface StudioOutstandingInvoice extends StudioInvoiceSummary { schedule_count: number; next_schedule_due_date: string | null; next_schedule_label: string | null; next_schedule_balance: number | null; days_overdue: number; }
export interface StudioOutstandingSummary { total_outstanding: number; overdue_amount: number; due_in_7_days: number; overdue_invoice_count: number; clients_with_outstanding: number; }
export interface StudioOutstandingResponse { items: StudioOutstandingInvoice[]; summary: StudioOutstandingSummary; meta: PaginationMeta; }

export interface StudioBillingOverview { quotations_draft: number; quotations_awaiting_decision: number; quotations_accepted_this_month: number; invoices_issued_this_month: number; total_outstanding: number; overdue_invoices: number; due_in_7_days: number; }
export interface StudioBillingActivity { id: number; action_code: string; description: string | null; created_at: string; user_name: string | null; }
export interface StudioBillingDocument { id: number; file_name: string; created_at: string; version_no: number; }
export interface PaginationMeta { page: number; limit: number; total: number; totalPages: number; }
export interface Paginated<T> { items: T[]; meta: PaginationMeta; }

export interface StudioBillingReferences { clients: StudioBillingClientReference[]; projects: StudioBillingProjectReference[]; services: StudioBillingServiceReference[]; service_packages: StudioBillingServicePackageReference[]; quotation_templates: StudioQuotationTemplateSummary[]; organization: { name?: string; legal_name?: string | null; currency_code: string; }; }
export interface StudioProjectScope { project: StudioBillingProjectReference; services: Array<{ id: number; service_id: number | null; package_id: number | null; description: string; quantity: number; unit_price: number; line_total: number; service_code: string | null; service_name: string | null; package_code: string | null; package_name: string | null; }>; }

export interface CommercialLinePayload { service_id?: number | null; description: string; quantity: number; unit_price: number; discount_amount?: number; tax_amount?: number; }
export interface PaymentSchedulePayload { label?: string | null; due_date: string; amount: number; notes?: string | null; }
export interface QuotationPayload { party_id: number; project_id?: number | null; issue_date: string; valid_until?: string | null; currency_code?: string; discount_amount?: number; tax_amount?: number; terms?: string | null; notes?: string | null; items: CommercialLinePayload[]; }
export interface InvoicePayload { party_id: number; quotation_id?: number | null; source_type?: 'studio_project' | 'manual'; source_id?: number | null; issue_date: string; due_date?: string | null; currency_code?: string; discount_amount?: number; payment_terms?: string | null; notes?: string | null; items: CommercialLinePayload[]; schedules?: PaymentSchedulePayload[]; }
export interface QuotationTemplatePayload { name: string; title_template?: string | null; intro_text?: string | null; terms_text?: string | null; footer_text?: string | null; default_valid_days?: number; is_active?: boolean; items: Array<{ service_id?: number | null; description: string; quantity: number; unit_price?: number | null }>; }

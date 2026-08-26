export type PurchaseRequestStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "ordered"
  | "closed";
export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "partial"
  | "received"
  | "cancelled"
  | "closed";

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}
export interface PartyContact {
  id: number;
  party_id: number;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}
export interface Supplier {
  id: number;
  code: string;
  party_kind: "individual" | "company" | "institution";
  display_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  website?: string | null;
  tax_id: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  notes?: string | null;
  status_code: string;
  role_id: number;
  is_active: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  total_pos?: number;
  open_pos?: number;
  total_purchase_value?: number;
  last_purchase_date?: string | null;
}
export type SupplierForm = Partial<
  Omit<
    Supplier,
    | "id"
    | "code"
    | "role_id"
    | "is_active"
    | "status_code"
    | "total_pos"
    | "open_pos"
    | "total_purchase_value"
    | "last_purchase_date"
  >
> & {
  existing_party_id?: number | null;
  party_kind?: Supplier["party_kind"];
  display_name?: string;
  confirm_duplicate?: boolean;
};
export interface MaterialReference {
  id: number;
  sku: string;
  name: string;
  base_unit_id: number;
  default_unit_cost: number;
  reorder_qty: number;
  preferred_supplier_id: number | null;
  category_type: string;
  unit_code: string;
  unit_symbol: string;
  available_qty: number;
}
export interface UnitReference {
  id: number;
  code: string;
  name: string;
  symbol: string;
  unit_group: string;
  decimal_places: number;
}
export interface ProcurementReferences {
  materials: MaterialReference[];
  units: UnitReference[];
  suppliers: Pick<Supplier, "id" | "code" | "display_name">[];
}
export interface PurchaseRequestItem {
  id: number;
  purchase_request_id: number;
  material_id: number | null;
  material_sku?: string | null;
  material_name?: string | null;
  description: string;
  quantity: number;
  unit_id: number | null;
  unit_symbol?: string | null;
  estimated_unit_cost: number | null;
  notes: string | null;
  ordered_qty?: number;
  remaining_qty?: number;
}
export interface PurchaseRequest {
  id: number;
  request_code: string;
  required_by: string | null;
  purpose: string | null;
  status_code: PurchaseRequestStatus;
  requested_by?: number | null;
  requested_at: string;
  requester_name?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
  approver_name?: string | null;
  total_items?: number;
  estimated_total?: number;
}
export interface PurchaseRequestDetail {
  request: PurchaseRequest;
  items: PurchaseRequestItem[];
  audit: ProcurementHistoryItem[];
}
export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  purchase_request_item_id: number | null;
  material_id: number | null;
  material_sku?: string | null;
  material_name?: string | null;
  description: string;
  quantity: number;
  unit_id: number | null;
  unit_symbol?: string | null;
  unit_price: number;
  line_total: number;
  received_qty: number;
  remaining_qty?: number;
}
export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_party_id: number;
  supplier_name?: string;
  supplier_code?: string;
  purchase_request_id: number | null;
  request_code?: string | null;
  order_date: string;
  expected_date: string | null;
  status_code: PurchaseOrderStatus;
  currency_code: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  notes: string | null;
  total_items?: number;
}
export interface GoodsReceiptItem {
  id: number;
  goods_receipt_id: number;
  purchase_order_item_id: number;
  material_batch_id: number | null;
  description?: string;
  material_sku?: string | null;
  ordered_qty?: number;
  unit_symbol?: string | null;
  quantity: number;
  accepted_qty: number;
  rejected_qty: number;
  rejection_reason: string | null;
  batch_code?: string | null;
  spool_code?: string | null;
}
export interface GoodsReceipt {
  id: number;
  receipt_number: string;
  purchase_order_id: number;
  po_number?: string;
  supplier_name?: string;
  received_at: string;
  status_code: string;
  notes: string | null;
  accepted_qty?: number;
  rejected_qty?: number;
}
export interface SupplierInvoice {
  id: number;
  supplier_party_id: number;
  supplier_name?: string;
  purchase_order_id: number | null;
  po_number?: string | null;
  supplier_invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status_code: "unpaid" | "partial" | "paid" | "overdue" | "void";
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  currency_code: string;
  document_path?: string | null;
  notes?: string | null;
  days_overdue?: number | null;
}
export interface ProcurementOverview {
  pending_requests: number;
  active_purchase_orders: number;
  overdue_purchase_orders: number;
  due_this_week: number;
  open_po_value: number;
  unpaid_supplier_invoices: number;
  low_stock_materials: number;
  attention: Record<string, Array<Record<string, unknown>>>;
}
export interface ProcurementHistoryItem {
  id: number;
  action_code: string;
  entity_type: string;
  entity_id: number;
  entity_code: string | null;
  description: string;
  created_at: string;
  user_id?: number | null;
}

export interface PurchaseRequestForm {
  required_by?: string | null;
  purpose?: string | null;
  items: Array<
    Omit<
      PurchaseRequestItem,
      | "id"
      | "purchase_request_id"
      | "material_sku"
      | "material_name"
      | "unit_symbol"
      | "ordered_qty"
      | "remaining_qty"
    >
  >;
}
export interface PurchaseOrderForm {
  supplier_party_id: number;
  purchase_request_id?: number | null;
  order_date: string;
  expected_date?: string | null;
  currency_code?: string;
  tax_amount?: number;
  shipping_amount?: number;
  notes?: string | null;
  items: Array<
    Omit<
      PurchaseOrderItem,
      | "id"
      | "purchase_order_id"
      | "line_total"
      | "received_qty"
      | "remaining_qty"
      | "material_sku"
      | "material_name"
      | "unit_symbol"
    >
  >;
}
export interface GoodsReceiptForm {
  purchase_order_id: number;
  received_at?: string | null;
  notes?: string | null;
  items: Array<{
    purchase_order_item_id: number;
    accepted_qty: number;
    rejected_qty?: number;
    rejection_reason?: string | null;
    batch_code?: string | null;
    expiry_date?: string | null;
    location_code?: string | null;
    create_spool?: boolean;
    spool_code?: string | null;
    diameter_mm?: number | null;
    tare_weight_g?: number | null;
    storage_location?: string | null;
    notes?: string | null;
  }>;
}

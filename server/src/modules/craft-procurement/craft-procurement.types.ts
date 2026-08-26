import type { BusinessUnitContext } from "../craft-orders/craft-orders.helpers";

export type ProcurementActor = BusinessUnitContext & { userId: number };
export type PartyKind = "individual" | "company" | "institution";
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

export interface SupplierInput {
  existing_party_id?: number | null;
  party_kind?: PartyKind;
  display_name?: string;
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
  country_code?: string | null;
  notes?: string | null;
  confirm_duplicate?: boolean;
}

export interface ContactInput {
  full_name: string;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  is_primary?: boolean;
  notes?: string | null;
}

export interface PurchaseRequestItemInput {
  material_id?: number | null;
  description: string;
  quantity: number;
  unit_id?: number | null;
  estimated_unit_cost?: number | null;
  notes?: string | null;
}

export interface PurchaseRequestInput {
  required_by?: string | null;
  purpose?: string | null;
  items: PurchaseRequestItemInput[];
}

export interface PurchaseOrderItemInput {
  purchase_request_item_id?: number | null;
  material_id?: number | null;
  description: string;
  quantity: number;
  unit_id?: number | null;
  unit_price: number;
}

export interface PurchaseOrderInput {
  supplier_party_id: number;
  purchase_request_id?: number | null;
  order_date: string;
  expected_date?: string | null;
  currency_code?: string;
  tax_amount?: number;
  shipping_amount?: number;
  notes?: string | null;
  items: PurchaseOrderItemInput[];
}

export interface ReceiptItemInput {
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
}

export interface GoodsReceiptInput {
  purchase_order_id: number;
  received_at?: string | null;
  notes?: string | null;
  items: ReceiptItemInput[];
}

export interface SupplierInvoiceInput {
  supplier_party_id: number;
  purchase_order_id?: number | null;
  supplier_invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  total_amount: number;
  currency_code?: string;
  document_path?: string | null;
  notes?: string | null;
}

export interface ProcurementListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplierId?: number;
}

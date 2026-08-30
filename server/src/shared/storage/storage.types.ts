import type { Readable } from 'node:stream';

export type StorageVisibility = 'public' | 'private';

export type StoragePolicyName =
  | 'avatar' | 'profile_banner' | 'product_image' | 'product_design' | 'order_attachment'
  | 'project_deliverable' | 'generic_document' | 'quotation_pdf' | 'invoice_pdf'
  | 'payment_proof' | 'expense_receipt' | 'purchase_order_document'
  | 'supplier_invoice_document' | 'equipment_image' | 'maintenance_attachment'
  | 'report_export' | 'marketplace_import';

export interface StorageScope {
  productId?: number;
  orderId?: number;
  projectId?: number;
  expenseId?: number;
  supplierInvoiceId?: number;
}

export interface StoragePolicy {
  name: StoragePolicyName;
  /** Directory below the canonical storage root. The domain controls every scope value. */
  destination: (scope: StorageScope) => string;
  visibility: StorageVisibility;
  maxBytes: number;
  extensions: readonly string[];
  mimeTypes: readonly string[];
  /** Formats whose contents are checked by their well-known signature. */
  signatureExtensions?: readonly string[];
  /** Existing schema has no original-name column, so keep a safe display suffix in the key. */
  preserveOriginalInKey?: boolean;
}

export interface StoredFile {
  key: string;
  file_name: string;
  original_name: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string;
  public_url?: string;
}

export interface StorageDriver {
  readonly root: string;
  bootstrap(): Promise<void>;
  safeResolve(key: string): string;
  finalize(tempPath: string, key: string): Promise<void>;
  writeBuffer(key: string, body: Buffer): Promise<void>;
  createReadStream(key: string): Promise<Readable>;
  exists(key: string): Promise<boolean>;
  stat(key: string): Promise<{ size: number; mtime: Date }>;
  delete(key: string): Promise<void>;
  move(fromKey: string, toKey: string): Promise<void>;
}

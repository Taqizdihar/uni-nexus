/** Canonical local storage categories. Every category maps 1:1 to a folder under the storage root. */
export const STORAGE_CATEGORIES = [
  'avatars',
  'products',
  'designs',
  'order-attachments',
  'project-deliverables',
  'documents',
  'quotations',
  'invoices',
  'payment-proofs',
  'expense-receipts',
  'purchase-orders',
  'supplier-invoices',
  'equipment',
  'maintenance',
  'reports',
  'temp',
] as const;

export type StorageCategory = typeof STORAGE_CATEGORIES[number];

export type StorageVisibility = 'public' | 'private';

/** Server-controlled upload policy. The client can never choose its own category or limits. */
export interface StoragePolicy {
  name: string;
  category: StorageCategory;
  allowedExtensions: readonly string[];
  allowedMimeTypes: readonly string[];
  maxSizeBytes: number;
  visibility: StorageVisibility;
  /** Which content-signature check (if any) to run beyond extension/MIME. */
  contentValidation: 'image' | 'pdf' | 'none';
  description: string;
}

/** Metadata returned to callers after a file is stored. Never includes an absolute filesystem path. */
export interface StoredFileResult {
  key: string;
  fileName: string;
  originalName: string;
  extension: string;
  mimeType: string | null;
  sizeBytes: number;
  checksumSha256?: string;
  publicUrl?: string;
}

export interface StorageStat {
  sizeBytes: number;
  modifiedAt: Date;
  isFile: boolean;
}

/**
 * Abstraction every storage backend (local disk today, R2/S3/MinIO tomorrow) must implement.
 * Domain modules depend on this interface and StorageService only — never on `fs` directly.
 */
export interface StorageDriver {
  /** Persist a temp-staged file at `key`. Source is an absolute path (e.g. a Multer temp file). */
  finalize(sourceAbsolutePath: string, key: string): Promise<void>;
  /** Write a buffer directly to `key` (e.g. a generated PDF or report). */
  writeBuffer(key: string, data: Buffer): Promise<void>;
  createReadStream(key: string): NodeJS.ReadableStream;
  exists(key: string): Promise<boolean>;
  stat(key: string): Promise<StorageStat>;
  delete(key: string): Promise<void>;
  move(fromKey: string, toKey: string): Promise<void>;
  /** Absolute path for APIs (res.sendFile/res.download) that need a real filesystem path. Local driver only. */
  absolutePath(key: string): string;
  /** Public URL for explicitly-public categories (e.g. avatars). Undefined for private categories. */
  publicUrl(key: string): string | undefined;
}

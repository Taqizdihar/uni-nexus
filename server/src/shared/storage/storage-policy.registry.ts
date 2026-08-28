import type { StoragePolicy } from './storage.types';

const MB = 1024 * 1024;

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const DESIGN_EXTENSIONS = ['.stl', '.3mf', '.step', '.stp', '.scad', '.obj', '.blend'] as const;
const DOCUMENT_IMAGE_EXTENSIONS = [...IMAGE_EXTENSIONS, '.pdf'] as const;
const DOCUMENT_IMAGE_MIME_TYPES = [...IMAGE_MIME_TYPES, 'application/pdf'] as const;

/**
 * Server-controlled registry of upload policies. A domain endpoint picks ONE policy by name —
 * the client never chooses its own category, extensions, or size limit.
 */
export const STORAGE_POLICIES = {
  avatar: {
    name: 'avatar', category: 'avatars', allowedExtensions: IMAGE_EXTENSIONS, allowedMimeTypes: IMAGE_MIME_TYPES,
    maxSizeBytes: 5 * MB, visibility: 'public', contentValidation: 'image', description: 'Foto profil pengguna.',
  },
  product_image: {
    name: 'product_image', category: 'products', allowedExtensions: IMAGE_EXTENSIONS, allowedMimeTypes: IMAGE_MIME_TYPES,
    maxSizeBytes: 10 * MB, visibility: 'private', contentValidation: 'image', description: 'Gambar utama produk Craft.',
  },
  product_design: {
    name: 'product_design', category: 'designs', allowedExtensions: DESIGN_EXTENSIONS, allowedMimeTypes: [],
    maxSizeBytes: 100 * MB, visibility: 'private', contentValidation: 'none', description: 'File desain/CAD produk Craft.',
  },
  order_attachment: {
    name: 'order_attachment', category: 'order-attachments', allowedExtensions: [...IMAGE_EXTENSIONS, ...DESIGN_EXTENSIONS, '.pdf'],
    allowedMimeTypes: [], maxSizeBytes: 10 * MB, visibility: 'private', contentValidation: 'none', description: 'Lampiran pesanan Craft.',
  },
  project_deliverable: {
    name: 'project_deliverable', category: 'project-deliverables',
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.zip', '.docx', '.xlsx', '.pptx'], allowedMimeTypes: [],
    maxSizeBytes: 25 * MB, visibility: 'private', contentValidation: 'none', description: 'Deliverable proyek Studio.',
  },
  generic_document: {
    name: 'generic_document', category: 'documents', allowedExtensions: DOCUMENT_IMAGE_EXTENSIONS, allowedMimeTypes: DOCUMENT_IMAGE_MIME_TYPES,
    maxSizeBytes: 15 * MB, visibility: 'private', contentValidation: 'none', description: 'Dokumen umum (readiness untuk Pusat Dokumen).',
  },
  quotation_pdf: {
    name: 'quotation_pdf', category: 'quotations', allowedExtensions: ['.pdf'], allowedMimeTypes: ['application/pdf'],
    maxSizeBytes: 20 * MB, visibility: 'private', contentValidation: 'pdf', description: 'PDF penawaran resmi Studio (dibuat server).',
  },
  invoice_pdf: {
    name: 'invoice_pdf', category: 'invoices', allowedExtensions: ['.pdf'], allowedMimeTypes: ['application/pdf'],
    maxSizeBytes: 20 * MB, visibility: 'private', contentValidation: 'pdf', description: 'PDF invoice resmi Studio (dibuat server).',
  },
  payment_proof: {
    name: 'payment_proof', category: 'payment-proofs', allowedExtensions: DOCUMENT_IMAGE_EXTENSIONS, allowedMimeTypes: DOCUMENT_IMAGE_MIME_TYPES,
    maxSizeBytes: 10 * MB, visibility: 'private', contentValidation: 'none',
    description: 'Bukti pembayaran (belum ada kolom kanonis di skema saat ini — policy disiapkan, belum dipasang ke domain manapun).',
  },
  expense_receipt: {
    name: 'expense_receipt', category: 'expense-receipts', allowedExtensions: DOCUMENT_IMAGE_EXTENSIONS, allowedMimeTypes: DOCUMENT_IMAGE_MIME_TYPES,
    maxSizeBytes: 10 * MB, visibility: 'private', contentValidation: 'none', description: 'Bukti kwitansi pengeluaran Studio Finance.',
  },
  purchase_order_document: {
    name: 'purchase_order_document', category: 'purchase-orders', allowedExtensions: ['.pdf'], allowedMimeTypes: ['application/pdf'],
    maxSizeBytes: 20 * MB, visibility: 'private', contentValidation: 'pdf', description: 'Dokumen Purchase Order Craft Procurement (dibuat server).',
  },
  supplier_invoice_document: {
    name: 'supplier_invoice_document', category: 'supplier-invoices', allowedExtensions: DOCUMENT_IMAGE_EXTENSIONS, allowedMimeTypes: DOCUMENT_IMAGE_MIME_TYPES,
    maxSizeBytes: 10 * MB, visibility: 'private', contentValidation: 'none', description: 'Dokumen invoice pemasok Craft Procurement.',
  },
  equipment_image: {
    name: 'equipment_image', category: 'equipment', allowedExtensions: IMAGE_EXTENSIONS, allowedMimeTypes: IMAGE_MIME_TYPES,
    maxSizeBytes: 10 * MB, visibility: 'private', contentValidation: 'image',
    description: 'Foto aset Studio Equipment (belum ada kolom skema — policy disiapkan untuk masa depan).',
  },
  maintenance_attachment: {
    name: 'maintenance_attachment', category: 'maintenance', allowedExtensions: DOCUMENT_IMAGE_EXTENSIONS, allowedMimeTypes: DOCUMENT_IMAGE_MIME_TYPES,
    maxSizeBytes: 10 * MB, visibility: 'private', contentValidation: 'none',
    description: 'Lampiran perawatan aset Studio (belum ada kolom skema — policy disiapkan untuk masa depan).',
  },
  report_export: {
    name: 'report_export', category: 'reports', allowedExtensions: ['.csv', '.xlsx', '.pdf'], allowedMimeTypes: [],
    maxSizeBytes: 50 * MB, visibility: 'private', contentValidation: 'none', description: 'Ekspor laporan yang benar-benar dipersist ke disk.',
  },
} as const satisfies Record<string, StoragePolicy>;

export type StoragePolicyName = keyof typeof STORAGE_POLICIES;

export function getStoragePolicy(name: StoragePolicyName): StoragePolicy {
  return STORAGE_POLICIES[name];
}

import type { StoragePolicy, StoragePolicyName } from './storage.types';
import { numericScope } from './storage-path';

const images = ['image/jpeg', 'image/png', 'image/webp'];
const documents = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const designs = ['application/octet-stream', 'model/stl', 'model/step', 'application/sla', 'application/vnd.ms-pki.stl'];
const office = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const policy = (entry: StoragePolicy) => entry;

export const storagePolicies: Record<StoragePolicyName, StoragePolicy> = {
  avatar: policy({ name: 'avatar', destination: () => 'avatars', visibility: 'public', maxBytes: 5 * 1024 * 1024, extensions: ['.jpg', '.jpeg', '.png', '.webp'], mimeTypes: images, signatureExtensions: ['.jpg', '.jpeg', '.png', '.webp'] }),
  product_image: policy({ name: 'product_image', destination: scope => `products/${numericScope(scope.productId, 'ID produk')}`, visibility: 'private', maxBytes: 10 * 1024 * 1024, extensions: ['.jpg', '.jpeg', '.png', '.webp'], mimeTypes: images, signatureExtensions: ['.jpg', '.jpeg', '.png', '.webp'] }),
  product_design: policy({ name: 'product_design', destination: scope => `designs/${scope.productId ? numericScope(scope.productId, 'ID produk') : 'library'}`, visibility: 'private', maxBytes: 100 * 1024 * 1024, extensions: ['.stl', '.3mf', '.step', '.stp', '.scad', '.obj', '.blend'], mimeTypes: designs, signatureExtensions: ['.3mf'] }),
  order_attachment: policy({ name: 'order_attachment', destination: scope => `order-attachments/${numericScope(scope.orderId, 'ID pesanan')}`, visibility: 'private', maxBytes: 25 * 1024 * 1024, extensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.stl', '.3mf', '.step', '.stp', '.scad'], mimeTypes: [...documents, ...designs], signatureExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.3mf'], preserveOriginalInKey: true }),
  project_deliverable: policy({ name: 'project_deliverable', destination: scope => `project-deliverables/${numericScope(scope.projectId, 'ID proyek')}`, visibility: 'private', maxBytes: 25 * 1024 * 1024, extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.zip', '.docx', '.xlsx', '.pptx'], mimeTypes: office, signatureExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.zip', '.docx', '.xlsx', '.pptx'], preserveOriginalInKey: true }),
  generic_document: policy({ name: 'generic_document', destination: () => 'documents', visibility: 'private', maxBytes: 25 * 1024 * 1024, extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.zip', '.docx', '.xlsx', '.pptx'], mimeTypes: office, signatureExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.zip', '.docx', '.xlsx', '.pptx'], preserveOriginalInKey: true }),
  quotation_pdf: policy({ name: 'quotation_pdf', destination: () => 'quotations', visibility: 'private', maxBytes: 25 * 1024 * 1024, extensions: ['.pdf'], mimeTypes: ['application/pdf'], signatureExtensions: ['.pdf'] }),
  invoice_pdf: policy({ name: 'invoice_pdf', destination: () => 'invoices', visibility: 'private', maxBytes: 25 * 1024 * 1024, extensions: ['.pdf'], mimeTypes: ['application/pdf'], signatureExtensions: ['.pdf'] }),
  payment_proof: policy({ name: 'payment_proof', destination: () => 'payment-proofs', visibility: 'private', maxBytes: 10 * 1024 * 1024, extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'], mimeTypes: documents, signatureExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'], preserveOriginalInKey: true }),
  expense_receipt: policy({ name: 'expense_receipt', destination: scope => `expense-receipts/${numericScope(scope.expenseId, 'ID pengeluaran')}`, visibility: 'private', maxBytes: 10 * 1024 * 1024, extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'], mimeTypes: documents, signatureExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'], preserveOriginalInKey: true }),
  purchase_order_document: policy({ name: 'purchase_order_document', destination: () => 'purchase-orders', visibility: 'private', maxBytes: 25 * 1024 * 1024, extensions: ['.pdf'], mimeTypes: ['application/pdf'], signatureExtensions: ['.pdf'] }),
  supplier_invoice_document: policy({ name: 'supplier_invoice_document', destination: scope => `supplier-invoices/${numericScope(scope.supplierInvoiceId, 'ID tagihan')}`, visibility: 'private', maxBytes: 10 * 1024 * 1024, extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'], mimeTypes: documents, signatureExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'], preserveOriginalInKey: true }),
  equipment_image: policy({ name: 'equipment_image', destination: () => 'equipment', visibility: 'private', maxBytes: 10 * 1024 * 1024, extensions: ['.jpg', '.jpeg', '.png', '.webp'], mimeTypes: images, signatureExtensions: ['.jpg', '.jpeg', '.png', '.webp'] }),
  maintenance_attachment: policy({ name: 'maintenance_attachment', destination: () => 'maintenance', visibility: 'private', maxBytes: 25 * 1024 * 1024, extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'], mimeTypes: documents, signatureExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'], preserveOriginalInKey: true }),
  report_export: policy({ name: 'report_export', destination: () => 'reports', visibility: 'private', maxBytes: 50 * 1024 * 1024, extensions: ['.csv', '.xlsx', '.pdf'], mimeTypes: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf'], signatureExtensions: ['.xlsx', '.pdf'] }),
  marketplace_import: policy({ name: 'marketplace_import', destination: () => 'temp', visibility: 'private', maxBytes: 10 * 1024 * 1024, extensions: ['.csv', '.xlsx'], mimeTypes: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], signatureExtensions: ['.xlsx'] }),
};

export const getStoragePolicy = (name: StoragePolicyName) => storagePolicies[name];

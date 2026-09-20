import type { FieldDefinition } from '@uni-nexus/shared';
import type { Row } from './api';

export const titleCase = (text: string) => text.toLocaleLowerCase('id-ID').replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  ACCEPTED: 'Diterima',
  APPROVED: 'Disetujui',
  AVAILABLE: 'Tersedia',
  CANCELLED: 'Dibatalkan',
  COMPLETED: 'Selesai',
  CONFIRMED: 'Dikonfirmasi',
  DECLINED: 'Ditolak',
  DRAFT: 'Draf',
  ACTUAL: 'Aktual',
  ERROR: 'Kesalahan',
  ESTIMATING: 'Estimasi',
  ESTIMATED: 'Perkiraan',
  EXPIRED: 'Kedaluwarsa',
  FAILED: 'Gagal',
  FEASIBLE: 'Layak',
  IDLE: 'Siap',
  IN_PRODUCTION: 'Dalam Produksi',
  IN_PROGRESS: 'Sedang Dikerjakan',
  IN_USE: 'Sedang Digunakan',
  HIGH: 'Tinggi',
  LOW: 'Rendah',
  MAINTENANCE: 'Perawatan',
  NEW: 'Baru',
  NORMAL: 'Normal',
  NOT_FEASIBLE: 'Tidak Layak',
  OFFLINE: 'Tidak Terhubung',
  ON_HOLD: 'Ditunda',
  PACKAGING: 'Pengemasan',
  PACKED: 'Sudah Dikemas',
  PACKING: 'Sedang Dikemas',
  PARTIAL: 'Sebagian',
  PASS: 'Lulus',
  PAUSED: 'Dijeda',
  PENDING: 'Menunggu',
  PRINTING: 'Sedang Dicetak',
  QC: 'QC',
  QUEUED: 'Dalam Antrean',
  READY: 'Siap',
  READY_FOR_PRODUCTION: 'Siap Produksi',
  REJECTED: 'Ditolak',
  REPRINT: 'Cetak Ulang',
  REFUNDED: 'Dikembalikan',
  REWORK: 'Pengerjaan Ulang',
  REVIEW: 'Ditinjau',
  SENT: 'Dikirim',
  SUCCESS: 'Berhasil',
  WAITING: 'Menunggu',
  URGENT: 'Mendesak',
  DESIGN: 'Desain',
  QUOTATION: 'Penawaran',
  PRODUCTION: 'Produksi',
  COMPLETION: 'Penyelesaian',
  MODEL: 'Model',
  SUPPORT: 'Support',
  WASTE: 'Waste',
  PURGE: 'Purge',
  OTHER: 'Lainnya',
  PER_GRAM: 'Per Gram',
  PER_HOUR: 'Per Jam',
  PER_UNIT: 'Per Unit',
  FIXED: 'Tetap',
  CUSTOM: 'Kustom',
};
const SOURCE_LABELS: Record<string, string> = {
  CUSTOMER_APP: 'Aplikasi Pelanggan',
  OFFLINE: 'Offline',
  OTHER: 'Lainnya',
  SHOPIFY: 'Shopify',
  SHOPEE: 'Shopee',
  TIKTOK_SHOP: 'TikTok Shop',
  TOKOPEDIA: 'Tokopedia',
  WHATSAPP: 'WhatsApp',
};
const FIELD_LABELS: Record<string, string> = {
  'Actual Cost': 'Biaya Aktual',
  'Actual End': 'Selesai Aktual',
  'Actual Start': 'Mulai Aktual',
  'Assigned Operator': 'Operator Penanggung Jawab',
  Brand: 'Merek',
  'Calculation Type': 'Jenis Perhitungan',
  Category: 'Kategori',
  Code: 'Kode',
  'Color Hex': 'HEX Warna',
  'Color Name': 'Nama Warna',
  Description: 'Deskripsi',
  'Default Cost': 'Biaya Default',
  'Default Unit': 'Satuan Default',
  'Default Unit Cost': 'Biaya Satuan Default',
  'Created At': 'Dibuat Pada',
  'Inspected At': 'Diperiksa Pada',
  'Inspected By User': 'Diperiksa Oleh',
  Name: 'Nama',
  Notes: 'Catatan',
  'Order Item': 'Item Pesanan',
  Order: 'Pesanan',
  Priority: 'Prioritas',
  Quantity: 'Jumlah',
  Result: 'Hasil',
  'Spool Code': 'Kode Roll',
  Status: 'Status',
  'Total Cost': 'Total Biaya',
  Unit: 'Satuan',
  'Unit Cost': 'Biaya Satuan',
  'Updated At': 'Diperbarui Pada',
  'Weight (g)': 'Berat (g)',
};
export const statusLabel = (value: string | null | undefined) => {
  if (!value) return 'Belum ada status';
  const normalized = value.toUpperCase();
  return STATUS_LABELS[normalized] || titleCase(value);
};
export const priorityLabel = (value: string | null | undefined) => {
  if (!value) return 'Normal';
  return STATUS_LABELS[value.toUpperCase()] || titleCase(value);
};
export const sourceLabel = (value: string | null | undefined) => {
  if (!value) return '—';
  return SOURCE_LABELS[value.toUpperCase()] || titleCase(value);
};
export const paymentStatusLabel = (value: string | null | undefined) => statusLabel(value);
export const workflowStageLabel = (value: string | null | undefined) => statusLabel(value);
export const metadataLabel = (label: string) => FIELD_LABELS[label] || label;
export const fieldValueLabel = (fieldName: string, value: string) => {
  if (fieldName === 'priority') return priorityLabel(value);
  if (fieldName === 'source' || fieldName === 'order_source') return sourceLabel(value);
  if (fieldName === 'payment_status') return paymentStatusLabel(value);
  if (fieldName === 'status' || fieldName === 'result' || fieldName.endsWith('_status'))
    return statusLabel(value);
  return titleCase(value);
};
export const routeAliases: Record<string, string> = { 'custom-requests': 'requests', 'production-jobs': 'production', 'print-jobs': 'print-queue', 'filament-spools': 'filament', 'print-failures': 'failures', 'production-costs': 'costing', 'qc-inspections': 'qc', 'order-packaging': 'packaging', 'audit-logs': 'audit' };
export const resourcePath = (key: string) => `/app/${routeAliases[key] || key}`;
export const resourceKey = (segment: string) => Object.entries(routeAliases).find(([, route]) => route === segment)?.[0] || segment;
export function recordName(row: Row): string {
  for (const key of ['name', 'title', 'full_name', 'order_number', 'quotation_number', 'request_number', 'job_number', 'spool_code', 'file_name', 'original_filename', 'code', 'label', 'email']) {
    if (row[key]) return String(row[key]);
  }
  return `Record #${row.id}`;
}

/** Format database decimal strings without converting money to binary floats. */
export function money(value: unknown): string {
  const raw = String(value ?? '0');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return '—';
  const [integer = '0', fraction = ''] = raw.split('.');
  const grouped = BigInt(integer).toLocaleString('id-ID');
  const cents = fraction.replace(/0+$/, '');
  return `Rp${grouped}${cents ? `,${cents}` : ''}`;
}
export const isMoney = (name: string) => /price|cost|fee|amount|subtotal|discount|total_hpp/.test(name) && !/percent|method|type|component_id|costing/.test(name);
export function display(value: unknown, field?: FieldDefinition): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (field && isMoney(field.name) && /^-?\d+(\.\d+)?$/.test(String(value))) return money(value);
  if (field?.type === 'date' || field?.type === 'datetime' || (field && /_at$|_date$/.test(field.name))) {
    const date = new Date(String(value));
    if (!Number.isNaN(date.valueOf())) return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...(field?.type === 'datetime' ? { hour: '2-digit', minute: '2-digit' } as const : {}) }).format(date);
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (field?.type === 'select') return fieldValueLabel(field.name, String(value));
  return String(value);
}

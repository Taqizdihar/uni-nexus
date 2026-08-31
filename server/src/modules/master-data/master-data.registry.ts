import { AppError } from '../../shared/errors/AppError';
import type { MasterDataDatasetKey, MasterDataGroup, MasterDataScope } from './master-data.types';
import { masterDataDatasetKeys } from './master-data.types';

export type MasterDataDatasetDefinition = {
  key: MasterDataDatasetKey;
  name: string;
  description: string;
  group: MasterDataGroup;
  scope: MasterDataScope;
  table: 'units_of_measure' | 'payment_methods' | 'product_categories' | 'material_categories' | 'sales_channels' | 'studio_service_categories' | 'transaction_categories';
  readPermission?: string;
  writePermission?: string;
};

/**
 * Closed, compile-time registry. Route input is accepted only as one of these
 * keys; neither table names nor SQL identifiers ever come from a request.
 */
export const masterDataRegistry: Record<MasterDataDatasetKey, MasterDataDatasetDefinition> = {
  units: { key: 'units', name: 'Satuan', description: 'Satuan ukur reusable untuk material, BOM, stok, dan pengadaan.', group: 'general', scope: 'system', table: 'units_of_measure' },
  'payment-methods': { key: 'payment-methods', name: 'Metode Pembayaran', description: 'Pilihan metode pembayaran global untuk transaksi dan tagihan.', group: 'general', scope: 'system', table: 'payment_methods' },
  'craft-product-categories': { key: 'craft-product-categories', name: 'Kategori Produk', description: 'Struktur kategori produk Uni-Inside Craft.', group: 'craft', scope: 'craft', table: 'product_categories', readPermission: 'craft.products.read', writePermission: 'craft.products.write' },
  'craft-material-categories': { key: 'craft-material-categories', name: 'Kategori Material', description: 'Jenis material dan perlengkapan produksi Craft.', group: 'craft', scope: 'craft', table: 'material_categories', readPermission: 'craft.materials.read', writePermission: 'craft.materials.write' },
  'craft-sales-channels': { key: 'craft-sales-channels', name: 'Sales Channel', description: 'Kanal asal pesanan dan integrasi marketplace Craft.', group: 'craft', scope: 'craft', table: 'sales_channels', readPermission: 'craft.marketplace.read', writePermission: 'craft.marketplace.write' },
  'studio-service-categories': { key: 'studio-service-categories', name: 'Kategori Layanan', description: 'Kategori referensi untuk katalog layanan Studio.', group: 'studio', scope: 'studio', table: 'studio_service_categories', readPermission: 'studio.services.read', writePermission: 'studio.services.write' },
  'finance-transaction-categories': { key: 'finance-transaction-categories', name: 'Kategori Transaksi', description: 'Kategori pendapatan dan pengeluaran sesuai scope keuangan.', group: 'finance', scope: 'finance', table: 'transaction_categories' },
};

export const masterDataGroups: Record<MasterDataGroup, string> = {
  general: 'Umum', craft: 'Craft', studio: 'Studio', finance: 'Keuangan',
};

export const masterDataScopes: Record<MasterDataScope, string> = {
  system: 'Sistem', craft: 'Craft', studio: 'Studio', finance: 'Keuangan',
};

export function isMasterDataDatasetKey(value: string): value is MasterDataDatasetKey {
  return (masterDataDatasetKeys as readonly string[]).includes(value);
}

export function requireMasterDataDataset(value: string): MasterDataDatasetDefinition {
  if (!isMasterDataDatasetKey(value)) throw new AppError(404, 'MASTER_DATASET_NOT_FOUND', 'Dataset Data Master tidak ditemukan.');
  return masterDataRegistry[value];
}

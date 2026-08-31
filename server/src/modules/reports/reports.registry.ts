import type { ReportCode, ReportRegistryEntry } from './reports.types';

const formats = ['csv', 'xlsx', 'pdf'] as const;
const craft = (reportCode: ReportCode, displayName: string, description: string, reportKey: string): ReportRegistryEntry => ({ reportCode, displayName, description, reportKey, group: 'craft', sourceModule: 'craft_analytics', businessUnitCode: 'CRAFT', requiredReadPermissions: ['reports.read', 'craft.analytics.read'], requiredExportPermissions: ['reports.export', 'craft.analytics.export'], supportedFormats: formats, sourcePath: `/app/craft/analytics/${reportKey === 'overview' ? '' : reportKey}`.replace(/\/$/, ''), defaultPeriod: 'last_30_days', maxRangeDays: 3660 });
const studio = (reportCode: ReportCode, displayName: string, description: string, reportKey: string): ReportRegistryEntry => ({ reportCode, displayName, description, reportKey, group: 'studio', sourceModule: 'studio_analytics', businessUnitCode: 'STUDIO', requiredReadPermissions: ['reports.read', 'studio.analytics.read'], requiredExportPermissions: ['reports.export', 'studio.analytics.export'], supportedFormats: formats, sourcePath: `/app/studio/analytics/${reportKey === 'overview' ? '' : reportKey}`.replace(/\/$/, ''), defaultPeriod: 'last_30_days', maxRangeDays: 3660 });
const finance = (reportCode: ReportCode, displayName: string, description: string, reportKey: string): ReportRegistryEntry => ({ reportCode, displayName, description, reportKey, group: 'unified_finance', sourceModule: 'finance', requiredReadPermissions: ['reports.read', 'finance.read'], requiredExportPermissions: ['reports.export'], supportedFormats: formats, sourcePath: '/app/finance', defaultPeriod: 'month', maxRangeDays: 3660 });

export const reportRegistry: Record<ReportCode, ReportRegistryEntry> = {
  GLOBAL_EXECUTIVE_SUMMARY: { reportCode: 'GLOBAL_EXECUTIVE_SUMMARY', displayName: 'Ringkasan Eksekutif UNI-NEXUS', description: 'Ringkasan keuangan dan operasional lintas Craft serta Studio.', reportKey: 'overview', group: 'global', sourceModule: 'dashboard', requiredReadPermissions: ['reports.read', 'dashboard.read', 'finance.read', 'craft.analytics.read', 'studio.analytics.read'], requiredExportPermissions: ['reports.export', 'craft.analytics.export', 'studio.analytics.export'], supportedFormats: formats, sourcePath: '/app/dashboard', defaultPeriod: 'month', maxRangeDays: 3660 },
  UNIFIED_FINANCE_OVERVIEW: finance('UNIFIED_FINANCE_OVERVIEW', 'Ringkasan Keuangan Terpadu', 'Posisi kas dan ringkasan keuangan seluruh workspace yang dapat diakses.', 'overview'),
  UNIFIED_FINANCE_TRANSACTIONS: finance('UNIFIED_FINANCE_TRANSACTIONS', 'Transaksi Keuangan Terpadu', 'Daftar transaksi keuangan terkonsolidasi.', 'transactions'),
  UNIFIED_FINANCE_TREASURY: finance('UNIFIED_FINANCE_TREASURY', 'Kas & Bank Terpadu', 'Saldo akun kas dan bank yang dapat diakses.', 'treasury'),
  UNIFIED_FINANCE_TRANSFERS: finance('UNIFIED_FINANCE_TRANSFERS', 'Transfer Internal', 'Riwayat transfer internal antar workspace.', 'transfers'),
  UNIFIED_FINANCE_CASH_FLOW: finance('UNIFIED_FINANCE_CASH_FLOW', 'Arus Kas Terpadu', 'Arus kas masuk, keluar, dan bersih.', 'cashFlow'),
  UNIFIED_FINANCE_PROFIT_LOSS: finance('UNIFIED_FINANCE_PROFIT_LOSS', 'Laba Rugi Terpadu', 'Pendapatan dan pengeluaran tercatat pada periode.', 'profitLoss'),
  UNIFIED_FINANCE_RECEIVABLES: finance('UNIFIED_FINANCE_RECEIVABLES', 'Piutang Terpadu', 'Piutang dari workspace yang dapat diakses.', 'receivables'),
  UNIFIED_FINANCE_PAYABLES: finance('UNIFIED_FINANCE_PAYABLES', 'Hutang Terpadu', 'Kewajiban yang jatuh tempo.', 'payables'),
  UNIFIED_FINANCE_BUDGETS: finance('UNIFIED_FINANCE_BUDGETS', 'Anggaran Terpadu', 'Daftar anggaran lintas workspace.', 'budgets'),
  UNIFIED_FINANCE_JOURNALS: finance('UNIFIED_FINANCE_JOURNALS', 'Jurnal Akuntansi Terpadu', 'Jurnal akuntansi dari workspace yang dapat diakses.', 'journals'),
  CRAFT_ANALYTICS_OVERVIEW: craft('CRAFT_ANALYTICS_OVERVIEW', 'Ringkasan Analitik Craft', 'Pesanan, penjualan, produksi, dan material Craft.', 'overview'),
  CRAFT_SALES_ANALYTICS: craft('CRAFT_SALES_ANALYTICS', 'Analitik Penjualan', 'Nilai pesanan dan kanal penjualan Craft.', 'sales'),
  CRAFT_ORDER_ANALYTICS: craft('CRAFT_ORDER_ANALYTICS', 'Analitik Pesanan', 'Status dan volume pesanan Craft.', 'orders'),
  CRAFT_PRODUCT_ANALYTICS: craft('CRAFT_PRODUCT_ANALYTICS', 'Analitik Produk', 'Produk dan nilai penjualan Craft.', 'products'),
  CRAFT_CHANNEL_ANALYTICS: craft('CRAFT_CHANNEL_ANALYTICS', 'Analitik Kanal Penjualan', 'Kinerja kanal penjualan Craft.', 'channels'),
  CRAFT_CUSTOMER_ANALYTICS: craft('CRAFT_CUSTOMER_ANALYTICS', 'Analitik Pelanggan & Mitra', 'Nilai pesanan menurut pelanggan dan mitra.', 'customers'),
  CRAFT_PRODUCTION_ANALYTICS: craft('CRAFT_PRODUCTION_ANALYTICS', 'Analitik Produksi', 'Kinerja pekerjaan cetak, material, dan printer.', 'production'),
  CRAFT_PRINTER_ANALYTICS: craft('CRAFT_PRINTER_ANALYTICS', 'Analitik Printer', 'Pemakaian dan jam cetak per printer.', 'printers'),
  CRAFT_MATERIAL_ANALYTICS: craft('CRAFT_MATERIAL_ANALYTICS', 'Analitik Material', 'Pemakaian dan limbah material produksi.', 'materials'),
  CRAFT_PROCUREMENT_ANALYTICS: craft('CRAFT_PROCUREMENT_ANALYTICS', 'Analitik Pengadaan', 'Nilai pengadaan menurut pemasok.', 'procurement'),
  CRAFT_PROFITABILITY_ANALYTICS: craft('CRAFT_PROFITABILITY_ANALYTICS', 'Analitik Profitabilitas', 'Pendapatan dan biaya tercatat Craft.', 'profitability'),
  STUDIO_ANALYTICS_OVERVIEW: studio('STUDIO_ANALYTICS_OVERVIEW', 'Ringkasan Analitik Studio', 'Ringkasan proyek, komersial, dan keuangan Studio.', 'overview'),
  STUDIO_PROJECT_ANALYTICS: studio('STUDIO_PROJECT_ANALYTICS', 'Analitik Proyek Studio', 'Cohort, status, dan penyelesaian proyek.', 'projects'),
  STUDIO_CLIENT_ANALYTICS: studio('STUDIO_CLIENT_ANALYTICS', 'Analitik Klien Studio', 'Nilai dan retensi klien Studio.', 'clients'),
  STUDIO_SERVICE_ANALYTICS: studio('STUDIO_SERVICE_ANALYTICS', 'Analitik Layanan Studio', 'Penggunaan dan nilai layanan Studio.', 'services'),
  STUDIO_COMMERCIAL_ANALYTICS: studio('STUDIO_COMMERCIAL_ANALYTICS', 'Analitik Penawaran & Penagihan Studio', 'Penawaran, invoice, dan koleksi Studio.', 'commercial'),
  STUDIO_REVENUE_ANALYTICS: studio('STUDIO_REVENUE_ANALYTICS', 'Pendapatan & Arus Kas Studio', 'Pendapatan, koleksi, dan arus kas Studio.', 'revenue'),
  STUDIO_PROFITABILITY_ANALYTICS: studio('STUDIO_PROFITABILITY_ANALYTICS', 'Profitabilitas Studio', 'Profitabilitas proyek berdasarkan data kanonis.', 'profitability'),
  STUDIO_RECEIVABLE_ANALYTICS: studio('STUDIO_RECEIVABLE_ANALYTICS', 'Piutang Studio', 'Piutang klien Studio.', 'receivables'),
  STUDIO_VENDOR_ANALYTICS: studio('STUDIO_VENDOR_ANALYTICS', 'Vendor & Freelancer Studio', 'Kinerja dan kewajiban pihak eksternal.', 'vendors'),
  STUDIO_EQUIPMENT_ANALYTICS: studio('STUDIO_EQUIPMENT_ANALYTICS', 'Peralatan & Aset Studio', 'Pemakaian serta status peralatan Studio.', 'equipment'),
};

export const registeredReport = (code: string): ReportRegistryEntry | null => Object.prototype.hasOwnProperty.call(reportRegistry, code) ? reportRegistry[code as ReportCode] : null;

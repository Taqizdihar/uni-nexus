-- ============================================================================
-- UNI-NEXUS GLOBAL REPORT CENTER RECONCILIATION (SOURCE-CONTROL HISTORY ONLY)
-- CURRENT DEVELOPMENT DATABASE HAS ALREADY BEEN RECONCILED MANUALLY THROUGH
-- PHPMYADMIN. DO NOT EXECUTE THIS MIGRATION.
-- ============================================================================
-- This file intentionally does not recreate report_definitions or report_exports.
-- It records the manual reconciliation that introduced reports.read and the
-- built-in Studio, Unified Finance, and Global Executive report metadata.

INSERT IGNORE INTO permissions (code, module_code, name, description)
VALUES ('reports.read', 'reports', 'Lihat Pusat Laporan', 'Melihat katalog, preview, ringkasan, dan histori laporan yang dapat diakses melalui Pusat Laporan UNI-NEXUS.');

-- Match every existing reports.export grant with reports.read in the same role.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT export_grant.role_id, read_permission.id
FROM role_permissions export_grant
JOIN permissions export_permission ON export_permission.id = export_grant.permission_id AND export_permission.code = 'reports.export'
JOIN permissions read_permission ON read_permission.code = 'reports.read';

-- The following report definitions were reconciled manually per organization.
-- Config JSON is metadata only; report execution is controlled exclusively by
-- server/src/modules/reports/reports.registry.ts.
INSERT IGNORE INTO report_definitions (organization_id, business_unit_id, report_code, name, report_type, config_json, is_custom, is_active)
SELECT organization_id, NULL, 'GLOBAL_EXECUTIVE_SUMMARY', 'Ringkasan Eksekutif UNI-NEXUS', 'executive-summary', JSON_OBJECT('scope','global','version',1,'report_key','executive-summary'), 0, 1 FROM organizations WHERE is_active=1;

INSERT IGNORE INTO report_definitions (organization_id, business_unit_id, report_code, name, report_type, config_json, is_custom, is_active)
SELECT organization_id, NULL, report_code, report_name, report_type, JSON_OBJECT('scope','unified_finance','version',1,'report_key',report_type), 0, 1
FROM organizations CROSS JOIN (
  SELECT 'UNIFIED_FINANCE_OVERVIEW' report_code, 'Ringkasan Keuangan Terpadu' report_name, 'overview' report_type UNION ALL
  SELECT 'UNIFIED_FINANCE_TRANSACTIONS', 'Transaksi Keuangan Terpadu', 'transactions' UNION ALL
  SELECT 'UNIFIED_FINANCE_TREASURY', 'Kas & Bank Terpadu', 'treasury' UNION ALL
  SELECT 'UNIFIED_FINANCE_TRANSFERS', 'Transfer Internal', 'transfers' UNION ALL
  SELECT 'UNIFIED_FINANCE_CASH_FLOW', 'Arus Kas Terpadu', 'cash-flow' UNION ALL
  SELECT 'UNIFIED_FINANCE_PROFIT_LOSS', 'Laba Rugi Terpadu', 'profit-loss' UNION ALL
  SELECT 'UNIFIED_FINANCE_RECEIVABLES', 'Piutang Terpadu', 'receivables' UNION ALL
  SELECT 'UNIFIED_FINANCE_PAYABLES', 'Hutang Terpadu', 'payables' UNION ALL
  SELECT 'UNIFIED_FINANCE_BUDGETS', 'Anggaran Terpadu', 'budgets' UNION ALL
  SELECT 'UNIFIED_FINANCE_JOURNALS', 'Jurnal Akuntansi Terpadu', 'journals'
) reports WHERE organizations.is_active=1;

INSERT IGNORE INTO report_definitions (organization_id, business_unit_id, report_code, name, report_type, config_json, is_custom, is_active)
SELECT bu.organization_id, bu.id, report_code, report_name, report_type, JSON_OBJECT('scope','studio','version',1,'report_key',report_type), 0, 1
FROM business_units bu CROSS JOIN (
  SELECT 'STUDIO_ANALYTICS_OVERVIEW' report_code, 'Ringkasan Analitik Studio' report_name, 'overview' report_type UNION ALL
  SELECT 'STUDIO_PROJECT_ANALYTICS', 'Analitik Proyek Studio', 'projects' UNION ALL
  SELECT 'STUDIO_CLIENT_ANALYTICS', 'Analitik Klien Studio', 'clients' UNION ALL
  SELECT 'STUDIO_SERVICE_ANALYTICS', 'Analitik Layanan Studio', 'services' UNION ALL
  SELECT 'STUDIO_COMMERCIAL_ANALYTICS', 'Analitik Penawaran & Penagihan Studio', 'commercial' UNION ALL
  SELECT 'STUDIO_REVENUE_ANALYTICS', 'Pendapatan & Arus Kas Studio', 'revenue' UNION ALL
  SELECT 'STUDIO_PROFITABILITY_ANALYTICS', 'Profitabilitas Studio', 'profitability' UNION ALL
  SELECT 'STUDIO_RECEIVABLE_ANALYTICS', 'Piutang Studio', 'receivables' UNION ALL
  SELECT 'STUDIO_VENDOR_ANALYTICS', 'Vendor & Freelancer Studio', 'vendors' UNION ALL
  SELECT 'STUDIO_EQUIPMENT_ANALYTICS', 'Peralatan & Aset Studio', 'equipment'
) reports WHERE bu.code='STUDIO' AND bu.is_active=1;

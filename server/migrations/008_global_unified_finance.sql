-- UNI-NEXUS migration 008: Global Unified Finance reconciliation history.
--
-- THE CURRENT DEVELOPMENT DATABASE HAS ALREADY BEEN MIGRATED MANUALLY THROUGH
-- PHPMYADMIN.
--
-- DO NOT EXECUTE migration 008.
-- This source-controlled history documents the manually-applied reconciliation
-- only. It is intentionally defensive and MySQL 8.0 compatible for a clean
-- environment, using INFORMATION_SCHEMA + PREPARE rather than unsupported
-- ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS syntax.

SET @schema_name := DATABASE();

-- Request idempotency keys on the two canonical money-movement tables.
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='financial_transactions' AND COLUMN_NAME='idempotency_key')=0,
  'ALTER TABLE financial_transactions ADD COLUMN idempotency_key varchar(190) NULL COMMENT ''Client/request idempotency key for retry-safe financial posting'' AFTER source_code',
  'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='internal_transfers' AND COLUMN_NAME='idempotency_key')=0,
  'ALTER TABLE internal_transfers ADD COLUMN idempotency_key varchar(190) NULL COMMENT ''Client/request idempotency key for retry-safe treasury transfer'' AFTER description',
  'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Uniqueness is organization-scoped so different organizations can reuse keys.
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='financial_transactions' AND INDEX_NAME='uq_fin_transactions_org_idempotency')=0,
  'ALTER TABLE financial_transactions ADD UNIQUE KEY uq_fin_transactions_org_idempotency (organization_id,idempotency_key)',
  'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='internal_transfers' AND INDEX_NAME='uq_internal_transfers_org_idempotency')=0,
  'ALTER TABLE internal_transfers ADD UNIQUE KEY uq_internal_transfers_org_idempotency (organization_id,idempotency_key)',
  'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Consolidated read/query access paths.
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='financial_transactions' AND INDEX_NAME='idx_fin_transactions_unified_read')=0,
  'CREATE INDEX idx_fin_transactions_unified_read ON financial_transactions (organization_id,business_unit_id,currency_code,status_code,transaction_date)',
  'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='internal_transfers' AND INDEX_NAME='idx_internal_transfers_unified_read')=0,
  'CREATE INDEX idx_internal_transfers_unified_read ON internal_transfers (organization_id,from_business_unit_id,to_business_unit_id,transfer_date)',
  'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- The finance.* permissions are data, not a hard-coded executive-role policy.
INSERT INTO permissions (code,module_code,name,description)
SELECT 'finance.read','finance','Lihat Keuangan Terpadu','Melihat kondisi keuangan gabungan Craft, Studio, dan Shared yang diizinkan.'
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.code='finance.read');
INSERT INTO permissions (code,module_code,name,description)
SELECT 'finance.write','finance','Kelola Keuangan Bersama','Mencatat transaksi keuangan organisasi pada unit Shared yang diizinkan.'
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.code='finance.write');
INSERT INTO permissions (code,module_code,name,description)
SELECT 'finance.transfer','finance','Transfer Dana Internal','Melakukan transfer kas internal antar unit bisnis UNI-NEXUS secara terkontrol.'
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.code='finance.transfer');
INSERT INTO permissions (code,module_code,name,description)
SELECT 'finance.manage','finance','Administrasi Keuangan Terpadu','Mengelola konfigurasi keuangan global, treasury Shared, dan periode keuangan.'
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.code='finance.manage');

-- Shared categories are created only after a real SHARED business unit exists.
INSERT INTO transaction_categories (organization_id,business_unit_id,code,name,transaction_type,default_coa_account_id,is_active)
SELECT bu.organization_id,bu.id,'SHARED_OPERATING','Biaya Operasional Umum','expense',coa.id,1
FROM business_units bu
LEFT JOIN chart_of_accounts coa ON coa.organization_id=bu.organization_id AND coa.account_code='5000' AND coa.is_active=1
WHERE bu.code='SHARED' AND NOT EXISTS (SELECT 1 FROM transaction_categories tc WHERE tc.organization_id=bu.organization_id AND tc.business_unit_id=bu.id AND tc.code='SHARED_OPERATING');
INSERT INTO transaction_categories (organization_id,business_unit_id,code,name,transaction_type,default_coa_account_id,is_active)
SELECT bu.organization_id,bu.id,'SHARED_OTHER_INCOME','Pendapatan Bersama / Lain-lain','income',coa.id,1
FROM business_units bu
LEFT JOIN chart_of_accounts coa ON coa.organization_id=bu.organization_id AND coa.account_code='4000' AND coa.is_active=1
WHERE bu.code='SHARED' AND NOT EXISTS (SELECT 1 FROM transaction_categories tc WHERE tc.organization_id=bu.organization_id AND tc.business_unit_id=bu.id AND tc.code='SHARED_OTHER_INCOME');

-- Permission grants are intentionally not repeated here: the phpMyAdmin
-- reconciliation assigned them to the organization-approved roles. Application
-- authorization always checks permission codes, never role names.

-- ============================================================================
-- UNI-NEXUS STRICT TESTING DATA RESET -- FIXED, FLAT, PHPMYADMIN-SAFE VERSION
-- ============================================================================
--
-- Regenerated 2026-09-01 directly against the LIVE schema of database
-- `uni-nexus` (verified via INFORMATION_SCHEMA over a direct connection):
--   115 BASE TABLEs + 5 VIEWs = 120 objects total.
--
-- WHY THE ORIGINAL SCRIPT FAILED IN PHPMYADMIN
-- ---------------------------------------------
-- 1. "33 errors ... Unrecognized statement type" (DECLARE/SIGNAL/LOOP/etc.)
--    phpMyAdmin's SQL linter ("static analysis") only recognises ordinary
--    top-level SQL. It does not understand stored-procedure/PSM grammar
--    (DECLARE, cursors, LOOP/LEAVE, SIGNAL/RESIGNAL, labels). This is a
--    known, purely cosmetic limitation of the linter -- it does not by
--    itself block execution.
-- 2. "#1044 Access denied for user 'root'@'localhost' to database
--    'information_schema'" -- this was the real blocker, thrown when the
--    procedure's cursor tried to read INFORMATION_SCHEMA.TABLES at CALL
--    time. Verified directly against this database: root@localhost has
--    full privileges (ALL PRIVILEGES ON *.* WITH GRANT OPTION) and CAN
--    read information_schema normally (a plain `SELECT ... FROM
--    information_schema.tables` succeeds, returning all 120 objects).
--    So this was not a real, general privilege gap on the account --
--    it was specific to running that query from inside a stored routine
--    in that phpMyAdmin session. Rather than chase that further, this
--    version simply removes the dependency: there is no stored procedure,
--    no cursor, and no runtime INFORMATION_SCHEMA query at all. The table
--    list below was computed ONCE, directly, and is embedded as plain SQL.
--
-- WHAT CHANGED STRUCTURALLY
-- --------------------------
-- - No DELIMITER, no CREATE PROCEDURE, no DECLARE, no cursor, and no runtime
--   INFORMATION_SCHEMA query. Ordinary flat SQL performs the reset; prepared
--   statements are used only to skip AUTO_INCREMENT changes without the token.
-- - The destructive section is fail-closed. It runs only when the explicit
--   RESET-UNI-NEXUS-TEST-DATA token is set in PART 1; its default is NO.
--   This gate applies to both DELETE statements and AUTO_INCREMENT resets.
--
-- PRESERVED (never touched by this script): organizations, business_units,
-- users, roles, permissions, role_permissions, user_roles,
-- user_business_units.
--
-- CLEARED: the other 107 BASE TABLEs (listed explicitly below).
--
-- NOT TOUCHED / NOT APPLICABLE: the 5 VIEWs (v_accounts_payable,
-- v_accounts_receivable, v_craft_order_priority, v_material_stock,
-- v_printer_current_activity) hold no data of their own -- they will
-- simply reflect the now-empty underlying tables once cleared.
--
-- Of the 107 cleared tables, 104 have an AUTO_INCREMENT `id` column and
-- are reset to 1 after deletion. Three are pure junction tables with
-- composite primary keys and have no AUTO_INCREMENT column at all:
-- calendar_event_attendees, studio_project_members, task_assignees.
-- ============================================================================


-- ============================================================================
-- PART 0 -- PREVIEW (READ-ONLY, SAFE TO RUN ANY TIME, NO CONFIRMATION NEEDED)
-- ============================================================================

USE `uni-nexus`;

SELECT DATABASE() AS current_database, VERSION() AS mysql_version, NOW(3) AS server_time;

-- Preserved-table row counts -- this is your "before" baseline.
SELECT 'organizations' AS tbl, COUNT(*) AS rows_ FROM `organizations`
UNION ALL SELECT 'business_units', COUNT(*) FROM `business_units`
UNION ALL SELECT 'users', COUNT(*) FROM `users`
UNION ALL SELECT 'roles', COUNT(*) FROM `roles`
UNION ALL SELECT 'permissions', COUNT(*) FROM `permissions`
UNION ALL SELECT 'role_permissions', COUNT(*) FROM `role_permissions`
UNION ALL SELECT 'user_roles', COUNT(*) FROM `user_roles`
UNION ALL SELECT 'user_business_units', COUNT(*) FROM `user_business_units`;

-- Preserved-table checksums -- save this output and compare byte-for-byte
-- against the same query re-run in PART 2. (CHECKSUM TABLE covers every
-- column, including password_hash, without ever displaying it.)
CHECKSUM TABLE `organizations`, `business_units`, `users`, `roles`,
  `permissions`, `role_permissions`, `user_roles`, `user_business_units`;


-- ============================================================================
-- PART 1 -- DESTRUCTIVE SECTION
-- ============================================================================
-- This file is SAFE TO RUN AS-SAVED: the default value below is NO and no rows
-- or AUTO_INCREMENT values will be changed. After reviewing PART 0 and the
-- backup, change ONLY the next assignment to the exact token, then run this
-- same script in one phpMyAdmin SQL session:
--
--   SET @CONFIRM_RESET := 'RESET-UNI-NEXUS-TEST-DATA';
--
SET @CONFIRM_RESET := 'NO';
SET @__reset_confirmed := IF(@CONFIRM_RESET = 'RESET-UNI-NEXUS-TEST-DATA', 1, 0);
SELECT IF(@__reset_confirmed = 1, 'CONFIRMED: destructive reset is enabled.', 'NOT CONFIRMED: DELETE and AUTO_INCREMENT reset statements are disabled.') AS reset_confirmation_status;-- ============================================================================
-- Only run this after:
--   [ ] you reviewed PART 0's output above and it looks right
--   [ ] a database backup exists (mysqldump or a current uni-nexus.sql)
--   [ ] the Express backend, AutomationWorker, and Vite dev server are
--       stopped (no writers running)
--   [ ] any authenticated UNI-NEXUS browser tabs are closed
-- ============================================================================

SET @OLD_FOREIGN_KEY_CHECKS = @@SESSION.FOREIGN_KEY_CHECKS;
SET @OLD_SQL_SAFE_UPDATES   = @@SESSION.SQL_SAFE_UPDATES;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

DELETE FROM `asset_maintenance_records` WHERE @__reset_confirmed = 1;
DELETE FROM `asset_project_assignments` WHERE @__reset_confirmed = 1;
DELETE FROM `assets` WHERE @__reset_confirmed = 1;
DELETE FROM `audit_logs` WHERE @__reset_confirmed = 1;
DELETE FROM `automation_rules` WHERE @__reset_confirmed = 1;
DELETE FROM `automation_runs` WHERE @__reset_confirmed = 1;
DELETE FROM `budget_items` WHERE @__reset_confirmed = 1;
DELETE FROM `budgets` WHERE @__reset_confirmed = 1;
DELETE FROM `calendar_event_attendees` WHERE @__reset_confirmed = 1;
DELETE FROM `calendar_events` WHERE @__reset_confirmed = 1;
DELETE FROM `channel_product_mappings` WHERE @__reset_confirmed = 1;
DELETE FROM `chart_of_accounts` WHERE @__reset_confirmed = 1;
DELETE FROM `craft_order_drafts` WHERE @__reset_confirmed = 1;
DELETE FROM `craft_order_items` WHERE @__reset_confirmed = 1;
DELETE FROM `craft_order_status_history` WHERE @__reset_confirmed = 1;
DELETE FROM `craft_orders` WHERE @__reset_confirmed = 1;
DELETE FROM `design_files` WHERE @__reset_confirmed = 1;
DELETE FROM `document_templates` WHERE @__reset_confirmed = 1;
DELETE FROM `documents` WHERE @__reset_confirmed = 1;
DELETE FROM `domain_events` WHERE @__reset_confirmed = 1;
DELETE FROM `expenses` WHERE @__reset_confirmed = 1;
DELETE FROM `filament_spools` WHERE @__reset_confirmed = 1;
DELETE FROM `financial_periods` WHERE @__reset_confirmed = 1;
DELETE FROM `financial_transactions` WHERE @__reset_confirmed = 1;
DELETE FROM `goods_receipt_items` WHERE @__reset_confirmed = 1;
DELETE FROM `goods_receipts` WHERE @__reset_confirmed = 1;
DELETE FROM `integration_secrets` WHERE @__reset_confirmed = 1;
DELETE FROM `integration_sync_logs` WHERE @__reset_confirmed = 1;
DELETE FROM `integrations` WHERE @__reset_confirmed = 1;
DELETE FROM `internal_transfers` WHERE @__reset_confirmed = 1;
DELETE FROM `inventory_movements` WHERE @__reset_confirmed = 1;
DELETE FROM `invoice_items` WHERE @__reset_confirmed = 1;
DELETE FROM `invoice_payment_schedules` WHERE @__reset_confirmed = 1;
DELETE FROM `invoices` WHERE @__reset_confirmed = 1;
DELETE FROM `journal_entries` WHERE @__reset_confirmed = 1;
DELETE FROM `journal_lines` WHERE @__reset_confirmed = 1;
DELETE FROM `login_history` WHERE @__reset_confirmed = 1;
DELETE FROM `marketplace_fee_rules` WHERE @__reset_confirmed = 1;
DELETE FROM `marketplace_settlement_items` WHERE @__reset_confirmed = 1;
DELETE FROM `marketplace_settlements` WHERE @__reset_confirmed = 1;
DELETE FROM `master_options` WHERE @__reset_confirmed = 1;
DELETE FROM `material_batches` WHERE @__reset_confirmed = 1;
DELETE FROM `material_categories` WHERE @__reset_confirmed = 1;
DELETE FROM `material_waste` WHERE @__reset_confirmed = 1;
DELETE FROM `materials` WHERE @__reset_confirmed = 1;
DELETE FROM `notifications` WHERE @__reset_confirmed = 1;
DELETE FROM `order_attachments` WHERE @__reset_confirmed = 1;
DELETE FROM `parties` WHERE @__reset_confirmed = 1;
DELETE FROM `partner_price_rules` WHERE @__reset_confirmed = 1;
DELETE FROM `party_contacts` WHERE @__reset_confirmed = 1;
DELETE FROM `party_roles` WHERE @__reset_confirmed = 1;
DELETE FROM `payment_methods` WHERE @__reset_confirmed = 1;
DELETE FROM `payments` WHERE @__reset_confirmed = 1;
DELETE FROM `print_failures` WHERE @__reset_confirmed = 1;
DELETE FROM `print_job_materials` WHERE @__reset_confirmed = 1;
DELETE FROM `print_job_status_history` WHERE @__reset_confirmed = 1;
DELETE FROM `print_jobs` WHERE @__reset_confirmed = 1;
DELETE FROM `print_profiles` WHERE @__reset_confirmed = 1;
DELETE FROM `printer_issues` WHERE @__reset_confirmed = 1;
DELETE FROM `printer_maintenance_records` WHERE @__reset_confirmed = 1;
DELETE FROM `printer_maintenance_schedules` WHERE @__reset_confirmed = 1;
DELETE FROM `printers` WHERE @__reset_confirmed = 1;
DELETE FROM `product_bom_items` WHERE @__reset_confirmed = 1;
DELETE FROM `product_boms` WHERE @__reset_confirmed = 1;
DELETE FROM `product_categories` WHERE @__reset_confirmed = 1;
DELETE FROM `product_variants` WHERE @__reset_confirmed = 1;
DELETE FROM `production_queue_items` WHERE @__reset_confirmed = 1;
DELETE FROM `products` WHERE @__reset_confirmed = 1;
DELETE FROM `project_deliverables` WHERE @__reset_confirmed = 1;
DELETE FROM `project_external_assignments` WHERE @__reset_confirmed = 1;
DELETE FROM `project_milestones` WHERE @__reset_confirmed = 1;
DELETE FROM `purchase_order_items` WHERE @__reset_confirmed = 1;
DELETE FROM `purchase_orders` WHERE @__reset_confirmed = 1;
DELETE FROM `purchase_request_items` WHERE @__reset_confirmed = 1;
DELETE FROM `purchase_requests` WHERE @__reset_confirmed = 1;
DELETE FROM `qc_inspection_items` WHERE @__reset_confirmed = 1;
DELETE FROM `qc_inspections` WHERE @__reset_confirmed = 1;
DELETE FROM `qc_template_items` WHERE @__reset_confirmed = 1;
DELETE FROM `qc_templates` WHERE @__reset_confirmed = 1;
DELETE FROM `quick_links` WHERE @__reset_confirmed = 1;
DELETE FROM `quotation_items` WHERE @__reset_confirmed = 1;
DELETE FROM `quotation_template_items` WHERE @__reset_confirmed = 1;
DELETE FROM `quotation_templates` WHERE @__reset_confirmed = 1;
DELETE FROM `quotations` WHERE @__reset_confirmed = 1;
DELETE FROM `report_definitions` WHERE @__reset_confirmed = 1;
DELETE FROM `report_exports` WHERE @__reset_confirmed = 1;
DELETE FROM `sales_channels` WHERE @__reset_confirmed = 1;
DELETE FROM `service_package_items` WHERE @__reset_confirmed = 1;
DELETE FROM `service_packages` WHERE @__reset_confirmed = 1;
DELETE FROM `stock_reservations` WHERE @__reset_confirmed = 1;
DELETE FROM `studio_project_members` WHERE @__reset_confirmed = 1;
DELETE FROM `studio_project_services` WHERE @__reset_confirmed = 1;
DELETE FROM `studio_project_status_history` WHERE @__reset_confirmed = 1;
DELETE FROM `studio_projects` WHERE @__reset_confirmed = 1;
DELETE FROM `studio_service_categories` WHERE @__reset_confirmed = 1;
DELETE FROM `studio_services` WHERE @__reset_confirmed = 1;
DELETE FROM `supplier_invoices` WHERE @__reset_confirmed = 1;
DELETE FROM `system_settings` WHERE @__reset_confirmed = 1;
DELETE FROM `task_assignees` WHERE @__reset_confirmed = 1;
DELETE FROM `tasks` WHERE @__reset_confirmed = 1;
DELETE FROM `transaction_categories` WHERE @__reset_confirmed = 1;
DELETE FROM `treasury_accounts` WHERE @__reset_confirmed = 1;
DELETE FROM `units_of_measure` WHERE @__reset_confirmed = 1;
DELETE FROM `user_deletion_requests` WHERE @__reset_confirmed = 1;
DELETE FROM `user_presence_sessions` WHERE @__reset_confirmed = 1;
DELETE FROM `user_reactivation_requests` WHERE @__reset_confirmed = 1;
DELETE FROM `user_sessions` WHERE @__reset_confirmed = 1;

-- AUTO_INCREMENT reset -- only the 104 tables that actually have one.
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `asset_maintenance_records` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `asset_project_assignments` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `assets` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `audit_logs` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `automation_rules` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `automation_runs` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `budget_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `budgets` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `calendar_events` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `channel_product_mappings` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `chart_of_accounts` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `craft_order_drafts` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `craft_order_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `craft_order_status_history` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `craft_orders` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `design_files` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `document_templates` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `documents` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `domain_events` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `expenses` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `filament_spools` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `financial_periods` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `financial_transactions` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `goods_receipt_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `goods_receipts` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `integration_secrets` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `integration_sync_logs` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `integrations` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `internal_transfers` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `inventory_movements` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `invoice_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `invoice_payment_schedules` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `invoices` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `journal_entries` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `journal_lines` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `login_history` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `marketplace_fee_rules` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `marketplace_settlement_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `marketplace_settlements` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `master_options` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `material_batches` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `material_categories` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `material_waste` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `materials` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `notifications` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `order_attachments` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `parties` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `partner_price_rules` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `party_contacts` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `party_roles` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `payment_methods` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `payments` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `print_failures` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `print_job_materials` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `print_job_status_history` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `print_jobs` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `print_profiles` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `printer_issues` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `printer_maintenance_records` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `printer_maintenance_schedules` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `printers` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `product_bom_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `product_boms` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `product_categories` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `product_variants` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `production_queue_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `products` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `project_deliverables` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `project_external_assignments` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `project_milestones` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `purchase_order_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `purchase_orders` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `purchase_request_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `purchase_requests` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `qc_inspection_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `qc_inspections` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `qc_template_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `qc_templates` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `quick_links` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `quotation_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `quotation_template_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `quotation_templates` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `quotations` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `report_definitions` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `report_exports` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `sales_channels` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `service_package_items` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `service_packages` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `stock_reservations` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `studio_project_services` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `studio_project_status_history` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `studio_projects` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `studio_service_categories` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `studio_services` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `supplier_invoices` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `system_settings` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `tasks` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `transaction_categories` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `treasury_accounts` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `units_of_measure` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `user_deletion_requests` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `user_presence_sessions` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `user_reactivation_requests` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
SET @__reset_sql = IF(
  @__reset_confirmed = 1,
  'ALTER TABLE `user_sessions` AUTO_INCREMENT = 1',
  'SELECT ''AUTO_INCREMENT reset skipped: confirmation token required'' AS reset_status'
);
PREPARE __reset_stmt FROM @__reset_sql;
EXECUTE __reset_stmt;
DEALLOCATE PREPARE __reset_stmt;
-- (calendar_event_attendees, studio_project_members, task_assignees have
--  composite primary keys -- no AUTO_INCREMENT column, nothing to reset.)

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
SET SQL_SAFE_UPDATES   = @OLD_SQL_SAFE_UPDATES;


-- ============================================================================
-- PART 2 -- POST-CLEANUP VERIFICATION
-- ============================================================================

-- 2a. Every cleared table must be exactly 0.
--     An EMPTY result set here = success. Any row returned = a table that
--     failed to reach zero (name + actual remaining count).
SELECT * FROM (
  SELECT 'asset_maintenance_records' AS tbl, COUNT(*) AS rows_ FROM `asset_maintenance_records`
  UNION ALL SELECT 'asset_project_assignments', COUNT(*) FROM `asset_project_assignments`
  UNION ALL SELECT 'assets', COUNT(*) FROM `assets`
  UNION ALL SELECT 'audit_logs', COUNT(*) FROM `audit_logs`
  UNION ALL SELECT 'automation_rules', COUNT(*) FROM `automation_rules`
  UNION ALL SELECT 'automation_runs', COUNT(*) FROM `automation_runs`
  UNION ALL SELECT 'budget_items', COUNT(*) FROM `budget_items`
  UNION ALL SELECT 'budgets', COUNT(*) FROM `budgets`
  UNION ALL SELECT 'calendar_event_attendees', COUNT(*) FROM `calendar_event_attendees`
  UNION ALL SELECT 'calendar_events', COUNT(*) FROM `calendar_events`
  UNION ALL SELECT 'channel_product_mappings', COUNT(*) FROM `channel_product_mappings`
  UNION ALL SELECT 'chart_of_accounts', COUNT(*) FROM `chart_of_accounts`
  UNION ALL SELECT 'craft_order_drafts', COUNT(*) FROM `craft_order_drafts`
  UNION ALL SELECT 'craft_order_items', COUNT(*) FROM `craft_order_items`
  UNION ALL SELECT 'craft_order_status_history', COUNT(*) FROM `craft_order_status_history`
  UNION ALL SELECT 'craft_orders', COUNT(*) FROM `craft_orders`
  UNION ALL SELECT 'design_files', COUNT(*) FROM `design_files`
  UNION ALL SELECT 'document_templates', COUNT(*) FROM `document_templates`
  UNION ALL SELECT 'documents', COUNT(*) FROM `documents`
  UNION ALL SELECT 'domain_events', COUNT(*) FROM `domain_events`
  UNION ALL SELECT 'expenses', COUNT(*) FROM `expenses`
  UNION ALL SELECT 'filament_spools', COUNT(*) FROM `filament_spools`
  UNION ALL SELECT 'financial_periods', COUNT(*) FROM `financial_periods`
  UNION ALL SELECT 'financial_transactions', COUNT(*) FROM `financial_transactions`
  UNION ALL SELECT 'goods_receipt_items', COUNT(*) FROM `goods_receipt_items`
  UNION ALL SELECT 'goods_receipts', COUNT(*) FROM `goods_receipts`
  UNION ALL SELECT 'integration_secrets', COUNT(*) FROM `integration_secrets`
  UNION ALL SELECT 'integration_sync_logs', COUNT(*) FROM `integration_sync_logs`
  UNION ALL SELECT 'integrations', COUNT(*) FROM `integrations`
  UNION ALL SELECT 'internal_transfers', COUNT(*) FROM `internal_transfers`
  UNION ALL SELECT 'inventory_movements', COUNT(*) FROM `inventory_movements`
  UNION ALL SELECT 'invoice_items', COUNT(*) FROM `invoice_items`
  UNION ALL SELECT 'invoice_payment_schedules', COUNT(*) FROM `invoice_payment_schedules`
  UNION ALL SELECT 'invoices', COUNT(*) FROM `invoices`
  UNION ALL SELECT 'journal_entries', COUNT(*) FROM `journal_entries`
  UNION ALL SELECT 'journal_lines', COUNT(*) FROM `journal_lines`
  UNION ALL SELECT 'login_history', COUNT(*) FROM `login_history`
  UNION ALL SELECT 'marketplace_fee_rules', COUNT(*) FROM `marketplace_fee_rules`
  UNION ALL SELECT 'marketplace_settlement_items', COUNT(*) FROM `marketplace_settlement_items`
  UNION ALL SELECT 'marketplace_settlements', COUNT(*) FROM `marketplace_settlements`
  UNION ALL SELECT 'master_options', COUNT(*) FROM `master_options`
  UNION ALL SELECT 'material_batches', COUNT(*) FROM `material_batches`
  UNION ALL SELECT 'material_categories', COUNT(*) FROM `material_categories`
  UNION ALL SELECT 'material_waste', COUNT(*) FROM `material_waste`
  UNION ALL SELECT 'materials', COUNT(*) FROM `materials`
  UNION ALL SELECT 'notifications', COUNT(*) FROM `notifications`
  UNION ALL SELECT 'order_attachments', COUNT(*) FROM `order_attachments`
  UNION ALL SELECT 'parties', COUNT(*) FROM `parties`
  UNION ALL SELECT 'partner_price_rules', COUNT(*) FROM `partner_price_rules`
  UNION ALL SELECT 'party_contacts', COUNT(*) FROM `party_contacts`
  UNION ALL SELECT 'party_roles', COUNT(*) FROM `party_roles`
  UNION ALL SELECT 'payment_methods', COUNT(*) FROM `payment_methods`
  UNION ALL SELECT 'payments', COUNT(*) FROM `payments`
  UNION ALL SELECT 'print_failures', COUNT(*) FROM `print_failures`
  UNION ALL SELECT 'print_job_materials', COUNT(*) FROM `print_job_materials`
  UNION ALL SELECT 'print_job_status_history', COUNT(*) FROM `print_job_status_history`
  UNION ALL SELECT 'print_jobs', COUNT(*) FROM `print_jobs`
  UNION ALL SELECT 'print_profiles', COUNT(*) FROM `print_profiles`
  UNION ALL SELECT 'printer_issues', COUNT(*) FROM `printer_issues`
  UNION ALL SELECT 'printer_maintenance_records', COUNT(*) FROM `printer_maintenance_records`
  UNION ALL SELECT 'printer_maintenance_schedules', COUNT(*) FROM `printer_maintenance_schedules`
  UNION ALL SELECT 'printers', COUNT(*) FROM `printers`
  UNION ALL SELECT 'product_bom_items', COUNT(*) FROM `product_bom_items`
  UNION ALL SELECT 'product_boms', COUNT(*) FROM `product_boms`
  UNION ALL SELECT 'product_categories', COUNT(*) FROM `product_categories`
  UNION ALL SELECT 'product_variants', COUNT(*) FROM `product_variants`
  UNION ALL SELECT 'production_queue_items', COUNT(*) FROM `production_queue_items`
  UNION ALL SELECT 'products', COUNT(*) FROM `products`
  UNION ALL SELECT 'project_deliverables', COUNT(*) FROM `project_deliverables`
  UNION ALL SELECT 'project_external_assignments', COUNT(*) FROM `project_external_assignments`
  UNION ALL SELECT 'project_milestones', COUNT(*) FROM `project_milestones`
  UNION ALL SELECT 'purchase_order_items', COUNT(*) FROM `purchase_order_items`
  UNION ALL SELECT 'purchase_orders', COUNT(*) FROM `purchase_orders`
  UNION ALL SELECT 'purchase_request_items', COUNT(*) FROM `purchase_request_items`
  UNION ALL SELECT 'purchase_requests', COUNT(*) FROM `purchase_requests`
  UNION ALL SELECT 'qc_inspection_items', COUNT(*) FROM `qc_inspection_items`
  UNION ALL SELECT 'qc_inspections', COUNT(*) FROM `qc_inspections`
  UNION ALL SELECT 'qc_template_items', COUNT(*) FROM `qc_template_items`
  UNION ALL SELECT 'qc_templates', COUNT(*) FROM `qc_templates`
  UNION ALL SELECT 'quick_links', COUNT(*) FROM `quick_links`
  UNION ALL SELECT 'quotation_items', COUNT(*) FROM `quotation_items`
  UNION ALL SELECT 'quotation_template_items', COUNT(*) FROM `quotation_template_items`
  UNION ALL SELECT 'quotation_templates', COUNT(*) FROM `quotation_templates`
  UNION ALL SELECT 'quotations', COUNT(*) FROM `quotations`
  UNION ALL SELECT 'report_definitions', COUNT(*) FROM `report_definitions`
  UNION ALL SELECT 'report_exports', COUNT(*) FROM `report_exports`
  UNION ALL SELECT 'sales_channels', COUNT(*) FROM `sales_channels`
  UNION ALL SELECT 'service_package_items', COUNT(*) FROM `service_package_items`
  UNION ALL SELECT 'service_packages', COUNT(*) FROM `service_packages`
  UNION ALL SELECT 'stock_reservations', COUNT(*) FROM `stock_reservations`
  UNION ALL SELECT 'studio_project_members', COUNT(*) FROM `studio_project_members`
  UNION ALL SELECT 'studio_project_services', COUNT(*) FROM `studio_project_services`
  UNION ALL SELECT 'studio_project_status_history', COUNT(*) FROM `studio_project_status_history`
  UNION ALL SELECT 'studio_projects', COUNT(*) FROM `studio_projects`
  UNION ALL SELECT 'studio_service_categories', COUNT(*) FROM `studio_service_categories`
  UNION ALL SELECT 'studio_services', COUNT(*) FROM `studio_services`
  UNION ALL SELECT 'supplier_invoices', COUNT(*) FROM `supplier_invoices`
  UNION ALL SELECT 'system_settings', COUNT(*) FROM `system_settings`
  UNION ALL SELECT 'task_assignees', COUNT(*) FROM `task_assignees`
  UNION ALL SELECT 'tasks', COUNT(*) FROM `tasks`
  UNION ALL SELECT 'transaction_categories', COUNT(*) FROM `transaction_categories`
  UNION ALL SELECT 'treasury_accounts', COUNT(*) FROM `treasury_accounts`
  UNION ALL SELECT 'units_of_measure', COUNT(*) FROM `units_of_measure`
  UNION ALL SELECT 'user_deletion_requests', COUNT(*) FROM `user_deletion_requests`
  UNION ALL SELECT 'user_presence_sessions', COUNT(*) FROM `user_presence_sessions`
  UNION ALL SELECT 'user_reactivation_requests', COUNT(*) FROM `user_reactivation_requests`
  UNION ALL SELECT 'user_sessions', COUNT(*) FROM `user_sessions`
) AS verification
WHERE rows_ <> 0;

-- 2b. Preserved-table row counts -- compare against PART 0's "before" output.
SELECT 'organizations' AS tbl, COUNT(*) AS rows_ FROM `organizations`
UNION ALL SELECT 'business_units', COUNT(*) FROM `business_units`
UNION ALL SELECT 'users', COUNT(*) FROM `users`
UNION ALL SELECT 'roles', COUNT(*) FROM `roles`
UNION ALL SELECT 'permissions', COUNT(*) FROM `permissions`
UNION ALL SELECT 'role_permissions', COUNT(*) FROM `role_permissions`
UNION ALL SELECT 'user_roles', COUNT(*) FROM `user_roles`
UNION ALL SELECT 'user_business_units', COUNT(*) FROM `user_business_units`;

-- 2c. Preserved-table checksums -- compare byte-for-byte against PART 0.
CHECKSUM TABLE `organizations`, `business_units`, `users`, `roles`,
  `permissions`, `role_permissions`, `user_roles`, `user_business_units`;

-- 2d. FK integrity -- every column below must read 0.
SELECT
  (SELECT COUNT(*) FROM `users` u
     LEFT JOIN `organizations` o ON o.`id` = u.`organization_id`
   WHERE o.`id` IS NULL) AS users_missing_organization,
  (SELECT COUNT(*) FROM `user_roles` ur
     LEFT JOIN `users` u ON u.`id` = ur.`user_id`
     LEFT JOIN `roles` r ON r.`id` = ur.`role_id`
   WHERE u.`id` IS NULL OR r.`id` IS NULL) AS invalid_user_role_links,
  (SELECT COUNT(*) FROM `role_permissions` rp
     LEFT JOIN `roles` r ON r.`id` = rp.`role_id`
     LEFT JOIN `permissions` p ON p.`id` = rp.`permission_id`
   WHERE r.`id` IS NULL OR p.`id` IS NULL) AS invalid_role_permission_links,
  (SELECT COUNT(*) FROM `user_business_units` ubu
     LEFT JOIN `users` u ON u.`id` = ubu.`user_id`
     LEFT JOIN `business_units` bu ON bu.`id` = ubu.`business_unit_id`
   WHERE u.`id` IS NULL OR bu.`id` IS NULL) AS invalid_user_business_unit_links;

-- ============================================================================
-- END
-- ============================================================================

-- ============================================================================
-- UNI-NEXUS GLOBAL SETTINGS RECONCILIATION
--
-- CURRENT DEVELOPMENT DATABASE WAS RECONCILED BEFORE THIS FILE WAS ADDED.
-- THIS IS SOURCE-CONTROL HISTORY ONLY. DO NOT EXECUTE THIS MIGRATION.
--
-- MySQL 8.0 restriction: a base column of a STORED generated column cannot
-- have ON DELETE/UPDATE CASCADE or SET NULL actions. The pre-existing
-- system_settings.business_unit_id foreign key therefore changes from ON
-- DELETE CASCADE to its safe default RESTRICT action before the generated
-- effective-scope column is introduced.
-- ============================================================================

ALTER TABLE system_settings DROP FOREIGN KEY fk_system_settings_bu;

ALTER TABLE system_settings
  ADD COLUMN scope_business_unit_id BIGINT UNSIGNED
    GENERATED ALWAYS AS (COALESCE(business_unit_id, 0)) STORED
    AFTER business_unit_id;

ALTER TABLE system_settings
  ADD CONSTRAINT fk_system_settings_bu
    FOREIGN KEY (business_unit_id) REFERENCES business_units (id);

ALTER TABLE system_settings
  ADD UNIQUE KEY uq_system_setting_scope
    (organization_id, scope_business_unit_id, setting_group, setting_key);

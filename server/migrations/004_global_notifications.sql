-- GLOBAL NOTIFICATIONS MIGRATION
-- IMPORTANT: the active local development database may already contain this
-- schema because it was applied manually through phpMyAdmin. Do NOT run this
-- migration against that database; it is source-control history for clean or
-- future installations only.

-- MySQL 8.0 does not support ADD COLUMN IF NOT EXISTS or CREATE INDEX IF NOT EXISTS.
-- Each statement below therefore checks the active schema and prepares either the
-- required DDL or a harmless SELECT. The migration is safe to re-run.

SET @notifications_schema = DATABASE();

SET @has_module_code = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @notifications_schema
    AND TABLE_NAME = 'notifications'
    AND COLUMN_NAME = 'module_code'
);
SET @sql = IF(
  @has_module_code = 0,
  'ALTER TABLE notifications ADD COLUMN module_code VARCHAR(80) NULL COMMENT ''Canonical source module for filtering and presentation'' AFTER notification_type',
  'SELECT 1'
);
PREPARE notifications_stmt FROM @sql;
EXECUTE notifications_stmt;
DEALLOCATE PREPARE notifications_stmt;

SET @has_dedupe_key = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @notifications_schema
    AND TABLE_NAME = 'notifications'
    AND COLUMN_NAME = 'dedupe_key'
);
SET @sql = IF(
  @has_dedupe_key = 0,
  'ALTER TABLE notifications ADD COLUMN dedupe_key VARCHAR(190) NULL COMMENT ''Optional idempotency key; unique when non-NULL'' AFTER entity_id',
  'SELECT 1'
);
PREPARE notifications_stmt FROM @sql;
EXECUTE notifications_stmt;
DEALLOCATE PREPARE notifications_stmt;

SET @has_uq_dedupe_key = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @notifications_schema
    AND TABLE_NAME = 'notifications'
    AND INDEX_NAME = 'uq_notifications_dedupe_key'
);
SET @sql = IF(
  @has_uq_dedupe_key = 0,
  'CREATE UNIQUE INDEX uq_notifications_dedupe_key ON notifications (dedupe_key)',
  'SELECT 1'
);
PREPARE notifications_stmt FROM @sql;
EXECUTE notifications_stmt;
DEALLOCATE PREPARE notifications_stmt;

SET @has_user_scope_time = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @notifications_schema
    AND TABLE_NAME = 'notifications'
    AND INDEX_NAME = 'idx_notifications_user_scope_time'
);
SET @sql = IF(
  @has_user_scope_time = 0,
  'CREATE INDEX idx_notifications_user_scope_time ON notifications (user_id, business_unit_id, created_at)',
  'SELECT 1'
);
PREPARE notifications_stmt FROM @sql;
EXECUTE notifications_stmt;
DEALLOCATE PREPARE notifications_stmt;

SET @has_user_module_time = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @notifications_schema
    AND TABLE_NAME = 'notifications'
    AND INDEX_NAME = 'idx_notifications_user_module_time'
);
SET @sql = IF(
  @has_user_module_time = 0,
  'CREATE INDEX idx_notifications_user_module_time ON notifications (user_id, module_code, created_at)',
  'SELECT 1'
);
PREPARE notifications_stmt FROM @sql;
EXECUTE notifications_stmt;
DEALLOCATE PREPARE notifications_stmt;

SET @has_user_severity_read = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @notifications_schema
    AND TABLE_NAME = 'notifications'
    AND INDEX_NAME = 'idx_notifications_user_severity_read'
);
SET @sql = IF(
  @has_user_severity_read = 0,
  'CREATE INDEX idx_notifications_user_severity_read ON notifications (user_id, severity_code, is_read, created_at)',
  'SELECT 1'
);
PREPARE notifications_stmt FROM @sql;
EXECUTE notifications_stmt;
DEALLOCATE PREPARE notifications_stmt;

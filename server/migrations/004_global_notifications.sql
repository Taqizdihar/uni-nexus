-- GLOBAL NOTIFICATIONS MIGRATION
-- IMPORTANT: the active local development database may already contain this
-- schema because it was applied manually through phpMyAdmin. Do NOT run this
-- migration against that database; it is source-control history for clean or
-- future installations only.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS module_code VARCHAR(80) NULL
    COMMENT 'Canonical source module for filtering and presentation' AFTER notification_type,
  ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(190) NULL
    COMMENT 'Optional idempotency key; unique when non-NULL' AFTER entity_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe_key ON notifications (dedupe_key);
CREATE INDEX IF NOT EXISTS idx_notifications_user_scope_time ON notifications (user_id, business_unit_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_module_time ON notifications (user_id, module_code, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_severity_read ON notifications (user_id, severity_code, is_read, created_at);

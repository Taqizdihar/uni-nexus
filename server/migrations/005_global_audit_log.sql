-- Source-control history only. These indexes were applied manually before this
-- migration was added; do not execute it against the current development DB.
-- MySQL 8 has no CREATE INDEX IF NOT EXISTS, so each index is conditionally
-- created using INFORMATION_SCHEMA + PREPARE.
SET @schema_name := DATABASE();

SET @index_name := 'idx_audit_logs_org_time';
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='audit_logs' AND INDEX_NAME=@index_name)=0, 'CREATE INDEX idx_audit_logs_org_time ON audit_logs (organization_id, created_at, id)', 'SELECT 1');
PREPARE audit_index_statement FROM @sql; EXECUTE audit_index_statement; DEALLOCATE PREPARE audit_index_statement;

SET @index_name := 'idx_audit_logs_org_bu_time';
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='audit_logs' AND INDEX_NAME=@index_name)=0, 'CREATE INDEX idx_audit_logs_org_bu_time ON audit_logs (organization_id, business_unit_id, created_at, id)', 'SELECT 1');
PREPARE audit_index_statement FROM @sql; EXECUTE audit_index_statement; DEALLOCATE PREPARE audit_index_statement;

SET @index_name := 'idx_audit_logs_org_module_time';
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='audit_logs' AND INDEX_NAME=@index_name)=0, 'CREATE INDEX idx_audit_logs_org_module_time ON audit_logs (organization_id, module_code, created_at, id)', 'SELECT 1');
PREPARE audit_index_statement FROM @sql; EXECUTE audit_index_statement; DEALLOCATE PREPARE audit_index_statement;

SET @index_name := 'idx_audit_logs_org_action_time';
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='audit_logs' AND INDEX_NAME=@index_name)=0, 'CREATE INDEX idx_audit_logs_org_action_time ON audit_logs (organization_id, action_code, created_at, id)', 'SELECT 1');
PREPARE audit_index_statement FROM @sql; EXECUTE audit_index_statement; DEALLOCATE PREPARE audit_index_statement;

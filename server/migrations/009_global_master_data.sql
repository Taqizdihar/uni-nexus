-- =============================================================================
-- CURRENT DEVELOPMENT DATABASE HAS ALREADY BEEN RECONCILED MANUALLY THROUGH
-- PHPMYADMIN. DO NOT EXECUTE THIS MIGRATION.
--
-- This file is source-control history only. It records the Data Master RBAC
-- reconciliation already present in the development database and is written
-- idempotently for environments that use the project's migration history.
-- =============================================================================

INSERT INTO permissions (code, module_code, name, description)
VALUES
  ('master_data.read', 'master_data', 'Lihat Data Master', 'Melihat data referensi terpusat UNI-NEXUS sesuai workspace dan hak akses pengguna.'),
  ('master_data.manage', 'master_data', 'Kelola Data Master', 'Mengelola data referensi terpusat UNI-NEXUS dengan tetap mengikuti hak akses domain terkait.')
ON DUPLICATE KEY UPDATE
  module_code = VALUES(module_code), name = VALUES(name), description = VALUES(description);

-- Executive roles receive read/manage; Specialist Staff receives read only.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('master_data.read', 'master_data.manage')
WHERE r.code IN ('CEO', 'CTO', 'COO');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'master_data.read'
WHERE r.code = 'SPECIALIST_STAFF';

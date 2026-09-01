-- ============================================================================
-- UNI-NEXUS GLOBAL INTEGRATION CENTER — SCHEMA & PERMISSIONS (ADDITIVE)
-- ============================================================================
-- Adds the encrypted credential vault used by the canonical `integrations` /
-- `integration_sync_logs` platform, plus the Global Integration Center
-- permission triad. Does NOT recreate or alter `integrations` or
-- `integration_sync_logs` — those tables already exist and are reused as-is.

CREATE TABLE IF NOT EXISTS integration_secrets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  integration_id BIGINT UNSIGNED NOT NULL,
  secret_name VARCHAR(100) NOT NULL,
  key_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  ciphertext LONGBLOB NOT NULL,
  iv VARBINARY(12) NOT NULL,
  auth_tag VARBINARY(16) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_integration_secret (integration_id, secret_name),
  KEY fk_integration_secrets_created_by (created_by),
  KEY fk_integration_secrets_updated_by (updated_by),
  CONSTRAINT fk_integration_secrets_integration FOREIGN KEY (integration_id) REFERENCES integrations (id) ON DELETE CASCADE,
  CONSTRAINT fk_integration_secrets_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_integration_secrets_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='AES-256-GCM encrypted integration credentials. Never store plaintext secrets here or anywhere else.';

INSERT IGNORE INTO permissions (code, module_code, name, description) VALUES
  ('integrations.read', 'integrations', 'Lihat Pusat Integrasi', 'Melihat Pusat Integrasi Global, katalog provider, metadata koneksi, dan riwayat yang sudah disanitasi.'),
  ('integrations.manage', 'integrations', 'Kelola Integrasi', 'Membuat/mengubah/mengaktifkan/menonaktifkan koneksi integrasi dan memperbarui/menghapus kredensial.'),
  ('integrations.sync', 'integrations', 'Uji & Sinkronkan Integrasi', 'Menguji koneksi dan menjalankan sinkronisasi/aksi provider yang benar-benar didukung.');

-- Roles that already hold settings.manage inherit the Global Integration Center triad,
-- matching the precedent set by 010_global_report_center.sql (reports.export -> reports.read).
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT settings_grant.role_id, integration_permission.id
FROM role_permissions settings_grant
JOIN permissions settings_permission ON settings_permission.id = settings_grant.permission_id AND settings_permission.code = 'settings.manage'
JOIN permissions integration_permission ON integration_permission.code IN ('integrations.read', 'integrations.manage', 'integrations.sync');

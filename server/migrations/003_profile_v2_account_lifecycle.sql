-- PROFILE V2 ACCOUNT LIFECYCLE MIGRATION
-- IMPORTANT: the current local development database already contains this
-- schema. This file is source-control history for clean/future upgrades only;
-- do NOT apply it manually to the current development database.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_banner_path VARCHAR(500) NULL AFTER avatar_path,
  ADD COLUMN IF NOT EXISTS profile_status_code VARCHAR(30) NOT NULL DEFAULT 'default'
    COMMENT 'default|busy|sick|leave' AFTER profile_banner_path;

-- The former account-like profile_status marker is superseded by the dedicated
-- profile_status_code field above. MySQL 8 supports this defensive form.
ALTER TABLE users DROP COLUMN IF EXISTS profile_status;

-- Keep fresh deployments aligned with the canonical registration-source set.
ALTER TABLE users
  MODIFY COLUMN registration_source VARCHAR(30) NOT NULL DEFAULT 'self_signup'
    COMMENT 'self_signup|admin_created|bootstrap|legacy|reactivation';

CREATE TABLE IF NOT EXISTS user_deletion_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  status_code VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|revoked|approved|rejected',
  request_reason VARCHAR(500) NULL,
  requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  review_note VARCHAR(500) NULL,
  pending_user_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status_code = 'pending' THEN user_id ELSE NULL END) STORED,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_deletion_requests_pending_user (pending_user_id),
  KEY idx_user_deletion_requests_queue (organization_id, status_code, requested_at),
  KEY idx_user_deletion_requests_history (user_id, requested_at),
  KEY idx_user_deletion_requests_reviewer (reviewed_by),
  CONSTRAINT fk_user_deletion_requests_org FOREIGN KEY (organization_id) REFERENCES organizations (id),
  CONSTRAINT fk_user_deletion_requests_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_user_deletion_requests_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_reactivation_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  deleted_user_id BIGINT UNSIGNED NOT NULL,
  requested_full_name VARCHAR(150) NOT NULL,
  requested_username VARCHAR(100) NOT NULL,
  requested_email VARCHAR(190) NOT NULL,
  requested_password_hash VARCHAR(255) NULL,
  requested_phone VARCHAR(50) NULL,
  requested_default_workspace_code VARCHAR(30) NOT NULL DEFAULT 'craft' COMMENT 'craft|studio',
  status_code VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|approved|rejected',
  requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  review_note VARCHAR(500) NULL,
  pending_deleted_user_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status_code = 'pending' THEN deleted_user_id ELSE NULL END) STORED,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_reactivation_requests_pending_user (pending_deleted_user_id),
  KEY idx_user_reactivation_requests_queue (organization_id, status_code, requested_at),
  KEY idx_user_reactivation_requests_history (deleted_user_id, requested_at),
  KEY idx_user_reactivation_requests_reviewer (reviewed_by),
  CONSTRAINT fk_user_reactivation_requests_org FOREIGN KEY (organization_id) REFERENCES organizations (id),
  CONSTRAINT fk_user_reactivation_requests_deleted_user FOREIGN KEY (deleted_user_id) REFERENCES users (id),
  CONSTRAINT fk_user_reactivation_requests_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

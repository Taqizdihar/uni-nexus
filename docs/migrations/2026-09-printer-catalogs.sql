-- Apply once to the existing MySQL 8 database. This migration is additive: it preserves
-- existing printer rows and every relation that already points to printers.id.
CREATE TABLE IF NOT EXISTS printer_catalogs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, workspace_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL, brand VARCHAR(120) NULL, model VARCHAR(120) NULL,
  build_volume_x_mm DECIMAL(10,2) NULL, build_volume_y_mm DECIMAL(10,2) NULL,
  build_volume_z_mm DECIMAL(10,2) NULL, default_nozzle_size_mm DECIMAL(6,3) NULL,
  photo_original_file_name VARCHAR(255) NULL, photo_mime_type VARCHAR(120) NULL,
  photo_file_size_bytes BIGINT UNSIGNED NULL, photo_storage_provider VARCHAR(40) NULL,
  photo_bucket_name VARCHAR(120) NULL, photo_object_key VARCHAR(500) NULL,
  photo_public_url TEXT NULL, photo_alt_text VARCHAR(255) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_printer_catalogs_workspace_active (workspace_id, is_active),
  CONSTRAINT fk_printer_catalogs_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE printers
  ADD COLUMN printer_catalog_id BIGINT UNSIGNED NULL,
  ADD COLUMN photo_original_file_name VARCHAR(255) NULL,
  ADD COLUMN photo_mime_type VARCHAR(120) NULL,
  ADD COLUMN photo_file_size_bytes BIGINT UNSIGNED NULL,
  ADD COLUMN photo_storage_provider VARCHAR(40) NULL,
  ADD COLUMN photo_bucket_name VARCHAR(120) NULL,
  ADD COLUMN photo_object_key VARCHAR(500) NULL,
  ADD COLUMN photo_public_url TEXT NULL,
  ADD COLUMN photo_alt_text VARCHAR(255) NULL,
  ADD KEY idx_printers_catalog (printer_catalog_id),
  ADD CONSTRAINT fk_printers_catalog FOREIGN KEY (printer_catalog_id) REFERENCES printer_catalogs(id);

-- Backfill one catalog for every current physical printer. This preserves duplicate models and
-- links every old unit without changing serials, photos, or existing production relations.
DELIMITER //
CREATE PROCEDURE backfill_printer_catalogs()
BEGIN
  DECLARE finished BOOL DEFAULT FALSE; DECLARE source_id BIGINT UNSIGNED; DECLARE catalog_id BIGINT UNSIGNED;
  DECLARE cur CURSOR FOR SELECT id FROM printers WHERE printer_catalog_id IS NULL ORDER BY id;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished = TRUE;
  OPEN cur;
  entries: LOOP
    FETCH cur INTO source_id; IF finished THEN LEAVE entries; END IF;
    INSERT INTO printer_catalogs (workspace_id,name,brand,model,build_volume_x_mm,build_volume_y_mm,build_volume_z_mm,default_nozzle_size_mm,photo_original_file_name,photo_mime_type,photo_file_size_bytes,photo_storage_provider,photo_bucket_name,photo_object_key,photo_public_url,photo_alt_text,is_active)
    SELECT workspace_id,name,brand,model,build_volume_x_mm,build_volume_y_mm,build_volume_z_mm,default_nozzle_size_mm,photo_original_file_name,photo_mime_type,photo_file_size_bytes,photo_storage_provider,photo_bucket_name,photo_object_key,photo_public_url,photo_alt_text,is_active FROM printers WHERE id=source_id;
    SET catalog_id = LAST_INSERT_ID(); UPDATE printers SET printer_catalog_id=catalog_id WHERE id=source_id;
  END LOOP;
  CLOSE cur;
END//
DELIMITER ;
CALL backfill_printer_catalogs();
DROP PROCEDURE backfill_printer_catalogs;

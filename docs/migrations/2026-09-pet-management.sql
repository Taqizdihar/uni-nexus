-- MySQL 8 migration for the first real Pet catalog.
-- Built-in identity is immutable and separate from the CTO-editable code field.

SET @pet_schema = DATABASE();
SET @pet_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = @pet_schema AND table_name = 'pets' AND column_name = 'builtin_key'
  ),
  'SELECT 1',
  'ALTER TABLE pets ADD COLUMN builtin_key VARCHAR(60) NULL AFTER id'
);
PREPARE pet_stmt FROM @pet_ddl;
EXECUTE pet_stmt;
DEALLOCATE PREPARE pet_stmt;

SET @pet_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = @pet_schema AND table_name = 'pets' AND index_name = 'uq_pets_builtin_key'
  ),
  'SELECT 1',
  'ALTER TABLE pets ADD UNIQUE KEY uq_pets_builtin_key (builtin_key)'
);
PREPARE pet_stmt FROM @pet_ddl;
EXECUTE pet_stmt;
DEALLOCATE PREPARE pet_stmt;

ALTER TABLE pets
  MODIFY COLUMN code VARCHAR(60) NULL,
  MODIFY COLUMN name VARCHAR(120) NULL;

-- Convert legacy rows without changing CTO-authored metadata or uploaded images.
UPDATE pets
SET builtin_key = code,
    code = NULL
WHERE builtin_key IS NULL
  AND code IN ('UNI_INU', 'AZZY', 'CIPHER', 'CRAFTY_CAT', 'DESSY');

UPDATE pets
SET code = NULL
WHERE builtin_key IN ('UNI_INU', 'AZZY', 'CIPHER', 'CRAFTY_CAT', 'DESSY')
  AND code IN ('UNI_INU', 'AZZY', 'CIPHER', 'CRAFTY_CAT', 'DESSY');

INSERT INTO pets
  (builtin_key, code, name, subtitle, description, image_storage_provider, image_object_key, is_active, sort_order)
VALUES
  ('UNI_INU', NULL, NULL, NULL, NULL, 'BUILTIN', 'pets/Uni-Inu/Idle/Uni-Inu.avif', 1, 0),
  ('AZZY', NULL, NULL, NULL, NULL, 'BUILTIN', 'pets/Azzy/Idle/Azzy.avif', 1, 10),
  ('CIPHER', NULL, NULL, NULL, NULL, 'BUILTIN', 'pets/Cipher/Idle/Cipher.avif', 1, 20),
  ('CRAFTY_CAT', NULL, NULL, NULL, NULL, 'BUILTIN', 'pets/Crafty Cat/Idle/Crafty Cat.avif', 1, 30),
  ('DESSY', NULL, NULL, NULL, NULL, 'BUILTIN', 'pets/Dessy/Idle/Dessy.avif', 1, 40)
ON DUPLICATE KEY UPDATE
  is_active = 1,
  sort_order = VALUES(sort_order),
  image_storage_provider = COALESCE(image_storage_provider, VALUES(image_storage_provider)),
  image_object_key = COALESCE(image_object_key, VALUES(image_object_key));

DROP PROCEDURE IF EXISTS backfill_required_pets;
DELIMITER //
CREATE PROCEDURE backfill_required_pets()
BEGIN
  DECLARE uni_inu_id BIGINT UNSIGNED;
  SELECT id INTO uni_inu_id FROM pets WHERE builtin_key = 'UNI_INU' AND is_active = 1 LIMIT 1;
  IF uni_inu_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'UNI_INU could not be resolved';
  END IF;
  UPDATE users SET pet_id = uni_inu_id WHERE pet_id IS NULL;
  IF (SELECT COUNT(*) FROM users WHERE pet_id IS NULL) > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Some users still have no Pet';
  END IF;
END//
DELIMITER ;
CALL backfill_required_pets();
DROP PROCEDURE backfill_required_pets;

-- A required column cannot retain ON DELETE SET NULL. Preserve the relationship
-- while making deletion of a referenced Pet explicit and safe.
SET @pet_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE BINARY constraint_schema = BINARY @pet_schema
      AND BINARY table_name = BINARY 'users'
      AND BINARY constraint_name = BINARY 'fk_users_pet'
      AND BINARY delete_rule = BINARY 'SET NULL'
  ),
  'ALTER TABLE users DROP FOREIGN KEY fk_users_pet',
  'SELECT 1'
);
PREPARE pet_stmt FROM @pet_ddl;
EXECUTE pet_stmt;
DEALLOCATE PREPARE pet_stmt;

ALTER TABLE users
  MODIFY COLUMN pet_id BIGINT UNSIGNED NOT NULL;

SET @pet_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE BINARY constraint_schema = BINARY @pet_schema
      AND BINARY table_name = BINARY 'users'
      AND BINARY constraint_name = BINARY 'fk_users_pet'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD CONSTRAINT fk_users_pet FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE RESTRICT ON UPDATE CASCADE'
);
PREPARE pet_stmt FROM @pet_ddl;
EXECUTE pet_stmt;
DEALLOCATE PREPARE pet_stmt;

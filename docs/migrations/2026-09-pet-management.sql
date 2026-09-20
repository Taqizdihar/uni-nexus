-- Apply once to the existing MySQL 8 database. This migration preserves existing
-- pet selections and makes Uni-Inu the required system default.

ALTER TABLE pets
  MODIFY COLUMN name VARCHAR(120) NULL;

INSERT INTO pets
  (code, name, subtitle, description, image_storage_provider, image_object_key, is_active, sort_order)
VALUES
  ('UNI_INU', NULL, NULL, NULL, 'BUILTIN', 'pets/Uni-Inu/Idle/Uni-Inu.avif', 1, 0),
  ('AZZY', NULL, NULL, NULL, 'BUILTIN', 'pets/Azzy/Idle/Azzy.avif', 1, 10),
  ('CIPHER', NULL, NULL, NULL, 'BUILTIN', 'pets/Cipher/Idle/Cipher.avif', 1, 20),
  ('CRAFTY_CAT', NULL, NULL, NULL, 'BUILTIN', 'pets/Crafty Cat/Idle/Crafty Cat.avif', 1, 30),
  ('DESSY', NULL, NULL, NULL, 'BUILTIN', 'pets/Dessy/Idle/Dessy.avif', 1, 40)
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
  SELECT id INTO uni_inu_id FROM pets WHERE code = 'UNI_INU' LIMIT 1;
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

ALTER TABLE users
  MODIFY COLUMN pet_id BIGINT UNSIGNED NOT NULL;

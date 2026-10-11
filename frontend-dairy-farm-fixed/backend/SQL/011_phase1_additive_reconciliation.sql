-- ===========================================================================
-- PHASE 1 — ADDITIVE SCHEMA RECONCILIATION FOR `dairy_farm`
-- ===========================================================================
-- RULES OBSERVED:
--   * NOTHING is dropped. NO table is truncated or recreated.
--   * NO existing row is deleted or modified.
--   * Every statement is idempotent (safe to run repeatedly).
--   * Every statement is ADDITIVE.
--
-- WHY THIS IS NEEDED
--   The EF Core models were written against an older draft schema
--   (`dairy farm 1`, which is 100% EMPTY). The canonical live database is
--   `dairy_farm`, which holds all real data but is missing a small number of
--   supporting tables. Rather than rebuild `dairy_farm` to match the dead
--   draft, the EF models are being rewritten to match `dairy_farm`, and only
--   the genuinely missing supporting tables are added here.
-- ===========================================================================

USE `dairy_farm`;

-- ---------------------------------------------------------------------------
-- 1. breeds — reference/lookup list for the UI dropdown.
--    `animals.breed` remains a VARCHAR and is NOT touched. The 5 existing
--    animals keep their 'Holstein Friesian' string values.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `breeds` (
  `breed_id`     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(150)    NOT NULL,
  `description`  VARCHAR(500)    NULL,
  `status`       VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`breed_id`),
  UNIQUE KEY `uq_breeds_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `breeds` (`name`, `description`) VALUES
  ('Holstein Friesian', 'High-yield dairy breed'),
  ('Jersey',            'Butterfat-rich dairy breed'),
  ('Sahiwal',           'Heat-tolerant zebu dairy breed'),
  ('Red Sindhi',        'Heat-tolerant zebu dairy breed'),
  ('Friesian Cross',    'Friesian crossbred'),
  ('Buffalo',           'Nili-Ravi / Murrah buffalo');

-- ---------------------------------------------------------------------------
-- 2. animal_photos — persistent image storage.
--    `animals.photo_url` stays as the pointer to the served image; the bytes
--    live here so uploads survive a browser refresh and a server restart.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `animal_photos` (
  `photo_id`    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `animal_id`   BIGINT UNSIGNED NOT NULL,
  `file_name`   VARCHAR(255)    NOT NULL,
  `file_type`   VARCHAR(50)     NOT NULL,
  `file_size`   BIGINT          NOT NULL,
  `image_data`  LONGBLOB        NOT NULL,
  `is_primary`  TINYINT(1)      NOT NULL DEFAULT 0,
  `uploaded_by` BIGINT UNSIGNED NULL,
  `uploaded_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`photo_id`),
  KEY `idx_animal_photos_animal` (`animal_id`),
  CONSTRAINT `fk_animal_photos_animal`
    FOREIGN KEY (`animal_id`) REFERENCES `animals` (`animal_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. farm_user_access — farm-level authorization.
--    `users.farm_id` already scopes a user to ONE home farm; this table grants
--    access to any ADDITIONAL farms and is the basis for cross-farm isolation.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `farm_user_access` (
  `user_id`      BIGINT UNSIGNED NOT NULL,
  `farm_id`      BIGINT UNSIGNED NOT NULL,
  `access_level` VARCHAR(20)     NOT NULL DEFAULT 'VIEW',
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `farm_id`),
  KEY `idx_farm_user_access_farm` (`farm_id`),
  CONSTRAINT `fk_fua_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fua_farm` FOREIGN KEY (`farm_id`)
    REFERENCES `farms` (`farm_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. api_keys — API-first integration surface.
--    The raw key is shown exactly once at creation; only a SHA-256 hash is
--    stored.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `api_keys` (
  `api_key_id`  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `farm_id`     BIGINT UNSIGNED NOT NULL,
  `user_id`     BIGINT UNSIGNED NULL,
-- ---------------------------------------------------------------------------
-- 5. animal_code_sequences — per-farm animal number counter.
--    Drives AN-001, AN-002, ... allocation under a row lock so two concurrent
--    creates can never produce the same animal number.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `animal_code_sequences` (
  `farm_id`      BIGINT UNSIGNED NOT NULL,
  `prefix`       VARCHAR(20)     NOT NULL DEFAULT 'AN-',
  `next_number`  BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `updated_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`farm_id`),
  CONSTRAINT `fk_acs_farm` FOREIGN KEY (`farm_id`)
    REFERENCES `farms` (`farm_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing animals start at AN-005, so the next generated number must be 6.
INSERT IGNORE INTO `animal_code_sequences` (`farm_id`, `prefix`, `next_number`)
SELECT `farm_id`, 'AN-', 6 FROM `farms`;

-- ---------------------------------------------------------------------------
-- 6. notifications.farm_id — ADDITIVE column.
--    The live `notifications` table has no farm column, which makes
--    farm-scoped notification queries impossible and risks cross-farm leaks.
--    The table currently has 0 rows, so this is a pure additive change.
-- ---------------------------------------------------------------------------
SET @hasFarmId := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'dairy_farm'
    AND TABLE_NAME  = 'notifications'
    AND COLUMN_NAME = 'farm_id');

SET @ddl := IF(@hasFarmId = 0,
  'ALTER TABLE `notifications` ADD COLUMN `farm_id` BIGINT UNSIGNED NULL AFTER `notification_id`, ADD KEY `idx_notifications_farm` (`farm_id`)',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 7. Required role names (requirement §7).
--    Existing roles are PRESERVED untouched. The six required display names
--    are added so the application can address them directly.
--    `users` has 0 rows, so no FK references any new role yet.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO `roles` (`name`, `description`, `status`) VALUES
  ('Owner',        'Full farm and company ownership', 'ACTIVE'),
  ('Manager',      'Operational management access',   'ACTIVE'),
  ('Veterinarian', 'Animal health and breeding',      'ACTIVE'),
  ('Feed Manager', 'Feed and inventory management',   'ACTIVE'),
  ('Worker',       'Limited data entry',              'ACTIVE'),
  ('Accountant',   'Financial modules',               'ACTIVE');

-- ---------------------------------------------------------------------------
-- 8. Disease reference data (0 rows today). Used by health records.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO `diseases` (`farm_id`, `disease_code`, `disease_name`, `description`, `is_active`)
SELECT `farm_id`, 'MAST', 'Mastitis', 'Mammary gland inflammation', 1 FROM `farms`;
INSERT IGNORE INTO `diseases` (`farm_id`, `disease_code`, `disease_name`, `description`, `is_active`)
SELECT `farm_id`, 'FMD',  'Foot and Mouth Disease', 'Viral cloven-hoof disease', 1 FROM `farms`;
INSERT IGNORE INTO `diseases` (`farm_id`, `disease_code`, `disease_name`, `description`, `is_active`)
SELECT `farm_id`, 'DIAR', 'Diarrhoea', 'Digestive disorder / scours', 1 FROM `farms`;
INSERT IGNORE INTO `diseases` (`farm_id`, `disease_code`, `disease_name`, `description`, `is_active`)
SELECT `farm_id`, 'PNEU', 'Pneumonia', 'Respiratory infection', 1 FROM `farms`;
INSERT IGNORE INTO `diseases` (`farm_id`, `disease_code`, `disease_name`, `description`, `is_active`)
SELECT `farm_id`, 'KETO', 'Ketosis', 'Metabolic disorder', 1 FROM `farms`;
INSERT IGNORE INTO `diseases` (`farm_id`, `disease_code`, `disease_name`, `description`, `is_active`)
SELECT `farm_id`, 'MF',   'Milk Fever', 'Hypocalcaemia', 1 FROM `farms`;
INSERT IGNORE INTO `diseases` (`farm_id`, `disease_code`, `disease_name`, `description`, `is_active`)
SELECT `farm_id`, 'METR', 'Metritis', 'Uterine inflammation', 1 FROM `farms`;
INSERT IGNORE INTO `diseases` (`farm_id`, `disease_code`, `disease_name`, `description`, `is_active`)
SELECT `farm_id`, 'LAME', 'Lameness', 'Mobility disorder', 1 FROM `farms`;

-- ===========================================================================
-- END OF ADDITIVE RECONCILIATION
-- No existing data was dropped, truncated, or modified.
-- ===========================================================================

  `name`        VARCHAR(150)    NOT NULL,
  `key_prefix`  VARCHAR(16)     NOT NULL,
  `key_hash`    VARCHAR(64)     NOT NULL,
  `scopes`      VARCHAR(500)    NULL,
  `expires_at`  DATETIME        NULL,
  `revoked_at`  DATETIME        NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`api_key_id`),
  UNIQUE KEY `uq_api_keys_hash` (`key_hash`),
  KEY `idx_api_keys_farm` (`farm_id`),
  CONSTRAINT `fk_api_keys_farm` FOREIGN KEY (`farm_id`)
    REFERENCES `farms` (`farm_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

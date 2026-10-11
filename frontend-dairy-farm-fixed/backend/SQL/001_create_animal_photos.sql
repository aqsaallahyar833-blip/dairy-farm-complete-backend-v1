-- ===========================================================================
-- Phase 2A - animal_photos table
-- Database : Dairy Farm 1   (MySQL 8.0)
-- Purpose  : LONGBLOB photo storage for animals.
--
-- WHY THIS TABLE IS NEEDED
--   `animals.photo` is varchar(500). A base64 data URL is roughly 4/3 the size
--   of the raw bytes, so even a small thumbnail is ~2 KB and a realistic
--   1200px JPEG is 150-400 KB. Neither can ever fit in 500 characters.
--   `animals.photo` is RETAINED, unchanged, for backward compatibility - it is
--   simply no longer used to hold image data.
--
-- SAFETY NOTES
--   * This script only CREATES. It never drops, alters or truncates anything.
--   * `animals` is not touched. No existing table is modified.
--   * Safe to re-run: IF NOT EXISTS.
--   * This is applied EXPLICITLY by a human. The application never runs
--     EnsureCreated() or Migrate(), and never executes DDL at startup.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Pre-flight verification (read-only; run these BEFORE the CREATE below).
-- ---------------------------------------------------------------------------

-- 1. Confirm the target table does not already exist. Expect 0 rows.
-- SELECT TABLE_NAME FROM information_schema.TABLES
--  WHERE TABLE_SCHEMA = 'dairy farm 1' AND TABLE_NAME = 'animal_photos';

-- 2. Confirm both FK targets exist with the expected column types.
--    Expect animal_id / user_id to be bigint unsigned.
-- SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
--  FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'dairy farm 1'
--    AND ((TABLE_NAME = 'animals' AND COLUMN_NAME = 'animal_id')
--      OR (TABLE_NAME = 'users'   AND COLUMN_NAME = 'user_id'));

-- 3. Confirm engine and charset match the rest of the schema.
-- SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES
--  WHERE TABLE_SCHEMA = 'dairy farm 1' AND TABLE_NAME IN ('animals','users');

-- ---------------------------------------------------------------------------
-- The migration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `animal_photos` (
    `photo_id`    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `animal_id`   BIGINT UNSIGNED NOT NULL,
    `image_data`  LONGBLOB        NOT NULL,
    `file_type`   VARCHAR(50)     NOT NULL,
    `file_size`   INT UNSIGNED    NOT NULL,
    `is_primary`  TINYINT(1)      NOT NULL DEFAULT 0,
    `uploaded_by` BIGINT UNSIGNED NULL,
    `uploaded_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`photo_id`),

    KEY `idx_animal_photos_animal` (`animal_id`),

    CONSTRAINT `fk_animal_photos_animal`
        FOREIGN KEY (`animal_id`) REFERENCES `animals` (`animal_id`),

    CONSTRAINT `fk_animal_photos_user`
        FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Post-apply verification.
-- ---------------------------------------------------------------------------

-- 4. Confirm the table exists with the expected columns.
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
--  FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'dairy farm 1' AND TABLE_NAME = 'animal_photos'
--  ORDER BY ORDINAL_POSITION;

-- 5. Confirm `animals` was NOT altered. Expect photo to still be varchar(500).
-- SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'dairy farm 1' AND TABLE_NAME = 'animals' AND COLUMN_NAME = 'photo';

-- 6. Confirm the no-delete trigger is still present.
-- SELECT TRIGGER_NAME FROM information_schema.TRIGGERS
--  WHERE TRIGGER_SCHEMA = 'dairy farm 1' AND TRIGGER_NAME = 'trg_animals_no_delete';

-- ===========================================================================
-- NOT INCLUDED IN THIS SCRIPT (deliberately)
--
--   A UNIQUE constraint on `animal_identifications`. The Phase 2A inspection
--   found that table currently holds 0 rows, so adding
--       UNIQUE (type, value)
--   would be safe today, but it is a schema change to an EXISTING table and is
--   therefore reported separately for explicit approval rather than applied
--   here. Until it is approved, application-level duplicate detection in
--   AnimalWriteService / AnimalQrService is the enforcement point.
-- ===========================================================================

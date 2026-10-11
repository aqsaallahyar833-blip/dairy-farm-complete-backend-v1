-- ===========================================================================
-- PHASE 2 — ADDITIVE COLUMN CORRECTIONS FOR `dairy_farm`
-- ===========================================================================
-- Discovered while mapping the EF entities to the live schema. Each column
-- below is REQUIRED by Version 1.0 but absent from the live table.
-- All statements are additive and idemp guarded. No existing data is touched.
-- `milk_records` currently holds 0 rows, so there is nothing to migrate.
-- ===========================================================================

USE `dairy_farm`;

-- ---------------------------------------------------------------------------
-- milk_records.is_rejected + rejection_reason
--   Requirement 5 ("Rejected milk") and requirement 11 (medicine withdrawal
--   must flag milk as unsaleable) cannot be represented without these.
-- ---------------------------------------------------------------------------
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA='dairy_farm' AND TABLE_NAME='milk_records'
             AND COLUMN_NAME='is_rejected');
SET @s := IF(@c=0,
  'ALTER TABLE `milk_records`
     ADD COLUMN `is_rejected` TINYINT(1) NOT NULL DEFAULT 0 AFTER `scc`,
     ADD COLUMN `rejection_reason` VARCHAR(255) NULL AFTER `is_rejected`',
  'SELECT ''milk_records rejection columns already present''');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------------
-- animals.lactation_number
--   Requirement 6 needs a lactation number on the animal, not only in the
--   `lactations` table, so the animal list and dashboard can show it.
-- ---------------------------------------------------------------------------
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA='dairy_farm' AND TABLE_NAME='animals'
             AND COLUMN_NAME='lactation_number');
SET @s := IF(@c=0,
  'ALTER TABLE `animals` ADD COLUMN `lactation_number` INT NULL AFTER `status`',
  'SELECT ''animals.lactation_number already present''');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------------
-- animals.death_date
--   Requirement 18 (mortality) keeps the animal row for history and records
--   when it died, so dead animals drop out of active counts but remain
--   queryable.
-- ---------------------------------------------------------------------------
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA='dairy_farm' AND TABLE_NAME='animals'
             AND COLUMN_NAME='death_date');
SET @s := IF(@c=0,
  'ALTER TABLE `animals` ADD COLUMN `death_date` DATE NULL AFTER `lactation_number`',
  'SELECT ''animals.death_date already present''');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- --------------------------------------------------------------------------
-- Uniqueness guarantees required by requirement 36
--   "Duplicate Animal ID prevention": animal_code unique per farm, and an
--   ear tag must not be attached to two different animals.
--   Both columns are already populated, so a duplicate would abort the
--   ALTER. The pre-check below reports instead of silently failing.
-- --------------------------------------------------------------------------
SELECT 'dupe_animal_code' AS check_name, farm_id, animal_code, COUNT(*) AS n
  FROM `animals` GROUP BY farm_id, animal_code HAVING COUNT(*) > 1;

SELECT 'dupe_tag_number' AS check_name, farm_id, tag_number, COUNT(*) AS n
  FROM `animals`
 WHERE tag_number IS NOT NULL AND tag_number <> ''
 GROUP BY farm_id, tag_number HAVING COUNT(*) > 1;

-- ===========================================================================
-- END
-- ===========================================================================

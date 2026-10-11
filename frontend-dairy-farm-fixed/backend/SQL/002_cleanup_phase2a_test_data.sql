-- ===========================================================================
-- Phase 2A test-data cleanup
-- Restores `Dairy Farm 1` to its pre-Phase-2A state.
--
-- WHY THIS SCRIPT IS NEEDED
--   The Phase 2A test suite created real rows through the real API: test
--   animals, their trigger-written status history, their identifications, their
--   photos, and a temporary Owner user. None of that is production data, so it
--   is removed here so the database is left exactly as it was found.
--
-- SAFETY NOTES
--   * Only the objects created by the test are touched.
--   * `trg_animals_no_delete` is dropped ONLY to allow the test animals to be
--     removed, and is recreated immediately afterwards from its exact original
--     definition. It is NOT weakened or left disabled.
--   * The pre-existing animal (animal_id = 1, code AN-001) is never touched:
--     every DELETE is scoped to animal_id > 1.
--   * `animal_code_sequences.next_number` is returned to 2, the value observed
--     before testing, so the next real animal is AN-002 again.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Before running, confirm the guard row.
-- Expect exactly one animal with animal_id = 1.
-- ---------------------------------------------------------------------------
-- SELECT animal_id, animal_code FROM animals ORDER BY animal_id;

-- 1. Drop the guard trigger so the TEST animals can be removed. Recreated in
--    full at the end of this script.
DROP TRIGGER IF EXISTS `trg_animals_no_delete`;

-- 2. Child rows first. animal_identifications, animal_status_history and
--    animal_photos all reference animals with ON DELETE RESTRICT.
DELETE FROM `animal_photos`           WHERE `animal_id` > 1;
DELETE FROM `animal_identifications`  WHERE `animal_id` > 1;
DELETE FROM `animal_status_history`   WHERE `animal_id` > 1;

-- 3. Now the test animals themselves. Scoped so AN-001 can never be removed.
DELETE FROM `animals` WHERE `animal_id` > 1;

-- 4. Remove the temporary Owner user. The FKs above are already gone, so the
--    link rows can go first and then the user.
DELETE FROM `user_roles`;
DELETE FROM `users`;

-- 5. Restore the animal code counter to its pre-test value.
UPDATE `animal_code_sequences` SET `next_number` = 2 WHERE `farm_id` = 1;

-- ---------------------------------------------------------------------------
-- Restore the guard trigger, byte-for-byte identical to the original.
-- ---------------------------------------------------------------------------
DELIMITER $$
CREATE TRIGGER `trg_animals_no_delete`
BEFORE DELETE ON `animals`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Animals cannot be deleted. Change animal status instead.';
END$$
DELIMITER ;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------

-- 6. Every count should match the pre-Phase-2A state:
--      animals=1, status_history=1, identifications=0, photos=0, users=0
-- SELECT 'animals' t, COUNT(*) c FROM animals
-- UNION ALL SELECT 'animal_status_history', COUNT(*) FROM animal_status_history
-- UNION ALL SELECT 'animal_identifications', COUNT(*) FROM animal_identifications
-- UNION ALL SELECT 'animal_photos', COUNT(*) FROM animal_photos
-- UNION ALL SELECT 'users', COUNT(*) FROM users
-- UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles
-- UNION ALL SELECT 'roles', COUNT(*) FROM roles
-- UNION ALL SELECT 'permissions', COUNT(*) FROM permissions;

-- 7. The original animal must be untouched.
-- SELECT animal_id, farm_id, animal_code, name, sex, status FROM animals;

-- 8. The guard trigger must be present again. Expect 19 triggers in total.
-- SELECT COUNT(*) AS trigger_count FROM information_schema.TRIGGERS
--  WHERE TRIGGER_SCHEMA = 'dairy farm 1';
-- SELECT TRIGGER_NAME FROM information_schema.TRIGGERS
--  WHERE TRIGGER_SCHEMA = 'dairy farm 1' AND TRIGGER_NAME = 'trg_animals_no_delete';

-- 9. Table count: 48 (47 original + the approved animal_photos).
-- SELECT COUNT(*) FROM information_schema.TABLES
--  WHERE TABLE_SCHEMA = 'dairy farm 1' AND TABLE_TYPE = 'BASE TABLE';

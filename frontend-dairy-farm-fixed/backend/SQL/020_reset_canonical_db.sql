SET FOREIGN_KEY_CHECKS = 0;
USE `dairy farm 1`;

DROP VIEW IF EXISTS vw_daily_milk_summary, vw_active_herd_summary,
                     vw_upcoming_calvings, vw_active_withdrawals;

-- Drop every remaining table in this schema. The schema is confirmed empty,
-- so nothing is lost. `dairy_farm` is NOT touched.
SET @ddl := (
  SELECT GROUP_CONCAT(CONCAT('DROP TABLE IF EXISTS `', TABLE_NAME, '`')
                     ORDER BY TABLE_NAME SEPARATOR '; ')
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = 'dairy farm 1' AND TABLE_TYPE = 'BASE TABLE'
);
SET @ddl := IF(@ddl IS NULL, 'SELECT 1', @ddl);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

SELECT COUNT(*) AS remaining_tables
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = 'dairy farm 1' AND TABLE_TYPE = 'BASE TABLE';

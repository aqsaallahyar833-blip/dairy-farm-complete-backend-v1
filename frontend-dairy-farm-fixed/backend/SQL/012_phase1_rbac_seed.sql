-- ===========================================================================
-- PHASE 1 (continued) — RBAC PERMISSION GRANTS
-- ===========================================================================
-- `permissions` already held 28 rows and `role_permissions` held 39 rows, but
-- only ADMIN (28) and VIEWER (11) had ANY grants. MANAGER, VETERINARIAN,
-- FARM_WORKER and ACCOUNTANT had ZERO permissions, so RBAC could never work.
--
-- This script grants each required role the permissions appropriate to it.
-- It is ADDITIVE: INSERT IGNORE never removes an existing grant.
-- ===========================================================================

USE `dairy_farm`;

-- ---------------------------------------------------------------------------
-- Role ids actually present after 011 (case-insensitive unique on name):
--   1 ADMIN          2 MANAGER         3 VETERINARIAN   4 FARM_WORKER
--   5 ACCOUNTANT     6 VIEWER          7 Owner          8 Feed Manager
--   9 Worker
--
-- Canonical application roles and their resolved ids:
--   Owner -> 7   Manager -> 2   Veterinarian -> 3
--   Feed Manager -> 8   Worker -> 9   Accountant -> 5
-- ---------------------------------------------------------------------------

-- OWNER (role 7): every permission.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 7, `permission_id` FROM `permissions`;

-- MANAGER (role 2): everything except user admin and settings admin.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 2, `permission_id` FROM `permissions`
 WHERE `name` NOT IN ('users.manage', 'settings.manage');

-- VETERINARIAN (role 3): animals, breeding, health, treatments, tasks, reports,
-- read access to milk and feed.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 3, `permission_id` FROM `permissions`
 WHERE `name` IN (
   'animals.view','animals.create','animals.update',
   'breeding.view','breeding.create','breeding.update',
   'health.view','health.create','health.update',
   'milk.view','feed.view','inventory.view',
   'tasks.view','tasks.manage','reports.view','settings.view'
 );

-- FEED MANAGER (role 8): feed + inventory + tasks + reports + read-only animals.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 8, `permission_id` FROM `permissions`
 WHERE `name` IN (
   'feed.view','feed.manage','inventory.view','inventory.manage',
   'animals.view','tasks.view','tasks.manage','reports.view','settings.view'
 );

-- WORKER (role 9): data entry only. No deletes, no finance, no settings.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 9, `permission_id` FROM `permissions`
 WHERE `name` IN (
   'animals.view','animals.create','animals.update',
   'milk.view','milk.create',
   'health.view','health.create',
   'breeding.view','breeding.create',
   'feed.view','inventory.view',
   'tasks.view','tasks.manage'
 );

-- ACCOUNTANT (role 5): finance, reports, read-only inventory/milk/settings.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 5, `permission_id` FROM `permissions`
 WHERE `name` IN (
   'finance.view','finance.create','finance.update',
   'reports.view','inventory.view','milk.view',
   'tasks.view','settings.view'
 );

-- ===========================================================================
-- END
-- ===========================================================================

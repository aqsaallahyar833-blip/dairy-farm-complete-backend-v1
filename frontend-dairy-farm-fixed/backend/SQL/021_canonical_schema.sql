-- ===========================================================================
-- 021 - CANONICAL APPLICATION SCHEMA  (`dairy farm 1`)
-- ===========================================================================
-- COMPLETE. Sections 1-12. This file may now be applied.
--
-- SECTION MAP
--   S1  companies, farms, sheds, animal_groups, breeds
--   S2  roles, permissions, role_permissions, users, farm_user_access,
--       user_sessions, api_keys
--   S3  animals, animal_status_history, animal_photos, animal_code_sequences
--   S4  lactations, milk_records, milk_buyers, milk_sales
--   S5  breeding_events, pregnancies, calvings, calves
--   S6  diseases, medicines, health_records, treatments, vaccination_records
--   S7  suppliers, feed_items, feed_transactions, ration_plans,
--       ration_plan_items, feed_consumptions, inventory_items,
--       inventory_transactions
--   S8  animal_purchases, animal_sales, animal_mortalities
--   S9  finance_categories, finance_transactions
--   S10 tasks, alerts, notifications
--   S11 attachments, audit_logs, system_settings, farm_settings
--   S12 seed: roles, permissions, role_permissions, breeds, diseases,
--       system_settings (reference/config only, no operational rows)
--
-- DESIGN RATIONALE (Version 1.0 requirements + concepts proven in the real
-- `dairy_farm` source database, which is READ-ONLY and untouched):
--   * Milk is stored as SESSION ROWS (MORNING/EVENING/THIRD). There are no
--     morning_milk / evening_milk / total_milk columns. Daily totals are
--     derived with SUM(), so a future 4th session needs no migration.
--     uq_milk_animal_date_session makes a duplicate submission impossible.
--   * Finance is ONE ledger (`finance_transactions`) typed INCOME / EXPENSE
--     with reusable categories. No competing income/expense tables, so a
--     balance can never disagree with itself.
--   * Customers are `milk_buyers`. Suppliers stay a separate party table.
--   * Medicines/diseases are MASTER lists; treatment courses and withdrawal
--     dates live on `treatments`.
--   * Stock is a TRANSACTION LEDGER, so closing stock = SUM(quantity) and
--     the audit trail survives any edit.
--   * `alerts` is the event source; `notifications` are its user delivery,
--     carrying reference_type/reference_id for click-through.
--   * Exactly six roles, one spelling each, under a case-insensitive UNIQUE
--     key, so MANAGER/Manager duplicates are impossible.
--   * `audit_logs.user_id` is ON DELETE SET NULL: removing a user must never
--     erase the evidence of what they did.
--   * `animal_mortalities.animal_id` is ON DELETE RESTRICT: history is kept.
--
-- SAFETY: this script only ever issues `USE `dairy farm 1`` and then CREATE
-- / INSERT. It contains no DROP, TRUNCATE, DELETE or ALTER, and the string
-- `dairy_farm` appears only in these comments. The populated source database
-- is never referenced by any statement.
-- ===========================================================================

SET NAMES utf8mb4;
USE `dairy farm 1`;

-- SECTION 1 -- ORGANISATION -----------------------------------------------

CREATE TABLE companies (
  company_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(200) NOT NULL,
  contact    VARCHAR(255) NULL,
  address    VARCHAR(500) NULL,
  status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE farms (
  farm_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(150) NOT NULL,
  code       VARCHAR(50)  NULL,
  location   VARCHAR(255) NULL,
  contact    VARCHAR(255) NULL,
  status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (farm_id),
  UNIQUE KEY uq_farms_code (code),
  KEY idx_farms_company (company_id),
  CONSTRAINT fk_farms_company FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sheds (
  shed_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id    BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(150) NOT NULL,
  capacity   INT UNSIGNED NULL,
  notes      TEXT NULL,
  status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (shed_id),
  UNIQUE KEY uq_sheds_farm_name (farm_id, name),
  KEY idx_sheds_farm (farm_id),
  CONSTRAINT fk_sheds_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE animal_groups (
  group_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id     BIGINT UNSIGNED NOT NULL,
  shed_id     BIGINT UNSIGNED NULL,
  name        VARCHAR(150) NOT NULL,
  animal_type VARCHAR(50)  NOT NULL DEFAULT 'COW',
  description TEXT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id),
  UNIQUE KEY uq_groups_farm_name (farm_id, name),
  KEY idx_groups_farm (farm_id),
  KEY idx_groups_shed (shed_id),
  CONSTRAINT fk_groups_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_groups_shed FOREIGN KEY (shed_id) REFERENCES sheds (shed_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE breeds (
  breed_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (breed_id),
  UNIQUE KEY uq_breeds_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- SECTION 2 -- IDENTITY, RBAC AND FARM SCOPE ------------------------------

CREATE TABLE roles (
  role_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(50)  NOT NULL,
  description VARCHAR(255) NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
  permission_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL COMMENT 'module.action, e.g. animals.view',
  module        VARCHAR(50)  NOT NULL,
  description   VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (permission_id),
  UNIQUE KEY uq_permissions_name (name),
  KEY idx_permissions_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  KEY idx_rp_permission (permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles (role_id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions (permission_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  user_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id       BIGINT UNSIGNED NOT NULL,
  role_id       BIGINT UNSIGNED NOT NULL,
  username      VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'PBKDF2, ASP.NET Core PasswordHasher',
  full_name     VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NULL,
  phone         VARCHAR(50)  NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  last_login_at DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_farm (farm_id),
  KEY idx_users_role (role_id),
  CONSTRAINT fk_users_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (role_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cross-farm grants checked on every request so a user cannot reach another
-- farm by changing an id in the URL.
CREATE TABLE farm_user_access (
  user_id      BIGINT UNSIGNED NOT NULL,
  farm_id      BIGINT UNSIGNED NOT NULL,
  access_level VARCHAR(20)  NOT NULL DEFAULT 'VIEW',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, farm_id),
  KEY idx_fua_farm (farm_id),
  CONSTRAINT fk_fua_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_fua_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_sessions (
  session_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  session_token VARCHAR(128) NOT NULL,
  expires_at    DATETIME NOT NULL,
  revoked_at    DATETIME NULL,
  ip_address    VARCHAR(64)  NULL,
  user_agent    VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id),
  UNIQUE KEY uq_sessions_token (session_token),
  KEY idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE api_keys (
  api_key_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NULL,
  name       VARCHAR(150) NOT NULL,
  key_prefix VARCHAR(16)  NOT NULL,
  key_hash   VARCHAR(64)  NOT NULL COMMENT 'SHA-256; raw key shown once only',
  scopes     VARCHAR(500) NULL,
  expires_at DATETIME NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (api_key_id),
  UNIQUE KEY uq_api_keys_hash (key_hash),
  KEY idx_api_keys_farm (farm_id),
  CONSTRAINT fk_api_keys_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SECTION 3 -- ANIMALS ----------------------------------------------------

CREATE TABLE animals (
  animal_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id          BIGINT UNSIGNED NOT NULL,
  shed_id          BIGINT UNSIGNED NULL,
  group_id         BIGINT UNSIGNED NULL,
  dam_id           BIGINT UNSIGNED NULL,
  sire_id          BIGINT UNSIGNED NULL,
  breed_id         BIGINT UNSIGNED NULL,
  animal_code      VARCHAR(50) NOT NULL COMMENT 'Permanent animal ID, e.g. AN-001',
  name             VARCHAR(150) NULL,
  tag_number       VARCHAR(50)  NULL COMMENT 'Ear tag',
  rfid_number      VARCHAR(50)  NULL COMMENT 'RFID',
  qr_token         VARCHAR(64)  NULL COMMENT 'Resolved by GET /api/animals/qr/{token}',
  sex              ENUM('MALE','FEMALE') NOT NULL,
  date_of_birth    DATE NULL,
  color            VARCHAR(100) NULL COMMENT 'Colour / markings',
  status           ENUM('ACTIVE','LACTATING','DRY','PREGNANT','OPEN','SICK',
                       'QUARANTINE','SOLD','DEAD','CALF','HEIFER','BULL') NOT NULL DEFAULT 'ACTIVE',
  lactation_number INT NULL,
  source           VARCHAR(100) NULL COMMENT 'Birth / Purchased / Transferred',
  acquisition_date DATE NULL,
  purchase_price   DECIMAL(14,2) NULL,
  photo_url        VARCHAR(500) NULL COMMENT 'API path; bytes live in animal_photos',
  death_date       DATE NULL,
  notes            TEXT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (animal_id),
  -- Requirement 36: a permanent animal ID can never be duplicated on a farm.
  UNIQUE KEY uq_animals_farm_code (farm_id, animal_code),
  UNIQUE KEY uq_animals_qr_token (qr_token),
  KEY idx_animals_farm (farm_id),
  KEY idx_animals_status (status),
  KEY idx_animals_group (group_id),
  KEY idx_animals_shed (shed_id),
  KEY idx_animals_tag (tag_number),
  KEY idx_animals_rfid (rfid_number),
  CONSTRAINT fk_animals_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_animals_shed FOREIGN KEY (shed_id) REFERENCES sheds (shed_id) ON DELETE SET NULL,
  CONSTRAINT fk_animals_group FOREIGN KEY (group_id) REFERENCES animal_groups (group_id) ON DELETE SET NULL,
  CONSTRAINT fk_animals_breed FOREIGN KEY (breed_id) REFERENCES breeds (breed_id) ON DELETE SET NULL,
  CONSTRAINT fk_animals_dam FOREIGN KEY (dam_id) REFERENCES animals (animal_id) ON DELETE SET NULL,
  CONSTRAINT fk_animals_sire FOREIGN KEY (sire_id) REFERENCES animals (animal_id) ON DELETE SET NULL,
  CONSTRAINT ck_animals_price CHECK (purchase_price IS NULL OR purchase_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE animal_status_history (
  status_history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  animal_id        BIGINT UNSIGNED NOT NULL,
  old_status       VARCHAR(20) NULL,
  new_status       VARCHAR(20) NOT NULL,
  effective_date   DATE NOT NULL,
  reason           VARCHAR(500) NULL,
  changed_by       BIGINT UNSIGNED NULL,
  notes            TEXT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (status_history_id),
  KEY idx_ash_animal (animal_id),
  KEY idx_ash_date (effective_date),
  CONSTRAINT fk_ash_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE animal_photos (
  photo_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  animal_id    BIGINT UNSIGNED NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  file_size    BIGINT NOT NULL,
  image_data   LONGBLOB NOT NULL,
  is_primary   TINYINT(1) NOT NULL DEFAULT 0,
  uploaded_by  BIGINT UNSIGNED NULL,
  uploaded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (photo_id),
  KEY idx_photos_animal (animal_id),
  CONSTRAINT fk_photos_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Row-locked during allocation so two concurrent creates can never receive
-- the same animal number.
CREATE TABLE animal_code_sequences (
  farm_id     BIGINT UNSIGNED NOT NULL,
  prefix      VARCHAR(20) NOT NULL DEFAULT 'AN-',
  next_number BIGINT UNSIGNED NOT NULL DEFAULT 1,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (farm_id),
  CONSTRAINT fk_acs_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SECTION 4 -- MILK -------------------------------------------------------
-- Session based. ONE row per (animal, date, session). There are deliberately
-- no morning_milk / evening_milk / total_milk columns: the daily total is
-- derived with SUM(milk_liters) grouped by animal+date, so a future 4th
-- session needs no schema change.

CREATE TABLE lactations (
  lactation_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  animal_id        BIGINT UNSIGNED NOT NULL,
  lactation_number INT NOT NULL,
  start_date       DATE NULL,
  dry_off_date     DATE NULL,
  peak_milk_liters DECIMAL(8,2) NULL,
  peak_date        DATE NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  notes            TEXT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (lactation_id),
  UNIQUE KEY uq_lactations_animal_no (animal_id, lactation_number),
  KEY idx_lactations_status (status),
  CONSTRAINT fk_lactations_animal FOREIGN KEY (animal_id)
    REFERENCES animals (animal_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE milk_records (
  milk_record_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id          BIGINT UNSIGNED NOT NULL,
  animal_id        BIGINT UNSIGNED NOT NULL,
  lactation_id     BIGINT UNSIGNED NULL,
  record_date      DATE NOT NULL,
  session          ENUM('MORNING','EVENING','THIRD') NOT NULL,
  milk_liters      DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  fat_percent      DECIMAL(5,2) NULL,
  protein_percent  DECIMAL(5,2) NULL,
  snf_percent      DECIMAL(5,2) NULL,
  scc              DECIMAL(10,2) NULL,
  is_rejected      TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Withdrawal / treated milk',
  rejection_reason VARCHAR(255) NULL,
  notes            TEXT NULL,
  created_by       BIGINT UNSIGNED NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (milk_record_id),
  -- One row per session per animal per day: a duplicate submission is rejected
  -- by the database rather than silently double-counting production.
  UNIQUE KEY uq_milk_animal_date_session (animal_id, record_date, session),
  KEY idx_milk_farm_date (farm_id, record_date),
  KEY idx_milk_animal_date (animal_id, record_date),
  CONSTRAINT fk_milk_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_milk_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_milk_lactation FOREIGN KEY (lactation_id)
    REFERENCES lactations (lactation_id) ON DELETE SET NULL,
  CONSTRAINT ck_milk_liters CHECK (milk_liters >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers are the buyers of milk.
CREATE TABLE milk_buyers (
  buyer_id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id             BIGINT UNSIGNED NOT NULL,
  name                VARCHAR(150) NOT NULL,
  contact_person      VARCHAR(150) NULL,
  phone               VARCHAR(50)  NULL,
  email               VARCHAR(150) NULL,
  address             VARCHAR(255) NULL,
  buyer_type          VARCHAR(30)  NOT NULL DEFAULT 'LOCAL_SHOP',
  daily_quantity_liters DECIMAL(10,2) NULL,
  rate_per_liter      DECIMAL(10,2) NULL,
  credit_period_days  INT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  notes               TEXT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (buyer_id),
  KEY idx_buyers_farm (farm_id),
  KEY idx_buyers_status (status),
  CONSTRAINT fk_buyers_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE milk_sales (
  milk_sale_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id            BIGINT UNSIGNED NOT NULL,
  buyer_id           BIGINT UNSIGNED NOT NULL,
  sale_date          DATE NOT NULL,
  milk_quantity_liters DECIMAL(10,2) NOT NULL,
  price_per_liter    DECIMAL(10,2) NOT NULL,
  total_amount       DECIMAL(14,2) NOT NULL,
  payment_method     VARCHAR(20) NOT NULL DEFAULT 'CASH',
  payment_status     VARCHAR(20) NOT NULL DEFAULT 'PAID',
  amount_paid        DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  amount_due         DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  reference_number   VARCHAR(100) NULL,
  notes              TEXT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (milk_sale_id),
  KEY idx_milk_sales_farm_date (farm_id, sale_date),
  KEY idx_milk_sales_buyer (buyer_id),
  KEY idx_milk_sales_status (payment_status),
  CONSTRAINT fk_milk_sales_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_milk_sales_buyer FOREIGN KEY (buyer_id) REFERENCES milk_buyers (buyer_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SECTION 5 -- REPRODUCTION -----------------------------------------------
-- Heat / AI / natural service and pregnancy checks all live in
-- `breeding_events` (no competing "heat table"). `pregnancies` holds the
-- confirmed pregnancy with its expected calving date.

CREATE TABLE breeding_events (
  breeding_event_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id             BIGINT UNSIGNED NOT NULL,
  animal_id           BIGINT UNSIGNED NOT NULL COMMENT 'The female (dam)',
  service_animal_id   BIGINT UNSIGNED NULL COMMENT 'The bull / sire, if AI or natural',
  event_type          ENUM('HEAT','AI','NATURAL_SERVICE','OBSERVATION','PREGNANCY_CHECK') NOT NULL,
  event_date          DATE NOT NULL,
  service_number      INT NULL COMMENT 'Lactation service number',
  technician_name     VARCHAR(150) NULL,
  semen_bull          VARCHAR(150) NULL COMMENT 'Bull name / semen straw used',
  semen_batch         VARCHAR(100) NULL,
  pregnancy_result    VARCHAR(30) NULL COMMENT 'For PREGNANCY_CHECK: PREGNANT / NOT_PREGNANT',
  expected_calving_date DATE NULL,
  calving_date        DATE NULL,
  notes               TEXT NULL,
  created_by          BIGINT UNSIGNED NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (breeding_event_id),
  KEY idx_breed_farm_date (farm_id, event_date),
  KEY idx_breed_animal_date (animal_id, event_date),
  KEY idx_breed_type (event_type),
  CONSTRAINT fk_breed_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_breed_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_breed_service_animal FOREIGN KEY (service_animal_id)
    REFERENCES animals (animal_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pregnancies (
  pregnancy_id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id              BIGINT UNSIGNED NOT NULL,
  animal_id            BIGINT UNSIGNED NOT NULL,
  breeding_event_id    BIGINT UNSIGNED NULL,
  conception_date      DATE NULL,
  confirmation_date    DATE NULL,
  expected_calving_date DATE NULL,
  actual_calving_date  DATE NULL,
  status               ENUM('CONFIRMED','NOT_PREGNANT','ABORTED','CALVED') NOT NULL DEFAULT 'CONFIRMED',
  calf_count           INT NULL,
  notes                TEXT NULL,
  created_by           BIGINT UNSIGNED NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (pregnancy_id),
  KEY idx_preg_farm_status (farm_id, status),
  KEY idx_preg_animal (animal_id),
  KEY idx_preg_expected (expected_calving_date),
  CONSTRAINT fk_preg_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_preg_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_preg_event FOREIGN KEY (breeding_event_id)
    REFERENCES breeding_events (breeding_event_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE calvings (
  calving_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id         BIGINT UNSIGNED NOT NULL,
  animal_id       BIGINT UNSIGNED NOT NULL COMMENT 'The dam',
  pregnancy_id    BIGINT UNSIGNED NULL,
  calving_date    DATE NOT NULL,
  calving_type    ENUM('EASY','NORMAL','HARD','ASSISTED','DYSTOCIA') NOT NULL DEFAULT 'NORMAL',
  calf_count      INT NOT NULL DEFAULT 1,
  live_calf_count INT NULL,
  dead_calf_count INT NULL,
  calving_status  VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  veterinarian_name VARCHAR(150) NULL,
  colostrum_given TINYINT(1) NOT NULL DEFAULT 0,
  colostrum_time_hours DECIMAL(5,2) NULL,
  complications   TEXT NULL,
  notes           TEXT NULL,
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (calving_id),
  KEY idx_calvings_farm_date (farm_id, calving_date),
  KEY idx_calvings_animal (animal_id),
  CONSTRAINT fk_calvings_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_calvings_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_calvings_pregnancy FOREIGN KEY (pregnancy_id)
    REFERENCES pregnancies (pregnancy_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per calf. `calf_animal_id` links to the auto-created `animals` row
-- when the calf was registered (requirement 8: automatic calf creation).
CREATE TABLE calves (
  calf_id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id               BIGINT UNSIGNED NOT NULL,
  calving_id            BIGINT UNSIGNED NULL,
  calf_animal_id        BIGINT UNSIGNED NULL,
  dam_id                BIGINT UNSIGNED NULL,
  sire_id               BIGINT UNSIGNED NULL,
  calf_number           VARCHAR(50) NULL,
  birth_date            DATE NOT NULL,
  sex                   ENUM('MALE','FEMALE') NOT NULL,
  birth_weight_kg       DECIMAL(8,2) NULL,
  colostrum_received    TINYINT(1) NOT NULL DEFAULT 0,
  colostrum_time_hours  DECIMAL(5,2) NULL,
  health_status         VARCHAR(30) NULL,
  outcome               ENUM('ALIVE','STILLBORN','DIED') NOT NULL DEFAULT 'ALIVE',
  notes                 TEXT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (calf_id),
  UNIQUE KEY uq_calves_number (farm_id, calf_number),
  KEY idx_calves_calving (calving_id),
  KEY idx_calves_animal (calf_animal_id),
  CONSTRAINT fk_calves_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_calves_calving FOREIGN KEY (calving_id)
    REFERENCES calvings (calving_id) ON DELETE CASCADE,
  CONSTRAINT fk_calves_animal FOREIGN KEY (calf_animal_id)
    REFERENCES animals (animal_id) ON DELETE SET NULL,
  CONSTRAINT fk_calves_dam FOREIGN KEY (dam_id) REFERENCES animals (animal_id) ON DELETE SET NULL,
  CONSTRAINT fk_calves_sire FOREIGN KEY (sire_id) REFERENCES animals (animal_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SECTION 6 -- HEALTH -----------------------------------------------------
-- `diseases` and `medicines` are MASTER lists. `health_records` is the
-- clinical event, `treatments` the prescribed course. Withdrawal dates are
-- derived from the medicine and stored so the milk hold is queryable
-- without a runtime join.

CREATE TABLE diseases (
  disease_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  code        VARCHAR(50)  NULL,
  description TEXT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (disease_id),
  UNIQUE KEY uq_diseases_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medicines (
  medicine_id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                  VARCHAR(150) NOT NULL,
  code                  VARCHAR(50)  NULL,
  manufacturer          VARCHAR(150) NULL,
  active_ingredient     VARCHAR(150) NULL,
  strength              VARCHAR(100) NULL,
  medicine_type         VARCHAR(50)  NULL,
  default_dosage        VARCHAR(100) NULL,
  administration_route  VARCHAR(50)  NULL,
  withdrawal_milk_hours INT NOT NULL DEFAULT 0,
  withdrawal_meat_days  INT NOT NULL DEFAULT 0,
  description           TEXT NULL,
  is_active             TINYINT(1) NOT NULL DEFAULT 1,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (medicine_id),
  UNIQUE KEY uq_medicines_name (name),
  KEY idx_medicines_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE health_records (
  health_record_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id            BIGINT UNSIGNED NOT NULL,
  animal_id          BIGINT UNSIGNED NOT NULL,
  disease_id         BIGINT UNSIGNED NULL,
  record_date        DATE NOT NULL,
  record_type        ENUM('ILLNESS','INJURY','CHECKUP','VACCINATION','DEWORMING','TREATMENT','OTHER') NOT NULL,
  symptoms           TEXT NULL,
  diagnosis          VARCHAR(255) NULL,
  treatment          TEXT NULL,
  medication         VARCHAR(255) NULL,
  dosage             VARCHAR(100) NULL,
  veterinarian_name  VARCHAR(150) NULL,
  follow_up_date      DATE NULL,
  status             ENUM('OPEN','IN_TREATMENT','RECOVERED','CLOSED') NOT NULL DEFAULT 'OPEN',
  recovery_date      DATE NULL,
  is_withdrawal      TINYINT(1) NOT NULL DEFAULT 0,
  withdrawal_end_date DATE NULL,
  notes              TEXT NULL,
  created_by         BIGINT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (health_record_id),
  KEY idx_health_farm_date (farm_id, record_date),
  KEY idx_health_animal (animal_id),
  KEY idx_health_status (status),
  KEY idx_health_follow_up (follow_up_date),
  CONSTRAINT fk_health_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_health_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_health_disease FOREIGN KEY (disease_id) REFERENCES diseases (disease_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE treatments (
  treatment_id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id              BIGINT UNSIGNED NOT NULL,
  animal_id            BIGINT UNSIGNED NOT NULL,
  health_record_id     BIGINT UNSIGNED NULL,
  disease_id           BIGINT UNSIGNED NULL,
  medicine_id          BIGINT UNSIGNED NULL,
  treatment_date       DATE NOT NULL,
  start_date           DATE NULL,
  end_date             DATE NULL,
  dosage               VARCHAR(100) NULL,
  administration_route VARCHAR(50)  NULL,
  frequency            VARCHAR(50)  NULL,
  duration_days        INT NULL,
  veterinarian_name    VARCHAR(150) NULL,
  treatment_status     ENUM('ONGOING','COMPLETED','STOPPED') NOT NULL DEFAULT 'ONGOING',
  withdrawal_milk_until DATE NULL COMMENT 'Derived from medicines.withdrawal_milk_hours',
  withdrawal_meat_until DATE NULL COMMENT 'Derived from medicines.withdrawal_meat_days',
  notes                TEXT NULL,
  created_by           BIGINT UNSIGNED NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (treatment_id),
  KEY idx_treat_farm_date (farm_id, treatment_date),
  KEY idx_treat_animal (animal_id),
  KEY idx_treat_status (treatment_status),
  KEY idx_treat_withdrawal (withdrawal_milk_until),
  CONSTRAINT fk_treat_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_treat_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_treat_health FOREIGN KEY (health_record_id)
    REFERENCES health_records (health_record_id) ON DELETE SET NULL,
  CONSTRAINT fk_treat_disease FOREIGN KEY (disease_id) REFERENCES diseases (disease_id) ON DELETE SET NULL,
  CONSTRAINT fk_treat_medicine FOREIGN KEY (medicine_id) REFERENCES medicines (medicine_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vaccination_records (
  vaccination_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id          BIGINT UNSIGNED NOT NULL,
  animal_id        BIGINT UNSIGNED NULL COMMENT 'NULL = whole group / herd vaccination',
  group_id         BIGINT UNSIGNED NULL,
  vaccine_name     VARCHAR(150) NOT NULL,
  vaccination_date DATE NOT NULL,
  next_due_date    DATE NULL,
  batch_number     VARCHAR(100) NULL,
  manufacturer     VARCHAR(150) NULL,
  veterinarian_name VARCHAR(150) NULL,
  status           ENUM('SCHEDULED','COMPLETED','MISSED','CANCELLED') NOT NULL DEFAULT 'COMPLETED',
  notes            TEXT NULL,
  created_by       BIGINT UNSIGNED NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (vaccination_id),
  KEY idx_vacc_farm_date (farm_id, vaccination_date),
  KEY idx_vacc_animal (animal_id),
  KEY idx_vacc_due (next_due_date),
  CONSTRAINT fk_vacc_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_vacc_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_vacc_group FOREIGN KEY (group_id) REFERENCES animal_groups (group_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- SECTION 7 -- FEED, INVENTORY AND SUPPLIERS -------------------------------
-- Stock is a TRANSACTION LEDGER, not a mutable running-total column. Closing
-- stock = SUM(quantity) filtered by transaction_type, so the audit trail is
-- never destroyed by an edit.

CREATE TABLE suppliers (
  supplier_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id       BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150) NULL,
  phone         VARCHAR(50)  NULL,
  email         VARCHAR(150) NULL,
  address       VARCHAR(500) NULL,
  supplier_type VARCHAR(30)  NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  notes         TEXT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id),
  KEY idx_suppliers_farm (farm_id),
  KEY idx_suppliers_status (status),
  CONSTRAINT fk_suppliers_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE feed_items (
  feed_item_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id               BIGINT UNSIGNED NOT NULL,
  name                  VARCHAR(150) NOT NULL,
  category              VARCHAR(50)  NULL COMMENT 'FORAGE/ROUGHAGE/CONCENTRATE/GRAIN/SUPPLEMENT/MINERAL',
  unit                  VARCHAR(20)  NOT NULL DEFAULT 'KG',
  description           TEXT NULL,
  dry_matter_percent    DECIMAL(5,2) NULL,
  crude_protein_percent DECIMAL(5,2) NULL,
  me_mj_per_kg          DECIMAL(8,2) NULL,
  price_per_unit        DECIMAL(12,2) NULL,
  minimum_stock         DECIMAL(12,3) NULL COMMENT 'Low-stock alert threshold',
  status                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (feed_item_id),
  UNIQUE KEY uq_feed_items_farm_name (farm_id, name),
  KEY idx_feed_items_status (status),
  CONSTRAINT fk_feed_items_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE feed_transactions (
  feed_transaction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id             BIGINT UNSIGNED NOT NULL,
  feed_item_id        BIGINT UNSIGNED NOT NULL,
  transaction_date    DATE NOT NULL,
  transaction_type    ENUM('PURCHASE','RECEIVED','USAGE','WASTAGE','ADJUSTMENT','RETURN') NOT NULL,
  quantity            DECIMAL(12,3) NOT NULL COMMENT 'Signed: +in, -out',
  unit_cost           DECIMAL(12,2) NULL,
  total_cost          DECIMAL(14,2) NULL,
  supplier_id         BIGINT UNSIGNED NULL,
  supplier_name       VARCHAR(200) NULL,
  reference_number    VARCHAR(100) NULL,
  notes               TEXT NULL,
  created_by          BIGINT UNSIGNED NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (feed_transaction_id),
  KEY idx_feed_tx_farm_date (farm_id, transaction_date),
  KEY idx_feed_tx_item (feed_item_id),
  CONSTRAINT fk_feed_tx_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_feed_tx_item FOREIGN KEY (feed_item_id) REFERENCES feed_items (feed_item_id) ON DELETE CASCADE,
  CONSTRAINT fk_feed_tx_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ration_plans (
  ration_plan_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id        BIGINT UNSIGNED NOT NULL,
  name           VARCHAR(150) NOT NULL,
  description    TEXT NULL,
  animal_id      BIGINT UNSIGNED NULL,
  group_id       BIGINT UNSIGNED NULL,
  start_date     DATE NULL,
  end_date       DATE NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  notes          TEXT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ration_plan_id),
  UNIQUE KEY uq_ration_farm_name (farm_id, name),
  KEY idx_ration_farm (farm_id),
  CONSTRAINT fk_ration_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_ration_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_ration_group FOREIGN KEY (group_id) REFERENCES animal_groups (group_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ration_plan_items (
  ration_plan_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ration_plan_id      BIGINT UNSIGNED NOT NULL,
  feed_item_id        BIGINT UNSIGNED NOT NULL,
  quantity_per_day    DECIMAL(12,3) NOT NULL,
  notes               TEXT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ration_plan_item_id),
  UNIQUE KEY uq_ration_item (ration_plan_id, feed_item_id),
  CONSTRAINT fk_rpi_plan FOREIGN KEY (ration_plan_id)
    REFERENCES ration_plans (ration_plan_id) ON DELETE CASCADE,
  CONSTRAINT fk_rpi_feed FOREIGN KEY (feed_item_id)
    REFERENCES feed_items (feed_item_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE feed_consumptions (
  feed_consumption_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id            BIGINT UNSIGNED NOT NULL,
  feed_item_id       BIGINT UNSIGNED NOT NULL,
  consumption_date   DATE NOT NULL,
  animal_id          BIGINT UNSIGNED NULL,
  group_id           BIGINT UNSIGNED NULL,
  ration_plan_id     BIGINT UNSIGNED NULL,
  quantity           DECIMAL(12,3) NOT NULL,
  unit               VARCHAR(20) NULL,
  notes              TEXT NULL,
  recorded_by        BIGINT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (feed_consumption_id),
  KEY idx_feed_cons_farm_date (farm_id, consumption_date),
  KEY idx_feed_cons_animal (animal_id),
  KEY idx_feed_cons_group (group_id),
  CONSTRAINT fk_feed_cons_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_feed_cons_item FOREIGN KEY (feed_item_id) REFERENCES feed_items (feed_item_id) ON DELETE CASCADE,
  CONSTRAINT fk_feed_cons_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_feed_cons_group FOREIGN KEY (group_id) REFERENCES animal_groups (group_id) ON DELETE CASCADE,
  CONSTRAINT fk_feed_cons_ration FOREIGN KEY (ration_plan_id) REFERENCES ration_plans (ration_plan_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_items (
  inventory_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id           BIGINT UNSIGNED NOT NULL,
  name              VARCHAR(150) NOT NULL,
  category          VARCHAR(50)  NULL,
  unit              VARCHAR(20)  NOT NULL DEFAULT 'PCS',
  minimum_stock     DECIMAL(12,3) NULL COMMENT 'Low-stock alert threshold',
  description       TEXT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (inventory_item_id),
  UNIQUE KEY uq_inventory_farm_name (farm_id, name),
  CONSTRAINT fk_inventory_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_transactions (
  inventory_transaction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id            BIGINT UNSIGNED NOT NULL,
  inventory_item_id  BIGINT UNSIGNED NOT NULL,
  transaction_date   DATE NOT NULL,
  transaction_type   ENUM('PURCHASE','RECEIVED','USAGE','WASTAGE','ADJUSTMENT','RETURN') NOT NULL,
  quantity           DECIMAL(12,3) NOT NULL COMMENT 'Signed: +in, -out',
  unit_cost          DECIMAL(12,2) NULL,
  total_cost         DECIMAL(14,2) NULL,
  supplier_id        BIGINT UNSIGNED NULL,
  supplier_name      VARCHAR(200) NULL,
  reference_number   VARCHAR(100) NULL,
  notes              TEXT NULL,
  created_by         BIGINT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (inventory_transaction_id),
  KEY idx_inv_tx_farm_date (farm_id, transaction_date),
  KEY idx_inv_tx_item (inventory_item_id),
  CONSTRAINT fk_inv_tx_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_tx_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (inventory_item_id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_tx_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SECTION 8 -- TRADE: PURCHASES, SALES, MORTALITY ------------------------
-- `animal_purchases` carries landed_cost = purchase_price + transport_cost +
-- veterinary_cost (requirement 16). `animal_sales` carries profit_loss
-- (requirement 17). Mortality sets the animal to DEAD but never deletes the
-- row, so the animal's full history stays queryable (requirement 18).

CREATE TABLE animal_purchases (
  purchase_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id          BIGINT UNSIGNED NOT NULL,
  animal_id        BIGINT UNSIGNED NOT NULL,
  supplier_id      BIGINT UNSIGNED NULL,
  purchase_date    DATE NOT NULL,
  purchase_price   DECIMAL(14,2) NOT NULL,
  transport_cost   DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  veterinary_cost  DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Pre-purchase inspection',
  inspection_status VARCHAR(30) NULL,
  health_status    VARCHAR(30) NULL,
  previous_farm    VARCHAR(200) NULL,
  landed_cost      DECIMAL(14,2) NULL COMMENT 'Computed by the API on save',
  payment_method   VARCHAR(20) NULL,
  reference_number VARCHAR(100) NULL,
  quarantine_until DATE NULL,
  notes            TEXT NULL,
  created_by       BIGINT UNSIGNED NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (purchase_id),
  KEY idx_purch_farm_date (farm_id, purchase_date),
  KEY idx_purch_animal (animal_id),
  KEY idx_purch_supplier (supplier_id),
  CONSTRAINT fk_purch_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_purch_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_purch_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE animal_sales (
  sale_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id          BIGINT UNSIGNED NOT NULL,
  animal_id        BIGINT UNSIGNED NOT NULL,
  buyer_id         BIGINT UNSIGNED NULL COMMENT 'Set when the buyer is a milk_buyers row',
  sale_date        DATE NOT NULL,
  buyer_name       VARCHAR(150) NULL,
  buyer_contact    VARCHAR(100) NULL,
  sale_price       DECIMAL(14,2) NOT NULL,
  weight_kg        DECIMAL(8,2) NULL,
  cost_basis       DECIMAL(14,2) NULL COMMENT 'Landed purchase cost, for profit/loss',
  profit_loss      DECIMAL(14,2) NULL COMMENT 'Computed by the API on save',
  reason           VARCHAR(255) NULL,
  payment_method   VARCHAR(20) NULL,
  reference_number VARCHAR(100) NULL,
  notes            TEXT NULL,
  created_by       BIGINT UNSIGNED NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sale_id),
  KEY idx_sales_farm_date (farm_id, sale_date),
  KEY idx_sales_animal (animal_id),
  KEY idx_sales_buyer (buyer_id),
  CONSTRAINT fk_sales_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_buyer FOREIGN KEY (buyer_id) REFERENCES milk_buyers (buyer_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE animal_mortalities (
  mortality_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id           BIGINT UNSIGNED NOT NULL,
  animal_id         BIGINT UNSIGNED NOT NULL,
  mortality_date    DATE NOT NULL,
  cause             VARCHAR(255) NULL,
  reason            VARCHAR(255) NULL,
  location          VARCHAR(150) NULL,
  veterinarian_name VARCHAR(150) NULL,
  post_mortem_done  TINYINT(1) NOT NULL DEFAULT 0,
  post_mortem_notes TEXT NULL,
  notes             TEXT NULL,
  recorded_by       BIGINT UNSIGNED NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (mortality_id),
  KEY idx_mort_farm_date (farm_id, mortality_date),
  KEY idx_mort_animal (animal_id),
  CONSTRAINT fk_mort_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_mort_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- SECTION 9 -- FINANCE ----------------------------------------------------
-- ONE authoritative ledger. Expenses and income are distinguished by
-- `transaction_type`; there are deliberately no separate income/expense
-- tables, so a balance query is a single SUM with a WHERE clause and can
-- never disagree with itself.

CREATE TABLE finance_categories (
  category_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id       BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(150) NOT NULL,
  category_type ENUM('INCOME','EXPENSE') NOT NULL,
  description   TEXT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_fin_cat_farm_name (farm_id, name),
  KEY idx_fin_cat_type (category_type),
  CONSTRAINT fk_fin_cat_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE finance_transactions (
  finance_transaction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id            BIGINT UNSIGNED NOT NULL,
  category_id        BIGINT UNSIGNED NOT NULL,
  supplier_id        BIGINT UNSIGNED NULL,
  buyer_id           BIGINT UNSIGNED NULL,
  transaction_date   DATE NOT NULL,
  transaction_type   ENUM('INCOME','EXPENSE') NOT NULL,
  amount             DECIMAL(14,2) NOT NULL,
  payment_method     VARCHAR(20) NULL,
  reference_number   VARCHAR(100) NULL,
  description        VARCHAR(255) NULL,
  receipt_url        VARCHAR(500) NULL,
  notes              TEXT NULL,
  created_by         BIGINT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (finance_transaction_id),
  KEY idx_fin_tx_farm_date (farm_id, transaction_date),
  KEY idx_fin_tx_type_date (transaction_type, transaction_date),
  KEY idx_fin_tx_category (category_id),
  CONSTRAINT fk_fin_tx_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_fin_tx_category FOREIGN KEY (category_id) REFERENCES finance_categories (category_id) ON DELETE RESTRICT,
  CONSTRAINT fk_fin_tx_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON DELETE SET NULL,
  CONSTRAINT fk_fin_tx_buyer FOREIGN KEY (buyer_id) REFERENCES milk_buyers (buyer_id) ON DELETE SET NULL,
  CONSTRAINT ck_fin_tx_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- SECTION 10 -- TASKS, ALERTS, NOTIFICATIONS -------------------------------
-- `alerts` is the EVENT raised by a domain rule (vaccination due, low stock,
-- calving due, milk drop). `notifications` is its per-user delivery record.
-- reference_type/reference_id give the click-through target so clicking a
-- notification opens the relevant module record (requirement 27).

CREATE TABLE tasks (
  task_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id      BIGINT UNSIGNED NOT NULL,
  animal_id    BIGINT UNSIGNED NULL,
  group_id     BIGINT UNSIGNED NULL,
  assigned_to  BIGINT UNSIGNED NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT NULL,
  task_type    ENUM('FEEDING','MILKING','HEALTH','VACCINATION','BREEDING','PREGNANCY_CHECK',
                    'CALVING','DEWORMING','HOOF_TRIMMING','WEIGHING','CLEANING',
                    'MAINTENANCE','INVENTORY','FINANCE','OTHER') NOT NULL DEFAULT 'OTHER',
  priority     ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  due_date     DATE NOT NULL,
  due_time     TIME NULL,
  status       ENUM('PENDING','IN_PROGRESS','COMPLETED','CANCELLED','OVERDUE') NOT NULL DEFAULT 'PENDING',
  completed_at DATETIME NULL,
  notes        TEXT NULL,
  created_by   BIGINT UNSIGNED NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id),
  KEY idx_tasks_farm_due (farm_id, due_date),
  KEY idx_tasks_status (status),
  KEY idx_tasks_assigned (assigned_to),
  KEY idx_tasks_animal (animal_id),
  CONSTRAINT fk_tasks_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_group FOREIGN KEY (group_id) REFERENCES animal_groups (group_id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_user FOREIGN KEY (assigned_to) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE alerts (
  alert_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id       BIGINT UNSIGNED NOT NULL,
  animal_id     BIGINT UNSIGNED NULL,
  alert_type    ENUM('LOW_STOCK','OUT_OF_STOCK','VACCINATION_DUE','VACCINATION_OVERDUE',
                     'HEALTH_FOLLOW_UP','PREGNANCY_DUE','CALVING_DUE','DRY_OFF_DUE','TASK_DUE',
                     'TASK_OVERDUE','MILK_DROP','ANIMAL_SICK','ANIMAL_DIED','ANIMAL_PURCHASED','OTHER') NOT NULL,
  title         VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  severity      ENUM('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'INFO',
  reference_type VARCHAR(100) NULL COMMENT 'e.g. animal / milk / task / vaccination',
  reference_id   BIGINT UNSIGNED NULL,
  is_read       TINYINT(1) NOT NULL DEFAULT 0,
  is_resolved   TINYINT(1) NOT NULL DEFAULT 0,
  expires_at    DATETIME NULL,
  resolved_at   DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (alert_id),
  KEY idx_alerts_farm_type (farm_id, alert_type),
  KEY idx_alerts_unresolved (is_resolved, expires_at),
  KEY idx_alerts_reference (reference_type, reference_id),
  CONSTRAINT fk_alerts_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_alerts_animal FOREIGN KEY (animal_id) REFERENCES animals (animal_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  notification_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id         BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NULL COMMENT 'NULL = broadcast to all farm users',
  alert_id        BIGINT UNSIGNED NULL,
  title           VARCHAR(200) NOT NULL,
  message         TEXT NOT NULL,
  notification_type VARCHAR(50) NULL COMMENT 'Mirrors alerts.alert_type',
  reference_type  VARCHAR(100) NULL,
  reference_id    BIGINT UNSIGNED NULL,
  is_read         TINYINT(1) NOT NULL DEFAULT 0,
  read_at         DATETIME NULL,
  is_done         TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Requirement 27: Mark as Done',
  done_at         DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  KEY idx_notif_farm_user (farm_id, user_id),
  KEY idx_notif_unread (is_read),
  KEY idx_notif_alert (alert_id),
  CONSTRAINT fk_notif_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_alert FOREIGN KEY (alert_id) REFERENCES alerts (alert_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SECTION 11 -- ATTACHMENTS, AUDIT TRAIL, SETTINGS -----------------------

-- Generic attachment store. Animal images additionally get the optimised
-- `animal_photos` table (Section 3) because they are read on every profile
-- render; this table carries receipts, vet certificates and purchase docs.
CREATE TABLE attachments (
  attachment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id       BIGINT UNSIGNED NOT NULL,
  entity_type   VARCHAR(100) NOT NULL COMMENT 'animal / finance / purchase / health',
  entity_id     BIGINT UNSIGNED NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  content_type  VARCHAR(100) NOT NULL,
  file_size     BIGINT NOT NULL,
  storage_path  VARCHAR(500) NOT NULL,
  uploaded_by   BIGINT UNSIGNED NULL,
  uploaded_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attachment_id),
  KEY idx_attach_entity (entity_type, entity_id),
  KEY idx_attach_farm (farm_id),
  CONSTRAINT fk_attach_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_attach_user FOREIGN KEY (uploaded_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit trail. old_values/new_values hold JSON snapshots so a diff can always
-- be replayed. user_id is ON DELETE SET NULL: deleting a user must never
-- erase the evidence of what they did.
CREATE TABLE audit_logs (
  audit_log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id      BIGINT UNSIGNED NULL,
  user_id      BIGINT UNSIGNED NULL,
  action       VARCHAR(30)  NOT NULL COMMENT 'CREATE/UPDATE/DELETE/LOGIN/LOGOUT',
  module       VARCHAR(50)  NOT NULL,
  entity_type  VARCHAR(50)  NULL,
  entity_id    BIGINT UNSIGNED NULL,
  old_values   LONGTEXT NULL,
  new_values   LONGTEXT NULL,
  ip_address   VARCHAR(64)  NULL,
  user_agent   VARCHAR(255) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_log_id),
  KEY idx_audit_farm_date (farm_id, created_at),
  KEY idx_audit_module (module),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_user (user_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_settings (
  system_setting_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key      VARCHAR(100) NOT NULL,
  setting_value    TEXT NOT NULL,
  description      VARCHAR(255) NULL,
  data_type        VARCHAR(20) NOT NULL DEFAULT 'string',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (system_setting_id),
  UNIQUE KEY uq_system_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Farm-scoped settings. Application-wide values that differ per farm
-- (currency, alert toggles) live here, not in system_settings.
CREATE TABLE farm_settings (
  farm_setting_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farm_id         BIGINT UNSIGNED NOT NULL,
  farm_name       VARCHAR(150) NULL,
  farm_logo_url   VARCHAR(500) NULL,
  currency        VARCHAR(10)  NOT NULL DEFAULT 'PKR',
  timezone        VARCHAR(50)  NOT NULL DEFAULT 'Asia/Karachi',
  milk_unit       VARCHAR(10)  NOT NULL DEFAULT 'LITER',
  date_format     VARCHAR(20)  NOT NULL DEFAULT 'yyyy-MM-dd',
  low_stock_alert_enabled        TINYINT(1) NOT NULL DEFAULT 1,
  vaccination_alert_enabled      TINYINT(1) NOT NULL DEFAULT 1,
  health_follow_up_alert_enabled TINYINT(1) NOT NULL DEFAULT 1,
  pregnancy_alert_enabled        TINYINT(1) NOT NULL DEFAULT 1,
  task_alert_enabled             TINYINT(1) NOT NULL DEFAULT 1,
  milk_drop_alert_enabled        TINYINT(1) NOT NULL DEFAULT 1,
  milk_drop_threshold_percent    DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  audit_logging_enabled          TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (farm_setting_id),
  UNIQUE KEY uq_farm_settings_farm (farm_id),
  CONSTRAINT fk_farm_settings_farm FOREIGN KEY (farm_id) REFERENCES farms (farm_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- SECTION 12 -- SEED REFERENCE / CONFIGURATION DATA ONLY
-- ===========================================================================
-- Roles, permissions and lookups. NO operational records are seeded: no fake
-- animals, milk, health or financial rows. The application starts empty.

INSERT INTO roles (name, description) VALUES
  ('Owner',        'Full access to all farms, staff and settings'),
  ('Manager',      'Day-to-day operational management'),
  ('Veterinarian', 'Animal health, treatment and breeding'),
  ('Feed Manager', 'Feed, ration and inventory management'),
  ('Worker',       'Limited data entry for daily tasks'),
  ('Accountant',   'Financial records and reporting');

INSERT INTO permissions (name, module, description) VALUES
  ('animals.view','animals','View animals'),
  ('animals.create','animals','Register animals'),
  ('animals.update','animals','Edit animals'),
  ('animals.delete','animals','Archive animals'),
  ('milk.view','milk','View milk records'),
  ('milk.create','milk','Record milk production'),
  ('milk.update','milk','Edit milk records'),
  ('milk.delete','milk','Delete milk records'),
  ('breeding.view','breeding','View breeding records'),
  ('breeding.create','breeding','Record breeding'),
  ('breeding.update','breeding','Edit breeding records'),
  ('health.view','health','View health records'),
  ('health.create','health','Record health events'),
  ('health.update','health','Edit health records'),
  ('feed.view','feed','View feed data'),
  ('feed.manage','feed','Manage feed and rations'),
  ('inventory.view','inventory','View inventory'),
  ('inventory.manage','inventory','Manage inventory'),
  ('finance.view','finance','View finance records'),
  ('finance.create','finance','Record finance entries'),
  ('finance.update','finance','Edit finance records'),
  ('reports.view','reports','View reports and dashboards'),
  ('tasks.view','tasks','View tasks'),
  ('tasks.manage','tasks','Create and manage tasks'),
  ('users.view','users','View staff accounts'),
  ('users.manage','users','Manage staff and roles'),
  ('settings.view','settings','View settings'),
  ('settings.manage','settings','Manage settings');

-- Owner: every permission.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p WHERE r.name = 'Owner';

-- Manager: everything except user administration.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
 WHERE r.name = 'Manager' AND p.name <> 'users.manage';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
 WHERE r.name = 'Veterinarian'
   AND p.name IN ('animals.view','animals.create','animals.update','breeding.view',
                  'breeding.create','breeding.update','health.view','health.create',
                  'health.update','milk.view','tasks.view','tasks.manage','reports.view');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
 WHERE r.name = 'Feed Manager'
   AND p.name IN ('feed.view','feed.manage','inventory.view','inventory.manage',
                  'animals.view','tasks.view','tasks.manage','reports.view');

-- Worker: data entry only. No deletes, no finance, no settings.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
 WHERE r.name = 'Worker'
   AND p.name IN ('animals.view','animals.create','milk.view','milk.create','health.view',
                  'health.create','breeding.view','breeding.create','feed.view',
                  'inventory.view','tasks.view','tasks.manage');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
 WHERE r.name = 'Accountant'
   AND p.name IN ('finance.view','finance.create','finance.update','reports.view',
                  'inventory.view','milk.view','tasks.view');

INSERT INTO breeds (name, description) VALUES
  ('Holstein Friesian', 'High-yield dairy breed'),
  ('Jersey',            'Butterfat-rich dairy breed'),
  ('Sahiwal',           'Heat-tolerant zebu dairy breed'),
  ('Red Sindhi',        'Heat-tolerant zebu dairy breed'),
  ('Friesian Cross',    'Friesian crossbred'),
  ('Buffalo',           'Nili-Ravi / Murrah buffalo');

INSERT INTO diseases (name, code, description) VALUES
  ('Mastitis','MAST','Mammary gland inflammation'),
  ('Foot and Mouth Disease','FMD','Viral cloven-hoof disease'),
  ('Diarrhoea','DIAR','Digestive disorder / scours'),
  ('Pneumonia','PNEU','Respiratory infection'),
  ('Ketosis','KETO','Metabolic disorder'),
  ('Milk Fever','MF','Hypocalcaemia'),
  ('Metritis','METR','Uterine inflammation'),
  ('Lameness','LAME','Mobility disorder');

INSERT INTO system_settings (setting_key, setting_value, description, data_type) VALUES
  ('app_name',           'Dairy Farm Management System', 'Display name',         'string'),
  ('default_currency',   'PKR',                          'Default currency',     'string'),
  ('default_timezone',   'Asia/Karachi',                 'Default timezone',     'string'),
  ('milk_drop_threshold','20',                           'Milk drop alert, %',   'number'),
  ('animal_code_prefix', 'AN-',                          'Animal number prefix', 'string');

-- ===========================================================================
-- END OF CANONICAL SCHEMA
-- ===========================================================================

SELECT COUNT(*) AS tables_created
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = 'dairy farm 1' AND TABLE_TYPE = 'BASE TABLE';

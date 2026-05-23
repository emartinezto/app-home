-- =====================================================================

--  Casa García — schema MySQL 8

-- =====================================================================

CREATE DATABASE IF NOT EXISTS casa_garcia

  CHARACTER SET utf8mb4

  COLLATE utf8mb4_unicode_ci;

USE casa_garcia;

SET time_zone = '+00:00'; -- Guardamos UTC, convertimos a Europe/Madrid en app


-- ---------------------------------------------------------------------

-- households

-- ---------------------------------------------------------------------

CREATE TABLE households (

  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  name                    VARCHAR(100)    NOT NULL,

  -- invite_code es NULL para hogares archivados (libera el código para reuso teórico)

  invite_code             CHAR(6)         NULL,

  invite_code_expires_at  DATETIME        NULL,

  timezone                VARCHAR(64)     NOT NULL DEFAULT 'Europe/Madrid',

  -- Cuando el último miembro borra su cuenta, se setea archived_at = NOW e invite_code = NULL.

  -- Hogar archivado = read-only: sin nuevas invitaciones, sin generación de propuestas,

  -- datos históricos preservados.

  archived_at             DATETIME        NULL,

  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP

                                                   ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_households_invite_code (invite_code),

  KEY idx_households_archived (archived_at)

) ENGINE=InnoDB;


-- ---------------------------------------------------------------------

-- users (máx 2 por household; lo enforce-amos por trigger)

-- ---------------------------------------------------------------------

CREATE TABLE users (

  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  household_id    BIGINT UNSIGNED NULL, -- NULL durante el alta antes de crear/unirse a un hogar

  email           VARCHAR(255)    NOT NULL,

  password_hash   VARCHAR(255)    NOT NULL,

  name            VARCHAR(100)    NOT NULL,

  -- work_schedule: { "mon": {"start":"09:00","end":"18:00","office_default":false}, ... "sun": null }

  work_schedule   JSON            NOT NULL,

  avatar_color    VARCHAR(7)      NOT NULL DEFAULT '#3B82F6',

  last_seen_at    DATETIME        NULL,

  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP

                                           ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_users_email (email),

  KEY idx_users_household (household_id),

  CONSTRAINT fk_users_household

    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL

) ENGINE=InnoDB;

-- Trigger: máximo 2 usuarios por hogar

DELIMITER $$

CREATE TRIGGER trg_users_max_two_per_household

BEFORE INSERT ON users

FOR EACH ROW

BEGIN

  DECLARE current_count INT DEFAULT 0;

  IF NEW.household_id IS NOT NULL THEN

    SELECT COUNT(*) INTO current_count

      FROM users WHERE household_id = NEW.household_id;

    IF current_count >= 2 THEN

      SIGNAL SQLSTATE '45000'

        SET MESSAGE_TEXT = 'Household already has 2 users';

    END IF;

  END IF;

END$$

CREATE TRIGGER trg_users_max_two_per_household_upd

BEFORE UPDATE ON users

FOR EACH ROW

BEGIN

  DECLARE current_count INT DEFAULT 0;

  IF NEW.household_id IS NOT NULL

     AND (OLD.household_id IS NULL OR OLD.household_id <> NEW.household_id) THEN

    SELECT COUNT(*) INTO current_count

      FROM users WHERE household_id = NEW.household_id;

    IF current_count >= 2 THEN

      SIGNAL SQLSTATE '45000'

        SET MESSAGE_TEXT = 'Household already has 2 users';

    END IF;

  END IF;

END$$

DELIMITER ;


-- ---------------------------------------------------------------------

-- task_templates (catálogo global, seed)

-- ---------------------------------------------------------------------

CREATE TABLE task_templates (

  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  name                VARCHAR(150)    NOT NULL,

  category            ENUM('hogar','cuidados','perro') NOT NULL,

  frequency           ENUM('diaria','semanal','quincenal','mensual','puntual') NOT NULL,

  default_weight      TINYINT UNSIGNED NOT NULL DEFAULT 2,

  default_time_slot   ENUM('manana','tarde','flexible') NOT NULL DEFAULT 'flexible',

  display_order       INT UNSIGNED    NOT NULL DEFAULT 0,

  CONSTRAINT chk_task_tpl_weight CHECK (default_weight BETWEEN 1 AND 3)

) ENGINE=InnoDB;


-- ---------------------------------------------------------------------

-- tasks (instancias por hogar)

-- ---------------------------------------------------------------------

CREATE TABLE tasks (

  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  household_id  BIGINT UNSIGNED NOT NULL,

  template_id   BIGINT UNSIGNED NULL,  -- NULL si tarea custom creada por el usuario

  name          VARCHAR(150)    NOT NULL,

  category      ENUM('hogar','cuidados','perro') NOT NULL,

  frequency     ENUM('diaria','semanal','quincenal','mensual','puntual') NOT NULL,

  weight        TINYINT UNSIGNED NOT NULL,

  time_slot     ENUM('manana','tarde','flexible') NOT NULL DEFAULT 'flexible',

  is_active     BOOLEAN         NOT NULL DEFAULT FALSE,

  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP

                                         ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT chk_tasks_weight CHECK (weight BETWEEN 1 AND 3),

  KEY idx_tasks_household_active (household_id, is_active),

  CONSTRAINT fk_tasks_household

    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,

  CONSTRAINT fk_tasks_template

    FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL

) ENGINE=InnoDB;


-- ---------------------------------------------------------------------

-- weekly_availability

-- ---------------------------------------------------------------------

CREATE TABLE weekly_availability (

  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  user_id       BIGINT UNSIGNED NOT NULL,

  household_id  BIGINT UNSIGNED NOT NULL,  -- denormalizado para defensa en profundidad

  week_start    DATE            NOT NULL,  -- siempre lunes

  -- office_days: ["mon","tue","wed","thu","fri"] - solo días laborables que va a oficina

  office_days   JSON            NOT NULL,

  confirmed     BOOLEAN         NOT NULL DEFAULT FALSE,

  confirmed_at  DATETIME        NULL,

  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP

                                         ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_avail_user_week (user_id, week_start),

  KEY idx_avail_household_week (household_id, week_start),

  CONSTRAINT fk_avail_user

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  CONSTRAINT fk_avail_household

    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE

) ENGINE=InnoDB;


-- ---------------------------------------------------------------------

-- weekly_proposals (un row por semana y hogar)

-- ---------------------------------------------------------------------

CREATE TABLE weekly_proposals (

  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  household_id        BIGINT UNSIGNED NOT NULL,

  week_start          DATE            NOT NULL,

  status              ENUM('draft','pending_confirmation','confirmed','active')

                              NOT NULL DEFAULT 'draft',

  generated_at        DATETIME        NULL,

  user1_id            BIGINT UNSIGNED NULL,

  user2_id            BIGINT UNSIGNED NULL,

  user1_confirmed_at  DATETIME        NULL,

  user2_confirmed_at  DATETIME        NULL,

  user1_load_score    DECIMAL(6,2)    NULL,

  user2_load_score    DECIMAL(6,2)    NULL,

  algorithm_version   VARCHAR(20)     NOT NULL DEFAULT 'v1',

  notes               JSON            NULL, -- soft_violations, warnings...

  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP

                                              ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_proposal_household_week (household_id, week_start),

  CONSTRAINT fk_prop_household

    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,

  CONSTRAINT fk_prop_user1

    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT fk_prop_user2

    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE SET NULL

) ENGINE=InnoDB;


-- ---------------------------------------------------------------------

-- weekly_assignments

-- ---------------------------------------------------------------------

CREATE TABLE weekly_assignments (

  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  proposal_id   BIGINT UNSIGNED NOT NULL,

  household_id  BIGINT UNSIGNED NOT NULL,  -- denormalizado

  week_start    DATE            NOT NULL,  -- denormalizado

  task_id       BIGINT UNSIGNED NOT NULL,

  assigned_to   BIGINT UNSIGNED NOT NULL,

  day_of_week   TINYINT UNSIGNED NOT NULL, -- 1=Lun .. 7=Dom

  is_done       BOOLEAN         NOT NULL DEFAULT FALSE,

  done_at       DATETIME        NULL,

  done_by       BIGINT UNSIGNED NULL,

  -- soft_violation indica si una regla dura no se pudo respetar (p.ej. ambos en oficina)

  soft_violation BOOLEAN        NOT NULL DEFAULT FALSE,

  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP

                                         ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT chk_assign_dow CHECK (day_of_week BETWEEN 1 AND 7),

  KEY idx_assign_household_week (household_id, week_start),

  KEY idx_assign_user_week (assigned_to, week_start),

  KEY idx_assign_proposal (proposal_id),

  KEY idx_assign_task (task_id),

  CONSTRAINT fk_assign_proposal

    FOREIGN KEY (proposal_id) REFERENCES weekly_proposals(id) ON DELETE CASCADE,

  CONSTRAINT fk_assign_household

    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,

  CONSTRAINT fk_assign_task

    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,

  CONSTRAINT fk_assign_user

    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,

  CONSTRAINT fk_assign_done_by

    FOREIGN KEY (done_by) REFERENCES users(id) ON DELETE SET NULL

) ENGINE=InnoDB;


-- ---------------------------------------------------------------------

-- reassignment_requests

-- ---------------------------------------------------------------------

CREATE TABLE reassignment_requests (

  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  assignment_id     BIGINT UNSIGNED NOT NULL,

  household_id      BIGINT UNSIGNED NOT NULL,  -- denormalizado

  requested_by      BIGINT UNSIGNED NOT NULL,

  requested_to      BIGINT UNSIGNED NOT NULL,

  reason            VARCHAR(500)    NULL,

  status            ENUM('pending','accepted','rejected','cancelled')

                            NOT NULL DEFAULT 'pending',

  rejection_reason  VARCHAR(500)    NULL,

  responded_at      DATETIME        NULL,

  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP

                                            ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_reassign_status (household_id, status),

  KEY idx_reassign_assignment (assignment_id),

  CONSTRAINT fk_reassign_assignment

    FOREIGN KEY (assignment_id) REFERENCES weekly_assignments(id) ON DELETE CASCADE,

  CONSTRAINT fk_reassign_household

    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,

  CONSTRAINT fk_reassign_by

    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,

  CONSTRAINT fk_reassign_to

    FOREIGN KEY (requested_to) REFERENCES users(id) ON DELETE CASCADE

) ENGINE=InnoDB;


-- ---------------------------------------------------------------------

-- refresh_tokens (rotación + revocación)

-- ---------------------------------------------------------------------

CREATE TABLE refresh_tokens (

  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  user_id     BIGINT UNSIGNED NOT NULL,

  token_hash  CHAR(64)        NOT NULL, -- SHA-256 hex del JWT refresh

  expires_at  DATETIME        NOT NULL,

  revoked_at  DATETIME        NULL,

  user_agent  VARCHAR(255)    NULL,

  ip_address  VARCHAR(45)     NULL,

  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_rt_token_hash (token_hash),

  KEY idx_rt_user (user_id, expires_at),

  CONSTRAINT fk_rt_user

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

) ENGINE=InnoDB;


-- ---------------------------------------------------------------------

-- push_subscriptions (Web Push, multi-device)

-- ---------------------------------------------------------------------

CREATE TABLE push_subscriptions (

  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  user_id       BIGINT UNSIGNED NOT NULL,

  endpoint      VARCHAR(500)    NOT NULL,

  p256dh_key    VARCHAR(255)    NOT NULL,

  auth_key      VARCHAR(255)    NOT NULL,

  user_agent    VARCHAR(255)    NULL,

  last_used_at  DATETIME        NULL,

  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_ps_endpoint (endpoint(255)),

  KEY idx_ps_user (user_id),

  CONSTRAINT fk_ps_user

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

) ENGINE=InnoDB;


-- =====================================================================

--  SEED — task_templates

--  Estos templates se clonan a `tasks` al crear un hogar (is_active=false).

-- =====================================================================

INSERT INTO task_templates (name, category, frequency, default_weight, default_time_slot, display_order) VALUES

-- Cocina y comidas

('Cocinar comida',          'hogar',     'diaria',    2, 'manana',  10),

('Cocinar cena',            'hogar',     'diaria',    2, 'tarde',   20),

('Lavar los platos',        'hogar',     'diaria',    1, 'tarde',   30),

('Compra semanal',          'hogar',     'semanal',   2, 'flexible',40),

-- Niños / colegio

('Llevar al cole',          'cuidados',  'diaria',    2, 'manana',  100),

('Recoger del cole',        'cuidados',  'diaria',    2, 'tarde',   110),

('Baño de los niños',       'cuidados',  'diaria',    1, 'tarde',   120),

('Acostar a los niños',     'cuidados',  'diaria',    2, 'tarde',   130),

('Preparar mochilas',       'cuidados',  'diaria',    1, 'tarde',   140),

-- Perro

('Sacar al perro mañana',   'perro',     'diaria',    1, 'manana',  200),

('Sacar al perro mediodía', 'perro',     'diaria',    1, 'flexible',210),

('Sacar al perro noche',    'perro',     'diaria',    1, 'tarde',   220),

('Bañar al perro',          'perro',     'mensual',   2, 'flexible',230),

('Comprar comida del perro','perro',     'mensual',   1, 'flexible',240),

-- Limpieza y ropa

('Sacar la basura',         'hogar',     'diaria',    1, 'tarde',   300),

('Poner lavadora',          'hogar',     'semanal',   1, 'flexible',310),

('Tender la ropa',          'hogar',     'semanal',   1, 'flexible',320),

('Doblar y guardar ropa',   'hogar',     'semanal',   2, 'flexible',330),

('Plancha',                 'hogar',     'semanal',   2, 'flexible',340),

('Limpiar baños',           'hogar',     'semanal',   3, 'flexible',350),

('Limpiar cocina a fondo',  'hogar',     'semanal',   3, 'flexible',360),

('Aspirar y fregar suelos', 'hogar',     'semanal',   2, 'flexible',370),

('Cambiar sábanas',         'hogar',     'quincenal', 2, 'flexible',380),

('Limpieza profunda',       'hogar',     'mensual',   3, 'flexible',390);


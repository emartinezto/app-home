-- =====================================================================
--  Casa García — schema PostgreSQL (Supabase compatible)
-- =====================================================================

-- Función reutilizable para mantener updated_at al día.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------
CREATE TABLE households (
  id                      BIGSERIAL PRIMARY KEY,
  name                    VARCHAR(100) NOT NULL,
  invite_code             CHAR(6),
  invite_code_expires_at  TIMESTAMP,
  timezone                VARCHAR(64) NOT NULL DEFAULT 'Europe/Madrid',
  archived_at             TIMESTAMP,
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_households_invite_code UNIQUE (invite_code)
);
CREATE INDEX idx_households_archived ON households(archived_at);
CREATE TRIGGER trg_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- users (máx 2 por household)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id              BIGSERIAL PRIMARY KEY,
  household_id    BIGINT REFERENCES households(id) ON DELETE SET NULL,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(100) NOT NULL,
  work_schedule   JSONB NOT NULL,
  avatar_color    VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  last_seen_at    TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_email UNIQUE (email)
);
CREATE INDEX idx_users_household ON users(household_id);
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: máximo 2 usuarios por hogar
CREATE OR REPLACE FUNCTION enforce_max_two_users_per_household()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
BEGIN
  IF NEW.household_id IS NOT NULL THEN
    IF TG_OP = 'UPDATE' AND OLD.household_id IS NOT NULL AND OLD.household_id = NEW.household_id THEN
      RETURN NEW;
    END IF;
    SELECT COUNT(*) INTO current_count FROM users WHERE household_id = NEW.household_id;
    IF current_count >= 2 THEN
      RAISE EXCEPTION 'Household already has 2 users';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_max_two_per_household
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION enforce_max_two_users_per_household();

-- ---------------------------------------------------------------------
-- task_templates (catálogo global)
-- ---------------------------------------------------------------------
CREATE TABLE task_templates (
  id                  BIGSERIAL PRIMARY KEY,
  name                VARCHAR(150) NOT NULL,
  category            VARCHAR(20) NOT NULL CHECK (category IN ('hogar','cuidados','perro')),
  frequency           VARCHAR(20) NOT NULL CHECK (frequency IN ('diaria','semanal','quincenal','mensual','puntual')),
  default_weight      SMALLINT NOT NULL DEFAULT 2 CHECK (default_weight BETWEEN 1 AND 3),
  default_time_slot   VARCHAR(20) NOT NULL DEFAULT 'flexible' CHECK (default_time_slot IN ('manana','tarde','flexible')),
  display_order       INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- tasks (instancias por hogar)
-- ---------------------------------------------------------------------
CREATE TABLE tasks (
  id            BIGSERIAL PRIMARY KEY,
  household_id  BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  template_id   BIGINT REFERENCES task_templates(id) ON DELETE SET NULL,
  name          VARCHAR(150) NOT NULL,
  category      VARCHAR(20) NOT NULL CHECK (category IN ('hogar','cuidados','perro')),
  frequency     VARCHAR(20) NOT NULL CHECK (frequency IN ('diaria','semanal','quincenal','mensual','puntual')),
  weight        SMALLINT NOT NULL CHECK (weight BETWEEN 1 AND 3),
  time_slot     VARCHAR(20) NOT NULL DEFAULT 'flexible' CHECK (time_slot IN ('manana','tarde','flexible')),
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_household_active ON tasks(household_id, is_active);
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- weekly_availability
-- ---------------------------------------------------------------------
CREATE TABLE weekly_availability (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id  BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  office_days   JSONB NOT NULL,
  confirmed     BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_at  TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_avail_user_week UNIQUE (user_id, week_start)
);
CREATE INDEX idx_avail_household_week ON weekly_availability(household_id, week_start);
CREATE TRIGGER trg_avail_updated_at
  BEFORE UPDATE ON weekly_availability
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- weekly_proposals
-- ---------------------------------------------------------------------
CREATE TABLE weekly_proposals (
  id                  BIGSERIAL PRIMARY KEY,
  household_id        BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_start          DATE NOT NULL,
  status              VARCHAR(30) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','pending_confirmation','confirmed','active')),
  generated_at        TIMESTAMP,
  user1_id            BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user2_id            BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user1_confirmed_at  TIMESTAMP,
  user2_confirmed_at  TIMESTAMP,
  user1_load_score    NUMERIC(6,2),
  user2_load_score    NUMERIC(6,2),
  algorithm_version   VARCHAR(20) NOT NULL DEFAULT 'v1',
  notes               JSONB,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_proposal_household_week UNIQUE (household_id, week_start)
);
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON weekly_proposals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- weekly_assignments
-- ---------------------------------------------------------------------
CREATE TABLE weekly_assignments (
  id            BIGSERIAL PRIMARY KEY,
  proposal_id   BIGINT NOT NULL REFERENCES weekly_proposals(id) ON DELETE CASCADE,
  household_id  BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  task_id       BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assigned_to   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  is_done       BOOLEAN NOT NULL DEFAULT FALSE,
  done_at       TIMESTAMP,
  done_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  soft_violation BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_assign_household_week ON weekly_assignments(household_id, week_start);
CREATE INDEX idx_assign_user_week ON weekly_assignments(assigned_to, week_start);
CREATE INDEX idx_assign_proposal ON weekly_assignments(proposal_id);
CREATE INDEX idx_assign_task ON weekly_assignments(task_id);
CREATE TRIGGER trg_assign_updated_at
  BEFORE UPDATE ON weekly_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- reassignment_requests
-- ---------------------------------------------------------------------
CREATE TABLE reassignment_requests (
  id                BIGSERIAL PRIMARY KEY,
  assignment_id     BIGINT NOT NULL REFERENCES weekly_assignments(id) ON DELETE CASCADE,
  household_id      BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  requested_by      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_to      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason            VARCHAR(500),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','rejected','cancelled')),
  rejection_reason  VARCHAR(500),
  responded_at      TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reassign_status ON reassignment_requests(household_id, status);
CREATE INDEX idx_reassign_assignment ON reassignment_requests(assignment_id);
CREATE TRIGGER trg_reassign_updated_at
  BEFORE UPDATE ON reassignment_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- refresh_tokens
-- ---------------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  CHAR(64) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  revoked_at  TIMESTAMP,
  user_agent  VARCHAR(255),
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_rt_token_hash UNIQUE (token_hash)
);
CREATE INDEX idx_rt_user ON refresh_tokens(user_id, expires_at);

-- ---------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------
CREATE TABLE push_subscriptions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint      VARCHAR(500) NOT NULL,
  p256dh_key    VARCHAR(255) NOT NULL,
  auth_key      VARCHAR(255) NOT NULL,
  user_agent    VARCHAR(255),
  last_used_at  TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ps_endpoint UNIQUE (endpoint)
);
CREATE INDEX idx_ps_user ON push_subscriptions(user_id);

-- =====================================================================
--  SEED — task_templates
-- =====================================================================
INSERT INTO task_templates (name, category, frequency, default_weight, default_time_slot, display_order) VALUES
('Cocinar comida',          'hogar',     'diaria',    2, 'manana',  10),
('Cocinar cena',            'hogar',     'diaria',    2, 'tarde',   20),
('Lavar los platos',        'hogar',     'diaria',    1, 'tarde',   30),
('Compra semanal',          'hogar',     'semanal',   2, 'flexible',40),
('Llevar al cole',          'cuidados',  'diaria',    2, 'manana',  100),
('Recoger del cole',        'cuidados',  'diaria',    2, 'tarde',   110),
('Baño de los niños',       'cuidados',  'diaria',    1, 'tarde',   120),
('Acostar a los niños',     'cuidados',  'diaria',    2, 'tarde',   130),
('Preparar mochilas',       'cuidados',  'diaria',    1, 'tarde',   140),
('Sacar al perro mañana',   'perro',     'diaria',    1, 'manana',  200),
('Sacar al perro mediodía', 'perro',     'diaria',    1, 'flexible',210),
('Sacar al perro noche',    'perro',     'diaria',    1, 'tarde',   220),
('Bañar al perro',          'perro',     'mensual',   2, 'flexible',230),
('Comprar comida del perro','perro',     'mensual',   1, 'flexible',240),
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

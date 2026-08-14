-- -----------------------------------------------------------------------------
-- PERFIN - Current PostgreSQL schema snapshot
-- -----------------------------------------------------------------------------
-- Generated from demo/backend/migrations/001..009 on 2026-08-14.
-- This file describes the final runtime structure after all migrations. It does
-- not contain demo seed data. Migrations remain the source of truth for upgrades.

-- 1. ENUM TYPES

CREATE TYPE category_type AS ENUM ('income', 'expense');
CREATE TYPE wallet_type AS ENUM (
  'cash', 'bank', 'e_wallet', 'credit_card', 'investment', 'savings'
);
CREATE TYPE currency_code AS ENUM ('VND', 'USD');
CREATE TYPE transaction_type AS ENUM (
  'income', 'expense', 'transfer', 'investment_inflow',
  'investment_outflow', 'investment_pnl'
);
CREATE TYPE transaction_source AS ENUM ('manual', 'ai_chat', 'ocr', 'voice');
CREATE TYPE recurring_frequency AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE recurring_status AS ENUM ('active', 'paused');
CREATE TYPE goal_type AS ENUM ('saving', 'debt_payoff', 'purchase');
CREATE TYPE goal_status AS ENUM ('active', 'achieved', 'paused', 'cancelled');
CREATE TYPE feedback_type AS ENUM ('extraction', 'classification');

-- 2. CORE TABLES

CREATE TABLE ai_personalities (
  id               SERIAL PRIMARY KEY,
  key              VARCHAR(50) UNIQUE,
  name             VARCHAR(100) NOT NULL,
  description      TEXT,
  style_prompt     TEXT NOT NULL,
  is_system        BOOLEAN DEFAULT true,
  is_default       BOOLEAN DEFAULT false,
  user_key         VARCHAR(64),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW(),
  name_original    VARCHAR(100),
  sample_responses TEXT
);

CREATE TABLE users (
  id                      SERIAL PRIMARY KEY,
  user_key                VARCHAR(64) UNIQUE NOT NULL,
  username                VARCHAR(100),
  email                   VARCHAR(255),
  password_hash           VARCHAR(255),
  language_preference     VARCHAR(20) DEFAULT 'vi',
  payday                  INTEGER CHECK (payday BETWEEN 1 AND 31),
  active_personality_id   INTEGER CONSTRAINT fk_users_active_personality
                          REFERENCES ai_personalities(id) ON DELETE SET NULL,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW(),
  personalization_consent BOOLEAN DEFAULT false
);

ALTER TABLE ai_personalities
  ADD CONSTRAINT fk_ai_personalities_user_key
  FOREIGN KEY (user_key) REFERENCES users(user_key) ON DELETE CASCADE;

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(64) DEFAULT 'default_user'
              CONSTRAINT fk_categories_user_key
              REFERENCES users(user_key) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  type        category_type NOT NULL,
  icon        VARCHAR(16) DEFAULT '📁',
  parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_default  BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  is_system   BOOLEAN DEFAULT false,
  UNIQUE (user_id, type, name)
);

CREATE TABLE wallets (
  id              SERIAL PRIMARY KEY,
  user_id         VARCHAR(64) DEFAULT 'default_user'
                  CONSTRAINT fk_wallets_user_key
                  REFERENCES users(user_key) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  type            wallet_type NOT NULL DEFAULT 'cash',
  balance         DECIMAL(15, 2) DEFAULT 0,
  currency        currency_code NOT NULL DEFAULT 'VND',
  is_default      BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  initial_balance DECIMAL(15, 2) DEFAULT 0,
  UNIQUE (user_id, name)
);

CREATE TABLE transactions (
  id               SERIAL PRIMARY KEY,
  user_id          VARCHAR(64) DEFAULT 'default_user'
                   CONSTRAINT fk_transactions_user_key
                   REFERENCES users(user_key) ON DELETE CASCADE,
  description      VARCHAR(200) NOT NULL,
  amount           DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  type             transaction_type NOT NULL,
  category_id      INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  wallet_id        INTEGER NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source           transaction_source DEFAULT 'manual',
  note             TEXT,
  original_text    TEXT,
  ai_parsed        JSONB DEFAULT '{}',
  deleted_at       TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE budgets (
  id           SERIAL PRIMARY KEY,
  user_id      VARCHAR(64) DEFAULT 'default_user'
               CONSTRAINT fk_budgets_user_key
               REFERENCES users(user_key) ON DELETE CASCADE,
  category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount_limit DECIMAL(15, 2) NOT NULL CHECK (amount_limit > 0),
  month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, category_id, month, year)
);

CREATE TABLE budget_history (
  id          SERIAL PRIMARY KEY,
  budget_id   INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL,
  old_value   VARCHAR(255),
  new_value   VARCHAR(255),
  changed_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id             SERIAL PRIMARY KEY,
  user_id        VARCHAR(64) DEFAULT 'default_user'
                 CONSTRAINT fk_chat_messages_user_key
                 REFERENCES users(user_key) ON DELETE CASCADE,
  role           VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content        TEXT NOT NULL,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMP DEFAULT NOW(),
  personality_id INTEGER REFERENCES ai_personalities(id) ON DELETE SET NULL
);

-- 3. CASHFLOW, EXPORT, AND BACKUP

CREATE TABLE investment_pnl (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(64) DEFAULT 'default_user'
              CONSTRAINT fk_investment_pnl_user_key
              REFERENCES users(user_key) ON DELETE CASCADE,
  wallet_id   INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount      DECIMAL(15, 2) NOT NULL,
  note        TEXT,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wallet_transfers (
  id               SERIAL PRIMARY KEY,
  user_id          VARCHAR(64) DEFAULT 'default_user'
                   CONSTRAINT fk_wallet_transfers_user_key
                   REFERENCES users(user_key) ON DELETE CASCADE,
  from_wallet_id   INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
  to_wallet_id     INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
  amount           DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  transfer_type    VARCHAR(32) NOT NULL DEFAULT 'transfer',
  note             TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE export_history (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(64) DEFAULT 'default_user'
                CONSTRAINT fk_export_history_user_key
                REFERENCES users(user_key) ON DELETE CASCADE,
  export_type   VARCHAR(20) NOT NULL CHECK (export_type IN ('csv', 'pdf', 'backup')),
  label         VARCHAR(100),
  file_name     VARCHAR(255),
  file_size     INTEGER,
  file_path     TEXT,
  filters       JSONB DEFAULT '{}',
  is_auto       BOOLEAN DEFAULT false,
  status        VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  expires_at    TIMESTAMP
);

CREATE TABLE backup_config (
  id             SERIAL PRIMARY KEY,
  user_id        VARCHAR(64) NOT NULL UNIQUE DEFAULT 'default_user'
                 CONSTRAINT fk_backup_config_user_key
                 REFERENCES users(user_key) ON DELETE CASCADE,
  auto_enabled   BOOLEAN DEFAULT false,
  frequency      VARCHAR(20) DEFAULT 'weekly'
                 CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  keep_count     INTEGER DEFAULT 5,
  last_backup_at TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- 4. RECURRING BILLS

CREATE TABLE recurring_bills (
  id                 SERIAL PRIMARY KEY,
  user_id            VARCHAR(64) DEFAULT 'default_user'
                     CONSTRAINT fk_recurring_bills_user_key
                     REFERENCES users(user_key) ON DELETE CASCADE,
  name               VARCHAR(100) NOT NULL,
  amount             DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  category_id        INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  wallet_id          INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
  frequency          recurring_frequency NOT NULL DEFAULT 'monthly',
  due_day            INTEGER NOT NULL DEFAULT 1,
  next_due_date      DATE NOT NULL,
  remind_days_before INTEGER NOT NULL DEFAULT 0,
  is_variable_amount BOOLEAN DEFAULT false,
  status             recurring_status NOT NULL DEFAULT 'active',
  last_suggested_at  TIMESTAMP,
  note               TEXT,
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recurring_bill_payments (
  id              SERIAL PRIMARY KEY,
  user_id         VARCHAR(64) DEFAULT 'default_user'
                  CONSTRAINT fk_bill_payments_user_key
                  REFERENCES users(user_key) ON DELETE CASCADE,
  bill_id         INTEGER REFERENCES recurring_bills(id) ON DELETE SET NULL,
  bill_name       VARCHAR(100),
  transaction_id  INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  period_due_date DATE NOT NULL,
  paid_date       DATE,
  amount          DECIMAL(15, 2),
  wallet_id       INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'paid'
                  CHECK (status IN ('paid', 'unpaid', 'overdue')),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recurring_suggestions_dismissed (
  id           SERIAL PRIMARY KEY,
  user_id      VARCHAR(64) DEFAULT 'default_user'
               CONSTRAINT fk_recurring_suggestions_user_key
               REFERENCES users(user_key) ON DELETE CASCADE,
  signature    VARCHAR(150) NOT NULL,
  dismissed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, signature)
);

-- 5. GOALS, FEEDBACK, AND PERSONALIZATION

CREATE TABLE financial_goals (
  id                   SERIAL PRIMARY KEY,
  user_id              VARCHAR(64) DEFAULT 'default_user'
                       CONSTRAINT fk_financial_goals_user_key
                       REFERENCES users(user_key) ON DELETE CASCADE,
  name                 VARCHAR(150) NOT NULL,
  goal_type            goal_type NOT NULL DEFAULT 'saving',
  target_amount        DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
  current_amount       DECIMAL(15, 2) NOT NULL DEFAULT 0,
  target_date          DATE,
  monthly_contribution DECIMAL(15, 2),
  annual_interest_rate DECIMAL(6, 3) DEFAULT 0,
  linked_wallet_id     INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
  status               goal_status NOT NULL DEFAULT 'active',
  note                 TEXT,
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_feedback_logs (
  id               SERIAL PRIMARY KEY,
  user_id          VARCHAR(64) DEFAULT 'default_user'
                   CONSTRAINT fk_ai_feedback_user_key
                   REFERENCES users(user_key) ON DELETE CASCADE,
  transaction_id   INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  feedback_type    feedback_type NOT NULL,
  original_text    TEXT,
  ai_result        JSONB,
  corrected_result JSONB,
  created_at       TIMESTAMP DEFAULT NOW(),
  is_anonymized    BOOLEAN DEFAULT false
);

CREATE TABLE user_traits (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
  trait_type  VARCHAR(100) NOT NULL,
  trait_value TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, trait_type)
);

-- 6. MIGRATION METADATA

CREATE TABLE _migrations (
  id          SERIAL PRIMARY KEY,
  filename    VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- 7. INDEXES

CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_active_user_date
  ON transactions(user_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_budgets_category ON budgets(category_id);
CREATE INDEX idx_budgets_period ON budgets(user_id, month, year);
CREATE INDEX idx_chat_messages_user_time ON chat_messages(user_id, created_at DESC);
CREATE UNIQUE INDEX uq_chat_messages_proactive_event
  ON chat_messages(user_id, (metadata->>'event_key'))
  WHERE metadata->>'source' = 'proactive_worker' AND metadata ? 'event_key';
CREATE INDEX idx_pnl_wallet ON investment_pnl(wallet_id);
CREATE INDEX idx_pnl_user_date ON investment_pnl(user_id, recorded_at DESC);
CREATE INDEX idx_transfers_user ON wallet_transfers(user_id, transaction_date DESC);
CREATE INDEX idx_transfers_from ON wallet_transfers(from_wallet_id);
CREATE INDEX idx_transfers_to ON wallet_transfers(to_wallet_id);
CREATE INDEX idx_export_user ON export_history(user_id, created_at DESC);
CREATE INDEX idx_export_auto ON export_history(user_id, is_auto, created_at DESC);
CREATE INDEX idx_recurring_user ON recurring_bills(user_id, status);
CREATE INDEX idx_recurring_due
  ON recurring_bills(user_id, next_due_date) WHERE status = 'active';
CREATE INDEX idx_bill_payments_bill
  ON recurring_bill_payments(bill_id, period_due_date DESC);
CREATE INDEX idx_bill_payments_user
  ON recurring_bill_payments(user_id, period_due_date DESC);
CREATE INDEX idx_suggestions_dismissed_user
  ON recurring_suggestions_dismissed(user_id, dismissed_at DESC);
CREATE INDEX idx_goals_user ON financial_goals(user_id, status);
CREATE INDEX idx_feedback_user
  ON ai_feedback_logs(user_id, feedback_type, created_at DESC);
CREATE INDEX idx_user_traits_user ON user_traits(user_id, trait_type);

-- 8. DOCUMENTATION-COMPATIBILITY VIEWS

CREATE VIEW investment_pl_records AS
SELECT id,
       user_id,
       wallet_id,
       ABS(amount) AS amount,
       CASE WHEN amount >= 0 THEN 'profit' ELSE 'loss' END AS pl_type,
       note,
       recorded_at AS recorded_date,
       created_at,
       updated_at
FROM investment_pnl;

CREATE VIEW export_histories AS
SELECT id,
       user_id,
       export_type,
       file_path AS file_url,
       file_size,
       status,
       is_auto,
       filters::text AS filters_applied,
       created_at
FROM export_history;

CREATE VIEW backup_configs AS
SELECT id,
       user_id,
       auto_enabled,
       frequency,
       keep_count,
       last_backup_at,
       created_at,
       updated_at
FROM backup_config;

-- REQ-08: Recurring Bills & Reminders
-- Version: 004
-- Date: 2026-06-29

DO $$ BEGIN
  CREATE TYPE recurring_frequency AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recurring_status AS ENUM ('active', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Recurring bill definitions (FR-08-01)
CREATE TABLE IF NOT EXISTS recurring_bills (
  id                  SERIAL PRIMARY KEY,
  user_id             VARCHAR(64) DEFAULT 'default_user',
  name                VARCHAR(100) NOT NULL,
  amount              DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  category_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  wallet_id           INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
  frequency           recurring_frequency NOT NULL DEFAULT 'monthly',
  -- due_day: day-of-month (1..31) for monthly/quarterly/yearly; iso day-of-week (1..7) for weekly
  due_day             INTEGER NOT NULL DEFAULT 1,
  next_due_date       DATE NOT NULL,
  remind_days_before  INTEGER NOT NULL DEFAULT 0,      -- 0 = on due date (FR-08-03)
  is_variable_amount  BOOLEAN DEFAULT false,           -- variable bills like electricity (FR-08-02)
  status              recurring_status NOT NULL DEFAULT 'active',
  last_suggested_at   TIMESTAMP,                       -- throttle AI re-suggestion
  note                TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_bills(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_due ON recurring_bills(user_id, next_due_date) WHERE status = 'active';

-- Payment history per period (FR-08-08). bill_id SET NULL keeps history after bill delete (Constraint).
CREATE TABLE IF NOT EXISTS recurring_bill_payments (
  id              SERIAL PRIMARY KEY,
  user_id         VARCHAR(64) DEFAULT 'default_user',
  bill_id         INTEGER REFERENCES recurring_bills(id) ON DELETE SET NULL,
  bill_name       VARCHAR(100),                        -- denormalized snapshot for history
  transaction_id  INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  period_due_date DATE NOT NULL,
  paid_date       DATE,
  amount          DECIMAL(15, 2),
  wallet_id       INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'unpaid', 'overdue')),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bill_payments_bill ON recurring_bill_payments(bill_id, period_due_date DESC);
CREATE INDEX IF NOT EXISTS idx_bill_payments_user ON recurring_bill_payments(user_id, period_due_date DESC);

-- Dismissed AI suggestions: do not re-suggest the same signature for 30 days (FR-08-02)
CREATE TABLE IF NOT EXISTS recurring_suggestions_dismissed (
  id             SERIAL PRIMARY KEY,
  user_id        VARCHAR(64) DEFAULT 'default_user',
  signature      VARCHAR(150) NOT NULL,                -- normalized name|amount-bucket|frequency
  dismissed_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, signature)
);

CREATE INDEX IF NOT EXISTS idx_suggestions_dismissed_user ON recurring_suggestions_dismissed(user_id, dismissed_at DESC);

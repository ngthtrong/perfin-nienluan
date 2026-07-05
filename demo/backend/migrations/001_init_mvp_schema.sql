-- PERFIN MVP schema
-- Version: 001
-- Date: 2026-06-20

DO $$ BEGIN
  CREATE TYPE category_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wallet_type AS ENUM ('cash', 'bank', 'e_wallet', 'credit_card');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE currency_code AS ENUM ('VND', 'USD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_source AS ENUM ('manual', 'ai_chat', 'ocr', 'voice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT 'default_user',
  name VARCHAR(100) NOT NULL,
  type category_type NOT NULL,
  icon VARCHAR(16) DEFAULT '📁',
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, type, name)
);

CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT 'default_user',
  name VARCHAR(100) NOT NULL,
  type wallet_type NOT NULL DEFAULT 'cash',
  balance DECIMAL(15, 2) DEFAULT 0,
  currency currency_code DEFAULT 'VND',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT 'default_user',
  description VARCHAR(200) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  type transaction_type NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source transaction_source DEFAULT 'manual',
  note TEXT,
  original_text TEXT,
  ai_parsed JSONB DEFAULT '{}',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT 'default_user',
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount_limit DECIMAL(15, 2) NOT NULL CHECK (amount_limit > 0),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category_id, month, year)
);

CREATE TABLE IF NOT EXISTS budget_history (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL,
  old_value VARCHAR(255),
  new_value VARCHAR(255),
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT 'default_user',
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_active_user_date ON transactions(user_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_time ON chat_messages(user_id, created_at DESC);

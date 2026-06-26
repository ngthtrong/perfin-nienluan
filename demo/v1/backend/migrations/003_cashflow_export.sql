-- REQ-06: Cashflow & Asset Management
-- REQ-07: Export & Backup
-- Version: 003
-- Date: 2026-06-27

-- ─── REQ-06: Investment Accounts & Cashflow ──────────────────────────────────

-- Extend wallet_type enum with investment types
DO $$ BEGIN
  ALTER TYPE wallet_type ADD VALUE IF NOT EXISTS 'investment';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE wallet_type ADD VALUE IF NOT EXISTS 'savings';
EXCEPTION WHEN others THEN NULL; END $$;

-- Extend transaction_type for cashflow separation
DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'transfer';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'investment_inflow';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'investment_outflow';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'investment_pnl';
EXCEPTION WHEN others THEN NULL; END $$;

-- Investment P&L records (FR-06-05)
CREATE TABLE IF NOT EXISTS investment_pnl (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(64) DEFAULT 'default_user',
  wallet_id     INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount        DECIMAL(15, 2) NOT NULL,        -- positive = profit, negative = loss
  note          TEXT,
  recorded_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pnl_wallet ON investment_pnl(wallet_id);
CREATE INDEX IF NOT EXISTS idx_pnl_user_date ON investment_pnl(user_id, recorded_at DESC);

-- Transfer log: links source_wallet → dest_wallet for transfer/investment_inflow/investment_outflow
CREATE TABLE IF NOT EXISTS wallet_transfers (
  id              SERIAL PRIMARY KEY,
  user_id         VARCHAR(64) DEFAULT 'default_user',
  from_wallet_id  INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
  to_wallet_id    INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
  amount          DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  transfer_type   VARCHAR(32) NOT NULL DEFAULT 'transfer',  -- 'transfer', 'investment_inflow', 'investment_outflow'
  note            TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfers_user ON wallet_transfers(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON wallet_transfers(from_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON wallet_transfers(to_wallet_id);

-- ─── REQ-07: Export & Backup ──────────────────────────────────────────────────

-- Export / backup history log (FR-07-08)
CREATE TABLE IF NOT EXISTS export_history (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(64) DEFAULT 'default_user',
  export_type   VARCHAR(20) NOT NULL CHECK (export_type IN ('csv', 'pdf', 'backup')),
  label         VARCHAR(100),                   -- e.g. "Tháng 5/2026" or "Tự động"
  file_name     VARCHAR(255),
  file_size     INTEGER,                         -- bytes
  file_path     TEXT,                            -- server-side path (may be null after cleanup)
  filters       JSONB DEFAULT '{}',              -- filters applied during export
  is_auto       BOOLEAN DEFAULT false,           -- auto backup flag (FR-07-06)
  status        VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  expires_at    TIMESTAMP                        -- when the file will be auto-deleted
);

CREATE INDEX IF NOT EXISTS idx_export_user ON export_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_auto ON export_history(user_id, is_auto, created_at DESC);

-- Backup config for auto-backup (FR-07-06)
CREATE TABLE IF NOT EXISTS backup_config (
  id              SERIAL PRIMARY KEY,
  user_id         VARCHAR(64) NOT NULL UNIQUE DEFAULT 'default_user',
  auto_enabled    BOOLEAN DEFAULT false,
  frequency       VARCHAR(20) DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  keep_count      INTEGER DEFAULT 5,             -- max auto backups to retain
  last_backup_at  TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Insert default backup config for default user
INSERT INTO backup_config (user_id, auto_enabled) 
VALUES ('default_user', false)
ON CONFLICT (user_id) DO NOTHING;

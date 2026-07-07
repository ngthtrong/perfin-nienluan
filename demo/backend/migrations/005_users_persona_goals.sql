-- REQ-09 (Persona), Goal Planning (Flow 16), Feedback loop (REQ-02)
-- Version: 005
-- Date: 2026-07-08
--
-- Bridges the MVP's string-based user_id ('default_user') with a real users table
-- keyed by user_key, so existing VARCHAR user_id columns keep working while we gain
-- the full documented table set (Phương án A). Migrating every FK to integer is
-- deferred to the auth phase; this is the incremental, low-risk step.

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    SERIAL PRIMARY KEY,
  user_key              VARCHAR(64) UNIQUE NOT NULL,   -- matches transactions.user_id
  username              VARCHAR(100),
  email                 VARCHAR(255),
  password_hash         VARCHAR(255),
  language_preference   VARCHAR(20) DEFAULT 'vi',
  payday                INTEGER CHECK (payday BETWEEN 1 AND 31),  -- salary day-of-month
  active_personality_id INTEGER,                       -- FK added after ai_personalities
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- ── AI Personalities (REQ-09) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_personalities (
  id            SERIAL PRIMARY KEY,
  key           VARCHAR(50) UNIQUE,          -- 'expert' | 'strict_mom' | 'bestie' | 'coach'
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  style_prompt  TEXT NOT NULL,
  is_system     BOOLEAN DEFAULT true,
  is_default    BOOLEAN DEFAULT false,
  user_key      VARCHAR(64),                 -- NULL for system personas
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT fk_users_active_personality
    FOREIGN KEY (active_personality_id) REFERENCES ai_personalities(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Financial Goals (Flow 16) ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE goal_type AS ENUM ('saving', 'debt_payoff', 'purchase');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE goal_status AS ENUM ('active', 'achieved', 'paused', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS financial_goals (
  id                    SERIAL PRIMARY KEY,
  user_id               VARCHAR(64) DEFAULT 'default_user',
  name                  VARCHAR(150) NOT NULL,
  goal_type             goal_type NOT NULL DEFAULT 'saving',
  target_amount         DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
  current_amount        DECIMAL(15, 2) NOT NULL DEFAULT 0,
  target_date           DATE,
  monthly_contribution  DECIMAL(15, 2),        -- suggested or user-set
  annual_interest_rate  DECIMAL(6, 3) DEFAULT 0, -- for debt_payoff amortization (% per year)
  linked_wallet_id      INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
  status                goal_status NOT NULL DEFAULT 'active',
  note                  TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goals_user ON financial_goals(user_id, status);

-- ── AI Feedback Logs (REQ-02 feedback loop) ──────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE feedback_type AS ENUM ('extraction', 'classification');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ai_feedback_logs (
  id                   SERIAL PRIMARY KEY,
  user_id              VARCHAR(64) DEFAULT 'default_user',
  transaction_id       INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  feedback_type        feedback_type NOT NULL,
  original_text        TEXT,                  -- the raw user input
  ai_result            JSONB,                 -- what the AI proposed
  corrected_result     JSONB,                 -- what the user chose instead
  created_at           TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON ai_feedback_logs(user_id, feedback_type, created_at DESC);

-- ── Seed: default user + built-in personas ───────────────────────────────────────
INSERT INTO users (user_key, username, language_preference, payday)
VALUES ('default_user', 'Demo User', 'vi', 25)
ON CONFLICT (user_key) DO NOTHING;

INSERT INTO ai_personalities (key, name, description, style_prompt, is_system, is_default) VALUES
('expert', 'Chuyên gia tài chính', 'Điềm đạm, chuyên nghiệp, dựa trên số liệu.',
 'Bạn là một chuyên gia tài chính điềm đạm, chuyên nghiệp. Giọng văn rõ ràng, khách quan, dùng số liệu để thuyết phục. Đưa lời khuyên cụ thể, khả thi. Không dùng emoji quá đà.', true, true),
('strict_mom', 'Bà mẹ nghiêm khắc', 'Cằn nhằn thương con, kèm lời khuyên thiết thực.',
 'Bạn nhập vai một bà mẹ Việt Nam nghiêm khắc nhưng thương con. Xưng "mẹ", gọi "con". Cằn nhằn khi con tiêu hoang nhưng luôn kèm lời khuyên thiết thực.', true, false),
('bestie', 'Bạn thân', 'Vui tính, gần gũi, thẳng thắn về tiền bạc.',
 'Bạn là một người bạn thân vui tính, xưng "mình/tụi mình". Giọng tếu táo, dùng emoji tự nhiên, động viên nhẹ nhàng nhưng thẳng thắn về tiền bạc.', true, false),
('coach', 'Huấn luyện viên tài chính', 'Năng lượng, tạo động lực, đặt mục tiêu.',
 'Bạn là một huấn luyện viên tài chính đầy năng lượng, tạo động lực. Đặt mục tiêu rõ ràng, thách thức người dùng cải thiện, khen ngợi tiến bộ. Giọng tích cực, quyết đoán.', true, false)
ON CONFLICT (key) DO NOTHING;

-- Point the default user at the default persona.
UPDATE users
SET active_personality_id = (SELECT id FROM ai_personalities WHERE is_default = true ORDER BY id LIMIT 1)
WHERE user_key = 'default_user' AND active_personality_id IS NULL;

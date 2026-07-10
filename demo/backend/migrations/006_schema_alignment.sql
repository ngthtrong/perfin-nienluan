-- Align the incremental MVP schema with the documented PERFIN schema while
-- preserving the existing VARCHAR user keys used by every route.

ALTER TABLE users ADD COLUMN IF NOT EXISTS personalization_consent BOOLEAN DEFAULT false;
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS name_original VARCHAR(100);
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS sample_responses TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS personality_id INTEGER REFERENCES ai_personalities(id) ON DELETE SET NULL;
ALTER TABLE ai_feedback_logs ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS user_traits (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
  trait_type  VARCHAR(100) NOT NULL,
  trait_value TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, trait_type)
);
CREATE INDEX IF NOT EXISTS idx_user_traits_user ON user_traits(user_id, trait_type);

-- Ensure every legacy user key has a parent before adding referential integrity.
INSERT INTO users (user_key, username)
SELECT user_id, user_id FROM (
  SELECT user_id FROM categories
  UNION SELECT user_id FROM wallets
  UNION SELECT user_id FROM transactions
  UNION SELECT user_id FROM budgets
  UNION SELECT user_id FROM chat_messages
  UNION SELECT user_id FROM recurring_bills
  UNION SELECT user_id FROM financial_goals
  UNION SELECT user_id FROM ai_feedback_logs
) legacy_users
WHERE user_id IS NOT NULL
ON CONFLICT (user_key) DO NOTHING;

DO $$ BEGIN
  ALTER TABLE categories ADD CONSTRAINT fk_categories_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE wallets ADD CONSTRAINT fk_wallets_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE budgets ADD CONSTRAINT fk_budgets_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE chat_messages ADD CONSTRAINT fk_chat_messages_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE recurring_bills ADD CONSTRAINT fk_recurring_bills_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE financial_goals ADD CONSTRAINT fk_financial_goals_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ai_feedback_logs ADD CONSTRAINT fk_ai_feedback_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

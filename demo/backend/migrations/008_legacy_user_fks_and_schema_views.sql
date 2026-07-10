-- Complete user-key referential integrity for tables introduced by migrations
-- 003/004 and expose compatibility views using the documented schema names.

INSERT INTO users (user_key, username)
SELECT user_id, user_id FROM (
  SELECT user_id FROM investment_pnl
  UNION SELECT user_id FROM wallet_transfers
  UNION SELECT user_id FROM export_history
  UNION SELECT user_id FROM backup_config
  UNION SELECT user_id FROM recurring_bill_payments
  UNION SELECT user_id FROM recurring_suggestions_dismissed
) legacy_users
WHERE user_id IS NOT NULL
ON CONFLICT (user_key) DO NOTHING;

DO $$ BEGIN
  ALTER TABLE investment_pnl ADD CONSTRAINT fk_investment_pnl_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE wallet_transfers ADD CONSTRAINT fk_wallet_transfers_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE export_history ADD CONSTRAINT fk_export_history_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE backup_config ADD CONSTRAINT fk_backup_config_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE recurring_bill_payments ADD CONSTRAINT fk_bill_payments_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE recurring_suggestions_dismissed ADD CONSTRAINT fk_recurring_suggestions_user_key
    FOREIGN KEY (user_id) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ai_personalities ADD CONSTRAINT fk_ai_personalities_user_key
    FOREIGN KEY (user_key) REFERENCES users(user_key) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE VIEW investment_pl_records AS
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

CREATE OR REPLACE VIEW export_histories AS
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

CREATE OR REPLACE VIEW backup_configs AS
SELECT id,
       user_id,
       auto_enabled,
       frequency,
       keep_count,
       last_backup_at,
       created_at,
       updated_at
FROM backup_config;

-- The reporting ledger is VND-only until an exchange-rate model exists.
-- Existing rows created before currency became mandatory inherit the original
-- application default, then the column is made explicit for every future read.
UPDATE wallets SET currency = 'VND' WHERE currency IS NULL;

ALTER TABLE wallets
  ALTER COLUMN currency SET DEFAULT 'VND',
  ALTER COLUMN currency SET NOT NULL;

-- Classification corrections recorded before type-scoped retrieval can be
-- safely backfilled from their immutable transaction relation. Rows without a
-- transaction remain untyped and are deliberately not used for direct lookup.
UPDATE ai_feedback_logs f
SET corrected_result = CASE
      WHEN jsonb_typeof(f.corrected_result->'transaction') = 'object'
        THEN jsonb_set(f.corrected_result, '{transaction,type}', to_jsonb(t.type::text), true)
      ELSE jsonb_set(COALESCE(f.corrected_result, '{}'::jsonb), '{type}', to_jsonb(t.type::text), true)
    END,
    ai_result = CASE
      WHEN jsonb_typeof(f.ai_result->'transaction') = 'object'
        THEN jsonb_set(f.ai_result, '{transaction,type}', to_jsonb(t.type::text), true)
      ELSE jsonb_set(COALESCE(f.ai_result, '{}'::jsonb), '{type}', to_jsonb(t.type::text), true)
    END
FROM transactions t
WHERE f.feedback_type = 'classification'
  AND f.transaction_id = t.id
  AND (
    COALESCE(f.corrected_result->'transaction'->>'type', f.corrected_result->>'type') IS NULL
    OR COALESCE(f.ai_result->'transaction'->>'type', f.ai_result->>'type') IS NULL
  );

-- Keep the transaction ledger signless: income/expense direction is carried by
-- transaction_type, while amount itself must always be strictly positive.
-- This is idempotent for databases where migration 001 already created the
-- check, and deliberately fails instead of guessing how to repair bad rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM transactions
    WHERE amount <= 0
  ) THEN
    RAISE EXCEPTION 'transactions contains amount <= 0; review data before applying the positive amount invariant';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'transactions'::regclass
      AND contype = 'c'
      AND pg_get_expr(conbin, conrelid) = '(amount > (0)::numeric)'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_amount_positive_check CHECK (amount > 0);
  END IF;
END $$;

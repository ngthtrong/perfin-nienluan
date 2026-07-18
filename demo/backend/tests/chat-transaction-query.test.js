const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../config/database');
const modelPath = require.resolve('../models/transaction.model');
const database = require(databasePath);
const originalQuery = database.query;

let queryImpl = async () => ({ rows: [], rowCount: 0 });
database.query = (...args) => queryImpl(...args);
delete require.cache[modelPath];
const TransactionModel = require(modelPath);

test.after(() => {
  database.query = originalQuery;
  delete require.cache[modelPath];
});

test('chat aggregate totals scan the full filtered set without a result limit', async () => {
  queryImpl = async (sql, params) => {
    assert.match(sql, /COUNT\(\*\)/);
    assert.doesNotMatch(sql, /\bLIMIT\b/i);
    assert.match(sql, /description ILIKE \$5/);
    assert.deepEqual(params, [
      'u-chat',
      '2026-07-01',
      '2026-07-31',
      'expense',
      '%đánh bida%',
    ]);
    return {
      rows: [{ transaction_count: '3', total_income: '0', total_expense: '450000', total_amount: '450000' }],
      rowCount: 1,
    };
  };

  const result = await TransactionModel.getFilteredTotals('u-chat', {
    from: '2026-07-01',
    to: '2026-07-31',
    type: 'expense',
    search: 'đánh bida',
  });

  assert.deepEqual(result, {
    transaction_count: 3,
    total_income: 0,
    total_expense: 450000,
    total_amount: 450000,
  });
});

test('exact chat transaction ids are deduplicated, bounded, and user-scoped', async () => {
  queryImpl = async (sql, params) => {
    assert.match(sql, /t\.user_id = \$1/);
    assert.match(sql, /t\.id = ANY\(\$2::int\[\]\)/);
    assert.match(sql, /array_position\(\$2::int\[\], t\.id\)/);
    assert.deepEqual(params, ['u-chat', [8, 3]]);
    return { rows: [{ id: 8 }, { id: 3 }], rowCount: 2 };
  };

  const result = await TransactionModel.getByIds([8, '3', 8, -1, 'x'], 'u-chat');
  assert.deepEqual(result.map((row) => row.id), [8, 3]);
});

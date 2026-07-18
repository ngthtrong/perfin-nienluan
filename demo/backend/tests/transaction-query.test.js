const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeTransactionQuery } = require('../services/transactions/query');

test('transaction query normalizes every supported filter and pagination field', () => {
  const result = normalizeTransactionQuery({
    from: '2026-07-01',
    to: '2026-07-31',
    category_id: '9',
    type: 'expense',
    search: '  bida  ',
    sort_by: 'amount',
    sort_order: 'ASC',
    page: '3',
    limit: '100',
  });

  assert.deepEqual(result, {
    from: '2026-07-01',
    to: '2026-07-31',
    category_id: 9,
    type: 'expense',
    search: 'bida',
    sort_by: 'amount',
    sort_order: 'asc',
    page: 3,
    limit: 100,
  });
});

test('transaction query rejects malformed dates, ranges, filters and unsafe sort fields', () => {
  assert.throws(() => normalizeTransactionQuery({ from: '2026-02-30' }), /YYYY-MM-DD/);
  assert.throws(
    () => normalizeTransactionQuery({ from: '2026-08-01', to: '2026-07-01' }),
    /không được sau/
  );
  assert.throws(() => normalizeTransactionQuery({ type: 'transfer' }), /Loại giao dịch/);
  assert.throws(() => normalizeTransactionQuery({ category_id: '-2' }), /Danh mục/);
  assert.throws(() => normalizeTransactionQuery({ sort_by: 'amount; DROP TABLE transactions' }), /sắp xếp/);
  assert.throws(() => normalizeTransactionQuery({ limit: '101' }), /Số dòng/);
  assert.throws(() => normalizeTransactionQuery({ page: ['1', '2'] }), /Trang/);
});

test('transaction model parameterizes filters, applies whitelisted sorting and exposes full pagination metadata', async () => {
  const databasePath = require.resolve('../config/database');
  const modelPath = require.resolve('../models/transaction.model');
  const database = require(databasePath);
  const originalQuery = database.query;
  const calls = [];

  database.query = async (sql, params) => {
    calls.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params: [...params] });
    if (/SELECT COUNT\(\*\)/.test(sql)) return { rows: [{ count: '205' }], rowCount: 1 };
    return { rows: [{ id: 7, description: 'Bida' }], rowCount: 1 };
  };
  delete require.cache[modelPath];
  const TransactionModel = require(modelPath);

  try {
    const result = await TransactionModel.getAll('u1', {
      from: '2026-07-01',
      to: '2026-07-31',
      category_id: 4,
      type: 'expense',
      search: "bida%' OR 1=1 --",
      sort_by: 'amount',
      sort_order: 'asc',
      page: 2,
      limit: 100,
    });

    assert.equal(calls.length, 2);
    assert.match(calls[1].sql, /ORDER BY t\.amount ASC, t\.transaction_date DESC/);
    assert.doesNotMatch(calls[1].sql, /OR 1=1/);
    assert.equal(calls[1].params.includes("%bida%' OR 1=1 --%"), true);
    assert.deepEqual(calls[1].params.slice(-2), [100, 100]);
    assert.deepEqual(result.pagination, {
      page: 2,
      limit: 100,
      total: 205,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    assert.equal(result.total, 205);
  } finally {
    database.query = originalQuery;
    delete require.cache[modelPath];
  }
});

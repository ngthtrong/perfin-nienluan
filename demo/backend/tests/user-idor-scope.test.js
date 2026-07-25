const test = require('node:test');
const assert = require('node:assert/strict');

// Regression guard: budget and recurring-bill lookups by id must always carry a
// user_id predicate. Ids are sequential integers, so an id-only WHERE clause
// lets any caller read/modify/delete another user's row by changing the URL.
// These tests assert on the emitted SQL, not just the return value, because a
// missing predicate still returns the "right" row for the single demo profile.
//
// Models destructure `query` at require time, so the stub must be installed
// BEFORE the model is loaded — hence the require.cache juggling.
function withStubbedQuery(modelRelPath, impl, run) {
  const database = require('../config/database');
  const modelPath = require.resolve(modelRelPath);
  const originalQuery = database.query;
  database.query = impl;
  delete require.cache[modelPath];
  try {
    return run(require(modelPath));
  } finally {
    database.query = originalQuery;
    delete require.cache[modelPath];
  }
}

function recorder(result = { rows: [{ id: 5, amount_limit: 100000 }], rowCount: 1 }) {
  const seen = [];
  const impl = async (sql, params) => {
    seen.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params });
    return typeof result === 'function' ? result(sql, params) : result;
  };
  return { seen, impl };
}

test('budget read and delete by id are scoped to the caller', async () => {
  const { seen, impl } = recorder();
  await withStubbedQuery('../models/budget.model', impl, async (BudgetModel) => {
    await BudgetModel.getById(5, 'user-2');
    await BudgetModel.delete(5, 'user-2');
  });

  const scoped = seen.filter((entry) => /FROM budgets|DELETE FROM budgets/.test(entry.sql));
  assert.equal(scoped.length, 2);
  for (const entry of scoped) {
    assert.match(entry.sql, /user_id = \$2/, `missing user scope: ${entry.sql}`);
    assert.equal(entry.params[1], 'user-2');
  }
});

test('budget update refuses to write when the row belongs to another user', async () => {
  // Scoped SELECT finds nothing → update must bail out before any write.
  const { seen, impl } = recorder({ rows: [], rowCount: 0 });
  const result = await withStubbedQuery('../models/budget.model', impl,
    (BudgetModel) => BudgetModel.update(5, { amount_limit: 999 }, 'attacker'));

  assert.equal(result, null);
  const sqls = seen.map((entry) => entry.sql);
  assert.equal(sqls.some((sql) => /UPDATE budgets/.test(sql)), false,
    'update must not run when the scoped lookup finds nothing');
  assert.equal(sqls.some((sql) => /budget_history/.test(sql)), false,
    'history must not be written for a rejected update');
});

test('recurring bill lookup, pause and payment history are scoped to the caller', async () => {
  const { seen, impl } = recorder();
  await withStubbedQuery('../models/recurringBill.model', impl, async (RecurringBillModel) => {
    await RecurringBillModel.getById(5, 'user-2');
    await RecurringBillModel.pause(5, 'user-2');
    await RecurringBillModel.getPaymentHistory(5, 'user-2');
  });

  const relevant = seen.filter((entry) => /recurring_bills|recurring_bill_payments/.test(entry.sql));
  assert.ok(relevant.length >= 3, `expected at least 3 scoped queries, saw ${relevant.length}`);
  for (const entry of relevant) {
    assert.match(entry.sql, /user_id = \$2/, `missing user scope: ${entry.sql}`);
    assert.equal(entry.params[1], 'user-2');
  }
});

test('recurring bill delete scopes both the lookup and the delete', async () => {
  const { seen, impl } = recorder();
  await withStubbedQuery('../models/recurringBill.model', impl,
    (RecurringBillModel) => RecurringBillModel.delete(5, 'user-2'));

  const deletes = seen.filter((entry) => /DELETE FROM recurring_bills/.test(entry.sql));
  assert.equal(deletes.length, 1);
  assert.match(deletes[0].sql, /WHERE id = \$1 AND user_id = \$2/);
  assert.equal(deletes[0].params[1], 'user-2');
});

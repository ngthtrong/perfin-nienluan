const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../config/database');
const analyticsPath = require.resolve('../models/analytics.model');
const budgetPath = require.resolve('../models/budget.model');
const database = require(databasePath);

const originalQuery = database.query;
let queryImpl = async () => ({ rows: [], rowCount: 0 });
database.query = (...args) => queryImpl(...args);
delete require.cache[analyticsPath];
delete require.cache[budgetPath];

const AnalyticsModel = require(analyticsPath);
const BudgetModel = require(budgetPath);

test.after(() => {
  database.query = originalQuery;
  delete require.cache[analyticsPath];
  delete require.cache[budgetPath];
});

test('goal cashflow history uses completed months and preserves zero months', async () => {
  let captured;
  queryImpl = async (sql, params) => {
    captured = { sql: String(sql), params };
    return {
      rows: [
        { ym: '2026-04', income: 9_000_000, expense: 4_000_000 },
        { ym: '2026-06', income: 10_000_000, expense: 5_000_000 },
      ],
      rowCount: 2,
    };
  };

  const rows = await AnalyticsModel.monthlyCashflow('u1', 3, { asOf: '2026-07-17' });

  assert.deepEqual(captured.params, ['u1', '2026-07-17', 3]);
  assert.match(captured.sql, /- \(\$3::int \* INTERVAL '1 month'\)/);
  assert.match(captured.sql, /transaction_date < date_trunc\('month', \$2::date\)/);
  assert.deepEqual(rows, [
    { ym: '2026-04', income: 9_000_000, expense: 4_000_000 },
    { ym: '2026-05', income: 0, expense: 0 },
    { ym: '2026-06', income: 10_000_000, expense: 5_000_000 },
  ]);
});

test('category trend history excludes the current partial month and fills missing completed months', async () => {
  let captured;
  queryImpl = async (sql, params) => {
    captured = { sql: String(sql), params };
    return {
      rows: [
        { category_name: 'Ăn uống', icon: '🍜', ym: '2026-04', total: 400_000 },
        { category_name: 'Ăn uống', icon: '🍜', ym: '2026-06', total: 600_000 },
      ],
      rowCount: 2,
    };
  };

  const result = await AnalyticsModel.monthlyByCategory('u1', 3, { asOf: '2026-07-17' });

  assert.deepEqual(captured.params, ['u1', '2026-07-17', 3]);
  assert.match(captured.sql, /transaction_date < date_trunc\('month', \$2::date\)/);
  assert.deepEqual(result['Ăn uống'].series, [
    { ym: '2026-04', total: 400_000 },
    { ym: '2026-05', total: 0 },
    { ym: '2026-06', total: 600_000 },
  ]);
});

test('category correlation query reads exactly the requested completed ISO weeks', async () => {
  let captured;
  queryImpl = async (sql, params) => {
    captured = { sql: String(sql), params };
    return {
      rows: [{ category_name: 'Ăn uống', yw: '2026-27', total: 125_000 }],
      rowCount: 1,
    };
  };

  const rows = await AnalyticsModel.weeklyByCategory('u1', 12, { asOf: '2026-07-17' });

  assert.deepEqual(captured.params, ['u1', '2026-07-17', 12]);
  assert.match(captured.sql, /transaction_date >= date_trunc\('week', \$2::date\) - \(\$3::int \* INTERVAL '1 week'\)/);
  assert.match(captured.sql, /transaction_date < date_trunc\('week', \$2::date\)/);
  assert.deepEqual(rows, [{ category: 'Ăn uống', yw: '2026-27', total: 125_000 }]);
});

test('budget recommendation history excludes the current partial month', async () => {
  let captured;
  queryImpl = async (sql, params) => {
    captured = { sql: String(sql), params };
    return { rows: [], rowCount: 0 };
  };

  await BudgetModel.getRecommendationHistory('u1', { months: 6, asOf: '2026-07-17' });

  assert.deepEqual(captured.params, ['u1', '2026-07-17', 6]);
  assert.match(captured.sql, /- \(\$3::int \* INTERVAL '1 month'\)/);
  assert.match(captured.sql, /t\.transaction_date < DATE_TRUNC\('month', \$2::date\)/);
  assert.doesNotMatch(captured.sql, /DATE_TRUNC\('month', \$2::date\) \+ INTERVAL '1 month'/);
});

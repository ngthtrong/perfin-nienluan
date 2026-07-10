const test = require('node:test');
const assert = require('node:assert/strict');
const { daysInMonth, forecastBudget, forecastBudgets } = require('../services/budgets/forecast');

test('budget forecast detects a likely overrun and projected day', () => {
  const result = forecastBudget(
    { category_id: 1, spent: 600000, amount_limit: 1000000, percentage: 60, status: 'safe' },
    { today: new Date('2026-07-10T12:00:00+07:00'), month: 7, year: 2026 }
  );
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(result.projected_spend, 1860000);
  assert.equal(result.likely_to_exceed, true);
  assert.equal(result.projected_exceed_day, 17);
});

test('budget forecast leaves a low burn budget safe', () => {
  const [result] = forecastBudgets(
    [{ spent: 100000, amount_limit: 1000000 }],
    { today: new Date('2026-07-20T12:00:00+07:00'), month: 7, year: 2026 }
  );
  assert.equal(result.likely_to_exceed, false);
  assert.equal(result.projected_exceed_day, null);
});

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.TZ = 'Asia/Ho_Chi_Minh';

const { mean, linearTrend, cashflowRunway } = require('../services/analytics/algorithms');
const {
  completeDailyTotals,
  completeMonthlyByCategory,
  completeMonthlyCashflow,
} = require('../services/analytics/timeSeries');

test('runway average preserves zero-spend calendar days', () => {
  const daily = completeDailyTotals([
    { day: '2026-07-13', total: 700_000 },
  ], 7, '2026-07-19');

  assert.deepEqual(daily.map((point) => point.value), [700_000, 0, 0, 0, 0, 0, 0]);
  const runway = cashflowRunway(700_000, daily.map((point) => point.value), {
    today: new Date('2026-07-19T00:00:00.000Z'),
  });
  assert.equal(runway.avgBurn, 100_000);
  assert.equal(runway.daysLeft, 7);
  assert.equal(runway.depletionDate, '2026-07-26');
});

test('runway depletion date remains a local calendar date around midnight', () => {
  const runway = cashflowRunway(200_000, [100_000], {
    today: new Date(2026, 6, 19, 0, 30, 0, 0),
  });
  assert.equal(runway.depletionDate, '2026-07-21');
});

test('category trend keeps empty months on the OLS time axis', () => {
  const dense = completeMonthlyByCategory([
    { category_name: 'Ăn uống', icon: '🍜', ym: '2026-01', total: 100 },
    { category_name: 'Ăn uống', icon: '🍜', ym: '2026-03', total: 300 },
    { category_name: 'Ăn uống', icon: '🍜', ym: '2026-04', total: 400 },
  ], 4, '2026-04');

  assert.deepEqual(dense['Ăn uống'].series, [
    { ym: '2026-01', total: 100 },
    { ym: '2026-02', total: 0 },
    { ym: '2026-03', total: 300 },
    { ym: '2026-04', total: 400 },
  ]);
  assert.equal(linearTrend(dense['Ăn uống'].series.map((point) => point.total)).slope, 120);
});

test('monthly cashflow averages over the requested calendar window', () => {
  const dense = completeMonthlyCashflow([
    { ym: '2026-01', income: 600, expense: 0 },
    { ym: '2026-03', income: 0, expense: 300 },
  ], 3, '2026-03');

  assert.deepEqual(dense, [
    { ym: '2026-01', income: 600, expense: 0 },
    { ym: '2026-02', income: 0, expense: 0 },
    { ym: '2026-03', income: 0, expense: 300 },
  ]);
  assert.equal(mean(dense.map((row) => row.income)), 200);
  assert.equal(mean(dense.map((row) => row.expense)), 100);
});

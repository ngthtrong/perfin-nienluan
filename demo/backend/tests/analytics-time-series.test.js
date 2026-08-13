const test = require('node:test');
const assert = require('node:assert/strict');

process.env.TZ = 'Asia/Ho_Chi_Minh';

const {
  mean,
  linearTrend,
  cashflowRunway,
  pearson,
  pearsonDetailed,
} = require('../services/analytics/algorithms');
const {
  completeDailyTotals,
  completeMonthlyByCategory,
  completeMonthlyCashflow,
  completeWeeklyByCategory,
  recentCompletedWeekKeys,
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

test('runway reports an already depleted balance as zero days without a past date', () => {
  const today = new Date(2026, 6, 19, 9, 0, 0, 0);
  const runway = cashflowRunway(-1_328_000, [73_046, 73_046], {
    today,
    payday: 25,
  });

  assert.equal(runway.daysLeft, 0);
  assert.equal(runway.depletionDate, '2026-07-19');
  assert.equal(runway.alreadyDepleted, true);
  assert.equal(runway.beforePayday, true);
  assert.ok(runway.daysBeforePayday >= 0);
});

test('runway clamps a day-31 payday to the last day of a short month', () => {
  const runway = cashflowRunway(0, [100], {
    today: new Date(2026, 0, 31, 9, 0, 0, 0),
    payday: 31,
  });

  assert.equal(runway.beforePayday, true);
  assert.equal(runway.daysBeforePayday, 28);
});

test('runway still reports depletion when balance is zero and burn history is empty', () => {
  const runway = cashflowRunway(0, [], {
    today: new Date(2026, 6, 19, 9, 0, 0, 0),
  });

  assert.equal(runway.avgBurn, 0);
  assert.equal(runway.daysLeft, 0);
  assert.equal(runway.depletionDate, '2026-07-19');
  assert.equal(runway.alreadyDepleted, true);
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

test('completed ISO-week axis excludes the current partial week across an ISO year boundary', () => {
  assert.deepEqual(recentCompletedWeekKeys(3, '2026-01-07'), [
    '2025-51',
    '2025-52',
    '2026-01',
  ]);
});

test('category correlation uses one shared completed-week axis with missing weeks filled by zero', () => {
  const completed = completeWeeklyByCategory([
    { category: 'Ăn uống', yw: '2025-51', total: 100 },
    { category: 'Ăn uống', yw: '2026-01', total: 300 },
    { category: 'Di chuyển', yw: '2025-51', total: 200 },
    { category: 'Di chuyển', yw: '2026-01', total: 600 },
  ], 3, '2026-01-07');

  assert.deepEqual(completed.axis, ['2025-51', '2025-52', '2026-01']);
  assert.deepEqual(completed.categories['Ăn uống'], {
    observedPeriods: 2,
    series: [
      { yw: '2025-51', total: 100 },
      { yw: '2025-52', total: 0 },
      { yw: '2026-01', total: 300 },
    ],
  });
  assert.equal(
    pearson(
      completed.categories['Ăn uống'].series.map((point) => point.total),
      completed.categories['Di chuyển'].series.map((point) => point.total)
    ),
    1
  );
});

test('Pearson reports undefined for insufficient or zero-variance series', () => {
  assert.equal(pearson([1, 2], [1, 2]), null);
  assert.equal(pearson([4, 4, 4], [1, 2, 3]), null);
  assert.equal(pearson([1, 2, 3], [8, 8, 8]), null);
  assert.equal(pearson([1, 2, 3], [2, 4, 6]), 1);
});

test('correlation guard excludes joint-zero weeks and reports effective support', () => {
  const detail = pearsonDetailed(
    [0, 0, 10, 20, 30, 40],
    [0, 0, 40, 30, 20, 10],
    { excludeJointZeros: true },
  );

  assert.equal(detail.effective_pair_count, 4);
  assert.equal(detail.excluded_joint_zero_count, 2);
  assert.equal(detail.r, -1);
  assert.equal(
    pearsonDetailed([0, 0, 10], [0, 0, 20], { excludeJointZeros: true }).effective_pair_count,
    1,
  );
});

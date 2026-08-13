const test = require('node:test');
const assert = require('node:assert/strict');

process.env.TZ = 'Asia/Ho_Chi_Minh';

const modelPath = require.resolve('../models/analytics.model');
const accountPath = require.resolve('../models/account.model');
const enginePath = require.resolve('../services/analytics');
const AnalyticsModel = require(modelPath);
const AccountModel = require(accountPath);
const { recentCompletedWeekKeys } = require('../services/analytics/timeSeries');

const originalAnalytics = {
  monthlyByCategory: AnalyticsModel.monthlyByCategory,
  dailyExpenses: AnalyticsModel.dailyExpenses,
  recentTransactions: AnalyticsModel.recentTransactions,
  dayOfWeekSpending: AnalyticsModel.dayOfWeekSpending,
  weeklyByCategory: AnalyticsModel.weeklyByCategory,
};
const originalGetAll = AccountModel.getAll;

let recentTransactionWindow = null;

AnalyticsModel.monthlyByCategory = async () => ({
  'Ăn uống': {
    icon: '🍜',
    series: [100, 120, 145, 175, 210, 255]
      .map((total, index) => ({ ym: `2026-0${index + 1}`, total })),
  },
});
AnalyticsModel.dailyExpenses = async (_userId, days) => (
  Array.from({ length: days }, (_, index) => ({ label: `day-${index + 1}`, value: 100 }))
);
AnalyticsModel.recentTransactions = async (_userId, days) => {
  recentTransactionWindow = days;
  return ['2025-10-01', '2026-01-01', '2026-04-01'].map((transaction_date) => ({
    description: 'Bảo hiểm quý',
    amount: 900_000,
    transaction_date,
    type: 'expense',
  }));
};
AnalyticsModel.dayOfWeekSpending = async () => [
  { dow: 1, avgPerActiveDay: 100 },
  { dow: 2, avgPerActiveDay: 100 },
  { dow: 3, avgPerActiveDay: 100 },
  { dow: 4, avgPerActiveDay: 1_000 },
];
AnalyticsModel.weeklyByCategory = async () => {
  const activeWeeks = recentCompletedWeekKeys(12).slice(-4);
  return activeWeeks.flatMap((yw, index) => [
    { category: 'Ăn uống', yw, total: (index + 1) * 100 },
    { category: 'Di chuyển', yw, total: (index + 1) * 200 },
    ...(index < 3 ? [{ category: 'Mẫu quá ít', yw, total: index + 1 }] : []),
  ]);
};
AccountModel.getAll = async () => [
  { type: 'cash', currency: 'VND', balance: 100 },
  { type: 'bank', currency: 'VND', balance: 200 },
  { type: 'cash', currency: 'USD', balance: 10_000 },
  { type: 'investment', currency: 'VND', balance: 20_000 },
];

delete require.cache[enginePath];
const AnalyticsEngine = require(enginePath);

test.after(() => {
  Object.assign(AnalyticsModel, originalAnalytics);
  AccountModel.getAll = originalGetAll;
  delete require.cache[enginePath];
});

test('analytics engine integrates fixed windows, wallet policy, correlation axis, and fact metadata', async () => {
  const runway = await AnalyticsEngine.runwayFacts('u1');
  assert.equal(runway.totalBalance, 300);
  assert.equal(runway.currency, 'VND');
  assert.equal(runway.avgBurn, 100);
  assert.equal(runway.daysLeft, 3);

  const subscriptions = await AnalyticsEngine.subscriptionFacts('u1', 200, { asOf: '2026-04-02' });
  assert.equal(recentTransactionWindow, 200);
  assert.equal(subscriptions.subscriptions[0].frequency, 'quarterly');
  assert.equal(subscriptions.totalMonthly, 300_000);

  const correlation = await AnalyticsEngine.correlationFacts('u1');
  assert.deepEqual(correlation, {
    a: 'Ăn uống',
    b: 'Di chuyển',
    r: 1,
    effective_pair_count: 4,
    excluded_joint_zero_count: 8,
  });

  const facts = await AnalyticsEngine.buildInsightFacts('u1', { useCache: false });
  assert.equal(facts.schema_version, '1.0');
  assert.deepEqual(facts.degraded_components, []);
  assert.equal(facts.metadata.components.trend.window.unit, 'completed_month');
  assert.equal(facts.metadata.components.trend.sample_count, 6);
  assert.deepEqual(facts.metadata.components.trend.parameters, {
    minimum_observed_periods: 3,
    minimum_average_percent_change: 10,
    minimum_r2: 0.5,
    slope_direction: 'positive',
  });
  assert.equal(facts.metadata.components.anomaly.parameters.z_threshold, 2.5);
  assert.equal(facts.metadata.components.anomaly.parameters.iqr_k, 1.5);
  assert.equal(facts.metadata.components.runway.wallet_count, 2);
  assert.deepEqual(facts.metadata.components.runway.parameters.wallet_types, ['cash', 'bank', 'e_wallet']);
  assert.equal(facts.metadata.components.runway.parameters.currency, 'VND');
  assert.deepEqual(facts.metadata.components.runway.warnings, ['non_liquid_or_non_vnd_wallets_excluded']);
  assert.equal(facts.metadata.components.subscriptions.window.size, 200);
  assert.equal(facts.metadata.components.subscriptions.parameters.min_occurrences, 3);
  assert.equal(facts.metadata.components.subscriptions.parameters.amount_tolerance, 0.15);
  assert.equal(facts.metadata.components.subscriptions.parameters.max_cadence_cv, 0.12);
  assert.deepEqual(
    facts.metadata.components.subscriptions.parameters.cadences.map(({ frequency, min_days, max_days }) => ({
      frequency,
      min_days,
      max_days,
    })),
    [
      { frequency: 'weekly', min_days: 5, max_days: 9 },
      { frequency: 'monthly', min_days: 26, max_days: 35 },
      { frequency: 'quarterly', min_days: 80, max_days: 100 },
    ]
  );
  assert.equal(facts.metadata.components.correlation.window.unit, 'completed_week');
  assert.equal(facts.metadata.components.correlation.sample_count, 12);
  assert.equal(facts.metadata.components.correlation.category_count, 2);
  assert.equal(facts.metadata.components.correlation.parameters.minimum_r, 0.6);
  assert.equal(facts.metadata.components.correlation.parameters.minimum_observed_periods_per_category, 4);
  assert.equal(facts.metadata.components.day_of_week.parameters.minimum_peak_ratio, 1.8);
  assert.ok(facts.metadata.components.correlation.warnings.includes('association_not_causation'));
});

test('degraded component retains the metadata contract without exposing an error message', async () => {
  const original = AnalyticsModel.monthlyByCategory;
  AnalyticsModel.monthlyByCategory = async () => {
    throw new Error('database credentials must not leak');
  };
  try {
    const facts = await AnalyticsEngine.buildInsightFacts('u1', { useCache: false });
    assert.equal(facts.trend, null);
    assert.ok(facts.degraded_components.includes('trend'));
    assert.deepEqual({
      unit: facts.metadata.components.trend.unit,
      window: facts.metadata.components.trend.window,
      method: facts.metadata.components.trend.method,
      sample_count: facts.metadata.components.trend.sample_count,
      warnings: facts.metadata.components.trend.warnings,
      status: facts.metadata.components.trend.status,
    }, {
      unit: 'VND_per_month',
      window: { size: 6, unit: 'completed_month', zero_filled: true },
      method: 'ordinary_least_squares',
      sample_count: null,
      warnings: ['component_failed'],
      status: 'degraded',
    });
    assert.equal(facts.metadata.components.trend.parameters.minimum_r2, 0.5);
    assert.doesNotMatch(JSON.stringify(facts), /database credentials/);
  } finally {
    AnalyticsModel.monthlyByCategory = original;
  }
});

test('zero-filled axes do not turn one or two active periods into a trend or anomaly baseline', async () => {
  const originalMonthly = AnalyticsModel.monthlyByCategory;
  const originalDaily = AnalyticsModel.dailyExpenses;
  AnalyticsModel.monthlyByCategory = async () => ({
    'Mẫu thưa': {
      icon: '•',
      series: [0, 0, 0, 0, 100, 140].map((total, index) => ({ ym: `2026-0${index + 1}`, total })),
    },
  });
  AnalyticsModel.dailyExpenses = async () => (
    Array.from({ length: 30 }, (_, index) => ({ label: `day-${index + 1}`, value: index === 29 ? 100_000 : 0 }))
  );
  try {
    assert.equal(await AnalyticsEngine.trendFacts('sparse'), null);
    assert.equal(await AnalyticsEngine.anomalyFacts('sparse'), null);
  } finally {
    AnalyticsModel.monthlyByCategory = originalMonthly;
    AnalyticsModel.dailyExpenses = originalDaily;
  }
});

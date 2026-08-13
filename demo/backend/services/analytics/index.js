// Vai trò: Điều phối Analytics Engine và tạo contract facts thống nhất cho báo cáo.
// Luồng chính: lấy dữ liệu đã scope, chạy từng thuật toán độc lập, gắn metadata rồi cache.
// Các con số do hàm xác định tính; LLM chỉ được dùng để diễn giải facts đã có.

const AnalyticsModel = require('../../models/analytics.model');
const AccountModel = require('../../models/account.model');
const algo = require('./algorithms');
const { CADENCES, mineSubscriptions } = require('./subscriptionMiner');
const { completeWeeklyByCategory } = require('./timeSeries');
const {
  RUNWAY_CURRENCY,
  RUNWAY_WALLET_TYPES,
  isRunwayEligibleWallet,
  sumRunwayBalance,
} = require('./walletPolicy');
const KVStore = require('../store/kv.store');

const DEFAULT_USER = 'default_user';
const CACHE_TTL = 600; // 10 min — insights are expensive; recompute infrequently

const ANALYTICS_WINDOWS = Object.freeze({
  trendMonths: 6,
  anomalyDays: 30,
  runwayDays: 14,
  subscriptionDays: 200,
  dayOfWeekDays: 60,
  correlationWeeks: 12,
});

const FACTS_SCHEMA_VERSION = '1.0';

const ANALYTICS_PARAMETERS = Object.freeze({
  trend: Object.freeze({
    minimum_observed_periods: 3,
    minimum_average_percent_change: 10,
    minimum_r2: 0.5,
    slope_direction: 'positive',
  }),
  anomaly: Object.freeze({
    minimum_observed_days: 4,
    z_threshold: 2.5,
    iqr_k: 1.5,
    tail: 'upper',
  }),
  runway: Object.freeze({
    currency: RUNWAY_CURRENCY,
    wallet_types: Object.freeze([...RUNWAY_WALLET_TYPES]),
  }),
  subscriptions: Object.freeze({
    min_occurrences: 3,
    amount_tolerance: 0.15,
    max_cadence_cv: 0.12,
    max_amount: null,
    recency_rule: 'last_seen_within_cadence_max_days',
    cadences: Object.freeze(CADENCES.map((cadence) => Object.freeze({
      frequency: cadence.frequency,
      expected_days: cadence.expectedDays,
      min_days: cadence.minDays,
      max_days: cadence.maxDays,
      monthly_factor: cadence.monthlyFactor,
    }))),
  }),
  day_of_week: Object.freeze({
    minimum_observed_weekdays: 4,
    minimum_peak_ratio: 1.8,
  }),
  correlation: Object.freeze({
    minimum_paired_observations: 3,
    minimum_effective_pairs: 4,
    minimum_observed_periods_per_category: 4,
    minimum_r: 0.6,
    direction: 'positive',
  }),
});

// Stable fields remain present even when one component fails. Dynamic fields
// such as sample_count and category_count are added by each analysis.
const COMPONENT_CONTRACTS = Object.freeze({
  trend: Object.freeze({
    unit: 'VND_per_month',
    window: Object.freeze({ size: ANALYTICS_WINDOWS.trendMonths, unit: 'completed_month', zero_filled: true }),
    method: 'ordinary_least_squares',
    parameters: ANALYTICS_PARAMETERS.trend,
  }),
  anomaly: Object.freeze({
    unit: 'VND_per_day',
    window: Object.freeze({ size: ANALYTICS_WINDOWS.anomalyDays, unit: 'calendar_day', zero_filled: true }),
    method: 'upper_tail_z_score_or_iqr',
    parameters: ANALYTICS_PARAMETERS.anomaly,
  }),
  runway: Object.freeze({
    unit: 'VND',
    window: Object.freeze({ size: ANALYTICS_WINDOWS.runwayDays, unit: 'calendar_day', zero_filled: true }),
    method: 'liquid_balance_over_mean_daily_burn',
    parameters: ANALYTICS_PARAMETERS.runway,
  }),
  subscriptions: Object.freeze({
    unit: 'VND_per_month',
    window: Object.freeze({ size: ANALYTICS_WINDOWS.subscriptionDays, unit: 'calendar_day', zero_filled: false }),
    method: 'normalized_description_amount_and_cadence',
    parameters: ANALYTICS_PARAMETERS.subscriptions,
  }),
  day_of_week: Object.freeze({
    unit: 'VND_per_active_day',
    window: Object.freeze({ size: ANALYTICS_WINDOWS.dayOfWeekDays, unit: 'calendar_day', zero_filled: false }),
    method: 'day_of_week_active_day_mean_ratio',
    parameters: ANALYTICS_PARAMETERS.day_of_week,
  }),
  correlation: Object.freeze({
    unit: 'pearson_r',
    window: Object.freeze({ size: ANALYTICS_WINDOWS.correlationWeeks, unit: 'completed_week', zero_filled: true }),
    method: 'pearson_product_moment_positive_only',
    parameters: ANALYTICS_PARAMETERS.correlation,
  }),
});

const DOW_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

// ── Individual analyses (each returns plain facts, or null when not enough data) ──

async function trendAnalysis(userId, months = ANALYTICS_WINDOWS.trendMonths) {
  const byCat = await AnalyticsModel.monthlyByCategory(userId, months);
  const trends = [];
  let observedPeriodCount = 0;
  for (const [category, { icon, series }] of Object.entries(byCat)) {
    const totals = series.map((s) => s.total);
    const observedPeriods = totals.filter((total) => total > 0).length;
    observedPeriodCount += observedPeriods;
    if (observedPeriods < ANALYTICS_PARAMETERS.trend.minimum_observed_periods) continue;
    const t = algo.linearTrend(totals);
    // Only surface meaningful, well-fitted upward trends
    if (
      t.avgPctChange >= ANALYTICS_PARAMETERS.trend.minimum_average_percent_change
      && t.r2 >= ANALYTICS_PARAMETERS.trend.minimum_r2
      && t.slope > 0
    ) {
      trends.push({
        category,
        icon,
        months: series.map((s) => s.ym),
        values: totals,
        avgPctChange: t.avgPctChange,
        forecastNext: t.forecastNext,
        r2: t.r2,
        observedPeriods,
      });
    }
  }
  trends.sort((a, b) => b.avgPctChange - a.avgPctChange);
  return {
    value: trends.length ? trends : null,
    metadata: {
      ...COMPONENT_CONTRACTS.trend,
      window: { ...COMPONENT_CONTRACTS.trend.window, size: months },
      sample_count: Object.values(byCat).reduce((sum, entry) => sum + entry.series.length, 0),
      observed_period_count: observedPeriodCount,
      category_count: Object.keys(byCat).length,
      warnings: [],
    },
  };
}

async function trendFacts(userId, months = ANALYTICS_WINDOWS.trendMonths) {
  return (await trendAnalysis(userId, months)).value;
}

async function anomalyAnalysis(userId, days = ANALYTICS_WINDOWS.anomalyDays) {
  const daily = await AnalyticsModel.dailyExpenses(userId, days);
  const observedDays = daily.filter((point) => Number(point.value) > 0).length;
  const anomalies = observedDays >= ANALYTICS_PARAMETERS.anomaly.minimum_observed_days
    ? algo.detectAnomalies(daily, {
      zThreshold: ANALYTICS_PARAMETERS.anomaly.z_threshold,
      iqrK: ANALYTICS_PARAMETERS.anomaly.iqr_k,
    })
    : [];
  return {
    value: anomalies.length ? anomalies.slice(0, 5) : null,
    metadata: {
      ...COMPONENT_CONTRACTS.anomaly,
      window: { ...COMPONENT_CONTRACTS.anomaly.window, size: days },
      sample_count: daily.length,
      observed_period_count: observedDays,
      warnings: [],
    },
  };
}

async function anomalyFacts(userId, days = ANALYTICS_WINDOWS.anomalyDays) {
  return (await anomalyAnalysis(userId, days)).value;
}

async function runwayAnalysis(userId, payday = null) {
  const normalizedPayday = Number.isInteger(Number(payday)) && Number(payday) >= 1 && Number(payday) <= 31
    ? Number(payday)
    : null;
  const [wallets, daily] = await Promise.all([
    AccountModel.getAll(userId),
    AnalyticsModel.dailyExpenses(userId, ANALYTICS_WINDOWS.runwayDays),
  ]);
  const eligibleWallets = wallets.filter((wallet) => isRunwayEligibleWallet(wallet));
  const totalBalance = sumRunwayBalance(wallets);
  const spends = daily.map((d) => d.value);
  const runway = algo.cashflowRunway(totalBalance, spends, { payday: normalizedPayday });
  return {
    value: runway.daysLeft === null ? null : { totalBalance, currency: RUNWAY_CURRENCY, ...runway },
    metadata: {
      ...COMPONENT_CONTRACTS.runway,
      parameters: { ...COMPONENT_CONTRACTS.runway.parameters, payday: normalizedPayday },
      sample_count: daily.length,
      wallet_count: eligibleWallets.length,
      warnings: wallets.length > eligibleWallets.length ? ['non_liquid_or_non_vnd_wallets_excluded'] : [],
    },
  };
}

async function runwayFacts(userId, payday = null) {
  return (await runwayAnalysis(userId, payday)).value;
}

async function subscriptionAnalysis(userId, days = ANALYTICS_WINDOWS.subscriptionDays, options = {}) {
  const txns = await AnalyticsModel.recentTransactions(userId, days);
  const { subscriptions, totalMonthly } = mineSubscriptions(txns, {
    minOccurrences: ANALYTICS_PARAMETERS.subscriptions.min_occurrences,
    maxAmount: ANALYTICS_PARAMETERS.subscriptions.max_amount,
    amountTolerance: ANALYTICS_PARAMETERS.subscriptions.amount_tolerance,
    maxCadenceCv: ANALYTICS_PARAMETERS.subscriptions.max_cadence_cv,
    asOf: options.asOf || new Date(),
  });
  return {
    value: subscriptions.length ? { subscriptions: subscriptions.slice(0, 12), totalMonthly } : null,
    metadata: {
      ...COMPONENT_CONTRACTS.subscriptions,
      window: { ...COMPONENT_CONTRACTS.subscriptions.window, size: days },
      sample_count: txns.length,
      warnings: [],
    },
  };
}

async function subscriptionFacts(userId, days = ANALYTICS_WINDOWS.subscriptionDays, options = {}) {
  return (await subscriptionAnalysis(userId, days, options)).value;
}

async function dayOfWeekAnalysis(userId, days = ANALYTICS_WINDOWS.dayOfWeekDays) {
  const rows = await AnalyticsModel.dayOfWeekSpending(userId, days);
  const metadata = {
    ...COMPONENT_CONTRACTS.day_of_week,
    window: { ...COMPONENT_CONTRACTS.day_of_week.window, size: days },
    sample_count: rows.length,
    warnings: [],
  };
  if (rows.length < ANALYTICS_PARAMETERS.day_of_week.minimum_observed_weekdays) {
    return { value: null, metadata };
  }
  const avgs = rows.map((r) => r.avgPerActiveDay);
  const overall = algo.mean(avgs);
  if (overall <= 0) return { value: null, metadata };
  const peak = rows.reduce((best, r) => (r.avgPerActiveDay > best.avgPerActiveDay ? r : best), rows[0]);
  const ratio = overall > 0 ? peak.avgPerActiveDay / overall : 1;
  if (ratio < ANALYTICS_PARAMETERS.day_of_week.minimum_peak_ratio) {
    return { value: null, metadata };
  }
  return {
    value: {
      day: DOW_LABELS[peak.dow],
      avgOnDay: Math.round(peak.avgPerActiveDay),
      avgOverall: Math.round(overall),
      timesHigher: Number(ratio.toFixed(1)),
    },
    metadata,
  };
}

async function dayOfWeekFacts(userId, days = ANALYTICS_WINDOWS.dayOfWeekDays) {
  return (await dayOfWeekAnalysis(userId, days)).value;
}

async function correlationAnalysis(userId, weeks = ANALYTICS_WINDOWS.correlationWeeks) {
  const rows = await AnalyticsModel.weeklyByCategory(userId, weeks);
  const completed = completeWeeklyByCategory(rows, weeks);
  const names = Object.keys(completed.categories)
    .filter((category) => (
      completed.categories[category].observedPeriods
      >= ANALYTICS_PARAMETERS.correlation.minimum_observed_periods_per_category
    ));
  const metadata = {
    ...COMPONENT_CONTRACTS.correlation,
    window: { ...COMPONENT_CONTRACTS.correlation.window, size: weeks },
    sample_count: completed.axis.length,
    category_count: names.length,
    warnings: ['association_not_causation', 'joint_zero_pairs_excluded'],
  };
  if (names.length < 2) return { value: null, metadata };

  const series = {};
  for (const category of names) {
    series[category] = completed.categories[category].series.map((point) => point.total);
  }

  let best = null;
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const detail = algo.pearsonDetailed(series[names[i]], series[names[j]], { excludeJointZeros: true });
      const r = detail.r;
      if (
        typeof r === 'number'
        && detail.effective_pair_count >= ANALYTICS_PARAMETERS.correlation.minimum_effective_pairs
        && r >= ANALYTICS_PARAMETERS.correlation.minimum_r
        && (!best || r > best.r)
      ) {
        best = {
          a: names[i],
          b: names[j],
          r,
          effective_pair_count: detail.effective_pair_count,
          excluded_joint_zero_count: detail.excluded_joint_zero_count,
        };
      }
    }
  }
  return { value: best, metadata };
}

async function correlationFacts(userId, weeks = ANALYTICS_WINDOWS.correlationWeeks) {
  return (await correlationAnalysis(userId, weeks)).value;
}

// ── Public: full engine run → structured facts object ─────────────────────────────

// Chạy sáu component độc lập; một component degraded không làm mất toàn bộ contract.
async function buildInsightFacts(userId = DEFAULT_USER, { payday = null, useCache = true } = {}) {
  const key = `cache:insights:${userId}`;
  const normalizedPayday = Number.isInteger(Number(payday)) && Number(payday) >= 1 && Number(payday) <= 31
    ? Number(payday)
    : null;
  const producer = async () => {
    const definitions = [
      ['trend', trendAnalysis(userId, ANALYTICS_WINDOWS.trendMonths), COMPONENT_CONTRACTS.trend],
      ['anomaly', anomalyAnalysis(userId, ANALYTICS_WINDOWS.anomalyDays), COMPONENT_CONTRACTS.anomaly],
      ['runway', runwayAnalysis(userId, normalizedPayday), COMPONENT_CONTRACTS.runway],
      ['subscriptions', subscriptionAnalysis(userId, ANALYTICS_WINDOWS.subscriptionDays), COMPONENT_CONTRACTS.subscriptions],
      ['day_of_week', dayOfWeekAnalysis(userId, ANALYTICS_WINDOWS.dayOfWeekDays), COMPONENT_CONTRACTS.day_of_week],
      ['correlation', correlationAnalysis(userId, ANALYTICS_WINDOWS.correlationWeeks), COMPONENT_CONTRACTS.correlation],
    ];
    const results = await Promise.all(definitions.map(async ([name, task, contract]) => {
      try {
        const analysis = await task;
        return { name, ...analysis, error: null };
      } catch (error) {
        return { name, value: null, metadata: { ...contract, sample_count: null, warnings: [] }, error };
      }
    }));
    const values = Object.fromEntries(results.map((result) => [result.name, result.value]));
    const degradedComponents = results.filter((result) => result.error).map((result) => result.name);
    const components = Object.fromEntries(results.map((result) => [result.name, {
      ...(result.metadata || {}),
      status: result.error ? 'degraded' : result.value === null ? 'no_signal' : 'ok',
      warnings: result.error
        ? ['component_failed']
        : result.value === null
          ? [...(result.metadata?.warnings || []), 'insufficient_data_or_no_signal']
          : result.metadata?.warnings || [],
    }]));
    return {
      schema_version: FACTS_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      ...values,
      metadata: {
        context: { reporting_currency: RUNWAY_CURRENCY, payday: normalizedPayday },
        components,
      },
      degraded_components: degradedComponents,
    };
  };
  if (!useCache) return producer();
  const cached = await KVStore.get(key);
  if (
    cached?.schema_version === FACTS_SCHEMA_VERSION
    && cached?.metadata?.context?.payday === normalizedPayday
    && cached?.metadata?.context?.reporting_currency === RUNWAY_CURRENCY
  ) {
    return cached;
  }
  const fresh = await producer();
  await KVStore.set(key, fresh, CACHE_TTL);
  return fresh;
}

async function invalidate(userId = DEFAULT_USER) {
  await KVStore.del(`cache:insights:${userId}`);
}

module.exports = {
  ANALYTICS_WINDOWS,
  ANALYTICS_PARAMETERS,
  COMPONENT_CONTRACTS,
  FACTS_SCHEMA_VERSION,
  buildInsightFacts,
  invalidate,
  // exported for targeted use / testing
  trendFacts,
  anomalyFacts,
  runwayFacts,
  subscriptionFacts,
  dayOfWeekFacts,
  correlationFacts,
};

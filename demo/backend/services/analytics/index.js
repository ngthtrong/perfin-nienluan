// Analytics Engine — the "bộ não phân tích".
//
// Pattern (PROPOSAL_Backend_v2 §3.2): deterministic algorithms compute the numbers,
// then hand a structured `insight facts` object to the LLM to phrase per persona.
// The LLM never invents figures; it only narrates what the engine calculated.

const AnalyticsModel = require('../../models/analytics.model');
const AccountModel = require('../../models/account.model');
const algo = require('./algorithms');
const { mineSubscriptions } = require('./subscriptionMiner');
const KVStore = require('../store/kv.store');

const DEFAULT_USER = 'default_user';
const CACHE_TTL = 600; // 10 min — insights are expensive; recompute infrequently

const DOW_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

// ── Individual analyses (each returns plain facts, or null when not enough data) ──

async function trendFacts(userId, months = 6) {
  const byCat = await AnalyticsModel.monthlyByCategory(userId, months);
  const trends = [];
  for (const [category, { icon, series }] of Object.entries(byCat)) {
    if (series.length < 3) continue; // need a few months to call a trend
    const totals = series.map((s) => s.total);
    const t = algo.linearTrend(totals);
    // Only surface meaningful, well-fitted upward trends
    if (t.avgPctChange >= 10 && t.r2 >= 0.5 && t.slope > 0) {
      trends.push({
        category,
        icon,
        months: series.map((s) => s.ym),
        values: totals,
        avgPctChange: t.avgPctChange,
        forecastNext: t.forecastNext,
        r2: t.r2,
      });
    }
  }
  trends.sort((a, b) => b.avgPctChange - a.avgPctChange);
  return trends.length ? trends : null;
}

async function anomalyFacts(userId, days = 30) {
  const daily = await AnalyticsModel.dailyExpenses(userId, days);
  const anomalies = algo.detectAnomalies(daily);
  return anomalies.length ? anomalies.slice(0, 5) : null;
}

async function runwayFacts(userId, payday = null) {
  const [wallets, daily] = await Promise.all([
    AccountModel.getAll(userId),
    AnalyticsModel.dailyExpenses(userId, 14),
  ]);
  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
  const spends = daily.map((d) => d.value);
  const runway = algo.cashflowRunway(totalBalance, spends, { payday });
  if (runway.daysLeft === null) return null;
  return { totalBalance, ...runway };
}

async function subscriptionFacts(userId, days = 90) {
  const txns = await AnalyticsModel.recentTransactions(userId, days);
  const { subscriptions, totalMonthly } = mineSubscriptions(txns);
  if (!subscriptions.length) return null;
  return { subscriptions: subscriptions.slice(0, 12), totalMonthly };
}

async function dayOfWeekFacts(userId, days = 60) {
  const rows = await AnalyticsModel.dayOfWeekSpending(userId, days);
  if (rows.length < 4) return null;
  const avgs = rows.map((r) => r.avgPerActiveDay);
  const overall = algo.mean(avgs);
  if (overall <= 0) return null;
  const peak = rows.reduce((best, r) => (r.avgPerActiveDay > best.avgPerActiveDay ? r : best), rows[0]);
  const ratio = overall > 0 ? peak.avgPerActiveDay / overall : 1;
  if (ratio < 1.8) return null; // only report a genuinely spiky day
  return {
    day: DOW_LABELS[peak.dow],
    avgOnDay: Math.round(peak.avgPerActiveDay),
    avgOverall: Math.round(overall),
    timesHigher: Number(ratio.toFixed(1)),
  };
}

async function correlationFacts(userId, weeks = 12) {
  const rows = await AnalyticsModel.weeklyByCategory(userId, weeks);
  // Pivot into { category: { yw: total } }
  const cats = {};
  const weekSet = new Set();
  for (const r of rows) {
    cats[r.category] = cats[r.category] || {};
    cats[r.category][r.yw] = r.total;
    weekSet.add(r.yw);
  }
  const weekList = [...weekSet].sort();
  const names = Object.keys(cats).filter((c) => Object.keys(cats[c]).length >= 4);
  if (names.length < 2) return null;

  const series = {};
  for (const c of names) series[c] = weekList.map((w) => cats[c][w] || 0);

  let best = null;
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const r = algo.pearson(series[names[i]], series[names[j]]);
      if (r >= 0.6 && (!best || r > best.r)) best = { a: names[i], b: names[j], r };
    }
  }
  return best;
}

// ── Public: full engine run → structured facts object ─────────────────────────────

async function buildInsightFacts(userId = DEFAULT_USER, { payday = null, useCache = true } = {}) {
  const key = `cache:insights:${userId}`;
  const producer = async () => {
    const [trend, anomaly, runway, subscriptions, dayOfWeek, correlation] = await Promise.all([
      trendFacts(userId).catch(() => null),
      anomalyFacts(userId).catch(() => null),
      runwayFacts(userId, payday).catch(() => null),
      subscriptionFacts(userId).catch(() => null),
      dayOfWeekFacts(userId).catch(() => null),
      correlationFacts(userId).catch(() => null),
    ]);
    return {
      generated_at: new Date().toISOString(),
      trend,
      anomaly,
      runway,
      subscriptions,
      day_of_week: dayOfWeek,
      correlation,
    };
  };
  return useCache ? KVStore.remember(key, CACHE_TTL, producer) : producer();
}

async function invalidate(userId = DEFAULT_USER) {
  await KVStore.del(`cache:insights:${userId}`);
}

module.exports = {
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

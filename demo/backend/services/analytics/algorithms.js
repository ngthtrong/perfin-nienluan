// Pure statistical helpers for the Analytics Engine. No DB, no LLM — deterministic
// math on plain arrays so they are unit-testable in isolation. The engine feeds these
// with data from analytics.model.js and hands the numeric results to the LLM to phrase.

const { localDayKey } = require('./timeSeries');

// ── Basic stats ────────────────────────────────────────────────────────────────
function mean(xs) {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

function median(xs) {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quantile(xs, q) {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

// ── Trend detection: least-squares linear regression over a time-indexed series ──
// Returns slope per step, intercept, R², and a next-step forecast. `series` is an
// array of numbers ordered oldest→newest (e.g. monthly spend). Used for "chi tiêu
// Grab tăng đều 15%/tháng" (LLM.md §2.4).
function linearTrend(series) {
  const n = series.length;
  if (n < 2) return { slope: 0, intercept: series[0] || 0, r2: 0, forecastNext: series[0] || 0, avgPctChange: 0 };
  const xs = series.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(series);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - mx) * (series[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;

  // R² (goodness of fit)
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i += 1) {
    const pred = slope * xs[i] + intercept;
    ssTot += (series[i] - my) ** 2;
    ssRes += (series[i] - pred) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Average step-over-step percentage change (robust to zero divisors)
  const pctChanges = [];
  for (let i = 1; i < n; i += 1) {
    if (series[i - 1] > 0) pctChanges.push((series[i] - series[i - 1]) / series[i - 1]);
  }
  const avgPctChange = pctChanges.length ? mean(pctChanges) : 0;

  return {
    slope: Math.round(slope),
    intercept: Math.round(intercept),
    r2: Number(r2.toFixed(3)),
    forecastNext: Math.max(0, Math.round(slope * n + intercept)),
    avgPctChange: Number((avgPctChange * 100).toFixed(1)), // percent
  };
}

// ── Anomaly detection ────────────────────────────────────────────────────────────
// Flags points that are unusually large. Uses both z-score (mean/σ) and IQR fences,
// reporting a point as anomalous if either method trips. `points` = [{ label, value }].
function detectAnomalies(points, { zThreshold = 2.5, iqrK = 1.5 } = {}) {
  const values = points.map((p) => p.value);
  if (values.length < 4) return [];
  const m = mean(values);
  const sd = stddev(values);
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const upperFence = q3 + iqrK * iqr;

  const out = [];
  for (const p of points) {
    const z = sd === 0 ? 0 : (p.value - m) / sd;
    const byZ = z >= zThreshold;
    const byIqr = iqr > 0 && p.value > upperFence;
    if (byZ || byIqr) {
      out.push({
        label: p.label,
        value: p.value,
        z: Number(z.toFixed(2)),
        timesAverage: m > 0 ? Number((p.value / m).toFixed(1)) : null,
        method: byZ && byIqr ? 'z+iqr' : byZ ? 'z' : 'iqr',
      });
    }
  }
  return out.sort((a, b) => b.value - a.value);
}

// ── Cashflow runway ──────────────────────────────────────────────────────────────
// Given current balance and recent daily burn rate, estimate the calendar date the
// balance hits zero. `dailySpends` = numbers for the last N days (expense only).
function cashflowRunway(balance, dailySpends, { today = new Date(), payday = null } = {}) {
  // Each slot represents one calendar day. Preserve zero-spend days in the
  // denominator; dropping them systematically overstates the daily burn rate.
  const calendarSpends = Array.from(Array.isArray(dailySpends) ? dailySpends : [], (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  });
  const avgBurn = mean(calendarSpends);
  const currentBalance = Number(balance);

  // A depleted wallet has no future runway, even when there is no recent spend
  // history. Handle it before the zero-burn branch so callers never receive a
  // negative day count or a depletion date in the past.
  if (Number.isFinite(currentBalance) && currentBalance <= 0) {
    const depletion = new Date(today);
    let beforePayday = false;
    let daysBeforePayday = null;
    if (payday) {
      const nextPay = new Date(today);
      nextPay.setDate(payday);
      if (nextPay <= today) nextPay.setMonth(nextPay.getMonth() + 1);
      beforePayday = true;
      daysBeforePayday = Math.max(0, Math.round((nextPay - depletion) / (1000 * 60 * 60 * 24)));
    }
    return {
      avgBurn: Math.round(avgBurn),
      daysLeft: 0,
      depletionDate: localDayKey(depletion),
      beforePayday,
      daysBeforePayday,
      alreadyDepleted: true,
    };
  }

  if (avgBurn <= 0) {
    return {
      avgBurn: 0,
      daysLeft: null,
      depletionDate: null,
      beforePayday: false,
      alreadyDepleted: false,
    };
  }
  const daysLeft = Math.max(0, Math.floor(currentBalance / avgBurn));
  const depletion = new Date(today);
  depletion.setDate(depletion.getDate() + daysLeft);

  let beforePayday = false;
  let daysBeforePayday = null;
  if (payday) {
    // payday = day-of-month (1..31); find the next occurrence from today
    const nextPay = new Date(today);
    nextPay.setDate(payday);
    if (nextPay <= today) nextPay.setMonth(nextPay.getMonth() + 1);
    beforePayday = depletion < nextPay;
    daysBeforePayday = Math.round((nextPay - depletion) / (1000 * 60 * 60 * 24));
  }

  return {
    avgBurn: Math.round(avgBurn),
    daysLeft,
    depletionDate: localDayKey(depletion),
    beforePayday,
    daysBeforePayday,
    alreadyDepleted: false,
  };
}

// ── Pearson correlation between two equal-length series ──────────────────────────
function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i += 1) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : Number((num / den).toFixed(3));
}

module.exports = {
  mean,
  stddev,
  median,
  quantile,
  linearTrend,
  detectAnomalies,
  cashflowRunway,
  pearson,
};

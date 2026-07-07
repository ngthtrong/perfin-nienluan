// Detects recurring/subscription-like spending hidden across many small transactions
// (Flow 18, LLM.md §2.4 "subscription bị bỏ quên"). Pure function over a transaction
// list so it is unit-testable. Groups by normalized description, then keeps groups
// that look periodic: repeated, stable amount, roughly monthly cadence.

function normalizeDesc(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[0-9]+/g, ' ')       // drop digits (amounts, dates embedded in desc)
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function daysBetween(a, b) {
  return Math.abs((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

// transactions: [{ description, amount, transaction_date, type }]
// Returns [{ label, occurrences, avgAmount, monthlyEstimate, cadenceDays, amountStable }]
function mineSubscriptions(transactions, {
  minOccurrences = 2,
  maxAmount = 500000,        // "small" recurring fees; large one-offs excluded
  amountTolerance = 0.15,    // ±15% counts as the same recurring charge
  cadenceMinDays = 20,       // roughly monthly window
  cadenceMaxDays = 40,
} = {}) {
  const expenses = transactions.filter((t) => t.type === 'expense' && Number(t.amount) <= maxAmount);
  const groups = new Map();
  for (const t of expenses) {
    const key = normalizeDesc(t.description);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ amount: Number(t.amount), date: t.transaction_date, desc: t.description });
  }

  const results = [];
  for (const [key, items] of groups) {
    if (items.length < minOccurrences) continue;
    const amounts = items.map((i) => i.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (avg <= 0) continue;

    // amount stability: all within tolerance of the average
    const amountStable = amounts.every((a) => Math.abs(a - avg) / avg <= amountTolerance);

    // cadence: median gap between consecutive occurrences
    const sorted = items.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const gaps = [];
    for (let i = 1; i < sorted.length; i += 1) gaps.push(daysBetween(sorted[i].date, sorted[i - 1].date));
    const cadence = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
    const periodic = cadence === null ? false : cadence >= cadenceMinDays && cadence <= cadenceMaxDays;

    // Keep as a subscription candidate if amount is stable and (periodic OR simply repeated monthly-ish)
    if (amountStable && (periodic || items.length >= 3)) {
      results.push({
        label: sorted[sorted.length - 1].desc,
        occurrences: items.length,
        avgAmount: Math.round(avg),
        monthlyEstimate: Math.round(avg), // one charge per month assumption
        cadenceDays: cadence ? Math.round(cadence) : null,
        amountStable,
      });
    }
  }

  results.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
  const totalMonthly = results.reduce((sum, r) => sum + r.monthlyEstimate, 0);
  return { subscriptions: results, totalMonthly };
}

module.exports = { mineSubscriptions, normalizeDesc };

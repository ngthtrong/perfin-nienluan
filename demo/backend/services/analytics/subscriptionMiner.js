// Vai trò: Dò các khoản chi có dấu hiệu subscription trong lịch sử giao dịch.
// Luồng chính: gom mô tả tương đồng, kiểm tra độ ổn định số tiền/khoảng cách rồi suy ra cadence.
// Chỉ candidate đủ bằng chứng mới được trả về; module không tự tạo recurring bill.

const DAYS_PER_MONTH = 365.25 / 12;

const CADENCES = Object.freeze([
  Object.freeze({ frequency: 'weekly', expectedDays: 7, minDays: 5, maxDays: 9, monthlyFactor: 52 / 12 }),
  Object.freeze({ frequency: 'monthly', expectedDays: DAYS_PER_MONTH, minDays: 26, maxDays: 35, monthlyFactor: 1 }),
  Object.freeze({ frequency: 'quarterly', expectedDays: DAYS_PER_MONTH * 3, minDays: 80, maxDays: 100, monthlyFactor: 1 / 3 }),
]);

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

function toTimestamp(value) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const timestamp = Date.UTC(year, month, day);
      const parsed = new Date(timestamp);
      return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month && parsed.getUTCDate() === day
        ? timestamp
        : null;
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function nextExpectedTimestamp(lastTimestamp, frequency) {
  const next = new Date(lastTimestamp);
  if (frequency === 'weekly') {
    next.setUTCDate(next.getUTCDate() + 7);
    return next.getTime();
  }
  const months = frequency === 'quarterly' ? 3 : 1;
  const wantedDay = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(wantedDay, lastDay));
  return next.getTime();
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function coefficientOfVariation(values) {
  if (!values.length) return null;
  const avg = mean(values);
  if (!(avg > 0)) return null;
  const variance = values.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / values.length;
  return Math.sqrt(variance) / avg;
}

function inferCadence(gaps, maxCadenceCv) {
  if (!gaps.length || gaps.some((gap) => !(gap > 0))) return null;
  const cadenceDays = mean(gaps);
  const dispersion = coefficientOfVariation(gaps);
  if (dispersion === null || dispersion > maxCadenceCv) return null;

  const matches = CADENCES
    .filter((cadence) => gaps.every((gap) => gap >= cadence.minDays && gap <= cadence.maxDays))
    .sort((left, right) => (
      Math.abs(cadenceDays - left.expectedDays) - Math.abs(cadenceDays - right.expectedDays)
    ));

  if (!matches.length) return null;
  return { ...matches[0], cadenceDays, dispersion };
}

// transactions: [{ description, amount, transaction_date, type }]
// Returns { subscriptions: [{ label, frequency, occurrences, avgAmount,
// monthlyEstimate, cadenceDays, cadenceDispersion, amountStable }], totalMonthly }
function mineSubscriptions(transactions, {
  minOccurrences = 3,
  maxAmount = null,          // opt-in ceiling; no silent VND 500k exclusion by default
  amountTolerance = 0.15,
  maxCadenceCv = 0.12,
  asOf = new Date(),
} = {}) {
  const occurrenceFloor = Number(minOccurrences);
  if (!Number.isInteger(occurrenceFloor) || occurrenceFloor < 2) {
    throw new RangeError('minOccurrences must be an integer of at least 2');
  }
  if (!Number.isFinite(Number(amountTolerance)) || Number(amountTolerance) < 0) {
    throw new RangeError('amountTolerance must be a non-negative number');
  }
  if (!Number.isFinite(Number(maxCadenceCv)) || Number(maxCadenceCv) < 0) {
    throw new RangeError('maxCadenceCv must be a non-negative number');
  }
  const asOfTimestamp = toTimestamp(asOf);
  if (asOfTimestamp === null) throw new RangeError('asOf must be a valid date');

  const hasAmountCeiling = maxAmount !== null && maxAmount !== undefined;
  const amountCeiling = hasAmountCeiling ? Number(maxAmount) : null;
  if (hasAmountCeiling && (!(amountCeiling > 0) || !Number.isFinite(amountCeiling))) {
    throw new RangeError('maxAmount must be a positive finite number when provided');
  }

  const groups = new Map();
  for (const transaction of Array.isArray(transactions) ? transactions : []) {
    const amount = Number(transaction.amount);
    const timestamp = toTimestamp(transaction.transaction_date);
    if (
      transaction.type !== 'expense'
      || !(amount > 0)
      || !Number.isFinite(amount)
      || timestamp === null
      || timestamp > asOfTimestamp
    ) continue;
    if (hasAmountCeiling && amount > amountCeiling) continue;

    const key = normalizeDesc(transaction.description);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ amount, timestamp, desc: transaction.description });
  }

  const results = [];
  for (const items of groups.values()) {
    if (items.length < occurrenceFloor) continue;
    const amounts = items.map((item) => item.amount);
    const avgAmount = mean(amounts);
    const amountStable = amounts.every((amount) => Math.abs(amount - avgAmount) / avgAmount <= Number(amountTolerance));
    if (!amountStable) continue;

    const sorted = items.slice().sort((left, right) => left.timestamp - right.timestamp);
    const gaps = sorted.slice(1).map((item, index) => (
      (item.timestamp - sorted[index].timestamp) / 86400000
    ));
    const cadence = inferCadence(gaps, Number(maxCadenceCv));
    if (!cadence) continue;
    const lastTimestamp = sorted.at(-1).timestamp;
    const ageDays = (asOfTimestamp - lastTimestamp) / 86400000;
    // A regular series that stopped longer than one maximum cadence ago is no
    // longer an active subscription candidate.
    if (ageDays > cadence.maxDays) continue;
    const expectedTimestamp = nextExpectedTimestamp(lastTimestamp, cadence.frequency);

    results.push({
      label: sorted.at(-1).desc,
      frequency: cadence.frequency,
      cadence: cadence.frequency,
      occurrences: items.length,
      avgAmount: Math.round(avgAmount),
      monthlyEstimate: Math.round(avgAmount * cadence.monthlyFactor),
      cadenceDays: Math.round(cadence.cadenceDays),
      cadenceDispersion: Number(cadence.dispersion.toFixed(3)),
      lastSeen: new Date(lastTimestamp).toISOString().slice(0, 10),
      nextExpected: new Date(expectedTimestamp).toISOString().slice(0, 10),
      amountStable,
    });
  }

  results.sort((left, right) => right.monthlyEstimate - left.monthlyEstimate);
  const totalMonthly = results.reduce((sum, result) => sum + result.monthlyEstimate, 0);
  return { subscriptions: results, totalMonthly };
}

module.exports = {
  CADENCES,
  inferCadence,
  mineSubscriptions,
  normalizeDesc,
};

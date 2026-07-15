// Calendar-axis helpers used between SQL aggregation and the analytics algorithms.
// Missing calendar periods are real zero observations, not permission to shorten
// the x-axis or the denominator.

const DAY_MS = 24 * 60 * 60 * 1000;

function windowSize(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function localDayKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function toDayKey(value) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) return localDayKey(value);
  return null;
}

function recentDayKeys(days, anchorDay = localDayKey()) {
  const count = windowSize(days, 1);
  const match = String(anchorDay).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new RangeError('anchorDay must use YYYY-MM-DD');
  const end = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Array.from({ length: count }, (_, index) => (
    new Date(end - (count - 1 - index) * DAY_MS).toISOString().slice(0, 10)
  ));
}

function recentMonthKeys(months, anchorMonth = localDayKey().slice(0, 7)) {
  const count = windowSize(months, 1);
  const match = String(anchorMonth).match(/^(\d{4})-(\d{2})$/);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
    throw new RangeError('anchorMonth must use YYYY-MM');
  }
  const endSerial = Number(match[1]) * 12 + Number(match[2]) - 1;
  return Array.from({ length: count }, (_, index) => {
    const serial = endSerial - (count - 1 - index);
    const year = Math.floor(serial / 12);
    const month = serial - year * 12 + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  });
}

function completeDailyTotals(rows, days, anchorDay = localDayKey()) {
  const axis = recentDayKeys(days, anchorDay);
  const totals = new Map(axis.map((day) => [day, 0]));
  for (const row of rows || []) {
    const day = toDayKey(row.label || row.day);
    const value = Number(row.value ?? row.total);
    if (totals.has(day) && Number.isFinite(value)) totals.set(day, totals.get(day) + value);
  }
  return axis.map((label) => ({ label, value: totals.get(label) }));
}

function completeMonthlyByCategory(rows, months, anchorMonth = localDayKey().slice(0, 7)) {
  const axis = recentMonthKeys(months, anchorMonth);
  const axisSet = new Set(axis);
  const categories = new Map();
  for (const row of rows || []) {
    const category = row.category_name;
    const ym = String(row.ym || '').slice(0, 7);
    if (!category || !axisSet.has(ym)) continue;
    if (!categories.has(category)) categories.set(category, { icon: row.icon, totals: new Map() });
    const entry = categories.get(category);
    const total = Number(row.total);
    if (Number.isFinite(total)) entry.totals.set(ym, (entry.totals.get(ym) || 0) + total);
  }
  return Object.fromEntries([...categories].map(([category, entry]) => [category, {
    icon: entry.icon,
    series: axis.map((ym) => ({ ym, total: entry.totals.get(ym) || 0 })),
  }]));
}

function completeMonthlyCashflow(rows, months, anchorMonth = localDayKey().slice(0, 7)) {
  const axis = recentMonthKeys(months, anchorMonth);
  const totals = new Map(axis.map((ym) => [ym, { income: 0, expense: 0 }]));
  for (const row of rows || []) {
    const ym = String(row.ym || '').slice(0, 7);
    if (!totals.has(ym)) continue;
    const current = totals.get(ym);
    const income = Number(row.income);
    const expense = Number(row.expense);
    if (Number.isFinite(income)) current.income += income;
    if (Number.isFinite(expense)) current.expense += expense;
  }
  return axis.map((ym) => ({ ym, ...totals.get(ym) }));
}

module.exports = {
  localDayKey,
  recentDayKeys,
  recentMonthKeys,
  completeDailyTotals,
  completeMonthlyByCategory,
  completeMonthlyCashflow,
};

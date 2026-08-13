// Vai trò: Chuẩn hóa cách hiểu “kỳ” trong mọi câu hỏi tài chính.
// Luồng chính: đổi tham số tool hoặc cụm thời gian tiếng Việt thành một cửa sổ ngày cụ thể.
// Nhờ đó “tuần này”, “hôm qua” hay “7 ngày qua” không bị quy nhầm về tháng hiện tại.

const { normalizeText } = require('../parser.service');

const PERIOD_ALIASES = {
  today: 'today',
  hom_nay: 'today',
  yesterday: 'yesterday',
  day_before_yesterday: 'day_before_yesterday',
  week: 'this_week',
  this_week: 'this_week',
  current_week: 'this_week',
  last_week: 'last_week',
  previous_week: 'last_week',
  month: 'this_month',
  this_month: 'this_month',
  current_month: 'this_month',
  last_month: 'last_month',
  previous_month: 'last_month',
  quarter: 'this_quarter',
  this_quarter: 'this_quarter',
  last_quarter: 'last_quarter',
  year: 'this_year',
  this_year: 'this_year',
  last_year: 'last_year',
  ytd: 'year_to_date',
  year_to_date: 'year_to_date',
  last_n_days: 'last_n_days',
  last_7_days: 'last_n_days',
  last_30_days: 'last_n_days',
  last_n_months: 'last_n_months',
  custom: 'custom',
};

const PERIOD_VALUES = [...new Set(Object.values(PERIOD_ALIASES))];

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayLabel(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

// Vietnamese weeks start on Monday.
function startOfWeek(date) {
  const day = startOfDay(date);
  return addDays(day, -((day.getDay() + 6) % 7));
}

function monthWindow(month, year) {
  return {
    from: new Date(year, month - 1, 1),
    to: new Date(year, month, 0),
  };
}

function isDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function parseDateKey(value) {
  const [year, month, day] = value.trim().split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.round(number), min), max);
}

// `label` is stored bare ("tuần này (27/07 – 02/08)"), without a leading
// preposition, because the same window is read into different sentence shapes:
// "bạn đã chi X trong tuần này" needs one, "Tổng kết tuần này" does not. Callers
// that need the preposition use `phrase`.
function result(kind, from, to, label, extra = {}) {
  return {
    kind,
    from: dateKey(from),
    to: dateKey(to),
    label,
    // "trong hôm nay" and "trong từ đầu năm" are not Vietnamese; those labels
    // already read as adverbials on their own.
    phrase: /^(?:hôm|từ đầu)/.test(label) ? label : `trong ${label}`,
    month: extra.month ?? null,
    year: extra.year ?? null,
    days: Math.round((startOfDay(to) - startOfDay(from)) / 86400000) + 1,
    is_month: Boolean(extra.month),
    explicit: extra.explicit !== false,
  };
}

function rangeLabel(prefix, from, to) {
  return `${prefix} (${dayLabel(from)} – ${dayLabel(to)})`;
}

// ── Text detection ────────────────────────────────────────────────────────────

// Returns a period spec ({ period, days?, month?, year? }) or null when the text
// names no period at all. Never guesses: an unmentioned period stays unmentioned
// so callers can apply their own default.
function detectPeriodFromText(text) {
  const source = normalizeText(text);
  if (!source) return null;

  const days = source.match(/(\d{1,3})\s*ngay\s*(?:qua|gan day|vua qua|truoc|nay)/);
  if (days) return { period: 'last_n_days', days: clampInt(days[1], 1, 730, 7) };

  const weeks = source.match(/(\d{1,2})\s*tuan\s*(?:qua|gan day|vua qua|truoc)/);
  if (weeks) return { period: 'last_n_days', days: clampInt(weeks[1], 1, 104, 1) * 7 };

  const months = source.match(/(\d{1,2})\s*thang\s*(?:qua|gan day|vua qua|truoc day)/);
  if (months) return { period: 'last_n_months', days: clampInt(months[1], 1, 60, 3) };

  if (/\bhom nay\b|\bngay hom nay\b|\bbua nay\b/.test(source)) return { period: 'today' };
  if (/\bhom qua\b/.test(source)) return { period: 'yesterday' };
  if (/\bhom kia\b/.test(source)) return { period: 'day_before_yesterday' };

  if (/\btuan nay\b/.test(source)) return { period: 'this_week' };
  if (/\btuan (?:truoc|roi|vua roi|vua qua|ngoai)\b/.test(source)) return { period: 'last_week' };
  if (/\btuan qua\b/.test(source)) return { period: 'last_n_days', days: 7 };

  if (/\bthang nay\b/.test(source)) return { period: 'this_month' };
  if (/\bthang (?:truoc|roi|vua roi|vua qua)\b/.test(source)) return { period: 'last_month' };

  if (/\bquy nay\b/.test(source)) return { period: 'this_quarter' };
  if (/\bquy (?:truoc|roi|vua roi)\b/.test(source)) return { period: 'last_quarter' };

  if (/\btu dau nam\b/.test(source)) return { period: 'year_to_date' };
  if (/\bnam nay\b/.test(source)) return { period: 'this_year' };
  if (/\bnam (?:truoc|ngoai)\b/.test(source)) return { period: 'last_year' };

  const explicitMonth = source.match(/thang\s*(\d{1,2})(?:\s*[\/-]\s*(\d{4}))?/);
  if (explicitMonth) {
    const month = Number(explicitMonth[1]);
    if (month >= 1 && month <= 12) {
      return { period: 'month', month, year: explicitMonth[2] ? Number(explicitMonth[2]) : null };
    }
  }
  const explicitQuarter = source.match(/quy\s*([1-4])(?:\s*[\/-]\s*(\d{4}))?/);
  if (explicitQuarter) {
    return { period: 'quarter', quarter: Number(explicitQuarter[1]), year: explicitQuarter[2] ? Number(explicitQuarter[2]) : null };
  }
  const explicitYear = source.match(/\bnam\s*(20\d{2})\b/);
  if (explicitYear) return { period: 'year', year: Number(explicitYear[1]) };

  return null;
}

// ── Resolution ────────────────────────────────────────────────────────────────

function normalizeKind(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return null;
  if (PERIOD_ALIASES[key]) return PERIOD_ALIASES[key];
  if (key === 'month' || key === 'quarter' || key === 'year') return key;
  return null;
}

function resolvePeriod(spec = {}, now = new Date()) {
  const today = startOfDay(now);
  const requestedMonth = clampInt(spec.month, 1, 12, null);
  const requestedYear = clampInt(spec.year, 2020, 2100, null);
  const rawKind = String(spec.period || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  let kind = normalizeKind(spec.period);

  // An explicit from/to pair always wins: it is the least ambiguous input.
  const from = isDateKey(spec.from) ? parseDateKey(spec.from) : null;
  const to = isDateKey(spec.to) ? parseDateKey(spec.to) : null;
  if (from || to) {
    const start = from || new Date(to.getFullYear(), to.getMonth(), 1);
    const end = to || today;
    const [left, right] = start <= end ? [start, end] : [end, start];
    return result('custom', left, right, `từ ${dayLabel(left)} đến ${dayLabel(right)}`);
  }

  // Explicit month/year without a named period means that calendar month.
  if (!kind && requestedMonth) kind = 'month';
  if (!kind && requestedYear) kind = 'year';
  if (kind === 'custom') kind = null;

  const explicit = Boolean(kind);
  if (!kind) kind = 'this_month';

  switch (kind) {
    case 'today':
      return result('today', today, today, `hôm nay (${dayLabel(today)})`);
    case 'yesterday': {
      const day = addDays(today, -1);
      return result('yesterday', day, day, `hôm qua (${dayLabel(day)})`);
    }
    case 'day_before_yesterday': {
      const day = addDays(today, -2);
      return result('day_before_yesterday', day, day, `hôm kia (${dayLabel(day)})`);
    }
    case 'this_week': {
      const start = startOfWeek(today);
      return result('this_week', start, addDays(start, 6), rangeLabel('tuần này', start, addDays(start, 6)));
    }
    case 'last_week': {
      const start = addDays(startOfWeek(today), -7);
      const end = addDays(start, 6);
      return result('last_week', start, end, rangeLabel('tuần trước', start, end));
    }
    case 'last_n_days': {
      const days = clampInt(spec.days ?? (rawKind === 'last_30_days' ? 30 : 7), 1, 730, 7);
      const start = addDays(today, -(days - 1));
      return result('last_n_days', start, today, rangeLabel(`${days} ngày qua`, start, today));
    }
    case 'last_n_months': {
      const months = clampInt(spec.days ?? spec.months, 1, 60, 3);
      const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
      return result('last_n_months', start, today, rangeLabel(`${months} tháng qua`, start, today));
    }
    case 'last_month': {
      const date = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const window = monthWindow(date.getMonth() + 1, date.getFullYear());
      return result('month', window.from, window.to, `tháng ${date.getMonth() + 1}/${date.getFullYear()}`, {
        month: date.getMonth() + 1,
        year: date.getFullYear(),
      });
    }
    case 'this_quarter':
    case 'last_quarter':
    case 'quarter': {
      const year = requestedYear || today.getFullYear();
      const currentQuarter = Math.floor(today.getMonth() / 3) + 1;
      const quarter = kind === 'quarter'
        ? clampInt(spec.quarter, 1, 4, currentQuarter)
        : kind === 'last_quarter' ? (currentQuarter === 1 ? 4 : currentQuarter - 1) : currentQuarter;
      const quarterYear = kind === 'last_quarter' && currentQuarter === 1 ? year - 1 : year;
      const startMonth = (quarter - 1) * 3 + 1;
      const start = new Date(quarterYear, startMonth - 1, 1);
      const end = new Date(quarterYear, startMonth + 2, 0);
      return result('quarter', start, end, `quý ${quarter}/${quarterYear}`, { year: quarterYear });
    }
    case 'this_year':
    case 'last_year':
    case 'year': {
      const year = kind === 'last_year'
        ? (requestedYear || today.getFullYear()) - 1
        : requestedYear || today.getFullYear();
      return result('year', new Date(year, 0, 1), new Date(year, 11, 31), `năm ${year}`, { year });
    }
    case 'year_to_date': {
      const year = requestedYear || today.getFullYear();
      const start = new Date(year, 0, 1);
      return result('year_to_date', start, today, `từ đầu năm ${year} đến ${dayLabel(today)}`, { year });
    }
    case 'month':
    case 'this_month':
    default: {
      const month = requestedMonth || today.getMonth() + 1;
      const year = requestedYear || today.getFullYear();
      const window = monthWindow(month, year);
      return {
        ...result('month', window.from, window.to, `tháng ${month}/${year}`, { month, year }),
        explicit,
      };
    }
  }
}

// Convenience wrapper: prefer the tool arguments, fall back to whatever the raw
// user text says, and only then to the current month.
function resolveQueryWindow(spec = {}, text = '', now = new Date()) {
  const hasSpec = spec.period || spec.from || spec.to || spec.month || spec.year;
  if (hasSpec) return resolvePeriod(spec, now);
  const detected = detectPeriodFromText(text);
  return resolvePeriod(detected || {}, now);
}

module.exports = {
  PERIOD_VALUES,
  detectPeriodFromText,
  resolvePeriod,
  resolveQueryWindow,
  startOfWeek,
  dateKey,
};

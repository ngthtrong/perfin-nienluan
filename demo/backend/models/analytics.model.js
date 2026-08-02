// Data-access for the Analytics Engine. Returns raw numeric series the pure
// algorithms operate on. Kept separate from services/analytics/* so the math stays
// unit-testable without a database.

const { query } = require('../config/database');
const {
  completeDailyTotals,
  completeMonthlyByCategory,
  completeMonthlyCashflow,
  localDayKey,
  recentMonthKeys,
} = require('../services/analytics/timeSeries');

const DEFAULT_USER = 'default_user';

const AnalyticsModel = {
  // Monthly expense totals per category over the last `months` completed months
  // (oldest→newest per category), including zero-spend months. The current month
  // is excluded because its partial total is not comparable to full months. Shape:
  // { [categoryName]: { icon, series:[{ ym, total }] } }
  async monthlyByCategory(userId = DEFAULT_USER, months = 6, options = {}) {
    const windowMonths = Number.isInteger(Number(months)) && Number(months) > 0 ? Number(months) : 6;
    const asOf = options.asOf ? new Date(options.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      const error = new Error('Ngày kết thúc lịch sử không hợp lệ');
      error.status = 400;
      throw error;
    }
    const asOfDay = typeof options.asOf === 'string' && /^\d{4}-\d{2}-\d{2}/.test(options.asOf)
      ? options.asOf.slice(0, 10)
      : localDayKey(asOf);
    const completedAnchorMonth = recentMonthKeys(2, asOfDay.slice(0, 7))[0];
    const result = await query(
      `SELECT c.name AS category_name, c.icon,
              to_char(date_trunc('month', t.transaction_date), 'YYYY-MM') AS ym,
              SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.type = 'expense'
         AND w.currency = 'VND'
         AND t.transaction_date >= date_trunc('month', $2::date) - ($3::int * INTERVAL '1 month')
         AND t.transaction_date < date_trunc('month', $2::date)
       GROUP BY c.name, c.icon, ym
       ORDER BY c.name, ym`,
      [userId, asOfDay, windowMonths]
    );
    return completeMonthlyByCategory(result.rows, windowMonths, completedAnchorMonth);
  },

  // Daily expense totals for exactly the last `days` calendar days (for anomaly
  // + runway), including zero-spend days.
  async dailyExpenses(userId = DEFAULT_USER, days = 30) {
    const windowDays = Number.isInteger(Number(days)) && Number(days) > 0 ? Number(days) : 30;
    const result = await query(
      `SELECT t.transaction_date::date AS day, SUM(t.amount) AS total
       FROM transactions t
       JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.type = 'expense'
         AND w.currency = 'VND'
         AND t.transaction_date >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
         AND t.transaction_date < CURRENT_DATE + INTERVAL '1 day'
       GROUP BY day ORDER BY day`,
      [userId, windowDays]
    );
    return completeDailyTotals(result.rows, windowDays);
  },

  // Individual transactions in a window (for the subscription miner).
  async recentTransactions(userId = DEFAULT_USER, days = 200) {
    const result = await query(
      `SELECT t.description, t.amount, t.transaction_date, t.type
       FROM transactions t
       JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL
         AND w.currency = 'VND'
         AND t.transaction_date >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
         AND t.transaction_date < CURRENT_DATE + INTERVAL '1 day'
       ORDER BY t.transaction_date`,
      [userId, days]
    );
    return result.rows.map((r) => ({
      description: r.description,
      amount: Number(r.amount),
      transaction_date: r.transaction_date,
      type: r.type,
    }));
  },

  // Expense by category by ISO week (for cross-category correlation).
  async weeklyByCategory(userId = DEFAULT_USER, weeks = 12, options = {}) {
    const windowWeeks = Number.isInteger(Number(weeks)) && Number(weeks) > 0 ? Number(weeks) : 12;
    const asOf = options.asOf ? new Date(options.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      const error = new Error('Ngày kết thúc lịch sử không hợp lệ');
      error.status = 400;
      throw error;
    }
    const asOfDay = typeof options.asOf === 'string' && /^\d{4}-\d{2}-\d{2}/.test(options.asOf)
      ? options.asOf.slice(0, 10)
      : localDayKey(asOf);
    const result = await query(
      `SELECT c.name AS category_name,
              to_char(date_trunc('week', t.transaction_date), 'IYYY-IW') AS yw,
              SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.type = 'expense'
         AND w.currency = 'VND'
         AND t.transaction_date >= date_trunc('week', $2::date) - ($3::int * INTERVAL '1 week')
         AND t.transaction_date < date_trunc('week', $2::date)
       GROUP BY c.name, yw
       ORDER BY yw`,
      [userId, asOfDay, windowWeeks]
    );
    return result.rows.map((r) => ({ category: r.category_name, yw: r.yw, total: Number(r.total) }));
  },

  // Day-of-week average expense (0=Sunday..6=Saturday).
  async dayOfWeekSpending(userId = DEFAULT_USER, days = 60) {
    const result = await query(
      `SELECT EXTRACT(DOW FROM t.transaction_date)::int AS dow,
              SUM(t.amount) AS total, COUNT(DISTINCT t.transaction_date) AS active_days
       FROM transactions t
       JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.type = 'expense'
         AND w.currency = 'VND'
         AND t.transaction_date >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
         AND t.transaction_date < CURRENT_DATE + INTERVAL '1 day'
       GROUP BY dow ORDER BY dow`,
      [userId, days]
    );
    return result.rows.map((r) => ({
      dow: r.dow,
      total: Number(r.total),
      avgPerActiveDay: r.active_days > 0 ? Number(r.total) / Number(r.active_days) : 0,
    }));
  },

  // Average monthly income & expense over the last `months` completed calendar
  // months (for surplus / goal planner). The current partial month is excluded so
  // an early-month snapshot cannot depress the historical average.
  async monthlyCashflow(userId = DEFAULT_USER, months = 6, options = {}) {
    const windowMonths = Number.isInteger(Number(months)) && Number(months) > 0 ? Number(months) : 6;
    const asOf = options.asOf ? new Date(options.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      const error = new Error('Ngày kết thúc lịch sử không hợp lệ');
      error.status = 400;
      throw error;
    }
    const asOfDay = typeof options.asOf === 'string' && /^\d{4}-\d{2}-\d{2}/.test(options.asOf)
      ? options.asOf.slice(0, 10)
      : localDayKey(asOf);
    const completedAnchorMonth = recentMonthKeys(2, asOfDay.slice(0, 7))[0];
    const result = await query(
      `SELECT to_char(date_trunc('month', t.transaction_date), 'YYYY-MM') AS ym,
              COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END),0) AS income,
              COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END),0) AS expense
       FROM transactions t
       JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL
         AND w.currency = 'VND'
         AND t.transaction_date >= date_trunc('month', $2::date) - ($3::int * INTERVAL '1 month')
         AND t.transaction_date < date_trunc('month', $2::date)
       GROUP BY ym ORDER BY ym`,
      [userId, asOfDay, windowMonths]
    );
    return completeMonthlyCashflow(result.rows, windowMonths, completedAnchorMonth);
  },
};

module.exports = AnalyticsModel;

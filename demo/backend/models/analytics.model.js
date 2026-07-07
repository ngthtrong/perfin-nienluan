// Data-access for the Analytics Engine. Returns raw numeric series the pure
// algorithms operate on. Kept separate from services/analytics/* so the math stays
// unit-testable without a database.

const { query } = require('../config/database');

const DEFAULT_USER = 'default_user';

const AnalyticsModel = {
  // Monthly expense totals per category over the last `months` months (oldest→newest
  // per category). Shape: { [categoryName]: { icon, series:[{ ym, total }] } }
  async monthlyByCategory(userId = DEFAULT_USER, months = 6) {
    const result = await query(
      `SELECT c.name AS category_name, c.icon,
              to_char(date_trunc('month', t.transaction_date), 'YYYY-MM') AS ym,
              SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.type = 'expense'
         AND t.transaction_date >= (date_trunc('month', CURRENT_DATE) - ($2 || ' months')::interval)
       GROUP BY c.name, c.icon, ym
       ORDER BY c.name, ym`,
      [userId, months - 1]
    );
    const byCat = {};
    for (const row of result.rows) {
      if (!byCat[row.category_name]) byCat[row.category_name] = { icon: row.icon, series: [] };
      byCat[row.category_name].series.push({ ym: row.ym, total: Number(row.total) });
    }
    return byCat;
  },

  // Daily expense totals for the last `days` days (for anomaly + runway).
  async dailyExpenses(userId = DEFAULT_USER, days = 30) {
    const result = await query(
      `SELECT t.transaction_date::date AS day, SUM(t.amount) AS total
       FROM transactions t
       WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.type = 'expense'
         AND t.transaction_date >= CURRENT_DATE - ($2 || ' days')::interval
       GROUP BY day ORDER BY day`,
      [userId, days]
    );
    return result.rows.map((r) => ({ label: r.day.toISOString().slice(0, 10), value: Number(r.total) }));
  },

  // Individual transactions in a window (for the subscription miner).
  async recentTransactions(userId = DEFAULT_USER, days = 90) {
    const result = await query(
      `SELECT description, amount, transaction_date, type
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
         AND transaction_date >= CURRENT_DATE - ($2 || ' days')::interval
       ORDER BY transaction_date`,
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
  async weeklyByCategory(userId = DEFAULT_USER, weeks = 12) {
    const result = await query(
      `SELECT c.name AS category_name,
              to_char(date_trunc('week', t.transaction_date), 'IYYY-IW') AS yw,
              SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.type = 'expense'
         AND t.transaction_date >= CURRENT_DATE - ($2 || ' weeks')::interval
       GROUP BY c.name, yw
       ORDER BY yw`,
      [userId, weeks]
    );
    return result.rows.map((r) => ({ category: r.category_name, yw: r.yw, total: Number(r.total) }));
  },

  // Day-of-week average expense (0=Sunday..6=Saturday).
  async dayOfWeekSpending(userId = DEFAULT_USER, days = 60) {
    const result = await query(
      `SELECT EXTRACT(DOW FROM transaction_date)::int AS dow,
              SUM(amount) AS total, COUNT(DISTINCT transaction_date) AS active_days
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL AND type = 'expense'
         AND transaction_date >= CURRENT_DATE - ($2 || ' days')::interval
       GROUP BY dow ORDER BY dow`,
      [userId, days]
    );
    return result.rows.map((r) => ({
      dow: r.dow,
      total: Number(r.total),
      avgPerActiveDay: r.active_days > 0 ? Number(r.total) / Number(r.active_days) : 0,
    }));
  },

  // Average monthly income & expense over last `months` (for surplus / goal planner).
  async monthlyCashflow(userId = DEFAULT_USER, months = 6) {
    const result = await query(
      `SELECT to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS ym,
              COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
              COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
         AND transaction_date >= (date_trunc('month', CURRENT_DATE) - ($2 || ' months')::interval)
       GROUP BY ym ORDER BY ym`,
      [userId, months - 1]
    );
    return result.rows.map((r) => ({ ym: r.ym, income: Number(r.income), expense: Number(r.expense) }));
  },
};

module.exports = AnalyticsModel;

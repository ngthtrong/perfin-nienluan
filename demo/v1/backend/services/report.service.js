const { query } = require('../config/database');
const TransactionModel = require('../models/transaction.model');

const DEFAULT_USER = 'default_user';

const ReportService = {
  async getMonthlySummary(userId = DEFAULT_USER, month, year) {
    return TransactionModel.getMonthlySummary(userId, month, year);
  },

  async getCategoryBreakdown(userId = DEFAULT_USER, month, year) {
    const now = new Date();
    const m = Number(month || now.getMonth() + 1);
    const y = Number(year || now.getFullYear());
    const result = await query(
      `SELECT c.id AS category_id, c.name AS category_name, c.icon, SUM(t.amount) AS total, COUNT(t.id) AS count
       FROM transactions t JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.type = 'expense'
         AND EXTRACT(MONTH FROM t.transaction_date) = $2
         AND EXTRACT(YEAR FROM t.transaction_date) = $3
       GROUP BY c.id, c.name, c.icon
       ORDER BY total DESC`,
      [userId, m, y]
    );
    const total = result.rows.reduce((sum, row) => sum + Number(row.total), 0);
    return result.rows.map((row) => ({
      ...row,
      total: Number(row.total),
      count: Number(row.count),
      percentage: total ? Number(((Number(row.total) / total) * 100).toFixed(1)) : 0,
    }));
  },

  async getMonthlyTrend(userId = DEFAULT_USER, year) {
    const y = Number(year || new Date().getFullYear());
    const result = await query(
      `SELECT EXTRACT(MONTH FROM transaction_date) AS month,
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL AND EXTRACT(YEAR FROM transaction_date) = $2
       GROUP BY EXTRACT(MONTH FROM transaction_date)
       ORDER BY month`,
      [userId, y]
    );
    const byMonth = new Map(result.rows.map((row) => [Number(row.month), row]));
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const row = byMonth.get(month);
      const income = row ? Number(row.income) : 0;
      const expense = row ? Number(row.expense) : 0;
      return { month, month_name: `T${month}`, income, expense, net: income - expense };
    });
  },

  async getTopCategories(userId = DEFAULT_USER, month, year, limit = 5) {
    const data = await this.getCategoryBreakdown(userId, month, year);
    return data.slice(0, Number(limit || 5));
  },
};

module.exports = ReportService;

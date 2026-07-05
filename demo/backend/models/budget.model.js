const { query } = require('../config/database');
const CategoryModel = require('./category.model');

const DEFAULT_USER = 'default_user';

function statusFromPercentage(value) {
  if (value > 100) return 'exceeded';
  if (value >= 90) return 'danger';
  if (value >= 70) return 'warning';
  return 'safe';
}

const BudgetModel = {
  async create({ category_id, amount_limit, month, year, userId = DEFAULT_USER }) {
    const category = await CategoryModel.getById(category_id);
    if (!category || category.type !== 'expense') {
      const err = new Error('Chỉ danh mục chi tiêu mới có thể tạo ngân sách');
      err.status = 400;
      throw err;
    }
    const now = new Date();
    const result = await query(
      `INSERT INTO budgets (user_id, category_id, amount_limit, month, year)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, category_id, amount_limit, month || now.getMonth() + 1, year || now.getFullYear()]
    );
    return result.rows[0];
  },

  async getAll(userId = DEFAULT_USER, month, year) {
    const now = new Date();
    const result = await query(
      `SELECT b.*, c.name AS category_name, c.icon AS category_icon
       FROM budgets b JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
       ORDER BY c.name`,
      [userId, Number(month || now.getMonth() + 1), Number(year || now.getFullYear())]
    );
    return result.rows;
  },

  async getById(id) {
    const result = await query(
      `SELECT b.*, c.name AS category_name, c.icon AS category_icon
       FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async update(id, { amount_limit }) {
    const current = await this.getById(id);
    if (!current) return null;
    const result = await query('UPDATE budgets SET amount_limit = $2, updated_at = NOW() WHERE id = $1 RETURNING *', [id, amount_limit]);
    await query('INSERT INTO budget_history (budget_id, change_type, old_value, new_value) VALUES ($1, $2, $3, $4)', [id, 'amount_limit', current.amount_limit, amount_limit]);
    return result.rows[0];
  },

  async delete(id) {
    const result = await query('DELETE FROM budgets WHERE id = $1 RETURNING id', [id]);
    return result.rowCount ? { success: true } : null;
  },

  async getProgress(userId = DEFAULT_USER, month, year) {
    const now = new Date();
    const m = Number(month || now.getMonth() + 1);
    const y = Number(year || now.getFullYear());
    const result = await query(
      `SELECT b.id AS budget_id, b.amount_limit, b.category_id, c.name AS category_name, c.icon AS category_icon,
              COALESCE(SUM(t.amount), 0) AS spent,
              b.amount_limit - COALESCE(SUM(t.amount), 0) AS remaining,
              CASE WHEN b.amount_limit = 0 THEN 0 ELSE ROUND((COALESCE(SUM(t.amount), 0) / b.amount_limit) * 100, 1) END AS percentage
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       LEFT JOIN transactions t ON t.category_id = b.category_id
         AND t.user_id = b.user_id
         AND t.type = 'expense'
         AND t.deleted_at IS NULL
         AND EXTRACT(MONTH FROM t.transaction_date) = b.month
         AND EXTRACT(YEAR FROM t.transaction_date) = b.year
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
       GROUP BY b.id, b.amount_limit, b.category_id, c.name, c.icon
       ORDER BY percentage DESC`,
      [userId, m, y]
    );
    return result.rows.map((row) => ({
      ...row,
      amount_limit: Number(row.amount_limit),
      spent: Number(row.spent),
      remaining: Number(row.remaining),
      percentage: Number(row.percentage),
      status: statusFromPercentage(Number(row.percentage)),
    }));
  },
};

module.exports = BudgetModel;

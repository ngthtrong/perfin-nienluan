const { pool, query } = require('../config/database');
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
    const category = await CategoryModel.getById(category_id, userId);
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

  async getRecommendationHistory(userId = DEFAULT_USER, options = {}) {
    const months = Math.min(Math.max(Number(options.months || 6), 1), 24);
    const asOf = options.asOf ? new Date(options.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      const error = new Error('Ngày kết thúc lịch sử không hợp lệ');
      error.status = 400;
      throw error;
    }
    const result = await query(
      `SELECT TO_CHAR(DATE_TRUNC('month', t.transaction_date), 'YYYY-MM') AS period,
              t.type,
              t.category_id,
              c.name AS category_name,
              SUM(t.amount)::numeric AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1
         AND t.deleted_at IS NULL
         AND t.transaction_date >= DATE_TRUNC('month', $2::date) - ($3::int * INTERVAL '1 month')
         AND t.transaction_date < DATE_TRUNC('month', $2::date)
       GROUP BY DATE_TRUNC('month', t.transaction_date), t.type, t.category_id, c.name
       ORDER BY period ASC, t.type ASC, c.name ASC`,
      [userId, asOf.toISOString().slice(0, 10), months]
    );
    return result.rows;
  },

  async upsertRecommendations(items, { userId = DEFAULT_USER, month, year } = {}) {
    if (!Array.isArray(items) || !items.length || items.length > 50) {
      const error = new Error('Danh sách đề xuất ngân sách phải có từ 1 đến 50 mục');
      error.status = 400;
      throw error;
    }
    const now = new Date();
    const m = Number(month || now.getMonth() + 1);
    const y = Number(year || now.getFullYear());
    if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 2020 || y > 2100) {
      const error = new Error('Kỳ ngân sách không hợp lệ');
      error.status = 400;
      throw error;
    }

    const client = await pool.connect();
    const saved = [];
    try {
      await client.query('BEGIN');
      for (const item of items) {
        const categoryId = Number(item.category_id);
        const limit = Number(item.amount_limit ?? item.recommended_limit);
        if (!Number.isInteger(categoryId) || !(limit > 0)) {
          const error = new Error('Đề xuất ngân sách có danh mục hoặc hạn mức không hợp lệ');
          error.status = 400;
          throw error;
        }
        const category = await client.query(
          `SELECT id FROM categories WHERE id = $1 AND type = 'expense'::category_type
             AND (is_default = true OR user_id = $2)`,
          [categoryId, userId]
        );
        if (!category.rowCount) {
          const error = new Error(`Danh mục ${categoryId} không hợp lệ`);
          error.status = 400;
          throw error;
        }
        const existing = await client.query(
          'SELECT * FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4 FOR UPDATE',
          [userId, categoryId, m, y]
        );
        const result = await client.query(
          `INSERT INTO budgets (user_id, category_id, amount_limit, month, year)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, category_id, month, year)
           DO UPDATE SET amount_limit = EXCLUDED.amount_limit, updated_at = NOW()
           RETURNING *`,
          [userId, categoryId, limit, m, y]
        );
        if (existing.rows[0] && Number(existing.rows[0].amount_limit) !== limit) {
          await client.query(
            'INSERT INTO budget_history (budget_id, change_type, old_value, new_value) VALUES ($1, $2, $3, $4)',
            [result.rows[0].id, 'ai_recommendation', existing.rows[0].amount_limit, limit]
          );
        }
        saved.push(result.rows[0]);
      }
      await client.query('COMMIT');
      return saved;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = BudgetModel;

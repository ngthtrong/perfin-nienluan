const { query } = require('../config/database');

const DEFAULT_USER = 'default_user';

const GoalModel = {
  async getAll(userId = DEFAULT_USER) {
    const result = await query(
      `SELECT * FROM financial_goals WHERE user_id = $1 AND status != 'cancelled' ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async getById(id, userId = DEFAULT_USER) {
    const result = await query('SELECT * FROM financial_goals WHERE id = $1 AND user_id = $2', [id, userId]);
    return result.rows[0] || null;
  },

  async create(data, userId = DEFAULT_USER) {
    const result = await query(
      `INSERT INTO financial_goals
         (user_id, name, goal_type, target_amount, current_amount, target_date, monthly_contribution, annual_interest_rate, linked_wallet_id, note)
       VALUES ($1, $2, $3::goal_type, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        data.name,
        data.goal_type || 'saving',
        data.target_amount,
        data.current_amount || 0,
        data.target_date || null,
        data.monthly_contribution || null,
        data.annual_interest_rate || 0,
        data.linked_wallet_id || null,
        data.note || null,
      ]
    );
    return result.rows[0];
  },

  async update(id, data, userId = DEFAULT_USER) {
    const result = await query(
      `UPDATE financial_goals SET
         name = COALESCE($3, name),
         target_amount = COALESCE($4, target_amount),
         current_amount = COALESCE($5, current_amount),
         target_date = COALESCE($6, target_date),
         monthly_contribution = COALESCE($7, monthly_contribution),
         annual_interest_rate = COALESCE($8, annual_interest_rate),
         status = COALESCE($9::goal_status, status),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, data.name || null, data.target_amount || null, data.current_amount ?? null,
        data.target_date || null, data.monthly_contribution || null, data.annual_interest_rate ?? null, data.status || null]
    );
    return result.rows[0] || null;
  },

  async remove(id, userId = DEFAULT_USER) {
    await query(`UPDATE financial_goals SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND user_id = $2`, [id, userId]);
    return { success: true };
  },
};

module.exports = GoalModel;

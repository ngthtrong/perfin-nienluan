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
        data.goal_type ?? 'saving',
        data.target_amount,
        data.current_amount ?? 0,
        data.target_date ?? null,
        data.monthly_contribution ?? null,
        data.annual_interest_rate ?? 0,
        data.linked_wallet_id ?? null,
        data.note ?? null,
      ]
    );
    return result.rows[0];
  },

  async update(id, data, userId = DEFAULT_USER) {
    const columns = {
      name: 'name',
      goal_type: 'goal_type',
      target_amount: 'target_amount',
      current_amount: 'current_amount',
      target_date: 'target_date',
      monthly_contribution: 'monthly_contribution',
      annual_interest_rate: 'annual_interest_rate',
      linked_wallet_id: 'linked_wallet_id',
      status: 'status',
      note: 'note',
    };
    const enumCasts = { goal_type: 'goal_type', status: 'goal_status' };
    const values = [id, userId];
    const assignments = [];

    for (const [field, column] of Object.entries(columns)) {
      if (!Object.prototype.hasOwnProperty.call(data, field)) continue;
      values.push(data[field]);
      const cast = enumCasts[field] ? `::${enumCasts[field]}` : '';
      assignments.push(`${column} = $${values.length}${cast}`);
    }

    if (!assignments.length) return this.getById(id, userId);
    const result = await query(
      `UPDATE financial_goals
       SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async remove(id, userId = DEFAULT_USER) {
    const result = await query(
      `UPDATE financial_goals
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status != 'cancelled'
       RETURNING id`,
      [id, userId]
    );
    return { success: result.rowCount > 0, id: result.rows[0]?.id ?? null };
  },
};

module.exports = GoalModel;

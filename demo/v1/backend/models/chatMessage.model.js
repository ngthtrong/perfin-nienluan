const { query } = require('../config/database');

const DEFAULT_USER = 'default_user';

module.exports = {
  async create({ userId = DEFAULT_USER, role, content, metadata = {} }) {
    const result = await query(
      'INSERT INTO chat_messages (user_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, role, content, JSON.stringify(metadata)]
    );
    return result.rows[0];
  },
  async getRecent(userId = DEFAULT_USER, limit = 10) {
    const result = await query('SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    return result.rows.reverse();
  },
};

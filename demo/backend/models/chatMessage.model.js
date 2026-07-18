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
  async getRecurringWorkerMessagesForDate(userId = DEFAULT_USER, dateKey) {
    const result = await query(
      `SELECT metadata
       FROM chat_messages
       WHERE user_id = $1
         AND metadata->>'source' = 'proactive_worker'
         AND metadata->>'notification_type' = 'recurring_bill_reminder'
         AND metadata->>'local_date' = $2`,
      [userId, dateKey]
    );
    return result.rows;
  },

  async getLatestCategoryRetagContext(userId = DEFAULT_USER) {
    const result = await query(
      `SELECT metadata
       FROM chat_messages
       WHERE user_id = $1
         AND jsonb_typeof(metadata->'category_retag'->'transaction_ids') = 'array'
         AND created_at >= NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  async getLatestRecurringReminderContext(userId = DEFAULT_USER, dateKey) {
    const result = await query(
      `SELECT metadata, created_at
       FROM chat_messages
       WHERE user_id = $1
         AND metadata->>'notification_type' = 'recurring_bill_reminder'
         AND metadata->>'local_date' = $2
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [userId, dateKey]
    );
    return result.rows[0] || null;
  },
};

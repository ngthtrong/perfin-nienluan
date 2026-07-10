const { query } = require('../config/database');

const DEFAULT_USER = 'default_user';

const UserTraitModel = {
  async getProfile(userId = DEFAULT_USER) {
    const [user, traits] = await Promise.all([
      query('SELECT personalization_consent FROM users WHERE user_key = $1', [userId]),
      query('SELECT trait_type, trait_value, updated_at FROM user_traits WHERE user_id = $1 ORDER BY trait_type', [userId]),
    ]);
    return {
      consent: Boolean(user.rows[0]?.personalization_consent),
      traits: traits.rows,
    };
  },

  async setConsent(userId = DEFAULT_USER, consent = false) {
    const result = await query(
      `UPDATE users SET personalization_consent = $2, updated_at = NOW()
       WHERE user_key = $1 RETURNING personalization_consent`,
      [userId, consent === true]
    );
    return Boolean(result.rows[0]?.personalization_consent);
  },

  async upsert(userId = DEFAULT_USER, traitType, traitValue) {
    const type = String(traitType || '').trim();
    const value = String(traitValue || '').trim();
    if (!type || type.length > 100 || !value || value.length > 2000) {
      const error = new Error('Đặc điểm cá nhân hóa không hợp lệ');
      error.status = 400;
      throw error;
    }
    const result = await query(
      `INSERT INTO user_traits (user_id, trait_type, trait_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, trait_type)
       DO UPDATE SET trait_value = EXCLUDED.trait_value, updated_at = NOW()
       RETURNING *`,
      [userId, type, value]
    );
    return result.rows[0];
  },

  async remove(userId = DEFAULT_USER, traitType) {
    const result = await query('DELETE FROM user_traits WHERE user_id = $1 AND trait_type = $2 RETURNING id', [userId, traitType]);
    return { success: result.rowCount > 0 };
  },
};

module.exports = UserTraitModel;

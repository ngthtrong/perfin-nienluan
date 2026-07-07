const { query } = require('../config/database');
const Persona = require('../services/persona.service');

const DEFAULT_USER = 'default_user';

const PersonaModel = {
  async list() {
    const result = await query(
      'SELECT id, key, name, description, is_default FROM ai_personalities ORDER BY is_default DESC, id ASC'
    );
    return result.rows;
  },

  async getActive(userId = DEFAULT_USER) {
    const result = await query(
      `SELECT p.id, p.key, p.name, p.description
       FROM users u JOIN ai_personalities p ON p.id = u.active_personality_id
       WHERE u.user_key = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  async setActive(personaId, userId = DEFAULT_USER) {
    const persona = await query('SELECT id, key, name FROM ai_personalities WHERE id = $1', [personaId]);
    if (!persona.rows[0]) {
      const err = new Error('Nhân cách AI không tồn tại');
      err.status = 404;
      throw err;
    }
    await query(
      `INSERT INTO users (user_key, active_personality_id) VALUES ($1, $2)
       ON CONFLICT (user_key) DO UPDATE SET active_personality_id = $2, updated_at = NOW()`,
      [userId, personaId]
    );
    await Persona.invalidate(userId);
    return persona.rows[0];
  },
};

module.exports = PersonaModel;

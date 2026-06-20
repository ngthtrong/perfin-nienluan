const { query } = require('../config/database');

const DEFAULT_USER = 'default_user';

const AccountModel = {
  async ensureDefault(userId = DEFAULT_USER) {
    const existing = await this.getDefault(userId);
    if (existing) return existing;
    const result = await query(
      `INSERT INTO wallets (user_id, name, type, balance, currency, is_default)
       VALUES ($1, 'Tiền mặt', 'cash', 0, 'VND', true)
       ON CONFLICT (user_id, name) DO UPDATE SET is_default = true
       RETURNING *`,
      [userId]
    );
    return result.rows[0];
  },

  async getDefault(userId = DEFAULT_USER) {
    const result = await query('SELECT * FROM wallets WHERE user_id = $1 AND is_default = true ORDER BY id LIMIT 1', [userId]);
    return result.rows[0] || null;
  },

  async getAll(userId = DEFAULT_USER) {
    await this.ensureDefault(userId);
    const result = await query('SELECT * FROM wallets WHERE user_id = $1 ORDER BY is_default DESC, id ASC', [userId]);
    return result.rows;
  },

  async getById(id) {
    const result = await query('SELECT * FROM wallets WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async getBalance(id) {
    const wallet = await this.getById(id);
    return wallet ? Number(wallet.balance) : null;
  },

  async updateBalance(id, amount, operation = 'add') {
    const delta = operation === 'subtract' ? -Math.abs(amount) : Math.abs(amount);
    const result = await query('UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING *', [delta, id]);
    return result.rows[0] || null;
  },

  async create({ name, type = 'cash', balance = 0, is_default = false, userId = DEFAULT_USER }) {
    const result = await query(
      `INSERT INTO wallets (user_id, name, type, balance, is_default)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, name, type, balance, is_default]
    );
    return result.rows[0];
  },

  async update(id, { name }) {
    const result = await query('UPDATE wallets SET name = COALESCE($2, name), updated_at = NOW() WHERE id = $1 RETURNING *', [id, name || null]);
    return result.rows[0] || null;
  },
};

module.exports = AccountModel;

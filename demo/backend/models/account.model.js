const { query } = require('../config/database');
const KVStore = require('../services/store/kv.store');

const DEFAULT_USER = 'default_user';
const CACHE_TTL = 300;
const cacheKey = (userId) => `cache:wallets:${userId}`;

async function invalidateAfterWrite(userId) {
  try {
    await KVStore.del(cacheKey(userId));
  } catch (error) {
    // The row is already durable. Returning an error here would invite a retry
    // and turn a temporary cache outage into a duplicate wallet request.
    console.warn(`[account] post-write cache invalidation failed: ${error.message}`);
  }
}

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
    return KVStore.remember(cacheKey(userId), CACHE_TTL, async () => {
      const result = await query('SELECT * FROM wallets WHERE user_id = $1 ORDER BY is_default DESC, id ASC', [userId]);
      return result.rows;
    });
  },

  invalidateCache(userId = DEFAULT_USER) {
    return KVStore.del(cacheKey(userId));
  },

  async getById(id, userId = DEFAULT_USER) {
    const result = await query('SELECT * FROM wallets WHERE id = $1 AND user_id = $2', [id, userId]);
    return result.rows[0] || null;
  },

  async getBalance(id) {
    const wallet = await this.getById(id);
    return wallet ? Number(wallet.balance) : null;
  },

  async updateBalance(id, amount, operation = 'add') {
    const delta = operation === 'subtract' ? -Math.abs(amount) : Math.abs(amount);
    const result = await query('UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING *', [delta, id]);
    const wallet = result.rows[0] || null;
    if (wallet) await this.invalidateCache(wallet.user_id || DEFAULT_USER);
    return wallet;
  },

  async create({ name, type = 'cash', balance = 0, currency = 'VND', is_default = false, userId = DEFAULT_USER }) {
    let wallet;
    try {
      const result = await query(
        `INSERT INTO wallets (user_id, name, type, balance, initial_balance, currency, is_default)
         VALUES ($1, $2, $3, $4, $4, $5, $6)
         RETURNING *`,
        [userId, name, type, balance, currency, Boolean(is_default)]
      );
      wallet = result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        const duplicate = new Error('Tên ví đã tồn tại');
        duplicate.status = 409;
        duplicate.code = 'WALLET_NAME_EXISTS';
        duplicate.cause = error;
        throw duplicate;
      }
      throw error;
    }

    await invalidateAfterWrite(userId);
    return wallet;
  },

  async update(id, { name }, userId = DEFAULT_USER) {
    const result = await query(
      `UPDATE wallets
       SET name = COALESCE($3, name), updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, name || null]
    );
    const wallet = result.rows[0] || null;
    if (wallet) await invalidateAfterWrite(userId);
    return wallet;
  },
};

module.exports = AccountModel;

const { pool, query } = require('../config/database');
const KVStore = require('../services/store/kv.store');

const DEFAULT_USER = 'default_user';

function balanceDelta(type, amount) {
  return type === 'income' ? Number(amount) : -Number(amount);
}

async function invalidateFinancialCaches(userId = DEFAULT_USER) {
  await Promise.all([
    KVStore.del(`cache:wallets:${userId}`),
    KVStore.del(`cache:insights:${userId}`),
  ]);
}

async function getJoinedById(id, includeDeleted = false) {
  const result = await query(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, w.name AS wallet_name, w.balance AS wallet_balance
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     JOIN wallets w ON w.id = t.wallet_id
     WHERE t.id = $1 ${includeDeleted ? '' : 'AND t.deleted_at IS NULL'}`,
    [id]
  );
  return result.rows[0] || null;
}

const TransactionModel = {
  async create(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO transactions (user_id, description, amount, type, category_id, wallet_id, transaction_date, source, note, original_text, ai_parsed)
         VALUES ($1, $2, $3, $4::transaction_type, $5, $6, COALESCE($7, CURRENT_DATE), COALESCE($8, 'manual')::transaction_source, $9, $10, COALESCE($11::jsonb, '{}'::jsonb))
         RETURNING *`,
        [data.userId || DEFAULT_USER, data.description, data.amount, data.type, data.category_id, data.wallet_id, data.transaction_date || null, data.source || 'manual', data.note || null, data.original_text || null, data.ai_parsed ? JSON.stringify(data.ai_parsed) : null]
      );
      const tx = result.rows[0];
      const wallet = await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING balance',
        [balanceDelta(tx.type, tx.amount), tx.wallet_id, data.userId || DEFAULT_USER]
      );
      if (!wallet.rowCount) {
        const error = new Error('Ví giao dịch không tồn tại hoặc không thuộc người dùng');
        error.status = 400;
        throw error;
      }
      await client.query('COMMIT');
      await invalidateFinancialCaches(data.userId || DEFAULT_USER);
      return { ...(await getJoinedById(tx.id)), wallet_balance: Number(wallet.rows[0].balance) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Atomically create all transactions from a multi-transaction preview. If any
  // row is invalid, none of the wallet balances or transactions are committed.
  async createMany(items, userId = DEFAULT_USER) {
    if (!Array.isArray(items) || !items.length) return [];
    const client = await pool.connect();
    const ids = [];
    try {
      await client.query('BEGIN');
      for (const data of items) {
        const result = await client.query(
          `INSERT INTO transactions (user_id, description, amount, type, category_id, wallet_id, transaction_date, source, note, original_text, ai_parsed)
           VALUES ($1, $2, $3, $4::transaction_type, $5, $6, COALESCE($7, CURRENT_DATE), COALESCE($8, 'manual')::transaction_source, $9, $10, COALESCE($11::jsonb, '{}'::jsonb))
           RETURNING id, type, amount, wallet_id`,
          [userId, data.description, data.amount, data.type, data.category_id, data.wallet_id,
            data.transaction_date || null, data.source || 'manual', data.note || null,
            data.original_text || null, data.ai_parsed ? JSON.stringify(data.ai_parsed) : null]
        );
        const tx = result.rows[0];
        const walletUpdate = await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [balanceDelta(tx.type, tx.amount), tx.wallet_id, userId]
        );
        if (!walletUpdate.rowCount) {
          const error = new Error('Ví giao dịch không tồn tại hoặc không thuộc người dùng');
          error.status = 400;
          throw error;
        }
        ids.push(tx.id);
      }
      await client.query('COMMIT');
      await invalidateFinancialCaches(userId);
      return Promise.all(ids.map((id) => getJoinedById(id)));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getAll(userId = DEFAULT_USER, filters = {}) {
    const page = Math.max(Number(filters.page || 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit || 20), 1), 100);
    const offset = (page - 1) * limit;
    const where = ['t.deleted_at IS NULL', 't.user_id = $1'];
    const params = [userId];
    const add = (clause, value) => {
      params.push(value);
      where.push(clause.replace('?', `$${params.length}`));
    };
    if (filters.from) add('t.transaction_date >= ?', filters.from);
    if (filters.to) add('t.transaction_date <= ?', filters.to);
    if (filters.category_id) add('t.category_id = ?', filters.category_id);
    if (filters.type) add('t.type = ?', filters.type);
    if (filters.search) add('t.description ILIKE ?', `%${filters.search}%`);
    const count = await query(`SELECT COUNT(*) FROM transactions t WHERE ${where.join(' AND ')}`, params);
    params.push(limit, offset);
    const result = await query(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, w.name AS wallet_name
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       JOIN wallets w ON w.id = t.wallet_id
       WHERE ${where.join(' AND ')}
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const total = Number(count.rows[0].count);
    return { data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getById(id) {
    return getJoinedById(id, false);
  },

  async update(id, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const oldResult = await client.query('SELECT * FROM transactions WHERE id = $1 AND deleted_at IS NULL FOR UPDATE', [id]);
      const old = oldResult.rows[0];
      if (!old) return null;
      const next = { ...old, ...data };
      await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [balanceDelta(old.type, old.amount), old.wallet_id]);
      const updated = await client.query(
        `UPDATE transactions SET description = $2, amount = $3, type = $4, category_id = $5, transaction_date = $6, note = $7, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, next.description, next.amount, next.type, next.category_id, next.transaction_date, next.note]
      );
      await client.query('UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2', [balanceDelta(next.type, next.amount), old.wallet_id]);
      await client.query('COMMIT');
      await invalidateFinancialCaches(old.user_id || DEFAULT_USER);
      return getJoinedById(updated.rows[0].id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async updateCategory(id, categoryId) {
    const tx = await getJoinedById(id);
    if (!tx) return null;
    const category = await query('SELECT * FROM categories WHERE id = $1', [categoryId]);
    if (!category.rows[0]) {
      const err = new Error('Danh mục không tồn tại');
      err.status = 400;
      throw err;
    }
    if (category.rows[0].type !== tx.type) {
      const err = new Error('Loại danh mục không khớp với giao dịch');
      err.status = 400;
      throw err;
    }
    await query('UPDATE transactions SET category_id = $2, updated_at = NOW() WHERE id = $1', [id, categoryId]);
    await invalidateFinancialCaches(tx.user_id || DEFAULT_USER);
    return getJoinedById(id);
  },

  async softDelete(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const old = await client.query('UPDATE transactions SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *', [id]);
      const tx = old.rows[0];
      if (!tx) return null;
      await client.query('UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2', [balanceDelta(tx.type, tx.amount), tx.wallet_id]);
      await client.query('COMMIT');
      await invalidateFinancialCaches(tx.user_id || DEFAULT_USER);
      const deletedAt = new Date(tx.deleted_at);
      return { success: true, deleted_at: tx.deleted_at, restore_deadline: new Date(deletedAt.getTime() + 30000).toISOString() };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async restore(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const old = await client.query(
        `UPDATE transactions SET deleted_at = NULL, updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NOT NULL AND deleted_at > NOW() - INTERVAL '30 seconds'
         RETURNING *`,
        [id]
      );
      const tx = old.rows[0];
      if (!tx) {
        const err = new Error('Đã quá thời hạn khôi phục (30 giây)');
        err.status = 410;
        throw err;
      }
      await client.query('UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2', [balanceDelta(tx.type, tx.amount), tx.wallet_id]);
      await client.query('COMMIT');
      await invalidateFinancialCaches(tx.user_id || DEFAULT_USER);
      return getJoinedById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getMonthlySummary(userId = DEFAULT_USER, month, year) {
    const now = new Date();
    const m = Number(month || now.getMonth() + 1);
    const y = Number(year || now.getFullYear());
    const result = await query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
              COUNT(*) AS transaction_count
       FROM transactions
       WHERE deleted_at IS NULL AND user_id = $1
         AND EXTRACT(MONTH FROM transaction_date) = $2
         AND EXTRACT(YEAR FROM transaction_date) = $3`,
      [userId, m, y]
    );
    const row = result.rows[0];
    return {
      month: m,
      year: y,
      total_income: Number(row.total_income),
      total_expense: Number(row.total_expense),
      net: Number(row.total_income) - Number(row.total_expense),
      transaction_count: Number(row.transaction_count),
    };
  },
};

module.exports = TransactionModel;

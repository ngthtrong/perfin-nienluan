// Vai trò: Là lớp truy cập sổ cái cho giao dịch thu, chi và số dư ví.
// Luồng chính: validation, khóa ví, ghi hoặc sửa transaction nguyên tử rồi cập nhật cache.

const { pool, query, rollbackAfterFailure } = require('../config/database');
const KVStore = require('../services/store/kv.store');
const { EDITABLE_FIELDS, validateTransactionPayload } = require('../services/transactions/validation');
const { SORT_EXPRESSIONS, normalizeTransactionQuery } = require('../services/transactions/query');

const DEFAULT_USER = 'default_user';
const REPORTING_CURRENCY = 'VND';

function balanceDelta(type, amount) {
  return type === 'income' ? Number(amount) : -Number(amount);
}

async function invalidateFinancialCaches(userId = DEFAULT_USER) {
  await Promise.all([
    KVStore.del(`cache:wallets:${userId}`),
    KVStore.del(`cache:insights:${userId}`),
    KVStore.del(`cache:categories:${userId}`),
  ]);
}

function referenceError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'INVALID_TRANSACTION_REFERENCE';
  return error;
}

async function getJoinedById(id, userId = DEFAULT_USER, includeDeleted = false) {
  const result = await query(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, w.name AS wallet_name,
            w.balance AS wallet_balance, w.currency AS wallet_currency
     FROM transactions t
     JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
     JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
     WHERE t.id = $1 AND t.user_id = $2 ${includeDeleted ? '' : 'AND t.deleted_at IS NULL'}`,
    [id, userId]
  );
  return result.rows[0] || null;
}

async function lockOwnedCategories(client, categoryIds, userId) {
  const ids = [...new Set(categoryIds.map(Number))].sort((a, b) => a - b);
  const result = await client.query(
    `SELECT id, type, name, icon
     FROM categories
     WHERE id = ANY($1::int[]) AND user_id = $2
     ORDER BY id
     FOR KEY SHARE`,
    [ids, userId]
  );
  if (result.rows.length !== ids.length) {
    throw referenceError('Danh mục không tồn tại hoặc không thuộc người dùng');
  }
  return new Map(result.rows.map((row) => [Number(row.id), row]));
}

async function lockOwnedWallets(client, walletIds, userId) {
  const ids = [...new Set(walletIds.map(Number))].sort((a, b) => a - b);
  const result = await client.query(
    `SELECT id, balance, currency
     FROM wallets
     WHERE id = ANY($1::int[]) AND user_id = $2
     ORDER BY id
     FOR UPDATE`,
    [ids, userId]
  );
  if (result.rows.length !== ids.length) {
    throw referenceError('Ví giao dịch không tồn tại hoặc không thuộc người dùng');
  }
  return new Map(result.rows.map((row) => [Number(row.id), row]));
}

function assertTransactionWalletCurrency(wallets) {
  const unsupported = [...wallets.values()].find((wallet) => (
    String(wallet.currency || '').toUpperCase() !== REPORTING_CURRENCY
  ));
  if (!unsupported) return;
  const error = referenceError(`Sổ giao dịch hiện chỉ hỗ trợ ví ${REPORTING_CURRENCY}; chưa có quy đổi ngoại tệ`);
  error.code = 'UNSUPPORTED_TRANSACTION_CURRENCY';
  throw error;
}

function assertCategoryMatches(category, type) {
  if (category.type !== type) throw referenceError('Loại danh mục không khớp với giao dịch');
}

function editablePatch(old, data) {
  const next = { ...old };
  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(data, field)) next[field] = data[field];
  }
  return next;
}

async function invalidateAfterCommit(userId) {
  try {
    await invalidateFinancialCaches(userId);
  } catch (error) {
    // The database change is already durable. Reporting the whole request as
    // failed would encourage a retry and can duplicate a create operation.
    console.warn(`[transaction] post-commit cache invalidation failed: ${error.message}`);
  }
}

async function hydrateAfterCommit(id, userId, fallback, includeDeleted = false) {
  try {
    return (await getJoinedById(id, userId, includeDeleted)) || fallback;
  } catch (error) {
    console.warn(`[transaction] post-commit hydration failed: ${error.message}`);
    return fallback;
  }
}

const TransactionModel = {
  // Tạo một giao dịch và cập nhật số dư ví trong cùng database transaction.
  async create(data) {
    const ownerId = data.userId || DEFAULT_USER;
    validateTransactionPayload(data, { requireWallet: true });
    const client = await pool.connect();
    let transactionClosed = false;
    let tx;
    let walletBalance;
    try {
      await client.query('BEGIN');
      const categories = await lockOwnedCategories(client, [data.category_id], ownerId);
      assertCategoryMatches(categories.get(Number(data.category_id)), data.type);
      const wallets = await lockOwnedWallets(client, [data.wallet_id], ownerId);
      assertTransactionWalletCurrency(wallets);
      const result = await client.query(
        `INSERT INTO transactions (user_id, description, amount, type, category_id, wallet_id, transaction_date, source, note, original_text, ai_parsed)
         VALUES ($1, $2, $3, $4::transaction_type, $5, $6, COALESCE($7, CURRENT_DATE), COALESCE($8, 'manual')::transaction_source, $9, $10, COALESCE($11::jsonb, '{}'::jsonb))
         RETURNING *`,
        [ownerId, data.description.trim(), data.amount, data.type, data.category_id, data.wallet_id, data.transaction_date || null, data.source || 'manual', data.note ?? null, data.original_text || null, data.ai_parsed ? JSON.stringify(data.ai_parsed) : null]
      );
      tx = result.rows[0];
      const wallet = await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING balance',
        [balanceDelta(tx.type, tx.amount), tx.wallet_id, ownerId]
      );
      if (!wallet.rowCount) {
        const error = new Error('Ví giao dịch không tồn tại hoặc không thuộc người dùng');
        error.status = 400;
        throw error;
      }
      await client.query('COMMIT');
      transactionClosed = true;
      walletBalance = Number(wallet.rows[0].balance);
    } catch (error) {
      if (!transactionClosed) await rollbackAfterFailure(client, error);
      throw error;
    } finally {
      client.release();
    }

    // Post-commit work is best-effort: a durable create must still be reported as
    // successful even if Redis or response hydration is temporarily unavailable.
    await invalidateAfterCommit(ownerId);
    return {
      ...(await hydrateAfterCommit(tx.id, ownerId, { ...tx, wallet_balance: walletBalance })),
      wallet_balance: walletBalance,
    };
  },

  // Atomically create all transactions from a multi-transaction preview. If any
  // row is invalid, none of the wallet balances or transactions are committed.
  // Ghi nhiều giao dịch theo kiểu all-or-nothing để preview nhiều dòng không bị lưu dở.
  async createMany(items, userId = DEFAULT_USER) {
    if (!Array.isArray(items) || !items.length) return [];
    for (const item of items) validateTransactionPayload(item, { requireWallet: true });
    const client = await pool.connect();
    const ids = [];
    const createdRows = [];
    let transactionClosed = false;
    try {
      await client.query('BEGIN');
      const categories = await lockOwnedCategories(client, items.map((item) => item.category_id), userId);
      for (const item of items) {
        assertCategoryMatches(categories.get(Number(item.category_id)), item.type);
      }
      const wallets = await lockOwnedWallets(client, items.map((item) => item.wallet_id), userId);
      assertTransactionWalletCurrency(wallets);
      for (const data of items) {
        const result = await client.query(
          `INSERT INTO transactions (user_id, description, amount, type, category_id, wallet_id, transaction_date, source, note, original_text, ai_parsed)
           VALUES ($1, $2, $3, $4::transaction_type, $5, $6, COALESCE($7, CURRENT_DATE), COALESCE($8, 'manual')::transaction_source, $9, $10, COALESCE($11::jsonb, '{}'::jsonb))
           RETURNING *`,
          [userId, data.description.trim(), data.amount, data.type, data.category_id, data.wallet_id,
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
        createdRows.push(tx);
      }
      await client.query('COMMIT');
      transactionClosed = true;
    } catch (error) {
      if (!transactionClosed) await rollbackAfterFailure(client, error);
      throw error;
    } finally {
      client.release();
    }

    await invalidateAfterCommit(userId);
    return Promise.all(ids.map((id, index) => hydrateAfterCommit(id, userId, createdRows[index])));
  },

  async getAll(userId = DEFAULT_USER, filters = {}) {
    const normalized = normalizeTransactionQuery(filters);
    const { page, limit } = normalized;
    const offset = (page - 1) * limit;
    const where = ['t.deleted_at IS NULL', 't.user_id = $1'];
    const params = [userId];
    const add = (clause, value) => {
      params.push(value);
      where.push(clause.replace('?', `$${params.length}`));
    };
    if (normalized.from) add('t.transaction_date >= ?', normalized.from);
    if (normalized.to) add('t.transaction_date <= ?', normalized.to);
    if (normalized.category_id) add('t.category_id = ?', normalized.category_id);
    if (normalized.type) add('t.type = ?', normalized.type);
    if (normalized.search) add('t.description ILIKE ?', `%${normalized.search}%`);
    if (normalized.currency) add('w.currency = ?', normalized.currency);
    const count = await query(
      `SELECT COUNT(*)
       FROM transactions t
       JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
       JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
       WHERE ${where.join(' AND ')}`,
      params
    );
    const direction = normalized.sort_order.toUpperCase();
    const primarySort = `${SORT_EXPRESSIONS[normalized.sort_by]} ${direction}`;
    const orderBy = normalized.sort_by === 'transaction_date'
      ? `${primarySort}, t.created_at ${direction}, t.id ${direction}`
      : `${primarySort}, t.transaction_date DESC, t.created_at DESC, t.id DESC`;
    params.push(limit, offset);
    const result = await query(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon,
              w.name AS wallet_name, w.currency AS wallet_currency
       FROM transactions t
       JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
       JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const total = Number(count.rows[0].count);
    const totalPages = Math.ceil(total / limit);
    return {
      data: result.rows,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },

  async getById(id, userId = DEFAULT_USER) {
    return getJoinedById(id, userId, false);
  },

  // Tính chênh lệch số dư giữa bản cũ/mới rồi khóa và cập nhật các ví liên quan.
  async update(id, data, userId = DEFAULT_USER) {
    validateTransactionPayload(data, { partial: true, rejectUnknown: true });
    const client = await pool.connect();
    let transactionClosed = false;
    let updatedId;
    let updatedRow;
    let walletBalance;
    try {
      await client.query('BEGIN');
      const oldResult = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL FOR UPDATE',
        [id, userId]
      );
      const old = oldResult.rows[0];
      if (!old) {
        await client.query('ROLLBACK');
        transactionClosed = true;
        return null;
      }
      const next = editablePatch(old, data);
      const categories = await lockOwnedCategories(client, [next.category_id], userId);
      assertCategoryMatches(categories.get(Number(next.category_id)), next.type);
      const wallets = await lockOwnedWallets(client, [old.wallet_id, next.wallet_id], userId);
      assertTransactionWalletCurrency(wallets);
      const updated = await client.query(
        `UPDATE transactions
         SET description = $3, amount = $4, type = $5, category_id = $6,
             transaction_date = $7, note = $8, wallet_id = $9, updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId, next.description.trim(), next.amount, next.type, next.category_id,
          next.transaction_date, next.note ?? null, next.wallet_id]
      );

      if (Number(old.wallet_id) === Number(next.wallet_id)) {
        const adjustment = balanceDelta(next.type, next.amount) - balanceDelta(old.type, old.amount);
        if (adjustment !== 0) {
          const wallet = await client.query(
            `UPDATE wallets SET balance = balance + $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3 RETURNING balance`,
            [adjustment, next.wallet_id, userId]
          );
          if (!wallet.rowCount) throw referenceError('Ví giao dịch không tồn tại hoặc không thuộc người dùng');
          walletBalance = Number(wallet.rows[0].balance);
        } else {
          walletBalance = Number(wallets.get(Number(next.wallet_id)).balance);
        }
      } else {
        const oldWallet = await client.query(
          `UPDATE wallets SET balance = balance - $1, updated_at = NOW()
           WHERE id = $2 AND user_id = $3 RETURNING balance`,
          [balanceDelta(old.type, old.amount), old.wallet_id, userId]
        );
        const newWallet = await client.query(
          `UPDATE wallets SET balance = balance + $1, updated_at = NOW()
           WHERE id = $2 AND user_id = $3 RETURNING balance`,
          [balanceDelta(next.type, next.amount), next.wallet_id, userId]
        );
        if (!oldWallet.rowCount || !newWallet.rowCount) {
          throw referenceError('Ví giao dịch không tồn tại hoặc không thuộc người dùng');
        }
        walletBalance = Number(newWallet.rows[0].balance);
      }
      await client.query('COMMIT');
      transactionClosed = true;
      updatedId = updated.rows[0].id;
      updatedRow = updated.rows[0];
    } catch (error) {
      if (!transactionClosed) await rollbackAfterFailure(client, error);
      throw error;
    } finally {
      client.release();
    }

    await invalidateAfterCommit(userId);
    return hydrateAfterCommit(updatedId, userId, { ...updatedRow, wallet_balance: walletBalance });
  },

  async updateCategory(id, categoryId, userId = DEFAULT_USER) {
    validateTransactionPayload({ category_id: categoryId }, { partial: true });
    const client = await pool.connect();
    let transactionClosed = false;
    let tx;
    let category;
    try {
      await client.query('BEGIN');
      const old = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL FOR UPDATE',
        [id, userId]
      );
      tx = old.rows[0];
      if (!tx) {
        await client.query('ROLLBACK');
        transactionClosed = true;
        return null;
      }
      const categories = await lockOwnedCategories(client, [categoryId], userId);
      category = categories.get(Number(categoryId));
      assertCategoryMatches(category, tx.type);
      const updated = await client.query(
        `UPDATE transactions SET category_id = $3, updated_at = NOW()
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId, categoryId]
      );
      tx = updated.rows[0];
      await client.query('COMMIT');
      transactionClosed = true;
    } catch (error) {
      if (!transactionClosed) await rollbackAfterFailure(client, error);
      throw error;
    } finally {
      client.release();
    }

    await invalidateAfterCommit(userId);
    return hydrateAfterCommit(id, userId, {
      ...tx,
      category_name: category.name,
      category_icon: category.icon,
    });
  },

  // Đánh dấu xóa và hoàn lại ảnh hưởng số dư thay vì loại bản ghi khỏi lịch sử.
  async softDelete(id, userId = DEFAULT_USER) {
    const client = await pool.connect();
    let transactionClosed = false;
    let tx;
    try {
      await client.query('BEGIN');
      const old = await client.query(
        `UPDATE transactions SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING *`,
        [id, userId]
      );
      tx = old.rows[0];
      if (!tx) {
        await client.query('ROLLBACK');
        transactionClosed = true;
        return null;
      }
      const wallet = await client.query(
        `UPDATE wallets SET balance = balance - $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3 RETURNING balance`,
        [balanceDelta(tx.type, tx.amount), tx.wallet_id, userId]
      );
      if (!wallet.rowCount) throw referenceError('Ví giao dịch không tồn tại hoặc không thuộc người dùng');
      await client.query('COMMIT');
      transactionClosed = true;
    } catch (error) {
      if (!transactionClosed) await rollbackAfterFailure(client, error);
      throw error;
    } finally {
      client.release();
    }

    await invalidateAfterCommit(userId);
    const deletedAt = new Date(tx.deleted_at);
    return { success: true, deleted_at: tx.deleted_at, restore_deadline: new Date(deletedAt.getTime() + 30000).toISOString() };
  },

  // Khôi phục giao dịch đã xóa mềm và áp dụng lại đúng delta vào ví.
  async restore(id, userId = DEFAULT_USER) {
    const client = await pool.connect();
    let transactionClosed = false;
    let tx;
    try {
      await client.query('BEGIN');
      const old = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, userId]
      );
      tx = old.rows[0];
      if (!tx) {
        await client.query('ROLLBACK');
        transactionClosed = true;
        return null;
      }
      if (!tx.deleted_at) {
        const err = new Error('Đã quá thời hạn khôi phục (30 giây)');
        err.status = 410;
        throw err;
      }
      const restored = await client.query(
        `UPDATE transactions SET deleted_at = NULL, updated_at = NOW()
         WHERE id = $1 AND user_id = $2
           AND deleted_at IS NOT NULL
           AND deleted_at > NOW() - INTERVAL '30 seconds'
         RETURNING *`,
        [id, userId]
      );
      tx = restored.rows[0];
      if (!tx) {
        const err = new Error('Đã quá thời hạn khôi phục (30 giây)');
        err.status = 410;
        throw err;
      }
      const wallet = await client.query(
        `UPDATE wallets SET balance = balance + $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3 RETURNING balance`,
        [balanceDelta(tx.type, tx.amount), tx.wallet_id, userId]
      );
      if (!wallet.rowCount) throw referenceError('Ví giao dịch không tồn tại hoặc không thuộc người dùng');
      await client.query('COMMIT');
      transactionClosed = true;
    } catch (error) {
      if (!transactionClosed) await rollbackAfterFailure(client, error);
      throw error;
    } finally {
      client.release();
    }

    await invalidateAfterCommit(userId);
    return hydrateAfterCommit(id, userId, tx);
  },

  // Chat referents such as "5 giao dịch đó" carry an exact, server-produced id
  // set. Keep this separate from the public filter/pagination contract so the
  // assistant cannot accidentally widen the referent to unrelated transactions.
  async getByIds(ids, userId = DEFAULT_USER) {
    const safeIds = [...new Set((ids || []).map(Number))]
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 200);
    if (!safeIds.length) return [];
    const result = await query(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon,
              w.name AS wallet_name, w.currency AS wallet_currency
       FROM transactions t
       JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
       JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.id = ANY($2::int[])
       ORDER BY array_position($2::int[], t.id)`,
      [userId, safeIds]
    );
    return result.rows;
  },

  // Aggregate over the complete filtered set. The ordinary list endpoint is
  // paginated, so summing its first page would silently recreate the old
  // "recent transactions only" bug in chat answers.
  async getFilteredTotals(userId = DEFAULT_USER, filters = {}) {
    const where = ["t.deleted_at IS NULL", "t.user_id = $1", "w.currency = 'VND'"];
    const params = [userId];
    const add = (clause, value) => {
      params.push(value);
      where.push(clause.replace('?', `$${params.length}`));
    };
    if (filters.from) add('t.transaction_date >= ?', filters.from);
    if (filters.to) add('t.transaction_date <= ?', filters.to);
    if (filters.category_id) add('t.category_id = ?', filters.category_id);
    if (filters.type && ['income', 'expense'].includes(filters.type)) add('t.type = ?::transaction_type', filters.type);
    if (filters.search) add('t.description ILIKE ?', `%${String(filters.search).trim()}%`);
    const result = await query(
      `SELECT COUNT(*) AS transaction_count,
              COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_income,
              COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expense,
              COALESCE(SUM(t.amount), 0) AS total_amount
       FROM transactions t
       JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
       WHERE ${where.join(' AND ')}`,
      params
    );
    const row = result.rows[0] || {};
    return {
      transaction_count: Number(row.transaction_count || 0),
      total_income: Number(row.total_income || 0),
      total_expense: Number(row.total_expense || 0),
      total_amount: Number(row.total_amount || 0),
    };
  },

  async getMonthlySummary(userId = DEFAULT_USER, month, year) {
    const now = new Date();
    const m = Number(month || now.getMonth() + 1);
    const y = Number(year || now.getFullYear());
    const result = await query(
      `SELECT COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_income,
              COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expense,
              COUNT(*) AS transaction_count
       FROM transactions t
       JOIN wallets w ON w.id = t.wallet_id AND w.user_id = t.user_id
       WHERE t.deleted_at IS NULL AND t.user_id = $1 AND w.currency = 'VND'
         AND EXTRACT(MONTH FROM t.transaction_date) = $2
         AND EXTRACT(YEAR FROM t.transaction_date) = $3`,
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

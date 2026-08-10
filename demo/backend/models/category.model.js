const { pool, query, rollbackAfterFailure } = require('../config/database');
const KVStore = require('../services/store/kv.store');
const {
  validateCategoryCreatePayload,
  validateCategoryUpdatePayload,
} = require('../services/categories/validation');

const DEFAULT_USER = 'default_user';
const CACHE_TTL = 3600; // 1 hour; invalidated explicitly on writes
const cacheKey = (userId) => `cache:categories:${userId}`;

function invalidate(userId = DEFAULT_USER) {
  return KVStore.del(cacheKey(userId));
}

async function invalidateAfterCommit(userId = DEFAULT_USER) {
  try {
    await Promise.all([
      invalidate(userId),
      KVStore.del(`cache:insights:${userId}`),
    ]);
  } catch (error) {
    // The database mutation is already durable. Do not turn a successful write
    // into an apparent failure that invites the caller to retry it.
    console.warn(`[category] post-commit cache invalidation failed: ${error.message}`);
  }
}

async function attachTransactionCounts(categories, userId = DEFAULT_USER) {
  if (!categories.length) return [];
  const counts = await query(
    `SELECT category_id, COUNT(*)::integer AS transaction_count
     FROM transactions
     WHERE user_id = $1 AND deleted_at IS NULL
     GROUP BY category_id`,
    [userId]
  );
  const byCategory = new Map(counts.rows.map((row) => [Number(row.category_id), Number(row.transaction_count)]));
  return categories.map((category) => ({
    ...category,
    transaction_count: byCategory.get(Number(category.id)) || 0,
  }));
}

function conflict(message) {
  const error = new Error(message);
  error.status = 409;
  error.code = 'CATEGORY_CONFLICT';
  return error;
}

function forbidden(message) {
  const error = new Error(message);
  error.status = 403;
  error.code = 'CATEGORY_PROTECTED';
  return error;
}

const DEFAULT_CATEGORIES = {
  expense: [
    ['Ăn uống', '🍜', 1], ['Di chuyển', '🚗', 2], ['Mua sắm', '🛍️', 3],
    ['Giải trí', '🎮', 4], ['Sức khỏe', '🏥', 5], ['Giáo dục', '📚', 6],
    ['Nhà cửa', '🏠', 7], ['Hóa đơn & Dịch vụ', '📄', 8], ['Tạp hóa', '🛒', 9],
    ['Điện tử', '📱', 10], ['Thể thao', '⚽', 11], ['Làm đẹp', '💅', 12], ['Khác', '📦', 99],
  ],
  income: [['Lương', '💰', 1], ['Thưởng', '🎁', 2], ['Đầu tư', '📈', 3], ['Khác', '📦', 99]],
};

const CategoryModel = {
  async initDefaults(userId = DEFAULT_USER) {
    let created = 0;
    for (const [type, rows] of Object.entries(DEFAULT_CATEGORIES)) {
      for (const [name, icon, sortOrder] of rows) {
        const result = await query(
          `INSERT INTO categories (user_id, name, type, icon, is_default, sort_order)
           VALUES ($1, $2, $3, $4, true, $5)
           ON CONFLICT (user_id, type, name) DO NOTHING RETURNING id`,
          [userId, name, type, icon, sortOrder]
        );
        created += result.rowCount;
      }
    }
    return created;
  },

  async getAll(userId = DEFAULT_USER) {
    const categories = await KVStore.remember(cacheKey(userId), CACHE_TTL, async () => {
      await this.initDefaults(userId);
      const result = await query(
        `SELECT id, name, type, icon, is_default, parent_id, sort_order, created_at
         FROM categories
         WHERE user_id = $1
         ORDER BY type ASC, sort_order ASC, name ASC`,
        [userId]
      );
      return result.rows;
    });
    return attachTransactionCounts(categories, userId);
  },

  invalidateCache: invalidate,

  async getById(id, userId = DEFAULT_USER) {
    const result = await query('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
    return result.rows[0] || null;
  },

  async getByName(name, type, userId = DEFAULT_USER) {
    const result = await query(
      `SELECT * FROM categories
       WHERE LOWER(name) = LOWER($1) AND type = $2 AND user_id = $3
       LIMIT 1`,
      [name, type, userId]
    );
    return result.rows[0] || null;
  },

  async getByType(type, userId = DEFAULT_USER) {
    const result = await query(
      `SELECT * FROM categories
       WHERE type = $1 AND user_id = $2
       ORDER BY sort_order ASC, name ASC`,
      [type, userId]
    );
    return attachTransactionCounts(result.rows, userId);
  },

  async create(data) {
    const userId = data.userId || DEFAULT_USER;
    const payload = validateCategoryCreatePayload({
      name: data.name,
      type: data.type,
      ...(data.icon === undefined ? {} : { icon: data.icon }),
      ...(data.parent_id === undefined ? {} : { parent_id: data.parent_id }),
    });
    const { name, type, icon = '📁', parent_id = null } = payload;
    const existing = await this.getByName(name, type, userId);
    if (existing) {
      throw conflict('Tên danh mục đã tồn tại');
    }
    if (parent_id) {
      const parent = await this.getById(parent_id, userId);
      if (!parent || parent.type !== type) throw conflict('Danh mục cha không tồn tại hoặc khác loại');
    }
    let result;
    try {
      result = await query(
        `INSERT INTO categories (name, type, icon, is_default, parent_id, user_id, sort_order)
         VALUES ($1, $2::category_type, $3, false, $4, $5::varchar,
           (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories WHERE type = $2::category_type AND user_id = $5::varchar))
         RETURNING *`,
        [name, type, icon, parent_id, userId]
      );
    } catch (error) {
      if (error.code === '23505') throw conflict('Tên danh mục đã tồn tại');
      throw error;
    }
    await invalidateAfterCommit(userId);
    return result.rows[0];
  },

  async update(id, data, userId = DEFAULT_USER) {
    const patch = validateCategoryUpdatePayload(data);
    const category = await this.getById(id, userId);
    if (!category) return null;
    if (category.is_default) {
      throw forbidden('Không thể chỉnh sửa danh mục hệ thống');
    }
    if (patch.name && patch.name.toLocaleLowerCase('vi') !== category.name.toLocaleLowerCase('vi')) {
      const existing = await this.getByName(patch.name, category.type, userId);
      if (existing && Number(existing.id) !== Number(id)) throw conflict('Tên danh mục đã tồn tại');
    }
    let result;
    try {
      result = await query(
        `UPDATE categories
         SET name = COALESCE($3, name), icon = COALESCE($4, icon), updated_at = NOW()
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId, patch.name || null, patch.icon || null]
      );
    } catch (error) {
      if (error.code === '23505') throw conflict('Tên danh mục đã tồn tại');
      throw error;
    }
    await invalidateAfterCommit(userId);
    return result.rows[0];
  },

  async delete(id, userId = DEFAULT_USER) {
    const client = await pool.connect();
    let transactionClosed = false;
    let result;
    try {
      await client.query('BEGIN');
      const selected = await client.query(
        'SELECT * FROM categories WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, userId]
      );
      const category = selected.rows[0];
      if (!category) {
        await client.query('ROLLBACK');
        transactionClosed = true;
        return null;
      }
      if (category.is_default || category.name.trim().toLocaleLowerCase('vi') === 'khác') {
        throw forbidden('Không thể xóa danh mục hệ thống hoặc danh mục Khác dự phòng');
      }

      await client.query(
        `INSERT INTO categories (user_id, name, type, icon, is_default, sort_order)
         VALUES ($1, 'Khác', $2::category_type, '📦', true, 99)
         ON CONFLICT (user_id, type, name) DO NOTHING`,
        [userId, category.type]
      );
      const fallbackResult = await client.query(
        `SELECT * FROM categories
         WHERE user_id = $1 AND type = $2::category_type
           AND LOWER(name) = LOWER('Khác') AND id <> $3
         ORDER BY is_default DESC, id ASC
         LIMIT 1 FOR UPDATE`,
        [userId, category.type, id]
      );
      const fallback = fallbackResult.rows[0];
      if (!fallback) throw conflict('Không thể tạo danh mục Khác dự phòng');

      const transactions = await client.query(
        `UPDATE transactions
         SET category_id = $1, updated_at = NOW()
         WHERE category_id = $2 AND user_id = $3
         RETURNING id`,
        [fallback.id, id, userId]
      );
      const recurringBills = await client.query(
        `UPDATE recurring_bills
         SET category_id = $1, updated_at = NOW()
         WHERE category_id = $2 AND user_id = $3
         RETURNING id`,
        [fallback.id, id, userId]
      );

      // Preserve budget intent as categories merge. If a Khác budget already
      // exists for a period, combine the limits and keep both histories.
      const budgetRows = await client.query(
        `SELECT * FROM budgets
         WHERE category_id = $1 AND user_id = $2
         ORDER BY year, month, id
         FOR UPDATE`,
        [id, userId]
      );
      let mergedBudgets = 0;
      for (const budget of budgetRows.rows) {
        const existing = await client.query(
          `SELECT * FROM budgets
           WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4
           FOR UPDATE`,
          [userId, fallback.id, budget.month, budget.year]
        );
        if (existing.rows[0]) {
          await client.query(
            `UPDATE budgets
             SET amount_limit = amount_limit + $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3`,
            [budget.amount_limit, existing.rows[0].id, userId]
          );
          await client.query(
            'UPDATE budget_history SET budget_id = $1 WHERE budget_id = $2',
            [existing.rows[0].id, budget.id]
          );
          await client.query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [budget.id, userId]);
          mergedBudgets += 1;
        } else {
          await client.query(
            'UPDATE budgets SET category_id = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
            [fallback.id, budget.id, userId]
          );
        }
      }

      const deleted = await client.query(
        'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );
      if (!deleted.rowCount) throw conflict('Danh mục đã thay đổi, vui lòng thử lại');
      await client.query('COMMIT');
      transactionClosed = true;
      result = {
        success: true,
        deleted_category: { id: category.id, name: category.name, type: category.type },
        fallback_category: {
          id: fallback.id,
          name: fallback.name,
          type: fallback.type,
          icon: fallback.icon,
        },
        reassigned_transactions: transactions.rowCount,
        reassigned_recurring_bills: recurringBills.rowCount,
        reassigned_budgets: budgetRows.rowCount,
        merged_budgets: mergedBudgets,
      };
    } catch (error) {
      if (!transactionClosed) await rollbackAfterFailure(client, error);
      throw error;
    } finally {
      client.release();
    }

    await invalidateAfterCommit(userId);
    return result;
  },
};

module.exports = CategoryModel;

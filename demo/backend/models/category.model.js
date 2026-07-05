const { query } = require('../config/database');

const DEFAULT_USER = 'default_user';

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
    await this.initDefaults(userId);
    const result = await query(
      `SELECT id, name, type, icon, is_default, parent_id, sort_order, created_at
       FROM categories
       WHERE is_default = true OR user_id = $1
       ORDER BY type ASC, sort_order ASC, name ASC`,
      [userId]
    );
    return result.rows;
  },

  async getById(id) {
    const result = await query('SELECT * FROM categories WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async getByName(name, type, userId = DEFAULT_USER) {
    const result = await query(
      `SELECT * FROM categories
       WHERE LOWER(name) = LOWER($1) AND type = $2 AND (is_default = true OR user_id = $3)
       LIMIT 1`,
      [name, type, userId]
    );
    return result.rows[0] || null;
  },

  async getByType(type, userId = DEFAULT_USER) {
    const result = await query(
      `SELECT * FROM categories
       WHERE type = $1 AND (is_default = true OR user_id = $2)
       ORDER BY sort_order ASC, name ASC`,
      [type, userId]
    );
    return result.rows;
  },

  async create({ name, type, icon = '📁', parent_id = null, userId = DEFAULT_USER }) {
    const existing = await this.getByName(name, type, userId);
    if (existing) {
      const err = new Error('Tên danh mục đã tồn tại');
      err.status = 409;
      throw err;
    }
    const result = await query(
      `INSERT INTO categories (name, type, icon, is_default, parent_id, user_id, sort_order)
       VALUES ($1, $2, $3, false, $4, $5, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories WHERE type = $2))
       RETURNING *`,
      [name, type, icon, parent_id, userId]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const category = await this.getById(id);
    if (!category) return null;
    if (category.is_default && data.name && data.name !== category.name) {
      const err = new Error('Không thể đổi tên danh mục mặc định');
      err.status = 403;
      throw err;
    }
    const result = await query(
      `UPDATE categories
       SET name = COALESCE($2, name), icon = COALESCE($3, icon), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, data.name || null, data.icon || null]
    );
    return result.rows[0];
  },

  async delete(id) {
    const category = await this.getById(id);
    if (!category) return null;
    if (category.is_default) {
      const err = new Error('Không thể xóa danh mục mặc định');
      err.status = 403;
      throw err;
    }
    const used = await query('SELECT 1 FROM transactions WHERE category_id = $1 LIMIT 1', [id]);
    if (used.rowCount) {
      const err = new Error('Không thể xóa danh mục đang có giao dịch');
      err.status = 409;
      throw err;
    }
    await query('DELETE FROM categories WHERE id = $1', [id]);
    return { success: true };
  },
};

module.exports = CategoryModel;

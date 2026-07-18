const crypto = require('crypto');
const { pool, query } = require('../../config/database');
const CategoryModel = require('../../models/category.model');
const KVStore = require('../store/kv.store');
const {
  boundedInteger,
  validateCategoryType,
  discoverCategorySuggestions,
  buildRetagPlan,
} = require('./categoryDiscovery');

const DEFAULT_USER = 'default_user';
const PLAN_TTL_SECONDS = 15 * 60;
const planKey = (userId, planId) => `category-retag:${encodeURIComponent(userId)}:${planId}`;

async function loadEligibleTransactions(userId, transactionIds, type, client = null) {
  const runQuery = client ? client.query.bind(client) : query;
  const result = await runQuery(
    `SELECT t.id, t.description, t.original_text, t.amount, t.type, t.category_id,
            c.name AS category_name
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1
       AND t.id = ANY($2::int[])
       AND t.type = $3::transaction_type
       AND t.deleted_at IS NULL
       AND LOWER(c.name) = LOWER('Khác')
     ORDER BY t.id
     ${client ? 'FOR UPDATE OF t' : ''}`,
    [userId, transactionIds, type]
  );
  return result.rows;
}

const CategoryRetagService = {
  async discover(userId = DEFAULT_USER, options = {}) {
    const type = validateCategoryType(options.type || 'expense');
    const months = boundedInteger(options.months, 6, 1, 24);
    const limit = boundedInteger(options.transactionLimit, 500, 1, 1000);
    const [transactionsResult, categories] = await Promise.all([
      query(
        `SELECT t.id, t.description, t.original_text, t.amount, t.type, t.transaction_date
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = $1
           AND t.type = $2::transaction_type
           AND t.deleted_at IS NULL
           AND LOWER(c.name) = LOWER('Khác')
           AND t.transaction_date >= CURRENT_DATE - ($3::int * INTERVAL '1 month')
         ORDER BY t.transaction_date DESC, t.id DESC
         LIMIT $4`,
        [userId, type, months, limit]
      ),
      CategoryModel.getByType(type, userId),
    ]);
    return discoverCategorySuggestions(transactionsResult.rows, categories, { ...options, type });
  },

  async preparePlan(userId = DEFAULT_USER, suggestion = {}, options = {}) {
    const transactionIds = [...new Set((suggestion.transaction_ids || suggestion.transactionIds || []).map(Number))]
      .filter((id) => Number.isInteger(id) && id > 0);
    if (transactionIds.length > 200) {
      const error = new Error('Mỗi kế hoạch chỉ được re-tag tối đa 200 giao dịch');
      error.status = 400;
      throw error;
    }
    const type = validateCategoryType(suggestion.type || 'expense');
    const eligible = await loadEligibleTransactions(userId, transactionIds, type);
    if (!transactionIds.length || eligible.length !== transactionIds.length) {
      const error = new Error('Một số giao dịch không tồn tại hoặc không còn thuộc danh mục Khác');
      error.status = 409;
      throw error;
    }

    if (suggestion.target_category_id || suggestion.targetCategoryId) {
      const targetId = suggestion.target_category_id || suggestion.targetCategoryId;
      const target = await CategoryModel.getById(targetId, userId);
      if (!target || target.type !== type || (!target.is_default && target.user_id !== userId)) {
        const error = new Error('Danh mục đích không hợp lệ');
        error.status = 400;
        throw error;
      }
      suggestion = { ...suggestion, suggested_name: target.name };
    }

    const planId = crypto.randomUUID();
    const ttlSeconds = boundedInteger(options.ttlSeconds, PLAN_TTL_SECONDS, 60, 3600);
    const plan = buildRetagPlan(suggestion, {
      userId,
      planId,
      ttlSeconds,
    });
    await KVStore.set(planKey(userId, planId), plan, ttlSeconds);
    return plan;
  },

  async getPlan(userId = DEFAULT_USER, planId) {
    return KVStore.get(planKey(userId, planId));
  },

  async cancelPlan(userId = DEFAULT_USER, planId) {
    const plan = await this.getPlan(userId, planId);
    await KVStore.del(planKey(userId, planId));
    return { cancelled: Boolean(plan), plan_id: planId };
  },

  async confirmPlan(userId = DEFAULT_USER, planId, confirmed = false) {
    const plan = await this.getPlan(userId, planId);
    if (!plan) {
      const error = new Error('Kế hoạch re-tag không tồn tại hoặc đã hết hạn');
      error.status = 410;
      throw error;
    }
    if (confirmed !== true) {
      return { applied: false, requires_confirmation: true, plan };
    }

    const client = await pool.connect();
    let category;
    try {
      await client.query('BEGIN');
      const eligible = await loadEligibleTransactions(userId, plan.transaction_ids, plan.type, client);
      if (eligible.length !== plan.transaction_ids.length) {
        const error = new Error('Kế hoạch đã cũ: một số giao dịch không còn thuộc danh mục Khác');
        error.status = 409;
        throw error;
      }

      if (plan.target_category.id) {
        const target = await client.query(
          `SELECT * FROM categories
           WHERE id = $1 AND type = $2::category_type AND (is_default = true OR user_id = $3)`,
          [plan.target_category.id, plan.type, userId]
        );
        category = target.rows[0];
      } else {
        const existing = await client.query(
          `SELECT * FROM categories
           WHERE LOWER(name) = LOWER($1) AND type = $2::category_type
             AND (is_default = true OR user_id = $3)
           ORDER BY is_default DESC, id ASC LIMIT 1`,
          [plan.target_category.name, plan.type, userId]
        );
        category = existing.rows[0];
        if (!category) {
          const inserted = await client.query(
            `INSERT INTO categories (user_id, name, type, icon, is_default, sort_order)
             VALUES ($1, $2, $3::category_type, $4, false,
               (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories WHERE type = $3::category_type))
             RETURNING *`,
            [userId, plan.target_category.name, plan.type, plan.target_category.icon]
          );
          category = inserted.rows[0];
        }
      }
      if (!category || category.type !== plan.type) {
        const error = new Error('Danh mục đích không còn hợp lệ');
        error.status = 409;
        throw error;
      }

      await client.query(
        `UPDATE transactions
         SET category_id = $1, updated_at = NOW()
         WHERE user_id = $2 AND id = ANY($3::int[])`,
        [category.id, userId, plan.transaction_ids]
      );
      for (const transaction of eligible) {
        await client.query(
          `INSERT INTO ai_feedback_logs
             (user_id, transaction_id, feedback_type, original_text, ai_result, corrected_result)
           VALUES ($1, $2, 'classification'::feedback_type, $3, $4::jsonb, $5::jsonb)`,
          [
            userId,
            transaction.id,
            transaction.original_text || transaction.description,
            JSON.stringify({ category_id: transaction.category_id, category_name: transaction.category_name }),
            JSON.stringify({ category_id: category.id, category_name: category.name }),
          ]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    await Promise.all([
      KVStore.del(planKey(userId, planId)),
      CategoryModel.invalidateCache(userId),
      KVStore.del(`cache:insights:${userId}`),
    ]);
    return {
      applied: true,
      requires_confirmation: false,
      plan_id: planId,
      category,
      retagged_count: plan.transaction_ids.length,
      transaction_ids: plan.transaction_ids,
    };
  },
};

module.exports = CategoryRetagService;
module.exports.loadEligibleTransactions = loadEligibleTransactions;
module.exports.planKey = planKey;

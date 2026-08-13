// Vai trò: Lưu và truy vấn lịch sử người dùng sửa kết quả trích xuất hoặc phân loại AI.
// Luồng chính: chuẩn hóa giới hạn truy vấn, scope theo người dùng và ghi metadata phục vụ học lại.

const { query } = require('../config/database');

const DEFAULT_USER = 'default_user';
const FEEDBACK_TYPES = new Set(['extraction', 'classification']);

function clampLimit(value, fallback = 20, maximum = 200) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), maximum);
}

function validateFeedbackType(value) {
  if (!FEEDBACK_TYPES.has(value)) {
    const error = new Error('Loại phản hồi AI không hợp lệ');
    error.status = 400;
    throw error;
  }
}

const AiFeedbackModel = {
  // Lưu cả kết quả AI ban đầu và correction để truy vết quá trình học.
  async create({
    userId = DEFAULT_USER,
    transactionId = null,
    feedbackType,
    originalText = null,
    aiResult = null,
    correctedResult = null,
  }) {
    validateFeedbackType(feedbackType);
    if (correctedResult === null || correctedResult === undefined) {
      const error = new Error('Kết quả đã sửa là bắt buộc');
      error.status = 400;
      throw error;
    }

    const result = await query(
      `INSERT INTO ai_feedback_logs
         (user_id, transaction_id, feedback_type, original_text, ai_result, corrected_result)
       VALUES ($1, $2, $3::feedback_type, $4, $5::jsonb, $6::jsonb)
       RETURNING *`,
      [
        userId,
        transactionId,
        feedbackType,
        originalText,
        aiResult === null ? null : JSON.stringify(aiResult),
        JSON.stringify(correctedResult),
      ]
    );
    return result.rows[0];
  },

  async getById(id, userId = DEFAULT_USER) {
    const result = await query(
      `SELECT * FROM ai_feedback_logs
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rows[0] || null;
  },

  async getRecent(userId = DEFAULT_USER, options = {}) {
    const params = [userId];
    const where = ['user_id = $1'];

    if (options.feedbackType) {
      validateFeedbackType(options.feedbackType);
      params.push(options.feedbackType);
      where.push(`feedback_type = $${params.length}::feedback_type`);
    }
    if (options.transactionId) {
      params.push(options.transactionId);
      where.push(`transaction_id = $${params.length}`);
    }
    if (options.before) {
      params.push(options.before);
      where.push(`created_at < $${params.length}`);
    }

    params.push(clampLimit(options.limit));
    const result = await query(
      `SELECT * FROM ai_feedback_logs
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
      params
    );
    return result.rows;
  },

  // Chỉ lấy candidate phân loại có đủ ngữ cảnh để correction service xếp hạng.
  async getClassificationCandidates(userId = DEFAULT_USER, limit = 200) {
    return this.getRecent(userId, {
      feedbackType: 'classification',
      limit: clampLimit(limit, 100, 500),
    });
  },

  async getForTransaction(transactionId, userId = DEFAULT_USER, limit = 20) {
    return this.getRecent(userId, { transactionId, limit });
  },
};

module.exports = AiFeedbackModel;
module.exports.FEEDBACK_TYPES = FEEDBACK_TYPES;
module.exports.clampLimit = clampLimit;

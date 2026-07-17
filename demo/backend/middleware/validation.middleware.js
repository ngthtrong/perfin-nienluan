const { validateTransactionPayload } = require('../services/transactions/validation');

function bad(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = 'VALIDATION_ERROR';
  return err;
}

function validateTransaction(req, res, next) {
  try {
    validateTransactionPayload(req.body);
    next();
  } catch (error) {
    next(error);
  }
}

function validateTransactionUpdate(req, res, next) {
  try {
    validateTransactionPayload(req.body, { partial: true, rejectUnknown: true });
    next();
  } catch (error) {
    next(error);
  }
}

function validateTransactionCategoryUpdate(req, res, next) {
  try {
    validateTransactionPayload(req.body, { partial: true, rejectUnknown: true });
    if (Object.keys(req.body).length !== 1 || !Object.prototype.hasOwnProperty.call(req.body, 'category_id')) {
      throw bad('Chỉ có thể cập nhật category_id tại đường dẫn này');
    }
    next();
  } catch (error) {
    next(error);
  }
}

function validateBudget(req, res, next) {
  const data = req.body;
  if (!Number(data.category_id)) return next(bad('Danh mục không hợp lệ'));
  if (!Number(data.amount_limit) || Number(data.amount_limit) <= 0) return next(bad('Ngân sách phải lớn hơn 0'));
  if (data.month && (Number(data.month) < 1 || Number(data.month) > 12)) return next(bad('Tháng không hợp lệ'));
  next();
}

function validateCategory(req, res, next) {
  const data = req.body;
  if (!data.name || String(data.name).trim().length > 50) return next(bad('Tên danh mục không hợp lệ'));
  if (!['income', 'expense'].includes(data.type)) return next(bad('Loại danh mục không hợp lệ'));
  next();
}

module.exports = {
  validateTransaction,
  validateTransactionUpdate,
  validateTransactionCategoryUpdate,
  validateBudget,
  validateCategory,
};

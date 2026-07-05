function bad(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = 'VALIDATION_ERROR';
  return err;
}

function validateTransaction(req, res, next) {
  const data = req.body;
  if (!data.description || String(data.description).trim().length > 200) return next(bad('Mô tả giao dịch không hợp lệ'));
  if (!Number(data.amount) || Number(data.amount) <= 0) return next(bad('Số tiền phải lớn hơn 0'));
  if (!['income', 'expense'].includes(data.type)) return next(bad('Loại giao dịch không hợp lệ'));
  next();
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

module.exports = { validateTransaction, validateBudget, validateCategory };

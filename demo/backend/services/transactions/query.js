const { isValidDateOnly } = require('./validation');

const SORT_EXPRESSIONS = Object.freeze({
  transaction_date: 't.transaction_date',
  amount: 't.amount',
  category: 'LOWER(c.name)',
  description: 'LOWER(t.description)',
});

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function bad(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

function scalar(value, label) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    throw bad(`${label} không hợp lệ`);
  }
  return value;
}

function positiveInteger(value, label, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(scalar(value, label));
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw bad(`${label} không hợp lệ`);
  }
  return parsed;
}

function optionalDate(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = scalar(value, label);
  if (!isValidDateOnly(parsed)) throw bad(`${label} phải có định dạng YYYY-MM-DD`);
  return parsed;
}

function normalizeTransactionQuery(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw bad('Bộ lọc giao dịch không hợp lệ');
  }

  const from = optionalDate(input.from, 'Ngày bắt đầu');
  const to = optionalDate(input.to, 'Ngày kết thúc');
  if (from && to && from > to) throw bad('Ngày bắt đầu không được sau ngày kết thúc');

  let categoryId = null;
  if (input.category_id !== undefined && input.category_id !== null && input.category_id !== '') {
    categoryId = positiveInteger(input.category_id, 'Danh mục', null);
  }

  let type = null;
  if (input.type !== undefined && input.type !== null && input.type !== '') {
    type = String(scalar(input.type, 'Loại giao dịch')).trim();
    if (!['income', 'expense'].includes(type)) throw bad('Loại giao dịch không hợp lệ');
  }

  let search = null;
  if (input.search !== undefined && input.search !== null && input.search !== '') {
    search = String(scalar(input.search, 'Từ khóa')).trim();
    if (search.length > 200) throw bad('Từ khóa tìm kiếm tối đa 200 ký tự');
    if (!search) search = null;
  }

  const sortBy = input.sort_by === undefined || input.sort_by === ''
    ? 'transaction_date'
    : String(scalar(input.sort_by, 'Trường sắp xếp')).trim();
  if (!Object.prototype.hasOwnProperty.call(SORT_EXPRESSIONS, sortBy)) {
    throw bad('Trường sắp xếp không hợp lệ');
  }

  const sortOrder = input.sort_order === undefined || input.sort_order === ''
    ? 'desc'
    : String(scalar(input.sort_order, 'Thứ tự sắp xếp')).trim().toLowerCase();
  if (!['asc', 'desc'].includes(sortOrder)) throw bad('Thứ tự sắp xếp không hợp lệ');

  return {
    from,
    to,
    category_id: categoryId,
    type,
    search,
    sort_by: sortBy,
    sort_order: sortOrder,
    page: positiveInteger(input.page, 'Trang', 1),
    limit: positiveInteger(input.limit, 'Số dòng mỗi trang', DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
  };
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SORT_EXPRESSIONS,
  normalizeTransactionQuery,
};

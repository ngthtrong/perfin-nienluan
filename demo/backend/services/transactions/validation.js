// Vai trò: Xác thực contract giao dịch dùng chung cho REST, chat và model.
// Luồng chính: kiểm tra field, tiền, loại, ngày không ở tương lai và trả dữ liệu chuẩn hóa.

const EDITABLE_FIELDS = new Set([
  'description',
  'amount',
  'type',
  'category_id',
  'wallet_id',
  'transaction_date',
  'note',
]);

const MAX_AMOUNT = 9_999_999_999_999.99;

function bad(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isValidDateOnly(value) {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

// A transaction date is a local calendar date. Using toISOString() here can move
// "today" to the previous day around midnight in Viet Nam, so compare normalized
// calendar keys instead of UTC instants.
function localDateKey(value = new Date()) {
  if (typeof value === 'string' && isValidDateOnly(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isFutureDateOnly(value, today = new Date()) {
  if (!isValidDateOnly(value)) return false;
  const valueKey = localDateKey(value);
  const todayKey = localDateKey(today);
  return Boolean(valueKey && todayKey && valueKey > todayKey);
}

function normalizePastOrPresentDate(value, {
  label = 'Ngày',
  today = new Date(),
  optional = false,
} = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    throw bad(`${label} không hợp lệ`);
  }
  if (!isValidDateOnly(value)) throw bad(`${label} không hợp lệ`);
  if (isFutureDateOnly(value, today)) throw bad(`${label} không được nằm trong tương lai`);
  return localDateKey(value);
}

function validateTransactionPayload(data, {
  partial = false,
  requireWallet = false,
  rejectUnknown = false,
  today = new Date(),
} = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw bad('Dữ liệu giao dịch không hợp lệ');
  }

  const suppliedEditableFields = Object.keys(data).filter((key) => EDITABLE_FIELDS.has(key));
  if (partial && suppliedEditableFields.length === 0) {
    throw bad('Không có trường giao dịch hợp lệ để cập nhật');
  }
  if (rejectUnknown) {
    const unknown = Object.keys(data).find((key) => !EDITABLE_FIELDS.has(key));
    if (unknown) throw bad(`Không thể cập nhật trường ${unknown}`);
  }

  if (!partial || hasOwn(data, 'description')) {
    if (typeof data.description !== 'string' || !data.description.trim() || data.description.trim().length > 200) {
      throw bad('Mô tả giao dịch không hợp lệ');
    }
  }

  if (!partial || hasOwn(data, 'amount')) {
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
      throw bad('Số tiền phải lớn hơn 0 và nằm trong giới hạn cho phép');
    }
  }

  if (!partial || hasOwn(data, 'type')) {
    if (!['income', 'expense'].includes(data.type)) throw bad('Loại giao dịch không hợp lệ');
  }

  if (!partial || hasOwn(data, 'category_id')) {
    const categoryId = Number(data.category_id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) throw bad('Danh mục không hợp lệ');
  }

  if (requireWallet || hasOwn(data, 'wallet_id')) {
    const walletId = Number(data.wallet_id);
    if (!Number.isInteger(walletId) || walletId <= 0) throw bad('Ví không hợp lệ');
  }

  if (hasOwn(data, 'transaction_date')) {
    normalizePastOrPresentDate(data.transaction_date, { label: 'Ngày giao dịch', today });
  }

  if (hasOwn(data, 'note') && data.note !== null && typeof data.note !== 'string') {
    throw bad('Ghi chú giao dịch không hợp lệ');
  }

  return data;
}

module.exports = {
  EDITABLE_FIELDS,
  isValidDateOnly,
  isFutureDateOnly,
  localDateKey,
  normalizePastOrPresentDate,
  validateTransactionPayload,
};

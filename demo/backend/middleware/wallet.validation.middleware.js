// Vai trò: Kiểm tra payload tạo và cập nhật ví trước khi chạm tới model.
// Luồng chính: xác thực loại ví, tiền tệ, số dư và trả lỗi 400 cho dữ liệu ngoài miền.

const WALLET_TYPES = Object.freeze(['cash', 'bank', 'e_wallet', 'credit_card', 'investment', 'savings']);
const CURRENCIES = Object.freeze(['VND', 'USD']);
const MAX_ABS_BALANCE = 9_999_999_999_999.99;

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

function normalizeWalletInput(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw validationError('Dữ liệu ví không hợp lệ');
  }

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name || name.length > 100) {
    throw validationError('Tên ví phải có từ 1 đến 100 ký tự');
  }

  const type = data.type === undefined ? 'cash' : data.type;
  if (!WALLET_TYPES.includes(type)) {
    throw validationError(`Loại ví phải là: ${WALLET_TYPES.join(', ')}`);
  }

  const currency = data.currency === undefined ? 'VND' : data.currency;
  if (!CURRENCIES.includes(currency)) {
    throw validationError(`Đơn vị tiền tệ phải là: ${CURRENCIES.join(', ')}`);
  }

  let balance = 0;
  if (Object.prototype.hasOwnProperty.call(data, 'balance')) {
    if (data.balance === null || (typeof data.balance === 'string' && !data.balance.trim())) {
      throw validationError('Số dư ban đầu phải là một số hợp lệ');
    }
    balance = Number(data.balance);
    const cents = balance * 100;
    if (
      !Number.isFinite(balance)
      || Math.abs(balance) > MAX_ABS_BALANCE
      || Math.abs(cents - Math.round(cents)) > 1e-7
    ) {
      throw validationError('Số dư ban đầu phải là số hợp lệ có tối đa 2 chữ số thập phân');
    }
  }

  return { name, type, balance, currency };
}

// Xác thực đầy đủ payload ví mới trước khi route gọi AccountModel.
function validateWalletCreate(req, res, next) {
  try {
    req.walletInput = normalizeWalletInput(req.body);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  CURRENCIES,
  WALLET_TYPES,
  normalizeWalletInput,
  validateWalletCreate,
};

// Vai trò: Cung cấp các hàm định dạng và parse tiền/ngày nhất quán cho giao diện.
// Luồng chính: chuyển dữ liệu API/form thành chuỗi Việt hóa và ngược lại mà không gọi side effect.

export function formatVND(amount, showSign = false) {
  const value = Number(amount || 0);
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}`;
}

export function formatMoneyInput(value, { allowNegative = false } = {}) {
  if (value === null || value === undefined || value === '') return '';

  const raw = String(value).trim();
  const negative = allowNegative && raw.startsWith('-');
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return negative ? '-' : '';

  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative ? `-${formatted}` : formatted;
}

export function formatMoneyValue(value, options = {}) {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return formatMoneyInput(value, options);
  return formatMoneyInput(String(Math.trunc(numeric)), options);
}

export function parseMoneyInput(value) {
  if (typeof value === 'number') return value;
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  if (!normalized || normalized === '-') return Number.NaN;
  return Number(normalized);
}

// Giao dịch thu/chi dùng amount dương; giữ nguyên dấu ở input để người dùng
// thấy và sửa lỗi thay vì âm thầm biến -50.000 thành 50.000.
export function positiveMoneyError(value) {
  const amount = parseMoneyInput(value);
  return Number.isFinite(amount) && amount > 0
    ? null
    : 'Số tiền phải lớn hơn 0.';
}

export function toDateInputValue(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate) return isoDate[1];
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateInputValue(value, fallback = new Date()) {
  const normalized = toDateInputValue(value);
  if (!normalized) return fallback;
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(date));
}

export function currentPeriod() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

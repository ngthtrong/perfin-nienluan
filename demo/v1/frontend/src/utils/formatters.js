export function formatVND(amount, showSign = false) {
  const value = Number(amount || 0);
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}`;
}

export function formatDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(date));
}

export function currentPeriod() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

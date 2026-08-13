// Vai trò: Tạo nội dung tiếng Việt xác định cho các proactive job.
// Luồng chính: nhận facts/bill, định dạng số/ngày và trả message cùng fingerprint ổn định.

const crypto = require('crypto');

function formatVND(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;
}

function formatDateVi(value) {
  if (!value) return 'chưa rõ ngày';
  const iso = value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    : String(value).slice(0, 10);
  const [year, month, day] = iso.split('-');
  return day && month && year ? `${day}/${month}/${year}` : String(value);
}

// Dựng reminder ngắn, giới hạn số bill hiển thị và giữ dữ liệu bill trong metadata riêng.
function recurringReminderMessage(bills, { maxItems = 5 } = {}) {
  const safeBills = Array.isArray(bills) ? bills : [];
  if (!safeBills.length) return null;
  const lines = safeBills.slice(0, maxItems).map((bill) => {
    const shortage = bill.wallet_balance != null && Number(bill.wallet_balance) < Number(bill.amount)
      ? `; ví ${bill.wallet_name || ''} còn ${formatVND(bill.wallet_balance)}, thiếu ${formatVND(Number(bill.amount) - Number(bill.wallet_balance))}`
      : '';
    return `• ${bill.name}: ${formatVND(bill.amount)} — hạn ${formatDateVi(bill.next_due_date)}${shortage}`;
  });
  if (safeBills.length > maxItems) lines.push(`• Và ${safeBills.length - maxItems} khoản khác`);
  return `Bạn có ${safeBills.length} khoản định kỳ cần chú ý:\n${lines.join('\n')}\nHãy kiểm tra trước khi xác nhận thanh toán.`;
}

function runwayAlertMessage(runway, alertDays = 14) {
  if (!runway || runway.daysLeft == null || Number(runway.daysLeft) > Number(alertDays)) return null;
  const daily = formatVND(runway.avgBurn ?? runway.dailyBurn ?? 0);
  const balance = formatVND(runway.totalBalance || 0);
  const payday = runway.beforePayday && runway.daysBeforePayday != null
    ? ` và có thể cạn trước kỳ lương ${runway.daysBeforePayday} ngày`
    : '';
  return `Cảnh báo dòng tiền: với số dư ${balance} và mức chi trung bình ${daily}/ngày, bạn còn khoảng ${runway.daysLeft} ngày chi tiêu${payday}. Hãy ưu tiên các khoản thiết yếu.`;
}

function subscriptionFingerprint(facts) {
  const rows = (facts?.subscriptions || []).map((item) => ({
    name: String(item.label || item.name || item.description || item.merchant || '').trim().toLowerCase(),
    amount: Math.round(Number(item.avgAmount || item.averageAmount || item.amount || 0)),
    cadence: String(item.cadenceDays || item.frequency || item.cadence || ''),
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0, 16);
}

function subscriptionScanMessage(facts, { maxItems = 5 } = {}) {
  const subscriptions = Array.isArray(facts?.subscriptions) ? facts.subscriptions : [];
  if (!subscriptions.length) return null;
  const lines = subscriptions.slice(0, maxItems).map((item) => {
    const name = item.label || item.name || item.description || item.merchant || 'Khoản đăng ký';
    const amount = item.avgAmount || item.averageAmount || item.amount || 0;
    return `• ${name}: khoảng ${formatVND(amount)}/kỳ`;
  });
  if (subscriptions.length > maxItems) lines.push(`• Và ${subscriptions.length - maxItems} khoản khác`);
  return `Mình phát hiện ${subscriptions.length} khoản có dấu hiệu đăng ký định kỳ (ước tính ${formatVND(facts.totalMonthly || 0)}/tháng):\n${lines.join('\n')}\nBạn nên rà soát và hủy những dịch vụ không còn dùng.`;
}

module.exports = {
  formatVND,
  formatDateVi,
  recurringReminderMessage,
  runwayAlertMessage,
  subscriptionFingerprint,
  subscriptionScanMessage,
};

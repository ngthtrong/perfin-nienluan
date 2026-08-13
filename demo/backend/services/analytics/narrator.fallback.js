// Vai trò: Diễn giải facts phân tích bằng mẫu tiếng Việt khi không dùng được LLM.
// Luồng chính: đọc trực tiếp contract facts và tạo lời kể xác định, không phát minh số liệu.
// Đây cũng là đường fallback để tính năng insight vẫn hoạt động offline.

function fmtVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(Number(n) || 0));
}

function fallbackInsightText(facts = {}) {
  const lines = [];

  if (facts.runway && facts.runway.beforePayday) {
    lines.push(
      `⚠️ Với tốc độ chi ${fmtVND(facts.runway.avgBurn)}/ngày gần đây, số dư của bạn ` +
      `(${fmtVND(facts.runway.totalBalance)}) dự kiến cạn vào ${facts.runway.depletionDate} — ` +
      `trước kỳ lương khoảng ${facts.runway.daysBeforePayday} ngày. Hãy cân nhắc siết chi tiêu.`
    );
  }

  if (Array.isArray(facts.trend) && facts.trend.length) {
    const t = facts.trend[0];
    lines.push(
      `📈 Chi tiêu "${t.category}" đang tăng đều khoảng ${t.avgPctChange}%/tháng ` +
      `(${t.values.map(fmtVND).join(' → ')}). Nếu tiếp tục, tháng tới có thể chạm ${fmtVND(t.forecastNext)}.`
    );
  }

  if (Array.isArray(facts.anomaly) && facts.anomaly.length) {
    const a = facts.anomaly[0];
    lines.push(
      `🔎 Ngày ${a.label} bạn chi ${fmtVND(a.value)} — cao gấp ${a.timesAverage} lần mức trung bình. ` +
      `Bạn nên xem lại khoản này.`
    );
  }

  if (facts.subscriptions && facts.subscriptions.subscriptions?.length) {
    const s = facts.subscriptions;
    const top = s.subscriptions.slice(0, 4).map((x) => `${x.label} (${fmtVND(x.avgAmount)})`).join(', ');
    lines.push(
      `🔁 Bạn có ${s.subscriptions.length} khoản chi định kỳ, tổng khoảng ${fmtVND(s.totalMonthly)}/tháng: ${top}. ` +
      `Nhìn từng khoản thì nhỏ, nhưng cộng lại đáng kể.`
    );
  }

  if (facts.day_of_week) {
    const d = facts.day_of_week;
    lines.push(
      `📅 ${d.day} là ngày bạn chi nhiều nhất — trung bình ${fmtVND(d.avgOnDay)}, ` +
      `gấp ${d.timesHigher} lần các ngày khác.`
    );
  }

  if (facts.correlation) {
    const c = facts.correlation;
    lines.push(
      `🔗 Chi tiêu "${c.a}" và "${c.b}" có xu hướng cùng tăng/giảm (tương quan ${c.r}). ` +
      `Có thể chúng liên quan đến cùng một thói quen.`
    );
  }

  if (!lines.length) {
    return 'Chưa có đủ dữ liệu để phân tích sâu. Hãy tiếp tục ghi chép giao dịch để mình đưa ra nhận xét chính xác hơn nhé.';
  }
  return lines.join('\n\n');
}

module.exports = { fallbackInsightText };

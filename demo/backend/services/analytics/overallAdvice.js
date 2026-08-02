// Short, deterministic advice derived only from facts already computed by the
// analytics engine. This is deliberately separate from the persona narration:
// the report can always show a grounded, multi-period action even when the LLM is
// unavailable, and the frontend does not have to infer advice from prose.

function cleanLabel(value) {
  return String(value || '').trim().slice(0, 80);
}

function buildOverallAdvice(facts = {}) {
  const actions = [];
  const basis = [];

  if (facts.runway?.beforePayday) {
    actions.push('Ưu tiên giảm các khoản chi linh hoạt và giữ một khoản đệm tiền mặt cho đến kỳ lương kế tiếp.');
    basis.push('runway_14_days');
  }

  const leadingTrend = Array.isArray(facts.trend) ? facts.trend[0] : null;
  const trendCategory = cleanLabel(leadingTrend?.category);
  if (trendCategory) {
    actions.push(`Đặt hạn mức riêng cho “${trendCategory}” và theo dõi theo tuần vì lịch sử nhiều tháng cho thấy nhóm này đang tăng.`);
    basis.push('trend_6_months');
  }

  if (facts.subscriptions?.subscriptions?.length) {
    actions.push('Rà soát các khoản chi định kỳ và hủy hoặc hạ gói những dịch vụ ít dùng.');
    basis.push('subscriptions_200_days');
  }

  const leadingAnomaly = Array.isArray(facts.anomaly) ? facts.anomaly[0] : null;
  const anomalyDate = cleanLabel(leadingAnomaly?.label);
  if (anomalyDate) {
    actions.push(`Kiểm tra lại khoản chi bất thường ngày ${anomalyDate} và ghi chú nguyên nhân để tránh lặp lại ngoài kế hoạch.`);
    basis.push('anomaly_30_days');
  }

  const peakDay = cleanLabel(facts.day_of_week?.day);
  if (peakDay) {
    actions.push(`Lên trước hạn mức chi cho ${peakDay}, là ngày có nhịp chi cao nhất trong lịch sử gần đây.`);
    basis.push('day_of_week_60_days');
  }

  const correlationA = cleanLabel(facts.correlation?.a);
  const correlationB = cleanLabel(facts.correlation?.b);
  if (correlationA && correlationB) {
    actions.push(`Theo dõi “${correlationA}” và “${correlationB}” trong cùng một lần rà soát ngân sách vì hai nhóm thường biến động cùng nhau.`);
    basis.push('correlation_12_weeks');
  }

  if (!actions.length) {
    return {
      text: 'Tiếp tục ghi nhận giao dịch đều đặn và rà soát ngân sách hằng tuần để hệ thống có đủ lịch sử đưa ra lời khuyên cụ thể hơn.',
      basis: [],
      scope: 'multi_period_history',
    };
  }

  return {
    text: actions.slice(0, 2).join(' '),
    basis: basis.slice(0, 2),
    scope: 'multi_period_history',
  };
}

module.exports = { buildOverallAdvice };

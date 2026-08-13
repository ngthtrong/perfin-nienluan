// Vai trò: Dự báo chi tiêu cuối kỳ và thời điểm có thể vượt từng ngân sách.
// Luồng chính: ngoại suy tốc độ chi theo số ngày đã qua và giữ các trường hợp biên xác định.

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Ngoại suy một ngân sách theo tốc độ chi đã quan sát và trả ngày vượt nếu còn trong kỳ.
function forecastBudget(progress, { today = new Date(), month, year } = {}) {
  const targetMonth = Number(month || today.getMonth() + 1);
  const targetYear = Number(year || today.getFullYear());
  const currentPeriod = targetMonth === today.getMonth() + 1 && targetYear === today.getFullYear();
  const elapsedDays = currentPeriod ? Math.max(1, today.getDate()) : daysInMonth(targetYear, targetMonth);
  const totalDays = daysInMonth(targetYear, targetMonth);
  const spent = Math.max(0, Number(progress.spent) || 0);
  const limit = Math.max(0, Number(progress.amount_limit) || 0);
  const dailyRate = spent / elapsedDays;
  const projectedSpend = Math.round(dailyRate * totalDays);
  const daysUntilExceeded = dailyRate > 0 && spent < limit ? Math.ceil((limit - spent) / dailyRate) : 0;
  const projectedDay = daysUntilExceeded > 0 && elapsedDays + daysUntilExceeded <= totalDays
    ? elapsedDays + daysUntilExceeded
    : null;
  return {
    ...progress,
    daily_rate: Math.round(dailyRate),
    projected_spend: projectedSpend,
    projected_percentage: limit > 0 ? Number(((projectedSpend / limit) * 100).toFixed(1)) : 0,
    projected_exceed_day: projectedDay,
    likely_to_exceed: limit > 0 && projectedSpend > limit,
  };
}

function forecastBudgets(rows, options = {}) {
  return (rows || []).map((row) => forecastBudget(row, options));
}

module.exports = { daysInMonth, forecastBudget, forecastBudgets };

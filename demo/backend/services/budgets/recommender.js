// Vai trò: Tính hạn mức ngân sách đề xuất theo lịch sử và chiến lược needs/wants.
// Luồng chính: tổng hợp kỳ, phân nhóm, thêm buffer, làm tròn và ép tổng không vượt trần.

const { normalizeForMatch } = require('../feedback/textSimilarity');

const DEFAULT_NEEDS = new Set([
  'an uong',
  'di chuyen',
  'suc khoe',
  'giao duc',
  'nha cua',
  'hoa don dich vu',
  'tap hoa',
]);

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePeriod(value) {
  if (!value) return null;
  const text = String(value);
  const direct = text.match(/^(\d{4})-(\d{2})/);
  if (direct) return `${direct[1]}-${direct[2]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 7);
}

function classifyBudgetGroup(categoryName, groupOverrides = {}) {
  const normalized = normalizeForMatch(categoryName);
  const override = Object.entries(groupOverrides).find(([name]) => normalizeForMatch(name) === normalized);
  if (override && ['needs', 'wants'].includes(override[1])) return override[1];
  return DEFAULT_NEEDS.has(normalized) ? 'needs' : 'wants';
}

function roundCurrency(value, increment = 10000) {
  const amount = Math.max(toFiniteNumber(value), 0);
  const step = Math.max(toFiniteNumber(increment, 10000), 1);
  return Math.max(Math.round(amount / step) * step, amount > 0 ? step : 0);
}

function enforceRoundedCap(items, cap, increment = 10000) {
  const limit = Math.max(toFiniteNumber(cap), 0);
  const step = Math.max(toFiniteNumber(increment, 10000), 1);
  const adjusted = items.map((item) => ({ ...item }));
  let total = adjusted.reduce((sum, item) => sum + item.recommended_limit, 0);

  while (total > limit) {
    const candidate = adjusted
      .filter((item) => item.recommended_limit > 0)
      .sort((left, right) => {
        const leftOvershoot = left.recommended_limit - left.raw_limit;
        const rightOvershoot = right.recommended_limit - right.raw_limit;
        return rightOvershoot - leftOvershoot
          || right.recommended_limit - left.recommended_limit;
      })[0];
    if (!candidate) break;
    const reduction = Math.min(step, candidate.recommended_limit);
    candidate.recommended_limit -= reduction;
    total -= reduction;
  }

  return adjusted;
}

function summarizeHistory(rows = [], expectedPeriods = []) {
  const periods = new Set((expectedPeriods || []).map(normalizePeriod).filter(Boolean));
  const observedPeriods = new Set();
  const incomesByPeriod = new Map();
  const expenses = new Map();

  for (const row of rows) {
    const period = normalizePeriod(row.period || row.month || row.transaction_month);
    if (!period) continue;
    periods.add(period);
    observedPeriods.add(period);
    const amount = Math.max(toFiniteNumber(row.total ?? row.amount ?? row.total_amount ?? row.spent), 0);
    const type = row.type || 'expense';
    if (type === 'income') {
      incomesByPeriod.set(period, (incomesByPeriod.get(period) || 0) + amount);
      continue;
    }
    if (type !== 'expense') continue;
    const categoryId = row.category_id ?? row.categoryId ?? null;
    const categoryName = row.category_name ?? row.categoryName ?? 'Khác';
    const key = categoryId !== null ? `id:${categoryId}` : `name:${normalizeForMatch(categoryName)}`;
    const current = expenses.get(key) || {
      category_id: categoryId,
      category_name: categoryName,
      total: 0,
      active_periods: new Set(),
    };
    current.total += amount;
    current.active_periods.add(period);
    expenses.set(key, current);
  }

  const periodCount = periods.size;
  const incomeTotal = [...incomesByPeriod.values()].reduce((sum, value) => sum + value, 0);
  return {
    periods: [...periods].sort(),
    period_count: periodCount,
    observed_period_count: observedPeriods.size,
    average_income: periodCount ? incomeTotal / periodCount : 0,
    categories: [...expenses.values()].map((category) => ({
      category_id: category.category_id,
      category_name: category.category_name,
      total_spend: category.total,
      average_spend: periodCount ? category.total / periodCount : 0,
      active_periods: category.active_periods.size,
    })),
  };
}

function confidenceFromMonths(months) {
  if (months >= 6) return 'high';
  if (months >= 3) return 'medium';
  return 'low';
}

function normalizeStrategy(value = 'hybrid') {
  const aliases = {
    hybrid: 'hybrid',
    balanced: 'hybrid',
    category_average: 'category_average',
    historical: 'category_average',
    '50-30-20': '50-30-20',
    '50_30_20': '50-30-20',
  };
  return aliases[value] || null;
}

// Tạo đề xuất theo strategy, dữ liệu kỳ hoàn tất và các trần phân bổ đã cấu hình.
function recommendCategoryBudgets(rows = [], options = {}) {
  const summary = summarizeHistory(rows, options.historyPeriods);
  const requestedStrategy = options.strategy || 'hybrid';
  const normalizedStrategy = normalizeStrategy(requestedStrategy);
  if (!normalizedStrategy) {
    const error = new Error('Chiến lược ngân sách phải là hybrid, category_average hoặc 50-30-20');
    error.status = 400;
    throw error;
  }

  const suppliedIncome = toFiniteNumber(options.monthlyIncome);
  const monthlyIncome = suppliedIncome > 0 ? suppliedIncome : summary.average_income;
  let strategy = normalizedStrategy;
  const warnings = [];
  if (strategy !== 'category_average' && monthlyIncome <= 0) {
    strategy = 'category_average';
    warnings.push('Không đủ dữ liệu thu nhập; đã dùng trung bình chi tiêu theo danh mục.');
  }
  if (summary.observed_period_count < 3) {
    warnings.push('Dữ liệu dưới 3 tháng; nên xem đề xuất là mức khởi điểm.');
  }

  const savingsRate = Math.min(Math.max(toFiniteNumber(options.savingsRate, 0.2), 0), 0.9);
  const needsRate = Math.min(Math.max(toFiniteNumber(options.needsRate, 0.5), 0), 1);
  const wantsRate = Math.min(Math.max(toFiniteNumber(options.wantsRate, 0.3), 0), 1);
  const bufferRate = Math.min(Math.max(toFiniteNumber(options.bufferRate, 0.05), 0), 0.5);
  const increment = options.roundingIncrement || 10000;
  if (strategy !== 'category_average' && needsRate + wantsRate + savingsRate > 1 + Number.EPSILON) {
    const error = new Error('Tổng tỷ lệ nhu cầu, mong muốn và tiết kiệm không được vượt quá 100%');
    error.status = 400;
    throw error;
  }

  const baseCategories = summary.categories.map((category) => ({
    ...category,
    group: classifyBudgetGroup(category.category_name, options.groupOverrides),
    buffered_average: category.average_spend * (1 + bufferRate),
  }));
  const groupAverage = baseCategories.reduce((result, category) => {
    result[category.group] += category.buffered_average;
    return result;
  }, { needs: 0, wants: 0 });
  const groupCaps = {
    needs: monthlyIncome * needsRate,
    wants: monthlyIncome * wantsRate,
  };

  let recommendations = baseCategories.map((category) => {
    let rawLimit = category.buffered_average;
    if (strategy === '50-30-20') {
      rawLimit = groupAverage[category.group] > 0
        ? groupCaps[category.group] * (category.buffered_average / groupAverage[category.group])
        : 0;
    } else if (strategy === 'hybrid' && groupAverage[category.group] > groupCaps[category.group]) {
      rawLimit = category.buffered_average * (groupCaps[category.group] / groupAverage[category.group]);
    }
    const recommendedLimit = roundCurrency(rawLimit, increment);
    const rationale = strategy === 'category_average'
      ? `Trung bình ${summary.period_count} tháng + ${Math.round(bufferRate * 100)}% dự phòng.`
      : strategy === '50-30-20'
        ? `Phân bổ theo tỷ trọng lịch sử trong nhóm ${category.group === 'needs' ? 'nhu cầu' : 'mong muốn'}.`
        : `Trung bình lịch sử, giới hạn bởi khung ${Math.round(needsRate * 100)}/${Math.round(wantsRate * 100)}/${Math.round(savingsRate * 100)}.`;
    return {
      category_id: category.category_id,
      category_name: category.category_name,
      group: category.group,
      raw_limit: rawLimit,
      average_spend: Math.round(category.average_spend),
      recommended_limit: recommendedLimit,
      active_months: category.active_periods,
      confidence: confidenceFromMonths(category.active_periods),
      rationale,
    };
  });

  if (strategy !== 'category_average') {
    recommendations = ['needs', 'wants'].flatMap((group) => enforceRoundedCap(
      recommendations.filter((category) => category.group === group),
      groupCaps[group],
      increment
    ));
  }
  recommendations = recommendations
    .filter((category) => category.recommended_limit > 0)
    .map(({ raw_limit: _rawLimit, ...category }) => category);

  const totalRecommended = recommendations.reduce((sum, category) => sum + category.recommended_limit, 0);
  const savingsTarget = monthlyIncome > 0 ? monthlyIncome * savingsRate : 0;
  return {
    requested_strategy: requestedStrategy,
    strategy,
    history_months: summary.period_count,
    monthly_income: Math.round(monthlyIncome),
    framework: {
      needs_cap: Math.round(groupCaps.needs),
      wants_cap: Math.round(groupCaps.wants),
      savings_target: Math.round(savingsTarget),
    },
    total_recommended: totalRecommended,
    estimated_remaining: monthlyIncome > 0 ? Math.round(monthlyIncome - totalRecommended) : null,
    categories: recommendations,
    warnings,
  };
}

module.exports = {
  DEFAULT_NEEDS,
  normalizePeriod,
  classifyBudgetGroup,
  roundCurrency,
  enforceRoundedCap,
  summarizeHistory,
  normalizeStrategy,
  recommendCategoryBudgets,
};

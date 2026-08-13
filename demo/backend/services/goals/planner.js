// Vai trò: Cung cấp phép tính lập kế hoạch tiết kiệm và trả nợ hoàn toàn xác định.
// Luồng chính: validation tham số, mô phỏng từng tháng, tính deadline/what-if và cảnh báo.
// Module không truy cập DB hoặc LLM nên có thể kiểm thử độc lập.

const DAY_MS = 24 * 60 * 60 * 1000;
const EPSILON = 1e-8;

function asDate(value, field = 'date') {
  if (value === null || value === undefined || value === '') return null;

  let parsed;
  if (value instanceof Date) {
    parsed = value;
  } else if (typeof value === 'string') {
    // Date-only values are parsed explicitly to avoid server-timezone drift.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      parsed = new Date(Date.UTC(year, month - 1, day));
      if (
        parsed.getUTCFullYear() !== year
        || parsed.getUTCMonth() !== month - 1
        || parsed.getUTCDate() !== day
      ) {
        throw new TypeError(`${field} is not a valid date`);
      }
    } else {
      parsed = new Date(value);
    }
  } else {
    throw new TypeError(`${field} must be a Date or an ISO date string`);
  }

  if (Number.isNaN(parsed.getTime())) throw new TypeError(`${field} is not a valid date`);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function asNumber(value, field, { min = -Infinity, max = Infinity, nullable = false } = {}) {
  if (nullable && (value === null || value === undefined || value === '')) return null;
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    throw new TypeError(`${field} must be a finite number`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be a finite number`);
  if (number < min || number > max) throw new RangeError(`${field} is outside the supported range`);
  return number;
}

function utcToday(value = new Date()) {
  return asDate(value, 'today');
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function ceilMoney(value) {
  return Math.ceil((value - EPSILON) * 100) / 100;
}

// Signed difference between the two calendar months. Deadline planning uses at
// least one contribution period for any future date in the same calendar month.
function monthsBetween(from, to) {
  const a = asDate(from, 'from');
  const b = asDate(to, 'to');
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

function addMonthsClamped(value, months) {
  const date = asDate(value, 'date');
  const count = asNumber(months, 'months', { min: 0 });
  if (!Number.isInteger(count)) throw new RangeError('months must be an integer');

  const targetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
  const lastDay = new Date(Date.UTC(
    targetMonth.getUTCFullYear(),
    targetMonth.getUTCMonth() + 1,
    0
  )).getUTCDate();
  targetMonth.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return targetMonth;
}

function deadlineContext(today, targetDate) {
  if (!targetDate) return null;
  const deadline = asDate(targetDate, 'targetDate');
  const daysToDeadline = Math.ceil((deadline.getTime() - today.getTime()) / DAY_MS);
  return {
    targetDate: formatDate(deadline),
    daysToDeadline,
    deadlineReached: daysToDeadline <= 0,
    overdue: daysToDeadline < 0,
    monthsToDeadline: daysToDeadline > 0 ? Math.max(1, monthsBetween(today, deadline)) : 0,
  };
}

function savingWarning(result) {
  if (result.remaining <= EPSILON) return null;
  if (result.overdue) {
    return { code: 'GOAL_OVERDUE', message: 'Mục tiêu đã quá hạn nhưng chưa hoàn thành.' };
  }
  if (result.deadlineReached) {
    return { code: 'DEADLINE_REACHED', message: 'Đã đến hạn mục tiêu nhưng số tiền hiện tại chưa đủ.' };
  }
  if (result.contribution <= EPSILON) {
    return { code: 'NO_MONTHLY_CONTRIBUTION', message: 'Chưa có khoản đóng góp hàng tháng cho mục tiêu.' };
  }
  if (result.onTrack === false) {
    return {
      code: 'MONTHLY_GAP',
      message: `Cần tăng khoản góp thêm ${result.gapMonthly} mỗi tháng để kịp hạn.`,
    };
  }
  return null;
}

// Saving/purchase: calculate the payoff horizon and the contribution required for
// a deadline. A null contribution means "use available surplus"; an explicit zero
// means the user currently plans no contribution.
// Lập lịch tiết kiệm theo số còn thiếu, khoản góp tháng và deadline tùy chọn.
function planSaving({
  targetAmount,
  currentAmount = 0,
  monthlyContribution = null,
  targetDate = null,
  surplus = 0,
  goalType = 'saving',
  today = new Date(),
}) {
  const target = asNumber(targetAmount, 'targetAmount', { min: EPSILON });
  const current = asNumber(currentAmount, 'currentAmount', { min: 0 });
  const requestedContribution = asNumber(monthlyContribution, 'monthlyContribution', { min: 0, nullable: true });
  const availableSurplus = Math.max(0, asNumber(surplus, 'surplus'));
  const contribution = requestedContribution === null ? availableSurplus : requestedContribution;
  const type = goalType === 'purchase' ? 'purchase' : 'saving';
  const start = utcToday(today);
  const remaining = Math.max(0, target - current);

  const result = {
    goal_type: type,
    targetAmount: roundMoney(target),
    currentAmount: roundMoney(current),
    remaining: roundMoney(remaining),
    contribution: roundMoney(contribution),
    contributionSource: requestedContribution === null ? 'surplus' : 'user',
    progressPercent: Number(Math.min(100, (current / target) * 100).toFixed(1)),
  };

  if (remaining <= EPSILON) {
    result.monthsNeeded = 0;
    result.projectedDate = formatDate(start);
  } else if (contribution > EPSILON) {
    result.monthsNeeded = Math.ceil(remaining / contribution);
    result.projectedDate = formatDate(addMonthsClamped(start, result.monthsNeeded));
  } else {
    result.monthsNeeded = null;
    result.projectedDate = null;
  }

  const deadline = deadlineContext(start, targetDate);
  if (deadline) {
    Object.assign(result, deadline);
    if (remaining <= EPSILON) {
      result.requiredMonthly = 0;
      result.onTrack = true;
      result.gapMonthly = 0;
      result.shortfallAtDeadline = 0;
      result.feasibleWithSurplus = true;
    } else if (deadline.monthsToDeadline === 0) {
      result.requiredMonthly = null;
      result.onTrack = false;
      result.gapMonthly = null;
      result.shortfallAtDeadline = roundMoney(remaining);
      result.feasibleWithSurplus = false;
    } else {
      result.requiredMonthly = ceilMoney(remaining / deadline.monthsToDeadline);
      result.onTrack = contribution + EPSILON >= result.requiredMonthly;
      result.gapMonthly = roundMoney(Math.max(0, result.requiredMonthly - contribution));
      result.shortfallAtDeadline = roundMoney(Math.max(
        0,
        remaining - contribution * deadline.monthsToDeadline
      ));
      result.feasibleWithSurplus = availableSurplus + EPSILON >= result.requiredMonthly;
    }
  }

  result.warning = savingWarning(result);
  result.status = remaining <= EPSILON
    ? 'completed'
    : result.overdue
      ? 'overdue'
      : result.deadlineReached
        ? 'deadline_reached'
        : contribution <= EPSILON
          ? 'no_contribution'
          : result.onTrack === false
            ? 'off_track'
            : 'on_track';

  return result;
}

function requiredDebtPayment(principal, monthlyRate, months) {
  if (months <= 0) return null;
  if (monthlyRate <= EPSILON) return principal / months;
  return principal * monthlyRate / (1 - ((1 + monthlyRate) ** (-months)));
}

function simulateDebt(principal, monthlyPayment, monthlyRate, maxMonths) {
  let balance = principal;
  let months = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  while (balance > EPSILON && months < maxMonths) {
    const interest = balance * monthlyRate;
    const amountDue = balance + interest;
    const payment = Math.min(monthlyPayment, amountDue);
    totalInterest += interest;
    totalPaid += payment;
    balance = Math.max(0, amountDue - payment);
    months += 1;
  }

  return { balance, months, totalInterest, totalPaid };
}

function debtWarning(result) {
  if (result.principal <= EPSILON) return null;
  if (!result.feasible) return { code: result.reasonCode, message: result.reason };
  if (result.overdue) {
    return { code: 'GOAL_OVERDUE', message: 'Mục tiêu trả nợ đã quá hạn nhưng vẫn còn dư nợ.' };
  }
  if (result.deadlineReached) {
    return { code: 'DEADLINE_REACHED', message: 'Đã đến hạn nhưng khoản nợ chưa được thanh toán hết.' };
  }
  if (result.onTrack === false) {
    return {
      code: 'MONTHLY_GAP',
      message: `Cần tăng khoản trả thêm ${result.gapMonthly} mỗi tháng để kịp hạn.`,
    };
  }
  return null;
}

// Debt payoff amortization with an optional deadline. `principal` is the current
// outstanding balance, not the original debt amount.
// Mô phỏng dư nợ theo tháng và cảnh báo khi payment không thắng được tiền lãi.
function planDebtPayoff({
  principal,
  monthlyPayment,
  annualInterestRate = 0,
  targetDate = null,
  today = new Date(),
  maxMonths = 600,
}) {
  const outstanding = asNumber(principal, 'principal', { min: 0 });
  const payment = asNumber(monthlyPayment, 'monthlyPayment', { min: 0 });
  const annualRate = asNumber(annualInterestRate, 'annualInterestRate', { min: 0, max: 999.999 });
  const horizon = asNumber(maxMonths, 'maxMonths', { min: 1, max: 1200 });
  if (!Number.isInteger(horizon)) throw new RangeError('maxMonths must be an integer');

  const start = utcToday(today);
  const monthlyRate = annualRate / 100 / 12;
  const result = {
    goal_type: 'debt_payoff',
    principal: roundMoney(outstanding),
    monthlyPayment: roundMoney(payment),
    annualInterestRate: annualRate,
    monthlyInterestRate: Number((monthlyRate * 100).toFixed(5)),
  };

  const deadline = deadlineContext(start, targetDate);
  if (deadline) {
    Object.assign(result, deadline);
    if (outstanding <= EPSILON) {
      result.requiredMonthly = 0;
      result.gapMonthly = 0;
      result.shortfallAtDeadline = 0;
      result.onTrack = true;
    } else if (deadline.monthsToDeadline === 0) {
      result.requiredMonthly = null;
      result.gapMonthly = null;
      result.shortfallAtDeadline = roundMoney(outstanding);
      result.onTrack = false;
    } else {
      result.requiredMonthly = ceilMoney(requiredDebtPayment(
        outstanding,
        monthlyRate,
        deadline.monthsToDeadline
      ));
      result.gapMonthly = roundMoney(Math.max(0, result.requiredMonthly - payment));
      result.onTrack = payment + EPSILON >= result.requiredMonthly;
      result.shortfallAtDeadline = roundMoney(simulateDebt(
        outstanding,
        payment,
        monthlyRate,
        deadline.monthsToDeadline
      ).balance);
    }
  }

  if (outstanding <= EPSILON) {
    Object.assign(result, {
      feasible: true,
      monthsNeeded: 0,
      totalInterest: 0,
      totalPaid: 0,
      remainingBalance: 0,
      projectedDate: formatDate(start),
      status: 'completed',
      warning: null,
    });
    return result;
  }

  if (payment <= EPSILON) {
    Object.assign(result, {
      feasible: false,
      monthsNeeded: null,
      projectedDate: null,
      reasonCode: 'NO_MONTHLY_PAYMENT',
      reason: 'Chưa có khoản trả nợ hàng tháng.',
      status: 'no_payment',
    });
    result.warning = debtWarning(result);
    return result;
  }

  const firstMonthInterest = outstanding * monthlyRate;
  if (monthlyRate > 0 && payment <= firstMonthInterest + EPSILON) {
    Object.assign(result, {
      feasible: false,
      monthsNeeded: null,
      projectedDate: null,
      minPaymentToReduce: Math.floor(firstMonthInterest) + 1,
      reasonCode: 'NEGATIVE_AMORTIZATION',
      reason: 'Khoản trả hàng tháng không đủ bù lãi — nợ sẽ không giảm.',
      status: 'negative_amortization',
    });
    result.warning = debtWarning(result);
    return result;
  }

  const simulation = simulateDebt(outstanding, payment, monthlyRate, horizon);
  result.totalInterest = roundMoney(simulation.totalInterest);
  result.totalPaid = roundMoney(simulation.totalPaid);
  result.remainingBalance = roundMoney(simulation.balance);

  if (simulation.balance > EPSILON) {
    Object.assign(result, {
      feasible: false,
      monthsNeeded: null,
      monthsSimulated: simulation.months,
      projectedDate: null,
      reasonCode: 'MAX_HORIZON_EXCEEDED',
      reason: `Không thể tất toán trong giới hạn ${horizon} tháng.`,
      status: 'horizon_exceeded',
    });
    result.warning = debtWarning(result);
    return result;
  }

  result.feasible = true;
  result.monthsNeeded = simulation.months;
  result.projectedDate = formatDate(addMonthsClamped(start, simulation.months));
  if (deadline) result.onTrack = deadline.monthsToDeadline > 0 && simulation.months <= deadline.monthsToDeadline;
  result.status = result.overdue
    ? 'overdue'
    : result.deadlineReached
      ? 'deadline_reached'
      : result.onTrack === false
        ? 'off_track'
        : 'on_track';
  result.warning = debtWarning(result);
  return result;
}

// Re-run a saving/purchase plan with cash freed up elsewhere. When the base plan
// has no contribution, the scenario can turn an impossible horizon into a finite one.
// Đánh giá tác động của khoản góp thêm mà không thay đổi base plan đầu vào.
function whatIf(basePlan, extraMonthly, params) {
  if (!basePlan || !['saving', 'purchase'].includes(basePlan.goal_type)) return null;
  const extra = asNumber(extraMonthly, 'extraMonthly', { min: 0 });
  const baseContribution = asNumber(basePlan.contribution || 0, 'basePlan.contribution', { min: 0 });
  const improved = planSaving({
    ...params,
    goalType: basePlan.goal_type,
    monthlyContribution: baseContribution + extra,
  });
  const hasBaseHorizon = Number.isInteger(basePlan.monthsNeeded);
  const hasNewHorizon = Number.isInteger(improved.monthsNeeded);
  const monthsSaved = hasBaseHorizon && hasNewHorizon
    ? Math.max(0, basePlan.monthsNeeded - improved.monthsNeeded)
    : null;

  return {
    extraMonthly: roundMoney(extra),
    newContribution: improved.contribution,
    newMonthsNeeded: improved.monthsNeeded,
    newProjectedDate: improved.projectedDate,
    monthsSaved,
    becomesFeasible: !hasBaseHorizon && hasNewHorizon,
    onTrack: improved.onTrack,
    gapMonthly: improved.gapMonthly,
    shortfallAtDeadline: improved.shortfallAtDeadline,
  };
}

// Compare actual progress with the time elapsed, then combine that signal with the
// planner forecast. This is intentionally advisory: legacy goals do not store an
// initial balance, so expected progress assumes a linear path from creation.
function assessProgress(goal, plan, { today = new Date() } = {}) {
  const target = asNumber(goal.target_amount ?? goal.targetAmount, 'targetAmount', { min: EPSILON });
  const current = asNumber(goal.current_amount ?? goal.currentAmount ?? 0, 'currentAmount', { min: 0 });
  const actualPercent = Number(Math.min(100, (current / target) * 100).toFixed(1));
  const remaining = roundMoney(Math.max(0, target - current));
  const start = utcToday(today);
  const created = asDate(goal.created_at ?? goal.createdAt, 'createdAt');
  const deadline = asDate(goal.target_date ?? goal.targetDate, 'targetDate');

  let expectedPercent = null;
  let deviationPercent = null;
  if (created && deadline && deadline > created) {
    const totalDays = (deadline - created) / DAY_MS;
    const elapsedDays = Math.max(0, Math.min(totalDays, (start - created) / DAY_MS));
    expectedPercent = Number(Math.min(100, (elapsedDays / totalDays) * 100).toFixed(1));
    deviationPercent = Number((actualPercent - expectedPercent).toFixed(1));
  }

  let status = plan.status || (remaining <= EPSILON ? 'completed' : 'in_progress');
  let warning = plan.warning || null;
  if (goal.status === 'paused') {
    status = 'paused';
    warning = { code: 'GOAL_PAUSED', message: 'Mục tiêu đang tạm dừng.' };
  } else if (goal.status === 'achieved' || remaining <= EPSILON) {
    status = 'completed';
    warning = null;
  } else if (!warning && deviationPercent !== null && deviationPercent < -10) {
    status = 'behind_schedule';
    warning = {
      code: 'PROGRESS_BEHIND',
      message: `Tiến độ đang chậm ${Math.abs(deviationPercent)} điểm phần trăm so với kế hoạch.`,
    };
  }

  return { status, actualPercent, expectedPercent, deviationPercent, remaining, warning };
}

module.exports = {
  planSaving,
  planDebtPayoff,
  whatIf,
  assessProgress,
  monthsBetween,
  addMonthsClamped,
};

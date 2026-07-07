// Pure goal-planning math (Flow 16). No DB/LLM — deterministic so it is testable.
//
// Covers the three goal types from the proposal:
//   saving / purchase : reach target_amount by contributing monthly.
//   debt_payoff       : amortize a debt at a monthly interest rate.
// Plus a what-if helper to see the effect of freeing up extra monthly cash.

function monthsBetween(from, to) {
  const a = new Date(from);
  const b = new Date(to);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

// Saving/purchase: how long to reach target given a monthly contribution, and what
// contribution is required to hit a target_date.
function planSaving({ targetAmount, currentAmount = 0, monthlyContribution = 0, targetDate = null, surplus = 0, today = new Date() }) {
  const remaining = Math.max(0, targetAmount - currentAmount);
  const contribution = monthlyContribution > 0 ? monthlyContribution : surplus;

  const result = { goal_type: 'saving', remaining, contribution: Math.round(contribution) };

  if (contribution > 0) {
    result.monthsNeeded = Math.ceil(remaining / contribution);
    const done = new Date(today);
    done.setMonth(done.getMonth() + result.monthsNeeded);
    result.projectedDate = done.toISOString().slice(0, 10);
  } else {
    result.monthsNeeded = null;
    result.projectedDate = null;
  }

  if (targetDate) {
    const months = Math.max(1, monthsBetween(today, targetDate));
    result.monthsToDeadline = months;
    result.requiredMonthly = Math.ceil(remaining / months);
    result.onTrack = contribution >= result.requiredMonthly;
    result.gapMonthly = Math.max(0, result.requiredMonthly - contribution);
    // Feasibility vs current surplus
    result.feasibleWithSurplus = surplus >= result.requiredMonthly;
  }

  return result;
}

// Debt payoff: amortization. Given principal, monthly payment and annual rate,
// simulate months to clear and total interest paid. Guards against a payment that
// never covers the monthly interest.
function planDebtPayoff({ principal, monthlyPayment, annualInterestRate = 0, today = new Date(), maxMonths = 600 }) {
  const monthlyRate = annualInterestRate / 100 / 12;
  const result = { goal_type: 'debt_payoff', principal, monthlyPayment, annualInterestRate };

  const minPayment = principal * monthlyRate;
  if (monthlyPayment <= minPayment && monthlyRate > 0) {
    result.feasible = false;
    result.minPaymentToReduce = Math.ceil(minPayment + 1);
    result.reason = 'Khoản trả hàng tháng không đủ bù lãi — nợ sẽ không giảm.';
    return result;
  }

  let balance = principal;
  let months = 0;
  let totalInterest = 0;
  while (balance > 0 && months < maxMonths) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance = balance + interest - monthlyPayment;
    months += 1;
    if (balance < 0) balance = 0;
  }

  const done = new Date(today);
  done.setMonth(done.getMonth() + months);
  result.feasible = true;
  result.monthsNeeded = months;
  result.totalInterest = Math.round(totalInterest);
  result.totalPaid = Math.round(principal + totalInterest);
  result.projectedDate = done.toISOString().slice(0, 10);
  return result;
}

// What-if: re-run a saving plan with an extra monthly amount freed up (e.g. cutting
// 20% of a category). Returns how many months earlier the goal is reached.
function whatIf(basePlan, extraMonthly, params) {
  if (basePlan.goal_type !== 'saving') return null;
  const improved = planSaving({ ...params, monthlyContribution: (basePlan.contribution || 0) + extraMonthly });
  const monthsSaved = basePlan.monthsNeeded && improved.monthsNeeded
    ? basePlan.monthsNeeded - improved.monthsNeeded
    : null;
  return { extraMonthly: Math.round(extraMonthly), newMonthsNeeded: improved.monthsNeeded, newProjectedDate: improved.projectedDate, monthsSaved };
}

module.exports = { planSaving, planDebtPayoff, whatIf, monthsBetween };

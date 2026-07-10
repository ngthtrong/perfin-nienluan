// Goal service: ties the pure planner to real cashflow data.
// Computes the user's average monthly surplus (income − expense) and runs the
// appropriate plan for a goal. Used by /api/goals and the chat goal_create flow.

const AnalyticsModel = require('../../models/analytics.model');
const { planSaving, planDebtPayoff, whatIf, assessProgress } = require('./planner');
const algo = require('../analytics/algorithms');

const DEFAULT_USER = 'default_user';

// Average monthly surplus over the last N months (positive = money left over).
async function computeSurplus(userId = DEFAULT_USER, months = 6) {
  if (!Number.isInteger(months) || months < 1 || months > 60) {
    throw new RangeError('months phải là số nguyên từ 1 đến 60');
  }
  const rows = await AnalyticsModel.monthlyCashflow(userId, months);
  if (!rows.length) return { surplus: 0, avgIncome: 0, avgExpense: 0, months: 0 };
  const incomes = rows.map((r) => Number(r.income)).filter(Number.isFinite);
  const expenses = rows.map((r) => Number(r.expense)).filter(Number.isFinite);
  const avgIncome = algo.mean(incomes);
  const avgExpense = algo.mean(expenses);
  return {
    surplus: Math.round(avgIncome - avgExpense),
    avgIncome: Math.round(avgIncome),
    avgExpense: Math.round(avgExpense),
    months: rows.length,
  };
}

// Build a plan object for a goal row (or a draft goal), enriched with surplus context.
async function buildPlan(goal, userId = DEFAULT_USER, { today = new Date() } = {}) {
  const cash = await computeSurplus(userId);
  const targetAmount = Number(goal.target_amount);
  const currentAmount = Number(goal.current_amount ?? 0);
  const monthlyContribution = goal.monthly_contribution === null || goal.monthly_contribution === undefined
    ? null
    : Number(goal.monthly_contribution);
  const params = {
    targetAmount,
    currentAmount,
    monthlyContribution,
    targetDate: goal.target_date || null,
    surplus: cash.surplus,
    goalType: goal.goal_type || 'saving',
    today,
  };

  let plan;
  if (goal.goal_type === 'debt_payoff') {
    plan = planDebtPayoff({
      principal: Math.max(0, targetAmount - currentAmount),
      monthlyPayment: monthlyContribution === null ? Math.max(0, cash.surplus) : monthlyContribution,
      annualInterestRate: Number(goal.annual_interest_rate || 0),
      targetDate: goal.target_date || null,
      today,
    });
  } else {
    plan = planSaving(params);
    // Offer a concrete what-if: freeing up 20% of average expense.
    const extra = Math.round(cash.avgExpense * 0.2);
    if (extra > 0 && plan.remaining > 0) plan.whatIf = whatIf(plan, extra, params);
  }

  const progress = assessProgress(goal, plan, { today });
  return { plan, progress, cashflow: cash };
}

module.exports = { computeSurplus, buildPlan };

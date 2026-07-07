// Goal service: ties the pure planner to real cashflow data.
// Computes the user's average monthly surplus (income − expense) and runs the
// appropriate plan for a goal. Used by /api/goals and the chat goal_create flow.

const AnalyticsModel = require('../../models/analytics.model');
const { planSaving, planDebtPayoff, whatIf } = require('./planner');
const algo = require('../analytics/algorithms');

const DEFAULT_USER = 'default_user';

// Average monthly surplus over the last N months (positive = money left over).
async function computeSurplus(userId = DEFAULT_USER, months = 6) {
  const rows = await AnalyticsModel.monthlyCashflow(userId, months);
  if (!rows.length) return { surplus: 0, avgIncome: 0, avgExpense: 0, months: 0 };
  const avgIncome = algo.mean(rows.map((r) => r.income));
  const avgExpense = algo.mean(rows.map((r) => r.expense));
  return {
    surplus: Math.round(avgIncome - avgExpense),
    avgIncome: Math.round(avgIncome),
    avgExpense: Math.round(avgExpense),
    months: rows.length,
  };
}

// Build a plan object for a goal row (or a draft goal), enriched with surplus context.
async function buildPlan(goal, userId = DEFAULT_USER) {
  const cash = await computeSurplus(userId);
  const params = {
    targetAmount: Number(goal.target_amount),
    currentAmount: Number(goal.current_amount || 0),
    monthlyContribution: Number(goal.monthly_contribution || 0),
    targetDate: goal.target_date || null,
    surplus: cash.surplus,
  };

  let plan;
  if (goal.goal_type === 'debt_payoff') {
    plan = planDebtPayoff({
      principal: Number(goal.target_amount),
      monthlyPayment: Number(goal.monthly_contribution || cash.surplus),
      annualInterestRate: Number(goal.annual_interest_rate || 0),
    });
  } else {
    plan = planSaving(params);
    // Offer a concrete what-if: freeing up 20% of average expense.
    const extra = Math.round(cash.avgExpense * 0.2);
    if (extra > 0) plan.whatIf = whatIf(plan, extra, params);
  }

  return { plan, cashflow: cash };
}

module.exports = { computeSurplus, buildPlan };

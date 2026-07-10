const test = require('node:test');
const assert = require('node:assert/strict');

const AnalyticsModel = require('../models/analytics.model');
const GoalService = require('../services/goals');

const TODAY = new Date('2026-01-01T00:00:00.000Z');

test('computeSurplus averages numeric cashflow rows', async (t) => {
  t.mock.method(AnalyticsModel, 'monthlyCashflow', async () => [
    { income: '1000', expense: '600' },
    { income: 2_000, expense: 1_000 },
  ]);
  assert.deepEqual(await GoalService.computeSurplus('u1', 2), {
    surplus: 700,
    avgIncome: 1_500,
    avgExpense: 800,
    months: 2,
  });
});

test('computeSurplus validates the requested history window before querying', async (t) => {
  const query = t.mock.method(AnalyticsModel, 'monthlyCashflow', async () => []);
  await assert.rejects(GoalService.computeSurplus('u1', 0), /1 đến 60/);
  await assert.rejects(GoalService.computeSurplus('u1', 1.5), /1 đến 60/);
  assert.equal(query.mock.callCount(), 0);
});

test('buildPlan uses surplus only when monthly contribution is null', async (t) => {
  t.mock.method(AnalyticsModel, 'monthlyCashflow', async () => [
    { income: 1_000, expense: 800 },
  ]);
  const automatic = await GoalService.buildPlan({
    goal_type: 'saving',
    target_amount: 1_000,
    current_amount: 0,
    monthly_contribution: null,
  }, 'u1', { today: TODAY });
  const stopped = await GoalService.buildPlan({
    goal_type: 'saving',
    target_amount: 1_000,
    current_amount: 0,
    monthly_contribution: 0,
  }, 'u1', { today: TODAY });

  assert.equal(automatic.plan.contribution, 200);
  assert.equal(automatic.plan.monthsNeeded, 5);
  assert.equal(stopped.plan.contribution, 0);
  assert.equal(stopped.plan.monthsNeeded, null);
});

test('buildPlan amortizes only the unpaid portion of a debt and includes progress', async (t) => {
  t.mock.method(AnalyticsModel, 'monthlyCashflow', async () => [
    { income: 2_000, expense: 1_000 },
  ]);
  const result = await GoalService.buildPlan({
    goal_type: 'debt_payoff',
    target_amount: 10_000,
    current_amount: 2_000,
    monthly_contribution: 1_000,
    annual_interest_rate: 0,
    created_at: '2026-01-01',
    target_date: '2026-09-01',
    status: 'active',
  }, 'u1', { today: TODAY });

  assert.equal(result.plan.principal, 8_000);
  assert.equal(result.plan.monthsNeeded, 8);
  assert.equal(result.progress.actualPercent, 20);
  assert.equal(result.cashflow.surplus, 1_000);
});

test('buildPlan does not replace an explicit zero debt payment with surplus', async (t) => {
  t.mock.method(AnalyticsModel, 'monthlyCashflow', async () => [
    { income: 2_000, expense: 1_000 },
  ]);
  const result = await GoalService.buildPlan({
    goal_type: 'debt_payoff',
    target_amount: 10_000,
    current_amount: 0,
    monthly_contribution: 0,
    annual_interest_rate: 0,
  }, 'u1', { today: TODAY });
  assert.equal(result.plan.monthlyPayment, 0);
  assert.equal(result.plan.reasonCode, 'NO_MONTHLY_PAYMENT');
});

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  planSaving,
  planDebtPayoff,
  whatIf,
  assessProgress,
  monthsBetween,
  addMonthsClamped,
} = require('../services/goals/planner');

const TODAY = new Date('2026-01-31T00:00:00.000Z');

test('calendar helpers are timezone-safe and clamp end-of-month dates', () => {
  assert.equal(monthsBetween('2026-01-31', '2026-11-30'), 10);
  assert.equal(monthsBetween('2026-03-01', '2026-01-01'), -2);
  assert.equal(addMonthsClamped(TODAY, 1).toISOString().slice(0, 10), '2026-02-28');
  assert.equal(addMonthsClamped(TODAY, 2).toISOString().slice(0, 10), '2026-03-31');
  assert.throws(() => monthsBetween('2026-02-31', '2026-03-01'), /valid date/);
});

test('saving plan distinguishes automatic surplus from an explicit zero contribution', () => {
  const automatic = planSaving({ targetAmount: 1_000, surplus: 100, today: TODAY });
  const stopped = planSaving({
    targetAmount: 1_000,
    surplus: 100,
    monthlyContribution: 0,
    today: TODAY,
  });

  assert.equal(automatic.contribution, 100);
  assert.equal(automatic.contributionSource, 'surplus');
  assert.equal(automatic.monthsNeeded, 10);
  assert.equal(stopped.contribution, 0);
  assert.equal(stopped.contributionSource, 'user');
  assert.equal(stopped.monthsNeeded, null);
  assert.equal(stopped.warning.code, 'NO_MONTHLY_CONTRIBUTION');
});

test('completed saving goal has a zero-month horizon', () => {
  const plan = planSaving({
    targetAmount: 1_000,
    currentAmount: 1_100,
    monthlyContribution: 0,
    today: TODAY,
  });
  assert.equal(plan.remaining, 0);
  assert.equal(plan.monthsNeeded, 0);
  assert.equal(plan.projectedDate, '2026-01-31');
  assert.equal(plan.status, 'completed');
  assert.equal(plan.progressPercent, 100);
});

test('saving deadline exposes the monthly gap and never treats a past date as one month away', () => {
  const offTrack = planSaving({
    targetAmount: 1_200,
    currentAmount: 200,
    monthlyContribution: 50,
    surplus: 120,
    targetDate: '2026-11-30',
    today: TODAY,
  });
  assert.equal(offTrack.monthsToDeadline, 10);
  assert.equal(offTrack.requiredMonthly, 100);
  assert.equal(offTrack.gapMonthly, 50);
  assert.equal(offTrack.shortfallAtDeadline, 500);
  assert.equal(offTrack.feasibleWithSurplus, true);
  assert.equal(offTrack.status, 'off_track');

  const overdue = planSaving({
    targetAmount: 1_000,
    monthlyContribution: 1_000,
    targetDate: '2026-01-30',
    today: TODAY,
  });
  assert.equal(overdue.monthsToDeadline, 0);
  assert.equal(overdue.requiredMonthly, null);
  assert.equal(overdue.onTrack, false);
  assert.equal(overdue.status, 'overdue');
  assert.equal(overdue.warning.code, 'GOAL_OVERDUE');
});

test('purchase what-if preserves goal type and can make an unreachable plan feasible', () => {
  const base = planSaving({
    goalType: 'purchase',
    targetAmount: 1_000,
    monthlyContribution: 0,
    today: TODAY,
  });
  const scenario = whatIf(base, 100, {
    goalType: 'purchase',
    targetAmount: 1_000,
    monthlyContribution: 0,
    today: TODAY,
  });

  assert.equal(base.goal_type, 'purchase');
  assert.equal(scenario.newContribution, 100);
  assert.equal(scenario.newMonthsNeeded, 10);
  assert.equal(scenario.monthsSaved, null);
  assert.equal(scenario.becomesFeasible, true);
  assert.throws(() => whatIf(base, -1, { targetAmount: 1_000, today: TODAY }), /outside/);
});

test('debt payoff handles a paid debt and zero payment without phantom periods', () => {
  const paid = planDebtPayoff({ principal: 0, monthlyPayment: 0, today: TODAY });
  assert.equal(paid.feasible, true);
  assert.equal(paid.monthsNeeded, 0);
  assert.equal(paid.totalPaid, 0);
  assert.equal(paid.projectedDate, '2026-01-31');

  const noPayment = planDebtPayoff({ principal: 10_000, monthlyPayment: 0, today: TODAY });
  assert.equal(noPayment.feasible, false);
  assert.equal(noPayment.reasonCode, 'NO_MONTHLY_PAYMENT');
  assert.equal(noPayment.monthsNeeded, null);
});

test('debt payoff detects negative amortization', () => {
  const plan = planDebtPayoff({
    principal: 10_000,
    monthlyPayment: 100,
    annualInterestRate: 12,
    today: TODAY,
  });
  assert.equal(plan.feasible, false);
  assert.equal(plan.reasonCode, 'NEGATIVE_AMORTIZATION');
  assert.equal(plan.minPaymentToReduce, 101);
});

test('debt amortization reports interest, final partial payment, and a clamped date', () => {
  const plan = planDebtPayoff({
    principal: 10_000,
    monthlyPayment: 1_000,
    annualInterestRate: 12,
    today: TODAY,
  });
  assert.equal(plan.feasible, true);
  assert.equal(plan.monthsNeeded, 11);
  assert.equal(plan.totalInterest, 589.85);
  assert.equal(plan.totalPaid, 10_589.85);
  assert.equal(plan.remainingBalance, 0);
  assert.equal(plan.projectedDate, '2026-12-31');
});

test('debt deadline calculates the amortized payment and off-track shortfall', () => {
  const plan = planDebtPayoff({
    principal: 10_000,
    monthlyPayment: 800,
    annualInterestRate: 12,
    targetDate: '2027-01-31',
    today: TODAY,
  });
  assert.equal(plan.monthsToDeadline, 12);
  assert.equal(plan.requiredMonthly, 888.49);
  assert.equal(plan.gapMonthly, 88.49);
  assert.equal(plan.onTrack, false);
  assert.ok(plan.shortfallAtDeadline > 0);
  assert.equal(plan.status, 'off_track');
});

test('debt payoff does not claim success when max simulation horizon is exhausted', () => {
  const plan = planDebtPayoff({
    principal: 10_000,
    monthlyPayment: 101,
    annualInterestRate: 12,
    maxMonths: 1,
    today: TODAY,
  });
  assert.equal(plan.feasible, false);
  assert.equal(plan.reasonCode, 'MAX_HORIZON_EXCEEDED');
  assert.equal(plan.monthsSimulated, 1);
  assert.ok(plan.remainingBalance > 0);
});

test('progress assessment flags a goal lagging its linear schedule', () => {
  const progress = assessProgress({
    target_amount: 1_000,
    current_amount: 100,
    created_at: '2026-01-01',
    target_date: '2026-11-01',
    status: 'active',
  }, { status: 'on_track', warning: null }, { today: new Date('2026-06-01T00:00:00Z') });

  assert.equal(progress.actualPercent, 10);
  assert.ok(progress.expectedPercent > 49 && progress.expectedPercent < 51);
  assert.ok(progress.deviationPercent < -39);
  assert.equal(progress.status, 'behind_schedule');
  assert.equal(progress.warning.code, 'PROGRESS_BEHIND');
});

test('planner rejects non-finite and out-of-range values', () => {
  assert.throws(() => planSaving({ targetAmount: Number.NaN }), /finite number/);
  assert.throws(() => planSaving({ targetAmount: -1 }), /outside/);
  assert.throws(() => planDebtPayoff({ principal: 1_000, monthlyPayment: -1 }), /outside/);
  assert.throws(() => planDebtPayoff({
    principal: 1_000,
    monthlyPayment: 100,
    annualInterestRate: 1_000,
  }), /outside/);
});

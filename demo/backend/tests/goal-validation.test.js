const test = require('node:test');
const assert = require('node:assert/strict');

const { validateGoalPayload, parseGoalId } = require('../services/goals/validation');

const TODAY = new Date('2026-07-10T00:00:00.000Z');

test('create validation normalizes strings and preserves explicit zero values', () => {
  const result = validateGoalPayload({
    name: '  Quỹ dự phòng  ',
    goal_type: 'saving',
    target_amount: '10000000',
    current_amount: 0,
    monthly_contribution: 0,
    annual_interest_rate: 0,
    target_date: '2026-12-31',
    linked_wallet_id: '2',
    note: '  ưu tiên  ',
  }, { mode: 'create', today: TODAY });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.value, {
    name: 'Quỹ dự phòng',
    goal_type: 'saving',
    target_amount: 10_000_000,
    current_amount: 0,
    monthly_contribution: 0,
    annual_interest_rate: 0,
    target_date: '2026-12-31',
    linked_wallet_id: 2,
    note: 'ưu tiên',
  });
});

test('plan preview does not require a name', () => {
  const result = validateGoalPayload({
    target_amount: 1_000,
    annual_interest_rate: null,
  }, { mode: 'plan', today: TODAY });
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.target_amount, 1_000);
  assert.equal(result.value.annual_interest_rate, 0);
});

test('validation rejects malformed money, enums, dates, unknown fields, and irrelevant interest', () => {
  const result = validateGoalPayload({
    name: 'Sai',
    goal_type: 'invalid',
    target_amount: 'NaN',
    current_amount: -1,
    annual_interest_rate: 12,
    target_date: '2026-02-31',
    unexpected: true,
  }, { mode: 'create', today: TODAY });

  assert.ok(result.errors.some((error) => error.includes('goal_type')));
  assert.ok(result.errors.some((error) => error.includes('target_amount')));
  assert.ok(result.errors.some((error) => error.includes('current_amount')));
  assert.ok(result.errors.some((error) => error.includes('target_date')));
  assert.ok(result.errors.some((error) => error.includes('Trường không được hỗ trợ')));
  assert.ok(result.errors.some((error) => error.includes('chỉ áp dụng')));
});

test('validation rejects a newly supplied deadline in the past', () => {
  const result = validateGoalPayload({
    target_amount: 1_000,
    target_date: '2026-07-09',
  }, { mode: 'plan', today: TODAY });
  assert.ok(result.errors.includes('target_date không được nằm trong quá khứ'));
});

test('update validation supports clearing nullable fields and setting numeric fields to zero', () => {
  const existing = {
    goal_type: 'debt_payoff',
    annual_interest_rate: '12',
    target_amount: '10000',
  };
  const result = validateGoalPayload({
    current_amount: 0,
    monthly_contribution: null,
    target_date: null,
    linked_wallet_id: null,
    note: null,
    status: 'paused',
  }, { mode: 'update', existing, today: TODAY });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.value, {
    current_amount: 0,
    monthly_contribution: null,
    target_date: null,
    linked_wallet_id: null,
    note: null,
    status: 'paused',
  });
});

test('update validation rejects empty patches and incompatible type changes', () => {
  const empty = validateGoalPayload({}, { mode: 'update', existing: { goal_type: 'saving' }, today: TODAY });
  assert.ok(empty.errors.includes('Không có trường hợp lệ để cập nhật'));

  const incompatible = validateGoalPayload({ goal_type: 'saving' }, {
    mode: 'update',
    existing: { goal_type: 'debt_payoff', annual_interest_rate: 12 },
    today: TODAY,
  });
  assert.ok(incompatible.errors.some((error) => error.includes('annual_interest_rate')));
});

test('goal id parser accepts only positive safe integers', () => {
  assert.equal(parseGoalId('12'), 12);
  assert.equal(parseGoalId('0'), null);
  assert.equal(parseGoalId('-1'), null);
  assert.equal(parseGoalId('1.5'), null);
  assert.equal(parseGoalId('abc'), null);
  assert.equal(parseGoalId('9007199254740992'), null);
});

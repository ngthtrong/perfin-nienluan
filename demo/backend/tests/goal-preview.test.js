const test = require('node:test');
const assert = require('node:assert/strict');
const {
  issuePreviewToken,
  verifyPreviewToken,
  previewedGoalFields,
  goalUpdateHasPlanChanges,
} = require('../routes/goal.routes');

const goal = {
  name: 'Quỹ dự phòng',
  goal_type: 'saving',
  target_amount: 10_000_000,
  current_amount: 1_000_000,
};

test('goal preview token is bound to the normalized payload independent of key order', () => {
  const now = Date.UTC(2026, 6, 17, 8, 0, 0);
  const token = issuePreviewToken(goal, now);
  const reordered = {
    current_amount: 1_000_000,
    target_amount: 10_000_000,
    goal_type: 'saving',
    name: 'Quỹ dự phòng',
  };

  assert.equal(verifyPreviewToken(token, reordered, now + 1000), true);
  assert.equal(verifyPreviewToken(token, { ...goal, target_amount: 20_000_000 }, now + 1000), false);
});

test('goal preview token expires and rejects malformed signatures', () => {
  const now = Date.UTC(2026, 6, 17, 8, 0, 0);
  const token = issuePreviewToken(goal, now);
  assert.equal(verifyPreviewToken(token, goal, now + 16 * 60 * 1000), false);
  assert.equal(verifyPreviewToken(`${token}tampered`, goal, now + 1000), false);
  assert.equal(verifyPreviewToken('invalid', goal, now), false);
});

test('goal status transitions do not invalidate a preview of changed plan fields', () => {
  const now = Date.UTC(2026, 6, 17, 8, 0, 0);
  const token = issuePreviewToken(goal, now);
  const update = { ...goal, status: 'paused' };

  assert.deepEqual(previewedGoalFields(update), goal);
  assert.equal(verifyPreviewToken(token, previewedGoalFields(update), now + 1000), true);
  assert.equal(goalUpdateHasPlanChanges(update), true);
});

test('status-only goal updates do not require a financial-plan preview', () => {
  assert.deepEqual(previewedGoalFields({ status: 'achieved' }), {});
  assert.equal(goalUpdateHasPlanChanges({ status: 'achieved' }), false);
});

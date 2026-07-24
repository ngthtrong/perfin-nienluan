const test = require('node:test');
const assert = require('node:assert/strict');

const { buildOverallAdvice } = require('../services/analytics/overallAdvice');

test('overall advice prioritizes grounded actions across historical insight windows', () => {
  const advice = buildOverallAdvice({
    runway: { beforePayday: true },
    trend: [{ category: 'Ăn uống', avgPctChange: 18 }],
    subscriptions: { subscriptions: [{ label: 'Cloud' }] },
  });

  assert.equal(advice.scope, 'multi_period_history');
  assert.deepEqual(advice.basis, ['runway_14_days', 'trend_6_months']);
  assert.match(advice.text, /kỳ lương kế tiếp/);
  assert.match(advice.text, /Ăn uống/);
  assert.ok(advice.text.length < 300);
});

test('overall advice has a concise data-collection fallback when facts are insufficient', () => {
  const advice = buildOverallAdvice({ degraded_components: ['trend'] });
  assert.deepEqual(advice.basis, []);
  assert.match(advice.text, /ghi nhận giao dịch đều đặn/);
});

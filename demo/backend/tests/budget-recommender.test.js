const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyBudgetGroup,
  summarizeHistory,
  recommendCategoryBudgets,
} = require('../services/budgets/recommender');

const history = [
  ...['2026-04', '2026-05', '2026-06'].flatMap((period) => [
    { period, type: 'income', category_id: 20, category_name: 'Lương', total: 10000000 },
    { period, type: 'expense', category_id: 1, category_name: 'Ăn uống', total: 4000000 },
    { period, type: 'expense', category_id: 2, category_name: 'Giải trí', total: 4000000 },
  ]),
];

test('xếp nhóm nhu cầu/mong muốn và cho phép override', () => {
  assert.equal(classifyBudgetGroup('Ăn uống'), 'needs');
  assert.equal(classifyBudgetGroup('Giải trí'), 'wants');
  assert.equal(classifyBudgetGroup('Giải trí', { 'Giải trí': 'needs' }), 'needs');
});

test('trung bình danh mục tính cả tháng không phát sinh', () => {
  const summary = summarizeHistory([
    { period: '2026-04', type: 'income', total: 10000000 },
    { period: '2026-05', type: 'income', total: 10000000 },
    { period: '2026-06', type: 'income', total: 10000000 },
    { period: '2026-04', type: 'expense', category_id: 1, category_name: 'Ăn uống', total: 3000000 },
  ]);
  assert.equal(summary.period_count, 3);
  assert.equal(summary.categories[0].average_spend, 1000000);
});

test('hybrid giữ nhóm mong muốn trong trần 30% thu nhập', () => {
  const result = recommendCategoryBudgets(history, { strategy: 'hybrid', bufferRate: 0 });
  const needs = result.categories.find((category) => category.group === 'needs');
  const wants = result.categories.find((category) => category.group === 'wants');
  assert.equal(result.monthly_income, 10000000);
  assert.equal(needs.recommended_limit, 4000000);
  assert.equal(wants.recommended_limit, 3000000);
  assert.ok(result.estimated_remaining >= 3000000);
});

test('50-30-20 phân bổ đúng trần nhóm theo tỷ trọng lịch sử', () => {
  const result = recommendCategoryBudgets(history, { strategy: '50_30_20', bufferRate: 0 });
  assert.equal(result.strategy, '50-30-20');
  assert.equal(result.categories.find((category) => category.group === 'needs').recommended_limit, 5000000);
  assert.equal(result.categories.find((category) => category.group === 'wants').recommended_limit, 3000000);
  assert.equal(result.framework.savings_target, 2000000);
});

test('thiếu thu nhập thì tự hạ về category_average', () => {
  const result = recommendCategoryBudgets([
    { period: '2026-06', type: 'expense', category_id: 1, category_name: 'Ăn uống', total: 1000000 },
  ], { strategy: 'hybrid', bufferRate: 0 });
  assert.equal(result.strategy, 'category_average');
  assert.equal(result.categories[0].recommended_limit, 1000000);
  assert.ok(result.warnings.some((warning) => warning.includes('thu nhập')));
});

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canonicalizeDescription,
  discoverCategorySuggestions,
  buildRetagPlan,
} = require('../services/feedback/categoryDiscovery');

const otherTransactions = [
  { id: 1, description: 'Pet Mart 250k', amount: 250000, type: 'expense', transaction_date: '2026-05-01' },
  { id: 2, description: 'Pet Mart', amount: 300000, type: 'expense', transaction_date: '2026-06-02' },
  { id: 3, description: 'Pet mart!', amount: 200000, type: 'expense', transaction_date: '2026-07-03' },
  { id: 4, description: 'giao dịch', amount: 100000, type: 'expense', transaction_date: '2026-07-04' },
];

test('chuẩn hóa mô tả loại số tiền nhưng giữ dấu hiệu phân cụm', () => {
  assert.equal(canonicalizeDescription(' Pet Mart 250k! '), 'pet mart');
});

test('phát hiện nhóm lặp lại trong Khác và tạo bằng chứng re-tag', () => {
  const suggestions = discoverCategorySuggestions(
    otherTransactions,
    [{ id: 99, name: 'Khác', type: 'expense' }],
    { minimumOccurrences: 3 }
  );
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].suggested_name, 'Pet Mart');
  assert.deepEqual(suggestions[0].transaction_ids, [1, 2, 3]);
  assert.equal(suggestions[0].observed_months, 3);
  assert.equal(suggestions[0].total_amount, 750000);
});

test('không đề xuất tên đã gần khớp danh mục hiện hữu', () => {
  const suggestions = discoverCategorySuggestions(
    otherTransactions,
    [
      { id: 9, name: 'Pet Mart', type: 'expense' },
      { id: 99, name: 'Khác', type: 'expense' },
    ],
    { minimumOccurrences: 3 }
  );
  assert.deepEqual(suggestions, []);
});

test('kế hoạch re-tag luôn yêu cầu xác nhận và loại id trùng', () => {
  const plan = buildRetagPlan(
    { suggested_name: 'Thú cưng', transaction_ids: [3, 2, 2, 1], type: 'expense' },
    { planId: 'plan-1', userId: 'u1', now: '2026-07-10T00:00:00.000Z', ttlSeconds: 600 }
  );
  assert.equal(plan.status, 'awaiting_confirmation');
  assert.equal(plan.requires_confirmation, true);
  assert.deepEqual(plan.transaction_ids, [3, 2, 1]);
  assert.equal(plan.operations[0].action, 'create_or_reuse_category');
  assert.equal(plan.expires_at, '2026-07-10T00:10:00.000Z');
});

test('kế hoạch từ chối tên Khác/generic', () => {
  assert.throws(
    () => buildRetagPlan({ suggested_name: 'Khác', transaction_ids: [1] }),
    /không đủ cụ thể/
  );
});


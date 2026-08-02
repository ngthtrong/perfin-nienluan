const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeForMatch,
  levenshteinDistance,
  textSimilarity,
} = require('../services/feedback/textSimilarity');
const {
  findSafeCategoryMatch,
  inferCategoryFromText,
} = require('../services/feedback/categoryMatcher');
const {
  lookupCategoryCorrection,
  rankFewShotExamples,
  formatFewShotExamples,
} = require('../services/feedback/correction.service');
const { parseLocalTransaction } = require('../services/parser.service');

const categories = [
  { id: 1, name: 'Ăn uống', type: 'expense' },
  { id: 2, name: 'Hóa đơn & Dịch vụ', type: 'expense' },
  { id: 3, name: 'Điện tử', type: 'expense' },
  { id: 99, name: 'Khác', type: 'expense' },
];
const aliases = {
  'Ăn uống': ['đồ ăn', 'cà phê'],
  'Hóa đơn & Dịch vụ': ['điện thoại'],
  'Điện tử': ['điện thoại'],
};

function classificationLog(originalText, correctedName, aiName = 'Khác', createdAt = '2026-07-01', type = null) {
  return {
    feedback_type: 'classification',
    original_text: originalText,
    ai_result: { category_name: aiName, type },
    corrected_result: { category_name: correctedName, type },
    created_at: createdAt,
  };
}

test('chuẩn hóa tiếng Việt và tính độ tương đồng ổn định', () => {
  assert.equal(normalizeForMatch('  Điện-thoại! '), 'dien thoai');
  assert.equal(levenshteinDistance('an uog', 'an uong'), 1);
  assert.ok(textSimilarity('ăn uốg', 'Ăn uống') > 0.82);
});

test('matcher nhận typo rõ ràng nhưng từ chối alias mơ hồ', () => {
  const fuzzy = findSafeCategoryMatch('ăn uốg', categories, { type: 'expense', aliases });
  assert.equal(fuzzy.category.id, 1);
  assert.equal(fuzzy.matchKind, 'fuzzy');

  const ambiguous = findSafeCategoryMatch('điện thoại', categories, { type: 'expense', aliases });
  assert.equal(ambiguous.category.id, 99);
  assert.equal(ambiguous.reason, 'ambiguous_alias');
});

test('dò alias theo ranh giới từ, không nhận nhầm chuỗi con ngắn', () => {
  const result = inferCategoryFromText('mua quần áo', { 'Ăn uống': ['an'] });
  assert.equal(result.categoryName, 'Khác');
  assert.equal(result.matchKind, 'fallback');
});

test('parser hạ độ tin cậy khi nội dung khớp hai danh mục', () => {
  const parsed = parseLocalTransaction('mua điện thoại 2tr', categories);
  assert.equal(parsed.transaction.category_name, 'Khác');
  assert.equal(parsed.transaction.category_confidence, 0);
  assert.equal(parsed.transaction.category_match_kind, 'ambiguous_alias');
});

test('lookup dùng correction chính xác và từ chối lịch sử xung đột', () => {
  const exact = lookupCategoryCorrection([
    classificationLog('cà phê sáng 45k', 'Ăn uống'),
  ], 'Cà phê sáng 45K');
  assert.equal(exact.category_name, 'Ăn uống');
  assert.equal(exact.match_kind, 'feedback_exact');

  const conflict = lookupCategoryCorrection([
    classificationLog('mua apple service', 'Điện tử'),
    classificationLog('mua apple service', 'Hóa đơn & Dịch vụ'),
  ], 'mua apple service');
  assert.equal(conflict, null);

  const majorityConflict = lookupCategoryCorrection([
    classificationLog('mua apple service', 'Điện tử'),
    classificationLog('mua apple service', 'Điện tử'),
    classificationLog('mua apple service', 'Hóa đơn & Dịch vụ'),
  ], 'mua apple service');
  assert.equal(majorityConflict, null);
});

test('lookup correction giữ đúng loại giao dịch khi lịch sử có cùng câu chữ', () => {
  const logs = [
    classificationLog('tiền thưởng', 'Thưởng', 'Khác', '2026-07-02', 'income'),
    classificationLog('tiền thưởng', 'Mua sắm', 'Khác', '2026-07-01', 'expense'),
  ];
  const income = lookupCategoryCorrection(logs, 'tiền thưởng', { type: 'income' });
  const expense = lookupCategoryCorrection(logs, 'tiền thưởng', { type: 'expense' });
  assert.equal(income.category_name, 'Thưởng');
  assert.equal(expense.category_name, 'Mua sắm');

  const legacyUntyped = lookupCategoryCorrection([
    classificationLog('tiền thưởng', 'Mua sắm'),
  ], 'tiền thưởng', { type: 'income' });
  assert.equal(legacyUntyped, null);
});

test('few-shot chỉ lấy correction hữu ích và xếp ví dụ gần nhất trước', () => {
  const logs = [
    classificationLog('cà phê sáng 40k', 'Ăn uống', 'Khác', '2026-07-01', 'expense'),
    classificationLog('đóng tiền điện thoại', 'Hóa đơn & Dịch vụ', 'Khác', '2026-07-01', 'expense'),
    classificationLog('cà phê sáng 40k', 'Khác', 'Khác', '2026-07-01', 'expense'),
  ];
  const ranked = rankFewShotExamples(logs, 'cà phê sáng 45k', { minimumScore: 0.2, limit: 2 });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].corrected_category.category_name, 'Ăn uống');
  assert.deepEqual(formatFewShotExamples(ranked)[0], {
    user_input: 'cà phê sáng 40k',
    incorrect_category: 'Khác',
    correct_category: 'Ăn uống',
    transaction_type: 'expense',
  });
});

test('name-only và id+name cùng nhãn không tạo xung đột giả', () => {
  const logs = [
    classificationLog('cà phê công ty', 'Ăn uống', 'Khác', '2026-07-01', 'expense'),
    {
      ...classificationLog('cà phê công ty', 'Ăn uống', 'Khác', '2026-07-02', 'expense'),
      corrected_result: { category_id: 1, category_name: 'Ăn uống', type: 'expense' },
    },
  ];
  const correction = lookupCategoryCorrection(logs, 'cà phê công ty', { type: 'expense' });
  assert.equal(correction.category_name, 'Ăn uống');
  assert.equal(correction.support, 2);
});

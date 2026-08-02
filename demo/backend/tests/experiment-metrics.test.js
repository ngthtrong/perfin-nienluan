const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classificationReport,
  confusionToMarkdown,
  correctionEffectReport,
  jointCategoryLabel,
  predictionCoverageReport,
} = require('./experiments/lib/metrics');
const { splitByGroup } = require('./experiments/lib/groupSplit');
const {
  buildLog,
  correctionGroupKey,
  isCategoryCorrectionEligible,
} = require('./experiments/feedback-before-after');

test('classification metrics tính đúng accuracy, macro-F1 và weighted-F1', () => {
  const report = classificationReport([
    { gold: 'A', pred: 'A' },
    { gold: 'A', pred: 'B' },
    { gold: 'B', pred: 'B' },
    { gold: 'C', pred: 'B' },
  ]);

  assert.equal(report.total, 4);
  assert.equal(report.accuracy, 0.5);
  assert.equal(report.macroF1, 0.3889);
  assert.equal(report.weightedF1, 0.4583);
  assert.equal(report.classesWithSupport, 3);
});

test('coverage giữ toàn bộ mẫu số và tính abstention là dự đoán sai', () => {
  const report = predictionCoverageReport([
    { gold: 'A', pred: 'A' },
    { gold: 'B', pred: null },
    { gold: 'B', pred: 'B' },
    { gold: 'C', pred: '' },
  ]);

  assert.deepEqual(
    { total: report.total, answered: report.answered, abstained: report.abstained, coverage: report.coverage },
    { total: 4, answered: 2, abstained: 2, coverage: 0.5 }
  );
  assert.equal(report.full.accuracy, 0.5);
  assert.equal(report.conditional.accuracy, 1);
  assert.equal(report.full.perClass.B.recall, 0.5);
});

test('joint label phân biệt danh mục cùng tên ở hai loại giao dịch', () => {
  assert.notEqual(
    jointCategoryLabel('income', 'Khác'),
    jointCategoryLabel('expense', 'Khác')
  );
});

test('confusion markdown không làm mất cột dự đoán chỉ xuất hiện ở phía pred', () => {
  const markdown = confusionToMarkdown(classificationReport([
    { gold: 'A', pred: 'PRED_ONLY' },
  ]));

  assert.match(markdown, /PRED_ONLY/);
  assert.match(markdown, /\| A \| 0 \| 1 \|/);
});

test('correction effect báo riêng exact/fuzzy, helped/harmed và net', () => {
  const report = correctionEffectReport([
    { gold: 'A', beforePred: 'B', afterPred: 'A', matchKind: 'feedback_exact' },
    { gold: 'B', beforePred: 'B', afterPred: 'C', matchKind: 'feedback_fuzzy' },
    { gold: 'C', beforePred: 'A', afterPred: 'C', matchKind: 'feedback_fuzzy' },
    { gold: 'D', beforePred: 'D', afterPred: 'D', matchKind: null },
  ]);

  assert.equal(report.applied_count, 3);
  assert.equal(report.coverage, 0.75);
  assert.equal(report.helped_count, 2);
  assert.equal(report.harmed_count, 1);
  assert.equal(report.net_count, 1);
  assert.equal(report.net_accuracy_delta, 0.25);
  assert.deepEqual(report.by_match_kind.feedback_exact, {
    applied_count: 1,
    helped_count: 1,
    harmed_count: 0,
    net_count: 1,
    coverage: 0.25,
  });
  assert.deepEqual(report.by_match_kind.feedback_fuzzy, {
    applied_count: 2,
    helped_count: 1,
    harmed_count: 1,
    net_count: 0,
    coverage: 0.5,
  });
});

test('group split không xé nhóm và tái lập với cùng seed', () => {
  const items = [
    { id: 1, key: 'a', eligible: true },
    { id: 2, key: 'a', eligible: false },
    { id: 3, key: 'b', eligible: true },
    { id: 4, key: 'c', eligible: true },
    { id: 5, key: 'd', eligible: false },
  ];
  const options = {
    keyFn: (item) => item.key,
    seedEligibleFn: (item) => item.eligible,
    seedRatio: 0.5,
    seed: 7,
  };

  const first = splitByGroup(items, options);
  const second = splitByGroup(items, options);
  assert.deepEqual(first, second);
  assert.deepEqual(first.leakageKeys, []);
  assert.deepEqual(
    first.seedItems.map((item) => item.id),
    items.filter((item) => first.seedKeys.includes(item.key)).map((item) => item.id)
  );
  assert.equal(first.seedEligibleCount + first.evaluationEligibleCount, first.eligibleTotal);
});

test('group split xử lý đúng hai biên seed ratio', () => {
  const items = [{ key: 'a' }, { key: 'a' }, { key: 'b' }];
  const base = { keyFn: (item) => item.key };

  assert.equal(splitByGroup(items, { ...base, seedRatio: 0 }).seedItems.length, 0);
  assert.equal(splitByGroup(items, { ...base, seedRatio: 1 }).evaluationItems.length, 0);
  assert.throws(() => splitByGroup(items, { ...base, seedRatio: 1.1 }), RangeError);
});

test('correction experiment dùng parser type và loại ca cần sửa transaction type', () => {
  const sample = {
    text: 'tiền chạy shopee',
    type: 'income',
    parserType: 'expense',
    parserPred: 'Di chuyển',
    goldCategory: 'Lương',
  };

  assert.equal(isCategoryCorrectionEligible(sample), false);
  assert.match(correctionGroupKey(sample), /^expense\u0000/);
  const log = buildLog(sample, sample.parserPred, 0);
  assert.equal(log.ai_result.transaction.type, 'expense');
  assert.equal(log.corrected_result.transaction.type, 'expense');
});

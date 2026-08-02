/**
 * metrics.js — Chỉ số phân loại đa lớp: precision/recall/F1 từng lớp,
 * macro-F1, micro-accuracy và ma trận nhầm lẫn. Không phụ thuộc thư viện ngoài
 * để thí nghiệm chạy được với mọi cài đặt Node.
 */

/**
 * Tính chỉ số từ danh sách cặp {gold, pred}. label là chuỗi tên danh mục.
 * Trả về per-class {support, tp, fp, fn, precision, recall, f1}, macroF1,
 * weightedF1, accuracy và confusion matrix.
 */
function classificationReport(pairs) {
  const labels = [...new Set(pairs.flatMap((p) => [p.gold, p.pred]))].sort((a, b) => a.localeCompare(b, 'vi'));
  const index = new Map(labels.map((label, i) => [label, i]));
  const confusion = labels.map(() => labels.map(() => 0));
  const stat = new Map(labels.map((label) => [label, { support: 0, tp: 0, fp: 0, fn: 0 }]));

  let correct = 0;
  for (const { gold, pred } of pairs) {
    confusion[index.get(gold)][index.get(pred)] += 1;
    stat.get(gold).support += 1;
    if (gold === pred) {
      correct += 1;
      stat.get(gold).tp += 1;
    } else {
      stat.get(pred).fp += 1;
      stat.get(gold).fn += 1;
    }
  }

  const perClass = {};
  let macroF1Sum = 0;
  let weightedF1Sum = 0;
  let classesWithSupport = 0;
  for (const label of labels) {
    const { support, tp, fp, fn } = stat.get(label);
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    perClass[label] = {
      support,
      tp,
      fp,
      fn,
      precision: round(precision),
      recall: round(recall),
      f1: round(f1),
    };
    // macro-F1 chỉ trung bình trên các lớp thực sự xuất hiện trong gold, để
    // một lớp không có mẫu nào không kéo điểm xuống một cách giả tạo.
    if (support > 0) {
      macroF1Sum += f1;
      weightedF1Sum += f1 * support;
      classesWithSupport += 1;
    }
  }

  const total = pairs.length;
  return {
    total,
    accuracy: round(total === 0 ? 0 : correct / total),
    macroF1: round(classesWithSupport === 0 ? 0 : macroF1Sum / classesWithSupport),
    weightedF1: round(total === 0 ? 0 : weightedF1Sum / total),
    classesWithSupport,
    labels,
    perClass,
    confusion,
  };
}

const ABSTENTION_LABEL = '__ABSTAIN__';

/**
 * Nhãn chính của bài toán phân loại giao dịch phải bao gồm cả chiều thu/chi.
 * Hai danh mục đồng tên (đặc biệt "Khác") vì vậy không còn bị gộp làm một.
 */
function jointCategoryLabel(type, categoryName) {
  const safeType = String(type || 'unknown').trim() || 'unknown';
  const safeCategory = String(categoryName || 'unknown').trim() || 'unknown';
  return `${safeType}/${safeCategory}`;
}

function hasPrediction(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

/**
 * Đánh giá một nhánh dự đoán có thể abstain (pred=null).
 *
 * - `full` luôn dùng toàn bộ mẫu; abstention được ánh xạ thành một nhãn dự đoán
 *   riêng nên chắc chắn bị tính sai.
 * - `conditional` chỉ mô tả chất lượng trên các mẫu mà nhánh đã trả lời.
 * - `coverage` cho biết tỷ lệ mẫu có dự đoán, tránh nhầm conditional accuracy
 *   với accuracy trên toàn bộ tập đánh giá.
 */
function predictionCoverageReport(records, { abstentionLabel = ABSTENTION_LABEL } = {}) {
  const answeredRecords = records.filter((record) => hasPrediction(record.pred));
  const fullPairs = records.map((record) => ({
    gold: record.gold,
    pred: hasPrediction(record.pred) ? record.pred : abstentionLabel,
  }));
  const conditionalPairs = answeredRecords.map((record) => ({ gold: record.gold, pred: record.pred }));
  const total = records.length;
  const answered = answeredRecords.length;

  return {
    total,
    answered,
    abstained: total - answered,
    coverage: round(total === 0 ? 0 : answered / total),
    full: classificationReport(fullPairs),
    conditional: classificationReport(conditionalPairs),
  };
}

/**
 * Tổng hợp tác động của correction trên một tập gồm cả ca parser sai và nhóm
 * chứng parser đúng. Mỗi record có beforePred, afterPred, gold và matchKind.
 */
function correctionEffectReport(records) {
  const before = classificationReport(records.map((record) => ({ gold: record.gold, pred: record.beforePred })));
  const after = classificationReport(records.map((record) => ({ gold: record.gold, pred: record.afterPred })));
  const kinds = ['feedback_exact', 'feedback_fuzzy'];
  const byMatchKind = Object.fromEntries(kinds.map((kind) => [kind, {
    applied_count: 0,
    helped_count: 0,
    harmed_count: 0,
    net_count: 0,
  }]));

  let applied = 0;
  let helped = 0;
  let harmed = 0;
  for (const record of records) {
    const beforeRight = record.beforePred === record.gold;
    const afterRight = record.afterPred === record.gold;
    const kind = kinds.includes(record.matchKind) ? record.matchKind : null;
    if (kind) {
      applied += 1;
      byMatchKind[kind].applied_count += 1;
    }
    if (!beforeRight && afterRight) {
      helped += 1;
      if (kind) byMatchKind[kind].helped_count += 1;
    }
    if (beforeRight && !afterRight) {
      harmed += 1;
      if (kind) byMatchKind[kind].harmed_count += 1;
    }
  }
  for (const kind of kinds) {
    const item = byMatchKind[kind];
    item.net_count = item.helped_count - item.harmed_count;
    item.coverage = round(records.length === 0 ? 0 : item.applied_count / records.length);
  }

  return {
    total: records.length,
    before,
    after,
    coverage: round(records.length === 0 ? 0 : applied / records.length),
    applied_count: applied,
    helped_count: helped,
    harmed_count: harmed,
    net_count: helped - harmed,
    net_accuracy_delta: round(records.length === 0 ? 0 : (helped - harmed) / records.length),
    by_match_kind: byMatchKind,
  };
}

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

/**
 * Chuỗi hóa ma trận nhầm lẫn thành bảng Markdown gọn (rows=gold, cols=pred).
 * Chỉ giữ các lớp có support để bảng không quá rộng.
 */
function confusionToMarkdown(report) {
  const goldLabels = report.labels.filter((label) => (report.perClass[label]?.support || 0) > 0);
  // Giữ mọi cột dự đoán, kể cả nhãn không xuất hiện trong gold. Nếu bỏ các cột
  // này, tổng hàng của bảng sẽ nhỏ hơn support và che mất false positive.
  const predictedLabels = report.labels.filter((label, column) =>
    report.confusion.some((row) => row[column] > 0));
  const columns = [...new Set([...goldLabels, ...predictedLabels])];
  const activeIndex = new Map(report.labels.map((label, i) => [label, i]));
  const header = ['gold\\pred', ...columns].join(' | ');
  const sep = ['---', ...columns.map(() => '---')].join(' | ');
  const rows = goldLabels.map((goldLabel) => {
    const gi = activeIndex.get(goldLabel);
    const cells = columns.map((predLabel) => report.confusion[gi][activeIndex.get(predLabel)]);
    return [goldLabel, ...cells].join(' | ');
  });
  return [header, sep, ...rows].map((line) => `| ${line} |`).join('\n');
}

module.exports = {
  ABSTENTION_LABEL,
  classificationReport,
  confusionToMarkdown,
  correctionEffectReport,
  jointCategoryLabel,
  predictionCoverageReport,
  round,
};

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

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

/**
 * Chuỗi hóa ma trận nhầm lẫn thành bảng Markdown gọn (rows=gold, cols=pred).
 * Chỉ giữ các lớp có support để bảng không quá rộng.
 */
function confusionToMarkdown(report) {
  const active = report.labels.filter((label) => (report.perClass[label]?.support || 0) > 0);
  const activeIndex = new Map(report.labels.map((label, i) => [label, i]));
  const header = ['gold\\pred', ...active].join(' | ');
  const sep = ['---', ...active.map(() => '---')].join(' | ');
  const rows = active.map((goldLabel) => {
    const gi = activeIndex.get(goldLabel);
    const cells = active.map((predLabel) => report.confusion[gi][activeIndex.get(predLabel)]);
    return [goldLabel, ...cells].join(' | ');
  });
  return [header, sep, ...rows].map((line) => `| ${line} |`).join('\n');
}

module.exports = { classificationReport, confusionToMarkdown, round };

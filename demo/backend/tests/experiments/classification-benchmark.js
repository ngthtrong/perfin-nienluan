#!/usr/bin/env node
/**
 * classification-benchmark.js — Đo độ chính xác phân loại danh mục của local
 * parser trên tập gán nhãn độc lập (5.265 dòng dataFinance.csv), thay cho 31 ca
 * hard-coded ở quality gate. Trả về macro-F1, accuracy, per-class F1 và ma trận
 * nhầm lẫn. Chạy hoàn toàn offline, không cần PostgreSQL hay LLM.
 *
 * Cách dùng:
 *   node tests/experiments/classification-benchmark.js
 *   node tests/experiments/classification-benchmark.js --out ../../resource/report/evidence
 *
 * Ghi chú phương pháp (đưa vào báo cáo): nhãn gold do importer ánh xạ từ
 * taxonomy lịch sử (category-map.json). Một phần alias của parser trùng vùng
 * ngữ nghĩa với taxonomy đó, nên đây là đánh giá trên dữ liệu độc lập về câu
 * chữ nhưng KHÔNG hoàn toàn độc lập về lược đồ danh mục — hạn chế này được nêu
 * rõ trong báo cáo, không tuyên bố khái quát hóa vượt mức.
 */
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';

const { parseLocalTransaction } = require('../../services/parser.service');
const { loadLabeledSamples, DEFAULT_CATEGORIES } = require('./lib/dataset');
const { classificationReport, confusionToMarkdown } = require('./lib/metrics');
const { writeArtifact, runMeta, parseOutDir } = require('./lib/report');

function classifyLocal(text) {
  const result = parseLocalTransaction(text, DEFAULT_CATEGORIES);
  return result.transaction.category_name;
}

function run() {
  const outDir = parseOutDir(process.argv);
  const dataset = loadLabeledSamples();
  const { samples } = dataset;

  const pairs = [];
  const pairsNoOther = [];
  const misses = [];
  for (const sample of samples) {
    const pred = classifyLocal(sample.text);
    pairs.push({ gold: sample.goldCategory, pred });
    // Tập con loại nhãn catch-all "Khác": nhãn lịch sử phân loại theo NGUỒN
    // tiền (vd "Family"->"Khác"), còn parser phân loại theo NỘI DUNG câu; loại
    // "Khác" cho ta thước đo công bằng hơn trên các danh mục có nội dung rõ.
    if (sample.goldCategory !== 'Khác') pairsNoOther.push({ gold: sample.goldCategory, pred });
    if (pred !== sample.goldCategory) {
      misses.push({ text: sample.text, gold: sample.goldCategory, pred, legacy: sample.legacyCategory });
    }
  }

  const report = classificationReport(pairs);
  const reportNoOther = classificationReport(pairsNoOther);

  // Phần lớn lỗi rơi vào lớp "Khác": parser đoán một danh mục cụ thể trong khi
  // nhãn lịch sử là "Khác", hoặc ngược lại. Tách riêng để phân tích trong báo cáo.
  const otherConfusions = misses.filter((m) => m.gold === 'Khác' || m.pred === 'Khác').length;

  const result = {
    experiment: 'classification-benchmark',
    description: 'Độ chính xác phân loại danh mục của local parser trên tập gán nhãn dataFinance.csv',
    meta: runMeta(),
    dataset: dataset.source,
    mapping_sha256: dataset.mapping_sha256,
    method: {
      classifier: 'local parser (services/parser.service.parseLocalTransaction)',
      label_space: DEFAULT_CATEGORIES.map((c) => `${c.type}/${c.name}`),
      note: 'Nhãn gold ánh xạ từ taxonomy lịch sử; alias parser trùng một phần lược đồ nên đánh giá độc lập về câu chữ, không hoàn toàn độc lập về lược đồ danh mục.',
    },
    metrics: {
      total: report.total,
      accuracy: report.accuracy,
      macroF1: report.macroF1,
      weightedF1: report.weightedF1,
      classesWithSupport: report.classesWithSupport,
      perClass: report.perClass,
    },
    metrics_excluding_other: {
      total: reportNoOther.total,
      accuracy: reportNoOther.accuracy,
      macroF1: reportNoOther.macroF1,
      weightedF1: reportNoOther.weightedF1,
      classesWithSupport: reportNoOther.classesWithSupport,
    },
    error_analysis: {
      total_misses: misses.length,
      other_class_involved: otherConfusions,
      examples: misses.slice(0, 25),
    },
    confusion_labels: report.labels,
    confusion: report.confusion,
  };

  printSummary(result, report);
  if (outDir) {
    const paths = writeArtifact(outDir, 'classification-benchmark', result, buildMarkdown(result, report));
    console.log(`\nĐã ghi artifact:\n  ${paths.json}\n  ${paths.md}`);
  }
  return result;
}

function printSummary(result, report) {
  const m = result.metrics;
  console.log('='.repeat(64));
  console.log('  PERFIN — Classification benchmark (local parser)');
  console.log('='.repeat(64));
  console.log(`Dataset      : ${result.dataset.file} (${result.dataset.labeled_rows} dòng gán nhãn)`);
  console.log(`SHA-256      : ${result.dataset.sha256}`);
  console.log(`Accuracy     : ${(m.accuracy * 100).toFixed(2)}%`);
  console.log(`Macro-F1     : ${m.macroF1.toFixed(4)} (trên ${m.classesWithSupport} lớp có mẫu)`);
  console.log(`Weighted-F1  : ${m.weightedF1.toFixed(4)}`);
  const mo = result.metrics_excluding_other;
  console.log(`— loại "Khác": acc ${(mo.accuracy * 100).toFixed(2)}% · macro-F1 ${mo.macroF1.toFixed(4)} (${mo.total} mẫu)`);
  console.log('');
  console.log('Per-class (support | P | R | F1):');
  for (const label of report.labels) {
    const c = report.perClass[label];
    if (!c.support) continue;
    console.log(
      `  ${label.padEnd(20)} ${String(c.support).padStart(5)} | ` +
      `${c.precision.toFixed(3)} | ${c.recall.toFixed(3)} | ${c.f1.toFixed(3)}`
    );
  }
  console.log('');
  console.log(`Sai tổng cộng : ${result.error_analysis.total_misses} / ${m.total}`);
  console.log(`Liên quan "Khác": ${result.error_analysis.other_class_involved}`);
  console.log('='.repeat(64));
}

function buildMarkdown(result, report) {
  const m = result.metrics;
  const lines = [];
  lines.push(`# Thí nghiệm: Classification benchmark (local parser)`);
  lines.push('');
  lines.push(`- Ngày chạy: ${result.meta.timestamp}`);
  lines.push(`- Commit: \`${result.meta.commit}\` · Node ${result.meta.node}`);
  lines.push(`- Dataset: \`${result.dataset.file}\` — ${result.dataset.labeled_rows} dòng gán nhãn`);
  lines.push(`- SHA-256 dữ liệu: \`${result.dataset.sha256}\``);
  lines.push('');
  lines.push(`## Kết quả tổng hợp`);
  lines.push('');
  lines.push(`| Chỉ số | Giá trị |`);
  lines.push(`|---|---|`);
  lines.push(`| Accuracy (micro) | ${(m.accuracy * 100).toFixed(2)}% |`);
  lines.push(`| Macro-F1 | ${m.macroF1.toFixed(4)} |`);
  lines.push(`| Weighted-F1 | ${m.weightedF1.toFixed(4)} |`);
  lines.push(`| Số lớp có mẫu | ${m.classesWithSupport} |`);
  lines.push(`| Tổng mẫu | ${m.total} |`);
  const mo = result.metrics_excluding_other;
  lines.push(`| Accuracy (loại "Khác") | ${(mo.accuracy * 100).toFixed(2)}% |`);
  lines.push(`| Macro-F1 (loại "Khác") | ${mo.macroF1.toFixed(4)} |`);
  lines.push('');
  lines.push(`## Chỉ số theo từng danh mục`);
  lines.push('');
  lines.push(`| Danh mục | Support | Precision | Recall | F1 |`);
  lines.push(`|---|---|---|---|---|`);
  for (const label of report.labels) {
    const c = report.perClass[label];
    if (!c.support) continue;
    lines.push(`| ${label} | ${c.support} | ${c.precision.toFixed(3)} | ${c.recall.toFixed(3)} | ${c.f1.toFixed(3)} |`);
  }
  lines.push('');
  lines.push(`## Phân tích lỗi`);
  lines.push('');
  lines.push(`- Tổng số sai: ${result.error_analysis.total_misses} / ${m.total}`);
  lines.push(`- Số ca liên quan lớp "Khác": ${result.error_analysis.other_class_involved}`);
  lines.push('');
  lines.push(`Ví dụ ca sai (tối đa 25):`);
  lines.push('');
  lines.push(`| Câu | Gold | Dự đoán | Nhãn gốc |`);
  lines.push(`|---|---|---|---|`);
  for (const e of result.error_analysis.examples) {
    lines.push(`| ${escapePipe(e.text)} | ${e.gold} | ${e.pred} | ${e.legacy || '(trống)'} |`);
  }
  lines.push('');
  lines.push(`## Ma trận nhầm lẫn (hàng = gold, cột = dự đoán)`);
  lines.push('');
  lines.push(confusionToMarkdown(report));
  lines.push('');
  lines.push(`## Ghi chú phương pháp`);
  lines.push('');
  lines.push(result.method.note);
  return lines.join('\n');
}

function escapePipe(text) {
  return String(text).replace(/\|/g, '\\|');
}

run();

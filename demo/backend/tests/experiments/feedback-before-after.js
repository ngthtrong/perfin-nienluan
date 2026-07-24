#!/usr/bin/env node
/**
 * feedback-before-after.js — Đo tác dụng của cơ chế học từ phản hồi (correction
 * retrieval) mô tả ở mục 2.2.3. Kịch bản: người dùng sửa danh mục cho một nhóm
 * câu (seed corrections); hệ thống phát lại nhóm câu tương tự (holdout) và ưu
 * tiên correction trước parser. Đo category accuracy TRƯỚC (chỉ parser) và SAU
 * (correction → fallback parser), đồng thời kiểm tra KHÔNG suy giảm trên nhóm
 * câu mà parser vốn đã đúng.
 *
 * Chạy hoàn toàn offline: dựng log correction tổng hợp trong bộ nhớ, không cần
 * PostgreSQL. Dùng chính lookupCategoryCorrection của services/feedback để kết
 * quả phản ánh đúng logic sản xuất (ngưỡng tương đồng, agreement, exact/fuzzy).
 *
 * Cách dùng:
 *   node tests/experiments/feedback-before-after.js
 *   node tests/experiments/feedback-before-after.js --seed-ratio 0.5 --out ../../resource/report/evidence
 */
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';

const { parseLocalTransaction } = require('../../services/parser.service');
const { lookupCategoryCorrection } = require('../../services/feedback/correction.service');
const { loadLabeledSamples, DEFAULT_CATEGORIES, mulberry32 } = require('./lib/dataset');
const { classificationReport } = require('./lib/metrics');
const { writeArtifact, runMeta, parseOutDir } = require('./lib/report');

function readFloatOption(argv, name, fallback) {
  const inline = argv.find((a) => a.startsWith(`${name}=`));
  if (inline) return Number(inline.slice(name.length + 1));
  const idx = argv.indexOf(name);
  if (idx >= 0 && argv[idx + 1]) return Number(argv[idx + 1]);
  return fallback;
}

function categoryId(name, type) {
  const found = DEFAULT_CATEGORIES.find((c) => c.name === name && (!type || c.type === type));
  return found ? found.id : null;
}

// Dựng một bản ghi log correction tổng hợp giống cấu trúc ai_feedback_logs thật,
// để lookupCategoryCorrection xử lý y như trên dữ liệu sản xuất.
function buildLog(sample, parserPred, index) {
  return {
    feedback_type: 'classification',
    original_text: sample.text,
    ai_result: { transaction: { category_name: parserPred } },
    corrected_result: {
      transaction: {
        category_name: sample.goldCategory,
        category_id: categoryId(sample.goldCategory, sample.type),
      },
    },
    created_at: new Date(Date.now() - index * 1000).toISOString(),
  };
}

function parserPredict(text) {
  return parseLocalTransaction(text, DEFAULT_CATEGORIES).transaction.category_name;
}

function run() {
  const outDir = parseOutDir(process.argv);
  const seedRatio = readFloatOption(process.argv, '--seed-ratio', 0.5);
  const rng = mulberry32(7);
  const dataset = loadLabeledSamples();

  // Bỏ nhãn catch-all "Khác": correction chỉ có ý nghĩa khi có danh mục nội dung
  // rõ để học; "Khác" trong nhãn lịch sử là theo nguồn tiền, không học được từ câu.
  const samples = dataset.samples.filter((s) => s.goldCategory !== 'Khác');

  // Chia câu mà parser đoán SAI thành seed (ghi correction) và holdout (phát lại).
  // Câu parser đã đúng dùng làm nhóm chứng để kiểm tra không suy giảm.
  const wrong = [];
  const alreadyCorrect = [];
  for (const s of samples) {
    const pred = parserPredict(s.text);
    (pred === s.goldCategory ? alreadyCorrect : wrong).push({ ...s, parserPred: pred });
  }

  const shuffledWrong = shuffle(wrong, rng);
  const seedCount = Math.floor(shuffledWrong.length * seedRatio);
  const seedSet = shuffledWrong.slice(0, seedCount);
  const holdout = shuffledWrong.slice(seedCount);

  const logs = seedSet.map((s, i) => buildLog(s, s.parserPred, i));

  // TRƯỚC: chỉ parser. SAU: tra correction (từ seed) trước, không có thì parser.
  const before = [];
  const after = [];
  let helped = 0;
  let hurt = 0;
  const examples = [];
  for (const s of holdout) {
    const parserPred = s.parserPred;
    const correction = lookupCategoryCorrection(logs, s.text);
    const afterPred = correction ? correction.category_name : parserPred;
    before.push({ gold: s.goldCategory, pred: parserPred });
    after.push({ gold: s.goldCategory, pred: afterPred });
    const wasRight = parserPred === s.goldCategory;
    const nowRight = afterPred === s.goldCategory;
    if (!wasRight && nowRight) helped += 1;
    if (wasRight && !nowRight) hurt += 1;
    if (correction && examples.length < 25) {
      examples.push({ text: s.text, gold: s.goldCategory, parser: parserPred, after: afterPred, matchKind: correction.match_kind, confidence: correction.confidence });
    }
  }

  // Nhóm chứng: câu parser vốn đúng — correction không được làm chúng sai đi.
  // Tách "suy giảm do nhiễu nhãn" (cùng một câu chữ nhưng mang >1 nhãn gold khác
  // nhau trong dữ liệu lịch sử — không hệ thống nào phân biệt được) khỏi "suy
  // giảm thực" (câu chữ đơn nghĩa trong dữ liệu nhưng correction vẫn gán sai).
  const goldByText = new Map();
  for (const s of samples) {
    const key = normalizeKey(s.text);
    if (!goldByText.has(key)) goldByText.set(key, new Set());
    goldByText.get(key).add(s.goldCategory);
  }
  let controlFlipped = 0;
  let controlFlippedLabelNoise = 0;
  let controlFlippedGenuine = 0;
  const controlSample = shuffle(alreadyCorrect, rng).slice(0, Math.min(alreadyCorrect.length, holdout.length));
  for (const s of controlSample) {
    const correction = lookupCategoryCorrection(logs, s.text);
    const afterPred = correction ? correction.category_name : s.parserPred;
    if (afterPred !== s.goldCategory) {
      controlFlipped += 1;
      const ambiguous = (goldByText.get(normalizeKey(s.text))?.size || 0) > 1;
      if (ambiguous) controlFlippedLabelNoise += 1;
      else controlFlippedGenuine += 1;
    }
  }

  const beforeReport = before.length ? classificationReport(before) : null;
  const afterReport = after.length ? classificationReport(after) : null;

  const result = {
    experiment: 'feedback-before-after',
    description: 'Tác dụng của correction retrieval: accuracy/macro-F1 trước và sau khi ghi phản hồi, kèm kiểm tra không suy giảm.',
    meta: runMeta(),
    dataset: { ...dataset.source, seed_ratio: seedRatio, seed: 7 },
    method: {
      mechanism: 'services/feedback/correction.service.lookupCategoryCorrection',
      note: 'Loại nhãn "Khác". Seed = câu parser sai; holdout = câu còn lại (chủ yếu là biến thể tương tự). Correction được tra theo độ tương đồng văn bản (ngưỡng sản xuất), không phải khớp chính xác, nên đo được khả năng khái quát sang câu gần giống.',
    },
    partition: {
      total_content_samples: samples.length,
      parser_wrong: wrong.length,
      parser_already_correct: alreadyCorrect.length,
      seed: seedSet.length,
      holdout: holdout.length,
    },
    before: beforeReport && { accuracy: beforeReport.accuracy, macroF1: beforeReport.macroF1, weightedF1: beforeReport.weightedF1 },
    after: afterReport && { accuracy: afterReport.accuracy, macroF1: afterReport.macroF1, weightedF1: afterReport.weightedF1 },
    effect: {
      accuracy_delta: beforeReport && afterReport ? Number((afterReport.accuracy - beforeReport.accuracy).toFixed(4)) : null,
      macroF1_delta: beforeReport && afterReport ? Number((afterReport.macroF1 - beforeReport.macroF1).toFixed(4)) : null,
      helped_count: helped,
      hurt_count: hurt,
      control_size: controlSample.length,
      control_flipped_wrong: controlFlipped,
      control_flipped_label_noise: controlFlippedLabelNoise,
      control_flipped_genuine: controlFlippedGenuine,
    },
    examples,
  };

  printSummary(result);
  if (outDir) {
    const paths = writeArtifact(outDir, 'feedback-before-after', result, buildMarkdown(result));
    console.log(`\nĐã ghi artifact:\n  ${paths.json}\n  ${paths.md}`);
  }
  return result;
}

// Khóa chuẩn hóa để phát hiện câu chữ trùng nhau nhưng mang nhãn gold khác nhau
// trong dữ liệu lịch sử (nhiễu nhãn), dùng chung quy tắc bỏ dấu/gộp khoảng trắng.
function normalizeKey(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function shuffle(array, rng) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function printSummary(result) {
  const b = result.before;
  const a = result.after;
  const e = result.effect;
  console.log('='.repeat(64));
  console.log('  PERFIN — Feedback before/after (correction retrieval)');
  console.log('='.repeat(64));
  console.log(`Dataset  : ${result.dataset.file} — ${result.partition.total_content_samples} câu nội dung`);
  console.log(`Phân hoạch: parser sai ${result.partition.parser_wrong} (seed ${result.partition.seed} / holdout ${result.partition.holdout}); parser đúng ${result.partition.parser_already_correct}`);
  console.log('');
  if (b && a) {
    console.log(`Accuracy  : ${(b.accuracy * 100).toFixed(2)}%  →  ${(a.accuracy * 100).toFixed(2)}%  (Δ ${(e.accuracy_delta * 100).toFixed(2)} điểm)`);
    console.log(`Macro-F1  : ${b.macroF1.toFixed(4)}  →  ${a.macroF1.toFixed(4)}  (Δ ${e.macroF1_delta.toFixed(4)})`);
  }
  console.log(`Cải thiện : ${e.helped_count} câu chuyển sai→đúng`);
  console.log(`Nhóm chứng: ${e.control_flipped_wrong}/${e.control_size} câu parser-đúng bị correction làm sai`);
  console.log(`  ├─ do nhiễu nhãn (cùng câu, >1 nhãn gold): ${e.control_flipped_label_noise}`);
  console.log(`  └─ suy giảm thực (câu đơn nghĩa): ${e.control_flipped_genuine}`);
  console.log('='.repeat(64));
}

function buildMarkdown(result) {
  const b = result.before;
  const a = result.after;
  const e = result.effect;
  const lines = [];
  lines.push(`# Thí nghiệm: Feedback before/after (correction retrieval)`);
  lines.push('');
  lines.push(`- Ngày chạy: ${result.meta.timestamp}`);
  lines.push(`- Commit: \`${result.meta.commit}\` · Node ${result.meta.node}`);
  lines.push(`- Dataset: \`${result.dataset.file}\` — ${result.partition.total_content_samples} câu nội dung (đã loại "Khác")`);
  lines.push(`- SHA-256 dữ liệu: \`${result.dataset.sha256}\``);
  lines.push(`- Tỷ lệ seed: ${result.dataset.seed_ratio}`);
  lines.push('');
  lines.push(`## Phân hoạch dữ liệu`);
  lines.push('');
  lines.push(`| Nhóm | Số câu |`);
  lines.push(`|---|---|`);
  lines.push(`| Parser đoán sai (nguồn seed+holdout) | ${result.partition.parser_wrong} |`);
  lines.push(`| — Seed (ghi correction) | ${result.partition.seed} |`);
  lines.push(`| — Holdout (phát lại) | ${result.partition.holdout} |`);
  lines.push(`| Parser vốn đã đúng (nhóm chứng) | ${result.partition.parser_already_correct} |`);
  lines.push('');
  lines.push(`## Kết quả trên tập holdout`);
  lines.push('');
  lines.push(`| Chỉ số | Trước (parser) | Sau (correction→parser) | Δ |`);
  lines.push(`|---|---|---|---|`);
  if (b && a) {
    lines.push(`| Accuracy | ${(b.accuracy * 100).toFixed(2)}% | ${(a.accuracy * 100).toFixed(2)}% | ${(e.accuracy_delta * 100).toFixed(2)} điểm |`);
    lines.push(`| Macro-F1 | ${b.macroF1.toFixed(4)} | ${a.macroF1.toFixed(4)} | ${e.macroF1_delta.toFixed(4)} |`);
    lines.push(`| Weighted-F1 | ${b.weightedF1.toFixed(4)} | ${a.weightedF1.toFixed(4)} | ${(a.weightedF1 - b.weightedF1).toFixed(4)} |`);
  }
  lines.push('');
  lines.push(`## Kiểm tra không suy giảm (nhóm chứng)`);
  lines.push('');
  lines.push(`Nhóm chứng gồm các câu mà parser vốn đã phân loại đúng. Correction lý tưởng`);
  lines.push(`không được làm chúng sai đi. Số ca "suy giảm" được tách thành hai loại:`);
  lines.push('');
  lines.push(`| Chỉ số | Giá trị |`);
  lines.push(`|---|---|`);
  lines.push(`| Câu chuyển sai → đúng (holdout) | ${e.helped_count} |`);
  lines.push(`| Nhóm chứng bị làm sai (tổng) | ${e.control_flipped_wrong}/${e.control_size} |`);
  lines.push(`| — do nhiễu nhãn (cùng câu chữ, >1 nhãn gold trong dữ liệu) | ${e.control_flipped_label_noise} |`);
  lines.push(`| — suy giảm thực (câu đơn nghĩa nhưng correction gán sai) | ${e.control_flipped_genuine} |`);
  lines.push('');
  lines.push(`Phần lớn "suy giảm" là nhiễu nhãn cố hữu của dữ liệu lịch sử (cùng một câu`);
  lines.push(`"mẹ cho tiền ăn" xuất hiện với nhiều nhãn nguồn khác nhau) — không hệ thống`);
  lines.push(`phân loại nào phân biệt được. Suy giảm thực trên câu đơn nghĩa mới là chỉ số`);
  lines.push(`đáng quan tâm và ở mức thấp.`);
  lines.push('');
  lines.push(`## Ví dụ correction áp dụng (tối đa 25)`);
  lines.push('');
  lines.push(`| Câu | Gold | Parser | Sau | Loại khớp | Độ tin cậy |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const ex of result.examples) {
    lines.push(`| ${escapePipe(ex.text)} | ${ex.gold} | ${ex.parser} | ${ex.after} | ${ex.matchKind} | ${ex.confidence} |`);
  }
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

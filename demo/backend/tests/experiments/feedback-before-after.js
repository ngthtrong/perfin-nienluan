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
const { normalizeForMatch } = require('../../services/feedback/textSimilarity');
const { loadLabeledSamples, DEFAULT_CATEGORIES } = require('./lib/dataset');
const { correctionEffectReport } = require('./lib/metrics');
const { splitByGroup } = require('./lib/groupSplit');
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
    ai_result: {
      transaction: {
        category_name: parserPred,
        type: sample.parserType,
      },
    },
    corrected_result: {
      transaction: {
        category_name: sample.goldCategory,
        category_id: categoryId(sample.goldCategory, sample.parserType),
        type: sample.parserType,
      },
    },
    source_row: Number(sample.sourceRow || 0),
    // Mốc tổng hợp cố định để thứ tự xếp hạng không phụ thuộc giờ chạy.
    created_at: new Date(Date.UTC(2026, 0, 1) - index * 1000).toISOString(),
  };
}

function latestCorrectionCandidates(logs, limit = 200) {
  return logs
    .slice()
    .sort((left, right) => Number(right.source_row || 0) - Number(left.source_row || 0)
      || new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .slice(0, limit);
}

function parserPredict(text) {
  const transaction = parseLocalTransaction(text, DEFAULT_CATEGORIES).transaction;
  return {
    categoryName: transaction.category_name,
    type: transaction.type,
  };
}

function correctionGroupKey(sample) {
  return `${sample.parserType}\u0000${normalizeKey(sample.text)}`;
}

function isCategoryCorrectionEligible(sample) {
  return sample?.goldCategory !== 'Khác'
    && ['income', 'expense'].includes(sample?.parserType)
    && sample.parserType === sample.type;
}

function sampleAuditRecord(sample) {
  return {
    sourceRow: sample.sourceRow,
    text: sample.text,
    normalizedText: normalizeKey(sample.text),
    splitKey: correctionGroupKey(sample),
    goldType: sample.type,
    lookupType: sample.parserType,
    gold: sample.goldCategory,
    beforePred: sample.parserPred,
    beforeType: sample.parserType,
  };
}

function run() {
  const outDir = parseOutDir(process.argv);
  const seedRatio = readFloatOption(process.argv, '--seed-ratio', 0.5);
  const splitSeed = 7;
  const candidateLimit = 200;
  const dataset = loadLabeledSamples();

  // Bỏ nhãn catch-all "Khác": correction chỉ có ý nghĩa khi có danh mục nội dung
  // rõ để học; "Khác" trong nhãn lịch sử là theo nguồn tiền, không học được từ câu.
  const contentSamples = dataset.samples.filter((s) => s.goldCategory !== 'Khác');

  const preparedContent = contentSamples.map((sample) => {
    const prediction = parserPredict(sample.text);
    return {
      ...sample,
      parserPred: prediction.categoryName,
      parserType: prediction.type,
    };
  });
  // Category correction cannot change transaction type: production validates
  // the corrected category against the transaction's existing parser type.
  // Therefore evaluate category retrieval only when parser type already agrees
  // with gold type, and preserve the excluded records for auditability.
  const excludedWrongType = preparedContent.filter((sample) => !isCategoryCorrectionEligible(sample));
  const prepared = preparedContent.filter(isCategoryCorrectionEligible);
  const wrong = prepared.filter((sample) => sample.parserPred !== sample.goldCategory);
  const alreadyCorrect = prepared.filter((sample) => sample.parserPred === sample.goldCategory);

  // Phân hoạch NGUYÊN NHÓM theo chính khóa chuẩn hóa mà correction retrieval sử
  // dụng. Nếu một nhóm có ca parser sai và được chọn làm seed, mọi dòng cùng
  // khóa (kể cả parser vốn đúng) đều bị loại khỏi evaluation để tránh leakage.
  const split = splitByGroup(prepared, {
    keyFn: correctionGroupKey,
    seedEligibleFn: (sample) => sample.parserPred !== sample.goldCategory,
    seedRatio,
    seed: splitSeed,
  });
  if (split.leakageKeys.length) {
    throw new Error(`Group split bị leakage ở ${split.leakageKeys.length} khóa chuẩn hóa`);
  }
  const seedSet = split.seedItems.filter((sample) => sample.parserPred !== sample.goldCategory);
  const holdout = split.evaluationItems.filter((sample) => sample.parserPred !== sample.goldCategory);
  const controlSample = split.evaluationItems.filter((sample) => sample.parserPred === sample.goldCategory);

  const seedLogs = seedSet.map((s, i) => buildLog(s, s.parserPred, i));

  // Evaluation chính gồm cả holdout parser-sai và nhóm chứng parser-đúng. Nhờ
  // vậy helped và harmed cùng đóng góp vào một net accuracy delta có ý nghĩa.
  const evaluationSamples = [
    ...holdout.map((sample) => ({ ...sample, cohort: 'parser_wrong_holdout' })),
    ...controlSample.map((sample) => ({ ...sample, cohort: 'control_parser_correct' })),
  ].sort((left, right) => Number(left.sourceRow || 0) - Number(right.sourceRow || 0));
  const evaluationRecords = [];
  const examples = [];
  for (const sample of evaluationSamples) {
    // Production reads the newest 200 logs. Replaying in source-row order
    // prevents a correction from the future portion of this dataset leaking
    // into an earlier evaluation record.
    const pastLogs = latestCorrectionCandidates(
      seedLogs.filter((log) => log.source_row < Number(sample.sourceRow || 0)),
      candidateLimit,
    );
    const correction = lookupCategoryCorrection(pastLogs, sample.text, { type: sample.parserType });
    const afterPred = correction ? correction.category_name : sample.parserPred;
    const record = {
      sourceRow: sample.sourceRow,
      text: sample.text,
      normalizedText: normalizeKey(sample.text),
      splitKey: correctionGroupKey(sample),
      cohort: sample.cohort,
      goldType: sample.type,
      gold: sample.goldCategory,
      beforeType: sample.parserType,
      beforePred: sample.parserPred,
      afterPred,
      matchKind: correction ? correction.match_kind : null,
      confidence: correction ? correction.confidence : null,
      correctionType: correction ? correction.type : null,
      candidate_limit: candidateLimit,
      candidate_count: pastLogs.length,
    };
    evaluationRecords.push(record);
    if (correction && examples.length < 25) {
      examples.push({
        text: sample.text,
        cohort: sample.cohort,
        gold: sample.goldCategory,
        parser: sample.parserPred,
        after: afterPred,
        matchKind: correction.match_kind,
        confidence: correction.confidence,
      });
    }
  }

  // Nhóm chứng: câu parser vốn đúng — correction không được làm chúng sai đi.
  // Tách "suy giảm do nhiễu nhãn" (cùng một câu chữ nhưng mang >1 nhãn gold khác
  // nhau trong dữ liệu lịch sử — không hệ thống nào phân biệt được) khỏi "suy
  // giảm thực" (câu chữ đơn nghĩa trong dữ liệu nhưng correction vẫn gán sai).
  const goldByGroup = new Map();
  for (const sample of prepared) {
    const key = correctionGroupKey(sample);
    if (!goldByGroup.has(key)) goldByGroup.set(key, new Set());
    goldByGroup.get(key).add(sample.goldCategory);
  }
  let controlFlipped = 0;
  let controlFlippedLabelNoise = 0;
  let controlFlippedGenuine = 0;
  for (const record of evaluationRecords.filter((item) => item.cohort === 'control_parser_correct')) {
    if (record.afterPred !== record.gold) {
      controlFlipped += 1;
      const ambiguous = (goldByGroup.get(record.splitKey)?.size || 0) > 1;
      if (ambiguous) controlFlippedLabelNoise += 1;
      else controlFlippedGenuine += 1;
    }
  }

  const evaluationEffect = correctionEffectReport(evaluationRecords);
  const holdoutEffect = correctionEffectReport(evaluationRecords.filter((item) => item.cohort === 'parser_wrong_holdout'));
  const controlEffect = correctionEffectReport(evaluationRecords.filter((item) => item.cohort === 'control_parser_correct'));
  const beforeReport = evaluationEffect.before;
  const afterReport = evaluationEffect.after;
  const compactReport = (report) => ({
    total: report.total,
    accuracy: report.accuracy,
    macroF1: report.macroF1,
    weightedF1: report.weightedF1,
  });

  const result = {
    experiment: 'feedback-before-after',
    description: 'Tác dụng của category-correction retrieval khi parser đã dự đoán đúng transaction type: accuracy/macro-F1 trước và sau, kèm kiểm tra không suy giảm.',
    meta: runMeta({
      executionMode: 'offline',
      aiProvider: 'none',
      geminiModel: null,
      providerCalls: 0,
      codeFiles: [
        __filename,
        require.resolve('../../services/parser.service'),
        require.resolve('../../services/feedback/correction.service'),
        require.resolve('../../services/feedback/textSimilarity'),
        require.resolve('./lib/dataset'),
        require.resolve('./lib/groupSplit'),
        require.resolve('./lib/metrics'),
      ],
    }),
    dataset: { ...dataset.source, seed_ratio: seedRatio, seed: splitSeed },
    mapping: dataset.mapping,
    method: {
      mechanism: 'services/feedback/correction.service.lookupCategoryCorrection',
      eligibility: 'gold category is not Other and parser transaction type equals gold transaction type',
      lookup_type: 'parser-predicted transaction type, matching production',
      split_unit: 'parser transaction type + normalizeForMatch(original_text) group',
      evaluation: 'parser-wrong holdout + every eligible parser-correct control outside seed groups',
      replay_order: 'source_row ascending proxy (dataset does not expose a transaction timestamp to this runner)',
      candidate_limit: candidateLimit,
      note: 'Loại nhãn "Khác" và các dòng parser đoán sai transaction type vì category correction không thể sửa type. Mọi dòng đủ điều kiện có cùng parser type và mô tả chuẩn hóa nằm hoàn toàn trong seed hoặc evaluation; exact match hợp lệ giữa hai phía vì vậy phải bằng 0. Mỗi record chỉ nhìn correction thuộc phần quá khứ và tối đa 200 candidate mới nhất, tương ứng giới hạn production. Kết quả chính đo category trên hợp của holdout parser-sai và nhóm chứng parser-đúng, đồng thời báo riêng exact/fuzzy, helped, harmed và net.',
    },
    partition: {
      total_dataset_samples: dataset.samples.length,
      total_content_samples: contentSamples.length,
      eligible_same_type_samples: prepared.length,
      wrong_type_excluded: excludedWrongType.length,
      parser_wrong: wrong.length,
      parser_already_correct: alreadyCorrect.length,
      seed: seedSet.length,
      holdout: holdout.length,
      control: controlSample.length,
      evaluation: evaluationRecords.length,
      seed_groups: split.seedKeys.length,
      evaluation_groups: split.evaluationKeys.length,
      target_seed_wrong: split.targetEligibleCount,
      retrieval_key_overlap: split.leakageKeys.length,
      normalized_group_overlap: split.leakageKeys.length,
      seed_group_non_corrections: split.seedItems.length - seedSet.length,
    },
    before: compactReport(beforeReport),
    after: compactReport(afterReport),
    cohorts: {
      parser_wrong_holdout: {
        before: compactReport(holdoutEffect.before),
        after: compactReport(holdoutEffect.after),
        coverage: holdoutEffect.coverage,
        applied_count: holdoutEffect.applied_count,
        helped_count: holdoutEffect.helped_count,
        harmed_count: holdoutEffect.harmed_count,
        net_count: holdoutEffect.net_count,
      },
      control_parser_correct: {
        before: compactReport(controlEffect.before),
        after: compactReport(controlEffect.after),
        coverage: controlEffect.coverage,
        applied_count: controlEffect.applied_count,
        helped_count: controlEffect.helped_count,
        harmed_count: controlEffect.harmed_count,
        net_count: controlEffect.net_count,
      },
    },
    effect: {
      // Dùng trực tiếp chuyển trạng thái trên cùng từng record để tránh sai khác
      // một đơn vị làm tròn khi lấy hai accuracy đã làm tròn trừ nhau.
      accuracy_delta: evaluationEffect.net_accuracy_delta,
      macroF1_delta: Number((afterReport.macroF1 - beforeReport.macroF1).toFixed(4)),
      coverage: evaluationEffect.coverage,
      applied_count: evaluationEffect.applied_count,
      helped_count: evaluationEffect.helped_count,
      harmed_count: evaluationEffect.harmed_count,
      hurt_count: evaluationEffect.harmed_count,
      net_count: evaluationEffect.net_count,
      net_accuracy_delta: evaluationEffect.net_accuracy_delta,
      by_match_kind: evaluationEffect.by_match_kind,
      control_size: controlSample.length,
      control_flipped_wrong: controlFlipped,
      control_flipped_label_noise: controlFlippedLabelNoise,
      control_flipped_genuine: controlFlippedGenuine,
    },
    examples,
    seed_records: seedSet.map(sampleAuditRecord),
    seed_group_excluded_records: split.seedItems
      .filter((sample) => sample.parserPred === sample.goldCategory)
      .map(sampleAuditRecord),
    wrong_type_excluded_records: excludedWrongType.map(sampleAuditRecord),
    evaluation_records: evaluationRecords,
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
  return normalizeForMatch(text);
}

function printSummary(result) {
  const b = result.before;
  const a = result.after;
  const e = result.effect;
  console.log('='.repeat(64));
  console.log('  PERFIN — Feedback before/after (correction retrieval)');
  console.log('='.repeat(64));
  console.log(`Dataset  : ${result.dataset.file} — ${result.partition.total_content_samples} câu nội dung`);
  console.log(`Đủ điều kiện category correction: ${result.partition.eligible_same_type_samples}; loại ${result.partition.wrong_type_excluded} ca sai transaction type`);
  console.log(`Phân hoạch theo nhóm: seed ${result.partition.seed_groups} nhóm / evaluation ${result.partition.evaluation_groups} nhóm; overlap ${result.partition.normalized_group_overlap}`);
  console.log(`Evaluation: ${result.partition.holdout} parser-sai holdout + ${result.partition.control} control = ${result.partition.evaluation} câu`);
  console.log('');
  console.log(`Accuracy  : ${(b.accuracy * 100).toFixed(2)}%  →  ${(a.accuracy * 100).toFixed(2)}%  (Δ ${(e.accuracy_delta * 100).toFixed(2)} điểm)`);
  console.log(`Macro-F1  : ${b.macroF1.toFixed(4)}  →  ${a.macroF1.toFixed(4)}  (Δ ${e.macroF1_delta.toFixed(4)})`);
  console.log(`Coverage  : ${e.applied_count}/${result.partition.evaluation} (${(e.coverage * 100).toFixed(2)}%)`);
  console.log(`  ├─ exact: ${e.by_match_kind.feedback_exact.applied_count}`);
  console.log(`  └─ fuzzy: ${e.by_match_kind.feedback_fuzzy.applied_count}`);
  console.log(`Tác động  : helped ${e.helped_count} · harmed ${e.harmed_count} · net ${e.net_count}`);
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
  lines.push(`- Commit: \`${result.meta.commit}\` · working tree dirty: ${result.meta.working_tree_dirty ? 'yes' : 'no'} · Node ${result.meta.node}`);
  lines.push(`- Dataset: \`${result.dataset.file}\` — ${result.partition.total_content_samples} câu nội dung (đã loại "Khác")`);
  lines.push(`- Category-correction eligible: ${result.partition.eligible_same_type_samples}; loại ${result.partition.wrong_type_excluded} ca parser sai transaction type`);
  lines.push(`- SHA-256 dữ liệu: \`${result.dataset.sha256}\``);
  lines.push(`- SHA-256 mapping: \`${result.mapping.sha256}\``);
  lines.push(`- SHA-256 mã runner/runtime: \`${result.meta.code_sha256}\``);
  lines.push(`- Tỷ lệ seed: ${result.dataset.seed_ratio}`);
  lines.push('');
  lines.push(`## Phân hoạch dữ liệu`);
  lines.push('');
  lines.push(`| Nhóm | Số câu |`);
  lines.push(`|---|---|`);
  lines.push(`| Toàn bộ dataset | ${result.partition.total_dataset_samples} |`);
  lines.push(`| Nội dung sau khi loại "Khác" | ${result.partition.total_content_samples} |`);
  lines.push(`| Loại vì parser sai transaction type | ${result.partition.wrong_type_excluded} |`);
  lines.push(`| Đủ điều kiện category correction | ${result.partition.eligible_same_type_samples} |`);
  lines.push(`| Parser đoán sai (nguồn seed+holdout) | ${result.partition.parser_wrong} |`);
  lines.push(`| — Seed (ghi correction) | ${result.partition.seed} |`);
  lines.push(`| — Holdout (phát lại) | ${result.partition.holdout} |`);
  lines.push(`| Parser vốn đã đúng (toàn bộ trước split) | ${result.partition.parser_already_correct} |`);
  lines.push(`| Nhóm chứng trong evaluation | ${result.partition.control} |`);
  lines.push(`| Tổng evaluation (holdout + control) | ${result.partition.evaluation} |`);
  lines.push(`| Nhóm chuẩn hóa ở seed | ${result.partition.seed_groups} |`);
  lines.push(`| Nhóm chuẩn hóa ở evaluation | ${result.partition.evaluation_groups} |`);
  lines.push(`| Thành viên cùng nhóm seed bị loại khỏi evaluation (không ghi correction) | ${result.partition.seed_group_non_corrections} |`);
  lines.push(`| Khóa (type, mô tả chuẩn hóa) xuất hiện ở cả hai phía | **${result.partition.normalized_group_overlap}** |`);
  lines.push('');
  lines.push(`## Kết quả chính trên toàn bộ evaluation`);
  lines.push('');
  lines.push(`Evaluation là hợp của ${result.partition.holdout} ca parser-sai holdout và ${result.partition.control} ca parser-đúng làm nhóm chứng.`);
  lines.push('');
  lines.push(`| Chỉ số | Trước (parser) | Sau (correction→parser) | Δ |`);
  lines.push(`|---|---|---|---|`);
  lines.push(`| Accuracy | ${(b.accuracy * 100).toFixed(2)}% | ${(a.accuracy * 100).toFixed(2)}% | ${(e.accuracy_delta * 100).toFixed(2)} điểm |`);
  lines.push(`| Macro-F1 | ${b.macroF1.toFixed(4)} | ${a.macroF1.toFixed(4)} | ${e.macroF1_delta.toFixed(4)} |`);
  lines.push(`| Weighted-F1 | ${b.weightedF1.toFixed(4)} | ${a.weightedF1.toFixed(4)} | ${(a.weightedF1 - b.weightedF1).toFixed(4)} |`);
  lines.push('');
  lines.push(`## Coverage và tác động theo loại truy hồi`);
  lines.push('');
  lines.push(`| Loại | Applied | Coverage | Helped | Harmed | Net |`);
  lines.push(`|---|---|---|---|---|---|`);
  lines.push(`| Tất cả correction | ${e.applied_count} | ${(e.coverage * 100).toFixed(2)}% | ${e.helped_count} | ${e.harmed_count} | ${e.net_count} |`);
  for (const [kind, values] of Object.entries(e.by_match_kind)) {
    lines.push(`| ${kind} | ${values.applied_count} | ${(values.coverage * 100).toFixed(2)}% | ${values.helped_count} | ${values.harmed_count} | ${values.net_count} |`);
  }
  lines.push('');
  lines.push(`Net accuracy delta kiểm tra chéo từ chuyển trạng thái: ${e.net_count}/${result.partition.evaluation} = ${(e.net_accuracy_delta * 100).toFixed(2)} điểm phần trăm.`);
  lines.push('');
  lines.push(`## Kết quả theo cohort`);
  lines.push('');
  lines.push(`| Cohort | N | Accuracy trước | Accuracy sau | Coverage | Helped | Harmed | Net |`);
  lines.push(`|---|---|---|---|---|---|---|---|`);
  for (const [name, cohort] of Object.entries(result.cohorts)) {
    lines.push(`| ${name} | ${cohort.before.total} | ${(cohort.before.accuracy * 100).toFixed(2)}% | ${(cohort.after.accuracy * 100).toFixed(2)}% | ${(cohort.coverage * 100).toFixed(2)}% | ${cohort.helped_count} | ${cohort.harmed_count} | ${cohort.net_count} |`);
  }
  lines.push('');
  lines.push(`## Kiểm tra không suy giảm (nhóm chứng)`);
  lines.push('');
  lines.push(`Nhóm chứng gồm các câu mà parser vốn đã phân loại đúng. Correction lý tưởng`);
  lines.push(`không được làm chúng sai đi. Số ca "suy giảm" được tách thành hai loại:`);
  lines.push('');
  lines.push(`| Chỉ số | Giá trị |`);
  lines.push(`|---|---|`);
  lines.push(`| Câu chuyển sai → đúng (toàn evaluation) | ${e.helped_count} |`);
  lines.push(`| Câu chuyển đúng → sai (toàn evaluation) | ${e.harmed_count} |`);
  lines.push(`| Nhóm chứng bị làm sai (tổng) | ${e.control_flipped_wrong}/${e.control_size} |`);
  lines.push(`| — do nhiễu nhãn (cùng câu chữ, >1 nhãn gold trong dữ liệu) | ${e.control_flipped_label_noise} |`);
  lines.push(`| — suy giảm thực (câu đơn nghĩa nhưng correction gán sai) | ${e.control_flipped_genuine} |`);
  lines.push('');
  lines.push(`## Ví dụ correction áp dụng (tối đa 25)`);
  lines.push('');
  lines.push(`| Câu | Cohort | Gold | Parser | Sau | Loại khớp | Độ tin cậy |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  for (const ex of result.examples) {
    lines.push(`| ${escapePipe(ex.text)} | ${ex.cohort} | ${ex.gold} | ${ex.parser} | ${ex.after} | ${ex.matchKind} | ${ex.confidence} |`);
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

if (require.main === module) run();

module.exports = {
  buildLog,
  buildMarkdown,
  correctionGroupKey,
  isCategoryCorrectionEligible,
  normalizeKey,
  parserPredict,
  run,
};

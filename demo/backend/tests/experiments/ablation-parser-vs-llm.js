#!/usr/bin/env node
/**
 * ablation-parser-vs-llm.js — So sánh local parser (xác định) với LLM (Gemini)
 * trên cùng một tập câu gán nhãn, để định lượng lợi ích của lớp LLM cho bài toán
 * trích xuất/phân loại giao dịch. Đo: category F1/accuracy, clarification rate,
 * độ trễ trung vị và số lần gọi API.
 *
 * Cách dùng:
 *   AI_PROVIDER=gemini node tests/experiments/ablation-parser-vs-llm.js
 *   node tests/experiments/ablation-parser-vs-llm.js --per-class 25 --out ../../resource/report/evidence
 *
 * Suy giảm nhẹ nhàng: nếu không có GEMINI_API_KEY, nhánh LLM được đánh dấu
 * "design-only". Nếu đã bắt đầu gọi nhưng không hoàn tất, mọi mẫu vẫn ở trong
 * mẫu số và trạng thái là "incomplete", không được diễn giải như phép đo đầy đủ.
 */
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';
// Tắt Redis cache trong thí nghiệm để mỗi câu là một lần gọi provider độc lập.
process.env.REDIS_ENABLED = process.env.REDIS_ENABLED || 'false';
// Nạp cấu hình provider (.env của backend) như index.js để nhánh LLM thấy khóa.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { parseLocalTransaction } = require('../../services/parser.service');
const { loadLabeledSamples, stratifiedSample, DEFAULT_CATEGORIES } = require('./lib/dataset');
const { jointCategoryLabel, predictionCoverageReport } = require('./lib/metrics');
const { writeArtifact, runMeta, parseOutDir } = require('./lib/report');

function readIntOption(argv, name, fallback) {
  const inline = argv.find((a) => a.startsWith(`${name}=`));
  if (inline) return Number(inline.slice(name.length + 1));
  const idx = argv.indexOf(name);
  if (idx >= 0 && argv[idx + 1]) return Number(argv[idx + 1]);
  return fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Trả về số ms cần chờ nếu lỗi là 429/RESOURCE_EXHAUSTED (đọc retryDelay nếu có),
// hoặc null nếu không phải lỗi giới hạn tốc độ (không nên thử lại).
function retryDelayMs(error) {
  const message = String(error && error.message || '');
  const is429 = message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota');
  if (!is429) return null;
  const match = message.match(/retry in ([\d.]+)s|"retryDelay":\s*"(\d+)s"/i);
  const seconds = match ? Number(match[1] || match[2]) : null;
  return seconds ? Math.ceil(seconds * 1000) + 500 : 20000;
}

function median(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function summarizeArm(records) {
  const evaluation = predictionCoverageReport(records);
  const categoryOnly = predictionCoverageReport(records.map((record) => ({
    ...record,
    gold: record.goldCategory,
    pred: record.predCategory,
  })));
  const clarifications = records.filter((r) => r.needsClarification).length;
  const latencies = records.map((r) => r.latencyMs).filter((v) => v != null);
  return {
    n: evaluation.total,
    answered: evaluation.answered,
    abstained: evaluation.abstained,
    coverage: evaluation.coverage,
    // Các trường cấp cao là metric trên TOÀN BỘ mẫu. Null/abstention được tính sai.
    accuracy: evaluation.full.accuracy,
    macroF1: evaluation.full.macroF1,
    weightedF1: evaluation.full.weightedF1,
    conditional_metrics: {
      n: evaluation.conditional.total,
      accuracy: evaluation.conditional.accuracy,
      macroF1: evaluation.conditional.macroF1,
      weightedF1: evaluation.conditional.weightedF1,
    },
    category_only_metrics: {
      accuracy: categoryOnly.full.accuracy,
      macroF1: categoryOnly.full.macroF1,
      weightedF1: categoryOnly.full.weightedF1,
      coverage: categoryOnly.coverage,
      conditional_accuracy: categoryOnly.conditional.accuracy,
      conditional_macroF1: categoryOnly.conditional.macroF1,
    },
    clarification_rate: records.length ? Number((clarifications / records.length).toFixed(4)) : 0,
    latency_ms_median: median(latencies),
    api_calls: records.reduce((sum, r) => sum + Number(r.apiCalls || (r.apiCall ? 1 : 0)), 0),
    errors: records.filter((r) => r.error).length,
  };
}

// Chỉ lưu kết quả có cấu trúc mà parser/provider đã trả về; loại các khóa có
// khả năng chứa prompt, credential hoặc raw provider payload khỏi artifact.
function sanitizeParsedRecord(value) {
  if (Array.isArray(value)) return value.map(sanitizeParsedRecord);
  if (!value || typeof value !== 'object') return value;
  const safe = {};
  for (const [key, nested] of Object.entries(value)) {
    if (/(api.?key|authorization|credential|prompt|raw.?response|access.?token|refresh.?token|password|secret)/i.test(key)) continue;
    safe[key] = sanitizeParsedRecord(nested);
  }
  return safe;
}

async function run() {
  const outDir = parseOutDir(process.argv);
  const perClass = readIntOption(process.argv, '--per-class', 25);
  const dataset = loadLabeledSamples();
  const sample = stratifiedSample(dataset.samples, perClass);

  // Nhánh parser cục bộ: hoàn toàn xác định, không gọi mạng.
  const localRecords = sample.map((s, sampleIndex) => {
    const start = Date.now();
    const result = parseLocalTransaction(s.text, DEFAULT_CATEGORIES);
    const tx = result && result.transaction ? result.transaction : null;
    return {
      sampleIndex,
      sourceRow: s.sourceRow,
      text: s.text,
      gold: jointCategoryLabel(s.type, s.goldCategory),
      goldCategory: s.goldCategory,
      goldType: s.type,
      pred: tx ? jointCategoryLabel(tx.type || s.type, tx.category_name) : null,
      predCategory: tx ? tx.category_name : null,
      predType: tx ? tx.type : null,
      needsClarification: Boolean(result && result.needs_clarification),
      latencyMs: Date.now() - start,
      apiCall: false,
      apiCalls: 0,
      error: false,
      parsed: sanitizeParsedRecord(result),
    };
  });

  // Nhánh LLM: gọi Gemini cho từng câu, có xử lý lỗi từng ca để một lần hỏng
  // không làm sập cả thí nghiệm.
  const llm = await runLlmArm(sample);

  const result = {
    experiment: 'ablation-parser-vs-llm',
    description: 'So sánh local parser và Gemini trên cùng tập câu gán nhãn; joint type/category là metric chính và category-only là metric phụ.',
    meta: runMeta(),
    dataset: { ...dataset.source, sampled: sample.length, per_class: perClass, seed: 42 },
    llm_status: llm.status,
    llm_note: llm.note,
    arms: {
      local_parser: summarizeArm(localRecords),
      llm: llm.status === 'design-only' ? null : summarizeArm(llm.records),
    },
    records: {
      local_parser: localRecords,
      llm: llm.records,
    },
    disagreements: llm.status !== 'design-only'
      ? buildDisagreements(localRecords, llm.records).slice(0, 25)
      : [],
  };

  printSummary(result);
  if (outDir) {
    const paths = writeArtifact(outDir, 'ablation-parser-vs-llm', result, buildMarkdown(result));
    console.log(`\nĐã ghi artifact:\n  ${paths.json}\n  ${paths.md}`);
  }
  return result;
}

async function runLlmArm(sample) {
  if (!process.env.GEMINI_API_KEY || process.env.AI_PROVIDER === 'local') {
    return {
      status: 'design-only',
      note: 'Không có GEMINI_API_KEY hoặc AI_PROVIDER=local; nhánh LLM chưa đo. Báo cáo trình bày như thiết kế đích.',
      records: [],
    };
  }

  let AIService;
  try {
    AIService = require('../../services/ai.service');
  } catch (error) {
    return { status: 'design-only', note: `Không nạp được ai.service: ${error.message}`, records: [] };
  }
  if (!AIService.gemini) {
    return { status: 'design-only', note: 'AIService không khởi tạo được client Gemini.', records: [] };
  }

  // Hạn mức free-tier Gemini là 15 req/phút; giãn cách tối thiểu giữa các lần gọi
  // để thí nghiệm chạy hết mà không bị 429. Có thể chỉnh bằng --delay-ms.
  const minDelayMs = readIntOption(process.argv, '--delay-ms', 4500);
  const maxRetries = 4;

  const records = [];
  let consecutiveFailures = 0;
  for (let i = 0; i < sample.length; i += 1) {
    const s = sample[i];
    if (i > 0 && minDelayMs > 0) await sleep(minDelayMs);
    const start = Date.now();
    let parsed = null;
    let lastError = null;
    let apiCalls = 0;

    // Thử lại có tôn trọng retryDelay khi gặp 429 (hết hạn mức tức thời), để một
    // đợt giới hạn tốc độ không biến cả nhánh LLM thành "chưa đo".
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        // Gọi thẳng parseWithGemini để bỏ qua cache và local routing, bảo đảm mỗi
        // câu là một lần đo LLM thực sự.
        apiCalls += 1;
        parsed = await AIService.parseWithGemini(s.text, DEFAULT_CATEGORIES);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const wait = retryDelayMs(error);
        if (wait == null || attempt === maxRetries) break;
        console.warn(`[ablation] 429/tạm thời ở câu ${i + 1}, chờ ${Math.ceil(wait / 1000)}s rồi thử lại...`);
        await sleep(wait);
      }
    }

    if (!lastError) {
      const tx = parsed && parsed.transaction ? parsed.transaction : null;
      records.push({
        sampleIndex: i,
        sourceRow: s.sourceRow,
        text: s.text,
        gold: jointCategoryLabel(s.type, s.goldCategory),
        goldCategory: s.goldCategory,
        goldType: s.type,
        pred: tx ? jointCategoryLabel(tx.type || s.type, tx.category_name) : null,
        predCategory: tx ? tx.category_name : null,
        predType: tx ? tx.type : null,
        needsClarification: Boolean(parsed && parsed.needs_clarification) || !tx,
        latencyMs: Date.now() - start,
        apiCall: true,
        apiCalls,
        error: false,
        parsed: sanitizeParsedRecord(parsed),
      });
      consecutiveFailures = 0;
    } else {
      records.push({
        sampleIndex: i,
        sourceRow: s.sourceRow,
        text: s.text,
        gold: jointCategoryLabel(s.type, s.goldCategory),
        goldCategory: s.goldCategory,
        goldType: s.type,
        pred: null,
        predCategory: null,
        predType: null,
        needsClarification: true,
        latencyMs: Date.now() - start,
        apiCall: true,
        apiCalls,
        error: true,
        errorName: lastError.name || 'Error',
        errorMessage: String(lastError.message || 'Provider call failed').slice(0, 500),
        parsed: null,
      });
      consecutiveFailures += 1;
      // Nếu hỏng liên tiếp (thường do hết hạn mức kéo dài/không mạng), dừng sớm
      // và báo design-only thay vì tiêu tốn thời gian và quota.
      if (consecutiveFailures >= 5) {
        // Giữ đúng mẫu số của tập đã chọn: các câu chưa gọi vì circuit breaker
        // cũng là abstention, nhưng được đánh dấu rõ là chưa thử để không nhầm
        // với một dự đoán mô hình thực sự.
        for (let j = i + 1; j < sample.length; j += 1) {
          const pending = sample[j];
          records.push({
            sampleIndex: j,
            sourceRow: pending.sourceRow,
            text: pending.text,
            gold: jointCategoryLabel(pending.type, pending.goldCategory),
            goldCategory: pending.goldCategory,
            goldType: pending.type,
            pred: null,
            predCategory: null,
            predType: null,
            needsClarification: true,
            latencyMs: null,
            apiCall: false,
            apiCalls: 0,
            error: true,
            notAttempted: true,
            errorName: 'CircuitBreakerOpen',
            errorMessage: 'Không gọi provider sau 5 lỗi liên tiếp.',
            parsed: null,
          });
        }
        return {
          status: 'incomplete',
          note: `Dừng gọi provider sau ${consecutiveFailures} lỗi liên tiếp; mọi abstention và mẫu chưa thử vẫn nằm trong mẫu số. Không diễn giải nhánh này như một phép đo hoàn chỉnh.`,
          records,
        };
      }
    }
  }

  const answered = records.filter((r) => r.pred !== null).length;
  if (answered === 0) {
    return {
      status: 'incomplete',
      note: 'Không có dự đoán danh mục nào; toàn bộ mẫu được tính là abstention/sai. Không diễn giải như một phép đo mô hình hoàn chỉnh.',
      records,
    };
  }
  return {
    status: 'measured',
    note: `Có dự đoán danh mục cho ${answered}/${records.length} câu; metric chính dùng toàn bộ ${records.length} câu, metric có điều kiện chỉ dùng ${answered} câu đã trả lời.`,
    records,
  };
}

function buildDisagreements(localRecords, llmRecords) {
  const llmBySample = new Map(llmRecords.map((record) => [record.sampleIndex, record]));
  const rows = [];
  for (const local of localRecords) {
    const llm = llmBySample.get(local.sampleIndex);
    if (!llm || llm.error) continue;
    if (local.pred !== llm.pred) {
      rows.push({ text: local.text, gold: local.gold, local: local.pred, llm: llm.pred });
    }
  }
  return rows;
}

function printSummary(result) {
  const local = result.arms.local_parser;
  const llm = result.arms.llm;
  console.log('='.repeat(64));
  console.log('  PERFIN — Ablation: local parser vs LLM');
  console.log('='.repeat(64));
  console.log(`Dataset   : ${result.dataset.file} — mẫu phân tầng ${result.dataset.sampled} câu`);
  console.log(`LLM status: ${result.llm_status} — ${result.llm_note}`);
  console.log('');
  const header = 'Arm'.padEnd(16) + 'Acc(joint)'.padStart(12) + 'Coverage'.padStart(10) + 'Acc(ans)'.padStart(10) + 'MacroF1'.padStart(10) + 'Cat-only'.padStart(10) + 'p50 ms'.padStart(9) + 'API'.padStart(7);
  console.log(header);
  console.log('-'.repeat(header.length));
  printArm('local parser', local);
  if (llm) printArm('LLM (Gemini)', llm);
  console.log('='.repeat(64));
}

function printArm(name, arm) {
  console.log(
    name.padEnd(16) +
    `${(arm.accuracy * 100).toFixed(1)}%`.padStart(10) +
    `${(arm.coverage * 100).toFixed(1)}%`.padStart(10) +
    `${(arm.conditional_metrics.accuracy * 100).toFixed(1)}%`.padStart(10) +
    arm.macroF1.toFixed(3).padStart(10) +
    `${(arm.category_only_metrics.accuracy * 100).toFixed(1)}%`.padStart(10) +
    String(arm.latency_ms_median ?? '-').padStart(9) +
    String(arm.api_calls).padStart(7)
  );
}

function buildMarkdown(result) {
  const local = result.arms.local_parser;
  const llm = result.arms.llm;
  const lines = [];
  lines.push('# Thí nghiệm: Ablation local parser vs LLM');
  lines.push('');
  lines.push(`- Ngày chạy: ${result.meta.timestamp}`);
  lines.push(`- Commit: \`${result.meta.commit}\` · working tree dirty: ${result.meta.working_tree_dirty ? 'yes' : 'no'} · Node ${result.meta.node} · provider \`${result.meta.ai_provider}\` · model \`${result.meta.gemini_model || '-'}\``);
  lines.push(`- Dataset: \`${result.dataset.file}\` — mẫu phân tầng ${result.dataset.sampled} câu (${result.dataset.per_class}/lớp, seed ${result.dataset.seed})`);
  lines.push(`- Trạng thái nhánh LLM: **${result.llm_status}** — ${result.llm_note}`);
  lines.push('');
  lines.push('## So sánh hai nhánh');
  lines.push('');
  lines.push('Joint type/category Accuracy/Macro-F1 trên toàn bộ mẫu là metric chính; mọi null/abstention được tính sai. Category-only là metric phụ. Các chỉ số "đã trả lời" chỉ là metric có điều kiện và luôn đi kèm coverage.');
  lines.push('');
  lines.push('| Nhánh | N | Coverage | Joint accuracy | Joint Macro-F1 | Joint accuracy (answered) | Joint Macro-F1 (answered) | Category-only accuracy | Clarification rate | p50 latency (ms) | Số gọi API |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
  lines.push(armRow('Local parser', local));
  if (llm) lines.push(armRow('LLM (Gemini)', llm));
  else lines.push('| LLM (Gemini) | — | — | — | — | — | — | — | — | — (design-only) |');
  lines.push('');
  if (result.disagreements.length) {
    lines.push('## Ca hai nhánh bất đồng (tối đa 25)');
    lines.push('');
    lines.push('| Câu | Gold | Local | LLM |');
    lines.push('|---|---|---|---|');
    for (const d of result.disagreements) {
      lines.push(`| ${escapePipe(d.text)} | ${d.gold} | ${d.local} | ${d.llm} |`);
    }
    lines.push('');
  }
  lines.push('## Diễn giải');
  lines.push('');
  lines.push('Nhánh parser cục bộ không gọi mạng, độ trễ gần như bằng 0 và chi phí bằng 0, nhưng chỉ mạnh trên câu hội thoại ngắn theo alias. Nhánh LLM đánh đổi độ trễ và chi phí gọi API để lấy khả năng khái quát trên câu tự do. Cả hai đều đi qua bước xác nhận của người dùng trước khi ghi, nên lớp LLM là hỗ trợ trích xuất chứ không phải nguồn chân lý.');
  return lines.join('\n');
}

function armRow(name, arm) {
  return `| ${name} | ${arm.n} | ${(arm.coverage * 100).toFixed(1)}% (${arm.answered}/${arm.n}) | ${(arm.accuracy * 100).toFixed(1)}% | ${arm.macroF1.toFixed(3)} | ${(arm.conditional_metrics.accuracy * 100).toFixed(1)}% | ${arm.conditional_metrics.macroF1.toFixed(3)} | ${(arm.category_only_metrics.accuracy * 100).toFixed(1)}% | ${(arm.clarification_rate * 100).toFixed(1)}% | ${arm.latency_ms_median ?? '-'} | ${arm.api_calls} |`;
}

function escapePipe(text) {
  return String(text).replace(/\|/g, '\\|');
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Ablation runner error:', error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildDisagreements,
  median,
  retryDelayMs,
  run,
  sanitizeParsedRecord,
  summarizeArm,
};

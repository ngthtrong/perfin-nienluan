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
 * Suy giảm nhẹ nhàng: nếu không có GEMINI_API_KEY hoặc mọi lần gọi thất bại,
 * nhánh LLM được đánh dấu "design-only" và chỉ báo kết quả nhánh parser cục bộ;
 * báo cáo phải trình bày đúng trạng thái này, không suy diễn accuracy LLM.
 */
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';
// Tắt Redis cache trong thí nghiệm để mỗi câu là một lần gọi provider độc lập.
process.env.REDIS_ENABLED = process.env.REDIS_ENABLED || 'false';
// Nạp cấu hình provider (.env của backend) như index.js để nhánh LLM thấy khóa.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { parseLocalTransaction } = require('../../services/parser.service');
const { loadLabeledSamples, stratifiedSample, DEFAULT_CATEGORIES } = require('./lib/dataset');
const { classificationReport } = require('./lib/metrics');
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
  const answered = records.filter((r) => r.pred !== null);
  const pairs = answered.map((r) => ({ gold: r.gold, pred: r.pred }));
  const report = pairs.length ? classificationReport(pairs) : null;
  const clarifications = records.filter((r) => r.needsClarification).length;
  const latencies = records.map((r) => r.latencyMs).filter((v) => v != null);
  return {
    n: records.length,
    answered: answered.length,
    accuracy: report ? report.accuracy : 0,
    macroF1: report ? report.macroF1 : 0,
    weightedF1: report ? report.weightedF1 : 0,
    clarification_rate: records.length ? Number((clarifications / records.length).toFixed(4)) : 0,
    latency_ms_median: median(latencies),
    api_calls: records.filter((r) => r.apiCall).length,
    errors: records.filter((r) => r.error).length,
  };
}

async function run() {
  const outDir = parseOutDir(process.argv);
  const perClass = readIntOption(process.argv, '--per-class', 25);
  const dataset = loadLabeledSamples();
  const sample = stratifiedSample(dataset.samples, perClass);

  // Nhánh parser cục bộ: hoàn toàn xác định, không gọi mạng.
  const localRecords = sample.map((s) => {
    const start = Date.now();
    const result = parseLocalTransaction(s.text, DEFAULT_CATEGORIES);
    return {
      text: s.text,
      gold: s.goldCategory,
      pred: result.transaction.category_name,
      needsClarification: Boolean(result.needs_clarification),
      latencyMs: Date.now() - start,
      apiCall: false,
      error: false,
    };
  });

  // Nhánh LLM: gọi Gemini cho từng câu, có xử lý lỗi từng ca để một lần hỏng
  // không làm sập cả thí nghiệm.
  const llm = await runLlmArm(sample);

  const result = {
    experiment: 'ablation-parser-vs-llm',
    description: 'So sánh local parser và LLM trên cùng tập câu gán nhãn (phân loại danh mục).',
    meta: runMeta(),
    dataset: { ...dataset.source, sampled: sample.length, per_class: perClass, seed: 42 },
    llm_status: llm.status,
    llm_note: llm.note,
    arms: {
      local_parser: summarizeArm(localRecords),
      llm: llm.status === 'measured' ? summarizeArm(llm.records) : null,
    },
    disagreements: llm.status === 'measured'
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

    // Thử lại có tôn trọng retryDelay khi gặp 429 (hết hạn mức tức thời), để một
    // đợt giới hạn tốc độ không biến cả nhánh LLM thành "chưa đo".
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        // Gọi thẳng parseWithGemini để bỏ qua cache và local routing, bảo đảm mỗi
        // câu là một lần đo LLM thực sự.
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
        text: s.text,
        gold: s.goldCategory,
        pred: tx ? tx.category_name : null,
        needsClarification: Boolean(parsed && parsed.needs_clarification) || !tx,
        latencyMs: Date.now() - start,
        apiCall: true,
        error: false,
      });
      consecutiveFailures = 0;
    } else {
      records.push({
        text: s.text,
        gold: s.goldCategory,
        pred: null,
        needsClarification: true,
        latencyMs: Date.now() - start,
        apiCall: true,
        error: true,
        errorMessage: lastError.message,
      });
      consecutiveFailures += 1;
      // Nếu hỏng liên tiếp (thường do hết hạn mức kéo dài/không mạng), dừng sớm
      // và báo design-only thay vì tiêu tốn thời gian và quota.
      if (consecutiveFailures >= 5) {
        return {
          status: 'design-only',
          note: `Dừng sau ${consecutiveFailures} lần gọi Gemini thất bại liên tiếp (${lastError.message}). Nhánh LLM chưa đo được trong lần chạy này.`,
          records: [],
        };
      }
    }
  }

  const answered = records.filter((r) => !r.error).length;
  if (answered === 0) {
    return { status: 'design-only', note: 'Mọi lần gọi Gemini đều thất bại; nhánh LLM chưa đo.', records: [] };
  }
  return { status: 'measured', note: `Đo trên ${answered}/${records.length} câu gọi Gemini thành công.`, records };
}

function buildDisagreements(localRecords, llmRecords) {
  const llmByText = new Map(llmRecords.map((r) => [r.text, r]));
  const rows = [];
  for (const local of localRecords) {
    const llm = llmByText.get(local.text);
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
  const header = 'Arm'.padEnd(16) + 'Acc'.padStart(8) + 'MacroF1'.padStart(10) + 'Clarify'.padStart(10) + 'p50 ms'.padStart(9) + 'API'.padStart(7);
  console.log(header);
  console.log('-'.repeat(header.length));
  printArm('local parser', local);
  if (llm) printArm('LLM (Gemini)', llm);
  console.log('='.repeat(64));
}

function printArm(name, arm) {
  console.log(
    name.padEnd(16) +
    `${(arm.accuracy * 100).toFixed(1)}%`.padStart(8) +
    arm.macroF1.toFixed(3).padStart(10) +
    `${(arm.clarification_rate * 100).toFixed(1)}%`.padStart(10) +
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
  lines.push(`- Commit: \`${result.meta.commit}\` · Node ${result.meta.node} · provider \`${result.meta.ai_provider}\` · model \`${result.meta.gemini_model || '-'}\``);
  lines.push(`- Dataset: \`${result.dataset.file}\` — mẫu phân tầng ${result.dataset.sampled} câu (${result.dataset.per_class}/lớp, seed ${result.dataset.seed})`);
  lines.push(`- Trạng thái nhánh LLM: **${result.llm_status}** — ${result.llm_note}`);
  lines.push('');
  lines.push('## So sánh hai nhánh');
  lines.push('');
  lines.push('| Nhánh | Accuracy | Macro-F1 | Weighted-F1 | Clarification rate | p50 latency (ms) | Số gọi API |');
  lines.push('|---|---|---|---|---|---|---|');
  lines.push(armRow('Local parser', local));
  if (llm) lines.push(armRow('LLM (Gemini)', llm));
  else lines.push('| LLM (Gemini) | — | — | — | — | — | — (design-only) |');
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
  return `| ${name} | ${(arm.accuracy * 100).toFixed(1)}% | ${arm.macroF1.toFixed(3)} | ${arm.weightedF1.toFixed(3)} | ${(arm.clarification_rate * 100).toFixed(1)}% | ${arm.latency_ms_median ?? '-'} | ${arm.api_calls} |`;
}

function escapePipe(text) {
  return String(text).replace(/\|/g, '\\|');
}

run().catch((error) => {
  console.error('Ablation runner error:', error);
  process.exitCode = 1;
});

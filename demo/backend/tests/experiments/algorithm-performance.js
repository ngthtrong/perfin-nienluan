#!/usr/bin/env node
/**
 * algorithm-performance.js — Benchmark offline, deterministic cho ba hàm
 * giải thuật đại diện. Dữ liệu tổng hợp có seed cố định; mỗi kích thước được
 * warm-up trước rồi đo nhiều lượt để báo median và p95.
 *
 * Chạy từ demo/backend:
 *   node tests/experiments/algorithm-performance.js
 *   node tests/experiments/algorithm-performance.js --out ../../evaluation/algorithm
 */
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const {
  linearTrend,
  detectAnomalies,
} = require('../../services/analytics/algorithms');
const {
  completeMonthlyCashflow,
  recentMonthKeys,
} = require('../../services/analytics/timeSeries');
const {
  writeArtifact,
  runMeta,
  parseOutDir,
} = require('./lib/report');

const DEFAULT_OUT_DIR = path.resolve(__dirname, '../../../evaluation/algorithm');
const SIZES = [100, 1000, 5000, 10000];
const WARMUP_RUNS = 5;
const MEASURED_RUNS = 30;
const DATA_SEED = 20260814;
let sink = 0;

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function round(value, decimals = 3) {
  return Number(value.toFixed(decimals));
}

function median(values) {
  const sorted = values.slice().sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values, quantile) {
  const sorted = values.slice().sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1);
  return sorted[index];
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function buildTrendInput(size) {
  const random = mulberry32(DATA_SEED + size);
  return Array.from({ length: size }, (_, index) => (
    Math.round(100_000 + index * 35 + random() * 10_000)
  ));
}

function buildAnomalyInput(size) {
  const random = mulberry32(DATA_SEED + size * 3);
  return Array.from({ length: size }, (_, index) => ({
    label: `d${index + 1}`,
    value: index === size - 1
      ? 2_000_000
      : Math.round(100_000 + random() * 30_000),
  }));
}

function buildCashflowInput(size) {
  const random = mulberry32(DATA_SEED + size * 7);
  const axis = recentMonthKeys(120, '2026-12');
  return Array.from({ length: size }, (_, index) => ({
    ym: axis[Math.floor(random() * axis.length)],
    income: index % 5 === 0 ? Math.round(20_000 + random() * 500_000) : 0,
    expense: Math.round(random() * 250_000),
  }));
}

function consume(algorithm, result) {
  let value = 0;
  if (algorithm === 'linearTrend') {
    value = Number(result.forecastNext || 0) + Number(result.r2 || 0);
  } else if (algorithm === 'detectAnomalies') {
    value = result.length + Number(result[0]?.value || 0);
  } else {
    value = result.length + Number(result[result.length - 1]?.expense || 0);
  }
  sink = (sink + value) % 1_000_000_007;
  return value;
}

const workloads = [
  {
    name: 'linearTrend',
    complexity: 'O(n)',
    build: buildTrendInput,
    run: (input) => linearTrend(input),
  },
  {
    name: 'detectAnomalies',
    complexity: 'O(n log n)',
    build: buildAnomalyInput,
    run: (input) => detectAnomalies(input),
  },
  {
    name: 'completeMonthlyCashflow',
    complexity: 'O(n + w)',
    build: buildCashflowInput,
    run: (input) => completeMonthlyCashflow(input, 120, '2026-12'),
  },
];

function measure(workload, size, input) {
  for (let index = 0; index < WARMUP_RUNS; index += 1) {
    consume(workload.name, workload.run(input));
  }

  const durations = [];
  for (let index = 0; index < MEASURED_RUNS; index += 1) {
    const started = performance.now();
    const result = workload.run(input);
    const elapsed = performance.now() - started;
    consume(workload.name, result);
    durations.push(elapsed);
  }

  return {
    algorithm: workload.name,
    size,
    expected_complexity: workload.complexity,
    warmup_runs: WARMUP_RUNS,
    measured_runs: MEASURED_RUNS,
    median_ms: round(median(durations)),
    p95_ms: round(percentile(durations, 0.95)),
    min_ms: round(Math.min(...durations)),
    max_ms: round(Math.max(...durations)),
  };
}

function environment() {
  const cpu = os.cpus()[0] || {};
  return {
    platform: process.platform,
    arch: process.arch,
    os_release: os.release(),
    cpu_model: cpu.model || 'unknown',
    cpu_count: os.cpus().length,
  };
}

function codeFiles() {
  return [
    __filename,
    require.resolve('../../services/analytics/algorithms'),
    require.resolve('../../services/analytics/timeSeries'),
  ];
}

function csvEscape(value) {
  const string = String(value ?? '');
  return /[",\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function writeCsv(outDir, result) {
  const fields = [
    'algorithm',
    'size',
    'expected_complexity',
    'warmup_runs',
    'measured_runs',
    'median_ms',
    'p95_ms',
    'min_ms',
    'max_ms',
  ];
  const lines = [fields.join(',')];
  for (const row of result.measurements) {
    lines.push(fields.map((field) => csvEscape(row[field])).join(','));
  }
  const date = new Date().toISOString().slice(0, 10);
  const csvPath = path.join(outDir, `algorithm-performance_${date}.csv`);
  fs.writeFileSync(csvPath, `${lines.join('\n')}\n`);
  return csvPath;
}

function buildMarkdown(result) {
  const lines = [
    '# Algorithm performance benchmark',
    '',
    `- Run: ${result.meta.timestamp}`,
    `- Commit: \`${result.meta.commit}\` · working tree dirty: ${result.meta.working_tree_dirty ? 'yes' : 'no'}`,
    `- Node.js: \`${result.meta.node}\``,
    `- Environment: ${result.environment.cpu_model}; ${result.environment.platform}/${result.environment.arch}; ${result.environment.cpu_count} logical CPUs`,
    `- Synthetic data seed: \`${result.configuration.seed}\` · dataset SHA-256: \`${result.configuration.dataset_sha256}\``,
    `- Warm-up: ${WARMUP_RUNS} · measured runs: ${MEASURED_RUNS}`,
    '',
    '| Algorithm | n | Expected complexity | Median (ms) | p95 (ms) |',
    '|---|---:|---|---:|---:|',
  ];
  for (const row of result.measurements) {
    lines.push(`| ${row.algorithm} | ${row.size} | ${row.expected_complexity} | ${row.median_ms} | ${row.p95_ms} |`);
  }
  lines.push(
    '',
    'Interpretation is limited to relative growth in this fixed local environment. The measurements do not establish a production latency target, live database/queue behavior, memory capacity or usability.',
    '',
  );
  return lines.join('\n');
}

function main() {
  const outDir = parseOutDir(process.argv) || DEFAULT_OUT_DIR;
  fs.mkdirSync(outDir, { recursive: true });

  const measurements = [];
  const inputDigests = [];
  for (const workload of workloads) {
    for (const size of SIZES) {
      const input = workload.build(size);
      inputDigests.push(`${workload.name}:${size}:${sha256(JSON.stringify(input))}`);
      measurements.push(measure(workload, size, input));
    }
  }

  const result = {
    experiment: 'algorithm-performance',
    meta: runMeta({
      executionMode: 'offline_deterministic',
      aiProvider: 'local',
      codeFiles: codeFiles(),
    }),
    environment: environment(),
    configuration: {
      seed: DATA_SEED,
      sizes: SIZES,
      warmup_runs: WARMUP_RUNS,
      measured_runs: MEASURED_RUNS,
      dataset_sha256: sha256(inputDigests.join('\n')),
    },
    measurements,
    sink,
  };

  const paths = writeArtifact(outDir, 'algorithm-performance', result, buildMarkdown(result));
  const csvPath = writeCsv(outDir, result);
  console.log('Algorithm performance benchmark completed');
  console.log(`Measurements: ${measurements.length}`);
  console.log(`JSON: ${paths.json}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Markdown: ${paths.md}`);
}

main();

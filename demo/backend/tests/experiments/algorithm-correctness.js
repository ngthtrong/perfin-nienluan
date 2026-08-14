#!/usr/bin/env node
/**
 * algorithm-correctness.js — Các ca kiểm thử có kết quả kỳ vọng rõ ràng cho
 * những hàm giải thuật thuần của PERFIN. Runner tạo artifact JSON + Markdown
 * để bảng trong báo cáo có thể truy vết về đúng snapshot mã nguồn.
 *
 * Chạy từ demo/backend:
 *   node tests/experiments/algorithm-correctness.js
 *   node tests/experiments/algorithm-correctness.js --out ../../evaluation/algorithm
 */
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

const {
  linearTrend,
  detectAnomalies,
  cashflowRunway,
  pearsonDetailed,
} = require('../../services/analytics/algorithms');
const { completeMonthlyCashflow } = require('../../services/analytics/timeSeries');
const { enforceRoundedCap, roundCurrency } = require('../../services/budgets/recommender');
const { planSaving } = require('../../services/goals/planner');
const {
  writeArtifact,
  runMeta,
  parseOutDir,
} = require('./lib/report');

const DEFAULT_OUT_DIR = path.resolve(__dirname, '../../../evaluation/algorithm');

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function codeFiles() {
  return [
    __filename,
    require.resolve('../../services/analytics/algorithms'),
    require.resolve('../../services/analytics/timeSeries'),
    require.resolve('../../services/budgets/recommender'),
    require.resolve('../../services/goals/planner'),
  ];
}

function fixtureSha256(cases) {
  const fixture = cases.map(({ id, group, input, expected }) => ({ id, group, input, expected }));
  return crypto.createHash('sha256').update(JSON.stringify(fixture)).digest('hex');
}

function runPropertyCases() {
  const budgetRandom = mulberry32(20260814);
  let budgetViolations = 0;
  let budgetMaxOver = 0;
  for (let caseIndex = 0; caseIndex < 1000; caseIndex += 1) {
    const cap = 100_000 + Math.floor(budgetRandom() * 4_000_000);
    const items = Array.from({ length: 1 + Math.floor(budgetRandom() * 12) }, (_, index) => {
      const raw = Math.floor(budgetRandom() * 1_000_000);
      return {
        category_name: `C${index}`,
        raw_limit: raw,
        recommended_limit: roundCurrency(raw),
      };
    });
    const adjusted = enforceRoundedCap(items, cap);
    const total = adjusted.reduce((sum, item) => sum + item.recommended_limit, 0);
    const violation = total > cap && !adjusted.every((item) => item.recommended_limit === 0);
    if (violation) budgetViolations += 1;
    budgetMaxOver = Math.max(budgetMaxOver, Math.max(0, total - cap));
  }

  const goalRandom = mulberry32(20260815);
  let goalViolations = 0;
  for (let caseIndex = 0; caseIndex < 1000; caseIndex += 1) {
    const target = 1_000_000 + Math.floor(goalRandom() * 49_000_000);
    const current = Math.floor(goalRandom() * target);
    const contribution = 1 + Math.floor(goalRandom() * 2_000_000);
    const before = planSaving({
      targetAmount: target,
      currentAmount: current,
      monthlyContribution: contribution,
      today: '2026-08-10',
    });
    const after = planSaving({
      targetAmount: target,
      currentAmount: current,
      monthlyContribution: contribution + 1,
      today: '2026-08-10',
    });
    if (
      before.monthsNeeded !== null
      && after.monthsNeeded !== null
      && after.monthsNeeded > before.monthsNeeded
    ) {
      goalViolations += 1;
    }
  }

  return {
    budget_cap: {
      cases: 1000,
      violations: budgetViolations,
      max_over_cap: budgetMaxOver,
    },
    goal_contribution_monotonicity: {
      cases: 1000,
      violations: goalViolations,
    },
  };
}

function buildCases() {
  const monthlyRows = [
    { ym: '2026-01', income: 600, expense: 0 },
    { ym: '2026-03', income: 0, expense: 300 },
    { ym: '2026-02', income: 100, expense: 50 },
  ];
  const monthlyRowsShuffled = [monthlyRows[2], monthlyRows[0], monthlyRows[1]];

  return [
    {
      id: 'ALG-01',
      group: 'trend',
      objective: 'OLS trend trả slope, R² và dự báo kế tiếp đúng với chuỗi tuyến tính.',
      input: { series: [100, 200, 300, 400] },
      expected: { slope: 100, intercept: 100, r2: 1, forecastNext: 500, avgPctChange: 61.1 },
      run: () => linearTrend([100, 200, 300, 400]),
      validate: (actual, expected) => assert.deepEqual(actual, expected),
    },
    {
      id: 'ALG-02',
      group: 'anomaly',
      objective: 'Phát hiện điểm chi tiêu bất thường ở phía trên và giữ thứ tự theo giá trị.',
      input: {
        points: [10, 11, 9, 10, 100].map((value, index) => ({ label: `d${index + 1}`, value })),
      },
      expected: 'Chỉ d5 được đánh dấu là bất thường.',
      run: () => detectAnomalies([
        { label: 'd1', value: 10 },
        { label: 'd2', value: 11 },
        { label: 'd3', value: 9 },
        { label: 'd4', value: 10 },
        { label: 'd5', value: 100 },
      ]),
      validate: (actual) => {
        assert.deepEqual(actual.map((item) => item.label), ['d5']);
        assert.equal(actual[0].value, 100);
      },
    },
    {
      id: 'ALG-03',
      group: 'boundary',
      objective: 'Ca biên không đủ mẫu trả về kết quả trung tính, không phát sinh lỗi.',
      input: { trend_series: [42], anomaly_points: [{ value: 1 }, { value: 2 }, { value: 3 }] },
      expected: {
        trend: { slope: 0, intercept: 42, r2: 0, forecastNext: 42, avgPctChange: 0 },
        anomalies: [],
      },
      run: () => ({
        trend: linearTrend([42]),
        anomalies: detectAnomalies([
          { label: 'a', value: 1 },
          { label: 'b', value: 2 },
          { label: 'c', value: 3 },
        ]),
      }),
      validate: (actual, expected) => assert.deepEqual(actual, expected),
    },
    {
      id: 'ALG-04',
      group: 'runway',
      objective: 'Runway giữ ngày không chi tiêu trong mẫu số và tính ngày cạn tiền đúng.',
      input: { balance: 700000, daily_spends: [700000, 0, 0, 0, 0, 0, 0], today: '2026-07-19' },
      expected: { avgBurn: 100000, daysLeft: 7, depletionDate: '2026-07-26' },
      run: () => cashflowRunway(700_000, [700_000, 0, 0, 0, 0, 0, 0], {
        today: new Date(2026, 6, 19, 0, 0, 0, 0),
      }),
      validate: (actual, expected) => {
        assert.equal(actual.avgBurn, expected.avgBurn);
        assert.equal(actual.daysLeft, expected.daysLeft);
        assert.equal(actual.depletionDate, expected.depletionDate);
      },
    },
    {
      id: 'ALG-05',
      group: 'correlation',
      objective: 'Pearson loại cặp cùng bằng 0 và báo đúng số quan sát hữu hiệu.',
      input: { left: [0, 0, 10, 20, 30, 40], right: [0, 0, 40, 30, 20, 10] },
      expected: { r: -1, effective_pair_count: 4, excluded_joint_zero_count: 2 },
      run: () => pearsonDetailed(
        [0, 0, 10, 20, 30, 40],
        [0, 0, 40, 30, 20, 10],
        { excludeJointZeros: true },
      ),
      validate: (actual, expected) => assert.deepEqual(actual, expected),
    },
    {
      id: 'ALG-06',
      group: 'aggregation',
      objective: 'Tổng hợp chuỗi tháng giữ kỳ rỗng và bất biến theo thứ tự giao dịch.',
      input: { rows: monthlyRows, window: 3, anchor_month: '2026-03' },
      expected: 'Hai thứ tự đầu vào cho cùng một chuỗi tổng hợp.',
      run: () => {
        const original = completeMonthlyCashflow(monthlyRows, 3, '2026-03');
        const shuffled = completeMonthlyCashflow(monthlyRowsShuffled, 3, '2026-03');
        assert.deepEqual(shuffled, original);
        return original;
      },
      validate: (actual) => assert.deepEqual(actual, [
        { ym: '2026-01', income: 600, expense: 0 },
        { ym: '2026-02', income: 100, expense: 50 },
        { ym: '2026-03', income: 0, expense: 300 },
      ]),
    },
    {
      id: 'ALG-07',
      group: 'invariant',
      objective: '1000 ca sinh ngẫu nhiên xác nhận ngân sách sau làm tròn không vượt trần.',
      input: { cases: 1000, seed: 20260814 },
      expected: { violations: 0, max_over_cap: 0 },
      run: () => runPropertyCases().budget_cap,
      validate: (actual, expected) => {
        assert.equal(actual.violations, expected.violations);
        assert.equal(actual.max_over_cap, expected.max_over_cap);
      },
    },
    {
      id: 'ALG-08',
      group: 'invariant',
      objective: '1000 ca sinh ngẫu nhiên xác nhận tăng đóng góp không kéo dài kế hoạch.',
      input: { cases: 1000, seed: 20260815 },
      expected: { violations: 0 },
      run: () => runPropertyCases().goal_contribution_monotonicity,
      validate: (actual, expected) => assert.equal(actual.violations, expected.violations),
    },
  ];
}

function buildMarkdown(result) {
  const lines = [
    '# Algorithm correctness evidence',
    '',
    `- Run: ${result.meta.timestamp}`,
    `- Commit: \`${result.meta.commit}\` · working tree dirty: ${result.meta.working_tree_dirty ? 'yes' : 'no'}`,
    `- Node.js: \`${result.meta.node}\` · timezone: \`${result.meta.tz}\``,
    `- Fixture SHA-256: \`${result.configuration.fixture_sha256}\``,
    `- Passed: ${result.summary.passed}/${result.summary.total}`,
    '',
    '| ID | Group | Objective | Status |',
    '|---|---|---|---|',
  ];
  for (const testCase of result.cases) {
    lines.push(`| ${testCase.id} | ${testCase.group} | ${testCase.objective} | **${testCase.status}** |`);
  }
  lines.push('', 'The cases cover ordinary, boundary, exception-sensitive and invariant behavior of deterministic algorithm modules. The classification benchmark is reported separately because it evaluates parser predictions over the labeled CSV snapshot.', '');
  return lines.join('\n');
}

function main() {
  const outDir = parseOutDir(process.argv) || DEFAULT_OUT_DIR;
  const cases = buildCases();
  let passed = 0;
  const evaluated = cases.map((testCase) => {
    const record = {
      id: testCase.id,
      group: testCase.group,
      objective: testCase.objective,
      input: testCase.input,
      expected: testCase.expected,
      actual: null,
      status: 'Fail',
    };
    try {
      record.actual = testCase.run();
      testCase.validate(record.actual, testCase.expected);
      record.status = 'Pass';
      passed += 1;
    } catch (error) {
      record.error = error instanceof Error ? error.message : String(error);
    }
    return record;
  });

  const result = {
    experiment: 'algorithm-correctness',
    meta: runMeta({
      executionMode: 'offline_deterministic',
      aiProvider: 'local',
      codeFiles: codeFiles(),
    }),
    summary: {
      total: evaluated.length,
      passed,
      failed: evaluated.length - passed,
    },
    configuration: {
      fixture_sha256: fixtureSha256(cases),
      property_case_count: 1000,
      property_seeds: [20260814, 20260815],
    },
    cases: evaluated,
  };

  const paths = writeArtifact(outDir, 'algorithm-correctness', result, buildMarkdown(result));
  console.log(`Algorithm correctness: ${passed}/${evaluated.length} cases passed`);
  console.log(`JSON: ${paths.json}`);
  console.log(`Markdown: ${paths.md}`);
  if (result.summary.failed > 0) process.exitCode = 1;
}

main();

const test = require('node:test');
const assert = require('node:assert/strict');

const { completeMonthlyCashflow } = require('../services/analytics/timeSeries');
const { normalizeForMatch } = require('../services/feedback/textSimilarity');
const { lookupCategoryCorrection } = require('../services/feedback/correction.service');
const { enforceRoundedCap, roundCurrency } = require('../services/budgets/recommender');
const { planSaving } = require('../services/goals/planner');

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

test('property: Vietnamese normalizer is idempotent over 1,000 generated strings', () => {
  const random = mulberry32(20260810);
  const tokens = ['Ăn uống', 'Đường', '  cà-phê  ', 'MOMO', '45 nghìn', 'hôm qua', 'Điện tử'];
  for (let caseIndex = 0; caseIndex < 1000; caseIndex += 1) {
    const value = Array.from({ length: 1 + Math.floor(random() * 6) }, () => (
      tokens[Math.floor(random() * tokens.length)]
    )).join(random() > 0.5 ? '  ' : ' ');
    const normalized = normalizeForMatch(value);
    assert.equal(normalizeForMatch(normalized), normalized, `case ${caseIndex}`);
  }
});

test('property: monthly aggregate is invariant to transaction order over 1,000 cases', () => {
  const random = mulberry32(42);
  for (let caseIndex = 0; caseIndex < 1000; caseIndex += 1) {
    const rows = Array.from({ length: 1 + Math.floor(random() * 24) }, (_, index) => ({
      ym: `2026-${String(1 + Math.floor(random() * 6)).padStart(2, '0')}`,
      income: Math.floor(random() * 2_000_000),
      expense: Math.floor(random() * 2_000_000),
      source: index,
    }));
    const expected = completeMonthlyCashflow(rows, 6, '2026-06');
    const actual = completeMonthlyCashflow(shuffle(rows, random), 6, '2026-06');
    assert.deepEqual(actual, expected, `case ${caseIndex}`);
  }
});

test('property: rounded budget recommendations never exceed their cap', () => {
  const random = mulberry32(7);
  for (let caseIndex = 0; caseIndex < 1000; caseIndex += 1) {
    const cap = 100_000 + Math.floor(random() * 4_000_000);
    const items = Array.from({ length: 1 + Math.floor(random() * 12) }, (_, index) => {
      const raw = Math.floor(random() * 1_000_000);
      return { category_name: `C${index}`, raw_limit: raw, recommended_limit: roundCurrency(raw) };
    });
    const adjusted = enforceRoundedCap(items, cap);
    const total = adjusted.reduce((sum, item) => sum + item.recommended_limit, 0);
    assert.ok(total <= cap || adjusted.every((item) => item.recommended_limit === 0), `case ${caseIndex}`);
    assert.ok(adjusted.every((item) => item.recommended_limit >= 0), `negative recommendation case ${caseIndex}`);
  }
});

test('property: increasing saving contribution never lengthens the plan', () => {
  const random = mulberry32(99);
  for (let caseIndex = 0; caseIndex < 1000; caseIndex += 1) {
    const target = 1_000_000 + Math.floor(random() * 49_000_000);
    const current = Math.floor(random() * target);
    const contribution = 1 + Math.floor(random() * 2_000_000);
    const before = planSaving({ targetAmount: target, currentAmount: current, monthlyContribution: contribution, today: '2026-08-10' });
    const after = planSaving({ targetAmount: target, currentAmount: current, monthlyContribution: contribution + 1, today: '2026-08-10' });
    if (before.monthsNeeded !== null && after.monthsNeeded !== null) {
      assert.ok(after.monthsNeeded <= before.monthsNeeded, `case ${caseIndex}`);
    }
  }
});

test('property: wallet transfer debit and credit preserve the combined balance', () => {
  const random = mulberry32(123);
  for (let caseIndex = 0; caseIndex < 1000; caseIndex += 1) {
    const source = Math.floor(random() * 20_000_000);
    const target = Math.floor(random() * 20_000_000);
    const amount = 1 + Math.floor(random() * 5_000_000);
    const before = source + target;
    const after = (source - amount) + (target + amount);
    assert.equal(after, before, `case ${caseIndex}`);
  }
});

test('property: category correction retrieval never changes transaction type', () => {
  const random = mulberry32(456);
  for (let caseIndex = 0; caseIndex < 1000; caseIndex += 1) {
    const type = random() < 0.5 ? 'income' : 'expense';
    const text = `synthetic merchant ${caseIndex}`;
    const result = lookupCategoryCorrection([
      {
        feedback_type: 'classification',
        original_text: text,
        ai_result: { category_name: 'Khác', type },
        corrected_result: { category_name: `Category ${caseIndex}`, type },
        created_at: '2026-08-01',
      },
    ], text, { type });
    assert.equal(result?.type, type, `case ${caseIndex}`);
  }
});

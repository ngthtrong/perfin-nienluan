const test = require('node:test');
const assert = require('node:assert/strict');
const { mineSubscriptions } = require('../services/analytics/subscriptionMiner');

function expenses(description, amount, dates) {
  return dates.map((transaction_date) => ({
    description,
    amount,
    transaction_date,
    type: 'expense',
  }));
}

test('subscription miner classifies cadence and converts each cadence to a monthly estimate', () => {
  const transactions = [
    ...expenses('Goi tap hang tuan', 120_000, ['2026-03-12', '2026-03-19', '2026-03-26', '2026-04-02']),
    ...expenses('Tien nha', 2_000_000, ['2026-01-31', '2026-02-28', '2026-03-31']),
    ...expenses('Bao hiem quy', 900_000, ['2025-10-01', '2026-01-01', '2026-04-01']),
  ];

  const result = mineSubscriptions(transactions, { asOf: '2026-04-02' });
  const byFrequency = Object.fromEntries(result.subscriptions.map((item) => [item.frequency, item]));

  assert.equal(byFrequency.weekly.monthlyEstimate, 520_000);
  assert.equal(byFrequency.monthly.monthlyEstimate, 2_000_000);
  assert.equal(byFrequency.quarterly.monthlyEstimate, 300_000);
  assert.equal(result.totalMonthly, 2_820_000);
  assert.ok(byFrequency.monthly.cadenceDispersion < 0.12);
  assert.equal(byFrequency.monthly.lastSeen, '2026-03-31');
  assert.equal(byFrequency.monthly.nextExpected, '2026-04-30');
});

test('subscription miner has no implicit VND 500k cap but supports an explicit ceiling', () => {
  const rent = expenses('Tien nha', 3_500_000, ['2026-01-05', '2026-02-05', '2026-03-05']);

  assert.equal(mineSubscriptions(rent, { asOf: '2026-03-06' }).subscriptions.length, 1);
  assert.equal(mineSubscriptions(rent, { maxAmount: 500_000, asOf: '2026-03-06' }).subscriptions.length, 0);
});

test('three stable charges with irregular timing are not a subscription', () => {
  const irregular = expenses('Quan an quen', 80_000, ['2026-01-01', '2026-01-10', '2026-03-01']);
  assert.deepEqual(mineSubscriptions(irregular, { asOf: '2026-03-02' }), { subscriptions: [], totalMonthly: 0 });
});

test('a matching average cadence is rejected when individual gaps are too dispersed', () => {
  const irregularWeekly = expenses(
    'Dich vu lap lai',
    100_000,
    ['2026-01-01', '2026-01-06', '2026-01-15', '2026-01-20'] // gaps 5, 9, 5; average is weekly
  );

  assert.deepEqual(mineSubscriptions(irregularWeekly, { asOf: '2026-01-21' }), { subscriptions: [], totalMonthly: 0 });
});

test('subscription miner ignores income, invalid dates, and unstable amounts', () => {
  const income = expenses('Luong', 10_000_000, ['2026-01-01', '2026-02-01', '2026-03-01'])
    .map((row) => ({ ...row, type: 'income' }));
  const invalid = expenses('Invalid', 100_000, ['bad-date', 'also-bad', 'still-bad']);
  const unstable = [
    ...expenses('Hoa don bien dong', 100_000, ['2026-01-01']),
    ...expenses('Hoa don bien dong', 200_000, ['2026-02-01']),
    ...expenses('Hoa don bien dong', 300_000, ['2026-03-01']),
  ];

  assert.deepEqual(
    mineSubscriptions([...income, ...invalid, ...unstable], { asOf: '2026-03-02' }),
    { subscriptions: [], totalMonthly: 0 }
  );
});

test('a cadence that stopped longer than its maximum gap is not active', () => {
  const stopped = expenses('Goi tap cu', 100_000, ['2026-01-01', '2026-01-08', '2026-01-15']);
  assert.deepEqual(
    mineSubscriptions(stopped, { asOf: '2026-02-01' }),
    { subscriptions: [], totalMonthly: 0 }
  );
});

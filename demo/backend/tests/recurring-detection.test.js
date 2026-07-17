const test = require('node:test');
const assert = require('node:assert/strict');
const RecurringBillModel = require('../models/recurringBill.model');

function rows(dates) {
  return dates.map((transaction_date) => ({ transaction_date }));
}

test('recurring cadence accepts regular weekly and monthly observations', () => {
  assert.deepEqual(
    RecurringBillModel.inferRecurringCadence(rows(['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22'])),
    { frequency: 'weekly', confidence: 1, observed_periods: 4 }
  );
  assert.deepEqual(
    RecurringBillModel.inferRecurringCadence(rows(['2026-04-05', '2026-05-05', '2026-06-05'])),
    { frequency: 'monthly', confidence: 1, observed_periods: 3 }
  );
});

test('recurring cadence rejects irregular restaurant history whose average happens to be weekly', () => {
  const irregularHutieuDates = [
    '2026-04-01', '2026-04-10', '2026-05-04', '2026-05-08', '2026-05-09',
    '2026-05-18', '2026-05-22', '2026-05-23', '2026-06-12', '2026-06-12',
    '2026-06-16', '2026-06-18', '2026-06-24', '2026-06-24',
  ];
  assert.equal(RecurringBillModel.inferRecurringCadence(rows(irregularHutieuDates)), null);
});

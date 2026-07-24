const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isFutureDateOnly,
  isValidDateOnly,
  normalizePastOrPresentDate,
  validateTransactionPayload,
} = require('../services/transactions/validation');

const valid = {
  description: 'Bữa trưa',
  amount: 45_000,
  type: 'expense',
  category_id: 2,
};

test('transaction create validation accepts a valid payload and optional default wallet', () => {
  assert.equal(validateTransactionPayload(valid), valid);
  assert.equal(validateTransactionPayload({ ...valid, wallet_id: 3 }, { requireWallet: true }).wallet_id, 3);
});

test('transaction validation rejects non-finite/overflow amounts and malformed references', () => {
  assert.throws(() => validateTransactionPayload({ ...valid, amount: Infinity }), /giới hạn/);
  assert.throws(() => validateTransactionPayload({ ...valid, amount: 10_000_000_000_000 }), /giới hạn/);
  assert.throws(() => validateTransactionPayload({ ...valid, category_id: 'abc' }), /Danh mục/);
  assert.throws(() => validateTransactionPayload({ ...valid, wallet_id: -1 }, { requireWallet: true }), /Ví/);
});

test('transaction update validation is partial but rejects empty, immutable, and invalid fields', () => {
  assert.equal(validateTransactionPayload({ amount: 50_000 }, { partial: true, rejectUnknown: true }).amount, 50_000);
  assert.throws(() => validateTransactionPayload({}, { partial: true, rejectUnknown: true }), /Không có trường/);
  assert.throws(() => validateTransactionPayload({ user_id: 'other' }, { partial: true, rejectUnknown: true }), /Không có trường/);
  assert.throws(
    () => validateTransactionPayload({ amount: 50_000, deleted_at: null }, { partial: true, rejectUnknown: true }),
    /Không thể cập nhật trường deleted_at/
  );
  assert.throws(() => validateTransactionPayload({ description: '   ' }, { partial: true }), /Mô tả/);
  assert.throws(() => validateTransactionPayload({ type: 'transfer' }, { partial: true }), /Loại giao dịch/);
});

test('transaction date validation rejects calendar-overflow dates', () => {
  assert.equal(isValidDateOnly('2026-02-28'), true);
  assert.equal(isValidDateOnly('2026-02-30'), false);
  assert.throws(() => validateTransactionPayload({ transaction_date: '2026-02-30' }, { partial: true }), /Ngày giao dịch/);
});

test('transaction date cannot be later than the current local calendar date', () => {
  const today = new Date(2026, 6, 18, 0, 15, 0);
  assert.equal(isFutureDateOnly('2026-07-18', today), false);
  assert.equal(isFutureDateOnly('2026-07-19', today), true);
  assert.doesNotThrow(() => validateTransactionPayload(
    { transaction_date: '2026-07-18' },
    { partial: true, today }
  ));
  assert.throws(() => validateTransactionPayload(
    { transaction_date: '2026-07-19' },
    { partial: true, today }
  ), /không được nằm trong tương lai/);
});

test('shared financial event date normalization supports optional dates', () => {
  const today = new Date(2026, 6, 18, 12);
  assert.equal(normalizePastOrPresentDate(null, { optional: true, today }), null);
  assert.equal(normalizePastOrPresentDate('2026-07-18', { label: 'Ngày ghi nhận', today }), '2026-07-18');
  assert.throws(
    () => normalizePastOrPresentDate('2026-07-19', { label: 'Ngày ghi nhận', today }),
    /Ngày ghi nhận không được nằm trong tương lai/
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTransferInput } = require('../models/cashflow.model');

test('transfer validation accepts a complete atomic transfer', () => {
  assert.deepEqual(
    validateTransferInput({ from_wallet_id: 1, to_wallet_id: 2, amount: '50000', transfer_type: 'transfer' }),
    { amount: 50000, transfer_type: 'transfer', from_wallet_id: 1, to_wallet_id: 2 }
  );
});

test('transfer validation rejects invalid, incomplete, and same-wallet transfers', () => {
  assert.throws(() => validateTransferInput({ from_wallet_id: 1, to_wallet_id: 2, amount: 0 }), /lớn hơn 0/);
  assert.throws(() => validateTransferInput({ from_wallet_id: 1, amount: 1000 }), /đủ ví nguồn/);
  assert.throws(() => validateTransferInput({ from_wallet_id: 1, to_wallet_id: 1, amount: 1000 }), /phải khác nhau/);
  assert.throws(() => validateTransferInput({ from_wallet_id: 'abc', to_wallet_id: 2, amount: 1000 }), /Ví nguồn không hợp lệ/);
  assert.throws(() => validateTransferInput({ from_wallet_id: -1, to_wallet_id: 2, amount: 1000 }), /Ví nguồn không hợp lệ/);
  assert.throws(() => validateTransferInput({ to_wallet_id: 2, amount: 1000, transfer_type: 'unknown' }), /không hợp lệ/);
});

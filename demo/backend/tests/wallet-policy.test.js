const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RUNWAY_CURRENCY,
  RUNWAY_WALLET_TYPES,
  isRunwayEligibleWallet,
  sumRunwayBalance,
} = require('../services/analytics/walletPolicy');

test('runway policy only includes liquid VND wallets', () => {
  const wallets = [
    { type: 'cash', currency: 'VND', balance: '100000' },
    { type: 'bank', currency: 'VND', balance: 200000 },
    { type: 'e_wallet', currency: 'VND', balance: '50000' },
    { type: 'cash', currency: 'USD', balance: 1_000 },
    { type: 'savings', currency: 'VND', balance: 5_000_000 },
    { type: 'investment', currency: 'VND', balance: 8_000_000 },
    { type: 'credit_card', currency: 'VND', balance: 10_000_000 },
  ];

  assert.equal(RUNWAY_CURRENCY, 'VND');
  assert.deepEqual(RUNWAY_WALLET_TYPES, ['cash', 'bank', 'e_wallet']);
  assert.equal(sumRunwayBalance(wallets), 350000);
});

test('runway policy does not assume a missing currency and skips non-numeric balances', () => {
  assert.equal(isRunwayEligibleWallet({ type: 'cash', balance: 100000 }), false);
  assert.equal(sumRunwayBalance([
    { type: 'cash', currency: 'VND', balance: 'not-a-number' },
    { type: 'bank', currency: 'VND', balance: -25000 },
  ]), -25000);
});

test('runway policy can be reused with an explicit reporting currency', () => {
  const wallets = [
    { type: 'cash', currency: 'USD', balance: 75 },
    { type: 'investment', currency: 'USD', balance: 500 },
    { type: 'cash', currency: 'VND', balance: 1_000_000 },
  ];

  assert.equal(sumRunwayBalance(wallets, { currency: 'USD' }), 75);
});

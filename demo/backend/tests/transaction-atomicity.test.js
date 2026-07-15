const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../config/database');
const kvPath = require.resolve('../services/store/kv.store');
const modelPath = require.resolve('../models/transaction.model');
const database = require(databasePath);
const KVStore = require(kvPath);

const originalConnect = database.pool.connect;
const originalQuery = database.query;
const originalDel = KVStore.del;

let connectImpl;
let rootQueryImpl = async () => ({ rows: [], rowCount: 0 });
let delImpl = async () => true;

database.pool.connect = (...args) => connectImpl(...args);
database.query = (...args) => rootQueryImpl(...args);
KVStore.del = (...args) => delImpl(...args);
delete require.cache[modelPath];
const TransactionModel = require(modelPath);

test.after(() => {
  database.pool.connect = originalConnect;
  database.query = originalQuery;
  KVStore.del = originalDel;
  delete require.cache[modelPath];
});

function mockClient(handler) {
  const events = [];
  const client = {
    async query(sql, params) {
      events.push(String(sql).trim().split(/\s+/).join(' '));
      return handler(String(sql), params);
    },
    release() {
      events.push('RELEASE');
    },
  };
  connectImpl = async () => client;
  return events;
}

test('update rolls back before returning null when the transaction is absent', async () => {
  delImpl = async () => true;
  const events = mockClient(async (sql) => {
    if (/SELECT \* FROM transactions/.test(sql)) return { rows: [], rowCount: 0 };
    return { rows: [], rowCount: 0 };
  });

  assert.equal(await TransactionModel.update(999, { amount: 1 }), null);
  assert.deepEqual(events.map((event) => event.split(' ')[0]), ['BEGIN', 'SELECT', 'ROLLBACK', 'RELEASE']);
});

test('softDelete rolls back before returning null when no row is deleted', async () => {
  delImpl = async () => true;
  const events = mockClient(async () => ({ rows: [], rowCount: 0 }));

  assert.equal(await TransactionModel.softDelete(999), null);
  assert.deepEqual(events.map((event) => event.split(' ')[0]), ['BEGIN', 'UPDATE', 'ROLLBACK', 'RELEASE']);
});

test('post-commit cache failure returns the committed row and never attempts a rollback', async () => {
  const oldTransaction = {
    id: 7,
    user_id: 'u1',
    type: 'expense',
    amount: 20_000,
    wallet_id: 3,
    description: 'Bữa trưa',
    category_id: 4,
    transaction_date: '2026-07-16',
    note: null,
  };
  const events = mockClient(async (sql) => {
    if (/SELECT \* FROM transactions/.test(sql)) return { rows: [oldTransaction], rowCount: 1 };
    if (/UPDATE transactions SET/.test(sql)) return { rows: [{ ...oldTransaction, amount: 25_000 }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  });
  delImpl = async () => {
    throw new Error('cache unavailable');
  };

  const result = await TransactionModel.update(7, { amount: 25_000 });
  assert.equal(result.amount, 25_000);
  assert.ok(events.includes('COMMIT'));
  assert.equal(events.includes('ROLLBACK'), false);
  assert.equal(events.at(-1), 'RELEASE');
});

test('post-commit hydration failure returns the committed row and never attempts a rollback', async () => {
  const oldTransaction = {
    id: 8,
    user_id: 'u1',
    type: 'expense',
    amount: 30_000,
    wallet_id: 3,
    description: 'Di chuyển',
    category_id: 5,
    transaction_date: '2026-07-16',
    note: null,
  };
  const events = mockClient(async (sql) => {
    if (/SELECT \* FROM transactions/.test(sql)) return { rows: [oldTransaction], rowCount: 1 };
    if (/UPDATE transactions SET/.test(sql)) return { rows: [{ ...oldTransaction, amount: 35_000 }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  });
  delImpl = async () => true;
  rootQueryImpl = async () => {
    throw new Error('hydrate unavailable');
  };

  const result = await TransactionModel.update(8, { amount: 35_000 });
  assert.equal(result.amount, 35_000);
  assert.ok(events.includes('COMMIT'));
  assert.equal(events.includes('ROLLBACK'), false);
  assert.equal(events.at(-1), 'RELEASE');
});

test('create does not invite a duplicate retry when all post-commit helpers fail', async () => {
  const created = {
    id: 9,
    user_id: 'u1',
    type: 'expense',
    amount: 40_000,
    wallet_id: 3,
    description: 'Bữa tối',
    category_id: 4,
    transaction_date: '2026-07-16',
  };
  const events = mockClient(async (sql) => {
    if (/INSERT INTO transactions/.test(sql)) return { rows: [created], rowCount: 1 };
    if (/UPDATE wallets/.test(sql)) return { rows: [{ balance: '960000' }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
  delImpl = async () => {
    throw new Error('cache unavailable');
  };
  rootQueryImpl = async () => {
    throw new Error('hydrate unavailable');
  };

  const result = await TransactionModel.create({ ...created, userId: 'u1' });
  assert.equal(result.id, 9);
  assert.equal(result.wallet_balance, 960000);
  assert.ok(events.includes('COMMIT'));
  assert.equal(events.includes('ROLLBACK'), false);
  assert.equal(events.at(-1), 'RELEASE');
});

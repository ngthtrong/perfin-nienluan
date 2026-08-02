const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../config/database');
const kvPath = require.resolve('../services/store/kv.store');
const modelPath = require.resolve('../models/cashflow.model');
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
const { TransferModel, InvestmentPnLModel } = require(modelPath);

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
      const normalized = String(sql).trim().split(/\s+/).join(' ');
      events.push(normalized);
      return handler(String(sql), params);
    },
    release() {
      events.push('RELEASE');
    },
  };
  connectImpl = async () => client;
  return events;
}

test('a successful transfer debits and credits the same amount without changing net worth', async () => {
  const balances = { 1: 200000, 2: 50000 };
  const records = [];
  let snapshot;
  const events = mockClient(async (sql, params) => {
    if (sql === 'BEGIN') {
      snapshot = { ...balances };
      return { rows: [], rowCount: 0 };
    }
    if (/SELECT id, name, type, balance/.test(sql)) {
      return {
        rows: params[1].map((id) => ({ id, name: `Ví ${id}`, type: 'cash', balance: String(balances[id]), currency: 'VND' })),
        rowCount: params[1].length,
      };
    }
    if (/balance = balance -/.test(sql)) {
      balances[params[1]] -= params[0];
      return { rows: [], rowCount: 1 };
    }
    if (/balance = balance \+/.test(sql)) {
      balances[params[1]] += params[0];
      return { rows: [], rowCount: 1 };
    }
    if (/INSERT INTO wallet_transfers/.test(sql)) {
      const row = { id: 31, user_id: params[0], from_wallet_id: params[1], to_wallet_id: params[2], amount: params[3], transfer_type: params[4] };
      records.push(row);
      return { rows: [row], rowCount: 1 };
    }
    if (sql === 'ROLLBACK') Object.assign(balances, snapshot);
    return { rows: [], rowCount: 0 };
  });
  rootQueryImpl = async (sql, params) => ({
    rows: [{ ...records[0], from_wallet_name: 'Ví 1', to_wallet_name: 'Ví 2' }],
    rowCount: 1,
    sql,
    params,
  });
  delImpl = async () => true;

  const before = balances[1] + balances[2];
  const result = await TransferModel.create({
    userId: 'u1',
    from_wallet_id: '1',
    to_wallet_id: '2',
    amount: 75000,
    transfer_type: 'transfer',
  });

  assert.equal(result.id, 31);
  assert.deepEqual(balances, { 1: 125000, 2: 125000 });
  assert.equal(balances[1] + balances[2], before);
  assert.equal(records.length, 1);
  assert.ok(events.includes('COMMIT'));
  assert.equal(events.includes('ROLLBACK'), false);
  assert.equal(events.at(-1), 'RELEASE');
});

test('a transfer may take its source wallet balance below zero', async () => {
  const balances = { 1: 50000, 2: 10000 };
  const events = mockClient(async (sql, params) => {
    if (/SELECT id, name, type, balance/.test(sql)) {
      return {
        rows: params[1].map((id) => ({ id, name: `Ví ${id}`, type: 'cash', balance: String(balances[id]), currency: 'VND' })),
        rowCount: params[1].length,
      };
    }
    if (/balance = balance -/.test(sql)) {
      balances[params[1]] -= params[0];
      return { rows: [], rowCount: 1 };
    }
    if (/balance = balance \+/.test(sql)) {
      balances[params[1]] += params[0];
      return { rows: [], rowCount: 1 };
    }
    if (/INSERT INTO wallet_transfers/.test(sql)) {
      return { rows: [{ id: 32, user_id: params[0], amount: params[3] }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
  rootQueryImpl = async () => ({ rows: [], rowCount: 0 });
  delImpl = async () => true;

  const before = balances[1] + balances[2];
  await TransferModel.create({
    userId: 'u1',
    from_wallet_id: 1,
    to_wallet_id: 2,
    amount: 75000,
  });

  assert.deepEqual(balances, { 1: -25000, 2: 85000 });
  assert.equal(balances[1] + balances[2], before);
  assert.ok(events.includes('COMMIT'));
  assert.equal(events.includes('ROLLBACK'), false);
});

test('fault injection before transfer-log insert rolls back both wallet updates', async () => {
  const balances = { 1: 200000, 2: 50000 };
  let snapshot;
  const events = mockClient(async (sql, params) => {
    if (sql === 'BEGIN') {
      snapshot = { ...balances };
      return { rows: [], rowCount: 0 };
    }
    if (/SELECT id, name, type, balance/.test(sql)) {
      return {
        rows: params[1].map((id) => ({ id, name: `Ví ${id}`, type: 'cash', balance: String(balances[id]), currency: 'VND' })),
        rowCount: params[1].length,
      };
    }
    if (/balance = balance -/.test(sql)) {
      balances[params[1]] -= params[0];
      return { rows: [], rowCount: 1 };
    }
    if (/balance = balance \+/.test(sql)) {
      balances[params[1]] += params[0];
      return { rows: [], rowCount: 1 };
    }
    if (/INSERT INTO wallet_transfers/.test(sql)) throw new Error('injected insert failure');
    if (sql === 'ROLLBACK') {
      Object.assign(balances, snapshot);
      return { rows: [], rowCount: 0 };
    }
    return { rows: [], rowCount: 0 };
  });
  delImpl = async () => true;

  await assert.rejects(
    TransferModel.create({ userId: 'u1', from_wallet_id: 1, to_wallet_id: 2, amount: 75000 }),
    /injected insert failure/
  );

  assert.deepEqual(balances, { 1: 200000, 2: 50000 });
  assert.ok(events.includes('ROLLBACK'));
  assert.equal(events.includes('COMMIT'), false);
  assert.equal(events.at(-1), 'RELEASE');
});

test('a cross-currency transfer is rejected and rolled back before balances change', async () => {
  const balances = { 1: 2_000_000, 2: 100 };
  const events = mockClient(async (sql, params) => {
    if (/SELECT id, name, type, balance, currency/.test(sql)) {
      return {
        rows: [
          { id: params[1][0], name: 'Ví VND', type: 'bank', balance: String(balances[1]), currency: 'VND' },
          { id: params[1][1], name: 'Ví USD', type: 'bank', balance: String(balances[2]), currency: 'USD' },
        ],
        rowCount: 2,
      };
    }
    if (/UPDATE wallets|INSERT INTO wallet_transfers/.test(sql)) {
      throw new Error('must reject before mutating balances');
    }
    return { rows: [], rowCount: 0 };
  });

  await assert.rejects(
    TransferModel.create({ userId: 'u1', from_wallet_id: 1, to_wallet_id: 2, amount: 75_000 }),
    (error) => error.code === 'CURRENCY_MISMATCH' && /quy đổi ngoại tệ chưa được hỗ trợ/.test(error.message)
  );

  assert.deepEqual(balances, { 1: 2_000_000, 2: 100 });
  assert.ok(events.includes('ROLLBACK'));
  assert.equal(events.includes('COMMIT'), false);
  assert.equal(events.at(-1), 'RELEASE');
});

test('post-commit cache and hydration failures still return the durable transfer', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const created = { id: 44, user_id: 'u1', from_wallet_id: 1, to_wallet_id: 2, amount: 10000, transfer_type: 'transfer' };
  const events = mockClient(async (sql, params) => {
    if (/SELECT id, name, type, balance/.test(sql)) {
      return {
        rows: params[1].map((id) => ({ id, name: `Ví ${id}`, type: 'cash', balance: '100000', currency: 'VND' })),
        rowCount: params[1].length,
      };
    }
    if (/INSERT INTO wallet_transfers/.test(sql)) return { rows: [created], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  });
  delImpl = async () => {
    throw new Error('cache unavailable');
  };
  rootQueryImpl = async () => {
    throw new Error('hydrate unavailable');
  };

  assert.deepEqual(
    await TransferModel.create({ userId: 'u1', from_wallet_id: 1, to_wallet_id: 2, amount: 10000 }),
    created
  );
  assert.ok(events.includes('COMMIT'));
  assert.equal(events.includes('ROLLBACK'), false);
  assert.equal(events.at(-1), 'RELEASE');
});

test('missing investment P&L update closes its transaction before releasing the client', async () => {
  const events = mockClient(async (sql) => {
    if (/SELECT \* FROM investment_pnl/.test(sql)) return { rows: [], rowCount: 0 };
    return { rows: [], rowCount: 0 };
  });

  assert.equal(await InvestmentPnLModel.update(404, { amount: 1000 }, 'u1'), null);
  assert.ok(events.includes('ROLLBACK'));
  assert.equal(events.at(-1), 'RELEASE');
});

test('investment P&L create remains successful when cache invalidation fails after commit', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const created = { id: 51, user_id: 'u1', wallet_id: 8, amount: 25000, wallet_currency: 'VND' };
  const events = mockClient(async (sql) => {
    if (/SELECT id, type, currency FROM wallets/.test(sql)) return { rows: [{ id: 8, type: 'investment', currency: 'VND' }], rowCount: 1 };
    if (/INSERT INTO investment_pnl/.test(sql)) return { rows: [created], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  });
  delImpl = async () => { throw new Error('cache unavailable'); };

  assert.deepEqual(await InvestmentPnLModel.create({ userId: 'u1', wallet_id: 8, amount: 25000 }), created);
  assert.ok(events.includes('COMMIT'));
  assert.equal(events.includes('ROLLBACK'), false);
  assert.equal(events.at(-1), 'RELEASE');
});

test('investment P&L rejects a future recorded date before opening a database transaction', async () => {
  let connections = 0;
  connectImpl = async () => {
    connections += 1;
    throw new Error('must not connect');
  };

  await assert.rejects(
    InvestmentPnLModel.create({ userId: 'u1', wallet_id: 8, amount: 25000, recorded_at: '2099-01-01' }),
    /Ngày ghi nhận lãi\/lỗ không được nằm trong tương lai/
  );
  await assert.rejects(
    InvestmentPnLModel.update(51, { amount: 30000, recorded_at: '2099-01-01' }, 'u1'),
    /Ngày ghi nhận lãi\/lỗ không được nằm trong tương lai/
  );
  assert.equal(connections, 0);
});

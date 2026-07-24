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

function ownedReferenceResult(sql, params, { categoryType = 'expense', walletBalance = '1000000' } = {}) {
  if (/FROM categories/.test(sql)) {
    return {
      rows: (params[0] || []).map((id) => ({ id, type: categoryType, name: 'Danh mục', icon: '📁' })),
      rowCount: (params[0] || []).length,
    };
  }
  if (/FROM wallets/.test(sql)) {
    return {
      rows: (params[0] || []).map((id) => ({ id, balance: walletBalance })),
      rowCount: (params[0] || []).length,
    };
  }
  return null;
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
  const events = mockClient(async (sql, params) => {
    const reference = ownedReferenceResult(sql, params);
    if (reference) return reference;
    if (/SELECT \* FROM transactions/.test(sql)) return { rows: [oldTransaction], rowCount: 1 };
    if (/UPDATE transactions\s+SET/.test(sql)) return { rows: [{ ...oldTransaction, amount: 25_000 }], rowCount: 1 };
    if (/UPDATE wallets/.test(sql)) return { rows: [{ balance: '995000' }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
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
  const events = mockClient(async (sql, params) => {
    const reference = ownedReferenceResult(sql, params);
    if (reference) return reference;
    if (/SELECT \* FROM transactions/.test(sql)) return { rows: [oldTransaction], rowCount: 1 };
    if (/UPDATE transactions\s+SET/.test(sql)) return { rows: [{ ...oldTransaction, amount: 35_000 }], rowCount: 1 };
    if (/UPDATE wallets/.test(sql)) return { rows: [{ balance: '995000' }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
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
  const events = mockClient(async (sql, params) => {
    const reference = ownedReferenceResult(sql, params);
    if (reference) return reference;
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

test('expense creation may take a wallet balance below zero', async () => {
  const created = {
    id: 10,
    user_id: 'u1',
    type: 'expense',
    amount: 150_000,
    wallet_id: 3,
    description: 'Chi vượt số dư',
    category_id: 4,
    transaction_date: '2026-07-16',
  };
  const events = mockClient(async (sql, params) => {
    const reference = ownedReferenceResult(sql, params, { walletBalance: '100000' });
    if (reference) return reference;
    if (/INSERT INTO transactions/.test(sql)) return { rows: [created], rowCount: 1 };
    if (/UPDATE wallets/.test(sql)) return { rows: [{ balance: '-50000' }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
  delImpl = async () => true;
  rootQueryImpl = async () => ({ rows: [], rowCount: 0 });

  const result = await TransactionModel.create({ ...created, userId: 'u1' });
  assert.equal(result.wallet_balance, -50_000);
  assert.ok(events.includes('COMMIT'));
  assert.equal(events.includes('ROLLBACK'), false);
});

test('update atomically moves the financial effect when wallet, type, and amount change', async () => {
  const oldTransaction = {
    id: 21,
    user_id: 'u1',
    type: 'expense',
    amount: 100_000,
    wallet_id: 1,
    description: 'Chi cũ',
    category_id: 10,
    transaction_date: '2026-07-16',
    note: null,
  };
  const walletWrites = [];
  rootQueryImpl = async () => ({ rows: [], rowCount: 0 });
  delImpl = async () => true;
  const events = mockClient(async (sql, params) => {
    if (/SELECT \* FROM transactions/.test(sql)) {
      assert.deepEqual(params, [21, 'u1']);
      return { rows: [oldTransaction], rowCount: 1 };
    }
    if (/FROM categories/.test(sql)) {
      assert.deepEqual(params, [[20], 'u1']);
      return { rows: [{ id: 20, type: 'income', name: 'Lương', icon: '💰' }], rowCount: 1 };
    }
    if (/FROM wallets/.test(sql)) {
      assert.deepEqual(params, [[1, 2], 'u1']);
      return { rows: [{ id: 1, balance: '900000' }, { id: 2, balance: '500000' }], rowCount: 2 };
    }
    if (/UPDATE transactions\s+SET/.test(sql)) {
      assert.equal(params[1], 'u1');
      assert.equal(params[8], 2);
      return {
        rows: [{ ...oldTransaction, amount: 150_000, type: 'income', category_id: 20, wallet_id: 2 }],
        rowCount: 1,
      };
    }
    if (/UPDATE wallets/.test(sql)) {
      walletWrites.push(params);
      return { rows: [{ balance: params[1] === 2 ? '650000' : '1000000' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });

  const result = await TransactionModel.update(21, {
    amount: 150_000,
    type: 'income',
    category_id: 20,
    wallet_id: 2,
  }, 'u1');

  assert.equal(result.wallet_id, 2);
  assert.equal(result.wallet_balance, 650000);
  assert.deepEqual(walletWrites, [
    [-100_000, 1, 'u1'],
    [150_000, 2, 'u1'],
  ]);
  assert.ok(events.includes('COMMIT'));
  assert.equal(events.includes('ROLLBACK'), false);
});

test('wallet failure during update rolls back transaction row and both balance effects', async () => {
  const oldTransaction = {
    id: 22,
    user_id: 'u1',
    type: 'expense',
    amount: 100_000,
    wallet_id: 1,
    description: 'Chi cũ',
    category_id: 10,
    transaction_date: '2026-07-16',
    note: null,
  };
  let walletWriteCount = 0;
  const events = mockClient(async (sql, params) => {
    if (/SELECT \* FROM transactions/.test(sql)) return { rows: [oldTransaction], rowCount: 1 };
    if (/FROM categories/.test(sql)) return { rows: [{ id: 10, type: 'expense' }], rowCount: 1 };
    if (/FROM wallets/.test(sql)) {
      return { rows: [{ id: 1, balance: '900000' }, { id: 2, balance: '500000' }], rowCount: 2 };
    }
    if (/UPDATE transactions\s+SET/.test(sql)) {
      return { rows: [{ ...oldTransaction, wallet_id: 2 }], rowCount: 1 };
    }
    if (/UPDATE wallets/.test(sql)) {
      walletWriteCount += 1;
      if (walletWriteCount === 2) throw new Error('wallet write failed');
      return { rows: [{ balance: '1000000' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });

  await assert.rejects(
    TransactionModel.update(22, { wallet_id: 2 }, 'u1'),
    /wallet write failed/
  );
  assert.ok(events.includes('ROLLBACK'));
  assert.equal(events.includes('COMMIT'), false);
  assert.equal(events.at(-1), 'RELEASE');
});

test('category ownership/type mismatch is rejected inside the update transaction', async () => {
  const oldTransaction = {
    id: 23,
    user_id: 'u1',
    type: 'expense',
    amount: 10_000,
    wallet_id: 1,
    description: 'Chi',
    category_id: 10,
    transaction_date: '2026-07-16',
  };
  const events = mockClient(async (sql) => {
    if (/SELECT \* FROM transactions/.test(sql)) return { rows: [oldTransaction], rowCount: 1 };
    if (/FROM categories/.test(sql)) return { rows: [{ id: 20, type: 'income' }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });

  await assert.rejects(
    TransactionModel.update(23, { category_id: 20 }, 'u1'),
    /Loại danh mục không khớp/
  );
  assert.ok(events.includes('ROLLBACK'));
  assert.equal(events.some((event) => event.startsWith('UPDATE transactions SET')), false);
});

test('get/category/delete/restore operations always scope id lookups to the caller', async () => {
  let rootParams;
  rootQueryImpl = async (sql, params) => {
    rootParams = params;
    assert.match(sql, /t\.user_id = \$2/);
    return { rows: [], rowCount: 0 };
  };
  assert.equal(await TransactionModel.getById(30, 'u2'), null);
  assert.deepEqual(rootParams, [30, 'u2']);

  let expectedOperation = 'category';
  const seen = [];
  mockClient(async (sql, params) => {
    if (/SELECT \* FROM transactions/.test(sql)) {
      seen.push({ expectedOperation, params });
      return { rows: [], rowCount: 0 };
    }
    if (/UPDATE transactions SET deleted_at/.test(sql)) {
      seen.push({ expectedOperation, params });
      return { rows: [], rowCount: 0 };
    }
    return { rows: [], rowCount: 0 };
  });

  assert.equal(await TransactionModel.updateCategory(31, 2, 'u2'), null);
  expectedOperation = 'delete';
  assert.equal(await TransactionModel.softDelete(32, 'u2'), null);
  expectedOperation = 'restore';
  assert.equal(await TransactionModel.restore(33, 'u2'), null);

  assert.deepEqual(seen, [
    { expectedOperation: 'category', params: [31, 'u2'] },
    { expectedOperation: 'delete', params: [32, 'u2'] },
    { expectedOperation: 'restore', params: [33, 'u2'] },
  ]);
});

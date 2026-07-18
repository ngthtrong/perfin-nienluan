const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateCategoryCreatePayload,
  validateCategoryUpdatePayload,
} = require('../services/categories/validation');

test('category create/update validation trims names and rejects type mutation', () => {
  assert.deepEqual(
    validateCategoryCreatePayload({ name: '  Bida  ', type: 'expense', icon: '🎱' }),
    { name: 'Bida', type: 'expense', icon: '🎱' }
  );
  assert.deepEqual(validateCategoryUpdatePayload({ name: '  Thể thao mới ' }), { name: 'Thể thao mới' });
  assert.throws(() => validateCategoryUpdatePayload({ type: 'income' }), /trường type/);
  assert.throws(() => validateCategoryUpdatePayload({ name: '   ' }), /Tên danh mục/);
});

test('category list exposes fresh active transaction_count scoped to the caller', async () => {
  const databasePath = require.resolve('../config/database');
  const kvPath = require.resolve('../services/store/kv.store');
  const modelPath = require.resolve('../models/category.model');
  const database = require(databasePath);
  const KVStore = require(kvPath);
  const originalQuery = database.query;
  const originalRemember = KVStore.remember;
  const calls = [];

  database.query = async (sql, params = []) => {
    const compact = String(sql).replace(/\s+/g, ' ').trim();
    calls.push({ sql: compact, params: [...params] });
    if (/INSERT INTO categories/.test(compact)) return { rows: [], rowCount: 0 };
    if (/SELECT id, name, type/.test(compact)) {
      return {
        rows: [
          { id: 1, name: 'Ăn uống', type: 'expense' },
          { id: 2, name: 'Bida', type: 'expense' },
        ],
        rowCount: 2,
      };
    }
    if (/COUNT\(\*\)::integer/.test(compact)) {
      return { rows: [{ category_id: 2, transaction_count: 7 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  };
  KVStore.remember = async (_key, _ttl, loader) => loader();
  delete require.cache[modelPath];
  const CategoryModel = require(modelPath);

  try {
    const categories = await CategoryModel.getAll('u1');
    assert.deepEqual(categories.map((item) => item.transaction_count), [0, 7]);
    const countCall = calls.find((call) => /COUNT\(\*\)::integer/.test(call.sql));
    assert.deepEqual(countCall.params, ['u1']);
    assert.match(countCall.sql, /deleted_at IS NULL/);
    assert.ok(calls.some((call) => /FROM categories WHERE user_id = \$1/.test(call.sql)));
  } finally {
    database.query = originalQuery;
    KVStore.remember = originalRemember;
    delete require.cache[modelPath];
  }
});

test('category delete atomically moves all owned references to same-type Khác and reports counts', async () => {
  const databasePath = require.resolve('../config/database');
  const kvPath = require.resolve('../services/store/kv.store');
  const modelPath = require.resolve('../models/category.model');
  const database = require(databasePath);
  const KVStore = require(kvPath);
  const originalConnect = database.pool.connect;
  const originalDel = KVStore.del;
  const events = [];

  const client = {
    async query(sql, params = []) {
      const compact = String(sql).replace(/\s+/g, ' ').trim();
      events.push({ sql: compact, params: [...params] });
      if (/SELECT \* FROM categories WHERE id/.test(compact)) {
        return { rows: [{ id: 12, user_id: 'u1', name: 'Bida', type: 'expense', is_default: false }], rowCount: 1 };
      }
      if (/SELECT \* FROM categories WHERE user_id/.test(compact)) {
        return { rows: [{ id: 99, user_id: 'u1', name: 'Khác', type: 'expense', icon: '📦', is_default: true }], rowCount: 1 };
      }
      if (/UPDATE transactions/.test(compact)) return { rows: [{ id: 1 }, { id: 2 }, { id: 3 }], rowCount: 3 };
      if (/UPDATE recurring_bills/.test(compact)) return { rows: [{ id: 8 }], rowCount: 1 };
      if (/SELECT \* FROM budgets WHERE category_id/.test(compact)) {
        return { rows: [{ id: 20, user_id: 'u1', month: 7, year: 2026, amount_limit: '500000' }], rowCount: 1 };
      }
      if (/SELECT \* FROM budgets WHERE user_id/.test(compact)) return { rows: [], rowCount: 0 };
      if (/DELETE FROM categories/.test(compact)) return { rows: [{ id: 12 }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    release() {
      events.push({ sql: 'RELEASE', params: [] });
    },
  };
  database.pool.connect = async () => client;
  KVStore.del = async () => true;
  delete require.cache[modelPath];
  const CategoryModel = require(modelPath);

  try {
    const result = await CategoryModel.delete(12, 'u1');
    assert.equal(result.reassigned_transactions, 3);
    assert.equal(result.reassigned_recurring_bills, 1);
    assert.equal(result.reassigned_budgets, 1);
    assert.equal(result.fallback_category.id, 99);
    assert.deepEqual(events.find((event) => /UPDATE transactions/.test(event.sql)).params, [99, 12, 'u1']);
    assert.deepEqual(events.find((event) => /UPDATE recurring_bills/.test(event.sql)).params, [99, 12, 'u1']);
    assert.ok(events.some((event) => event.sql === 'COMMIT'));
    assert.equal(events.some((event) => event.sql === 'ROLLBACK'), false);
    assert.equal(events.at(-1).sql, 'RELEASE');
  } finally {
    database.pool.connect = originalConnect;
    KVStore.del = originalDel;
    delete require.cache[modelPath];
  }
});

test('category delete rolls back without partial reassignment when a reference update fails', async () => {
  const databasePath = require.resolve('../config/database');
  const kvPath = require.resolve('../services/store/kv.store');
  const modelPath = require.resolve('../models/category.model');
  const database = require(databasePath);
  const KVStore = require(kvPath);
  const originalConnect = database.pool.connect;
  const originalDel = KVStore.del;
  const events = [];

  const client = {
    async query(sql) {
      const compact = String(sql).replace(/\s+/g, ' ').trim();
      events.push(compact);
      if (/SELECT \* FROM categories WHERE id/.test(compact)) {
        return { rows: [{ id: 12, user_id: 'u1', name: 'Bida', type: 'expense', is_default: false }], rowCount: 1 };
      }
      if (/SELECT \* FROM categories WHERE user_id/.test(compact)) {
        return { rows: [{ id: 99, name: 'Khác', type: 'expense', is_default: true }], rowCount: 1 };
      }
      if (/UPDATE transactions/.test(compact)) return { rows: [{ id: 1 }], rowCount: 1 };
      if (/UPDATE recurring_bills/.test(compact)) throw new Error('recurring update failed');
      return { rows: [], rowCount: 0 };
    },
    release() {
      events.push('RELEASE');
    },
  };
  database.pool.connect = async () => client;
  KVStore.del = async () => true;
  delete require.cache[modelPath];
  const CategoryModel = require(modelPath);

  try {
    await assert.rejects(CategoryModel.delete(12, 'u1'), /recurring update failed/);
    assert.ok(events.includes('ROLLBACK'));
    assert.equal(events.includes('COMMIT'), false);
    assert.equal(events.some((event) => /DELETE FROM categories/.test(event)), false);
    assert.equal(events.at(-1), 'RELEASE');
  } finally {
    database.pool.connect = originalConnect;
    KVStore.del = originalDel;
    delete require.cache[modelPath];
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');

// A DATE created at local midnight must remain the same calendar date in Viet Nam.
process.env.TZ = 'Asia/Ho_Chi_Minh';

const databasePath = require.resolve('../config/database');
const kvStorePath = require.resolve('../services/store/kv.store');
const modelPath = require.resolve('../models/recurringBill.model');
const database = require(databasePath);
const KVStore = require(kvStorePath);

let connectImpl = async () => {
  throw new Error('Unexpected database connection');
};
database.pool.connect = (...args) => connectImpl(...args);

delete require.cache[modelPath];
const RecurringBillModel = require(modelPath);

test('date-only formatting preserves local midnight and validates calendar dates', () => {
  const localMidnight = new Date(2026, 6, 16, 0, 0, 0, 0);
  assert.equal(RecurringBillModel.formatDateOnly(localMidnight), '2026-07-16');
  assert.equal(RecurringBillModel.formatDateOnly('2026-07-16'), '2026-07-16');
  assert.throws(() => RecurringBillModel.formatDateOnly('2026-02-31'), /Ngày không hợp lệ/);
});

test('recurring schedule validation applies weekly and month-day boundaries', () => {
  assert.deepEqual(
    RecurringBillModel.validateRecurringSchedule('weekly', '7'),
    { valid: true, errors: [], frequency: 'weekly', due_day: 7 }
  );
  assert.equal(RecurringBillModel.validateRecurringSchedule('weekly', 8).valid, false);
  assert.equal(RecurringBillModel.validateRecurringSchedule('monthly', 31).valid, true);
  assert.equal(RecurringBillModel.validateRecurringSchedule('quarterly', 1.5).valid, false);
  assert.equal(RecurringBillModel.validateRecurringSchedule('daily', 1).valid, false);
});

test('next due date uses local calendar arithmetic and clamps short months', () => {
  assert.equal(
    RecurringBillModel.computeNextDueDate('monthly', 31, '2026-01-31', false),
    '2026-02-28'
  );
  assert.equal(
    RecurringBillModel.computeNextDueDate('weekly', 1, '2026-07-13', false),
    '2026-07-20'
  );
  assert.equal(
    RecurringBillModel.computeNextDueDate('weekly', 1, '2026-07-13', true),
    '2026-07-13'
  );
});

test('create rejects an invalid schedule before issuing an INSERT', async () => {
  const originalQuery = database.pool.query;
  let queryCount = 0;
  database.pool.query = async () => {
    queryCount += 1;
    return { rows: [], rowCount: 0 };
  };

  try {
    await assert.rejects(
      RecurringBillModel.create({ name: 'Sai lịch', amount: 1000, frequency: 'weekly', due_day: 8 }),
      (error) => error.status === 400 && error.code === 'INVALID_RECURRING_SCHEDULE'
    );
    assert.equal(queryCount, 0);
  } finally {
    database.pool.query = originalQuery;
  }
});

test('update validates the merged schedule before issuing an UPDATE', async () => {
  const originalQuery = database.pool.query;
  const sqlEvents = [];
  database.pool.query = async (sql) => {
    const normalized = String(sql).replace(/\s+/g, ' ').trim();
    sqlEvents.push(normalized);
    if (normalized.startsWith('SELECT b.*, c.name')) {
      return {
        rows: [{ id: 5, frequency: 'weekly', due_day: 3, next_due_date: '2026-07-15' }],
        rowCount: 1,
      };
    }
    throw new Error(`Unexpected SQL: ${normalized}`);
  };

  try {
    await assert.rejects(
      RecurringBillModel.update(5, { due_day: 10 }),
      (error) => error.status === 400 && error.code === 'INVALID_RECURRING_SCHEDULE'
    );
    assert.equal(sqlEvents.length, 1);
    assert.ok(!sqlEvents.some((sql) => sql.startsWith('UPDATE recurring_bills')));
  } finally {
    database.pool.query = originalQuery;
  }
});

test('recordPayment rejects a future paid date before opening a database transaction', async () => {
  let connections = 0;
  connectImpl = async () => {
    connections += 1;
    throw new Error('must not connect');
  };

  await assert.rejects(
    RecurringBillModel.recordPayment(5, {
      paidDate: '2026-07-19',
      periodDueDate: '2026-07-15',
      today: new Date(2026, 6, 18, 23, 59),
    }),
    /Ngày thanh toán không được nằm trong tương lai/
  );
  assert.equal(connections, 0);
});

function createPaymentClient({ failWallet = false } = {}) {
  const events = [];
  const bill = {
    id: 5,
    user_id: 'u1',
    name: 'Internet',
    amount: '250000',
    category_id: 8,
    wallet_id: 3,
    frequency: 'monthly',
    due_day: 15,
    next_due_date: '2026-07-15',
  };
  const transaction = {
    id: 44,
    user_id: 'u1',
    description: 'Internet',
    amount: '250000',
    category_id: 8,
    wallet_id: 3,
    transaction_date: '2026-07-15',
  };

  const client = {
    async query(sql, params) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      events.push({ type: 'query', sql: normalized, params });
      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.includes('FOR UPDATE OF b')) return { rows: [{ ...bill }], rowCount: 1 };
      if (normalized.startsWith('INSERT INTO transactions')) return { rows: [{ ...transaction }], rowCount: 1 };
      if (normalized.startsWith('UPDATE wallets')) {
        return failWallet ? { rows: [], rowCount: 0 } : { rows: [{ balance: '750000' }], rowCount: 1 };
      }
      if (normalized.startsWith('INSERT INTO recurring_bill_payments')) return { rows: [], rowCount: 1 };
      if (normalized.startsWith('UPDATE recurring_bills')) {
        bill.next_due_date = params[1];
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith('SELECT b.*, c.name')) return { rows: [{ ...bill, wallet_name: 'Tiền mặt' }], rowCount: 1 };
      if (normalized.startsWith('SELECT t.*, c.name')) {
        return { rows: [{ ...transaction, wallet_name: 'Tiền mặt', wallet_balance: '750000' }], rowCount: 1 };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
    release() {
      events.push({ type: 'release' });
    },
  };
  return { client, events };
}

test('recordPayment commits transaction, wallet, payment, and period atomically before hydration', async () => {
  const { client, events } = createPaymentClient();
  connectImpl = async () => client;
  const originalDel = KVStore.del;
  KVStore.del = async (key) => {
    events.push({ type: 'cache-del', key });
    return true;
  };

  try {
    const result = await RecurringBillModel.recordPayment(5, {
      paidDate: '2026-07-16',
      period_due_date: '2026-07-15',
    });

    assert.equal(result.period_due_date, '2026-07-15');
    assert.equal(result.bill.next_due_date, '2026-08-15');
    assert.equal(result.transaction.id, 44);
    assert.equal(result.transaction.wallet_balance, 750000);

    const sqlEvents = events.filter((event) => event.type === 'query').map((event) => event.sql);
    assert.equal(sqlEvents[0], 'BEGIN');
    assert.match(sqlEvents[1], /FOR UPDATE OF b/);
    assert.ok(sqlEvents.indexOf('COMMIT') > sqlEvents.findIndex((sql) => sql.startsWith('UPDATE recurring_bills')));
    assert.ok(sqlEvents.findIndex((sql) => sql.startsWith('SELECT b.*, c.name')) > sqlEvents.indexOf('COMMIT'));
    assert.ok(events.findIndex((event) => event.type === 'cache-del') > events.findIndex((event) => event.sql === 'COMMIT'));
    assert.deepEqual(
      events.filter((event) => event.type === 'cache-del').map((event) => event.key).sort(),
      ['cache:insights:u1', 'cache:wallets:u1']
    );
    assert.equal(events.at(-1).type, 'release');
  } finally {
    KVStore.del = originalDel;
  }
});

test('recordPayment rejects a stale expected period with a 409 and rolls back', async () => {
  const { client, events } = createPaymentClient();
  connectImpl = async () => client;

  await assert.rejects(
    RecurringBillModel.recordPayment(5, { periodDueDate: '2026-06-15' }),
    (error) => error.status === 409 && error.code === 'RECURRING_PERIOD_CHANGED'
  );

  const sqlEvents = events.filter((event) => event.type === 'query').map((event) => event.sql);
  assert.deepEqual(sqlEvents, [
    'BEGIN',
    'SELECT b.* FROM recurring_bills b WHERE b.id = $1 AND b.user_id = $2 FOR UPDATE OF b',
    'ROLLBACK',
  ]);
  assert.equal(events.at(-1).type, 'release');
});

test('recordPayment requires an expected period so retries cannot pay the next cycle', async () => {
  const { client, events } = createPaymentClient();
  connectImpl = async () => client;

  await assert.rejects(
    RecurringBillModel.recordPayment(5),
    (error) => error.status === 400 && error.code === 'RECURRING_PERIOD_REQUIRED'
  );

  const sqlEvents = events.filter((event) => event.type === 'query').map((event) => event.sql);
  assert.deepEqual(sqlEvents, [
    'BEGIN',
    'SELECT b.* FROM recurring_bills b WHERE b.id = $1 AND b.user_id = $2 FOR UPDATE OF b',
    'ROLLBACK',
  ]);
  assert.equal(events.at(-1).type, 'release');
});

test('recordPayment rolls back every write when the selected wallet is invalid', async () => {
  const { client, events } = createPaymentClient({ failWallet: true });
  connectImpl = async () => client;

  await assert.rejects(
    RecurringBillModel.recordPayment(5, { periodDueDate: '2026-07-15' }),
    (error) => error.status === 400 && error.code === 'INVALID_PAYMENT_WALLET'
  );

  const sqlEvents = events.filter((event) => event.type === 'query').map((event) => event.sql);
  assert.ok(sqlEvents.some((sql) => sql.startsWith('INSERT INTO transactions')));
  assert.ok(sqlEvents.some((sql) => sql.startsWith('UPDATE wallets')));
  assert.ok(!sqlEvents.some((sql) => sql.startsWith('INSERT INTO recurring_bill_payments')));
  assert.ok(!sqlEvents.includes('COMMIT'));
  assert.equal(sqlEvents.at(-1), 'ROLLBACK');
  assert.equal(events.at(-1).type, 'release');
});

test('post-commit cache failure does not turn a durable payment into an API failure', async () => {
  const { client, events } = createPaymentClient();
  connectImpl = async () => client;
  const originalDel = KVStore.del;
  KVStore.del = async () => {
    throw new Error('redis unavailable');
  };

  try {
    const result = await RecurringBillModel.recordPayment(5, { periodDueDate: '2026-07-15' });
    assert.equal(result.transaction.id, 44);
    assert.ok(events.some((event) => event.type === 'query' && event.sql === 'COMMIT'));
    assert.ok(!events.some((event) => event.type === 'query' && event.sql === 'ROLLBACK'));
  } finally {
    KVStore.del = originalDel;
  }
});

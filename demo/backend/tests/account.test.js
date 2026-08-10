const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../config/database');
const kvPath = require.resolve('../services/store/kv.store');
const modelPath = require.resolve('../models/account.model');
const routePath = require.resolve('../routes/account.routes');
const database = require(databasePath);
const KVStore = require(kvPath);

const originalQuery = database.query;
const originalDel = KVStore.del;
let queryImpl = async () => ({ rows: [], rowCount: 0 });
let delImpl = async () => true;

database.query = (...args) => queryImpl(...args);
KVStore.del = (...args) => delImpl(...args);
delete require.cache[modelPath];
delete require.cache[routePath];

const AccountModel = require(modelPath);
const accountRoutes = require(routePath);
const errorMiddleware = require('../middleware/error.middleware');
const { normalizeWalletInput, validateWalletCreate } = require('../middleware/wallet.validation.middleware');

test.after(() => {
  database.query = originalQuery;
  KVStore.del = originalDel;
  delete require.cache[modelPath];
  delete require.cache[routePath];
});

test('wallet input normalization trims safe fields and rejects invalid schema values', () => {
  assert.deepEqual(
    normalizeWalletInput({ name: '  Ví ngân hàng  ', type: 'bank', balance: '125000.50', currency: 'VND' }),
    { name: 'Ví ngân hàng', type: 'bank', balance: 125000.5, currency: 'VND' }
  );
  assert.deepEqual(normalizeWalletInput({ name: 'Tiền dự phòng' }), {
    name: 'Tiền dự phòng',
    type: 'cash',
    balance: 0,
    currency: 'VND',
  });

  assert.throws(() => normalizeWalletInput({ name: '   ' }), /Tên ví/);
  assert.throws(() => normalizeWalletInput({ name: 'Ví', type: 'crypto' }), /Loại ví/);
  assert.throws(() => normalizeWalletInput({ name: 'Ví', currency: 'EUR' }), /Đơn vị tiền tệ/);
  assert.throws(() => normalizeWalletInput({ name: 'Ví', balance: '1.001' }), /tối đa 2/);
  assert.throws(() => normalizeWalletInput({ name: 'Ví', balance: 'not-a-number' }), /Số dư ban đầu/);
});

test('account model creates a non-default wallet in the supplied user scope', async () => {
  let insert;
  queryImpl = async (sql, params) => {
    insert = { sql: String(sql), params };
    return {
      rows: [{ id: 12, user_id: 'u1', name: 'Ví phụ', type: 'bank', balance: '250000', initial_balance: '250000', currency: 'VND', is_default: false }],
      rowCount: 1,
    };
  };
  delImpl = async () => true;

  const wallet = await AccountModel.create({ name: 'Ví phụ', type: 'bank', balance: 250000, currency: 'VND', userId: 'u1' });

  assert.equal(wallet.id, 12);
  assert.match(insert.sql, /initial_balance/);
  assert.deepEqual(insert.params, ['u1', 'Ví phụ', 'bank', 250000, 'VND', false]);
});

test('account model maps the database uniqueness constraint to a stable duplicate contract', async () => {
  queryImpl = async () => {
    const error = new Error('duplicate key value violates unique constraint');
    error.code = '23505';
    throw error;
  };

  await assert.rejects(
    AccountModel.create({ name: 'Tiền mặt', userId: 'default_user' }),
    (error) => error.status === 409 && error.code === 'WALLET_NAME_EXISTS' && error.message === 'Tên ví đã tồn tại'
  );
});

test('a cache outage after insert does not turn a durable wallet create into a failed request', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const created = { id: 14, user_id: 'u1', name: 'Ví offline', type: 'cash', balance: '0', currency: 'VND' };
  queryImpl = async () => ({ rows: [created], rowCount: 1 });
  delImpl = async () => {
    throw new Error('cache unavailable');
  };

  assert.deepEqual(await AccountModel.create({ name: 'Ví offline', userId: 'u1' }), created);
});

test('wallet reads and updates include the single-user ownership scope', async () => {
  const calls = [];
  queryImpl = async (sql, params) => {
    calls.push({ sql: String(sql), params });
    return { rows: [{ id: 9, user_id: 'default_user', name: 'Ví mới' }], rowCount: 1 };
  };
  delImpl = async () => true;

  await AccountModel.getById(9, 'default_user');
  await AccountModel.update(9, { name: 'Ví mới' }, 'default_user');

  assert.match(calls[0].sql, /id = \$1 AND user_id = \$2/);
  assert.deepEqual(calls[0].params, [9, 'default_user']);
  assert.match(calls[1].sql, /WHERE id = \$1 AND user_id = \$2/);
  assert.deepEqual(calls[1].params, [9, 'default_user', 'Ví mới']);
});

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function runWalletValidation(req, res) {
  let nextError;
  validateWalletCreate(req, res, (error) => {
    nextError = error;
  });
  return nextError;
}

test('POST /api/accounts returns 201 and ignores caller-supplied ownership/default flags', async () => {
  const originalCreate = AccountModel.create;
  let received;
  AccountModel.create = async (input) => {
    received = input;
    return { id: 21, user_id: input.userId, ...input, is_default: false };
  };

  try {
    const req = {
      body: {
        name: '  Ví chuyển khoản  ',
        type: 'bank',
        balance: '500000',
        currency: 'VND',
        userId: 'attacker',
        user_id: 'attacker',
        is_default: true,
      },
    };
    const res = responseRecorder();
    assert.equal(runWalletValidation(req, res), undefined);
    await accountRoutes.createWallet(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user_id, 'default_user');
    assert.deepEqual(received, {
      name: 'Ví chuyển khoản',
      type: 'bank',
      balance: 500000,
      currency: 'VND',
      userId: 'default_user',
    });
  } finally {
    AccountModel.create = originalCreate;
  }
});

test('POST /api/accounts exposes validation and duplicate errors with stable status/code fields', async (t) => {
  t.mock.method(console, 'error', () => {});
  const originalCreate = AccountModel.create;
  AccountModel.create = async () => {
    const error = new Error('Tên ví đã tồn tại');
    error.status = 409;
    error.code = 'WALLET_NAME_EXISTS';
    throw error;
  };

  try {
    const invalidReq = { body: { name: '', type: 'crypto' }, method: 'POST', originalUrl: '/api/accounts' };
    const invalidRes = responseRecorder();
    const validationError = runWalletValidation(invalidReq, invalidRes);
    errorMiddleware(validationError, invalidReq, invalidRes, () => {});
    assert.equal(invalidRes.statusCode, 400);
    assert.deepEqual(invalidRes.body, {
      success: false,
      error: 'Tên ví phải có từ 1 đến 100 ký tự',
      code: 'VALIDATION_ERROR',
    });

    const duplicateReq = { body: { name: 'Tiền mặt' }, method: 'POST', originalUrl: '/api/accounts' };
    const duplicateRes = responseRecorder();
    assert.equal(runWalletValidation(duplicateReq, duplicateRes), undefined);
    let duplicateError;
    await assert.rejects(
      accountRoutes.createWallet(duplicateReq, duplicateRes),
      (error) => {
        duplicateError = error;
        return error.status === 409 && error.code === 'WALLET_NAME_EXISTS';
      }
    );
    errorMiddleware(duplicateError, duplicateReq, duplicateRes, () => {});
    assert.equal(duplicateRes.statusCode, 409);
    assert.deepEqual(duplicateRes.body, {
      success: false,
      error: 'Tên ví đã tồn tại',
      code: 'WALLET_NAME_EXISTS',
    });
  } finally {
    AccountModel.create = originalCreate;
  }
});

test('Express forwards rejected async account handlers to the error middleware', async (t) => {
  t.mock.method(console, 'error', () => {});
  const originalCreate = AccountModel.create;
  AccountModel.create = async () => {
    const error = new Error('Tên ví đã tồn tại');
    error.status = 409;
    error.code = 'WALLET_NAME_EXISTS';
    throw error;
  };

  try {
    const req = {
      method: 'POST',
      url: '/',
      originalUrl: '/api/accounts',
      body: { name: 'Tiền mặt' },
    };
    const res = responseRecorder();
    await new Promise((resolve, reject) => {
      accountRoutes.handle(req, res, (error) => {
        try {
          errorMiddleware(error, req, res, () => {});
          resolve();
        } catch (handlerError) {
          reject(handlerError);
        }
      });
    });
    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, {
      success: false,
      error: 'Tên ví đã tồn tại',
      code: 'WALLET_NAME_EXISTS',
    });
  } finally {
    AccountModel.create = originalCreate;
  }
});

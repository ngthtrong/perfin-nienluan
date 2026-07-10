const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../config/database');
const modelPath = require.resolve('../models/goal.model');
const database = require(databasePath);

let queryImpl = async () => ({ rows: [], rowCount: 0 });
database.query = (...args) => queryImpl(...args);
delete require.cache[modelPath];
const GoalModel = require(modelPath);

test('create preserves explicit zero values instead of converting them to null', async () => {
  let captured;
  queryImpl = async (sql, params) => {
    captured = { sql, params };
    return { rows: [{ id: 1 }], rowCount: 1 };
  };
  await GoalModel.create({
    name: 'Goal',
    target_amount: 1_000,
    current_amount: 0,
    monthly_contribution: 0,
    annual_interest_rate: 0,
  }, 'u1');

  assert.equal(captured.params[4], 0);
  assert.equal(captured.params[6], 0);
  assert.equal(captured.params[7], 0);
});

test('update emits only supplied fields and supports explicit null and zero', async () => {
  let captured;
  queryImpl = async (sql, params) => {
    captured = { sql, params };
    return { rows: [{ id: 3 }], rowCount: 1 };
  };
  await GoalModel.update(3, {
    current_amount: 0,
    target_date: null,
    monthly_contribution: null,
    note: null,
  }, 'u1');

  assert.match(captured.sql, /current_amount = \$3/);
  assert.match(captured.sql, /target_date = \$4/);
  assert.match(captured.sql, /monthly_contribution = \$5/);
  assert.match(captured.sql, /note = \$6/);
  assert.doesNotMatch(captured.sql, /name =/);
  assert.deepEqual(captured.params, [3, 'u1', 0, null, null, null]);
});

test('update applies PostgreSQL enum casts to type and status', async () => {
  let capturedSql;
  queryImpl = async (sql) => {
    capturedSql = sql;
    return { rows: [{ id: 2 }], rowCount: 1 };
  };
  await GoalModel.update(2, { goal_type: 'purchase', status: 'paused' }, 'u1');
  assert.match(capturedSql, /goal_type = \$3::goal_type/);
  assert.match(capturedSql, /status = \$4::goal_status/);
});

test('remove reports whether a row was actually cancelled', async () => {
  queryImpl = async () => ({ rows: [], rowCount: 0 });
  assert.deepEqual(await GoalModel.remove(99, 'u1'), { success: false, id: null });

  queryImpl = async () => ({ rows: [{ id: 4 }], rowCount: 1 });
  assert.deepEqual(await GoalModel.remove(4, 'u1'), { success: true, id: 4 });
});

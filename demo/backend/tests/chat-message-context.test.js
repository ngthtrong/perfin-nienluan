const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../config/database');
const modelPath = require.resolve('../models/chatMessage.model');
const database = require(databasePath);
const originalQuery = database.query;

let queryImpl = async () => ({ rows: [], rowCount: 0 });
database.query = (...args) => queryImpl(...args);
delete require.cache[modelPath];
const ChatMessage = require(modelPath);

test.after(() => {
  database.query = originalQuery;
  delete require.cache[modelPath];
});

test('category retag referents expire instead of pointing to an old chat action', async () => {
  queryImpl = async (sql, params) => {
    assert.match(sql, /INTERVAL '24 hours'/);
    assert.match(sql, /category_retag/);
    assert.deepEqual(params, ['u-chat']);
    return { rows: [], rowCount: 0 };
  };

  assert.equal(await ChatMessage.getLatestCategoryRetagContext('u-chat'), null);
});

test('recurring acknowledgement context is restricted to the reminder local date', async () => {
  queryImpl = async (sql, params) => {
    assert.match(sql, /metadata->>'local_date' = \$2/);
    assert.deepEqual(params, ['u-chat', '2026-07-17']);
    return { rows: [{ metadata: { bill_ids: [73], local_date: '2026-07-17' } }], rowCount: 1 };
  };

  const result = await ChatMessage.getLatestRecurringReminderContext('u-chat', '2026-07-17');
  assert.deepEqual(result.metadata.bill_ids, [73]);
});

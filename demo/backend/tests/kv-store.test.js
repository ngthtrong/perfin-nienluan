const test = require('node:test');
const assert = require('node:assert/strict');

process.env.REDIS_ENABLED = 'false';
const KVStore = require('../services/store/kv.store');
const ConversationState = require('../services/conversationState.service');

test('KV fallback persists JSON state and increments rate counters', async () => {
  await KVStore.set('test:json', { ok: true }, 30);
  assert.deepEqual(await KVStore.get('test:json'), { ok: true });
  const first = await KVStore.increment('test:counter', 30);
  const second = await KVStore.increment('test:counter', 30);
  assert.equal(first.value, 1);
  assert.equal(second.value, 2);
  assert.ok(second.ttl > 0);
  await Promise.all([KVStore.del('test:json'), KVStore.del('test:counter')]);
});

test('conversation state collects fields and can be cleared', async () => {
  await ConversationState.start('test-user', { intent: 'transaction', awaiting: ['amount'], collected: { transaction: { description: 'phở' } } });
  await ConversationState.collect('test-user', { amount: 50000 });
  const state = await ConversationState.get('test-user');
  assert.equal(state.intent, 'transaction');
  assert.equal(state.collected.amount, 50000);
  await ConversationState.clear('test-user');
  assert.equal(await ConversationState.get('test-user'), null);
});

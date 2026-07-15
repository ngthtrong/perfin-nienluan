const test = require('node:test');
const assert = require('node:assert/strict');

process.env.REDIS_ENABLED = 'false';
const KVStore = require('../services/store/kv.store');
const ConversationState = require('../services/conversationState.service');
const PendingTransaction = require('../services/pendingTransaction.service');

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

test('setIfAbsent never overwrites an active value', async () => {
  const key = 'test:set-if-absent';
  await KVStore.del(key);
  assert.equal(await KVStore.setIfAbsent(key, { version: 1 }, 30), true);
  assert.equal(await KVStore.setIfAbsent(key, { version: 2 }, 30), false);
  assert.deepEqual(await KVStore.get(key), { version: 1 });
  await KVStore.del(key);
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

test('pending claim is atomic under concurrent confirmations', async () => {
  const userId = 'test-claim-user';
  await PendingTransaction.clear(userId);
  const pendingId = await PendingTransaction.set(userId, { amount: 50_000 });

  const claims = await Promise.all([
    PendingTransaction.claim(userId, pendingId),
    PendingTransaction.claim(userId, pendingId),
  ]);

  assert.equal(claims.filter(Boolean).length, 1);
  assert.equal(claims.find(Boolean).id, pendingId);
  assert.equal(await PendingTransaction.get(userId), null);
});

test('claim with a stale id does not consume the current pending item', async () => {
  const userId = 'test-stale-claim-user';
  await PendingTransaction.clear(userId);
  const pendingId = await PendingTransaction.set(userId, { amount: 75_000 });

  assert.equal(await PendingTransaction.claim(userId, 'stale-id'), null);
  assert.equal((await PendingTransaction.get(userId)).id, pendingId);
  assert.equal((await PendingTransaction.claim(userId, pendingId)).id, pendingId);
});

test('an editor cannot recreate a pending item after confirmation claimed it', async () => {
  const userId = 'test-edit-after-claim-user';
  await PendingTransaction.clear(userId);
  const pendingId = await PendingTransaction.set(userId, { amount: 100_000 });

  assert.equal((await PendingTransaction.claim(userId, pendingId)).id, pendingId);
  assert.equal(await PendingTransaction.update(userId, { amount: 120_000 }, pendingId), null);
  assert.equal(await PendingTransaction.get(userId), null);
});

test('an edit cannot overwrite a newer pending preview', async () => {
  const userId = 'test-edit-newer-preview-user';
  await PendingTransaction.clear(userId);
  const firstId = await PendingTransaction.set(userId, { amount: 100_000 });
  const originalSetIfAbsent = KVStore.setIfAbsent;

  KVStore.setIfAbsent = async (key, value, ttl) => {
    KVStore.setIfAbsent = originalSetIfAbsent;
    await PendingTransaction.set(userId, { amount: 200_000 });
    return originalSetIfAbsent.call(KVStore, key, value, ttl);
  };

  try {
    assert.equal(await PendingTransaction.update(userId, { amount: 120_000 }, firstId), null);
    const current = await PendingTransaction.get(userId);
    assert.equal(current.data.amount, 200_000);
    assert.notEqual(current.id, firstId);
  } finally {
    KVStore.setIfAbsent = originalSetIfAbsent;
    await PendingTransaction.clear(userId);
  }
});

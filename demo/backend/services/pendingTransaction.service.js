// Pending transaction/recurring-bill state, backed by the unified KV store
// (Redis when available, in-memory fallback otherwise). TTL is enforced by the
// store itself, so no manual expiry bookkeeping is needed.
//
// NOTE: the API is now async (get/set/update/clear all return promises) because the
// backing store may be Redis. Call sites must await.

const KVStore = require('./store/kv.store');

const TTL_SECONDS = 5 * 60; // 5 minutes, matches the documented pending window
const keyFor = (userId) => `pending:${userId}`;

async function mutate(userId, expectedId, mutator) {
  const key = keyFor(userId);
  const item = await KVStore.take(key, expectedId);
  if (!item) return null;

  try {
    const next = mutator(item);
    const restored = await KVStore.setIfAbsent(key, next, TTL_SECONDS);
    return restored ? next : null;
  } catch (error) {
    // Validation failed before any business side effect. Restore the exact item so
    // the user can correct their edit instead of losing the preview. Never replace
    // a newer preview that another request has already created.
    await KVStore.setIfAbsent(key, item, TTL_SECONDS);
    throw error;
  }
}

module.exports = {
  async set(userId, data, kind = 'transaction', metadata = {}) {
    const pendingId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await KVStore.set(keyFor(userId), { id: pendingId, kind, data, metadata, createdAt: Date.now() }, TTL_SECONDS);
    return pendingId;
  },

  async get(userId) {
    return KVStore.get(keyFor(userId));
  },

  async claim(userId, pendingId = null) {
    return KVStore.take(keyFor(userId), pendingId);
  },

  async update(userId, updates, pendingId = null) {
    return mutate(userId, pendingId, (item) => ({
      ...item,
      data: { ...item.data, ...updates },
    }));
  },

  async updateAt(userId, index, updates, pendingId = null) {
    return mutate(userId, pendingId, (item) => {
      if (item.kind !== 'transactions' || !Array.isArray(item.data) || !item.data[index]) {
        const error = new Error('Vị trí giao dịch không hợp lệ');
        error.status = 400;
        throw error;
      }
      const next = [...item.data];
      next[index] = { ...next[index], ...updates };
      return { ...item, data: next };
    });
  },

  async clear(userId) {
    await KVStore.del(keyFor(userId));
  },
};

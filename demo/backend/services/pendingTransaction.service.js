// Pending transaction/recurring-bill state, backed by the unified KV store
// (Redis when available, in-memory fallback otherwise). TTL is enforced by the
// store itself, so no manual expiry bookkeeping is needed.
//
// NOTE: the API is now async (get/set/update/clear all return promises) because the
// backing store may be Redis. Call sites must await.

const KVStore = require('./store/kv.store');

const TTL_SECONDS = 5 * 60; // 5 minutes, matches the documented pending window
const keyFor = (userId) => `pending:${userId}`;

module.exports = {
  async set(userId, data, kind = 'transaction', metadata = {}) {
    const pendingId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await KVStore.set(keyFor(userId), { id: pendingId, kind, data, metadata, createdAt: Date.now() }, TTL_SECONDS);
    return pendingId;
  },

  async get(userId) {
    return KVStore.get(keyFor(userId));
  },

  async update(userId, updates) {
    const item = await this.get(userId);
    if (!item) return null;
    item.data = { ...item.data, ...updates };
    await KVStore.set(keyFor(userId), item, TTL_SECONDS);
    return item;
  },

  async clear(userId) {
    await KVStore.del(keyFor(userId));
  },
};

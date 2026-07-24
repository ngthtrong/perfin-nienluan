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

function metadataAfterUpdate(item, options, context) {
  if (typeof options?.updateMetadata !== 'function') return item.metadata;
  const metadata = options.updateMetadata(item.metadata || {}, context);
  if (metadata === undefined) return item.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    const error = new Error('Metadata giao dịch chờ không hợp lệ');
    error.status = 400;
    throw error;
  }
  return metadata;
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

  async update(userId, updates, pendingId = null, options = {}) {
    return mutate(userId, pendingId, (item) => {
      const data = { ...item.data, ...updates };
      return {
        ...item,
        data,
        metadata: metadataAfterUpdate(item, options, { item, previous: item.data, next: data }),
      };
    });
  },

  async updateAt(userId, index, updates, pendingId = null, options = {}) {
    return mutate(userId, pendingId, (item) => {
      if (item.kind !== 'transactions' || !Array.isArray(item.data) || !item.data[index]) {
        const error = new Error('Vị trí giao dịch không hợp lệ');
        error.status = 400;
        throw error;
      }
      const next = [...item.data];
      next[index] = { ...next[index], ...updates };
      return {
        ...item,
        data: next,
        metadata: metadataAfterUpdate(item, options, {
          item,
          index,
          previous: item.data[index],
          next: next[index],
        }),
      };
    });
  },

  async clear(userId) {
    await KVStore.del(keyFor(userId));
  },
};

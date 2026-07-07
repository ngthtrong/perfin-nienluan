// Conversation / clarification state (Flows 12, 13, 15).
//
// Fixes the documented weakness "không có state lưu lại giữa các vòng": instead of
// re-parsing every turn from scratch, we persist what the assistant is currently
// waiting for (a missing amount, an ambiguous bill choice, ...) so the next user
// message is merged into that context.
//
// Shape stored under `convo:{userId}`:
//   {
//     intent,               // e.g. 'transaction' | 'recurring_pay' | 'recurring_pause'
//     awaiting,             // e.g. 'amount' | 'bill_choice' | 'due_day'
//     collected,            // fields gathered so far { description, amount, ... }
//     candidates,           // for disambiguation: [{ id, name }]
//     createdAt
//   }

const KVStore = require('./store/kv.store');

const TTL_SECONDS = 5 * 60;
const keyFor = (userId) => `convo:${userId}`;

module.exports = {
  async get(userId) {
    return KVStore.get(keyFor(userId));
  },

  async start(userId, state) {
    const payload = { ...state, createdAt: Date.now() };
    await KVStore.set(keyFor(userId), payload, TTL_SECONDS);
    return payload;
  },

  // Merge new fields into the collected slot-fill bag, refreshing TTL.
  async collect(userId, fields) {
    const current = (await this.get(userId)) || { collected: {}, createdAt: Date.now() };
    current.collected = { ...(current.collected || {}), ...fields };
    await KVStore.set(keyFor(userId), current, TTL_SECONDS);
    return current;
  },

  async clear(userId) {
    await KVStore.del(keyFor(userId));
  },
};

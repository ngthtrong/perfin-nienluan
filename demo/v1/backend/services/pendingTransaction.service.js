const pending = new Map();
const TTL = 5 * 60 * 1000;

function isExpired(item) {
  return !item || Date.now() - item.createdAt > TTL;
}

module.exports = {
  set(userId, data) {
    const pendingId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    pending.set(userId, { id: pendingId, data, createdAt: Date.now() });
    return pendingId;
  },
  get(userId) {
    const item = pending.get(userId);
    if (isExpired(item)) {
      pending.delete(userId);
      return null;
    }
    return item;
  },
  update(userId, updates) {
    const item = this.get(userId);
    if (!item) return null;
    item.data = { ...item.data, ...updates };
    pending.set(userId, item);
    return item;
  },
  clear(userId) {
    pending.delete(userId);
  },
};

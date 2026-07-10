// Unified key/value store with TTL. Backed by Redis when available, otherwise an
// in-memory Map with lazy expiry. All values are JSON-serialized. TTL is in seconds.
//
// This is the single abstraction the rest of the app uses for ephemeral state
// (pending transactions, conversation/clarification context) and caching
// (categories, wallets, LLM results). Swapping infra never touches call sites.

const { getClient } = require('./redis.client');

// ── In-memory fallback ────────────────────────────────────────────────────────
const mem = new Map(); // key -> { value, expiresAt|null }

function memGet(key) {
  const item = mem.get(key);
  if (!item) return null;
  if (item.expiresAt && Date.now() > item.expiresAt) {
    mem.delete(key);
    return null;
  }
  return item.value;
}

function memSet(key, value, ttlSeconds) {
  mem.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
}

// Periodic sweep so the fallback map does not grow unbounded in long-running dev servers.
const SWEEP_MS = 60 * 1000;
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, item] of mem) {
    if (item.expiresAt && now > item.expiresAt) mem.delete(key);
  }
}, SWEEP_MS);
if (sweeper.unref) sweeper.unref();

// ── Public API ─────────────────────────────────────────────────────────────────
const KVStore = {
  async get(key) {
    const client = await getClient();
    if (client) {
      try {
        const raw = await client.get(key);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        console.warn(`[kv] redis get failed (${err.message}) — falling back`);
      }
    }
    return memGet(key);
  },

  async set(key, value, ttlSeconds = null) {
    const client = await getClient();
    if (client) {
      try {
        const raw = JSON.stringify(value);
        if (ttlSeconds) await client.set(key, raw, 'EX', ttlSeconds);
        else await client.set(key, raw);
        return true;
      } catch (err) {
        console.warn(`[kv] redis set failed (${err.message}) — falling back`);
      }
    }
    memSet(key, value, ttlSeconds);
    return true;
  },

  async del(key) {
    const client = await getClient();
    if (client) {
      try {
        await client.del(key);
      } catch (err) {
        console.warn(`[kv] redis del failed (${err.message})`);
      }
    }
    mem.delete(key);
    return true;
  },

  // Merge a partial object into an existing stored object, preserving remaining TTL
  // when possible (in-memory keeps the original expiry; Redis re-reads then re-sets).
  async merge(key, patch, ttlSeconds = null) {
    const current = (await this.get(key)) || {};
    const next = { ...current, ...patch };
    await this.set(key, next, ttlSeconds);
    return next;
  },

  // Cache-aside helper: return cached value or compute+store it.
  async remember(key, ttlSeconds, producer) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) return cached;
    const fresh = await producer();
    if (fresh !== null && fresh !== undefined) await this.set(key, fresh, ttlSeconds);
    return fresh;
  },

  // Fixed-window counter used for lightweight API rate limits. Redis executes the
  // increment/first-expiry atomically; the development fallback keeps the same API.
  async increment(key, ttlSeconds = 60) {
    const client = await getClient();
    if (client) {
      try {
        const result = await client.eval(
          `local value = redis.call('INCR', KEYS[1])
           if value == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
           return {value, redis.call('TTL', KEYS[1])}`,
          1,
          key,
          String(ttlSeconds)
        );
        return { value: Number(result[0]), ttl: Number(result[1]) };
      } catch (err) {
        console.warn(`[kv] redis increment failed (${err.message}) — falling back`);
      }
    }
    const current = mem.get(key);
    const now = Date.now();
    const active = current && (!current.expiresAt || current.expiresAt > now) ? Number(current.value) || 0 : 0;
    const expiresAt = active > 0 && current.expiresAt ? current.expiresAt : now + ttlSeconds * 1000;
    const value = active + 1;
    mem.set(key, { value, expiresAt });
    return { value, ttl: Math.max(0, Math.ceil((expiresAt - now) / 1000)) };
  },
};

module.exports = KVStore;

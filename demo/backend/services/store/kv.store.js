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

// Set only when no active value exists. The check and write are synchronous in
// the single-process fallback, matching Redis SET NX semantics.
function memSetIfAbsent(key, value, ttlSeconds) {
  if (memGet(key) !== null) return false;
  memSet(key, value, ttlSeconds);
  return true;
}

// Read-and-delete without yielding between the comparison and deletion. This is
// atomic within the single Node.js process used by the development fallback.
function memTake(key, expectedId = null) {
  const value = memGet(key);
  if (value === null || value === undefined) return null;
  if (expectedId !== null && expectedId !== undefined) {
    if (!value || String(value.id) !== String(expectedId)) return null;
  }
  mem.delete(key);
  return value;
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

  // Atomically set a value only when the key does not already exist. Pending
  // editors use this after claiming an item so they cannot overwrite a newer
  // preview that arrived while the edit was being validated.
  async setIfAbsent(key, value, ttlSeconds = null) {
    const client = await getClient();
    if (client) {
      try {
        const raw = JSON.stringify(value);
        const result = ttlSeconds
          ? await client.set(key, raw, 'EX', ttlSeconds, 'NX')
          : await client.set(key, raw, 'NX');
        return result === 'OK';
      } catch (err) {
        console.warn(`[kv] redis setIfAbsent failed (${err.message}) — falling back`);
      }
    }
    return memSetIfAbsent(key, value, ttlSeconds);
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

  // Atomically return and remove a value. When expectedId is supplied, deletion
  // occurs only if the stored JSON object's id matches. Pending confirmations use
  // this as a claim operation so two concurrent requests cannot execute the same
  // side effect.
  async take(key, expectedId = null) {
    const client = await getClient();
    if (client) {
      try {
        const compareId = expectedId !== null && expectedId !== undefined;
        const raw = await client.eval(
          `local raw = redis.call('GET', KEYS[1])
           if not raw then return nil end
           if ARGV[1] == '1' then
             local ok, value = pcall(cjson.decode, raw)
             if not ok or type(value) ~= 'table' or tostring(value.id) ~= ARGV[2] then
               return nil
             end
           end
           redis.call('DEL', KEYS[1])
           return raw`,
          1,
          key,
          compareId ? '1' : '0',
          compareId ? String(expectedId) : ''
        );
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        console.warn(`[kv] redis take failed (${err.message}) — falling back`);
      }
    }
    return memTake(key, expectedId);
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

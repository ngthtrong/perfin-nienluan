// Redis connection wrapper with graceful degradation.
// If ioredis is not installed OR no server is reachable, every method resolves to a
// "miss" so callers transparently fall back to the in-memory store. This keeps the app
// runnable with zero infra while upgrading to real Redis the moment it is available.

let clientPromise = null;
let disabled = false;

function isEnabled() {
  const flag = String(process.env.REDIS_ENABLED || '').trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(flag)) return false;
  return true; // default on; still degrades gracefully if unreachable
}

function loadIoredis() {
  try {
    return require('ioredis');
  } catch (_) {
    return null;
  }
}

async function getClient() {
  if (disabled || !isEnabled()) return null;
  if (clientPromise) return clientPromise;

  const Redis = loadIoredis();
  if (!Redis) {
    disabled = true;
    console.warn('[redis] ioredis not installed — using in-memory store fallback');
    return null;
  }

  clientPromise = new Promise((resolve) => {
    const url = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null, // do not spam reconnects; degrade instead
    });
    client.on('error', (err) => {
      if (!disabled) {
        disabled = true;
        console.warn(`[redis] unavailable (${err.code || err.message}) — using in-memory fallback`);
      }
    });
    client.connect()
      .then(() => {
        console.log('[redis] connected');
        resolve(client);
      })
      .catch((err) => {
        disabled = true;
        console.warn(`[redis] connect failed (${err.code || err.message}) — using in-memory fallback`);
        resolve(null);
      });
  });

  return clientPromise;
}

async function isAvailable() {
  const client = await getClient();
  return Boolean(client);
}

module.exports = { getClient, isAvailable };

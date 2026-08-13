// Vai trò: Quản lý một kết nối Redis dùng chung với cơ chế degrade có kiểm soát.
// Luồng chính: lazy-connect ioredis, cooldown sau lỗi và báo unavailable để KV store fallback.
// Thiếu Redis không làm backend mất khả năng chạy các luồng không bắt buộc queue.

let clientPromise = null;
let activeClient = null;
let retryAfter = 0;
let warnedUnavailable = false;

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
  if (!isEnabled()) return null;
  if (activeClient?.status === 'ready') return activeClient;
  if (clientPromise) return clientPromise;
  if (Date.now() < retryAfter) return null;

  const Redis = loadIoredis();
  if (!Redis) {
    if (!warnedUnavailable) console.warn('[redis] ioredis not installed — using in-memory store fallback');
    warnedUnavailable = true;
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
    const markDisconnected = () => {
      if (activeClient === client) activeClient = null;
      clientPromise = null;
      retryAfter = Date.now() + Number(process.env.REDIS_RETRY_COOLDOWN_MS || 5000);
    };
    client.on('error', (err) => {
      if (!warnedUnavailable) console.warn(`[redis] unavailable (${err.code || err.message}) — using in-memory fallback`);
      warnedUnavailable = true;
    });
    client.on('close', markDisconnected);
    client.on('end', markDisconnected);
    client.connect()
      .then(() => {
        activeClient = client;
        warnedUnavailable = false;
        retryAfter = 0;
        console.log('[redis] connected');
        resolve(client);
      })
      .catch((err) => {
        markDisconnected();
        if (!warnedUnavailable) console.warn(`[redis] connect failed (${err.code || err.message}) — using in-memory fallback`);
        warnedUnavailable = true;
        resolve(null);
      });
  });

  return clientPromise;
}

async function isAvailable() {
  const client = await getClient();
  return Boolean(client);
}

async function close() {
  const client = activeClient;
  activeClient = null;
  clientPromise = null;
  retryAfter = 0;
  if (client && client.status !== 'end') client.disconnect();
}

module.exports = { getClient, isAvailable, close };

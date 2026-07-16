const { pool } = require('../config/database');
const RedisClient = require('./store/redis.client');

function isEnabled(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

async function measure(check) {
  const startedAt = Date.now();
  try {
    const detail = await check();
    return { ok: true, latency_ms: Date.now() - startedAt, ...detail };
  } catch (error) {
    return {
      ok: false,
      latency_ms: Date.now() - startedAt,
      error: error.code || error.message || 'unknown_error',
    };
  }
}

async function checkDatabase() {
  return measure(async () => {
    await pool.query('SELECT 1');
    return { status: 'ready' };
  });
}

async function checkRedis(env = process.env) {
  if (!isEnabled(env.REDIS_ENABLED, true)) {
    return { ok: true, status: 'disabled', latency_ms: 0 };
  }

  return measure(async () => {
    const available = await RedisClient.isAvailable();
    if (!available) return { ok: false, status: 'unavailable' };
    return { status: 'ready' };
  });
}

async function getReadiness({ env = process.env } = {}) {
  const [database, redis] = await Promise.all([
    checkDatabase(),
    checkRedis(env),
  ]);
  const jobsEnabled = isEnabled(env.JOBS_ENABLED, true);
  const redisRequired = isEnabled(env.READINESS_REQUIRE_REDIS, false);
  const ready = database.ok && (!redisRequired || redis.ok);
  const degraded = ready && jobsEnabled && redis.status === 'unavailable';

  return {
    ready,
    status: ready ? (degraded ? 'degraded' : 'ready') : 'not_ready',
    timestamp: new Date().toISOString(),
    dependencies: {
      database,
      redis,
    },
    capabilities: {
      core_api: database.ok ? 'ready' : 'unavailable',
      ephemeral_state: redis.status === 'ready' ? 'redis' : 'in_memory_fallback',
      proactive_jobs: jobsEnabled
        ? (redis.status === 'ready' ? 'ready' : 'disabled_redis_unavailable')
        : 'disabled_by_config',
    },
  };
}

module.exports = {
  checkDatabase,
  checkRedis,
  getReadiness,
  isEnabled,
  measure,
};

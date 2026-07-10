#!/usr/bin/env node
require('dotenv').config();

const { startJobWorker } = require('../services/jobs');
const { pool } = require('../config/database');
const { getClient } = require('../services/store/redis.client');

async function closeSharedResources({ closeRedis = true } = {}) {
  if (closeRedis) {
    const redis = await getClient().catch(() => null);
    if (redis && redis.status !== 'end') redis.disconnect();
  }
  await pool.end().catch(() => {});
}

async function main() {
  const runtime = await startJobWorker();
  if (!runtime.available) {
    console.warn(`[jobs] not started (${runtime.reason})`);
    // A deliberately disabled worker must not initialize a Redis connection only
    // to close it again.
    await closeSharedResources({ closeRedis: runtime.reason !== 'jobs_disabled' });
    return;
  }

  const active = runtime.schedules.filter((item) => item.enabled);
  console.log(`[jobs] worker ready; ${active.length} scheduler(s) active`);
  for (const item of active) {
    console.log(`[jobs] ${item.name}: ${item.pattern} (${item.timezone})`);
  }

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[jobs] received ${signal}; waiting for active jobs to finish`);
    await runtime.close(false).catch((error) => console.error(`[jobs] shutdown error: ${error.message}`));
    await closeSharedResources();
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(async (error) => {
  console.error(`[jobs] fatal: ${error.stack || error.message}`);
  process.exitCode = 1;
  await closeSharedResources();
});

// Vai trò: Khởi động BullMQ worker, processor và các scheduler chủ động.
// Luồng chính: kiểm tra cấu hình/Redis, đồng bộ lịch, tạo worker và trả hàm đóng tài nguyên.

const { Worker } = require('bullmq');
const { getClient } = require('../store/redis.client');
const { QUEUE_NAME } = require('./constants');
const { booleanFromEnv, getScheduleDefinitions, getWorkerOptions } = require('./schedules');
const { syncJobSchedulers } = require('./scheduler');
const { createJobProcessor, createHandlers } = require('./processor');
const { createDedicatedConnection, getQueueRuntime, closeJobQueue } = require('./queue');

function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Dựng toàn bộ worker runtime hoặc trả trạng thái unavailable khi jobs/Redis chưa sẵn sàng.
async function startJobWorker({ env = process.env, logger = console, handlers = null } = {}) {
  if (!booleanFromEnv(env.JOBS_ENABLED, true)) {
    return { available: false, reason: 'jobs_disabled', schedules: [], close: async () => {} };
  }

  const baseClient = await getClient();
  if (!baseClient) {
    logger.warn?.('[jobs] Redis unavailable; proactive worker is disabled. API fallback remains operational.');
    return { available: false, reason: 'redis_unavailable', schedules: [], close: async () => {} };
  }

  const workerOptions = getWorkerOptions(env);
  let queueRuntime;
  let schedules;
  let connection;
  let worker;
  try {
    queueRuntime = await getQueueRuntime({ logger });
    if (!queueRuntime.available) {
      return { available: false, reason: queueRuntime.reason, schedules: [], close: async () => {} };
    }

    schedules = await syncJobSchedulers(queueRuntime.queue, getScheduleDefinitions(env));
    connection = createDedicatedConnection(baseClient, 'worker', logger);
    const resolvedHandlers = handlers || createHandlers({
      recurring: { timezone: env.JOBS_TIMEZONE },
      runway: { timezone: env.JOBS_TIMEZONE, alertDays: workerOptions.runwayAlertDays },
      monthEnd: { timezone: env.JOBS_TIMEZONE, autoExport: workerOptions.monthEndAutoExport },
      cleanup: { batchSize: workerOptions.exportCleanupBatchSize },
      autoBackup: { timezone: env.JOBS_TIMEZONE },
    });
    worker = new Worker(QUEUE_NAME, createJobProcessor(resolvedHandlers), {
      connection,
      concurrency: workerOptions.concurrency,
    });
  } catch (error) {
    logger.warn?.(`[jobs] Worker setup skipped: ${error.code || error.message}`);
    connection?.disconnect();
    await closeJobQueue().catch(() => {});
    return { available: false, reason: 'worker_setup_failed', error, schedules: [], close: async () => {} };
  }
  worker.on('completed', (job) => logger.log?.(`[jobs] completed ${job.name} (${job.id})`));
  worker.on('failed', (job, error) => logger.error?.(`[jobs] failed ${job?.name || 'unknown'} (${job?.id || '-'}): ${error.message}`));
  worker.on('error', (error) => logger.warn?.(`[jobs:worker] ${error.code || error.message}`));

  const timeoutMs = Math.max(1000, Number(env.JOBS_STARTUP_TIMEOUT_MS || 5000));
  try {
    await withTimeout(worker.waitUntilReady(), timeoutMs, 'BullMQ worker startup');
  } catch (error) {
    logger.warn?.(`[jobs] Worker could not start: ${error.message}`);
    await worker.close(true).catch(() => {});
    connection.disconnect();
    await closeJobQueue().catch(() => {});
    return { available: false, reason: 'worker_start_failed', error, schedules: [], close: async () => {} };
  }

  let closed = false;
  return {
    available: true,
    worker,
    schedules,
    options: workerOptions,
    async close(force = false) {
      if (closed) return;
      closed = true;
      await worker.close(force);
      if (connection.status !== 'end') connection.disconnect();
      await closeJobQueue();
    },
  };
}

module.exports = { withTimeout, startJobWorker };

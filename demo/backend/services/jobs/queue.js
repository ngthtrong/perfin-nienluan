// Vai trò: Quản lý kết nối BullMQ Queue và interface enqueue dùng từ HTTP API.
// Luồng chính: tạo connection riêng, degrade khi Redis thiếu và đóng tài nguyên có kiểm soát.

const { Queue } = require('bullmq');
const { getClient } = require('../store/redis.client');
const { QUEUE_NAME, JOB_NAMES } = require('./constants');

const DEFAULT_JOB_OPTIONS = Object.freeze({
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
});

let runtimePromise = null;

function createDedicatedConnection(baseClient, label, logger = console) {
  const isWorker = label === 'worker';
  const connection = baseClient.duplicate({
    // Workers need unlimited command retries for blocking reads. Producers should
    // fail fast so an API request never hangs behind an unavailable Redis server.
    maxRetriesPerRequest: isWorker ? null : 1,
    enableOfflineQueue: isWorker,
  });
  connection.on('error', (error) => {
    logger.warn?.(`[jobs:${label}] Redis error: ${error.code || error.message}`);
  });
  return connection;
}

async function createQueueRuntime({ logger = console } = {}) {
  const baseClient = await getClient();
  if (!baseClient) return { available: false, reason: 'redis_unavailable', queue: null };

  const connection = createDedicatedConnection(baseClient, 'queue', logger);
  const queue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  queue.on('error', (error) => {
    logger.warn?.(`[jobs:queue] ${error.code || error.message}`);
  });
  return { available: true, queue, connection };
}

async function getQueueRuntime(options = {}) {
  if (!runtimePromise) runtimePromise = createQueueRuntime(options);
  return runtimePromise;
}

async function enqueueJob(name, data = {}, options = {}) {
  if (!Object.values(JOB_NAMES).includes(name)) {
    throw new Error(`Unknown proactive job: ${name}`);
  }
  const runtime = await getQueueRuntime();
  if (!runtime.available) return { queued: false, reason: runtime.reason };
  try {
    const job = await runtime.queue.add(name, data, options);
    return { queued: true, jobId: job.id, name: job.name };
  } catch (error) {
    console.warn(`[jobs:queue] enqueue ${name} failed: ${error.code || error.message}`);
    return { queued: false, reason: 'queue_error' };
  }
}

async function closeJobQueue() {
  if (!runtimePromise) return;
  const runtime = await runtimePromise;
  runtimePromise = null;
  if (!runtime.available) return;
  await runtime.queue.close();
  if (runtime.connection.status !== 'end') runtime.connection.disconnect();
}

module.exports = {
  DEFAULT_JOB_OPTIONS,
  createDedicatedConnection,
  createQueueRuntime,
  getQueueRuntime,
  enqueueJob,
  closeJobQueue,
};

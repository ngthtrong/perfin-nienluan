function createExportCleanupHandler(deps = {}) {
  const cleanup = deps.cleanupExpiredExports || require('../../exportCleanup.service').cleanupExpiredExports;
  const nowFn = deps.now || (() => new Date());
  const batchSize = Number(deps.batchSize || process.env.JOB_EXPORT_CLEANUP_BATCH_SIZE || 100);

  return async function exportCleanup() {
    const result = await cleanup({ now: nowFn(), batchSize });
    return { job: 'cleanup-exports', ...result };
  };
}

module.exports = { createExportCleanupHandler };

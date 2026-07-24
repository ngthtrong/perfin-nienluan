const { resolveTargetUserIds } = require('../userScope');
const { isBackupDue } = require('../schedules');

// Creates an automatic encrypted backup for each user whose backup_config has
// auto_enabled set and whose chosen frequency is due (see isBackupDue). The
// scheduler fires this daily; the per-user due-check enforces the cadence so at
// most one auto backup is created per period. createBackup already writes an
// export_history row, updates last_backup_at, and prunes old auto backups beyond
// keep_count — the updated last_backup_at also prevents BullMQ retries from
// producing a duplicate backup within the same period.
function createAutoBackupHandler(deps = {}) {
  const exportService = deps.exportService || require('../../export.service');
  const createBackup = deps.createBackup || exportService.createBackup;
  const getConfig = deps.getBackupConfig || exportService.BackupConfigModel.get;
  const resolveUsers = deps.resolveTargetUserIds || resolveTargetUserIds;
  const dueCheck = deps.isBackupDue || isBackupDue;
  const nowFn = deps.now || (() => new Date());
  const timezone = deps.timezone || process.env.JOBS_TIMEZONE || 'Asia/Bangkok';

  return async function autoBackup(job = {}) {
    const now = nowFn();
    const forced = Boolean(job.data && job.data.force);
    const userIds = await resolveUsers(job.data || {});
    const results = [];

    for (const userId of userIds) {
      let config;
      try {
        config = await getConfig(userId);
      } catch (error) {
        results.push({ userId, backedUp: false, reason: 'config_error', error: error.message });
        continue;
      }

      if (!config || !config.auto_enabled) {
        results.push({ userId, backedUp: false, reason: 'auto_disabled' });
        continue;
      }
      if (!forced && !dueCheck(config, now, timezone)) {
        results.push({ userId, backedUp: false, reason: 'not_due' });
        continue;
      }

      try {
        const backup = await createBackup(userId, { is_auto: true });
        results.push({
          userId,
          backedUp: true,
          frequency: config.frequency,
          historyId: backup?.historyId ?? backup?.id ?? null,
        });
      } catch (error) {
        results.push({ userId, backedUp: false, reason: 'backup_failed', error: error.message });
      }
    }

    return { job: 'auto-backup', users: results };
  };
}

module.exports = { createAutoBackupHandler };

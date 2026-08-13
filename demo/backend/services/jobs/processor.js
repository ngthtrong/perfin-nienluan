// Vai trò: Ánh xạ tên job sang đúng handler thực thi trong worker.
// Luồng chính: dựng dependency handler và từ chối rõ ràng các job không được hỗ trợ.

const { JOB_NAMES } = require('./constants');
const { createRecurringReminderHandler } = require('./handlers/recurringReminder');
const { createMonthEndInsightsHandler } = require('./handlers/monthEndInsights');
const { createRunwayScanHandler } = require('./handlers/runwayScan');
const { createSubscriptionScanHandler } = require('./handlers/subscriptionScan');
const { createExportCleanupHandler } = require('./handlers/exportCleanup');
const { createAutoBackupHandler } = require('./handlers/autoBackup');

function createHandlers(options = {}) {
  return {
    [JOB_NAMES.RECURRING_REMINDERS]: createRecurringReminderHandler(options.recurring),
    [JOB_NAMES.MONTH_END_INSIGHTS]: createMonthEndInsightsHandler(options.monthEnd),
    [JOB_NAMES.RUNWAY_SCAN]: createRunwayScanHandler(options.runway),
    [JOB_NAMES.SUBSCRIPTION_SCAN]: createSubscriptionScanHandler(options.subscription),
    [JOB_NAMES.CLEANUP_EXPORTS]: createExportCleanupHandler(options.cleanup),
    [JOB_NAMES.AUTO_BACKUP]: createAutoBackupHandler(options.autoBackup),
  };
}

// Dispatch job theo allowlist handler và từ chối tên lạ để tránh thực thi ngoài ý muốn.
function createJobProcessor(handlers = createHandlers()) {
  return async function processJob(job) {
    const handler = handlers[job.name];
    if (!handler) throw new Error(`Unsupported proactive job: ${job.name}`);
    return handler(job);
  };
}

module.exports = { createHandlers, createJobProcessor };

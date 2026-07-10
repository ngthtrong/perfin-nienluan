const { JOB_NAMES } = require('./constants');
const { createRecurringReminderHandler } = require('./handlers/recurringReminder');
const { createMonthEndInsightsHandler } = require('./handlers/monthEndInsights');
const { createRunwayScanHandler } = require('./handlers/runwayScan');
const { createSubscriptionScanHandler } = require('./handlers/subscriptionScan');
const { createExportCleanupHandler } = require('./handlers/exportCleanup');

function createHandlers(options = {}) {
  return {
    [JOB_NAMES.RECURRING_REMINDERS]: createRecurringReminderHandler(options.recurring),
    [JOB_NAMES.MONTH_END_INSIGHTS]: createMonthEndInsightsHandler(options.monthEnd),
    [JOB_NAMES.RUNWAY_SCAN]: createRunwayScanHandler(options.runway),
    [JOB_NAMES.SUBSCRIPTION_SCAN]: createSubscriptionScanHandler(options.subscription),
    [JOB_NAMES.CLEANUP_EXPORTS]: createExportCleanupHandler(options.cleanup),
  };
}

function createJobProcessor(handlers = createHandlers()) {
  return async function processJob(job) {
    const handler = handlers[job.name];
    if (!handler) throw new Error(`Unsupported proactive job: ${job.name}`);
    return handler(job);
  };
}

module.exports = { createHandlers, createJobProcessor };

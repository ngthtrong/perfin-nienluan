// Vai trò: Định nghĩa tên queue, job và scheduler dùng thống nhất trong worker.
// Luồng chính: đóng băng các identifier để producer, scheduler và processor không lệch contract.

const QUEUE_NAME = process.env.JOBS_QUEUE_NAME || 'perfin-proactive';

const JOB_NAMES = Object.freeze({
  RECURRING_REMINDERS: 'recurring-reminders',
  MONTH_END_INSIGHTS: 'month-end-insights',
  RUNWAY_SCAN: 'runway-scan',
  SUBSCRIPTION_SCAN: 'subscription-scan',
  CLEANUP_EXPORTS: 'cleanup-exports',
  AUTO_BACKUP: 'auto-backup',
});

const SCHEDULER_IDS = Object.freeze({
  // BullMQ reserves ':' inside generated repeat job IDs.
  [JOB_NAMES.RECURRING_REMINDERS]: 'schedule-recurring-reminders',
  [JOB_NAMES.MONTH_END_INSIGHTS]: 'schedule-month-end-insights',
  [JOB_NAMES.RUNWAY_SCAN]: 'schedule-runway-scan',
  [JOB_NAMES.SUBSCRIPTION_SCAN]: 'schedule-subscription-scan',
  [JOB_NAMES.CLEANUP_EXPORTS]: 'schedule-cleanup-exports',
  [JOB_NAMES.AUTO_BACKUP]: 'schedule-auto-backup',
});

module.exports = { QUEUE_NAME, JOB_NAMES, SCHEDULER_IDS };

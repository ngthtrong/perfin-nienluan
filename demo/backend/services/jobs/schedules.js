const { JOB_NAMES, SCHEDULER_IDS } = require('./constants');

function booleanFromEnv(value, fallback = true) {
  if (value == null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function positiveInt(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function getScheduleDefinitions(env = process.env) {
  const globallyEnabled = booleanFromEnv(env.JOBS_ENABLED, true);
  const timezone = String(env.JOBS_TIMEZONE || 'Asia/Bangkok').trim() || 'Asia/Bangkok';
  const definition = (name, pattern, enabledValue) => ({
    schedulerId: SCHEDULER_IDS[name],
    name,
    pattern,
    timezone,
    enabled: globallyEnabled && booleanFromEnv(enabledValue, true),
  });

  return [
    definition(
      JOB_NAMES.RECURRING_REMINDERS,
      env.JOB_RECURRING_CRON || '0 8 * * *',
      env.JOB_RECURRING_ENABLED
    ),
    definition(
      JOB_NAMES.RUNWAY_SCAN,
      env.JOB_RUNWAY_CRON || '15 8 * * *',
      env.JOB_RUNWAY_ENABLED
    ),
    definition(
      JOB_NAMES.SUBSCRIPTION_SCAN,
      env.JOB_SUBSCRIPTION_CRON || '30 8 * * 1',
      env.JOB_SUBSCRIPTION_ENABLED
    ),
    // Runs on possible month-end dates. The handler performs an exact last-day guard.
    definition(
      JOB_NAMES.MONTH_END_INSIGHTS,
      env.JOB_MONTH_END_CRON || '0 20 28-31 * *',
      env.JOB_MONTH_END_ENABLED
    ),
    definition(
      JOB_NAMES.CLEANUP_EXPORTS,
      env.JOB_EXPORT_CLEANUP_CRON || '0 3 * * *',
      env.JOB_EXPORT_CLEANUP_ENABLED
    ),
    // Runs daily; the handler checks each user's chosen frequency (daily/weekly/monthly)
    // against their last backup and only backs up when actually due.
    definition(
      JOB_NAMES.AUTO_BACKUP,
      env.JOB_AUTO_BACKUP_CRON || '30 3 * * *',
      env.JOB_AUTO_BACKUP_ENABLED
    ),
  ];
}

function getWorkerOptions(env = process.env) {
  return {
    concurrency: positiveInt(env.JOBS_CONCURRENCY, 3, { min: 1, max: 20 }),
    runwayAlertDays: positiveInt(env.JOB_RUNWAY_ALERT_DAYS, 14, { min: 1, max: 365 }),
    exportCleanupBatchSize: positiveInt(env.JOB_EXPORT_CLEANUP_BATCH_SIZE, 100, { min: 1, max: 1000 }),
    monthEndAutoExport: booleanFromEnv(env.JOB_MONTH_END_AUTO_EXPORT, false),
  };
}

function zonedDateParts(date = new Date(), timezone = 'Asia/Bangkok') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(date));
  const values = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function localDateKey(date = new Date(), timezone = 'Asia/Bangkok') {
  const { year, month, day } = zonedDateParts(date, timezone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isLastDayOfMonth(date = new Date(), timezone = 'Asia/Bangkok') {
  const { year, month, day } = zonedDateParts(date, timezone);
  return day === new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Decides whether an automatic backup is due for a user, given their config and the
// current time. The scheduler fires this job daily; this guard enforces the user's
// chosen cadence so we never create more than one backup per period.
//   - daily:   different local date-key than the last backup
//   - weekly:  at least 7 local days have elapsed since the last backup
//   - monthly: a different local (year, month) than the last backup
// A missing last_backup_at (never backed up) is always due.
function isBackupDue(config = {}, now = new Date(), timezone = 'Asia/Bangkok') {
  if (!config || !config.auto_enabled) return false;
  const last = config.last_backup_at ? new Date(config.last_backup_at) : null;
  if (!last || Number.isNaN(last.getTime())) return true;

  const frequency = String(config.frequency || 'weekly').toLowerCase();
  if (frequency === 'daily') {
    return localDateKey(now, timezone) !== localDateKey(last, timezone);
  }
  if (frequency === 'monthly') {
    const nowParts = zonedDateParts(now, timezone);
    const lastParts = zonedDateParts(last, timezone);
    return nowParts.year !== lastParts.year || nowParts.month !== lastParts.month;
  }
  // weekly (default): compare whole-day distance between local date keys.
  const dayMs = 24 * 60 * 60 * 1000;
  const toUtcMidnight = (date) => {
    const { year, month, day } = zonedDateParts(date, timezone);
    return Date.UTC(year, month - 1, day);
  };
  const elapsedDays = Math.floor((toUtcMidnight(now) - toUtcMidnight(last)) / dayMs);
  return elapsedDays >= 7;
}

function monthDateRange(date = new Date(), timezone = 'Asia/Bangkok') {
  const { year, month } = zonedDateParts(date, timezone);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  return {
    year,
    month,
    key: ym,
    from: `${ym}-01`,
    to: `${ym}-${String(lastDay).padStart(2, '0')}`,
  };
}

module.exports = {
  booleanFromEnv,
  positiveInt,
  getScheduleDefinitions,
  getWorkerOptions,
  zonedDateParts,
  localDateKey,
  isLastDayOfMonth,
  isBackupDue,
  monthDateRange,
};

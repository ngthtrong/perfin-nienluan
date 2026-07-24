const assert = require('assert/strict');
const cronParser = require('cron-parser');

const { JOB_NAMES } = require('../services/jobs/constants');
const {
  booleanFromEnv,
  positiveInt,
  getScheduleDefinitions,
  getWorkerOptions,
  localDateKey,
  isLastDayOfMonth,
  isBackupDue,
  monthDateRange,
} = require('../services/jobs/schedules');
const {
  formatDateVi,
  recurringReminderMessage,
  runwayAlertMessage,
  subscriptionFingerprint,
  subscriptionScanMessage,
} = require('../services/jobs/messages');
const { normalizeUserIds, resolveTargetUserIds, resolveUserPayday } = require('../services/jobs/userScope');
const { safeMetadata, persistInternalMessage } = require('../services/jobs/internalMessage');
const { syncJobSchedulers } = require('../services/jobs/scheduler');
const { createJobProcessor } = require('../services/jobs/processor');
const { createRecurringReminderHandler } = require('../services/jobs/handlers/recurringReminder');
const { createMonthEndInsightsHandler } = require('../services/jobs/handlers/monthEndInsights');
const { createAutoBackupHandler } = require('../services/jobs/handlers/autoBackup');
const { startJobWorker } = require('../services/jobs/worker');
const { isPathInside, isManagedFilePath, cleanupExpiredExports } = require('../services/exportCleanup.service');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('environment parsing and bounded worker options', () => {
  assert.equal(booleanFromEnv('off', true), false);
  assert.equal(booleanFromEnv('YES', false), true);
  assert.equal(booleanFromEnv('invalid', false), false);
  assert.equal(positiveInt('-2', 3, { min: 1, max: 5 }), 1);
  assert.equal(positiveInt('99', 3, { min: 1, max: 5 }), 5);
  assert.deepEqual(getWorkerOptions({
    JOBS_CONCURRENCY: '50',
    JOB_RUNWAY_ALERT_DAYS: '10',
    JOB_EXPORT_CLEANUP_BATCH_SIZE: '0',
    JOB_MONTH_END_AUTO_EXPORT: 'yes',
  }), {
    concurrency: 20,
    runwayAlertDays: 10,
    exportCleanupBatchSize: 1,
    monthEndAutoExport: true,
  });
});

test('schedule definitions support global and per-job switches', () => {
  const definitions = getScheduleDefinitions({
    JOBS_ENABLED: 'true',
    JOBS_TIMEZONE: 'UTC',
    JOB_RECURRING_CRON: '5 7 * * *',
    JOB_SUBSCRIPTION_ENABLED: 'false',
  });
  assert.equal(definitions.length, 6);
  assert.equal(definitions.find((d) => d.name === JOB_NAMES.RECURRING_REMINDERS).pattern, '5 7 * * *');
  assert.equal(definitions.find((d) => d.name === JOB_NAMES.SUBSCRIPTION_SCAN).enabled, false);
  assert(definitions.every((d) => d.timezone === 'UTC'));
  for (const item of definitions) {
    assert.doesNotThrow(() => cronParser.parseExpression(item.pattern, { tz: item.timezone }));
  }
  assert(getScheduleDefinitions({ JOBS_ENABLED: 'off' }).every((d) => !d.enabled));
});

test('scheduler sync upserts enabled jobs and removes disabled jobs', async () => {
  const calls = [];
  const queue = {
    async upsertJobScheduler(...args) { calls.push(['upsert', ...args]); },
    async removeJobScheduler(id) { calls.push(['remove', id]); return true; },
  };
  const result = await syncJobSchedulers(queue, [
    { schedulerId: 'one', name: 'a', pattern: '0 * * * *', timezone: 'UTC', enabled: true },
    { schedulerId: 'two', name: 'b', pattern: '0 0 * * *', timezone: 'UTC', enabled: false },
  ]);
  assert.equal(calls[0][0], 'upsert');
  assert.deepEqual(calls[0][2], { pattern: '0 * * * *', tz: 'UTC' });
  assert.deepEqual(calls[1], ['remove', 'two']);
  assert.deepEqual(result.map((r) => r.action), ['upserted', 'removed']);
});

test('month-end guard and ranges use the configured timezone', () => {
  const lastDayInBangkok = new Date('2026-07-31T10:00:00.000Z');
  const alreadyAugustInBangkok = new Date('2026-07-31T18:00:00.000Z');
  assert.equal(localDateKey(lastDayInBangkok, 'Asia/Bangkok'), '2026-07-31');
  assert.equal(isLastDayOfMonth(lastDayInBangkok, 'Asia/Bangkok'), true);
  assert.equal(isLastDayOfMonth(alreadyAugustInBangkok, 'Asia/Bangkok'), false);
  assert.deepEqual(monthDateRange(lastDayInBangkok, 'Asia/Bangkok'), {
    year: 2026,
    month: 7,
    key: '2026-07',
    from: '2026-07-01',
    to: '2026-07-31',
  });
});

test('notification builders only emit actionable messages', () => {
  assert.equal(formatDateVi(new Date('2026-07-09T00:00:00.000Z')), '09/07/2026');
  const reminder = recurringReminderMessage([
    { name: 'Internet', amount: 250000, next_due_date: '2026-07-12' },
  ]);
  assert.match(reminder, /Internet/);
  assert.match(reminder, /250\.000đ/);
  const shortWallet = recurringReminderMessage([
    { name: 'Tiền nhà', amount: 2000000, next_due_date: '2026-07-12', wallet_name: 'Tiền mặt', wallet_balance: 1500000 },
  ]);
  assert.match(shortWallet, /thiếu 500\.000đ/);
  assert.equal(recurringReminderMessage([]), null);
  assert.equal(runwayAlertMessage({ daysLeft: 20 }, 14), null);
  assert.match(runwayAlertMessage({ daysLeft: 5, totalBalance: 1000000, dailyBurn: 200000 }, 14), /5 ngày/);
});

test('subscription fingerprint is deterministic and message summarizes findings', () => {
  const a = {
    subscriptions: [
      { name: 'Netflix', avgAmount: 260000, frequency: 'monthly' },
      { name: 'Music', avgAmount: 59000, frequency: 'monthly' },
    ],
    totalMonthly: 319000,
  };
  const b = { ...a, subscriptions: [...a.subscriptions].reverse() };
  assert.equal(subscriptionFingerprint(a), subscriptionFingerprint(b));
  assert.match(subscriptionScanMessage(a), /319\.000đ\/tháng/);
  assert.equal(subscriptionScanMessage(null), null);
});

test('target user resolution honors explicit scope and falls back safely', async () => {
  assert.deepEqual(normalizeUserIds([' u1 ', '', 'u1', 'u2']), ['u1', 'u2']);
  assert.deepEqual(await resolveTargetUserIds({ userId: 'alice' }, async () => { throw new Error('should not query'); }), ['alice']);
  assert.deepEqual(await resolveTargetUserIds({}, async () => ({ rows: [{ user_key: 'u1' }, { user_key: 'u2' }] })), ['u1', 'u2']);
  assert.deepEqual(await resolveTargetUserIds({}, async () => { throw new Error('old schema'); }), ['default_user']);
  assert.equal(await resolveUserPayday('u1', 12, async () => { throw new Error('should not query'); }), 12);
  assert.equal(await resolveUserPayday('u1', null, async () => ({ rows: [{ payday: 25 }] })), 25);
  assert.equal(await resolveUserPayday('u1', null, async () => { throw new Error('old schema'); }), null);
});

test('internal message persistence is idempotency-aware and metadata-safe', async () => {
  assert.deepEqual(safeMetadata(null), {});
  assert.deepEqual(safeMetadata({ ok: true }), { ok: true });
  let params;
  const created = await persistInternalMessage({
    userId: 'u1',
    content: '  Hello  ',
    type: 'test',
    eventKey: 'event:1',
    metadata: { amount: 10 },
  }, async (sql, values) => {
    assert.match(sql, /WHERE NOT EXISTS/);
    params = values;
    return { rows: [{ id: 9 }] };
  });
  assert.equal(created.created, true);
  assert.equal(params[1], 'Hello');
  assert.equal(params[3], 'event:1');
  assert.equal(JSON.parse(params[2]).source, 'proactive_worker');
});

test('job processor dispatches known handlers and rejects unknown names', async () => {
  const processor = createJobProcessor({ known: async (job) => ({ id: job.id }) });
  assert.deepEqual(await processor({ id: '42', name: 'known' }), { id: '42' });
  await assert.rejects(() => processor({ name: 'missing' }), /Unsupported proactive job/);
});

test('recurring reminder handler aggregates bills into one internal message per user/day', async () => {
  const persisted = [];
  const handler = createRecurringReminderHandler({
    timezone: 'UTC',
    now: () => new Date('2026-07-10T02:00:00.000Z'),
    resolveTargetUserIds: async () => ['u1', 'u2'],
    decorateMessage: async (_userId, content) => `PERSONA:${content}`,
    recurringBillModel: {
      async getDueBills(userId) {
        return userId === 'u1' ? [{ id: 1, name: 'Điện', amount: 500000, next_due_date: '2026-07-10' }] : [];
      },
    },
    persistInternalMessage: async (payload) => { persisted.push(payload); return { created: true }; },
  });
  const result = await handler({ data: {} });
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].eventKey, 'recurring-reminder:2026-07-10');
  assert.match(persisted[0].content, /^PERSONA:/);
  assert.equal(result.users[0].notificationCreated, true);
  assert.equal(result.users[1].due, 0);
});

test('month-end handler skips non-last days without querying analytics', async () => {
  let queried = false;
  const handler = createMonthEndInsightsHandler({
    timezone: 'UTC',
    now: () => new Date('2026-07-10T02:00:00.000Z'),
    analytics: { async buildInsightFacts() { queried = true; return {}; } },
    aiService: {},
    personaService: {},
    exportPDF: async () => null,
  });
  const result = await handler({ data: {} });
  assert.equal(result.skipped, true);
  assert.equal(queried, false);
});

test('month-end retries do not generate a duplicate automatic export', async () => {
  let exports = 0;
  const handler = createMonthEndInsightsHandler({
    timezone: 'UTC',
    autoExport: true,
    now: () => new Date('2026-07-31T20:00:00.000Z'),
    resolveTargetUserIds: async () => ['u1'],
    resolveUserPayday: async () => 25,
    analytics: { async buildInsightFacts() { return { runway: null }; } },
    personaService: { async getActivePersona() { return { id: 'expert', name: 'Expert', style_prompt: '' }; } },
    aiService: { async narrateInsights() { return { text: 'Tổng kết tháng', provider_used: 'local' }; } },
    persistInternalMessage: async () => ({ created: false, reason: 'duplicate' }),
    exportPDF: async () => { exports += 1; return { historyId: 1 }; },
    query: async () => ({ rows: [] }),
  });
  const result = await handler({ data: {} });
  assert.equal(result.skipped, false);
  assert.equal(exports, 0);
  assert.equal(result.users[0].notificationCreated, false);
});

test('isBackupDue honors each frequency against the last backup', () => {
  const tz = 'UTC';
  // Never backed up → always due (regardless of frequency).
  assert.equal(isBackupDue({ auto_enabled: true, frequency: 'monthly', last_backup_at: null }, new Date('2026-07-24T04:00:00.000Z'), tz), true);
  // Disabled → never due.
  assert.equal(isBackupDue({ auto_enabled: false, frequency: 'daily', last_backup_at: null }, new Date('2026-07-24T04:00:00.000Z'), tz), false);

  // Daily: same local date → not due; next local date → due.
  const daily = { auto_enabled: true, frequency: 'daily', last_backup_at: '2026-07-24T02:00:00.000Z' };
  assert.equal(isBackupDue(daily, new Date('2026-07-24T20:00:00.000Z'), tz), false);
  assert.equal(isBackupDue(daily, new Date('2026-07-25T01:00:00.000Z'), tz), true);

  // Weekly: <7 days → not due; ≥7 days → due.
  const weekly = { auto_enabled: true, frequency: 'weekly', last_backup_at: '2026-07-17T03:30:00.000Z' };
  assert.equal(isBackupDue(weekly, new Date('2026-07-23T03:30:00.000Z'), tz), false);
  assert.equal(isBackupDue(weekly, new Date('2026-07-24T03:30:00.000Z'), tz), true);

  // Monthly: same (year, month) → not due; new month → due.
  const monthly = { auto_enabled: true, frequency: 'monthly', last_backup_at: '2026-07-02T03:30:00.000Z' };
  assert.equal(isBackupDue(monthly, new Date('2026-07-31T03:30:00.000Z'), tz), false);
  assert.equal(isBackupDue(monthly, new Date('2026-08-01T03:30:00.000Z'), tz), true);
});

test('auto-backup handler skips disabled/not-due users and backs up due users', async () => {
  const backups = [];
  const configs = {
    u1: { auto_enabled: true, frequency: 'daily', last_backup_at: null },       // due
    u2: { auto_enabled: false, frequency: 'daily', last_backup_at: null },      // disabled
    u3: { auto_enabled: true, frequency: 'daily', last_backup_at: '2026-07-24T02:00:00.000Z' }, // not due (same day)
  };
  const handler = createAutoBackupHandler({
    timezone: 'UTC',
    now: () => new Date('2026-07-24T04:00:00.000Z'),
    resolveTargetUserIds: async () => ['u1', 'u2', 'u3'],
    getBackupConfig: async (userId) => configs[userId],
    createBackup: async (userId) => { backups.push(userId); return { historyId: backups.length }; },
  });
  const result = await handler({ data: {} });
  assert.deepEqual(backups, ['u1']);
  assert.equal(result.users.find((u) => u.userId === 'u1').backedUp, true);
  assert.equal(result.users.find((u) => u.userId === 'u2').reason, 'auto_disabled');
  assert.equal(result.users.find((u) => u.userId === 'u3').reason, 'not_due');
});

test('auto-backup handler force flag bypasses the due-check but still respects auto_enabled', async () => {
  const backups = [];
  const configs = {
    u1: { auto_enabled: true, frequency: 'monthly', last_backup_at: '2026-07-24T02:00:00.000Z' }, // not due, but forced
    u2: { auto_enabled: false, frequency: 'daily', last_backup_at: null }, // disabled → still skipped
  };
  const handler = createAutoBackupHandler({
    timezone: 'UTC',
    now: () => new Date('2026-07-24T04:00:00.000Z'),
    resolveTargetUserIds: async () => ['u1', 'u2'],
    getBackupConfig: async (userId) => configs[userId],
    createBackup: async (userId) => { backups.push(userId); return { historyId: backups.length }; },
  });
  const result = await handler({ data: { force: true } });
  assert.deepEqual(backups, ['u1']);
  assert.equal(result.users.find((u) => u.userId === 'u2').reason, 'auto_disabled');
});

test('worker can be administratively disabled without touching Redis', async () => {
  const runtime = await startJobWorker({ env: { JOBS_ENABLED: 'off' }, logger: {} });
  assert.equal(runtime.available, false);
  assert.equal(runtime.reason, 'jobs_disabled');
});

test('export cleanup only unlinks files inside the managed directory', async () => {
  assert.equal(isPathInside('/srv/exports', '/srv/exports/report.csv'), true);
  assert.equal(isPathInside('/srv/exports', '/srv/private/key'), false);
  assert.equal(await isManagedFilePath('/srv/exports', '/srv/exports/link/report.csv', {
    async realpath(value) {
      if (value === '/srv/exports') return '/data/exports';
      return '/data/private'; // simulates an intermediate symlink escaping the root
    },
  }), false);
  const updates = [];
  const unlinked = [];
  const rows = [
    { id: 1, file_path: '/srv/exports/old.csv' },
    { id: 2, file_path: '/srv/outside.txt' },
  ];
  const result = await cleanupExpiredExports({
    exportsDir: '/srv/exports',
    queryFn: async (sql, params) => {
      if (sql.includes('SELECT id')) return { rows };
      updates.push(params[0]);
      return { rows: [] };
    },
    fsPromises: { async unlink(file) { unlinked.push(file); } },
  });
  assert.deepEqual(unlinked, ['/srv/exports/old.csv']);
  assert.deepEqual(updates, [1]);
  assert.equal(result.cleaned, 1);
  assert.equal(result.skipped, 1);
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${name}`);
      console.error(error.stack || error.message);
    }
  }
  if (failed) {
    console.error(`\n${failed}/${tests.length} job tests failed`);
    process.exitCode = 1;
  } else {
    console.log(`\n${tests.length} job tests passed`);
  }
})().finally(() => {
  // Importing DB-backed services creates a pg Pool lazily; end it so this pure test
  // process cannot be kept alive by future pg implementation changes.
  require('../config/database').pool.end().catch(() => {});
});

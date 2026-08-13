// Vai trò: Quét runway và phát cảnh báo khi số ngày chi tiêu còn lại xuống thấp.
// Luồng chính: tính facts theo hồ sơ, so ngưỡng rồi lưu proactive message có idempotency.

const { localDateKey } = require('../schedules');
const { runwayAlertMessage } = require('../messages');
const { resolveTargetUserIds, resolveUserPayday } = require('../userScope');
const { persistInternalMessage } = require('../internalMessage');
const { decorateProactiveMessage } = require('../persona');

// Trả handler chỉ phát cảnh báo khi runway hữu hạn và nhỏ hơn ngưỡng cấu hình.
function createRunwayScanHandler(deps = {}) {
  const analytics = deps.analytics || require('../../analytics');
  const persist = deps.persistInternalMessage || persistInternalMessage;
  const resolveUsers = deps.resolveTargetUserIds || resolveTargetUserIds;
  const resolvePayday = deps.resolveUserPayday || resolveUserPayday;
  const decorate = deps.decorateMessage || decorateProactiveMessage;
  const timezone = deps.timezone || process.env.JOBS_TIMEZONE || 'Asia/Bangkok';
  const alertDays = Number(deps.alertDays || process.env.JOB_RUNWAY_ALERT_DAYS || 14);
  const nowFn = deps.now || (() => new Date());

  return async function runwayScan(job = {}) {
    const now = nowFn();
    const dateKey = localDateKey(now, timezone);
    const userIds = await resolveUsers(job.data || {});
    const results = [];

    for (const userId of userIds) {
      const payday = await resolvePayday(userId, job.data?.payday);
      const facts = await analytics.runwayFacts(userId, payday);
      const rawContent = runwayAlertMessage(facts, alertDays);
      const content = rawContent ? await decorate(userId, rawContent, deps.personaService) : null;
      if (!content) {
        results.push({ userId, alerted: false, daysLeft: facts?.daysLeft ?? null });
        continue;
      }
      const stored = await persist({
        userId,
        content,
        type: 'cashflow_runway_alert',
        eventKey: `runway-alert:${dateKey}`,
        dedupeHours: 36,
        metadata: { local_date: dateKey, alert_days: alertDays, payday, facts },
      });
      results.push({ userId, alerted: stored.created, daysLeft: facts.daysLeft });
    }

    return { job: 'runway-scan', date: dateKey, thresholdDays: alertDays, users: results };
  };
}

module.exports = { createRunwayScanHandler };

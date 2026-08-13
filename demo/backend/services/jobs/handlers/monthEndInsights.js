// Vai trò: Tạo insight cuối tháng chủ động cho các hồ sơ đủ điều kiện.
// Luồng chính: xác định kỳ, dựng facts/narration và lưu internal message có idempotency.

const { isLastDayOfMonth, monthDateRange } = require('../schedules');
const { resolveTargetUserIds, resolveUserPayday } = require('../userScope');
const { persistInternalMessage } = require('../internalMessage');

function createMonthEndInsightsHandler(deps = {}) {
  const analytics = deps.analytics || require('../../analytics');
  const aiService = deps.aiService || require('../../ai.service');
  const personaService = deps.personaService || require('../../persona.service');
  const persist = deps.persistInternalMessage || persistInternalMessage;
  const resolveUsers = deps.resolveTargetUserIds || resolveTargetUserIds;
  const resolvePayday = deps.resolveUserPayday || resolveUserPayday;
  const exportPDF = deps.exportPDF || require('../../export.service').exportPDF;
  const query = deps.query || require('../../../config/database').query;
  const timezone = deps.timezone || process.env.JOBS_TIMEZONE || 'Asia/Bangkok';
  const autoExport = deps.autoExport ?? String(process.env.JOB_MONTH_END_AUTO_EXPORT || '').toLowerCase() === 'true';
  const nowFn = deps.now || (() => new Date());

  return async function monthEndInsights(job = {}) {
    const now = nowFn();
    const period = monthDateRange(now, timezone);
    const forced = job.data?.force === true;
    if (!forced && !isLastDayOfMonth(now, timezone)) {
      return { job: 'month-end-insights', skipped: true, reason: 'not_last_day', period: period.key };
    }

    const userIds = await resolveUsers(job.data || {});
    const results = [];
    for (const userId of userIds) {
      const payday = await resolvePayday(userId, job.data?.payday);
      const [facts, persona] = await Promise.all([
        analytics.buildInsightFacts(userId, { payday, useCache: false }),
        personaService.getActivePersona(userId),
      ]);
      const narration = await aiService.narrateInsights(facts, {
        stylePrompt: persona.style_prompt,
        periodLabel: `tháng ${period.month}/${period.year}`,
      });

      const stored = await persist({
        userId,
        content: narration.text,
        type: 'month_end_insights',
        eventKey: `month-end-insights:${period.key}`,
        dedupeHours: 24 * 40,
        metadata: {
          period: period.key,
          provider_used: narration.provider_used,
          persona: { id: persona.id, name: persona.name },
          payday,
          facts,
          export: null,
        },
      });

      let exported = null;
      let exportError = null;
      // Persist the insight first. This prevents a BullMQ retry from producing a
      // duplicate report file when the notification already exists.
      if (stored.created && (autoExport || job.data?.autoExport === true)) {
        try {
          exported = await exportPDF(userId, {
            from: period.from,
            to: period.to,
            label: `Tháng ${period.month}/${period.year}`,
          });
          if (exported && stored.message?.id) {
            await query(
              `UPDATE chat_messages
               SET metadata = metadata || $2::jsonb
               WHERE id = $1 AND user_id = $3`,
              [stored.message.id, JSON.stringify({
                export: {
                  history_id: exported.historyId,
                  file_name: exported.fileName,
                  download_url: `/api/export/history/${exported.historyId}/download`,
                },
              }), userId]
            );
          }
        } catch (error) {
          exportError = error.message;
        }
      }
      results.push({
        userId,
        notificationCreated: stored.created,
        providerUsed: narration.provider_used,
        exportHistoryId: exported?.historyId || null,
        exportError,
      });
    }

    return { job: 'month-end-insights', skipped: false, period: period.key, users: results };
  };
}

module.exports = { createMonthEndInsightsHandler };

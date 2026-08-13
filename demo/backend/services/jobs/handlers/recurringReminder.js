// Vai trò: Nhắc các recurring bill sắp hoặc đã đến hạn cho đúng người dùng.
// Luồng chính: truy vấn bill, dựng thông điệp có metadata và lưu một lần theo ngày.

const { localDateKey } = require('../schedules');
const { recurringReminderMessage } = require('../messages');
const { resolveTargetUserIds } = require('../userScope');
const { persistInternalMessage } = require('../internalMessage');
const { decorateProactiveMessage } = require('../persona');

// Trả handler tìm bill đến hạn cho từng user và ghi reminder chống lặp theo ngày.
function createRecurringReminderHandler(deps = {}) {
  const model = deps.recurringBillModel || require('../../../models/recurringBill.model');
  const persist = deps.persistInternalMessage || persistInternalMessage;
  const resolveUsers = deps.resolveTargetUserIds || resolveTargetUserIds;
  const decorate = deps.decorateMessage || decorateProactiveMessage;
  const timezone = deps.timezone || process.env.JOBS_TIMEZONE || 'Asia/Bangkok';
  const nowFn = deps.now || (() => new Date());

  return async function recurringReminder(job = {}) {
    const now = nowFn();
    const dateKey = localDateKey(now, timezone);
    const userIds = await resolveUsers(job.data || {});
    const results = [];

    for (const userId of userIds) {
      const bills = await model.getDueBills(userId, now);
      const rawContent = recurringReminderMessage(bills);
      const content = rawContent ? await decorate(userId, rawContent, deps.personaService) : null;
      if (!content) {
        results.push({ userId, due: 0, notificationCreated: false });
        continue;
      }
      const stored = await persist({
        userId,
        content,
        type: 'recurring_bill_reminder',
        eventKey: `recurring-reminder:${dateKey}`,
        dedupeHours: 36,
        metadata: {
          due_count: bills.length,
          bill_ids: bills.map((bill) => bill.id),
          local_date: dateKey,
        },
      });
      results.push({ userId, due: bills.length, notificationCreated: stored.created });
    }

    return { job: 'recurring-reminders', date: dateKey, users: results };
  };
}

module.exports = { createRecurringReminderHandler };

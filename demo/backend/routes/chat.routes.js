// Vai trò: Điều phối hội thoại từ câu tự nhiên đến tra cứu hoặc bản nháp nghiệp vụ an toàn.
// Luồng chính: phân loại intent, quản lý clarification/pending, validation và chỉ ghi sau xác nhận.
// Đây là ranh giới trung tâm giữa AI, quy tắc xác định và các model tài chính.

const express = require('express');
const AIService = require('../services/ai.service');
const CategoryModel = require('../models/category.model');
const AccountModel = require('../models/account.model');
const TransactionModel = require('../models/transaction.model');
const RecurringBillModel = require('../models/recurringBill.model');
const GoalModel = require('../models/goal.model');
const UserTraitModel = require('../models/userTrait.model');
const BudgetModel = require('../models/budget.model');
const BudgetRecommendationService = require('../services/budgets');
const { forecastBudgets } = require('../services/budgets/forecast');
const { FeedbackService, CategoryRetagService } = require('../services/feedback');
const { recordFeedbackAfterCommit } = require('../services/feedback/bestEffort');
const ReportService = require('../services/report.service');
const AnalyticsEngine = require('../services/analytics');
const GoalService = require('../services/goals');
const { validateGoalPayload } = require('../services/goals/validation');
const Persona = require('../services/persona.service');
const ConversationState = require('../services/conversationState.service');
const { TransferModel, InvestmentPnLModel } = require('../models/cashflow.model');
const { exportCSV, exportPDF } = require('../services/export.service');
const { enqueueJob, JOB_NAMES } = require('../services/jobs');
const { localDateKey } = require('../services/jobs/schedules');
const { resolveUserPayday } = require('../services/jobs/userScope');
const ChatMessage = require('../models/chatMessage.model');
const pending = require('../services/pendingTransaction.service');
const { matchCategory, normalizeAmount, normalizeText } = require('../services/parser.service');
const {
  isRecurringPaymentAcknowledgement,
  isQuestionLike,
  routeLocalIntent,
} = require('../services/ai/localIntentRouter');
const { resolvePeriod } = require('../services/ai/periodResolver');
const {
  normalizePastOrPresentDate,
  validateTransactionPayload,
} = require('../services/transactions/validation');

const router = express.Router();
const userId = 'default_user';

function formatMoney(amount, currency = 'VND') {
  const code = String(currency || 'VND').toUpperCase();
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: code }).format(Number(amount));
  } catch {
    return `${Number(amount).toLocaleString('vi-VN')} ${code}`;
  }
}

function formatVND(amount) {
  return formatMoney(amount, 'VND');
}

// Cheap persona decoration for short system messages. Longer advice is narrated by
// AIService with the same persona's style_prompt.
async function applyPersona(text) {
  const persona = await Persona.getActivePersona(userId);
  return typeof persona?.decorate === 'function' ? persona.decorate(text) : text;
}

function previewResponse(transaction, pendingId, message = 'Mình hiểu bạn muốn ghi nhận giao dịch này:') {
  return { type: 'transaction_preview', message, transaction, pending_id: pendingId };
}

function editValidationError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

// Hợp nhất thay đổi draft, validation lại và ghi metadata nếu người dùng sửa category AI chọn.
async function preparePendingTransactionUpdates(currentTransaction, rawUpdates, {
  categories = null,
  today = new Date(),
} = {}) {
  if (!currentTransaction || typeof currentTransaction !== 'object') {
    throw editValidationError('Giao dịch chờ sửa không hợp lệ');
  }
  if (!rawUpdates || typeof rawUpdates !== 'object' || Array.isArray(rawUpdates)) {
    throw editValidationError('Nội dung chỉnh sửa giao dịch không hợp lệ');
  }

  const updates = { ...rawUpdates };
  // Accept camelCase aliases from older/native clients while keeping the public
  // response and stored draft in the canonical database field names.
  if (hasOwn(updates, 'categoryId') && !hasOwn(updates, 'category_id')) {
    updates.category_id = updates.categoryId;
  }
  if (hasOwn(updates, 'date') && !hasOwn(updates, 'transaction_date')) {
    updates.transaction_date = updates.date;
  }
  delete updates.categoryId;
  delete updates.date;

  validateTransactionPayload(updates, {
    partial: true,
    rejectUnknown: true,
    today,
  });

  if (hasOwn(updates, 'description')) updates.description = updates.description.trim();
  if (hasOwn(updates, 'amount')) updates.amount = Number(updates.amount);
  if (hasOwn(updates, 'wallet_id')) updates.wallet_id = Number(updates.wallet_id);
  if (hasOwn(updates, 'transaction_date') && typeof updates.transaction_date === 'string') {
    updates.transaction_date = updates.transaction_date.trim();
  }

  if (hasOwn(updates, 'category_id') || hasOwn(updates, 'type')) {
    const categoryId = Number(updates.category_id ?? currentTransaction.category_id);
    const transactionType = updates.type ?? currentTransaction.type;
    const availableCategories = categories || await CategoryModel.getAll(userId);
    const category = availableCategories.find((item) => Number(item.id) === categoryId);
    if (!category) throw editValidationError('Danh mục không tồn tại hoặc không thuộc người dùng');
    if (category.type !== transactionType) {
      throw editValidationError('Danh mục không khớp với loại giao dịch');
    }
    updates.category_id = categoryId;
    updates.category_name = category.name;
    updates.category_icon = category.icon;
  }

  return updates;
}

function categorySnapshot(transaction = {}) {
  const categoryId = Number(transaction.category_id);
  return {
    category_id: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null,
    category_name: String(transaction.category_name || '').trim() || null,
    type: ['income', 'expense'].includes(transaction.type) ? transaction.type : null,
  };
}

function categorySnapshotKey(category) {
  if (category?.category_id) return `id:${category.category_id}`;
  return category?.category_name ? `name:${category.category_name.toLocaleLowerCase('vi')}` : null;
}

function updateClassificationCorrectionMetadata(metadata = {}, currentTransaction, updates, index = 0) {
  if (!hasOwn(updates || {}, 'category_id')) return metadata;

  const key = String(index);
  const corrections = { ...(metadata.classification_corrections || {}) };
  const existing = corrections[key];
  const originalCategory = existing?.original_category || categorySnapshot(currentTransaction);
  const correctedCategory = categorySnapshot({ ...currentTransaction, ...updates });

  if (!categorySnapshotKey(originalCategory)
      || categorySnapshotKey(originalCategory) === categorySnapshotKey(correctedCategory)) {
    delete corrections[key];
  } else {
    corrections[key] = {
      original_category: originalCategory,
      corrected_category: correctedCategory,
    };
  }

  const nextMetadata = { ...metadata };
  if (Object.keys(corrections).length) nextMetadata.classification_corrections = corrections;
  else delete nextMetadata.classification_corrections;
  return nextMetadata;
}

async function recordPendingClassificationFeedback(item, savedTransactions, {
  feedbackService = FeedbackService,
  recordAfterCommit = recordFeedbackAfterCommit,
} = {}) {
  const corrections = item?.metadata?.classification_corrections;
  if (!corrections || typeof corrections !== 'object') return 0;

  const drafts = item.kind === 'transactions' ? item.data : [item.data];
  const saved = Array.isArray(savedTransactions) ? savedTransactions : [savedTransactions];
  let recorded = 0;
  for (const [rawIndex, correction] of Object.entries(corrections)) {
    const index = Number(rawIndex);
    const draft = drafts?.[index];
    const transaction = saved?.[index];
    if (!Number.isInteger(index) || index < 0 || !draft || !transaction?.id) continue;
    if (!['ai_chat', 'ocr', 'voice'].includes(draft.source) || !String(draft.original_text || '').trim()) continue;

    const originalCategory = correction?.original_category;
    const correctedCategory = categorySnapshot(transaction);
    if (!categorySnapshotKey(originalCategory)
        || categorySnapshotKey(originalCategory) === categorySnapshotKey(correctedCategory)) continue;

    await recordAfterCommit('classification', () => feedbackService.recordClassificationCorrection({
      userId,
      transactionId: transaction.id,
      originalText: draft.original_text,
      aiResult: originalCategory,
      correctedResult: correctedCategory,
    }));
    recorded += 1;
  }
  return recorded;
}

function validatePendingTransactionDates(item, today = new Date()) {
  if (!item) return;
  if (item.kind === 'transfer') {
    normalizePastOrPresentDate(item.data?.transaction_date, {
      label: 'Ngày chuyển tiền',
      today,
      optional: true,
    });
    return;
  }
  if (item.kind === 'investment_pnl') {
    normalizePastOrPresentDate(item.data?.recorded_at, {
      label: 'Ngày ghi nhận lãi/lỗ',
      today,
      optional: true,
    });
    return;
  }
  if (!['transaction', 'transactions', 'recurring_payment'].includes(item.kind)) return;
  const drafts = item.kind === 'transactions' ? item.data : [item.data];
  for (const draft of drafts || []) {
    if (!draft || !hasOwn(draft, 'transaction_date')) continue;
    validateTransactionPayload(
      { transaction_date: draft.transaction_date },
      { partial: true, rejectUnknown: true, today }
    );
  }
}

function messageMetadata(message) {
  if (message?.metadata && typeof message.metadata === 'object' && !Array.isArray(message.metadata)) {
    return message.metadata;
  }
  if (typeof message?.metadata === 'string') {
    try {
      const parsed = JSON.parse(message.metadata);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  return {};
}

function positiveIntegerIds(values, max = 200) {
  return [...new Set((Array.isArray(values) ? values : []).map(Number))]
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, max);
}

function categoryRetagTransactionIds(message) {
  return positiveIntegerIds(messageMetadata(message).category_retag?.transaction_ids);
}

function recurringReminderBillIds(message) {
  return positiveIntegerIds(messageMetadata(message).bill_ids);
}

function selectRelevantReminderBills(dueBills, reminderContext) {
  const remindedIds = recurringReminderBillIds(reminderContext);
  return {
    remindedIds,
    constrained: remindedIds.length > 0,
    candidates: remindedIds.length
      ? (dueBills || []).filter((bill) => remindedIds.includes(Number(bill.id)))
      : (dueBills || []),
  };
}

function transactionMonthWindow(querySpec = {}, now = new Date()) {
  const requestedMonth = Number(querySpec.month);
  const requestedYear = Number(querySpec.year);
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
    ? requestedMonth
    : now.getMonth() + 1;
  const year = Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= 2100
    ? requestedYear
    : now.getFullYear();
  const lastDay = new Date(year, month, 0).getDate();
  return {
    month,
    year,
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

// Resolve the period a query is actually about, and keep the month/year shape the
// existing month-only callers and tests rely on. The label comes from the resolved
// window instead of being hardcoded, so a weekly question is no longer reported
// as a monthly one.
function queryWindow(querySpec = {}, now = new Date()) {
  const resolved = resolvePeriod(querySpec, now);
  const monthly = resolved.is_month
    ? transactionMonthWindow({ month: resolved.month, year: resolved.year }, now)
    : null;
  return {
    ...resolved,
    month: monthly ? monthly.month : now.getMonth() + 1,
    year: monthly ? monthly.year : now.getFullYear(),
  };
}

function transactionListLine(transaction, index) {
  const sign = transaction.type === 'income' ? '+' : '-';
  const date = RecurringBillModel.formatDateOnly(transaction.transaction_date);
  return `${index + 1}. ${date} • ${transaction.description} • ${sign}${formatMoney(transaction.amount, transaction.wallet_currency)} • ${transaction.category_name}`;
}

function coveredRecurringBillIds(messages, dateKey) {
  const covered = new Set();
  for (const message of messages || []) {
    const metadata = messageMetadata(message);
    if (
      metadata.source !== 'proactive_worker'
      || metadata.notification_type !== 'recurring_bill_reminder'
      || metadata.local_date !== dateKey
    ) continue;
    for (const billId of metadata.bill_ids || []) covered.add(String(billId));
  }
  return covered;
}

// Build a dynamic fallback when the worker is disabled/unavailable. Bills already
// persisted by today's worker message are filtered out to avoid duplicate prompts.
// Dựng reminder từ recurring bill và proactive message nhưng loại nội dung đã được bao phủ.
async function buildReminders(messages = [], now = new Date()) {
  const dateKey = localDateKey(now, process.env.JOBS_TIMEZONE || 'Asia/Bangkok');
  const covered = coveredRecurringBillIds(messages, dateKey);
  const due = (await RecurringBillModel.getDueBills(userId, now))
    .filter((bill) => !covered.has(String(bill.id)));
  if (!due.length) return [];

  const fallbackMetadata = {
    event_key: `recurring-reminder-fallback:${dateKey}:${due.map((bill) => bill.id).join(',')}`,
    local_date: dateKey,
  };

  if (due.length === 1) {
    const bill = due[0];
    const text = await applyPersona(
      `Hôm nay đến hạn đóng ${formatVND(bill.amount)} ${bill.name}` +
      `${bill.wallet_name ? ` (ví ${bill.wallet_name}${bill.wallet_balance != null ? ` còn ${formatVND(bill.wallet_balance)}` : ''})` : ''}` +
      `${bill.wallet_balance != null && Number(bill.wallet_balance) < Number(bill.amount) ? `, đang thiếu ${formatVND(Number(bill.amount) - Number(bill.wallet_balance))}` : ''}, bạn đã thanh toán chưa để mình cập nhật số dư?`
    );
    return [{ type: 'reminder', message: text, bill_id: bill.id, bills: [bill], ...fallbackMetadata }];
  }

  const total = due.reduce((sum, b) => sum + Number(b.amount), 0);
  const lines = due.map((b) => `• ${b.name}: ${formatVND(b.amount)}${b.wallet_name ? ` (ví ${b.wallet_name}${b.wallet_balance != null ? ` còn ${formatVND(b.wallet_balance)}` : ''})` : ''}${b.wallet_balance != null && Number(b.wallet_balance) < Number(b.amount) ? ` — thiếu ${formatVND(Number(b.amount) - Number(b.wallet_balance))}` : ''}`).join('\n');
  const text = await applyPersona(`Hôm nay bạn có ${due.length} khoản chi cố định đến hạn, tổng ${formatVND(total)}:\n${lines}\nBạn đã thanh toán khoản nào chưa?`);
  return [{ type: 'reminder', message: text, bills: due, ...fallbackMetadata }];
}

router.get('/messages', async (req, res) => {
  const now = new Date();
  const dateKey = localDateKey(now, process.env.JOBS_TIMEZONE || 'Asia/Bangkok');
  const [messages, workerMessages] = await Promise.all([
    ChatMessage.getRecent(userId, req.query.limit || 30),
    ChatMessage.getRecurringWorkerMessagesForDate(userId, dateKey),
  ]);
  const reminders = await buildReminders(workerMessages, now);
  res.json({ success: true, data: messages, reminders });
});

// ── Recurring-bill intent handlers ────────────────────────────────────────────

async function handleRecurringCreate(parsed) {
  const r = parsed.recurring || {};
  const missing = [];
  if (!r.name) missing.push('tên khoản chi');
  if (!r.amount) missing.push('số tiền');
  if (!r.due_day) missing.push('ngày thanh toán');
  if (missing.length) {
    const fieldMap = { 'tên khoản chi': 'name', 'số tiền': 'amount', 'ngày thanh toán': 'due_day' };
    await ConversationState.start(userId, {
      intent: 'recurring_create',
      awaiting: missing.map((label) => fieldMap[label]),
      collected: { recurring: r },
    });
    return { type: 'clarification', message: await applyPersona(`Bạn bổ sung giúp mình ${missing.join(', ')} để tạo nhắc nhở nhé.`) };
  }
  const categories = await CategoryModel.getAll(userId);
  const matched = matchCategory(r.name, categories, 'expense');
  const draft = {
    name: r.name,
    amount: Number(r.amount),
    frequency: r.frequency || 'monthly',
    due_day: Number(r.due_day),
    category_id: matched ? matched.id : null,
    category_name: matched ? matched.name : null,
  };
  const pendingId = await pending.set(userId, draft, 'recurring_bill');
  const freqLabel = { weekly: 'hàng tuần', monthly: 'hàng tháng', quarterly: 'hàng quý', yearly: 'hàng năm' }[draft.frequency];
  return {
    type: 'recurring_preview',
    message: await applyPersona(`Mình sẽ tạo nhắc nhở "${draft.name}" ${formatVND(draft.amount)} ${freqLabel}, ngày ${draft.due_day}. Bạn xác nhận nhé?`),
    bill: draft,
    pending_id: pendingId,
  };
}

async function handleRecurringList() {
  const bills = await RecurringBillModel.getAll(userId);
  if (!bills.length) return { type: 'chat_response', message: await applyPersona('Bạn chưa có khoản chi cố định nào. Hãy nói "nhắc tiền phòng trọ 1.5 triệu mỗi tháng ngày 5" để tạo nhé.') };
  const lines = bills.map((b) => {
    const freqLabel = { weekly: 'hàng tuần', monthly: 'hàng tháng', quarterly: 'hàng quý', yearly: 'hàng năm' }[b.frequency];
    const status = b.status === 'paused' ? ' [Tạm dừng]' : '';
    return `• ${b.name}: ${formatVND(b.amount)} ${freqLabel}, kỳ kế ${RecurringBillModel.formatDateOnly(b.next_due_date)}${status}`;
  }).join('\n');
  return { type: 'chat_response', message: await applyPersona(`Các khoản chi cố định của bạn:\n${lines}`) };
}

async function findBillByName(name) {
  const bills = await RecurringBillModel.getAll(userId);
  const wanted = String(name || '').toLowerCase().trim();
  if (!wanted) return { bill: null, candidates: bills };
  const exact = bills.filter((b) => b.name.toLowerCase() === wanted);
  if (exact.length === 1) return { bill: exact[0], candidates: exact };
  const partial = bills.filter((b) => b.name.toLowerCase().includes(wanted) || wanted.includes(b.name.toLowerCase()));
  if (partial.length === 1) return { bill: partial[0], candidates: partial };
  return { bill: null, candidates: partial.length ? partial : bills };
}

async function handleRecurringPay(parsed) {
  // Prefer a bill named in the message; otherwise use the single due bill if unambiguous.
  const name = parsed.recurring?.name;
  let target = null;
  let dueCandidates = null;

  if (parsed.recurring?.acknowledgement) {
    const reminderDate = localDateKey(new Date(), process.env.JOBS_TIMEZONE || 'Asia/Bangkok');
    const [due, reminderContext] = await Promise.all([
      RecurringBillModel.getDueBills(userId),
      ChatMessage.getLatestRecurringReminderContext(userId, reminderDate),
    ]);
    const reminderSelection = selectRelevantReminderBills(due, reminderContext);
    dueCandidates = reminderSelection.candidates;
    if (reminderSelection.constrained && !dueCandidates.length) {
      return {
        type: 'chat_response',
        message: await applyPersona('Khoản trong lời nhắc gần nhất đã được xử lý hoặc không còn đến hạn; mình sẽ không ghi thêm giao dịch trùng.'),
      };
    }
    if (dueCandidates.length === 1) target = dueCandidates[0];
    else if (dueCandidates.length > 1) {
      return startBillChoice('recurring_pay', dueCandidates, 'Bạn vừa thanh toán khoản nào trong lời nhắc?');
    }
  }
  if (name) {
    const { bill, candidates } = await findBillByName(name);
    target = bill;
    if (!target && candidates.length > 1) return startBillChoice('recurring_pay', candidates, 'Bạn vừa thanh toán khoản nào?');
  }
  if (!target) {
    const due = dueCandidates || await RecurringBillModel.getDueBills(userId);
    if (due.length === 1) target = due[0];
    else if (due.length > 1) {
      return startBillChoice('recurring_pay', due, 'Bạn vừa thanh toán khoản nào trong số này?');
    }
  }
  // bill_id đến từ văn bản người dùng do LLM bóc tách, nên bắt buộc phải giới
  // hạn theo userId: không được để một id tùy ý chạm vào bản ghi của người khác.
  if (parsed.recurring?.bill_id) target = await RecurringBillModel.getById(parsed.recurring.bill_id, userId);
  if (!target) return { type: 'chat_response', message: await applyPersona('Mình chưa thấy khoản chi cố định nào đến hạn để ghi nhận. Bạn nói rõ tên khoản chi nhé.') };

  // Use an overridden amount if AI extracted one (FR-08-04: "đã đóng nhưng
  // tháng này 1.6tr"), but keep the same preview/confirm boundary as every other
  // money-changing chat action. The due date is an optimistic-concurrency token:
  // a delayed or repeated confirmation cannot pay the newly advanced period.
  const overrideAmount = parsed.recurring?.amount ?? parsed.transaction?.amount;
  const amount = Number(overrideAmount ?? target.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { type: 'clarification', message: await applyPersona('Số tiền thanh toán phải là số dương. Bạn nhập lại giúp mình nhé.') };
  }
  const draft = {
    bill_id: target.id,
    bill_name: target.name,
    description: target.name,
    amount,
    type: 'expense',
    category_id: target.category_id,
    category_name: target.category_name || 'Chi phí cố định',
    category_icon: target.category_icon || '🧾',
    wallet_id: target.wallet_id,
    transaction_date: RecurringBillModel.formatDateOnly(new Date()),
    period_due_date: RecurringBillModel.formatDateOnly(target.next_due_date),
  };
  const pendingId = await pending.set(userId, draft, 'recurring_payment');
  return previewResponse(
    draft,
    pendingId,
    await applyPersona(`Mình sẽ ghi nhận thanh toán ${formatVND(amount)} cho "${target.name}" ở kỳ ${draft.period_due_date}. Bạn xác nhận nhé?`)
  );
}

async function handleRecurringPause(parsed) {
  if (parsed.recurring?.bill_id) {
    const target = await RecurringBillModel.getById(parsed.recurring.bill_id, userId);
    if (target) {
      await RecurringBillModel.pause(target.id, userId);
      return { type: 'system_message', message: await applyPersona(`Đã tạm dừng nhắc "${target.name}". Bạn kích hoạt lại bất kỳ lúc nào nhé.`) };
    }
  }
  const { bill, candidates } = await findBillByName(parsed.recurring?.name);
  if (!bill) {
    if (candidates.length > 1) {
      return startBillChoice('recurring_pause', candidates, 'Bạn muốn tạm dừng khoản nào?');
    }
    return { type: 'chat_response', message: await applyPersona('Mình không tìm thấy khoản chi cố định đó.') };
  }
  await RecurringBillModel.pause(bill.id, userId);
  return { type: 'system_message', message: await applyPersona(`Đã tạm dừng nhắc "${bill.name}". Bạn kích hoạt lại bất kỳ lúc nào nhé.`) };
}

async function handleRecurringHistory(parsed) {
  if (parsed.recurring?.bill_id) {
    const target = await RecurringBillModel.getById(parsed.recurring.bill_id, userId);
    if (target) return recurringHistoryResponse(target);
  }
  const { bill, candidates } = await findBillByName(parsed.recurring?.name);
  if (!bill) {
    if (candidates.length > 1) {
      return startBillChoice('recurring_history', candidates, 'Bạn muốn xem lịch sử khoản nào?');
    }
    return { type: 'chat_response', message: await applyPersona('Mình không tìm thấy khoản chi cố định đó.') };
  }
  return recurringHistoryResponse(bill);
}

async function recurringHistoryResponse(bill) {
  const { payments, summary } = await RecurringBillModel.getPaymentHistory(bill.id, userId);
  if (!payments.length) return { type: 'chat_response', message: await applyPersona(`"${bill.name}" chưa có lịch sử thanh toán nào.`) };
  const recent = payments.slice(0, 5).map((p) => `• ${p.period_due_date}: ${formatVND(p.amount)} (${p.status === 'paid' ? 'đã thanh toán' : p.status})`).join('\n');
  return { type: 'chat_response', message: await applyPersona(`Lịch sử "${bill.name}" (đã trả ${summary.paid_count} kỳ, tổng ${formatVND(summary.total_paid)}):\n${recent}`) };
}

async function startBillChoice(intent, candidates, question) {
  const choices = candidates.map((bill) => ({ id: bill.id, name: bill.name }));
  await ConversationState.start(userId, { intent, awaiting: ['bill_choice'], candidates: choices, collected: {} });
  const lines = choices.map((bill, index) => `${index + 1}. ${bill.name}`).join('\n');
  return { type: 'clarification', message: await applyPersona(`${question}\n${lines}\nBạn trả lời bằng số thứ tự nhé.`), choices };
}

const RECURRING_HANDLERS = {
  recurring_create: handleRecurringCreate,
  recurring_list: handleRecurringList,
  recurring_pay: handleRecurringPay,
  recurring_pause: handleRecurringPause,
  recurring_history: handleRecurringHistory,
};

function firstNumber(text) {
  const match = String(text || '').match(/\b\d{1,2}\b/);
  return match ? Number(match[0]) : null;
}

// Intents that only read data. Asking one of these is a change of subject, never
// an answer to a half-finished form. Deliberately excludes 'question', which the
// router also returns as its "no idea" fallback: a bare noun like "tiền phòng"
// lands there, and that is exactly the slot value the flow is waiting for.
const READ_ONLY_INTENTS = new Set([
  'recurring_list',
  'recurring_history',
  'export',
  'budget_suggest',
  'query_category_suggestions',
]);

// A pending clarification used to consume *every* following message as a slot
// value for its 5-minute TTL, so an unrelated question ("tôi có những ví nào?")
// asked after an abandoned "ăn phở" flow came back as "mình chưa đọc được thông
// tin đó". A new question abandons the stale flow instead of feeding it.
function abandonsConversation(text, state, categories) {
  const awaiting = Array.isArray(state.awaiting) ? state.awaiting : [state.awaiting].filter(Boolean);
  // A numbered choice is always an answer, never a new subject.
  if (awaiting[0] === 'bill_choice') return false;
  // A bare value ("50k", "tiền phòng") is the answer the flow is waiting for.
  if (normalizeAmount(text)) return false;
  const routed = routeLocalIntent(text, categories);
  const intent = String(routed?.intent || '');
  if (intent.startsWith('query_') || READ_ONLY_INTENTS.has(intent)) return true;
  return isQuestionLike(text);
}

// Giải quyết lượt clarification tiếp theo hoặc chủ động thoát state khi người dùng hỏi việc khác.
async function resolveConversation(text, state, categories) {
  const awaiting = Array.isArray(state.awaiting) ? [...state.awaiting] : [state.awaiting].filter(Boolean);
  if (!awaiting.length) return null;

  if (awaiting[0] === 'bill_choice') {
    const choiceNumber = firstNumber(text);
    const normalized = normalizeText(text);
    const candidate = choiceNumber && state.candidates?.[choiceNumber - 1]
      ? state.candidates[choiceNumber - 1]
      : state.candidates?.find((item) => normalizeText(item.name).includes(normalized) || normalized.includes(normalizeText(item.name)));
    if (!candidate) {
      const lines = (state.candidates || []).map((item, index) => `${index + 1}. ${item.name}`).join('\n');
      return { intent: '__clarification__', response: { type: 'clarification', message: await applyPersona(`Mình chưa nhận ra lựa chọn. Bạn trả lời bằng số nhé:\n${lines}`) } };
    }
    await ConversationState.clear(userId);
    return { intent: state.intent, recurring: { ...(state.collected?.recurring || {}), bill_id: candidate.id, name: candidate.name } };
  }

  const collected = { ...(state.collected || {}) };
  const field = awaiting[0];
  let value;
  if (['amount', 'target_amount', 'monthly_contribution'].includes(field)) value = normalizeAmount(text);
  else if (field === 'due_day') value = firstNumber(text);
  else value = String(text || '').trim();

  if (!value && value !== 0) {
    return { intent: '__clarification__', response: { type: 'clarification', message: await applyPersona('Mình chưa đọc được thông tin đó, bạn nói lại rõ hơn nhé.') } };
  }

  const remaining = awaiting.slice(1);
  if (state.intent === 'transaction') {
    collected.transaction = { ...(collected.transaction || {}), [field]: value };
  } else if (state.intent === 'recurring_create') {
    collected.recurring = { ...(collected.recurring || {}), [field]: value };
  } else if (state.intent === 'goal_create') {
    collected.goal = { ...(collected.goal || {}), [field]: value };
  }

  if (remaining.length) {
    await ConversationState.start(userId, { ...state, awaiting: remaining, collected });
    const labels = { name: 'tên khoản chi', amount: 'số tiền', due_day: 'ngày thanh toán', target_amount: 'số tiền mục tiêu' };
    return { intent: '__clarification__', response: { type: 'clarification', message: await applyPersona(`Còn thiếu ${labels[remaining[0]] || remaining[0]}, bạn bổ sung giúp mình nhé.`) } };
  }

  await ConversationState.clear(userId);
  if (state.intent === 'transaction') {
    const tx = collected.transaction;
    const category = matchCategory(tx.category_name || tx.description, categories, tx.type || 'expense');
    return {
      intent: 'transaction',
      original_text: state.original_text || tx.description,
      transaction: { ...tx, category_id: category?.id, category_name: category?.name, category_icon: category?.icon },
    };
  }
  return { intent: state.intent, ...collected };
}

async function handleGoalCreate(parsed) {
  const goal = { ...(parsed.goal || {}) };
  if (goal.goal_type === 'saving' && /\b(mua|đặt cọc|chuyển nhà)\b/i.test(String(goal.name || ''))) {
    goal.goal_type = 'purchase';
  }
  const missing = [];
  if (!goal.name) missing.push('name');
  if (!(Number(goal.target_amount) > 0)) missing.push('target_amount');
  if (missing.length) {
    await ConversationState.start(userId, { intent: 'goal_create', awaiting: missing, collected: { goal } });
    return { type: 'clarification', message: await applyPersona('Bạn cho mình biết tên và số tiền của mục tiêu nhé.') };
  }
  const validation = validateGoalPayload(goal, { mode: 'create' });
  if (validation.errors.length) {
    return { type: 'clarification', message: await applyPersona(validation.errors[0]), details: validation.errors };
  }
  const normalizedGoal = validation.value;
  const planData = await GoalService.buildPlan(normalizedGoal, userId);
  const pendingId = await pending.set(userId, normalizedGoal, 'financial_goal');
  const plan = planData.plan || {};
  const horizon = plan.monthsNeeded == null ? 'chưa xác định được thời gian' : `khoảng ${plan.monthsNeeded} tháng`;
  const contribution = plan.contribution ? `, góp ${formatVND(plan.contribution)}/tháng` : '';
  return {
    type: 'goal_preview',
    message: await applyPersona(`Kế hoạch "${normalizedGoal.name}" cần ${formatVND(normalizedGoal.target_amount)}: ${horizon}${contribution}. Bạn xác nhận lưu mục tiêu nhé?`),
    goal: normalizedGoal,
    ...planData,
    pending_id: pendingId,
  };
}

async function narrateFacts(facts, periodLabel = 'gần đây') {
  const persona = await Persona.getActivePersona(userId);
  const narration = await AIService.narrateInsights(facts, { stylePrompt: persona.style_prompt, periodLabel });
  return { type: 'insight', message: narration.text, facts, persona: { id: persona.id, name: persona.name }, provider_used: narration.provider_used };
}

function totalsFromTransactions(transactions) {
  return (transactions || []).reduce((summary, transaction) => {
    const amount = Number(transaction.amount || 0);
    summary.transaction_count += 1;
    summary.total_amount += amount;
    if (transaction.type === 'income') summary.total_income += amount;
    if (transaction.type === 'expense') summary.total_expense += amount;
    return summary;
  }, { transaction_count: 0, total_income: 0, total_expense: 0, total_amount: 0 });
}

async function handleTransactionQuery(parsed) {
  const spec = parsed.query || {};
  const limit = Math.min(Math.max(Number(spec.limit || 5), 1), 20);
  let transactions;
  let totals;
  let period = null;
  let filters = {};
  let contextLabel;

  if (spec.reference === 'last_category_retag') {
    const context = await ChatMessage.getLatestCategoryRetagContext(userId);
    const transactionIds = categoryRetagTransactionIds(context);
    if (!transactionIds.length) {
      return {
        type: 'chat_response',
        message: await applyPersona('Mình chưa tìm thấy nhóm giao dịch vừa được phân loại để liệt kê. Bạn hãy yêu cầu lại gợi ý danh mục nhé.'),
      };
    }
    const exact = (await TransactionModel.getByIds(transactionIds, userId))
      .filter((transaction) => String(transaction.wallet_currency || 'VND').toUpperCase() === 'VND');
    totals = totalsFromTransactions(exact);
    transactions = exact.slice(0, limit);
    filters = { transaction_ids: transactionIds };
    contextLabel = 'trong nhóm vừa được phân loại';
  } else {
    period = queryWindow(spec);
    let categoryId = Number.isInteger(Number(spec.category_id)) && Number(spec.category_id) > 0
      ? Number(spec.category_id)
      : null;
    if (!categoryId && spec.category_name) {
      const categories = await CategoryModel.getAll(userId);
      const wantedCategory = normalizeText(spec.category_name);
      const category = categories.find((item) => (
        normalizeText(item.name) === wantedCategory
        && (!spec.type || item.type === spec.type)
      ));
      categoryId = category?.id || null;
      if (!categoryId) {
        return {
          type: 'transaction_list',
          message: await applyPersona(`Mình không tìm thấy danh mục “${String(spec.category_name).slice(0, 100)}”, nên chưa mở rộng truy vấn sang các giao dịch khác.`),
          transactions: [],
          summary: { transaction_count: 0, total_income: 0, total_expense: 0, total_amount: 0 },
          filters: { category_name: String(spec.category_name).slice(0, 100) },
          period,
        };
      }
    }
    filters = {
      from: period.from,
      to: period.to,
      type: ['income', 'expense'].includes(spec.type) ? spec.type : undefined,
      category_id: categoryId || undefined,
      search: String(spec.search || '').trim().slice(0, 150) || undefined,
      currency: 'VND',
    };
    const [page, aggregate] = await Promise.all([
      TransactionModel.getAll(userId, { ...filters, page: 1, limit }),
      TransactionModel.getFilteredTotals(userId, filters),
    ]);
    transactions = page.data || [];
    totals = aggregate;
    contextLabel = period.phrase;
  }

  const searchLabel = filters.search ? ` khớp “${filters.search}”` : '';
  if (!totals.transaction_count) {
    return {
      type: 'transaction_list',
      message: await applyPersona(`Mình không tìm thấy giao dịch nào${searchLabel} ${contextLabel}.`),
      transactions: [],
      summary: totals,
      filters,
      period,
    };
  }

  if (spec.action === 'aggregate') {
    const amountText = filters.type === 'expense'
      ? `tổng chi ${formatVND(totals.total_expense)}`
      : filters.type === 'income'
        ? `tổng thu ${formatVND(totals.total_income)}`
        : `tổng thu ${formatVND(totals.total_income)}, tổng chi ${formatVND(totals.total_expense)}`;
    return {
      type: 'transaction_summary',
      message: await applyPersona(`Mình tìm thấy ${totals.transaction_count} giao dịch${searchLabel} ${contextLabel}, ${amountText}.`),
      transactions,
      summary: totals,
      filters,
      period,
    };
  }

  const lines = transactions.map(transactionListLine).join('\n');
  const hidden = totals.transaction_count > transactions.length
    ? `\nCòn ${totals.transaction_count - transactions.length} giao dịch phù hợp; bạn có thể yêu cầu số lượng lớn hơn hoặc dùng bộ lọc giao dịch.`
    : '';
  return {
    type: 'transaction_list',
    message: await applyPersona(`${totals.transaction_count} giao dịch ${contextLabel}:\n${lines}${hidden}`),
    transactions,
    summary: totals,
    filters,
    period,
  };
}

// Trả lời các read intent từ dữ liệu thật, kèm đúng cửa sổ thời gian đã resolve.
async function handleFinancialQuery(parsed) {
  switch (parsed.intent) {
    case 'query_transactions':
      return handleTransactionQuery(parsed);
    case 'query_runway': {
      // Runway is a forward projection from the current balance, so it has no
      // user-selectable window; the label stays honest about that.
      const runway = await AnalyticsEngine.runwayFacts(userId, await resolveUserPayday(userId));
      return narrateFacts({ runway }, 'từ hôm nay trở đi');
    }
    case 'query_subscriptions': {
      const window = queryWindow(parsed.query || {});
      const analysisDays = Math.max(window.days, AnalyticsEngine.ANALYTICS_WINDOWS.subscriptionDays);
      const subscriptions = await AnalyticsEngine.subscriptionFacts(
        userId,
        analysisDays
      );
      return narrateFacts({ subscriptions }, `${analysisDays} ngày gần nhất`);
    }
    case 'query_insights': {
      const facts = await AnalyticsEngine.buildInsightFacts(userId, { payday: await resolveUserPayday(userId) });
      return narrateFacts(facts, 'theo cửa sổ cố định của từng chỉ số');
    }
    case 'query_summary': {
      const window = queryWindow(parsed.query || {});
      // A month keeps the existing month-indexed summary; any other window
      // ("tuần này", "hôm qua", a custom range) is totalled over its real dates
      // rather than silently widened to the whole month.
      if (window.is_month) {
        const summary = await ReportService.getMonthlySummary(userId, window.month, window.year);
        return {
          type: 'report',
          message: await applyPersona(`Tháng ${summary.month}/${summary.year}: thu ${formatVND(summary.total_income)}, chi ${formatVND(summary.total_expense)}, chênh lệch ${formatVND(summary.net)}.`),
          summary,
          period: window,
        };
      }
      const totals = await TransactionModel.getFilteredTotals(userId, { from: window.from, to: window.to });
      const summary = {
        from: window.from,
        to: window.to,
        total_income: totals.total_income,
        total_expense: totals.total_expense,
        net: totals.total_income - totals.total_expense,
        transaction_count: totals.transaction_count,
      };
      return {
        type: 'report',
        message: await applyPersona(`Tổng kết ${window.label}: thu ${formatVND(summary.total_income)}, chi ${formatVND(summary.total_expense)}, chênh lệch ${formatVND(summary.net)} (${summary.transaction_count} giao dịch).`),
        summary,
        period: window,
      };
    }
    case 'query_wallets': {
      const wallets = await AccountModel.getAll(userId);
      if (!wallets.length) {
        return { type: 'chat_response', message: await applyPersona('Bạn chưa có ví nào. Mình có thể tạo ví "Tiền mặt" để bắt đầu nhé?') };
      }
      const totalsByCurrency = wallets.reduce((totals, wallet) => {
        const currency = String(wallet.currency || 'VND').toUpperCase();
        totals[currency] = (totals[currency] || 0) + Number(wallet.balance || 0);
        return totals;
      }, {});
      const typeLabels = {
        cash: 'tiền mặt',
        bank: 'ngân hàng',
        e_wallet: 'ví điện tử',
        credit: 'thẻ tín dụng',
        savings: 'tiết kiệm',
        investment: 'đầu tư',
      };
      const lines = wallets.map((wallet, index) => {
        const label = typeLabels[wallet.type] || wallet.type;
        return `${index + 1}. ${wallet.name} (${label}): ${formatMoney(wallet.balance, wallet.currency)}${wallet.is_default ? ' • mặc định' : ''}`;
      }).join('\n');
      const totalLines = Object.entries(totalsByCurrency)
        .map(([currency, amount]) => formatMoney(amount, currency))
        .join(', ');
      const currencies = Object.keys(totalsByCurrency);
      return {
        type: 'wallet_list',
        message: await applyPersona(`Bạn có ${wallets.length} ví, số dư theo tiền tệ ${totalLines}:\n${lines}`),
        wallets,
        total_balance: currencies.length === 1 ? totalsByCurrency[currencies[0]] : null,
        total_balance_currency: currencies.length === 1 ? currencies[0] : null,
        totals_by_currency: totalsByCurrency,
      };
    }
    case 'query_goals': {
      const goals = await GoalModel.getAll(userId);
      if (!goals.length) return { type: 'chat_response', message: await applyPersona('Bạn chưa có mục tiêu tài chính nào.') };
      const rows = await Promise.all(goals.map(async (goal) => ({ ...goal, ...(await GoalService.buildPlan(goal, userId)) })));
      const lines = rows.map((goal, index) => `${index + 1}. ${goal.name}: ${formatVND(goal.current_amount)}/${formatVND(goal.target_amount)} (${goal.plan?.progressPercent || 0}%)`).join('\n');
      return { type: 'goal_list', message: await applyPersona(`Các mục tiêu hiện tại:\n${lines}`), goals: rows };
    }
    case 'query_budgets': {
      // Budgets are stored per calendar month, so a weekly/daily question is
      // answered with the month that contains it — but the period is still read
      // from the request instead of always defaulting to now.
      const window = queryWindow(parsed.query || {});
      // Take the month that contains the end of the window, so "tuần này" at the
      // start of August reads August's budgets rather than July's.
      const budgetMonth = window.is_month ? window.month : Number(window.to.slice(5, 7));
      const budgetYear = window.is_month ? window.year : Number(window.to.slice(0, 4));
      const periodLabel = `tháng ${budgetMonth}/${budgetYear}`;
      const all = forecastBudgets(await BudgetModel.getProgress(userId, budgetMonth, budgetYear));
      const wanted = String(parsed.query?.category_name || '').trim().slice(0, 100);
      const budgets = wanted
        ? all.filter((budget) => {
          const name = normalizeText(budget.category_name);
          const target = normalizeText(wanted);
          return name === target || name.includes(target) || target.includes(name);
        })
        : all;

      if (wanted && !budgets.length) {
        // Dumping every budget row here is what made "ngân sách cho bida" look
        // like a wrong answer to a different question.
        const known = all.length ? ` Bạn đang theo dõi: ${all.map((budget) => budget.category_name).join(', ')}.` : '';
        return {
          type: 'budget_progress',
          message: await applyPersona(`Bạn chưa đặt ngân sách cho “${wanted}” trong ${periodLabel}.${known}`),
          budgets: [],
          filters: { category_name: wanted },
          period: window,
        };
      }
      if (!budgets.length) {
        return {
          type: 'budget_progress',
          message: await applyPersona(`Bạn chưa đặt ngân sách nào cho ${periodLabel}.`),
          budgets,
          period: window,
        };
      }
      if (wanted) {
        const lines = budgets.map((budget) => (
          `• ${budget.category_name}: đã dùng ${formatVND(budget.spent)}/${formatVND(budget.amount_limit)} (${budget.percentage}%), còn ${formatVND(budget.remaining)}`
        )).join('\n');
        return {
          type: 'budget_progress',
          message: await applyPersona(`Ngân sách ${periodLabel} khớp “${wanted}”:\n${lines}`),
          budgets,
          filters: { category_name: wanted },
          period: window,
        };
      }
      const atRisk = budgets.filter((budget) => budget.likely_to_exceed);
      const riskSummary = atRisk.length
        ? ` ${atRisk.slice(0, 3).map((budget) => `${budget.category_name} dự kiến ${Math.round(budget.projected_percentage)}%`).join(', ')}.`
        : ' Chưa có danh mục nào được dự báo vượt hạn mức.';
      return {
        type: 'budget_progress',
        message: await applyPersona(`Bạn đang theo dõi ${budgets.length} ngân sách trong ${periodLabel}.${riskSummary}`),
        budgets,
        period: window,
      };
    }
    case 'query_category_suggestions': {
      const suggestions = await CategoryRetagService.discover(userId, { type: 'expense', months: 6, minimumOccurrences: 3 });
      if (!suggestions.length) {
        return { type: 'chat_response', message: await applyPersona('Chưa có đủ giao dịch lặp trong danh mục Khác để đề xuất danh mục mới.') };
      }
      const suggestion = suggestions[0];
      const plan = await CategoryRetagService.preparePlan(userId, suggestion);
      const pendingId = await pending.set(userId, { plan_id: plan.plan_id }, 'category_retag');
      return {
        type: 'category_suggestion',
        message: await applyPersona(`Mình thấy ${suggestion.occurrences} giao dịch tương tự và đề xuất danh mục "${suggestion.suggested_name}". Xác nhận để tạo danh mục và phân loại lại nhé?`),
        suggestion,
        plan,
        pending_id: pendingId,
      };
    }
    default:
      return null;
  }
}

function findWalletByName(wallets, name) {
  const wanted = normalizeText(name);
  if (!wanted) return null;
  return wallets.find((wallet) => normalizeText(wallet.name) === wanted)
    || wallets.find((wallet) => normalizeText(wallet.name).includes(wanted) || wanted.includes(normalizeText(wallet.name)));
}

async function handleTransferPreview(parsed) {
  const transfer = parsed.transfer || {};
  const wallets = await AccountModel.getAll(userId);
  const from = findWalletByName(wallets, transfer.from_wallet_name);
  const to = findWalletByName(wallets, transfer.to_wallet_name);
  if (!from || !to || !(Number(transfer.amount) > 0)) {
    return { type: 'clarification', message: await applyPersona('Bạn nói rõ ví nguồn, ví nhận và số tiền cần chuyển nhé.'), wallets: wallets.map(({ id, name }) => ({ id, name })) };
  }
  if (from.id === to.id) return { type: 'chat_response', message: await applyPersona('Ví nguồn và ví nhận phải khác nhau.') };
  if (!from.currency || !to.currency || from.currency !== to.currency) {
    return { type: 'chat_response', message: await applyPersona('Hai ví phải cùng đơn vị tiền tệ vì hệ thống chưa hỗ trợ quy đổi ngoại tệ.') };
  }
  const draft = {
    ...transfer,
    from_wallet_id: from.id,
    to_wallet_id: to.id,
    from_wallet_name: from.name,
    to_wallet_name: to.name,
    from_wallet_currency: from.currency,
    to_wallet_currency: to.currency,
  };
  const pendingId = await pending.set(userId, draft, 'transfer');
  return { type: 'transfer_preview', message: await applyPersona(`Chuyển ${formatMoney(draft.amount, from.currency)} từ ${from.name} sang ${to.name}. Bạn xác nhận nhé?`), transfer: draft, pending_id: pendingId };
}

async function handleInvestmentPreview(parsed) {
  const investment = parsed.investment || {};
  const wallets = await AccountModel.getAll(userId);
  const wallet = findWalletByName(wallets, investment.wallet_name);
  if (!wallet || !['investment', 'savings'].includes(wallet.type) || !Number.isFinite(Number(investment.amount)) || Number(investment.amount) === 0) {
    return {
      type: 'clarification',
      message: await applyPersona('Bạn nói rõ ví đầu tư và số tiền lãi hoặc lỗ nhé.'),
      investment_wallets: wallets.filter((item) => ['investment', 'savings'].includes(item.type)).map(({ id, name }) => ({ id, name })),
    };
  }
  const draft = { ...investment, wallet_id: wallet.id, wallet_name: wallet.name, wallet_currency: wallet.currency };
  const pendingId = await pending.set(userId, draft, 'investment_pnl');
  return { type: 'investment_preview', message: await applyPersona(`${Number(draft.amount) > 0 ? 'Lãi' : 'Lỗ'} ${formatMoney(Math.abs(draft.amount), wallet.currency)} tại ví ${wallet.name}. Bạn xác nhận nhé?`), investment: draft, pending_id: pendingId };
}

async function handleExport(parsed) {
  const spec = parsed.export || { format: 'csv' };
  const result = spec.format === 'pdf'
    ? await exportPDF(userId, spec)
    : await exportCSV(userId, spec);
  if (!result) return { type: 'chat_response', message: await applyPersona('Không có dữ liệu phù hợp để xuất.') };
  return {
    type: 'export_ready',
    message: await applyPersona(`Đã chuẩn bị file ${spec.format.toUpperCase()} cho bạn.`),
    format: spec.format,
    history_id: result.historyId,
    download_url: `/api/export/history/${result.historyId}/download`,
  };
}

// Dùng feedback gần nhất làm correction/few-shot trước khi chấp nhận kết quả parser.
async function parseWithLearnedFeedback(text, categories) {
  const examples = await FeedbackService.getFewShotExamples(userId, text, { limit: 5 }).catch(() => []);
  const fewShot = examples.length
    ? `Phân tích yêu cầu: "${text}". Các sửa danh mục trước đây của chính người dùng (chỉ dùng khi ngữ nghĩa và loại giao dịch tương tự):\n${examples.map((example) => `- "${example.input}" [${example.corrected_category?.type}] -> ${example.corrected_category?.category_name || example.corrected_category?.category_id}`).join('\n')}`
    : undefined;
  const parsed = await AIService.parseTransaction(text, categories, fewShot);
  const transactions = parsed.transactions || (parsed.transaction ? [parsed.transaction] : []);
  for (const transaction of transactions) {
    const correction = await FeedbackService.findCategoryCorrection(
      userId,
      transaction.description || text,
      { type: transaction.type }
    ).catch(() => null);
    if (!correction) continue;
    const category = correction.category_id
      ? categories.find((item) => Number(item.id) === Number(correction.category_id))
      : matchCategory(correction.category_name, categories, transaction.type);
    if (!category || category.type !== transaction.type) continue;
    Object.assign(transaction, {
      category_id: category.id,
      category_name: category.name,
      category_icon: category.icon,
      category_confidence: correction.confidence,
      category_match_kind: correction.match_kind,
    });
  }
  if (transactions.length) {
    parsed.transaction = transactions[0];
    parsed.transactions = transactions;
  }
  return parsed;
}

async function handleBudgetSuggestion(parsed) {
  const spec = parsed.budget || {};
  const recommendation = await BudgetRecommendationService.recommend(userId, {
    strategy: spec.strategy || 'hybrid',
    historyMonths: 6,
  });
  if (!recommendation.categories.length) {
    return { type: 'budget_suggestion', message: await applyPersona('Chưa đủ lịch sử chi tiêu để đề xuất ngân sách. Bạn hãy ghi thêm giao dịch nhé.'), recommendation };
  }
  const now = new Date();
  const payload = {
    recommendations: recommendation.categories.map((item) => ({ category_id: item.category_id, amount_limit: item.recommended_limit })),
    month: Number(spec.month || now.getMonth() + 1),
    year: Number(spec.year || now.getFullYear()),
    recommendation,
  };
  const pendingId = await pending.set(userId, payload, 'budget_recommendations');
  const top = recommendation.categories.slice(0, 4).map((item) => `${item.category_name}: ${formatVND(item.recommended_limit)}`).join(', ');
  return {
    type: 'budget_suggestion',
    message: await applyPersona(`Mình đề xuất tổng ngân sách ${formatVND(recommendation.total_recommended)} (${top}). Bạn xác nhận áp dụng nhé?`),
    recommendation,
    pending_id: pendingId,
  };
}

async function budgetAlertsForTransactions(transactions) {
  const categoryIds = new Set((transactions || []).filter((tx) => tx.type === 'expense').map((tx) => Number(tx.category_id)));
  if (!categoryIds.size) return [];
  const rows = forecastBudgets(await BudgetModel.getProgress(userId));
  return rows.filter((row) => categoryIds.has(Number(row.category_id)) && (row.status !== 'safe' || row.likely_to_exceed));
}

async function categorySuggestionsForTransactions(transactions) {
  if (!(transactions || []).some((tx) => tx.type === 'expense' && normalizeText(tx.category_name) === 'khac')) return [];
  return CategoryRetagService.discover(userId, { type: 'expense', months: 6, minimumOccurrences: 3 }).catch(() => []);
}

// Commit từng loại pending qua model tương ứng; transaction nhiều dòng vẫn all-or-nothing.
async function commitPendingItem(item) {
  let data;
  if (item.kind === 'recurring_bill') {
    const wallet = await AccountModel.ensureDefault(userId);
    const bill = await RecurringBillModel.create({ ...item.data, userId, wallet_id: item.data.wallet_id || wallet.id });
    data = {
      type: 'system_message',
      message: await applyPersona(`Đã tạo nhắc nhở "${bill.name}" ${formatVND(bill.amount)}. Kỳ thanh toán tới: ${bill.next_due_date}.`),
      bill,
    };
  } else if (item.kind === 'recurring_payment') {
    const result = await RecurringBillModel.recordPayment(item.data.bill_id, {
      amount: item.data.amount,
      walletId: item.data.wallet_id,
      categoryId: item.data.category_id,
      paidDate: item.data.transaction_date,
      periodDueDate: item.data.period_due_date,
      userId,
    });
    if (!result) {
      const error = new Error('Khoản chi cố định không còn tồn tại');
      error.status = 404;
      throw error;
    }
    const tx = result.transaction;
    const proactive_job = await enqueueJob(JOB_NAMES.RUNWAY_SCAN, { userId, trigger: 'recurring_payment' });
    data = {
      type: 'system_message',
      message: await applyPersona(`Đã ghi nhận thanh toán ${formatVND(tx.amount)} ${item.data.bill_name}. Số dư ví ${tx.wallet_name || ''} còn ${formatVND(tx.wallet_balance)}.`),
      transaction: tx,
      new_balance: Number(tx.wallet_balance),
      period_due_date: result.period_due_date,
      proactive_job,
    };
  } else if (item.kind === 'transactions') {
    const transactions = await TransactionModel.createMany(item.data, userId);
    await recordPendingClassificationFeedback(item, transactions);
    const proactive_job = await enqueueJob(JOB_NAMES.RUNWAY_SCAN, { userId, trigger: 'transactions_created' });
    const total = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const budgetAlerts = await budgetAlertsForTransactions(transactions);
    const categorySuggestions = await categorySuggestionsForTransactions(transactions);
    const suggestionText = categorySuggestions.length ? ' Mình cũng phát hiện một nhóm giao dịch trong “Khác”; hãy hỏi “gợi ý danh mục mới” để xem.' : '';
    data = { type: 'system_message', message: await applyPersona(`Đã lưu ${transactions.length} giao dịch, tổng ${formatVND(total)}.${suggestionText}`), transactions, budget_alerts: budgetAlerts, category_suggestions: categorySuggestions, proactive_job };
  } else if (item.kind === 'financial_goal') {
    const validation = validateGoalPayload(item.data, { mode: 'create' });
    if (validation.errors.length) {
      const error = new Error(validation.errors[0]);
      error.status = 400;
      error.details = validation.errors;
      throw error;
    }
    const goal = await GoalModel.create(validation.value, userId);
    data = {
      type: 'system_message',
      message: await applyPersona(`Đã lưu mục tiêu "${goal.name}" trị giá ${formatVND(goal.target_amount)}.`),
      goal: { ...goal, ...(await GoalService.buildPlan(goal, userId)) },
    };
  } else if (item.kind === 'budget_recommendations') {
    const budgets = await BudgetModel.upsertRecommendations(item.data.recommendations, {
      userId,
      month: item.data.month,
      year: item.data.year,
    });
    data = { type: 'system_message', message: await applyPersona(`Đã áp dụng ${budgets.length} ngân sách cho tháng ${item.data.month}/${item.data.year}.`), budgets };
  } else if (item.kind === 'category_retag') {
    const result = await CategoryRetagService.confirmPlan(userId, item.data.plan_id, true);
    data = { type: 'system_message', message: await applyPersona(`Đã tạo danh mục "${result.category.name}" và phân loại lại ${result.retagged_count} giao dịch.`), category_retag: result };
  } else if (item.kind === 'transfer') {
    const transfer = await TransferModel.create({ ...item.data, userId });
    data = { type: 'system_message', message: await applyPersona(`Đã chuyển ${formatMoney(transfer.amount, transfer.from_wallet_currency || item.data.from_wallet_currency)} từ ${transfer.from_wallet_name} sang ${transfer.to_wallet_name}.`), transfer };
  } else if (item.kind === 'investment_pnl') {
    const investment = await InvestmentPnLModel.create({ ...item.data, userId });
    data = { type: 'system_message', message: await applyPersona(`Đã ghi nhận ${Number(investment.amount) >= 0 ? 'lãi' : 'lỗ'} ${formatMoney(Math.abs(investment.amount), investment.wallet_currency || item.data.wallet_currency)}.`), investment };
  } else {
    const saved = await TransactionModel.create({ ...item.data, userId });
    await recordPendingClassificationFeedback(item, [saved]);
    const proactive_job = await enqueueJob(JOB_NAMES.RUNWAY_SCAN, { userId, trigger: 'transaction_created' });
    const budgetAlerts = await budgetAlertsForTransactions([saved]);
    const categorySuggestions = await categorySuggestionsForTransactions([saved]);
    const alertText = budgetAlerts.length
      ? ` Cảnh báo: ${budgetAlerts[0].category_name} đã dùng ${budgetAlerts[0].percentage}% ngân sách${budgetAlerts[0].projected_exceed_day ? ` và có thể vượt vào ngày ${budgetAlerts[0].projected_exceed_day}` : ''}.`
      : '';
    data = {
      type: 'system_message',
      message: await applyPersona(`Đã lưu giao dịch: ${saved.description} - ${formatVND(saved.amount)} vào ${saved.category_name}. Số dư hiện tại: ${formatVND(saved.wallet_balance)}.${alertText}${categorySuggestions.length ? ' Mình thấy nhóm chi lặp trong “Khác”; bạn có thể hỏi “gợi ý danh mục mới”.' : ''}`),
      transaction: saved,
      new_balance: Number(saved.wallet_balance),
      budget_alerts: budgetAlerts,
      category_suggestions: categorySuggestions,
      proactive_job,
    };
  }
  const followUps = Array.isArray(item.metadata?.follow_up) ? item.metadata.follow_up : [];
  const followUpResponses = [];
  for (const command of followUps) {
    if (!String(command.intent || '').startsWith('query_')) continue;
    const response = await handleFinancialQuery(command);
    if (response) followUpResponses.push(response);
  }
  if (followUpResponses.length) {
    data.follow_up = followUpResponses;
    data.message = `${data.message}\n\n${followUpResponses.map((response) => response.message).join('\n\n')}`;
  }
  return data;
}

function pendingIdFromBody(body = {}) {
  const value = body.pending_id ?? body.pendingId;
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

async function claimPendingRequest(expectedId = null) {
  // Validate while the preview is still stored. A future date must not consume
  // the pending item: the user can use /edit to correct it and confirm again.
  const preview = await pending.get(userId);
  if (preview && (!expectedId || String(preview.id) === String(expectedId))) {
    validatePendingTransactionDates(preview);
  }
  const item = await pending.claim(userId, expectedId);
  if (item) return { item };

  // A mismatching id must not consume a newer preview. Distinguish that conflict
  // from an expired/already-claimed item for clients that send pending_id.
  const current = await pending.get(userId);
  if (current) {
    return {
      status: 409,
      error: 'Mục chờ xác nhận đã thay đổi hoặc đang được chỉnh sửa; vui lòng kiểm tra bản xem trước mới nhất',
    };
  }
  return {
    status: 404,
    error: 'Không có mục chờ xác nhận, mục đã hết hạn hoặc đã được xử lý',
  };
}

async function cancelPendingWork(expectedId = null) {
  const item = await pending.claim(userId, expectedId);
  if (!item && expectedId) {
    const current = await pending.get(userId);
    if (current) {
      return {
        status: 409,
        error: 'Mục chờ đã thay đổi; bản xem trước mới nhất không bị hủy',
      };
    }
  }
  if (item?.kind === 'category_retag' && item.data?.plan_id) {
    await CategoryRetagService.cancelPlan(userId, item.data.plan_id).catch(() => {});
  }
  await ConversationState.clear(userId);
  return { item };
}

// Nhận một lượt chat: ưu tiên state/read intent, sau đó mới tạo preview cho thao tác ghi.
router.post('/message', async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text || text.length > 500) return res.status(400).json({ success: false, error: 'Nội dung không hợp lệ' });

  await ChatMessage.create({ userId, role: 'user', content: text });
  const categories = await CategoryModel.getAll(userId);
  const normalized = normalizeText(text);

  if (/^(huy|bo qua|khong luu|cancel)(?:\s|$)/.test(normalized)) {
    await cancelPendingWork(pendingIdFromBody(req.body));
    const data = { type: 'system_message', message: await applyPersona('Đã hủy thao tác đang chờ.') };
    await ChatMessage.create({ userId, role: 'system', content: data.message, metadata: data });
    return res.json({ success: true, data });
  }

  if (/^(xac nhan|dong y|luu|ok|okay)(?:\s|$)/.test(normalized)) {
    const claimed = await claimPendingRequest(pendingIdFromBody(req.body));
    if (!claimed.item) return res.status(claimed.status).json({ success: false, error: claimed.error });
    const data = await commitPendingItem(claimed.item);
    await ChatMessage.create({ userId, role: 'system', content: data.message, metadata: data });
    return res.json({ success: true, data });
  }

  const recurringAcknowledgement = isRecurringPaymentAcknowledgement(text);
  if (recurringAcknowledgement) await ConversationState.clear(userId);
  let conversation = recurringAcknowledgement ? null : await ConversationState.get(userId);
  if (conversation && abandonsConversation(text, conversation, categories)) {
    await ConversationState.clear(userId);
    conversation = null;
  }
  const parsed = conversation
    ? await resolveConversation(text, conversation, categories)
    : await parseWithLearnedFeedback(text, categories);

  let data;
  if (parsed?.intent === '__clarification__') {
    data = parsed.response;
  } else if (RECURRING_HANDLERS[parsed.intent]) {
    data = await RECURRING_HANDLERS[parsed.intent](parsed);
  } else if (parsed.intent === 'goal_create') {
    data = await handleGoalCreate(parsed);
  } else if (String(parsed.intent || '').startsWith('query_')) {
    data = await handleFinancialQuery(parsed);
  } else if (parsed.intent === 'export') {
    data = await handleExport(parsed);
  } else if (parsed.intent === 'transfer') {
    data = await handleTransferPreview(parsed);
  } else if (parsed.intent === 'investment_pnl') {
    data = await handleInvestmentPreview(parsed);
  } else if (parsed.intent === 'budget_suggest') {
    data = await handleBudgetSuggestion(parsed);
  } else if (parsed.intent === 'transactions' && parsed.transactions?.length) {
    const wallet = await AccountModel.ensureDefault(userId);
    const transactions = parsed.transactions.map((transaction) => ({
      ...transaction,
      wallet_id: transaction.wallet_id || wallet.id,
      source: 'ai_chat',
      original_text: parsed.original_text || text,
    }));
    const pendingId = await pending.set(userId, transactions, 'transactions', { follow_up: parsed.follow_up || [] });
    data = {
      type: 'transactions_preview',
      message: await applyPersona(`Mình tìm thấy ${transactions.length} giao dịch. Bạn kiểm tra rồi xác nhận tất cả nhé.`),
      transactions,
      pending_id: pendingId,
    };
  } else if (parsed.intent === 'transaction' && parsed.transaction?.amount) {
    const wallet = await AccountModel.ensureDefault(userId);
    const tx = { ...parsed.transaction, wallet_id: wallet.id, source: 'ai_chat', original_text: parsed.original_text || text };
    const pendingId = await pending.set(userId, tx, 'transaction', { follow_up: parsed.follow_up || [] });
    data = previewResponse(tx, pendingId);
  } else if (parsed.needs_clarification) {
    const partial = parsed.transaction || {};
    const awaiting = [];
    if (!partial.description) awaiting.push('description');
    if (!(Number(partial.amount) > 0)) awaiting.push('amount');
    if (awaiting.length) await ConversationState.start(userId, { intent: 'transaction', awaiting, collected: { transaction: partial }, original_text: text });
    data = { type: 'clarification', message: await applyPersona(parsed.clarification_message || 'Bạn nói rõ hơn giúp mình nhé.') };
  } else {
    const [recentMessages, summary, persona, profile] = await Promise.all([
      ChatMessage.getRecent(userId, 10),
      ReportService.getMonthlySummary(userId),
      Persona.getActivePersona(userId),
      UserTraitModel.getProfile(userId),
    ]);
    const chat = parsed.chat_response
      ? { text: await applyPersona(parsed.chat_response) }
      : await AIService.chat(text, {
        summary,
        traits: profile.consent ? profile.traits.map(({ trait_type, trait_value }) => ({ trait_type, trait_value })) : [],
        recent_messages: recentMessages.map(({ role, content }) => ({ role, content })),
        persona_style: persona.style_prompt,
      });
    data = { type: 'chat_response', message: chat.text };
  }

  await ChatMessage.create({ userId, role: 'assistant', content: data.message, metadata: data });
  res.json({ success: true, data });
});

// Claim pending đúng một lần rồi commit; request xác nhận lặp không tạo dữ liệu trùng.
router.post('/confirm', async (req, res) => {
  const claimed = await claimPendingRequest(pendingIdFromBody(req.body));
  if (!claimed.item) return res.status(claimed.status).json({ success: false, error: claimed.error });

  const data = await commitPendingItem(claimed.item);
  await ChatMessage.create({ userId, role: 'system', content: data.message, metadata: data });
  res.json({ success: true, data });
});

// Validation và cập nhật draft đang chờ, chưa tác động tới sổ cái.
router.post('/edit', async (req, res) => {
  const current = await pending.get(userId);
  const expectedId = pendingIdFromBody(req.body) || current?.id || null;
  let item;
  if (current?.kind === 'transactions' && Number.isInteger(Number(req.body.index))) {
    const index = Number(req.body.index);
    const rawUpdates = req.body.transaction || req.body.updates || {};
    const updates = await preparePendingTransactionUpdates(current.data?.[index], rawUpdates);
    item = await pending.updateAt(userId, index, updates, expectedId, {
      updateMetadata: (metadata) => updateClassificationCorrectionMetadata(
        metadata,
        current.data[index],
        updates,
        index
      ),
    });
  } else {
    const {
      pending_id: _pendingId,
      pendingId: _pendingIdAlias,
      index: _index,
      transaction,
      updates,
      ...directUpdates
    } = req.body;
    const rawUpdates = transaction || updates || directUpdates;
    const preparedUpdates = ['transaction', 'recurring_payment'].includes(current?.kind)
      ? await preparePendingTransactionUpdates(current.data, rawUpdates)
      : rawUpdates;
    item = await pending.update(userId, preparedUpdates, expectedId, {
      updateMetadata: (metadata) => (
        ['transaction', 'recurring_payment'].includes(current?.kind)
          ? updateClassificationCorrectionMetadata(metadata, current.data, preparedUpdates, 0)
          : metadata
      ),
    });
  }
  if (!item) {
    const latest = await pending.get(userId);
    const status = latest ? 409 : 404;
    const error = latest
      ? 'Mục chờ đã thay đổi; vui lòng tải lại bản xem trước trước khi sửa'
      : 'Không có giao dịch chờ sửa, mục đã hết hạn hoặc đang được xử lý';
    return res.status(status).json({ success: false, error });
  }
  const data = item.kind === 'transactions'
    ? { type: 'transactions_preview', message: 'Mình đã cập nhật. Bạn xác nhận tất cả nhé:', transactions: item.data, pending_id: item.id }
    : previewResponse(item.data, item.id, 'Mình đã cập nhật. Bạn xác nhận nhé:');
  res.json({ success: true, data });
});

// Hủy pending/clarification liên quan mà không tạo side effect tài chính.
router.post('/cancel', async (req, res) => {
  const cancelled = await cancelPendingWork(pendingIdFromBody(req.body));
  if (cancelled.error) return res.status(cancelled.status).json({ success: false, error: cancelled.error });
  const data = { type: 'system_message', message: await applyPersona('Đã hủy') };
  await ChatMessage.create({ userId, role: 'system', content: data.message, metadata: data });
  res.json({ success: true, data });
});

module.exports = router;
module.exports.buildReminders = buildReminders;
module.exports.coveredRecurringBillIds = coveredRecurringBillIds;
module.exports.categoryRetagTransactionIds = categoryRetagTransactionIds;
module.exports.recurringReminderBillIds = recurringReminderBillIds;
module.exports.selectRelevantReminderBills = selectRelevantReminderBills;
module.exports.transactionMonthWindow = transactionMonthWindow;
module.exports.queryWindow = queryWindow;
module.exports.handleFinancialQuery = handleFinancialQuery;
module.exports.abandonsConversation = abandonsConversation;
module.exports.totalsFromTransactions = totalsFromTransactions;
module.exports.handleRecurringPay = handleRecurringPay;
module.exports.handleTransactionQuery = handleTransactionQuery;
module.exports.preparePendingTransactionUpdates = preparePendingTransactionUpdates;
module.exports.validatePendingTransactionDates = validatePendingTransactionDates;
module.exports.updateClassificationCorrectionMetadata = updateClassificationCorrectionMetadata;
module.exports.recordPendingClassificationFeedback = recordPendingClassificationFeedback;

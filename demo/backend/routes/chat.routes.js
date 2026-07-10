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
const ReportService = require('../services/report.service');
const AnalyticsEngine = require('../services/analytics');
const GoalService = require('../services/goals');
const { validateGoalPayload } = require('../services/goals/validation');
const Persona = require('../services/persona.service');
const ConversationState = require('../services/conversationState.service');
const { TransferModel, InvestmentPnLModel } = require('../models/cashflow.model');
const { exportCSV, exportPDF } = require('../services/export.service');
const { enqueueJob, JOB_NAMES } = require('../services/jobs');
const { resolveUserPayday } = require('../services/jobs/userScope');
const ChatMessage = require('../models/chatMessage.model');
const pending = require('../services/pendingTransaction.service');
const { matchCategory, normalizeAmount, normalizeText } = require('../services/parser.service');

const router = express.Router();
const userId = 'default_user';

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
}

// Cheap persona decoration for short system messages. Longer advice is narrated by
// AIService with the same persona's style_prompt.
async function applyPersona(text) {
  const persona = await Persona.getActivePersona(userId);
  return persona.decorate(text);
}

function previewResponse(transaction, pendingId, message = 'Mình hiểu bạn muốn ghi nhận giao dịch này:') {
  return { type: 'transaction_preview', message, transaction, pending_id: pendingId };
}

// Build proactive reminder messages for bills whose reminder window has arrived (FR-08-03).
// Multiple bills due the same day are merged into one summary message.
async function buildReminders() {
  const due = await RecurringBillModel.getDueBills(userId);
  if (!due.length) return [];

  if (due.length === 1) {
    const bill = due[0];
    const text = await applyPersona(
      `Hôm nay đến hạn đóng ${formatVND(bill.amount)} ${bill.name}` +
      `${bill.wallet_name ? ` (ví ${bill.wallet_name}${bill.wallet_balance != null ? ` còn ${formatVND(bill.wallet_balance)}` : ''})` : ''}` +
      `${bill.wallet_balance != null && Number(bill.wallet_balance) < Number(bill.amount) ? `, đang thiếu ${formatVND(Number(bill.amount) - Number(bill.wallet_balance))}` : ''}, bạn đã thanh toán chưa để mình cập nhật số dư?`
    );
    return [{ type: 'reminder', message: text, bill_id: bill.id, bills: [bill] }];
  }

  const total = due.reduce((sum, b) => sum + Number(b.amount), 0);
  const lines = due.map((b) => `• ${b.name}: ${formatVND(b.amount)}${b.wallet_name ? ` (ví ${b.wallet_name}${b.wallet_balance != null ? ` còn ${formatVND(b.wallet_balance)}` : ''})` : ''}${b.wallet_balance != null && Number(b.wallet_balance) < Number(b.amount) ? ` — thiếu ${formatVND(Number(b.amount) - Number(b.wallet_balance))}` : ''}`).join('\n');
  const text = await applyPersona(`Hôm nay bạn có ${due.length} khoản chi cố định đến hạn, tổng ${formatVND(total)}:\n${lines}\nBạn đã thanh toán khoản nào chưa?`);
  return [{ type: 'reminder', message: text, bills: due }];
}

router.get('/messages', async (req, res, next) => {
  try {
    const [messages, reminders] = await Promise.all([
      ChatMessage.getRecent(userId, req.query.limit || 30),
      buildReminders(),
    ]);
    res.json({ success: true, data: messages, reminders });
  } catch (error) {
    next(error);
  }
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
    return `• ${b.name}: ${formatVND(b.amount)} ${freqLabel}, kỳ kế ${b.next_due_date}${status}`;
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
  if (name) {
    const { bill, candidates } = await findBillByName(name);
    target = bill;
    if (!target && candidates.length > 1) return startBillChoice('recurring_pay', candidates, 'Bạn vừa thanh toán khoản nào?');
  }
  if (!target) {
    const due = await RecurringBillModel.getDueBills(userId);
    if (due.length === 1) target = due[0];
    else if (due.length > 1) {
      return startBillChoice('recurring_pay', due, 'Bạn vừa thanh toán khoản nào trong số này?');
    }
  }
  if (parsed.recurring?.bill_id) target = await RecurringBillModel.getById(parsed.recurring.bill_id);
  if (!target) return { type: 'chat_response', message: await applyPersona('Mình chưa thấy khoản chi cố định nào đến hạn để ghi nhận. Bạn nói rõ tên khoản chi nhé.') };

  // Use overridden amount if AI extracted one (FR-08-04: "đã đóng nhưng tháng này 1.6tr")
  const overrideAmount = parsed.recurring?.amount || parsed.transaction?.amount;
  const result = await RecurringBillModel.recordPayment(target.id, { amount: overrideAmount });
  const tx = result.transaction;
  const proactive_job = await enqueueJob(JOB_NAMES.RUNWAY_SCAN, { userId, trigger: 'recurring_payment' });
  return {
    type: 'system_message',
    message: await applyPersona(`Đã ghi nhận thanh toán ${formatVND(tx.amount)} ${target.name}. Số dư ví ${tx.wallet_name} còn ${formatVND(tx.wallet_balance)}.`),
    transaction: tx,
    new_balance: Number(tx.wallet_balance),
    proactive_job,
  };
}

async function handleRecurringPause(parsed) {
  if (parsed.recurring?.bill_id) {
    const target = await RecurringBillModel.getById(parsed.recurring.bill_id);
    if (target) {
      await RecurringBillModel.pause(target.id);
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
  await RecurringBillModel.pause(bill.id);
  return { type: 'system_message', message: await applyPersona(`Đã tạm dừng nhắc "${bill.name}". Bạn kích hoạt lại bất kỳ lúc nào nhé.`) };
}

async function handleRecurringHistory(parsed) {
  if (parsed.recurring?.bill_id) {
    const target = await RecurringBillModel.getById(parsed.recurring.bill_id);
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
  const { payments, summary } = await RecurringBillModel.getPaymentHistory(bill.id);
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

async function handleFinancialQuery(parsed) {
  switch (parsed.intent) {
    case 'query_runway': {
      const runway = await AnalyticsEngine.runwayFacts(userId, await resolveUserPayday(userId));
      return narrateFacts({ runway });
    }
    case 'query_subscriptions': {
      const subscriptions = await AnalyticsEngine.subscriptionFacts(userId);
      return narrateFacts({ subscriptions });
    }
    case 'query_insights': {
      const facts = await AnalyticsEngine.buildInsightFacts(userId, { payday: await resolveUserPayday(userId) });
      return narrateFacts(facts);
    }
    case 'query_summary': {
      const summary = await ReportService.getMonthlySummary(userId, parsed.query?.month, parsed.query?.year);
      return { type: 'report', message: await applyPersona(`Tháng ${summary.month}/${summary.year}: thu ${formatVND(summary.total_income)}, chi ${formatVND(summary.total_expense)}, chênh lệch ${formatVND(summary.net)}.`), summary };
    }
    case 'query_goals': {
      const goals = await GoalModel.getAll(userId);
      if (!goals.length) return { type: 'chat_response', message: await applyPersona('Bạn chưa có mục tiêu tài chính nào.') };
      const rows = await Promise.all(goals.map(async (goal) => ({ ...goal, ...(await GoalService.buildPlan(goal, userId)) })));
      const lines = rows.map((goal, index) => `${index + 1}. ${goal.name}: ${formatVND(goal.current_amount)}/${formatVND(goal.target_amount)} (${goal.plan?.progressPercent || 0}%)`).join('\n');
      return { type: 'goal_list', message: await applyPersona(`Các mục tiêu hiện tại:\n${lines}`), goals: rows };
    }
    case 'query_budgets': {
      const budgets = await BudgetModel.getProgress(userId);
      return { type: 'budget_progress', message: await applyPersona(budgets.length ? `Bạn đang theo dõi ${budgets.length} ngân sách trong tháng này.` : 'Bạn chưa đặt ngân sách tháng này.'), budgets };
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
  const draft = { ...transfer, from_wallet_id: from.id, to_wallet_id: to.id, from_wallet_name: from.name, to_wallet_name: to.name };
  const pendingId = await pending.set(userId, draft, 'transfer');
  return { type: 'transfer_preview', message: await applyPersona(`Chuyển ${formatVND(draft.amount)} từ ${from.name} sang ${to.name}. Bạn xác nhận nhé?`), transfer: draft, pending_id: pendingId };
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
  const draft = { ...investment, wallet_id: wallet.id, wallet_name: wallet.name };
  const pendingId = await pending.set(userId, draft, 'investment_pnl');
  return { type: 'investment_preview', message: await applyPersona(`${Number(draft.amount) > 0 ? 'Lãi' : 'Lỗ'} ${formatVND(Math.abs(draft.amount))} tại ví ${wallet.name}. Bạn xác nhận nhé?`), investment: draft, pending_id: pendingId };
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

async function parseWithLearnedFeedback(text, categories) {
  const examples = await FeedbackService.getFewShotExamples(userId, text, { limit: 5 }).catch(() => []);
  const fewShot = examples.length
    ? `Phân tích yêu cầu: "${text}". Các sửa danh mục trước đây của chính người dùng (chỉ dùng khi ngữ nghĩa tương tự):\n${examples.map((example) => `- "${example.input}" -> ${example.corrected_category?.category_name || example.corrected_category?.category_id}`).join('\n')}`
    : undefined;
  const parsed = await AIService.parseTransaction(text, categories, fewShot);
  const transactions = parsed.transactions || (parsed.transaction ? [parsed.transaction] : []);
  for (const transaction of transactions) {
    const correction = await FeedbackService.findCategoryCorrection(userId, transaction.description || text).catch(() => null);
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
  } else if (item.kind === 'transactions') {
    const transactions = await TransactionModel.createMany(item.data, userId);
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
    data = { type: 'system_message', message: await applyPersona(`Đã chuyển ${formatVND(transfer.amount)} từ ${transfer.from_wallet_name} sang ${transfer.to_wallet_name}.`), transfer };
  } else if (item.kind === 'investment_pnl') {
    const investment = await InvestmentPnLModel.create({ ...item.data, userId });
    data = { type: 'system_message', message: await applyPersona(`Đã ghi nhận ${Number(investment.amount) >= 0 ? 'lãi' : 'lỗ'} ${formatVND(Math.abs(investment.amount))}.`), investment };
  } else {
    const saved = await TransactionModel.create({ ...item.data, userId });
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
  await pending.clear(userId);
  return data;
}

async function cancelPendingWork() {
  const item = await pending.get(userId);
  if (item?.kind === 'category_retag' && item.data?.plan_id) {
    await CategoryRetagService.cancelPlan(userId, item.data.plan_id).catch(() => {});
  }
  await Promise.all([pending.clear(userId), ConversationState.clear(userId)]);
}

router.post('/message', async (req, res, next) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text || text.length > 500) return res.status(400).json({ success: false, error: 'Nội dung không hợp lệ' });

    await ChatMessage.create({ userId, role: 'user', content: text });
    const categories = await CategoryModel.getAll(userId);
    const normalized = normalizeText(text);

    if (/^(huy|bo qua|khong luu|cancel)(?:\s|$)/.test(normalized)) {
      await cancelPendingWork();
      const data = { type: 'system_message', message: await applyPersona('Đã hủy thao tác đang chờ.') };
      await ChatMessage.create({ userId, role: 'system', content: data.message, metadata: data });
      return res.json({ success: true, data });
    }

    if (/^(xac nhan|dong y|luu|ok|okay)(?:\s|$)/.test(normalized)) {
      const item = await pending.get(userId);
      if (item) {
        const data = await commitPendingItem(item);
        await ChatMessage.create({ userId, role: 'system', content: data.message, metadata: data });
        return res.json({ success: true, data });
      }
    }

    const conversation = await ConversationState.get(userId);
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
  } catch (error) {
    next(error);
  }
});

router.post('/confirm', async (req, res, next) => {
  try {
    const item = await pending.get(userId);
    if (!item) return res.status(404).json({ success: false, error: 'Không có mục chờ xác nhận hoặc đã hết hạn' });

    const data = await commitPendingItem(item);
    await ChatMessage.create({ userId, role: 'system', content: data.message, metadata: data });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/edit', async (req, res, next) => {
  try {
    const current = await pending.get(userId);
    let item;
    if (current?.kind === 'transactions' && Number.isInteger(Number(req.body.index))) {
      const index = Number(req.body.index);
      if (!current.data[index]) return res.status(400).json({ success: false, error: 'Vị trí giao dịch không hợp lệ' });
      const next = [...current.data];
      next[index] = { ...next[index], ...(req.body.transaction || req.body.updates || {}) };
      await pending.clear(userId);
      await pending.set(userId, next, 'transactions', current.metadata || {});
      item = await pending.get(userId);
    } else {
      item = await pending.update(userId, req.body);
    }
    if (!item) return res.status(404).json({ success: false, error: 'Không có giao dịch chờ sửa hoặc đã hết hạn' });
    const data = item.kind === 'transactions'
      ? { type: 'transactions_preview', message: 'Mình đã cập nhật. Bạn xác nhận tất cả nhé:', transactions: item.data, pending_id: item.id }
      : previewResponse(item.data, item.id, 'Mình đã cập nhật. Bạn xác nhận nhé:');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/cancel', async (req, res, next) => {
  try {
    await cancelPendingWork();
    const data = { type: 'system_message', message: await applyPersona('Đã hủy') };
    await ChatMessage.create({ userId, role: 'system', content: data.message, metadata: data });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

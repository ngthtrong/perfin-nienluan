const express = require('express');
const AIService = require('../services/ai.service');
const CategoryModel = require('../models/category.model');
const AccountModel = require('../models/account.model');
const TransactionModel = require('../models/transaction.model');
const RecurringBillModel = require('../models/recurringBill.model');
const ChatMessage = require('../models/chatMessage.model');
const pending = require('../services/pendingTransaction.service');
const { matchCategory } = require('../services/parser.service');

const router = express.Router();
const userId = 'default_user';

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
}

// REQ-09 hook: the active AI personality will rewrite the tone of this text. No-op for now —
// personality is the documented next step. Keep all proactive/reminder text routed through here.
function applyPersona(text /* , personaId */) {
  return text;
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
    const text = applyPersona(
      `Hôm nay đến hạn đóng ${formatVND(bill.amount)} ${bill.name}` +
      `${bill.wallet_name ? ` (ví ${bill.wallet_name})` : ''}, bạn đã thanh toán chưa để mình cập nhật số dư?`
    );
    return [{ type: 'reminder', message: text, bill_id: bill.id, bills: [bill] }];
  }

  const total = due.reduce((sum, b) => sum + Number(b.amount), 0);
  const lines = due.map((b) => `• ${b.name}: ${formatVND(b.amount)}${b.wallet_name ? ` (ví ${b.wallet_name})` : ''}`).join('\n');
  const text = applyPersona(`Hôm nay bạn có ${due.length} khoản chi cố định đến hạn, tổng ${formatVND(total)}:\n${lines}\nBạn đã thanh toán khoản nào chưa?`);
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
    return { type: 'clarification', message: applyPersona(`Bạn bổ sung giúp mình ${missing.join(', ')} để tạo nhắc nhở nhé.`) };
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
    message: applyPersona(`Mình sẽ tạo nhắc nhở "${draft.name}" ${formatVND(draft.amount)} ${freqLabel}, ngày ${draft.due_day}. Bạn xác nhận nhé?`),
    bill: draft,
    pending_id: pendingId,
  };
}

async function handleRecurringList() {
  const bills = await RecurringBillModel.getAll(userId);
  if (!bills.length) return { type: 'chat_response', message: applyPersona('Bạn chưa có khoản chi cố định nào. Hãy nói "nhắc tiền phòng trọ 1.5 triệu mỗi tháng ngày 5" để tạo nhé.') };
  const lines = bills.map((b) => {
    const freqLabel = { weekly: 'hàng tuần', monthly: 'hàng tháng', quarterly: 'hàng quý', yearly: 'hàng năm' }[b.frequency];
    const status = b.status === 'paused' ? ' [Tạm dừng]' : '';
    return `• ${b.name}: ${formatVND(b.amount)} ${freqLabel}, kỳ kế ${b.next_due_date}${status}`;
  }).join('\n');
  return { type: 'chat_response', message: applyPersona(`Các khoản chi cố định của bạn:\n${lines}`) };
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
    const { bill } = await findBillByName(name);
    target = bill;
  }
  if (!target) {
    const due = await RecurringBillModel.getDueBills(userId);
    if (due.length === 1) target = due[0];
    else if (due.length > 1) {
      const lines = due.map((b) => `• ${b.name}`).join('\n');
      return { type: 'clarification', message: applyPersona(`Bạn vừa thanh toán khoản nào trong số này?\n${lines}`) };
    }
  }
  if (!target) return { type: 'chat_response', message: applyPersona('Mình chưa thấy khoản chi cố định nào đến hạn để ghi nhận. Bạn nói rõ tên khoản chi nhé.') };

  // Use overridden amount if AI extracted one (FR-08-04: "đã đóng nhưng tháng này 1.6tr")
  const overrideAmount = parsed.recurring?.amount || parsed.transaction?.amount;
  const result = await RecurringBillModel.recordPayment(target.id, { amount: overrideAmount });
  const tx = result.transaction;
  return {
    type: 'system_message',
    message: applyPersona(`Đã ghi nhận thanh toán ${formatVND(tx.amount)} ${target.name}. Số dư ví ${tx.wallet_name} còn ${formatVND(tx.wallet_balance)}.`),
    transaction: tx,
    new_balance: Number(tx.wallet_balance),
  };
}

async function handleRecurringPause(parsed) {
  const { bill, candidates } = await findBillByName(parsed.recurring?.name);
  if (!bill) {
    if (candidates.length > 1) {
      const lines = candidates.map((b) => `• ${b.name}`).join('\n');
      return { type: 'clarification', message: applyPersona(`Bạn muốn tạm dừng khoản nào?\n${lines}`) };
    }
    return { type: 'chat_response', message: applyPersona('Mình không tìm thấy khoản chi cố định đó.') };
  }
  await RecurringBillModel.pause(bill.id);
  return { type: 'system_message', message: applyPersona(`Đã tạm dừng nhắc "${bill.name}". Bạn kích hoạt lại bất kỳ lúc nào nhé.`) };
}

async function handleRecurringHistory(parsed) {
  const { bill, candidates } = await findBillByName(parsed.recurring?.name);
  if (!bill) {
    if (candidates.length > 1) {
      const lines = candidates.map((b) => `• ${b.name}`).join('\n');
      return { type: 'clarification', message: applyPersona(`Bạn muốn xem lịch sử khoản nào?\n${lines}`) };
    }
    return { type: 'chat_response', message: applyPersona('Mình không tìm thấy khoản chi cố định đó.') };
  }
  const { payments, summary } = await RecurringBillModel.getPaymentHistory(bill.id);
  if (!payments.length) return { type: 'chat_response', message: applyPersona(`"${bill.name}" chưa có lịch sử thanh toán nào.`) };
  const recent = payments.slice(0, 5).map((p) => `• ${p.period_due_date}: ${formatVND(p.amount)} (${p.status === 'paid' ? 'đã thanh toán' : p.status})`).join('\n');
  return { type: 'chat_response', message: applyPersona(`Lịch sử "${bill.name}" (đã trả ${summary.paid_count} kỳ, tổng ${formatVND(summary.total_paid)}):\n${recent}`) };
}

const RECURRING_HANDLERS = {
  recurring_create: handleRecurringCreate,
  recurring_list: handleRecurringList,
  recurring_pay: handleRecurringPay,
  recurring_pause: handleRecurringPause,
  recurring_history: handleRecurringHistory,
};

router.post('/message', async (req, res, next) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text || text.length > 500) return res.status(400).json({ success: false, error: 'Nội dung không hợp lệ' });

    await ChatMessage.create({ userId, role: 'user', content: text });
    const categories = await CategoryModel.getAll(userId);
    const parsed = await AIService.parseTransaction(text, categories);

    let data;
    if (RECURRING_HANDLERS[parsed.intent]) {
      data = await RECURRING_HANDLERS[parsed.intent](parsed);
    } else if (parsed.intent === 'transaction' && parsed.transaction?.amount) {
      const wallet = await AccountModel.ensureDefault(userId);
      const tx = { ...parsed.transaction, wallet_id: wallet.id, source: 'ai_chat', original_text: text };
      const pendingId = await pending.set(userId, tx, 'transaction');
      data = previewResponse(tx, pendingId);
    } else if (parsed.needs_clarification) {
      data = { type: 'clarification', message: parsed.clarification_message || 'Bạn nói rõ hơn giúp mình nhé.' };
    } else {
      const chat = await AIService.chat(text, { recent_messages: await ChatMessage.getRecent(userId, 10) });
      data = { type: 'chat_response', message: parsed.chat_response || chat.text };
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

    let data;
    if (item.kind === 'recurring_bill') {
      const wallet = await AccountModel.ensureDefault(userId);
      const bill = await RecurringBillModel.create({ ...item.data, userId, wallet_id: item.data.wallet_id || wallet.id });
      const message = applyPersona(`Đã tạo nhắc nhở "${bill.name}" ${formatVND(bill.amount)}. Kỳ thanh toán tới: ${bill.next_due_date}.`);
      data = { type: 'system_message', message, bill };
    } else {
      const saved = await TransactionModel.create({ ...item.data, userId });
      const message = applyPersona(`Đã lưu giao dịch: ${saved.description} - ${formatVND(saved.amount)} vào ${saved.category_name}. Số dư hiện tại: ${formatVND(saved.wallet_balance)}`);
      data = { type: 'system_message', message, transaction: saved, new_balance: Number(saved.wallet_balance) };
    }

    await pending.clear(userId);
    await ChatMessage.create({ userId, role: 'system', content: data.message, metadata: data });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/edit', async (req, res, next) => {
  try {
    const item = await pending.update(userId, req.body);
    if (!item) return res.status(404).json({ success: false, error: 'Không có giao dịch chờ sửa hoặc đã hết hạn' });
    res.json({ success: true, data: previewResponse(item.data, item.id, 'Mình đã cập nhật. Bạn xác nhận nhé:') });
  } catch (error) {
    next(error);
  }
});

router.post('/cancel', async (req, res, next) => {
  try {
    await pending.clear(userId);
    const data = { type: 'system_message', message: 'Đã hủy' };
    await ChatMessage.create({ userId, role: 'system', content: data.message, metadata: data });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

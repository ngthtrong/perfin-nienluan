const express = require('express');
const AIService = require('../services/ai.service');
const CategoryModel = require('../models/category.model');
const AccountModel = require('../models/account.model');
const TransactionModel = require('../models/transaction.model');
const ChatMessage = require('../models/chatMessage.model');
const pending = require('../services/pendingTransaction.service');

const router = express.Router();
const userId = 'default_user';

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
}

function previewResponse(transaction, pendingId, message = 'Mình hiểu bạn muốn ghi nhận giao dịch này:') {
  return { type: 'transaction_preview', message, transaction, pending_id: pendingId };
}

router.get('/messages', async (req, res, next) => {
  try {
    res.json({ success: true, data: await ChatMessage.getRecent(userId, req.query.limit || 30) });
  } catch (error) {
    next(error);
  }
});

router.post('/message', async (req, res, next) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text || text.length > 500) return res.status(400).json({ success: false, error: 'Nội dung không hợp lệ' });

    await ChatMessage.create({ userId, role: 'user', content: text });
    const categories = await CategoryModel.getAll(userId);
    const parsed = await AIService.parseTransaction(text, categories);

    let data;
    if (parsed.intent === 'transaction' && parsed.transaction?.amount) {
      const wallet = await AccountModel.ensureDefault(userId);
      const tx = { ...parsed.transaction, wallet_id: wallet.id, source: 'ai_chat', original_text: text };
      const pendingId = pending.set(userId, tx);
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
    const item = pending.get(userId);
    if (!item) return res.status(404).json({ success: false, error: 'Không có giao dịch chờ xác nhận hoặc đã hết hạn' });
    const saved = await TransactionModel.create({ ...item.data, userId, category_id: item.data.category_id, transaction_date: item.data.transaction_date });
    pending.clear(userId);
    const message = `Đã lưu giao dịch: ${saved.description} - ${formatVND(saved.amount)} vào ${saved.category_name}. Số dư hiện tại: ${formatVND(saved.wallet_balance)}`;
    const data = { type: 'system_message', message, transaction: saved, new_balance: Number(saved.wallet_balance) };
    await ChatMessage.create({ userId, role: 'system', content: message, metadata: data });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/edit', async (req, res, next) => {
  try {
    const item = pending.update(userId, req.body);
    if (!item) return res.status(404).json({ success: false, error: 'Không có giao dịch chờ sửa hoặc đã hết hạn' });
    res.json({ success: true, data: previewResponse(item.data, item.id, 'Mình đã cập nhật. Bạn xác nhận nhé:') });
  } catch (error) {
    next(error);
  }
});

router.post('/cancel', async (req, res, next) => {
  try {
    pending.clear(userId);
    const data = { type: 'system_message', message: 'Đã hủy giao dịch' };
    await ChatMessage.create({ userId, role: 'system', content: data.message, metadata: data });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

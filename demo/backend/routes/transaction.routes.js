const express = require('express');
const TransactionModel = require('../models/transaction.model');
const AccountModel = require('../models/account.model');
const { FeedbackService } = require('../services/feedback');
const { recordFeedbackAfterCommit } = require('../services/feedback/bestEffort');
const {
  validateTransaction,
  validateTransactionUpdate,
  validateTransactionCategoryUpdate,
  validateTransactionQuery,
} = require('../middleware/validation.middleware');

const router = express.Router();
const userId = 'default_user';

router.get('/summary', async (req, res) => {
  res.json({ success: true, data: await TransactionModel.getMonthlySummary(userId, req.query.month, req.query.year) });
});

router.get('/', validateTransactionQuery, async (req, res) => {
  const result = await TransactionModel.getAll(userId, req.transactionQuery);
  res.json({ success: true, ...result, total: result.pagination.total });
});

router.post('/', validateTransaction, async (req, res) => {
  const wallet = req.body.wallet_id ? await AccountModel.getById(req.body.wallet_id, userId) : await AccountModel.ensureDefault(userId);
  if (!wallet) return res.status(400).json({ success: false, error: 'Ví không tồn tại' });
  const data = await TransactionModel.create({ ...req.body, userId, wallet_id: wallet.id });
  res.status(201).json({ success: true, data, wallet_balance: Number(data.wallet_balance) });
});

router.get('/:id', async (req, res) => {
  const data = await TransactionModel.getById(req.params.id, userId);
  if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch' });
  res.json({ success: true, data });
});

router.put('/:id/category', validateTransactionCategoryUpdate, async (req, res) => {
  const before = await TransactionModel.getById(req.params.id, userId);
  const data = await TransactionModel.updateCategory(req.params.id, req.body.category_id, userId);
  if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch' });
  if (before && Number(before.category_id) !== Number(data.category_id) && before.source !== 'manual') {
    await recordFeedbackAfterCommit('classification', () => (
      FeedbackService.recordClassificationCorrection({
        userId,
        transactionId: data.id,
        originalText: before.original_text || before.description,
        aiResult: { category_id: before.category_id, category_name: before.category_name, type: before.type },
        correctedResult: { category_id: data.category_id, category_name: data.category_name, type: data.type },
      })
    ));
  }
  res.json({ success: true, data, message: 'Đã cập nhật danh mục giao dịch' });
});

router.put('/:id', validateTransactionUpdate, async (req, res) => {
  const before = await TransactionModel.getById(req.params.id, userId);
  const data = await TransactionModel.update(req.params.id, req.body, userId);
  if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch' });
  if (before && before.source !== 'manual') {
    if (req.body.category_id && Number(before.category_id) !== Number(data.category_id)) {
      await recordFeedbackAfterCommit('classification', () => (
        FeedbackService.recordClassificationCorrection({
          userId,
          transactionId: data.id,
          originalText: before.original_text || before.description,
          aiResult: { category_id: before.category_id, category_name: before.category_name, type: before.type },
          correctedResult: { category_id: data.category_id, category_name: data.category_name, type: data.type },
        })
      ));
    }
    const extractionChanged = ['description', 'amount', 'type'].some((field) => req.body[field] !== undefined && String(req.body[field]) !== String(before[field]));
    if (extractionChanged) {
      await recordFeedbackAfterCommit('extraction', () => (
        FeedbackService.recordExtractionCorrection({
          userId,
          transactionId: data.id,
          originalText: before.original_text || before.description,
          aiResult: { description: before.description, amount: Number(before.amount), type: before.type },
          correctedResult: { description: data.description, amount: Number(data.amount), type: data.type },
        })
      ));
    }
  }
  res.json({ success: true, data, wallet_balance: Number(data.wallet_balance) });
});

router.delete('/:id', async (req, res) => {
  const data = await TransactionModel.softDelete(req.params.id, userId);
  if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch' });
  res.json({ ...data, message: 'Đã xóa giao dịch', restore_url: `/api/transactions/${req.params.id}/restore` });
});

router.post('/:id/restore', async (req, res) => {
  const data = await TransactionModel.restore(req.params.id, userId);
  if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch' });
  res.json({ success: true, data, message: 'Đã khôi phục giao dịch' });
});

module.exports = router;

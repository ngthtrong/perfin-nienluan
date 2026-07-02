const express = require('express');
const RecurringBillModel = require('../models/recurringBill.model');
const CategoryModel = require('../models/category.model');
const AccountModel = require('../models/account.model');
const { matchCategory } = require('../services/parser.service');

const router = express.Router();
const userId = 'default_user';

function validateBillInput(body) {
  const errors = [];
  if (!body.name || !String(body.name).trim()) errors.push('Thiếu tên khoản chi');
  if (!Number(body.amount) || Number(body.amount) <= 0) errors.push('Số tiền phải là số dương hợp lệ');
  if (body.frequency && !['weekly', 'monthly', 'quarterly', 'yearly'].includes(body.frequency)) errors.push('Chu kỳ không hợp lệ');
  if (body.due_day == null) errors.push('Thiếu ngày thanh toán');
  return errors;
}

// Resolve category by name via AI categorization fallback when category_id is absent (FR-08-01)
async function resolveCategoryId(body) {
  if (body.category_id) return body.category_id;
  const categories = await CategoryModel.getAll(userId);
  const matched = matchCategory(body.category_name || body.name, categories, 'expense');
  return matched ? matched.id : null;
}

router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await RecurringBillModel.getAll(userId) });
  } catch (error) {
    next(error);
  }
});

router.get('/due', async (req, res, next) => {
  try {
    res.json({ success: true, data: await RecurringBillModel.getDueBills(userId) });
  } catch (error) {
    next(error);
  }
});

router.get('/suggestions', async (req, res, next) => {
  try {
    res.json({ success: true, data: await RecurringBillModel.detectRecurringCandidates(userId) });
  } catch (error) {
    next(error);
  }
});

router.post('/suggestions/dismiss', async (req, res, next) => {
  try {
    if (!req.body.signature) return res.status(400).json({ success: false, error: 'Thiếu signature' });
    res.json({ success: true, data: await RecurringBillModel.dismissSuggestion(userId, req.body.signature) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const errors = validateBillInput(req.body);
    if (errors.length) return res.status(400).json({ success: false, error: errors.join('; ') });
    const category_id = await resolveCategoryId(req.body);
    const wallet = req.body.wallet_id ? { id: req.body.wallet_id } : await AccountModel.ensureDefault(userId);
    const bill = await RecurringBillModel.create({ ...req.body, userId, category_id, wallet_id: wallet.id });
    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await RecurringBillModel.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = await RecurringBillModel.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const data = await RecurringBillModel.delete(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
    res.json({ success: true, message: 'Đã xóa chi phí cố định, lịch sử thanh toán được giữ nguyên' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/pause', async (req, res, next) => {
  try {
    const data = await RecurringBillModel.pause(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/resume', async (req, res, next) => {
  try {
    const data = await RecurringBillModel.resume(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/payments', async (req, res, next) => {
  try {
    res.json({ success: true, data: await RecurringBillModel.getPaymentHistory(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/pay', async (req, res, next) => {
  try {
    const result = await RecurringBillModel.recordPayment(req.params.id, {
      amount: req.body.amount,
      walletId: req.body.wallet_id,
      paidDate: req.body.paid_date,
      categoryId: req.body.category_id,
    });
    if (!result) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

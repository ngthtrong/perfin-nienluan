const express = require('express');
const RecurringBillModel = require('../models/recurringBill.model');
const CategoryModel = require('../models/category.model');
const AccountModel = require('../models/account.model');
const { matchCategory } = require('../services/parser.service');

const router = express.Router();
const userId = 'default_user';

function validateBillInput(body, { mode = 'create', existing = null } = {}) {
  const errors = [];
  const isCreate = mode === 'create';
  if ((isCreate || Object.hasOwn(body, 'name')) && (!body.name || !String(body.name).trim())) {
    errors.push('Thiếu tên khoản chi');
  }
  if ((isCreate || Object.hasOwn(body, 'amount')) && (!Number(body.amount) || Number(body.amount) <= 0)) {
    errors.push('Số tiền phải là số dương hợp lệ');
  }
  if (isCreate && body.due_day == null) errors.push('Thiếu ngày thanh toán');

  if (body.due_day != null || body.frequency != null || existing) {
    const schedule = RecurringBillModel.validateRecurringSchedule(
      body.frequency ?? existing?.frequency ?? 'monthly',
      body.due_day ?? existing?.due_day
    );
    errors.push(...schedule.errors);
  }
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
    const existing = await RecurringBillModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
    const errors = validateBillInput(req.body, { mode: 'update', existing });
    if (errors.length) return res.status(400).json({ success: false, error: errors.join('; ') });
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
    const body = req.body || {};
    const expectedPeriod = body.periodDueDate ?? body.period_due_date;
    if (!expectedPeriod) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu kỳ thanh toán dự kiến; vui lòng tải lại danh sách trước khi thanh toán',
      });
    }
    const result = await RecurringBillModel.recordPayment(req.params.id, {
      amount: body.amount,
      walletId: body.wallet_id,
      paidDate: body.paid_date,
      categoryId: body.category_id,
      periodDueDate: expectedPeriod,
    });
    if (!result) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

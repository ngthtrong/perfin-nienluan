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

router.get('/', async (req, res) => {
  res.json({ success: true, data: await RecurringBillModel.getAll(userId) });
});

router.get('/due', async (req, res) => {
  res.json({ success: true, data: await RecurringBillModel.getDueBills(userId) });
});

router.get('/suggestions', async (req, res) => {
  res.json({ success: true, data: await RecurringBillModel.detectRecurringCandidates(userId) });
});

router.post('/suggestions/dismiss', async (req, res) => {
  if (!req.body.signature) return res.status(400).json({ success: false, error: 'Thiếu signature' });
  res.json({ success: true, data: await RecurringBillModel.dismissSuggestion(userId, req.body.signature) });
});

router.post('/', async (req, res) => {
  const errors = validateBillInput(req.body);
  if (errors.length) return res.status(400).json({ success: false, error: errors.join('; ') });
  const category_id = await resolveCategoryId(req.body);
  const wallet = req.body.wallet_id ? { id: req.body.wallet_id } : await AccountModel.ensureDefault(userId);
  const bill = await RecurringBillModel.create({ ...req.body, userId, category_id, wallet_id: wallet.id });
  res.status(201).json({ success: true, data: bill });
});

router.get('/:id', async (req, res) => {
  const data = await RecurringBillModel.getById(req.params.id, userId);
  if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
  res.json({ success: true, data });
});

router.put('/:id', async (req, res) => {
  const existing = await RecurringBillModel.getById(req.params.id, userId);
  if (!existing) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
  const errors = validateBillInput(req.body, { mode: 'update', existing });
  if (errors.length) return res.status(400).json({ success: false, error: errors.join('; ') });
  const data = await RecurringBillModel.update(req.params.id, req.body, userId);
  if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
  res.json({ success: true, data });
});

router.delete('/:id', async (req, res) => {
  const data = await RecurringBillModel.delete(req.params.id, userId);
  if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
  res.json({ success: true, message: 'Đã xóa chi phí cố định, lịch sử thanh toán được giữ nguyên' });
});

router.post('/:id/pause', async (req, res) => {
  const data = await RecurringBillModel.pause(req.params.id, userId);
  if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
  res.json({ success: true, data });
});

router.post('/:id/resume', async (req, res) => {
  const data = await RecurringBillModel.resume(req.params.id, userId);
  if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
  res.json({ success: true, data });
});

router.get('/:id/payments', async (req, res) => {
  // Kiểm tra quyền sở hữu trước: nếu không, hóa đơn của người khác sẽ trả về
  // "lịch sử rỗng" thay vì 404, tức là vẫn tiết lộ id đó có tồn tại hay không.
  const bill = await RecurringBillModel.getById(req.params.id, userId);
  if (!bill) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
  res.json({ success: true, data: await RecurringBillModel.getPaymentHistory(req.params.id, userId) });
});

router.post('/:id/pay', async (req, res) => {
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
    userId,
  });
  if (!result) return res.status(404).json({ success: false, error: 'Không tìm thấy chi phí cố định' });
  res.json({ success: true, data: result });
});

module.exports = router;

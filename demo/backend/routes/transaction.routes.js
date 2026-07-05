const express = require('express');
const TransactionModel = require('../models/transaction.model');
const AccountModel = require('../models/account.model');
const CategoryModel = require('../models/category.model');
const { validateTransaction } = require('../middleware/validation.middleware');

const router = express.Router();
const userId = 'default_user';

router.get('/summary', async (req, res, next) => {
  try {
    res.json({ success: true, data: await TransactionModel.getMonthlySummary(userId, req.query.month, req.query.year) });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await TransactionModel.getAll(userId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/', validateTransaction, async (req, res, next) => {
  try {
    const wallet = req.body.wallet_id ? await AccountModel.getById(req.body.wallet_id) : await AccountModel.ensureDefault(userId);
    if (!wallet) return res.status(400).json({ success: false, error: 'Ví không tồn tại' });
    const category = await CategoryModel.getById(req.body.category_id);
    if (!category || category.type !== req.body.type) return res.status(400).json({ success: false, error: 'Danh mục không hợp lệ' });
    const data = await TransactionModel.create({ ...req.body, userId, wallet_id: wallet.id });
    res.status(201).json({ success: true, data, wallet_balance: Number(data.wallet_balance) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await TransactionModel.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/category', async (req, res, next) => {
  try {
    const data = await TransactionModel.updateCategory(req.params.id, req.body.category_id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch' });
    res.json({ success: true, data, message: 'Đã cập nhật danh mục giao dịch' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = await TransactionModel.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch' });
    res.json({ success: true, data, wallet_balance: Number(data.wallet_balance) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const data = await TransactionModel.softDelete(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch' });
    res.json({ ...data, message: 'Đã xóa giao dịch', restore_url: `/api/transactions/${req.params.id}/restore` });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/restore', async (req, res, next) => {
  try {
    const data = await TransactionModel.restore(req.params.id);
    res.json({ success: true, data, message: 'Đã khôi phục giao dịch' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

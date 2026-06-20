const express = require('express');
const BudgetModel = require('../models/budget.model');
const { validateBudget } = require('../middleware/validation.middleware');

const router = express.Router();
const userId = 'default_user';

router.get('/progress', async (req, res, next) => {
  try {
    res.json({ success: true, data: await BudgetModel.getProgress(userId, req.query.month, req.query.year) });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await BudgetModel.getAll(userId, req.query.month, req.query.year) });
  } catch (error) {
    next(error);
  }
});

router.post('/', validateBudget, async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await BudgetModel.create({ ...req.body, userId }) });
  } catch (error) {
    if (error.code === '23505') error.message = 'Đã có ngân sách cho danh mục này trong tháng';
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await BudgetModel.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy ngân sách' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = await BudgetModel.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy ngân sách' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const data = await BudgetModel.delete(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy ngân sách' });
    res.json({ success: true, message: 'Đã xóa ngân sách' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

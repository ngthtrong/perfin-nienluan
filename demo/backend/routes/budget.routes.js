const express = require('express');
const BudgetModel = require('../models/budget.model');
const BudgetRecommendationService = require('../services/budgets');
const { forecastBudgets } = require('../services/budgets/forecast');
const { validateBudget } = require('../middleware/validation.middleware');

const router = express.Router();
const userId = 'default_user';

router.get('/recommendations', async (req, res, next) => {
  try {
    const data = await BudgetRecommendationService.recommend(userId, {
      strategy: req.query.strategy || 'hybrid',
      historyMonths: Number(req.query.history_months || 6),
      monthlyIncome: req.query.monthly_income ? Number(req.query.monthly_income) : undefined,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/recommendations/apply', async (req, res, next) => {
  try {
    if (req.body.confirmed !== true) {
      return res.status(400).json({ success: false, error: 'Cần confirmed=true trước khi áp dụng ngân sách' });
    }
    const data = await BudgetModel.upsertRecommendations(req.body.recommendations, {
      userId,
      month: req.body.month,
      year: req.body.year,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/forecast', async (req, res, next) => {
  try {
    const progress = await BudgetModel.getProgress(userId, req.query.month, req.query.year);
    res.json({ success: true, data: forecastBudgets(progress, { month: Number(req.query.month) || undefined, year: Number(req.query.year) || undefined }) });
  } catch (error) {
    next(error);
  }
});

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
    const data = await BudgetModel.getById(req.params.id, userId);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy ngân sách' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = await BudgetModel.update(req.params.id, req.body, userId);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy ngân sách' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const data = await BudgetModel.delete(req.params.id, userId);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy ngân sách' });
    res.json({ success: true, message: 'Đã xóa ngân sách' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

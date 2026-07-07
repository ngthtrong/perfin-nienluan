const express = require('express');
const GoalModel = require('../models/goal.model');
const GoalService = require('../services/goals');

const router = express.Router();
const userId = 'default_user';

// List goals, each enriched with a fresh plan.
router.get('/', async (req, res, next) => {
  try {
    const goals = await GoalModel.getAll(userId);
    const withPlans = await Promise.all(goals.map(async (g) => ({ ...g, ...(await GoalService.buildPlan(g, userId)) })));
    res.json({ success: true, data: withPlans });
  } catch (error) {
    next(error);
  }
});

// Current average monthly surplus (income − expense).
router.get('/surplus', async (req, res, next) => {
  try {
    res.json({ success: true, data: await GoalService.computeSurplus(userId) });
  } catch (error) {
    next(error);
  }
});

// Preview a plan WITHOUT saving — for "what if I set this goal?" exploration.
router.post('/plan', async (req, res, next) => {
  try {
    const draft = req.body || {};
    if (!draft.target_amount) return res.status(400).json({ success: false, error: 'Thiếu target_amount' });
    res.json({ success: true, data: await GoalService.buildPlan(draft, userId) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (!req.body.name || !req.body.target_amount) {
      return res.status(400).json({ success: false, error: 'Thiếu tên hoặc số tiền mục tiêu' });
    }
    const goal = await GoalModel.create(req.body, userId);
    const plan = await GoalService.buildPlan(goal, userId);
    res.status(201).json({ success: true, data: { ...goal, ...plan } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const goal = await GoalModel.getById(req.params.id, userId);
    if (!goal) return res.status(404).json({ success: false, error: 'Không tìm thấy mục tiêu' });
    res.json({ success: true, data: { ...goal, ...(await GoalService.buildPlan(goal, userId)) } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const goal = await GoalModel.update(req.params.id, req.body, userId);
    if (!goal) return res.status(404).json({ success: false, error: 'Không tìm thấy mục tiêu' });
    res.json({ success: true, data: { ...goal, ...(await GoalService.buildPlan(goal, userId)) } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await GoalModel.remove(req.params.id, userId) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

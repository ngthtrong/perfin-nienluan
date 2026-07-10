const express = require('express');
const GoalModel = require('../models/goal.model');
const GoalService = require('../services/goals');
const { validateGoalPayload, parseGoalId } = require('../services/goals/validation');

const router = express.Router();
const userId = 'default_user';

function validationError(res, errors) {
  return res.status(400).json({ success: false, error: errors[0], details: errors });
}

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
    const validation = validateGoalPayload(req.body, { mode: 'plan' });
    if (validation.errors.length) return validationError(res, validation.errors);
    res.json({ success: true, data: await GoalService.buildPlan(validation.value, userId) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validation = validateGoalPayload(req.body, { mode: 'create' });
    if (validation.errors.length) return validationError(res, validation.errors);
    const goal = await GoalModel.create(validation.value, userId);
    const plan = await GoalService.buildPlan(goal, userId);
    res.status(201).json({ success: true, data: { ...goal, ...plan } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseGoalId(req.params.id);
    if (!id) return validationError(res, ['id mục tiêu không hợp lệ']);
    const goal = await GoalModel.getById(id, userId);
    if (!goal) return res.status(404).json({ success: false, error: 'Không tìm thấy mục tiêu' });
    res.json({ success: true, data: { ...goal, ...(await GoalService.buildPlan(goal, userId)) } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseGoalId(req.params.id);
    if (!id) return validationError(res, ['id mục tiêu không hợp lệ']);
    const existing = await GoalModel.getById(id, userId);
    if (!existing) return res.status(404).json({ success: false, error: 'Không tìm thấy mục tiêu' });

    const validation = validateGoalPayload(req.body, { mode: 'update', existing });
    if (validation.errors.length) return validationError(res, validation.errors);
    const goal = await GoalModel.update(id, validation.value, userId);
    res.json({ success: true, data: { ...goal, ...(await GoalService.buildPlan(goal, userId)) } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseGoalId(req.params.id);
    if (!id) return validationError(res, ['id mục tiêu không hợp lệ']);
    const result = await GoalModel.remove(id, userId);
    if (!result.success) return res.status(404).json({ success: false, error: 'Không tìm thấy mục tiêu' });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

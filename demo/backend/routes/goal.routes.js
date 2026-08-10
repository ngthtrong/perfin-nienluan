const express = require('express');
const crypto = require('crypto');
const GoalModel = require('../models/goal.model');
const GoalService = require('../services/goals');
const { validateGoalPayload, parseGoalId } = require('../services/goals/validation');

const router = express.Router();
const userId = 'default_user';
const PREVIEW_TTL_MS = 15 * 60 * 1000;
const previewSecret = crypto.randomBytes(32);

function canonicalGoalPayload(payload) {
  return JSON.stringify(Object.fromEntries(
    Object.keys(payload || {}).sort().map((key) => [key, payload[key]])
  ));
}

function issuePreviewToken(payload, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({
    version: 1,
    user_id: userId,
    expires_at: now + PREVIEW_TTL_MS,
    fingerprint: crypto.createHash('sha256').update(canonicalGoalPayload(payload)).digest('hex'),
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', previewSecret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyPreviewToken(token, payload, now = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [body, suppliedSignature, ...extra] = token.split('.');
  if (!body || !suppliedSignature || extra.length) return false;
  const expectedSignature = crypto.createHmac('sha256', previewSecret).update(body).digest();
  let supplied;
  let decoded;
  try {
    supplied = Buffer.from(suppliedSignature, 'base64url');
    decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (_) {
    return false;
  }
  if (supplied.length !== expectedSignature.length || !crypto.timingSafeEqual(supplied, expectedSignature)) return false;
  if (decoded.version !== 1 || decoded.user_id !== userId || Number(decoded.expires_at) < now) return false;
  const fingerprint = crypto.createHash('sha256').update(canonicalGoalPayload(payload)).digest('hex');
  return decoded.fingerprint === fingerprint;
}

function previewedGoalFields(payload) {
  const { status: _status, ...planFields } = payload || {};
  return planFields;
}

function goalUpdateHasPlanChanges(payload) {
  return Object.keys(previewedGoalFields(payload)).length > 0;
}

function previewRequired(res) {
  return res.status(409).json({
    success: false,
    error: 'Kế hoạch đã thay đổi hoặc bản xem trước đã hết hạn; hãy xem lại kế hoạch trước khi lưu',
    code: 'GOAL_PREVIEW_REQUIRED',
  });
}

function validationError(res, errors) {
  return res.status(400).json({ success: false, error: errors[0], details: errors });
}

// List goals, each enriched with a fresh plan.
router.get('/', async (req, res) => {
  const goals = await GoalModel.getAll(userId);
  const withPlans = await Promise.all(goals.map(async (g) => ({ ...g, ...(await GoalService.buildPlan(g, userId)) })));
  res.json({ success: true, data: withPlans });
});

// Current average monthly surplus (income − expense).
router.get('/surplus', async (req, res) => {
  res.json({ success: true, data: await GoalService.computeSurplus(userId) });
});

// Preview a plan WITHOUT saving — for "what if I set this goal?" exploration.
router.post('/plan', async (req, res) => {
  const validation = validateGoalPayload(req.body, { mode: 'plan' });
  if (validation.errors.length) return validationError(res, validation.errors);
  const plan = await GoalService.buildPlan(validation.value, userId);
  res.json({ success: true, data: { ...plan, preview_token: issuePreviewToken(validation.value) } });
});

router.post('/', async (req, res) => {
  const { preview_token: previewToken, ...payload } = req.body || {};
  const validation = validateGoalPayload(payload, { mode: 'create' });
  if (validation.errors.length) return validationError(res, validation.errors);
  if (!verifyPreviewToken(previewToken, validation.value)) return previewRequired(res);
  const goal = await GoalModel.create(validation.value, userId);
  const plan = await GoalService.buildPlan(goal, userId);
  res.status(201).json({ success: true, data: { ...goal, ...plan } });
});

router.get('/:id', async (req, res) => {
  const id = parseGoalId(req.params.id);
  if (!id) return validationError(res, ['id mục tiêu không hợp lệ']);
  const goal = await GoalModel.getById(id, userId);
  if (!goal) return res.status(404).json({ success: false, error: 'Không tìm thấy mục tiêu' });
  res.json({ success: true, data: { ...goal, ...(await GoalService.buildPlan(goal, userId)) } });
});

router.put('/:id', async (req, res) => {
  const id = parseGoalId(req.params.id);
  if (!id) return validationError(res, ['id mục tiêu không hợp lệ']);
  const existing = await GoalModel.getById(id, userId);
  if (!existing) return res.status(404).json({ success: false, error: 'Không tìm thấy mục tiêu' });

  const { preview_token: previewToken, ...payload } = req.body || {};
  const validation = validateGoalPayload(payload, { mode: 'update', existing });
  if (validation.errors.length) return validationError(res, validation.errors);
  const planFields = previewedGoalFields(validation.value);
  // Status-only transitions (pause/resume/achieve/cancel) do not alter the
  // financial plan. If plan fields also change, their exact preview remains
  // mandatory; status itself is deliberately excluded from the fingerprint.
  if (goalUpdateHasPlanChanges(validation.value) && !verifyPreviewToken(previewToken, planFields)) {
    return previewRequired(res);
  }
  const goal = await GoalModel.update(id, validation.value, userId);
  res.json({ success: true, data: { ...goal, ...(await GoalService.buildPlan(goal, userId)) } });
});

router.delete('/:id', async (req, res) => {
  const id = parseGoalId(req.params.id);
  if (!id) return validationError(res, ['id mục tiêu không hợp lệ']);
  const result = await GoalModel.remove(id, userId);
  if (!result.success) return res.status(404).json({ success: false, error: 'Không tìm thấy mục tiêu' });
  res.json({ success: true, data: result });
});

module.exports = router;
module.exports.issuePreviewToken = issuePreviewToken;
module.exports.verifyPreviewToken = verifyPreviewToken;
module.exports.previewedGoalFields = previewedGoalFields;
module.exports.goalUpdateHasPlanChanges = goalUpdateHasPlanChanges;

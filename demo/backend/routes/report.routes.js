const express = require('express');
const ReportService = require('../services/report.service');
const AnalyticsEngine = require('../services/analytics');
const AIService = require('../services/ai.service');
const Persona = require('../services/persona.service');

const router = express.Router();
const userId = 'default_user';

router.get(['/summary', '/monthly'], async (req, res, next) => {
  try {
    res.json({ success: true, data: await ReportService.getMonthlySummary(userId, req.query.month, req.query.year) });
  } catch (error) {
    next(error);
  }
});

router.get('/category-breakdown', async (req, res, next) => {
  try {
    res.json({ success: true, data: await ReportService.getCategoryBreakdown(userId, req.query.month, req.query.year) });
  } catch (error) {
    next(error);
  }
});

router.get(['/monthly-trend', '/trend'], async (req, res, next) => {
  try {
    res.json({ success: true, data: await ReportService.getMonthlyTrend(userId, req.query.year) });
  } catch (error) {
    next(error);
  }
});

router.get('/top-categories', async (req, res, next) => {
  try {
    res.json({ success: true, data: await ReportService.getTopCategories(userId, req.query.month, req.query.year, req.query.limit) });
  } catch (error) {
    next(error);
  }
});

// Raw analytics facts (deterministic) — useful for the frontend to render badges/charts.
router.get('/insights/facts', async (req, res, next) => {
  try {
    const payday = req.query.payday ? Number(req.query.payday) : null;
    const facts = await AnalyticsEngine.buildInsightFacts(userId, { payday, useCache: req.query.fresh !== '1' });
    res.json({ success: true, data: facts });
  } catch (error) {
    next(error);
  }
});

// Personalized insight (Luồng 7): analytics facts narrated by the active persona.
router.get('/insights', async (req, res, next) => {
  try {
    const payday = req.query.payday ? Number(req.query.payday) : null;
    const [facts, persona] = await Promise.all([
      AnalyticsEngine.buildInsightFacts(userId, { payday, useCache: req.query.fresh !== '1' }),
      Persona.getActivePersona(userId),
    ]);
    const narration = await AIService.narrateInsights(facts, {
      stylePrompt: persona.style_prompt,
      periodLabel: 'gần đây',
    });
    res.json({
      success: true,
      data: {
        persona: { id: persona.id, name: persona.name },
        ai_comment: narration.text,
        provider_used: narration.provider_used,
        facts,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

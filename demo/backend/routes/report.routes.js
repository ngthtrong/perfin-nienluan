const express = require('express');
const ReportService = require('../services/report.service');

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

module.exports = router;

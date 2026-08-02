const BudgetModel = require('../../models/budget.model');
const { recommendCategoryBudgets } = require('./recommender');
const { localDayKey, recentMonthKeys } = require('../analytics/timeSeries');

const DEFAULT_USER = 'default_user';

const BudgetRecommendationService = {
  async recommend(userId = DEFAULT_USER, options = {}) {
    const historyMonths = Number(options.historyMonths ?? 6);
    if (!Number.isInteger(historyMonths) || historyMonths < 1 || historyMonths > 24) {
      const error = new Error('Số tháng lịch sử phải là số nguyên từ 1 đến 24');
      error.status = 400;
      throw error;
    }
    const asOf = options.asOf ? new Date(options.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      const error = new Error('Ngày kết thúc lịch sử không hợp lệ');
      error.status = 400;
      throw error;
    }
    const asOfDay = typeof options.asOf === 'string' && /^\d{4}-\d{2}-\d{2}/.test(options.asOf)
      ? options.asOf.slice(0, 10)
      : localDayKey(asOf);
    const currentMonth = asOfDay.slice(0, 7);
    const lastCompletedMonth = recentMonthKeys(2, currentMonth)[0];
    const historyPeriods = recentMonthKeys(historyMonths, lastCompletedMonth);
    const rows = await BudgetModel.getRecommendationHistory(userId, {
      months: historyMonths,
      asOf,
    });
    return recommendCategoryBudgets(rows, { ...options, historyPeriods });
  },
};

module.exports = BudgetRecommendationService;
module.exports.recommendCategoryBudgets = recommendCategoryBudgets;

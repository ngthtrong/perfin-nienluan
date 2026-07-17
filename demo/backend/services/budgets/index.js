const BudgetModel = require('../../models/budget.model');
const { recommendCategoryBudgets } = require('./recommender');
const { recentMonthKeys } = require('../analytics/timeSeries');

const DEFAULT_USER = 'default_user';

const BudgetRecommendationService = {
  async recommend(userId = DEFAULT_USER, options = {}) {
    const historyMonths = Math.min(Math.max(Number(options.historyMonths || 6), 1), 24);
    const asOf = options.asOf ? new Date(options.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      const error = new Error('Ngày kết thúc lịch sử không hợp lệ');
      error.status = 400;
      throw error;
    }
    const currentMonth = asOf.toISOString().slice(0, 7);
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

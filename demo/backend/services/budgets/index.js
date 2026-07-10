const BudgetModel = require('../../models/budget.model');
const { recommendCategoryBudgets } = require('./recommender');

const DEFAULT_USER = 'default_user';

const BudgetRecommendationService = {
  async recommend(userId = DEFAULT_USER, options = {}) {
    const historyMonths = Math.min(Math.max(Number(options.historyMonths || 6), 1), 24);
    const rows = await BudgetModel.getRecommendationHistory(userId, {
      months: historyMonths,
      asOf: options.asOf,
    });
    return recommendCategoryBudgets(rows, options);
  },
};

module.exports = BudgetRecommendationService;
module.exports.recommendCategoryBudgets = recommendCategoryBudgets;


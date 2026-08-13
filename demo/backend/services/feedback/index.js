// Vai trò: Là điểm export tập trung cho các service feedback và category learning.
// Luồng chính: gom matcher, correction, discovery và retag để caller dùng một interface ổn định.

const FeedbackService = require('./correction.service');
const CategoryRetagService = require('./categoryRetag.service');
const categoryMatcher = require('./categoryMatcher');
const categoryDiscovery = require('./categoryDiscovery');

module.exports = {
  FeedbackService,
  CategoryRetagService,
  categoryMatcher,
  categoryDiscovery,
};

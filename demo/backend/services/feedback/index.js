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


const test = require('node:test');
const assert = require('node:assert/strict');

test('budget creation looks up the category in the current user scope', async () => {
  const database = require('../config/database');
  const CategoryModel = require('../models/category.model');
  const budgetPath = require.resolve('../models/budget.model');
  const originalQuery = database.query;
  const originalGetById = CategoryModel.getById;
  const calls = [];

  database.query = async (_sql, params) => ({ rows: [{ id: 41, user_id: params[0] }] });
  CategoryModel.getById = async (...args) => {
    calls.push(args);
    return { id: 12, user_id: 'user-2', type: 'expense' };
  };
  delete require.cache[budgetPath];
  const BudgetModel = require(budgetPath);

  try {
    await BudgetModel.create({ category_id: 12, amount_limit: 500000, userId: 'user-2' });
    assert.deepEqual(calls, [[12, 'user-2']]);
  } finally {
    database.query = originalQuery;
    CategoryModel.getById = originalGetById;
    delete require.cache[budgetPath];
  }
});

test('category re-tag preparation looks up its target in the current user scope', async () => {
  const database = require('../config/database');
  const CategoryModel = require('../models/category.model');
  const KVStore = require('../services/store/kv.store');
  const servicePath = require.resolve('../services/feedback/categoryRetag.service');
  const originalQuery = database.query;
  const originalGetById = CategoryModel.getById;
  const originalSet = KVStore.set;
  const calls = [];

  database.query = async () => ({
    rows: [{
      id: 7,
      description: 'Đánh bida',
      original_text: null,
      amount: 120000,
      type: 'expense',
      category_id: 99,
      category_name: 'Khác',
    }],
  });
  CategoryModel.getById = async (...args) => {
    calls.push(args);
    return { id: 21, user_id: 'user-2', name: 'Giải trí', type: 'expense', is_default: false };
  };
  KVStore.set = async () => true;
  delete require.cache[servicePath];
  const CategoryRetagService = require(servicePath);

  try {
    const plan = await CategoryRetagService.preparePlan('user-2', {
      transaction_ids: [7],
      target_category_id: 21,
      type: 'expense',
    });
    assert.equal(plan.target_category.name, 'Giải trí');
    assert.deepEqual(calls, [[21, 'user-2']]);
  } finally {
    database.query = originalQuery;
    CategoryModel.getById = originalGetById;
    KVStore.set = originalSet;
    delete require.cache[servicePath];
  }
});

const express = require('express');
const CategoryModel = require('../models/category.model');
const { validateCategory } = require('../middleware/validation.middleware');

const router = express.Router();
const userId = 'default_user';

router.get('/', async (req, res, next) => {
  try {
    const data = req.query.type ? await CategoryModel.getByType(req.query.type, userId) : await CategoryModel.getAll(userId);
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await CategoryModel.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/', validateCategory, async (req, res, next) => {
  try {
    const data = await CategoryModel.create({ ...req.body, userId });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = await CategoryModel.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const data = await CategoryModel.delete(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
    res.json({ success: true, message: 'Đã xóa danh mục' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

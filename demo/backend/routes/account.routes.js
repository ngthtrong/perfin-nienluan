const express = require('express');
const AccountModel = require('../models/account.model');

const router = express.Router();
const userId = 'default_user';

router.get('/balance', async (req, res, next) => {
  try {
    const wallets = await AccountModel.getAll(userId);
    const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);
    res.json({ success: true, data: { total_balance: totalBalance, wallets } });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await AccountModel.getAll(userId) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await AccountModel.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy ví' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = await AccountModel.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy ví' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

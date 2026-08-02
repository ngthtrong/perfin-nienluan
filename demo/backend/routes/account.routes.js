const express = require('express');
const AccountModel = require('../models/account.model');
const { validateWalletCreate } = require('../middleware/wallet.validation.middleware');

const router = express.Router();
const userId = 'default_user';

router.get('/balance', async (req, res, next) => {
  try {
    const wallets = await AccountModel.getAll(userId);
    const totalsByCurrency = wallets.reduce((totals, wallet) => {
      const currency = String(wallet.currency || 'VND').toUpperCase();
      totals[currency] = (totals[currency] || 0) + Number(wallet.balance);
      return totals;
    }, {});
    res.json({
      success: true,
      data: {
        total_balance: totalsByCurrency.VND || 0,
        total_balance_currency: 'VND',
        totals_by_currency: totalsByCurrency,
        wallets,
      },
    });
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

async function createWallet(req, res, next) {
  try {
    // Local MVP is intentionally single-user. Never accept user_id/userId from
    // the request body, even though the persistence model keeps a user scope.
    const data = await AccountModel.create({ ...req.walletInput, userId });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

router.post('/', validateWalletCreate, createWallet);

router.get('/:id', async (req, res, next) => {
  try {
    const data = await AccountModel.getById(req.params.id, userId);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy ví' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = await AccountModel.update(req.params.id, req.body, userId);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy ví' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.createWallet = createWallet;

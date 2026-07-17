const express = require('express');
const router = express.Router();
const { TransferModel, InvestmentPnLModel, NetWorthModel, CashflowModel } = require('../models/cashflow.model');
const AccountModel = require('../models/account.model');

const userId = 'default_user';

// ─── Net Worth (FR-06-03) ─────────────────────────────────────────────────────

/**
 * GET /api/cashflow/net-worth
 * Returns Net Worth breakdown: regular wallets + investment wallets
 */
router.get('/net-worth', async (req, res, next) => {
  try {
    const data = await NetWorthModel.calculate(userId);
    // Also fetch wallet details
    const wallets = await AccountModel.getAll(userId);
    res.json({
      success: true,
      data: {
        ...data,
        wallets: wallets.data || wallets,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Cashflow Report (FR-06-06) ───────────────────────────────────────────────

/**
 * GET /api/cashflow/report?from=&to=&period=month|week|quarter|year
 * Returns cashflow breakdown: operating, investment, transfer
 */
router.get('/report', async (req, res, next) => {
  try {
    const { from, to, period } = req.query;
    let filters = { from, to };

    // If period shortcuts are used
    if (!from && !to && period) {
      const now = new Date();
      if (period === 'week') {
        const day = now.getDay() || 7;
        filters.from = new Date(now - (day - 1) * 86400000).toISOString().slice(0, 10);
        filters.to = new Date(now - (day - 7) * 86400000).toISOString().slice(0, 10);
      } else if (period === 'month') {
        filters.from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        filters.to = now.toISOString().slice(0, 10);
      } else if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        filters.from = `${now.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`;
        filters.to = now.toISOString().slice(0, 10);
      } else if (period === 'year') {
        filters.from = `${now.getFullYear()}-01-01`;
        filters.to = now.toISOString().slice(0, 10);
      }
    }

    const data = await CashflowModel.getReport(userId, filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── Transfers (FR-06-04: Transfer / Investment Inflow / Outflow) ─────────────

/**
 * POST /api/cashflow/transfers
 * Body: { from_wallet_id, to_wallet_id, amount, transfer_type, note, transaction_date }
 */
router.post('/transfers', async (req, res, next) => {
  try {
    const { from_wallet_id, to_wallet_id, amount, transfer_type, note, transaction_date } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Số tiền không hợp lệ' });
    }
    if (!from_wallet_id && !to_wallet_id) {
      return res.status(400).json({ success: false, error: 'Phải có ít nhất một ví nguồn hoặc đích' });
    }
    const validTypes = ['transfer', 'investment_inflow', 'investment_outflow'];
    if (transfer_type && !validTypes.includes(transfer_type)) {
      return res.status(400).json({ success: false, error: `transfer_type phải là: ${validTypes.join(', ')}` });
    }
    const data = await TransferModel.create({ userId, from_wallet_id, to_wallet_id, amount: Number(amount), transfer_type, note, transaction_date });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cashflow/transfers?wallet_id=&transfer_type=&from=&to=
 */
router.get('/transfers', async (req, res, next) => {
  try {
    const filters = {
      wallet_id: req.query.wallet_id,
      transfer_type: req.query.transfer_type,
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
    };
    const data = await TransferModel.getAll(userId, filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── Investment P&L (FR-06-05) ────────────────────────────────────────────────

/**
 * GET /api/cashflow/investment-pnl?wallet_id=
 */
router.get('/investment-pnl', async (req, res, next) => {
  try {
    const { wallet_id } = req.query;
    if (!wallet_id) return res.status(400).json({ success: false, error: 'Thiếu wallet_id' });
    const data = await InvestmentPnLModel.getByWallet(wallet_id, userId);
    // Compute cumulative P&L
    const totalPnL = data.reduce((sum, r) => sum + Number(r.amount), 0);
    res.json({ success: true, data, total_pnl: totalPnL });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cashflow/investment-pnl
 * Body: { wallet_id, amount (positive=profit, negative=loss), note, recorded_at }
 */
router.post('/investment-pnl', async (req, res, next) => {
  try {
    const { wallet_id, amount, note, recorded_at } = req.body;
    if (!wallet_id) return res.status(400).json({ success: false, error: 'Thiếu wallet_id' });
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, error: 'Số tiền không hợp lệ (dương = lãi, âm = lỗ)' });
    }
    const data = await InvestmentPnLModel.create({ userId, wallet_id, amount: Number(amount), note, recorded_at });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/cashflow/investment-pnl/:id
 */
router.put('/investment-pnl/:id', async (req, res, next) => {
  try {
    const data = await InvestmentPnLModel.update(req.params.id, req.body, userId);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy bản ghi' });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/cashflow/investment-pnl/:id
 */
router.delete('/investment-pnl/:id', async (req, res, next) => {
  try {
    const data = await InvestmentPnLModel.delete(req.params.id, userId);
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy bản ghi' });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

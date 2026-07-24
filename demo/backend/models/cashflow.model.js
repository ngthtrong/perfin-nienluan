const { pool, query } = require('../config/database');
const KVStore = require('../services/store/kv.store');
const { normalizePastOrPresentDate } = require('../services/transactions/validation');

const DEFAULT_USER = 'default_user';

async function invalidateFinancialCaches(userId = DEFAULT_USER) {
  await Promise.all([
    KVStore.del(`cache:wallets:${userId}`),
    KVStore.del(`cache:insights:${userId}`),
  ]);
}

async function rollbackAfterFailure(client, error) {
  try {
    await client.query('ROLLBACK');
  } catch (rollbackError) {
    error.rollbackError = rollbackError;
  }
}

async function invalidateAfterCommit(userId) {
  try {
    await invalidateFinancialCaches(userId);
  } catch (error) {
    // The transfer is already durable. Do not report it as failed and encourage
    // a duplicate retry merely because Redis is unavailable.
    console.warn(`[cashflow] post-commit cache invalidation failed: ${error.message}`);
  }
}

function optionalWalletId(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error(`${label} không hợp lệ`);
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  return id;
}

function validateTransferInput(data = {}, { today = new Date() } = {}) {
  const amount = Number(data.amount);
  const type = data.transfer_type || 'transfer';
  const from_wallet_id = optionalWalletId(data.from_wallet_id, 'Ví nguồn');
  const to_wallet_id = optionalWalletId(data.to_wallet_id, 'Ví nhận');
  const allowed = new Set(['transfer', 'investment_inflow', 'investment_outflow']);
  if (!(amount > 0) || !Number.isFinite(amount)) throw Object.assign(new Error('Số tiền chuyển phải lớn hơn 0'), { status: 400 });
  if (!allowed.has(type)) throw Object.assign(new Error('Loại chuyển tiền không hợp lệ'), { status: 400 });
  if (!from_wallet_id && !to_wallet_id) throw Object.assign(new Error('Cần ít nhất một ví nguồn hoặc ví nhận'), { status: 400 });
  if (type === 'transfer' && (!from_wallet_id || !to_wallet_id)) {
    throw Object.assign(new Error('Chuyển giữa ví cần đủ ví nguồn và ví nhận'), { status: 400 });
  }
  if (from_wallet_id && to_wallet_id && from_wallet_id === to_wallet_id) {
    throw Object.assign(new Error('Ví nguồn và ví nhận phải khác nhau'), { status: 400 });
  }
  normalizePastOrPresentDate(data.transaction_date, {
    label: 'Ngày chuyển tiền',
    today,
    optional: true,
  });
  return { amount, transfer_type: type, from_wallet_id, to_wallet_id };
}

// ─── Wallet Transfers (REQ-06: Transfer / Investment Inflow / Outflow) ──────

const TransferModel = {
  /**
   * Create a wallet-to-wallet transfer.
   * transfer_type: 'transfer' | 'investment_inflow' | 'investment_outflow'
   */
  async create(data) {
    const today = new Date();
    const validated = validateTransferInput(data, { today });
    const { userId = DEFAULT_USER, note } = data;
    const transactionDate = normalizePastOrPresentDate(data.transaction_date, {
      label: 'Ngày chuyển tiền',
      today,
      optional: true,
    });
    const { amount, transfer_type, from_wallet_id, to_wallet_id } = validated;
    const client = await pool.connect();
    let transactionClosed = false;
    let created;
    try {
      await client.query('BEGIN');

      const walletIds = [...new Set([from_wallet_id, to_wallet_id].filter(Boolean).map(Number))];
      const wallets = await client.query(
        `SELECT id, name, type, balance
         FROM wallets
         WHERE user_id = $1 AND id = ANY($2::int[])
         ORDER BY id
         FOR UPDATE`,
        [userId, walletIds]
      );
      if (wallets.rowCount !== walletIds.length) {
        const error = new Error('Ví nguồn hoặc ví nhận không tồn tại');
        error.status = 400;
        throw error;
      }
      // Debit source wallet
      if (from_wallet_id) {
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amount, from_wallet_id, userId]
        );
      }

      // Credit destination wallet
      if (to_wallet_id) {
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amount, to_wallet_id, userId]
        );
      }

      // Insert transfer log
      const result = await client.query(
        `INSERT INTO wallet_transfers (user_id, from_wallet_id, to_wallet_id, amount, transfer_type, note, transaction_date)
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_DATE))
         RETURNING *`,
        [userId, from_wallet_id || null, to_wallet_id || null, amount, transfer_type, note || null, transactionDate]
      );

      await client.query('COMMIT');
      transactionClosed = true;
      created = result.rows[0];
    } catch (err) {
      if (!transactionClosed) await rollbackAfterFailure(client, err);
      throw err;
    } finally {
      client.release();
    }

    await invalidateAfterCommit(userId);
    try {
      return (await this.getById(created.id, userId)) || created;
    } catch (error) {
      console.warn(`[cashflow] post-commit transfer hydration failed: ${error.message}`);
      return created;
    }
  },

  async getById(id, userId = DEFAULT_USER) {
    const result = await query(
      `SELECT wt.*,
              fw.name AS from_wallet_name, fw.type AS from_wallet_type,
              tw.name AS to_wallet_name, tw.type AS to_wallet_type
       FROM wallet_transfers wt
       LEFT JOIN wallets fw ON fw.id = wt.from_wallet_id
       LEFT JOIN wallets tw ON tw.id = wt.to_wallet_id
       WHERE wt.id = $1 AND wt.user_id = $2`,
      [id, userId]
    );
    return result.rows[0] || null;
  },

  async getAll(userId = DEFAULT_USER, filters = {}) {
    const where = ['wt.user_id = $1'];
    const params = [userId];
    const add = (clause, value) => {
      params.push(value);
      where.push(clause.replace('?', `$${params.length}`));
    };

    if (filters.wallet_id) {
      // Filter by wallet (either from or to)
      params.push(filters.wallet_id);
      where.push(`(wt.from_wallet_id = $${params.length} OR wt.to_wallet_id = $${params.length})`);
    }
    if (filters.transfer_type) add('wt.transfer_type = ?', filters.transfer_type);
    if (filters.from) add('wt.transaction_date >= ?', filters.from);
    if (filters.to) add('wt.transaction_date <= ?', filters.to);

    const limit = Math.min(Number(filters.limit || 50), 200);
    params.push(limit);

    const result = await query(
      `SELECT wt.*,
              fw.name AS from_wallet_name, fw.type AS from_wallet_type,
              tw.name AS to_wallet_name, tw.type AS to_wallet_type
       FROM wallet_transfers wt
       LEFT JOIN wallets fw ON fw.id = wt.from_wallet_id
       LEFT JOIN wallets tw ON tw.id = wt.to_wallet_id
       WHERE ${where.join(' AND ')}
       ORDER BY wt.transaction_date DESC, wt.created_at DESC
       LIMIT $${params.length}`,
      params
    );
    return result.rows;
  },
};

// ─── Investment P&L (REQ-06-05) ───────────────────────────────────────────────

const InvestmentPnLModel = {
  async create(data) {
    const { userId = DEFAULT_USER, note } = data;
    const recordedAt = normalizePastOrPresentDate(data.recorded_at, {
      label: 'Ngày ghi nhận lãi/lỗ',
      optional: true,
    });
    const wallet_id = optionalWalletId(data.wallet_id, 'Ví đầu tư');
    const amount = Number(data.amount);
    if (!wallet_id) {
      const error = new Error('Ví đầu tư không hợp lệ');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    if (!Number.isFinite(amount) || amount === 0) {
      const error = new Error('Giá trị lãi/lỗ phải là số khác 0');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    const client = await pool.connect();
    let transactionClosed = false;
    let created;
    try {
      await client.query('BEGIN');

      const wallet = await client.query(
        `SELECT id, type FROM wallets
         WHERE id = $1 AND user_id = $2 AND type IN ('investment'::wallet_type, 'savings'::wallet_type)
         FOR UPDATE`,
        [wallet_id, userId]
      );
      if (!wallet.rowCount) {
        const error = new Error('Ví đầu tư không tồn tại hoặc không thuộc người dùng');
        error.status = 400;
        throw error;
      }

      // Adjust investment wallet balance
      await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [amount, wallet_id, userId]
      );

      const result = await client.query(
        `INSERT INTO investment_pnl (user_id, wallet_id, amount, note, recorded_at)
         VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE))
         RETURNING *`,
        [userId, wallet_id, amount, note || null, recordedAt]
      );

      await client.query('COMMIT');
      transactionClosed = true;
      created = result.rows[0];
    } catch (err) {
      if (!transactionClosed) await rollbackAfterFailure(client, err);
      throw err;
    } finally {
      client.release();
    }

    await invalidateAfterCommit(userId);
    return created;
  },

  async update(id, data, userId = DEFAULT_USER) {
    const recordedAt = normalizePastOrPresentDate(data.recorded_at, {
      label: 'Ngày ghi nhận lãi/lỗ',
      optional: true,
    });
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      const error = new Error('Giá trị lãi/lỗ phải là số khác 0');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    const client = await pool.connect();
    let transactionClosed = false;
    let updated;
    try {
      await client.query('BEGIN');
      const old = await client.query(
        'SELECT * FROM investment_pnl WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, userId]
      );
      if (!old.rows[0]) {
        await client.query('ROLLBACK');
        transactionClosed = true;
        return null;
      }

      const diff = amount - Number(old.rows[0].amount);
      const wallet = await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [diff, old.rows[0].wallet_id, userId]
      );
      if (wallet.rowCount !== 1) throw Object.assign(new Error('Ví đầu tư không thuộc người dùng'), { status: 409 });

      const result = await client.query(
        `UPDATE investment_pnl SET amount = $2, note = $3, recorded_at = COALESCE($4, recorded_at), updated_at = NOW()
         WHERE id = $1 AND user_id = $5 RETURNING *`,
        [id, amount, data.note ?? old.rows[0].note, recordedAt, userId]
      );

      await client.query('COMMIT');
      transactionClosed = true;
      updated = result.rows[0];
    } catch (err) {
      if (!transactionClosed) await rollbackAfterFailure(client, err);
      throw err;
    } finally {
      client.release();
    }

    await invalidateAfterCommit(userId);
    return updated;
  },

  async delete(id, userId = DEFAULT_USER) {
    const client = await pool.connect();
    let transactionClosed = false;
    let deleted;
    try {
      await client.query('BEGIN');
      const old = await client.query(
        'SELECT * FROM investment_pnl WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, userId]
      );
      if (!old.rows[0]) {
        await client.query('ROLLBACK');
        transactionClosed = true;
        return null;
      }

      // Reverse the balance impact
      const wallet = await client.query(
        'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [old.rows[0].amount, old.rows[0].wallet_id, userId]
      );
      if (wallet.rowCount !== 1) throw Object.assign(new Error('Ví đầu tư không thuộc người dùng'), { status: 409 });
      await client.query('DELETE FROM investment_pnl WHERE id = $1 AND user_id = $2', [id, userId]);
      await client.query('COMMIT');
      transactionClosed = true;
      deleted = old.rows[0];
    } catch (err) {
      if (!transactionClosed) await rollbackAfterFailure(client, err);
      throw err;
    } finally {
      client.release();
    }

    await invalidateAfterCommit(userId);
    return deleted;
  },

  async getByWallet(walletId, userId = DEFAULT_USER) {
    const result = await query(
      `SELECT p.*, w.name AS wallet_name
       FROM investment_pnl p
       JOIN wallets w ON w.id = p.wallet_id
       WHERE p.wallet_id = $1 AND p.user_id = $2
       ORDER BY p.recorded_at DESC, p.created_at DESC`,
      [walletId, userId]
    );
    return result.rows;
  },
};

// ─── Net Worth (REQ-06-03) ─────────────────────────────────────────────────────

const NetWorthModel = {
  async calculate(userId = DEFAULT_USER) {
    const result = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN type IN ('cash','bank','e_wallet','credit_card') THEN balance ELSE 0 END), 0) AS regular_wallets,
         COALESCE(SUM(CASE WHEN type IN ('investment','savings') THEN balance ELSE 0 END), 0)              AS investment_wallets,
         COALESCE(SUM(balance), 0)                                                                         AS total_balance
       FROM wallets
       WHERE user_id = $1`,
      [userId]
    );
    const row = result.rows[0];
    const regular = Number(row.regular_wallets);
    const investment = Number(row.investment_wallets);
    const net_worth = regular + investment; // loans/debts are tracked in wallets (negative balance)
    return { regular_wallets: regular, investment_wallets: investment, net_worth };
  },
};

// ─── Cashflow Report (REQ-06-06) ─────────────────────────────────────────────

const CashflowModel = {
  async getReport(userId = DEFAULT_USER, filters = {}) {
    const { from, to } = filters;

    // Operating cashflow: income & expense transactions
    const txResult = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)  AS total_income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
       FROM transactions
       WHERE deleted_at IS NULL AND user_id = $1
         AND ($2::date IS NULL OR transaction_date >= $2::date)
         AND ($3::date IS NULL OR transaction_date <= $3::date)`,
      [userId, from || null, to || null]
    );

    // Investment cashflow: inflows, outflows, P&L
    const investResult = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN transfer_type = 'investment_inflow'  THEN amount ELSE 0 END), 0) AS investment_inflow,
         COALESCE(SUM(CASE WHEN transfer_type = 'investment_outflow' THEN amount ELSE 0 END), 0) AS investment_outflow
       FROM wallet_transfers
       WHERE user_id = $1
         AND ($2::date IS NULL OR transaction_date >= $2::date)
         AND ($3::date IS NULL OR transaction_date <= $3::date)`,
      [userId, from || null, to || null]
    );

    const pnlResult = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_pnl
       FROM investment_pnl
       WHERE user_id = $1
         AND ($2::date IS NULL OR recorded_at >= $2::date)
         AND ($3::date IS NULL OR recorded_at <= $3::date)`,
      [userId, from || null, to || null]
    );

    // Transfer cashflow: transfers between regular wallets
    const transferResult = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_transfer
       FROM wallet_transfers
       WHERE user_id = $1 AND transfer_type = 'transfer'
         AND ($2::date IS NULL OR transaction_date >= $2::date)
         AND ($3::date IS NULL OR transaction_date <= $3::date)`,
      [userId, from || null, to || null]
    );

    const txRow = txResult.rows[0];
    const invRow = investResult.rows[0];
    const pnlRow = pnlResult.rows[0];
    const trRow = transferResult.rows[0];

    const operating_income = Number(txRow.total_income);
    const operating_expense = Number(txRow.total_expense);
    const operating_cashflow = operating_income - operating_expense;

    const investment_inflow = Number(invRow.investment_inflow);
    const investment_outflow = Number(invRow.investment_outflow);
    const investment_pnl = Number(pnlRow.total_pnl);
    const investment_cashflow = investment_pnl - investment_inflow + investment_outflow; // net from investor perspective

    const transfer_total = Number(trRow.total_transfer);

    return {
      period: { from: from || null, to: to || null },
      operating: {
        income: operating_income,
        expense: operating_expense,
        net: operating_cashflow,
      },
      investment: {
        inflow: investment_inflow,
        outflow: investment_outflow,
        pnl: investment_pnl,
        net: investment_cashflow,
      },
      transfer: {
        total: transfer_total,
      },
      net_cashflow: operating_cashflow + investment_cashflow,
    };
  },
};

module.exports = { TransferModel, InvestmentPnLModel, NetWorthModel, CashflowModel };
module.exports.validateTransferInput = validateTransferInput;

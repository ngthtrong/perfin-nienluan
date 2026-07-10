const { pool, query } = require('../config/database');
const TransactionModel = require('./transaction.model');
const { normalizeText } = require('../services/parser.service');

const DEFAULT_USER = 'default_user';

function clampDayToMonth(year, monthIndex, day) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(day, lastDay);
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

// Core algorithm: compute the next due date for a bill given its frequency + due_day,
// starting strictly after `fromDate` (default today). due_day is day-of-month for
// monthly/quarterly/yearly, ISO day-of-week (1=Mon..7=Sun) for weekly.
function computeNextDueDate(frequency, dueDay, fromDate = new Date(), inclusive = false) {
  const base = new Date(fromDate);
  base.setHours(0, 0, 0, 0);

  if (frequency === 'weekly') {
    const targetDow = ((Number(dueDay) - 1) % 7 + 7) % 7; // 0=Mon..6=Sun
    const baseDow = (base.getDay() + 6) % 7;               // JS Sun=0 -> Mon=0
    let delta = (targetDow - baseDow + 7) % 7;
    if (delta === 0 && !inclusive) delta = 7;
    const next = new Date(base);
    next.setDate(base.getDate() + delta);
    return toISODate(next);
  }

  const stepMonths = frequency === 'quarterly' ? 3 : frequency === 'yearly' ? 12 : 1;
  let year = base.getFullYear();
  let monthIndex = base.getMonth();

  // Candidate in the current period
  let candidate = new Date(year, monthIndex, clampDayToMonth(year, monthIndex, Number(dueDay)));
  candidate.setHours(0, 0, 0, 0);

  const passed = inclusive ? candidate < base : candidate <= base;
  if (passed) {
    monthIndex += stepMonths;
    year += Math.floor(monthIndex / 12);
    monthIndex %= 12;
    candidate = new Date(year, monthIndex, clampDayToMonth(year, monthIndex, Number(dueDay)));
  }
  return toISODate(candidate);
}

function periodStartFor(frequency, dueDate) {
  const d = new Date(dueDate);
  const step = frequency === 'weekly' ? 7 : frequency === 'quarterly' ? 90 : frequency === 'yearly' ? 365 : 28;
  const start = new Date(d);
  start.setDate(d.getDate() - step + 1);
  return toISODate(start);
}

async function getJoined(id) {
  const result = await query(
    `SELECT b.*, c.name AS category_name, c.icon AS category_icon, w.name AS wallet_name
     FROM recurring_bills b
     LEFT JOIN categories c ON c.id = b.category_id
     LEFT JOIN wallets w ON w.id = b.wallet_id
     WHERE b.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

const RecurringBillModel = {
  computeNextDueDate,

  async create(data) {
    const userId = data.userId || DEFAULT_USER;
    const frequency = data.frequency || 'monthly';
    const dueDay = Number(data.due_day || 1);
    const nextDue = data.next_due_date || computeNextDueDate(frequency, dueDay, new Date(), true);
    const result = await query(
      `INSERT INTO recurring_bills
         (user_id, name, amount, category_id, wallet_id, frequency, due_day, next_due_date, remind_days_before, is_variable_amount, note)
       VALUES ($1, $2, $3, $4, $5, $6::recurring_frequency, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        userId, data.name, data.amount, data.category_id || null, data.wallet_id || null,
        frequency, dueDay, nextDue, Number(data.remind_days_before || 0),
        Boolean(data.is_variable_amount), data.note || null,
      ]
    );
    return getJoined(result.rows[0].id);
  },

  async getAll(userId = DEFAULT_USER) {
    const result = await query(
      `SELECT b.*, c.name AS category_name, c.icon AS category_icon, w.name AS wallet_name,
         (SELECT status FROM recurring_bill_payments p
          WHERE p.bill_id = b.id AND p.period_due_date = b.next_due_date
          ORDER BY p.created_at DESC LIMIT 1) AS current_period_status
       FROM recurring_bills b
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN wallets w ON w.id = b.wallet_id
       WHERE b.user_id = $1
       ORDER BY b.status ASC, b.next_due_date ASC`,
      [userId]
    );
    return result.rows;
  },

  getById(id) {
    return getJoined(id);
  },

  async update(id, data) {
    const bill = await getJoined(id);
    if (!bill) return null;
    const frequency = data.frequency || bill.frequency;
    const dueDay = data.due_day != null ? Number(data.due_day) : bill.due_day;
    // Recompute next due date if cadence changed (FR-08-05 change cycle)
    const recompute = (data.frequency && data.frequency !== bill.frequency)
      || (data.due_day != null && Number(data.due_day) !== bill.due_day);
    const nextDue = recompute ? computeNextDueDate(frequency, dueDay, new Date(), true) : bill.next_due_date;
    await query(
      `UPDATE recurring_bills SET
         name = COALESCE($2, name),
         amount = COALESCE($3, amount),
         category_id = COALESCE($4, category_id),
         wallet_id = COALESCE($5, wallet_id),
         frequency = $6::recurring_frequency,
         due_day = $7,
         next_due_date = $8,
         remind_days_before = COALESCE($9, remind_days_before),
         is_variable_amount = COALESCE($10, is_variable_amount),
         note = COALESCE($11, note),
         updated_at = NOW()
       WHERE id = $1`,
      [
        id, data.name || null, data.amount || null, data.category_id || null, data.wallet_id || null,
        frequency, dueDay, nextDue,
        data.remind_days_before != null ? Number(data.remind_days_before) : null,
        data.is_variable_amount != null ? Boolean(data.is_variable_amount) : null,
        data.note || null,
      ]
    );
    return getJoined(id);
  },

  // Delete the bill but keep payment history (Constraint REQ-08). bill_id becomes NULL via FK.
  async delete(id) {
    const bill = await getJoined(id);
    if (!bill) return null;
    await query('DELETE FROM recurring_bills WHERE id = $1', [id]);
    return { success: true };
  },

  async pause(id) {
    const result = await query(
      `UPDATE recurring_bills SET status = 'paused', updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rowCount ? getJoined(id) : null;
  },

  // Reactivate: recompute next due based on cadence and current date (FR-08-07)
  async resume(id) {
    const bill = await getJoined(id);
    if (!bill) return null;
    const nextDue = computeNextDueDate(bill.frequency, bill.due_day, new Date(), false);
    await query(
      `UPDATE recurring_bills SET status = 'active', next_due_date = $2, updated_at = NOW() WHERE id = $1`,
      [id, nextDue]
    );
    return getJoined(id);
  },

  // Active bills whose reminder window (next_due_date - remind_days_before) has arrived,
  // and that have not been paid for the current period yet (FR-08-03).
  async getDueBills(userId = DEFAULT_USER, today = new Date()) {
    const todayISO = toISODate(new Date(today));
    const result = await query(
      `SELECT b.*, c.name AS category_name, c.icon AS category_icon,
              w.name AS wallet_name, w.balance AS wallet_balance
       FROM recurring_bills b
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN wallets w ON w.id = b.wallet_id
       WHERE b.user_id = $1 AND b.status = 'active'
         AND (b.next_due_date - b.remind_days_before) <= $2::date
         AND NOT EXISTS (
           SELECT 1 FROM recurring_bill_payments p
           WHERE p.bill_id = b.id AND p.period_due_date = b.next_due_date AND p.status = 'paid'
         )
       ORDER BY b.next_due_date ASC`,
      [userId, todayISO]
    );
    return result.rows;
  },

  // Record a payment: create a real transaction (reuses TransactionModel → updates wallet balance),
  // log the payment, and advance next_due_date to the following period (FR-08-04).
  async recordPayment(billId, { amount, walletId, paidDate, categoryId } = {}) {
    const bill = await getJoined(billId);
    if (!bill) return null;

    const payAmount = Number(amount || bill.amount);
    const payWallet = walletId || bill.wallet_id;
    const payCategory = categoryId || bill.category_id;
    const periodDue = bill.next_due_date;

    const tx = await TransactionModel.create({
      userId: bill.user_id,
      description: bill.name,
      amount: payAmount,
      type: 'expense',
      category_id: payCategory,
      wallet_id: payWallet,
      transaction_date: paidDate || toISODate(new Date()),
      source: 'ai_chat',
      note: `Thanh toán chi phí cố định: ${bill.name}`,
    });

    await query(
      `INSERT INTO recurring_bill_payments
         (user_id, bill_id, bill_name, transaction_id, period_due_date, paid_date, amount, wallet_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid')`,
      [bill.user_id, billId, bill.name, tx.id, periodDue, paidDate || toISODate(new Date()), payAmount, payWallet]
    );

    const nextDue = computeNextDueDate(bill.frequency, bill.due_day, new Date(periodDue), false);
    await query('UPDATE recurring_bills SET next_due_date = $2, updated_at = NOW() WHERE id = $1', [billId, nextDue]);

    return { bill: await getJoined(billId), transaction: tx, period_due_date: periodDue };
  },

  async getPaymentHistory(billId) {
    const result = await query(
      `SELECT * FROM recurring_bill_payments WHERE bill_id = $1 ORDER BY period_due_date DESC`,
      [billId]
    );
    const paid = result.rows.filter((r) => r.status === 'paid');
    const overdue = result.rows.filter((r) => r.status === 'overdue');
    const totalPaid = paid.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    return {
      payments: result.rows,
      summary: {
        paid_count: paid.length,
        overdue_count: overdue.length,
        total_paid: totalPaid,
        on_time_rate: result.rows.length ? Number((paid.length / result.rows.length).toFixed(2)) : null,
      },
    };
  },

  async dismissSuggestion(userId, signature) {
    await query(
      `INSERT INTO recurring_suggestions_dismissed (user_id, signature)
       VALUES ($1, $2)
       ON CONFLICT (user_id, signature) DO UPDATE SET dismissed_at = NOW()`,
      [userId, signature]
    );
    return { success: true };
  },

  // AI detection: group expense transactions by normalized description, find groups with >=3
  // occurrences that recur monthly, propose a candidate (FR-08-02). Skips existing bills and
  // suggestions dismissed within the last 30 days.
  async detectRecurringCandidates(userId = DEFAULT_USER) {
    const txResult = await query(
      `SELECT t.description, t.amount, t.transaction_date, t.category_id, t.wallet_id
       FROM transactions t
       WHERE t.user_id = $1 AND t.type = 'expense' AND t.deleted_at IS NULL
         AND t.transaction_date >= CURRENT_DATE - INTERVAL '6 months'
       ORDER BY t.transaction_date ASC`,
      [userId]
    );

    const groups = new Map();
    for (const tx of txResult.rows) {
      const key = normalizeText(tx.description).replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(tx);
    }

    const existing = await query('SELECT name FROM recurring_bills WHERE user_id = $1', [userId]);
    const existingNames = new Set(existing.rows.map((r) => normalizeText(r.name)));

    const dismissed = await query(
      `SELECT signature FROM recurring_suggestions_dismissed
       WHERE user_id = $1 AND dismissed_at >= NOW() - INTERVAL '30 days'`,
      [userId]
    );
    const dismissedSigs = new Set(dismissed.rows.map((r) => r.signature));

    const candidates = [];
    for (const [, txs] of groups) {
      if (txs.length < 3) continue;
      const sample = txs[txs.length - 1];
      if (existingNames.has(normalizeText(sample.description))) continue;

      const amounts = txs.map((t) => Number(t.amount));
      const avg = Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length);
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      const isVariable = max - min > avg * 0.15;

      // Verify roughly-monthly spacing
      const days = txs.map((t) => new Date(t.transaction_date).getTime());
      const gaps = [];
      for (let i = 1; i < days.length; i += 1) gaps.push((days[i] - days[i - 1]) / 86400000);
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      let frequency = 'monthly';
      if (avgGap >= 6 && avgGap <= 9) frequency = 'weekly';
      else if (avgGap >= 80 && avgGap <= 100) frequency = 'quarterly';
      else if (avgGap < 20 || avgGap > 120) continue; // not a clear cadence

      const dueDay = frequency === 'weekly'
        ? ((new Date(sample.transaction_date).getDay() + 6) % 7) + 1
        : new Date(sample.transaction_date).getDate();

      const signature = `${normalizeText(sample.description)}|${Math.round(avg / 100000)}|${frequency}`;
      if (dismissedSigs.has(signature)) continue;

      candidates.push({
        signature,
        name: sample.description,
        amount: avg,
        is_variable_amount: isVariable,
        frequency,
        due_day: dueDay,
        category_id: sample.category_id,
        wallet_id: sample.wallet_id,
        occurrences: txs.length,
      });
    }
    return candidates;
  },
};

module.exports = RecurringBillModel;

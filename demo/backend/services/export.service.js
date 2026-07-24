const { query } = require('../config/database');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DEFAULT_USER = 'default_user';
const EXPORTS_DIR = path.join(__dirname, '..', 'exports');
const EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

fs.mkdirSync(EXPORTS_DIR, { recursive: true });

// ─── Helpers ───────────────────────────────────────────────────────────────────

function csvEscape(val) {
  const str = String(val == null ? '' : val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSVRow(fields) {
  return fields.map(csvEscape).join(',');
}

function formatVND(amount) {
  return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function escapeHTML(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Export History Model ──────────────────────────────────────────────────────

const ExportHistoryModel = {
  async create(data) {
    const result = await query(
      `INSERT INTO export_history (user_id, export_type, label, file_name, file_size, file_path, filters, is_auto, status, error_message, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::jsonb, '{}'), $8, $9, $10, $11)
       RETURNING *`,
      [
        data.userId || DEFAULT_USER,
        data.export_type,
        data.label || null,
        data.file_name || null,
        data.file_size || null,
        data.file_path || null,
        data.filters ? JSON.stringify(data.filters) : null,
        data.is_auto || false,
        data.status || 'success',
        data.error_message || null,
        data.expires_at || new Date(Date.now() + EXPORT_TTL_MS).toISOString(),
      ]
    );
    return result.rows[0];
  },

  async getAll(userId = DEFAULT_USER) {
    const result = await query(
      `SELECT id, export_type, label, file_name, file_size, is_auto, status, error_message, created_at, expires_at,
              (file_path IS NOT NULL AND expires_at > NOW()) AS file_available
       FROM export_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );
    return result.rows;
  },

  async getById(id, userId = DEFAULT_USER) {
    const result = await query(
      'SELECT * FROM export_history WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  },

  async delete(id, userId = DEFAULT_USER) {
    const row = await this.getById(id, userId);
    if (!row) return null;
    // Delete physical file if it exists
    if (row.file_path && fs.existsSync(row.file_path)) {
      fs.unlinkSync(row.file_path);
    }
    await query('DELETE FROM export_history WHERE id = $1 AND user_id = $2', [id, userId]);
    return row;
  },

  async countBackups(userId = DEFAULT_USER, isAuto = false) {
    const result = await query(
      "SELECT COUNT(*) FROM export_history WHERE user_id = $1 AND export_type = 'backup' AND is_auto = $2 AND status = 'success'",
      [userId, isAuto]
    );
    return Number(result.rows[0].count);
  },

  async getOldestAutoBackup(userId = DEFAULT_USER) {
    const result = await query(
      "SELECT id FROM export_history WHERE user_id = $1 AND export_type = 'backup' AND is_auto = true AND status = 'success' ORDER BY created_at ASC LIMIT 1",
      [userId]
    );
    return result.rows[0] || null;
  },
};

// ─── Backup Config ─────────────────────────────────────────────────────────────

const BackupConfigModel = {
  async get(userId = DEFAULT_USER) {
    const result = await query(
      'SELECT * FROM backup_config WHERE user_id = $1',
      [userId]
    );
    if (!result.rows[0]) {
      // Insert default
      const ins = await query(
        "INSERT INTO backup_config (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING *",
        [userId]
      );
      return ins.rows[0];
    }
    return result.rows[0];
  },

  async update(userId = DEFAULT_USER, data) {
    const result = await query(
      `UPDATE backup_config SET auto_enabled = COALESCE($2, auto_enabled),
       frequency = COALESCE($3, frequency), keep_count = COALESCE($4, keep_count),
       updated_at = NOW()
       WHERE user_id = $1 RETURNING *`,
      [userId, data.auto_enabled ?? null, data.frequency || null, data.keep_count || null]
    );
    return result.rows[0];
  },

  async updateLastBackup(userId = DEFAULT_USER) {
    await query(
      'UPDATE backup_config SET last_backup_at = NOW(), updated_at = NOW() WHERE user_id = $1',
      [userId]
    );
  },
};

// ─── CSV Export (REQ-07-01) ────────────────────────────────────────────────────

async function exportCSV(userId = DEFAULT_USER, filters = {}) {
  const where = ['t.deleted_at IS NULL', 't.user_id = $1'];
  const params = [userId];
  const add = (clause, value) => {
    params.push(value);
    where.push(clause.replace('?', `$${params.length}`));
  };

  if (filters.from) add('t.transaction_date >= ?', filters.from);
  if (filters.to) add('t.transaction_date <= ?', filters.to);
  if (filters.category_id) add('t.category_id = ?', filters.category_id);
  if (filters.wallet_id) add('t.wallet_id = ?', filters.wallet_id);
  if (filters.type) add('t.type = ?', filters.type);

  const result = await query(
    `SELECT t.transaction_date, t.description, t.amount, t.type,
            c.name AS category_name, cp.name AS parent_category_name,
            w.name AS wallet_name
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     LEFT JOIN categories cp ON cp.id = c.parent_id
     JOIN wallets w ON w.id = t.wallet_id
     WHERE ${where.join(' AND ')}
     ORDER BY t.transaction_date DESC, t.created_at DESC`,
    params
  );

  if (!result.rows.length) return null;

  const header = toCSVRow(['Ngày', 'Mô tả', 'Số tiền', 'Danh mục', 'Ví', 'Loại giao dịch']);
  const rows = result.rows.map((r) => {
    const cat = r.parent_category_name ? `${r.parent_category_name} > ${r.category_name}` : r.category_name;
    const typeLabel = r.type === 'income' ? 'Thu nhập' : 'Chi tiêu';
    return toCSVRow([
      formatDate(r.transaction_date),
      r.description,
      Number(r.amount).toFixed(0),
      cat,
      r.wallet_name,
      typeLabel,
    ]);
  });

  // BOM + UTF-8 so Excel opens correctly
  const csv = '\uFEFF' + [header, ...rows].join('\r\n');
  const fileName = `perfin-export-${Date.now()}.csv`;
  const filePath = path.join(EXPORTS_DIR, fileName);
  fs.writeFileSync(filePath, csv, 'utf8');

  const stats = fs.statSync(filePath);
  const label = buildLabel(filters);
  const history = await ExportHistoryModel.create({
    userId,
    export_type: 'csv',
    label,
    file_name: fileName,
    file_size: stats.size,
    file_path: filePath,
    filters,
  });

  return { filePath, fileName, rowCount: result.rows.length, historyId: history.id };
}

// ─── PDF Export (REQ-07-02) ────────────────────────────────────────────────────

const EXPENSE_BREAKDOWN_SQL = `SELECT c.name AS category_name, c.icon, SUM(t.amount) AS total,
       ROUND(100.0 * SUM(t.amount) / NULLIF((
         SELECT SUM(total_tx.amount)
         FROM transactions total_tx
         WHERE total_tx.deleted_at IS NULL
           AND total_tx.user_id = $1
           AND total_tx.type = 'expense'
           AND ($2::date IS NULL OR total_tx.transaction_date >= $2::date)
           AND ($3::date IS NULL OR total_tx.transaction_date <= $3::date)
       ), 0), 1) AS percentage
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.deleted_at IS NULL AND t.user_id = $1 AND t.type = 'expense'
  AND ($2::date IS NULL OR t.transaction_date >= $2::date)
  AND ($3::date IS NULL OR t.transaction_date <= $3::date)
GROUP BY c.id, c.name, c.icon
ORDER BY total DESC
LIMIT 10`;

async function exportPDF(userId = DEFAULT_USER, filters = {}) {
  const { from, to } = filters;

  // Gather report data
  const summaryResult = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
       COUNT(*) AS transaction_count
     FROM transactions
     WHERE deleted_at IS NULL AND user_id = $1
       AND ($2::date IS NULL OR transaction_date >= $2::date)
       AND ($3::date IS NULL OR transaction_date <= $3::date)`,
    [userId, from || null, to || null]
  );

  const breakdownResult = await query(EXPENSE_BREAKDOWN_SQL, [userId, from || null, to || null]);

  const txResult = await query(
    `SELECT t.transaction_date, t.description, t.amount, t.type, c.name AS category_name, w.name AS wallet_name
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     JOIN wallets w ON w.id = t.wallet_id
     WHERE t.deleted_at IS NULL AND t.user_id = $1
       AND ($2::date IS NULL OR t.transaction_date >= $2::date)
       AND ($3::date IS NULL OR t.transaction_date <= $3::date)
     ORDER BY t.transaction_date DESC, t.created_at DESC
     LIMIT 100`,
    [userId, from || null, to || null]
  );

  if (!txResult.rows.length) return null;

  const summary = summaryResult.rows[0];
  const label = buildLabel(filters);

  // Generate simple HTML → to be rendered as PDF via browser print or puppeteer in future
  // For MVP: generate an HTML file that is a well-formatted report
  const html = buildReportHTML({ label, summary, breakdown: breakdownResult.rows, transactions: txResult.rows });

  const fileName = `perfin-report-${Date.now()}.html`;
  const filePath = path.join(EXPORTS_DIR, fileName);
  fs.writeFileSync(filePath, html, 'utf8');

  const stats = fs.statSync(filePath);
  const history = await ExportHistoryModel.create({
    userId,
    export_type: 'pdf',
    label,
    file_name: fileName,
    file_size: stats.size,
    file_path: filePath,
    filters,
  });

  return { filePath, fileName, historyId: history.id };
}

function buildLabel(filters) {
  if (filters.label) return filters.label;
  if (filters.from && filters.to) return `${formatDate(filters.from)} – ${formatDate(filters.to)}`;
  if (filters.from) return `Từ ${formatDate(filters.from)}`;
  if (filters.to) return `Đến ${formatDate(filters.to)}`;
  return 'Toàn bộ dữ liệu';
}

function buildReportHTML({ label, summary, breakdown, transactions }) {
  const income = Number(summary.total_income);
  const expense = Number(summary.total_expense);
  const net = income - expense;
  const netColor = net >= 0 ? '#10B981' : '#F43F5E';

  const breakdownRows = breakdown.map((b) =>
    `<tr>
      <td>${escapeHTML(b.icon)} ${escapeHTML(b.category_name)}</td>
      <td style="text-align:right">${Number(b.percentage || 0).toFixed(1)}%</td>
      <td style="text-align:right;color:#F43F5E">${formatVND(b.total)}</td>
    </tr>`
  ).join('');

  const txRows = transactions.slice(0, 50).map((t) => {
    const sign = t.type === 'income' ? '+' : '-';
    const color = t.type === 'income' ? '#10B981' : '#F43F5E';
    return `<tr>
      <td>${formatDate(t.transaction_date)}</td>
      <td>${escapeHTML(t.description)}</td>
      <td>${escapeHTML(t.category_name)}</td>
      <td>${escapeHTML(t.wallet_name)}</td>
      <td style="text-align:right;color:${color};font-weight:700">${sign}${formatVND(t.amount)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>PERFIN Báo cáo tài chính – ${escapeHTML(label)}</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 0; padding: 24px; color: #0F0F23; background: #F4F5FB; }
    .header { background: #5B5FEF; color: #fff; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 4px; font-size: 22px; letter-spacing: 1px; }
    .header p { margin: 0; opacity: .8; font-size: 13px; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; }
    .card { flex: 1; background: #fff; border-radius: 12px; padding: 18px; border: 1px solid #E8E8F0; }
    .card .label { font-size: 12px; color: #9B9BB4; font-weight: 600; margin-bottom: 6px; }
    .card .value { font-size: 22px; font-weight: 900; }
    .income { color: #10B981; } .expense { color: #F43F5E; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #E8E8F0; margin-bottom: 24px; }
    th { background: #5B5FEF; color: #fff; padding: 10px 14px; text-align: left; font-size: 13px; }
    td { padding: 10px 14px; border-bottom: 1px solid #F0F0F8; font-size: 13px; }
    tr:last-child td { border-bottom: none; }
    h2 { font-size: 16px; margin: 20px 0 10px; color: #0F0F23; }
    .footer { text-align: center; color: #9B9BB4; font-size: 11px; margin-top: 32px; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 PERFIN – Báo cáo tài chính</h1>
    <p>${escapeHTML(label)} · Xuất ngày ${formatDate(new Date())}</p>
  </div>

  <div class="summary">
    <div class="card">
      <div class="label">💰 Thu nhập</div>
      <div class="value income">${formatVND(income)}</div>
    </div>
    <div class="card">
      <div class="label">💸 Chi tiêu</div>
      <div class="value expense">${formatVND(expense)}</div>
    </div>
    <div class="card">
      <div class="label">📈 Chênh lệch</div>
      <div class="value" style="color:${netColor}">${net >= 0 ? '+' : ''}${formatVND(net)}</div>
    </div>
    <div class="card">
      <div class="label">🔢 Giao dịch</div>
      <div class="value">${Number(summary.transaction_count || 0)}</div>
    </div>
  </div>

  ${breakdown.length ? `
  <h2>Chi tiêu theo danh mục</h2>
  <table>
    <tr><th>Danh mục</th><th style="text-align:right">Tỉ lệ</th><th style="text-align:right">Số tiền</th></tr>
    ${breakdownRows}
  </table>` : ''}

  <h2>Danh sách giao dịch (${Math.min(transactions.length, 50)} gần nhất)</h2>
  <table>
    <tr><th>Ngày</th><th>Mô tả</th><th>Danh mục</th><th>Ví</th><th style="text-align:right">Số tiền</th></tr>
    ${txRows}
  </table>

  <div class="footer">Tạo bởi PERFIN · Trợ lý tài chính AI · ${new Date().toLocaleString('vi-VN')}</div>
</body>
</html>`;
}

// ─── Backup (REQ-07-04) ────────────────────────────────────────────────────────

const BACKUP_ENCRYPTION_ALGO = 'aes-256-gcm';
const BACKUP_KEY_LENGTH = 32;

async function createBackup(userId = DEFAULT_USER, options = {}) {
  // Collect all user data
  const [transactions, categories, wallets, budgets, chatMessages, transfers, pnl] = await Promise.all([
    query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY id', [userId]),
    query('SELECT * FROM categories WHERE user_id = $1 ORDER BY id', [userId]),
    query('SELECT * FROM wallets WHERE user_id = $1 ORDER BY id', [userId]),
    query('SELECT * FROM budgets WHERE user_id = $1 ORDER BY id', [userId]),
    query('SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY id LIMIT 1000', [userId]),
    query('SELECT * FROM wallet_transfers WHERE user_id = $1 ORDER BY id', [userId]),
    query('SELECT * FROM investment_pnl WHERE user_id = $1 ORDER BY id', [userId]),
  ]);

  const backupData = {
    version: '1.0',
    user_id: userId,
    created_at: new Date().toISOString(),
    checksum_seed: crypto.randomBytes(8).toString('hex'),
    data: {
      transactions: transactions.rows,
      categories: categories.rows,
      wallets: wallets.rows,
      budgets: budgets.rows,
      chat_messages: chatMessages.rows,
      wallet_transfers: transfers.rows,
      investment_pnl: pnl.rows,
    },
  };

  const json = JSON.stringify(backupData);
  const checksum = crypto.createHash('sha256').update(json).digest('hex');
  backupData.checksum = checksum;

  const finalJson = JSON.stringify(backupData);

  // Encrypt with AES-256-GCM
  const key = crypto.randomBytes(BACKUP_KEY_LENGTH);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(BACKUP_ENCRYPTION_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(finalJson, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Bundle: version_byte + iv(12) + authTag(16) + key(32) + encrypted
  // NOTE: In production, key should be derived from user password (PBKDF2)
  // For MVP: key is embedded in file (allows restore without password)
  const bundle = Buffer.concat([
    Buffer.from([0x01]),   // version marker
    iv,
    authTag,
    key,
    encrypted,
  ]);

  const fileName = `perfin-backup-${userId}-${Date.now()}.pfbak`;
  const filePath = path.join(EXPORTS_DIR, fileName);
  fs.writeFileSync(filePath, bundle);

  const stats = fs.statSync(filePath);
  const config = await BackupConfigModel.get(userId);

  const history = await ExportHistoryModel.create({
    userId,
    export_type: 'backup',
    label: options.is_auto ? 'Tự động' : 'Thủ công',
    file_name: fileName,
    file_size: stats.size,
    file_path: filePath,
    filters: {},
    is_auto: options.is_auto || false,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  });

  await BackupConfigModel.updateLastBackup(userId);

  // Auto-cleanup: remove old auto backups exceeding keep_count
  if (options.is_auto) {
    const count = await ExportHistoryModel.countBackups(userId, true);
    if (count > config.keep_count) {
      const oldest = await ExportHistoryModel.getOldestAutoBackup(userId);
      if (oldest) await ExportHistoryModel.delete(oldest.id, userId);
    }
  }

  return { filePath, fileName, fileSize: stats.size, historyId: history.id };
}

// ─── Restore (REQ-07-05) ──────────────────────────────────────────────────────

async function restoreBackup(userId = DEFAULT_USER, filePath) {
  if (!fs.existsSync(filePath)) throw new Error('File backup không tồn tại');

  const bundle = fs.readFileSync(filePath);
  if (bundle[0] !== 0x01) throw new Error('Định dạng backup không hợp lệ');

  const iv = bundle.slice(1, 13);
  const authTag = bundle.slice(13, 29);
  const key = bundle.slice(29, 61);
  const encrypted = bundle.slice(61);

  let json;
  try {
    const decipher = crypto.createDecipheriv(BACKUP_ENCRYPTION_ALGO, key, iv);
    decipher.setAuthTag(authTag);
    json = decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    throw new Error('Backup bị hỏng hoặc không hợp lệ');
  }

  const backupData = JSON.parse(json);

  // Verify ownership
  if (backupData.user_id && backupData.user_id !== userId) {
    throw new Error('Backup không thuộc tài khoản hiện tại');
  }

  // Verify checksum
  const storedChecksum = backupData.checksum;
  delete backupData.checksum;
  const computedChecksum = crypto.createHash('sha256').update(JSON.stringify(backupData)).digest('hex');
  if (storedChecksum !== computedChecksum) {
    throw new Error('Dữ liệu backup bị lỗi (checksum không khớp)');
  }

  const client = await (require('../config/database')).pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing data
    await client.query('DELETE FROM investment_pnl WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM wallet_transfers WHERE user_id = $1', [userId]);
    await client.query('UPDATE transactions SET deleted_at = NOW() WHERE user_id = $1 AND deleted_at IS NULL', [userId]);
    await client.query('DELETE FROM budgets WHERE user_id = $1', [userId]);
    // Note: we don't delete categories/wallets to avoid FK issues; we merge

    // Restore transactions (simplified: re-insert with new IDs)
    const data = backupData.data;
    for (const tx of (data.transactions || [])) {
      if (tx.deleted_at) continue;
      await client.query(
        `INSERT INTO transactions (user_id, description, amount, type, category_id, wallet_id, transaction_date, source, note, original_text, ai_parsed, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
        [userId, tx.description, tx.amount, tx.type, tx.category_id, tx.wallet_id, tx.transaction_date, tx.source, tx.note, tx.original_text, tx.ai_parsed, tx.created_at]
      );
    }

    for (const b of (data.budgets || [])) {
      await client.query(
        `INSERT INTO budgets (user_id, category_id, amount_limit, month, year, created_at)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id, category_id, month, year) DO UPDATE SET amount_limit = EXCLUDED.amount_limit`,
        [userId, b.category_id, b.amount_limit, b.month, b.year, b.created_at]
      );
    }

    for (const tr of (data.wallet_transfers || [])) {
      await client.query(
        `INSERT INTO wallet_transfers (user_id, from_wallet_id, to_wallet_id, amount, transfer_type, note, transaction_date, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
        [userId, tr.from_wallet_id, tr.to_wallet_id, tr.amount, tr.transfer_type, tr.note, tr.transaction_date, tr.created_at]
      );
    }

    for (const p of (data.investment_pnl || [])) {
      await client.query(
        `INSERT INTO investment_pnl (user_id, wallet_id, amount, note, recorded_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [userId, p.wallet_id, p.amount, p.note, p.recorded_at, p.created_at]
      );
    }

    // Recompute each wallet's running balance from the restored history. Wallets
    // are intentionally left in place (see note above), so `balance` would still
    // reflect the pre-restore state unless we rebuild it here from initial_balance
    // plus every flow: transactions (income +, expense -), transfers (in +/out -)
    // and investment P&L (+). Without this, restore leaves balances inconsistent
    // with the transaction history it just replaced.
    await client.query(
      `UPDATE wallets w SET
         balance = w.initial_balance
           + COALESCE((SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
                       FROM transactions t
                       WHERE t.wallet_id = w.id AND t.user_id = w.user_id AND t.deleted_at IS NULL), 0)
           + COALESCE((SELECT SUM(tr.amount) FROM wallet_transfers tr
                       WHERE tr.to_wallet_id = w.id AND tr.user_id = w.user_id), 0)
           - COALESCE((SELECT SUM(tr.amount) FROM wallet_transfers tr
                       WHERE tr.from_wallet_id = w.id AND tr.user_id = w.user_id), 0)
           + COALESCE((SELECT SUM(p.amount) FROM investment_pnl p
                       WHERE p.wallet_id = w.id AND p.user_id = w.user_id), 0),
         updated_at = NOW()
       WHERE w.user_id = $1`,
      [userId]
    );

    await client.query('COMMIT');
    return {
      success: true,
      restored: {
        transactions: data.transactions?.length || 0,
        budgets: data.budgets?.length || 0,
        wallet_transfers: data.wallet_transfers?.length || 0,
        investment_pnl: data.investment_pnl?.length || 0,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  ExportHistoryModel,
  BackupConfigModel,
  exportCSV,
  exportPDF,
  createBackup,
  restoreBackup,
  EXPORTS_DIR,
  EXPENSE_BREAKDOWN_SQL,
  buildLabel,
  buildReportHTML,
  escapeHTML,
};

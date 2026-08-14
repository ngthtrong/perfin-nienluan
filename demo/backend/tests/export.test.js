const test = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPENSE_BREAKDOWN_SQL,
  buildReportHTML,
  escapeHTML,
  validateBackupTransactions,
} = require('../services/export.service');

test('backup restore preflight rejects non-positive ledger amounts but accepts signed P&L separately', () => {
  assert.throws(() => validateBackupTransactions([{ amount: -50_000 }]), /Giao dịch backup thứ 1.*lớn hơn 0/);
  assert.throws(() => validateBackupTransactions([{ amount: 0 }]), /Giao dịch backup thứ 1.*lớn hơn 0/);
  assert.doesNotThrow(() => validateBackupTransactions([{ amount: 50_000 }]));
});

test('expense percentages use the same date window as the category rows', () => {
  assert.match(EXPENSE_BREAKDOWN_SQL, /total_tx\.transaction_date >= \$2::date/);
  assert.match(EXPENSE_BREAKDOWN_SQL, /total_tx\.transaction_date <= \$3::date/);
  assert.equal((EXPENSE_BREAKDOWN_SQL.match(/transaction_date >= \$2::date/g) || []).length, 2);
  assert.equal((EXPENSE_BREAKDOWN_SQL.match(/transaction_date <= \$3::date/g) || []).length, 2);
  assert.match(EXPENSE_BREAKDOWN_SQL, /JOIN wallets w ON w\.id = t\.wallet_id/);
  assert.match(EXPENSE_BREAKDOWN_SQL, /total_w\.currency = 'VND'/);
  assert.match(EXPENSE_BREAKDOWN_SQL, /w\.currency = 'VND'/);
});

test('HTML report escapes every user-controlled display field', () => {
  const label = 'Tháng <script>alert("label")</script> & sau';
  const html = buildReportHTML({
    label,
    summary: { total_income: 1_000_000, total_expense: 250_000, transaction_count: 1 },
    breakdown: [{
      icon: '<svg onload="icon">',
      category_name: 'Ăn & <uống>',
      percentage: 100,
      total: 250_000,
    }],
    transactions: [{
      transaction_date: '2026-07-16',
      description: '<img src=x onerror="description">',
      category_name: 'Danh mục "x"',
      wallet_name: "Ví 'chính' & phụ",
      type: 'expense',
      amount: 250_000,
    }],
  });

  assert.doesNotMatch(html, /<script>|<svg|<img/);
  assert.ok(html.includes(escapeHTML(label)));
  assert.ok(html.includes('&lt;svg onload=&quot;icon&quot;&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=&quot;description&quot;&gt;'));
  assert.ok(html.includes('Danh mục &quot;x&quot;'));
  assert.ok(html.includes('Ví &#39;chính&#39; &amp; phụ'));
});

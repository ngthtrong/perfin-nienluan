const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  parseCsv,
  planFinanceCsvImport,
  assertValidPlan,
  replaceTransactions,
} = require('../scripts/lib/financeCsvImport');

const HEADERS = 'Title,Budget,Cost,Date,Ex/In,Special,Type Expenses,Type In come';

test('CSV parser supports BOM, quoted commas, escaped quotes, and embedded newlines', () => {
  const records = parseCsv(`\uFEFF${HEADERS}\r\n"cà phê, sữa",-40000,"₫40,000",15/07/2026,Expenses,,Coffee,\r\n"ghi ""chú""\n2",100000,"₫100,000",16/07/2026,In-come,,,Salary\r\n`);
  assert.equal(records.length, 3);
  assert.equal(records[1][0], 'cà phê, sữa');
  assert.equal(records[2][0], 'ghi "chú"\n2');
});

test('planner keeps exact matches by default because the source has no event id or time', () => {
  const csv = `${HEADERS}\n`
    + `" cà phê,  sữa ",-40000,"₫40,000",15/07/2026,Expenses,Monthly,Coffee,\n`
    + `" cà phê,  sữa ",-40000,"₫40,000",15/07/2026,Expenses,Monthly,Coffee,\n`
    + `Lương,100000,"₫100,000",16/07/2026,In-come,,,Salary\n`;
  const mapping = {
    wallet: 'Tiền mặt',
    expense: { Coffee: 'Ăn uống' },
    income: { Salary: 'Lương' },
  };
  const plan = planFinanceCsvImport(csv, mapping, { fileName: 'sample.csv' });

  assert.deepEqual(plan.errors, []);
  assert.equal(plan.source.raw_rows, 3);
  assert.equal(plan.summary.import_rows, 3);
  assert.equal(plan.summary.duplicate_rows_dropped, 0);
  assert.deepEqual(plan.summary.totals, { income: 100000, expense: 80000, net: 20000 });
  assert.equal(plan.rows[0].description, 'cà phê, sữa');
  assert.equal(plan.rows[0].amount, 40000);
  assert.equal(plan.rows[0].transaction_date, '2026-07-15');
  assert.equal(plan.rows[0].categoryName, 'Ăn uống');
  assert.deepEqual(plan.rows[0].ai_parsed.import, {
    dataset: 'sample.csv',
    source_row: 2,
    legacy_category: 'Coffee',
    special: 'Monthly',
  });
});

test('planner can drop exact matches only when explicitly requested', () => {
  const csv = `${HEADERS}\n`
    + `Cơm,-40000,"₫40,000",15/07/2026,Expenses,,AC,\n`
    + `Cơm,-40000,"₫40,000",15/07/2026,Expenses,,AC,\n`;
  const mapping = { expense: { AC: 'Ăn uống' }, income: {} };
  const plan = planFinanceCsvImport(csv, mapping, { dropExactDuplicates: true });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.summary.import_rows, 1);
  assert.equal(plan.summary.duplicate_rows_dropped, 1);
  assert.equal(plan.summary.totals.expense, 40000);
});

test('planner rejects sign, redundant amount, date, and mapping inconsistencies', () => {
  const csv = `${HEADERS}\n`
    + `Sai dấu,1000,"₫2,000",31/02/2026,Expenses,,Unknown,\n`;
  const plan = planFinanceCsvImport(csv, { expense: {}, income: {} });

  assert.ok(plan.errors.some((error) => error.field === 'Cost'));
  assert.ok(plan.errors.some((error) => error.field === 'Date'));
  assert.ok(plan.errors.some((error) => error.message.includes('Expense phải có Budget âm')));
  assert.ok(plan.errors.some((error) => error.message.includes('Chưa ánh xạ')));
  assert.throws(() => assertValidPlan(plan), (error) => error.code === 'IMPORT_VALIDATION_FAILED');
});

test('repository dataFinance.csv has the reviewed, reproducible dry-run profile', () => {
  const dataDir = path.resolve(__dirname, '../../data');
  const csv = fs.readFileSync(path.join(dataDir, 'dataFinance.csv'), 'utf8');
  const mapping = JSON.parse(fs.readFileSync(path.join(dataDir, 'dataFinance.category-map.json'), 'utf8'));
  const plan = planFinanceCsvImport(csv, mapping);

  assert.deepEqual(plan.errors, []);
  assert.equal(plan.source.raw_rows, 5265);
  assert.equal(plan.summary.import_rows, 5265);
  assert.equal(plan.summary.duplicate_groups, 23);
  assert.equal(plan.summary.duplicate_rows_dropped, 0);
  assert.deepEqual(plan.summary.type_counts, { expense: 4845, income: 420 });
  assert.deepEqual(plan.summary.totals, {
    income: 393770659,
    expense: 393176659,
    net: 594000,
  });
  assert.equal(plan.summary.date_min, '2022-01-01');
  assert.equal(plan.summary.date_max, '2026-07-15');
  assert.equal(plan.summary.amount.max, 48000000);
});

test('media fixture manifest checksums match repository files', () => {
  const dataDir = path.resolve(__dirname, '../../data');
  const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'media-fixtures.json'), 'utf8'));
  assert.equal(manifest.fixtures.length, 3);
  for (const fixture of manifest.fixtures) {
    const bytes = fs.readFileSync(path.join(dataDir, fixture.file));
    const checksum = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(checksum, fixture.sha256, fixture.file);
    assert.equal(fixture.privacy.safe_for_public_distribution, false);
    assert.equal(fixture.smoke_test.status, 'PASS');
    assert.equal(fixture.smoke_test.accuracy_claim, false);
  }
});

function validReplacementPlan() {
  return {
    errors: [],
    rows: [
      {
        description: 'Cơm', amount: 20000, type: 'expense', categoryName: 'Ăn uống',
        transaction_date: '2026-07-15', original_text: 'Cơm', ai_parsed: { import: { source_row: 2 } },
      },
      {
        description: 'Lương', amount: 100000, type: 'income', categoryName: 'Lương',
        transaction_date: '2026-07-16', original_text: 'Lương', ai_parsed: { import: { source_row: 3 } },
      },
    ],
    summary: { totals: { income: 100000, expense: 20000, net: 80000 } },
  };
}

function replacementClient({ reconciliationMatches = true } = {}) {
  const events = [];
  return {
    events,
    async query(sql, params) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      events.push({ sql: normalized, params });
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) return { rows: [], rowCount: 0 };
      if (normalized.startsWith('SET LOCAL lock_timeout')) return { rows: [], rowCount: 0 };
      if (normalized.startsWith('SELECT pg_advisory_xact_lock')) return { rows: [{}], rowCount: 1 };
      if (normalized.startsWith('LOCK TABLE transactions')) return { rows: [], rowCount: 0 };
      if (normalized.startsWith('SELECT user_key FROM users')) return { rows: [{ user_key: 'default_user' }], rowCount: 1 };
      if (normalized.startsWith('SELECT id, name, type, user_id')) {
        return {
          rows: [
            { id: 1, name: 'Ăn uống', type: 'expense', user_id: 'default_user', is_default: true },
            { id: 2, name: 'Lương', type: 'income', user_id: 'default_user', is_default: true },
          ],
          rowCount: 2,
        };
      }
      if (normalized.startsWith('SELECT id, name, balance FROM wallets')) {
        return { rows: [{ id: 7, name: 'Tiền mặt', balance: '50000' }], rowCount: 1 };
      }
      if (normalized.startsWith('SELECT wallet_id, COUNT(*)')) {
        return { rows: [{ wallet_id: 7, total_count: 2, active_count: 1, active_net: '30000' }], rowCount: 1 };
      }
      if (normalized.startsWith('UPDATE wallets')) return { rows: [], rowCount: 1 };
      if (normalized.startsWith('DELETE FROM transactions')) return { rows: [], rowCount: 2 };
      if (normalized.startsWith('INSERT INTO transactions')) {
        const batch = JSON.parse(params[1]);
        assert.deepEqual(batch.map((row) => row.category_id), [1, 2]);
        return { rows: [], rowCount: batch.length };
      }
      if (normalized.startsWith('SELECT COUNT(*)::integer AS row_count')) {
        return {
          rows: [reconciliationMatches
            ? { row_count: 2, income: '100000', expense: '20000', net: '80000' }
            : { row_count: 1, income: '100000', expense: '0', net: '100000' }],
          rowCount: 1,
        };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
  };
}

test('replacement uses one transaction and reconciles rows and money before commit', async () => {
  const client = replacementClient();
  const result = await replaceTransactions(client, validReplacementPlan(), { batchSize: 100 });

  assert.equal(result.deleted_rows, 2);
  assert.equal(result.inserted_rows, 2);
  assert.deepEqual(result.reconciliation, { row_count: 2, income: 100000, expense: 20000, net: 80000 });
  assert.equal(client.events[0].sql, 'BEGIN');
  assert.equal(client.events.at(-1).sql, 'COMMIT');
  assert.ok(client.events.some((event) => event.sql.startsWith('SELECT pg_advisory_xact_lock')));
  assert.ok(client.events.some((event) => event.sql.startsWith('LOCK TABLE transactions')));
  assert.ok(client.events.findIndex((event) => event.sql.startsWith('DELETE FROM transactions'))
    < client.events.findIndex((event) => event.sql.startsWith('INSERT INTO transactions')));
});

test('replacement rolls back when final reconciliation differs', async () => {
  const client = replacementClient({ reconciliationMatches: false });
  await assert.rejects(
    replaceTransactions(client, validReplacementPlan()),
    (error) => error.code === 'IMPORT_FINAL_RECONCILIATION_FAILED'
  );
  assert.equal(client.events.at(-1).sql, 'ROLLBACK');
  assert.ok(!client.events.some((event) => event.sql === 'COMMIT'));
});

const crypto = require('crypto');

const REQUIRED_HEADERS = [
  'Title',
  'Budget',
  'Cost',
  'Date',
  'Ex/In',
  'Special',
  'Type Expenses',
  'Type In come',
];

function parseCsv(text) {
  const input = String(text || '').replace(/^\uFEFF/, '');
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error('CSV có trường được trích dẫn nhưng chưa đóng dấu ngoặc kép');
  if (field.length || record.length) {
    record.push(field);
    records.push(record);
  }
  while (records.length && records.at(-1).every((value) => value === '')) records.pop();
  return records;
}

function normalizeDescription(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/\s+/gu, ' ')
    .trim();
}

function parseDate(value) {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseBudget(value) {
  const normalized = String(value || '').trim();
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseCost(value) {
  const normalized = String(value || '').trim();
  if (!normalized || !/^[₫\s\d,.]+$/u.test(normalized)) return null;
  const digits = normalized.replace(/\D/g, '');
  if (!digits) return null;
  const number = Number(digits);
  return Number.isSafeInteger(number) ? number : null;
}

function quantile(sortedValues, probability) {
  if (!sortedValues.length) return null;
  return sortedValues[Math.round((sortedValues.length - 1) * probability)];
}

function countBy(values, keySelector) {
  const counts = {};
  for (const value of values) {
    const key = String(keySelector(value));
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, 'vi')));
}

function rowError(errors, row, field, message) {
  errors.push({ row, field, message });
}

function planFinanceCsvImport(csvText, mapping, {
  fileName = 'dataFinance.csv',
  dropExactDuplicates = false,
} = {}) {
  const parsed = parseCsv(csvText);
  const headers = parsed[0] || [];
  const errors = [];
  const warnings = [];
  const sourceSha256 = crypto.createHash('sha256').update(csvText).digest('hex');

  if (JSON.stringify(headers) !== JSON.stringify(REQUIRED_HEADERS)) {
    errors.push({
      row: 1,
      field: 'headers',
      message: `Schema CSV không khớp. Cần đúng thứ tự: ${REQUIRED_HEADERS.join(', ')}`,
    });
  }
  if (mapping?.source_sha256 && mapping.source_sha256 !== sourceSha256) {
    errors.push({
      row: null,
      field: 'source_sha256',
      message: 'Checksum CSV khác mapping đã được duyệt; cần lập hồ sơ và cập nhật mapping trước khi import',
    });
  }

  const rawRows = parsed.slice(1).map((fields, index) => ({
    logicalRow: index + 2,
    fields,
    values: Object.fromEntries(REQUIRED_HEADERS.map((header, fieldIndex) => [header, fields[fieldIndex] ?? ''])),
  }));
  const nullCounts = Object.fromEntries(REQUIRED_HEADERS.map((header) => [
    header,
    rawRows.filter((row) => !String(row.values[header] || '').trim()).length,
  ]));

  const exactSeen = new Map();
  const duplicateGroups = new Map();
  for (const row of rawRows) {
    const key = JSON.stringify(row.fields);
    if (!exactSeen.has(key)) exactSeen.set(key, row.logicalRow);
    else {
      if (!duplicateGroups.has(key)) duplicateGroups.set(key, [exactSeen.get(key)]);
      duplicateGroups.get(key).push(row.logicalRow);
    }
  }
  const duplicateRows = [...duplicateGroups.values()].reduce((total, rows) => total + rows.length - 1, 0);
  if (duplicateRows) {
    warnings.push({
      code: 'EXACT_DUPLICATES',
      message: `${duplicateRows} dòng trùng hoàn toàn trong ${duplicateGroups.size} nhóm; ${dropExactDuplicates ? 'loại bản sao theo tùy chọn và giữ dòng đầu' : 'mặc định giữ nguyên vì nguồn không có ID/giờ để kết luận trùng'}`,
    });
  }

  const importRows = [];
  const categoryCrosswalk = [];
  const categoryCounts = new Map();
  let descriptionsNormalized = 0;
  const importSeen = new Set();

  for (const row of rawRows) {
    const { values, logicalRow } = row;
    const exactKey = JSON.stringify(row.fields);
    if (dropExactDuplicates && importSeen.has(exactKey)) continue;
    importSeen.add(exactKey);
    const errorCountBeforeRow = errors.length;

    if (row.fields.length !== REQUIRED_HEADERS.length) {
      rowError(errors, logicalRow, 'row', `Cần ${REQUIRED_HEADERS.length} cột nhưng nhận ${row.fields.length}`);
      continue;
    }

    const rawTitle = values.Title;
    const description = normalizeDescription(rawTitle);
    const budget = parseBudget(values.Budget);
    const cost = parseCost(values.Cost);
    const transactionDate = parseDate(values.Date);
    const rawDirection = String(values['Ex/In'] || '').trim();
    const type = rawDirection === 'Expenses' ? 'expense' : rawDirection === 'In-come' ? 'income' : null;
    const special = String(values.Special || '').trim() || null;

    if (!description) rowError(errors, logicalRow, 'Title', 'Mô tả giao dịch bị rỗng');
    if (description.length > 200) rowError(errors, logicalRow, 'Title', 'Mô tả vượt quá VARCHAR(200)');
    if (description !== rawTitle) descriptionsNormalized += 1;
    if (budget == null || budget === 0) rowError(errors, logicalRow, 'Budget', 'Budget phải là số khác 0');
    if (cost == null || cost <= 0) rowError(errors, logicalRow, 'Cost', 'Cost phải là số tiền dương hợp lệ');
    if (budget != null && cost != null && Math.abs(budget) !== cost) {
      rowError(errors, logicalRow, 'Cost', 'Cost không bằng trị tuyệt đối của Budget');
    }
    if (!transactionDate) rowError(errors, logicalRow, 'Date', 'Ngày phải đúng định dạng DD/MM/YYYY và tồn tại');
    if (!type) rowError(errors, logicalRow, 'Ex/In', 'Chỉ chấp nhận Expenses hoặc In-come');
    if (type === 'expense' && budget != null && budget >= 0) rowError(errors, logicalRow, 'Budget', 'Expense phải có Budget âm');
    if (type === 'income' && budget != null && budget <= 0) rowError(errors, logicalRow, 'Budget', 'Income phải có Budget dương');

    const rawCategory = type === 'expense'
      ? String(values['Type Expenses'] || '').trim()
      : String(values['Type In come'] || '').trim();
    const oppositeCategory = type === 'expense'
      ? String(values['Type In come'] || '').trim()
      : String(values['Type Expenses'] || '').trim();
    if (type && oppositeCategory) rowError(errors, logicalRow, 'category', 'Cột danh mục trái loại giao dịch phải để trống');

    const targetCategory = type ? mapping?.[type]?.[rawCategory] : null;
    if (type && !targetCategory) {
      rowError(errors, logicalRow, 'category', `Chưa ánh xạ danh mục nguồn "${rawCategory || '(trống)'}" cho ${type}`);
    }

    if (errors.length > errorCountBeforeRow) continue;

    const amount = Math.abs(budget);
    const crosswalkKey = `${type}\u0000${rawCategory}\u0000${targetCategory}`;
    categoryCounts.set(crosswalkKey, (categoryCounts.get(crosswalkKey) || 0) + 1);
    importRows.push({
      description,
      amount,
      type,
      categoryName: targetCategory,
      transaction_date: transactionDate,
      source: 'manual',
      note: null,
      original_text: rawTitle,
      ai_parsed: {
        import: {
          dataset: fileName,
          source_row: logicalRow,
          legacy_category: rawCategory || null,
          special,
        },
      },
    });
  }

  for (const [key, count] of categoryCounts) {
    const [type, sourceCategory, targetCategory] = key.split('\u0000');
    categoryCrosswalk.push({ type, source_category: sourceCategory, target_category: targetCategory, count });
  }
  categoryCrosswalk.sort((left, right) => left.type.localeCompare(right.type)
    || left.source_category.localeCompare(right.source_category, 'vi'));

  const rawAmounts = rawRows.map((row) => parseBudget(row.values.Budget)).filter((value) => value != null).map(Math.abs).sort((a, b) => a - b);
  const q1 = quantile(rawAmounts, 0.25);
  const q3 = quantile(rawAmounts, 0.75);
  const iqrHigh = q1 == null || q3 == null ? null : q3 + 1.5 * (q3 - q1);
  const dateValues = rawRows.map((row) => parseDate(row.values.Date)).filter(Boolean).sort();
  const totals = importRows.reduce((result, row) => {
    result[row.type] += row.amount;
    result.net += row.type === 'income' ? row.amount : -row.amount;
    return result;
  }, { income: 0, expense: 0, net: 0 });

  if (nullCounts['Type Expenses']) {
    const blankExpenseCategoryCount = rawRows.filter((row) => row.values['Ex/In'] === 'Expenses'
      && !String(row.values['Type Expenses'] || '').trim()).length;
    if (blankExpenseCategoryCount) warnings.push({
      code: 'BLANK_SOURCE_CATEGORY',
      message: `${blankExpenseCategoryCount} giao dịch expense không có nhãn nguồn và được ánh xạ sang Khác`,
    });
  }
  if (iqrHigh != null) warnings.push({
    code: 'IQR_OUTLIERS',
    message: `${rawAmounts.filter((amount) => amount > iqrHigh).length} số tiền vượt ngưỡng IQR ${iqrHigh}; chỉ gắn cờ, không loại vì có các khoản học phí/vay hợp lý`,
  });

  return {
    source: {
      file: fileName,
      sha256: sourceSha256,
      headers,
      raw_rows: rawRows.length,
      null_counts: nullCounts,
    },
    options: { drop_exact_duplicates: dropExactDuplicates },
    summary: {
      import_rows: importRows.length,
      rejected_rows: new Set(errors.filter((error) => error.row != null).map((error) => error.row)).size,
      duplicate_groups: duplicateGroups.size,
      duplicate_rows_dropped: dropExactDuplicates ? duplicateRows : 0,
      descriptions_normalized: descriptionsNormalized,
      type_counts: countBy(importRows, (row) => row.type),
      totals,
      date_min: dateValues[0] || null,
      date_max: dateValues.at(-1) || null,
      year_counts: countBy(dateValues, (date) => date.slice(0, 4)),
      month_counts: countBy(dateValues, (date) => date.slice(0, 7)),
      amount: {
        min: rawAmounts[0] || null,
        q1,
        median: quantile(rawAmounts, 0.5),
        q3,
        max: rawAmounts.at(-1) || null,
        iqr_high: iqrHigh,
        iqr_outlier_count: iqrHigh == null ? 0 : rawAmounts.filter((amount) => amount > iqrHigh).length,
      },
    },
    category_crosswalk: categoryCrosswalk,
    duplicate_examples: [...duplicateGroups.values()].slice(0, 10),
    warnings,
    errors,
    rows: importRows,
  };
}

function assertValidPlan(plan) {
  if (!plan || !Array.isArray(plan.rows)) throw new Error('Kế hoạch import không hợp lệ');
  if (plan.errors.length) {
    const error = new Error(`Không thể import: ${plan.errors.length} lỗi validation`);
    error.code = 'IMPORT_VALIDATION_FAILED';
    error.details = plan.errors;
    throw error;
  }
  if (!plan.rows.length) {
    const error = new Error('Không thể import tập dữ liệu rỗng');
    error.code = 'EMPTY_IMPORT';
    throw error;
  }
}

function sameMoney(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.005;
}

async function replaceTransactions(client, plan, {
  userId = 'default_user',
  walletName = 'Tiền mặt',
  batchSize = 500,
} = {}) {
  assertValidPlan(plan);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 2000) throw new Error('batchSize phải từ 1 đến 2000');

  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`perfin:finance-import:${userId}`]);
    // Application writes do not take the advisory lock. A short-timeout table
    // lock prevents transactions created during the replacement window from
    // escaping the old/new balance reconciliation.
    await client.query('LOCK TABLE transactions IN SHARE ROW EXCLUSIVE MODE');

    const userResult = await client.query('SELECT user_key FROM users WHERE user_key = $1', [userId]);
    if (!userResult.rowCount) {
      const error = new Error(`Không tìm thấy user ${userId}; hãy chạy migrations trước`);
      error.code = 'IMPORT_USER_NOT_FOUND';
      throw error;
    }

    const categoriesResult = await client.query(
      `SELECT id, name, type, user_id, is_default
       FROM categories
       WHERE user_id = $1 OR is_default = true
       ORDER BY CASE WHEN user_id = $1 THEN 0 ELSE 1 END, id ASC`,
      [userId]
    );
    const categoryIds = new Map();
    for (const category of categoriesResult.rows) {
      const key = `${category.type}\u0000${category.name}`;
      if (!categoryIds.has(key)) categoryIds.set(key, category.id);
    }
    const requiredCategories = new Set(plan.rows.map((row) => `${row.type}\u0000${row.categoryName}`));
    const missingCategories = [...requiredCategories].filter((key) => !categoryIds.has(key));
    if (missingCategories.length) {
      const error = new Error(`Thiếu danh mục đích: ${missingCategories.map((key) => key.replace('\u0000', '/')).join(', ')}`);
      error.code = 'IMPORT_CATEGORY_NOT_FOUND';
      throw error;
    }

    const walletResult = await client.query(
      `SELECT id, name, balance, currency
       FROM wallets
       WHERE user_id = $1
       ORDER BY id ASC
       FOR UPDATE`,
      [userId]
    );
    const matchingWallets = walletResult.rows.filter((wallet) => wallet.name === walletName);
    if (matchingWallets.length !== 1) {
      const error = new Error(`Không tìm thấy duy nhất ví "${walletName}" của ${userId}`);
      error.code = 'IMPORT_WALLET_NOT_FOUND';
      throw error;
    }
    const targetWallet = matchingWallets[0];
    if (String(targetWallet.currency || '').toUpperCase() !== 'VND') {
      const error = new Error(`Ví đích "${walletName}" không dùng VND; import ledger hiện chỉ hỗ trợ VND`);
      error.code = 'UNSUPPORTED_IMPORT_CURRENCY';
      throw error;
    }

    const oldResult = await client.query(
      `SELECT wallet_id,
              COUNT(*)::integer AS total_count,
              COUNT(*) FILTER (WHERE deleted_at IS NULL)::integer AS active_count,
              COALESCE(SUM(CASE WHEN deleted_at IS NULL
                THEN CASE WHEN type = 'income' THEN amount ELSE -amount END
                ELSE 0 END), 0) AS active_net
       FROM transactions
       WHERE user_id = $1
       GROUP BY wallet_id`,
      [userId]
    );
    const oldTransactionCount = oldResult.rows.reduce((sum, row) => sum + Number(row.total_count), 0);

    // Remove only the balance contribution of active transactions. This preserves
    // initial balance, transfers, P&L, and any other non-transaction adjustment.
    for (const row of oldResult.rows) {
      const adjusted = await client.query(
        `UPDATE wallets
         SET balance = balance - $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [Number(row.active_net), row.wallet_id, userId]
      );
      if (adjusted.rowCount !== 1) {
        const error = new Error(`Giao dịch cũ tham chiếu ví ${row.wallet_id} không thuộc ${userId}`);
        error.code = 'IMPORT_WALLET_OWNERSHIP_MISMATCH';
        throw error;
      }
    }

    const deleted = await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
    if (deleted.rowCount !== oldTransactionCount) {
      const error = new Error(`Đối soát xóa thất bại: dự kiến ${oldTransactionCount}, thực tế ${deleted.rowCount}`);
      error.code = 'IMPORT_DELETE_RECONCILIATION_FAILED';
      throw error;
    }

    let insertedCount = 0;
    for (let offset = 0; offset < plan.rows.length; offset += batchSize) {
      const batch = plan.rows.slice(offset, offset + batchSize).map((row) => ({
        description: row.description,
        amount: row.amount,
        type: row.type,
        category_id: categoryIds.get(`${row.type}\u0000${row.categoryName}`),
        transaction_date: row.transaction_date,
        original_text: row.original_text,
        ai_parsed: row.ai_parsed,
      }));
      const inserted = await client.query(
        `INSERT INTO transactions
           (user_id, description, amount, type, category_id, wallet_id,
            transaction_date, source, note, original_text, ai_parsed)
         SELECT $1, item.description, item.amount, item.type::transaction_type,
                item.category_id, $3, item.transaction_date::date,
                'manual'::transaction_source, NULL, item.original_text, item.ai_parsed
         FROM jsonb_to_recordset($2::jsonb) AS item(
           description text, amount numeric, type text, category_id integer,
           transaction_date text, original_text text, ai_parsed jsonb
         )`,
        [userId, JSON.stringify(batch), targetWallet.id]
      );
      insertedCount += inserted.rowCount;
    }
    if (insertedCount !== plan.rows.length) {
      const error = new Error(`Đối soát insert thất bại: dự kiến ${plan.rows.length}, thực tế ${insertedCount}`);
      error.code = 'IMPORT_INSERT_RECONCILIATION_FAILED';
      throw error;
    }

    await client.query(
      `UPDATE wallets
       SET balance = balance + $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [plan.summary.totals.net, targetWallet.id, userId]
    );

    const reconciliationResult = await client.query(
      `SELECT COUNT(*)::integer AS row_count,
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense,
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );
    const actual = reconciliationResult.rows[0];
    const expected = plan.summary.totals;
    if (Number(actual.row_count) !== plan.rows.length
      || !sameMoney(actual.income, expected.income)
      || !sameMoney(actual.expense, expected.expense)
      || !sameMoney(actual.net, expected.net)) {
      const error = new Error('Đối soát sau import không khớp; toàn bộ thay đổi sẽ rollback');
      error.code = 'IMPORT_FINAL_RECONCILIATION_FAILED';
      error.expected = { row_count: plan.rows.length, ...expected };
      error.actual = actual;
      throw error;
    }

    await client.query('COMMIT');
    inTransaction = false;
    return {
      user_id: userId,
      wallet_id: targetWallet.id,
      wallet_name: targetWallet.name,
      deleted_rows: deleted.rowCount,
      inserted_rows: insertedCount,
      totals: expected,
      reconciliation: {
        row_count: Number(actual.row_count),
        income: Number(actual.income),
        expense: Number(actual.expense),
        net: Number(actual.net),
      },
    };
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK');
    throw error;
  }
}

function serializablePlan(plan) {
  return {
    source: plan.source,
    options: plan.options,
    summary: plan.summary,
    category_crosswalk: plan.category_crosswalk,
    duplicate_examples: plan.duplicate_examples,
    warnings: plan.warnings,
    errors: plan.errors,
  };
}

module.exports = {
  REQUIRED_HEADERS,
  parseCsv,
  normalizeDescription,
  parseDate,
  planFinanceCsvImport,
  assertValidPlan,
  replaceTransactions,
  serializablePlan,
};

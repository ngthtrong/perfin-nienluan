#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  planFinanceCsvImport,
  assertValidPlan,
  replaceTransactions,
  serializablePlan,
} = require('./lib/financeCsvImport');

const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../data');

function readOption(argv, name, fallback = null) {
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argv.indexOf(name);
  if (index >= 0 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return fallback;
}

function parseArguments(argv) {
  const apply = argv.includes('--apply');
  return {
    help: argv.includes('--help') || argv.includes('-h'),
    apply,
    dryRun: argv.includes('--dry-run') || !apply,
    replace: argv.includes('--replace'),
    json: argv.includes('--json'),
    dropExactDuplicates: argv.includes('--drop-exact-duplicates'),
    file: path.resolve(readOption(argv, '--file', path.join(DEFAULT_DATA_DIR, 'dataFinance.csv'))),
    mapping: path.resolve(readOption(argv, '--mapping', path.join(DEFAULT_DATA_DIR, 'dataFinance.category-map.json'))),
    userId: readOption(argv, '--user', 'default_user'),
    walletName: readOption(argv, '--wallet', null),
    confirmUser: readOption(argv, '--confirm-user', null),
    batchSize: Number(readOption(argv, '--batch-size', '500')),
  };
}

function usage() {
  return `PERFIN dataFinance.csv importer

Dry-run an toàn (mặc định, không kết nối DB):
  node scripts/import-finance-csv.js --dry-run
  node scripts/import-finance-csv.js --dry-run --json

Thay giao dịch demo sau khi review dry-run:
  node scripts/import-finance-csv.js --apply --replace --confirm-user default_user

Tùy chọn:
  --file PATH                    CSV nguồn
  --mapping PATH                 JSON ánh xạ taxonomy
  --user USER_KEY                Mặc định: default_user
  --wallet NAME                  Mặc định lấy từ mapping (Tiền mặt)
  --batch-size N                 1..2000, mặc định 500
  --drop-exact-duplicates        Chủ động loại dòng giống hoàn toàn; mặc định giữ
  --json                         In kết quả JSON máy đọc được

--apply chỉ chạy khi có đồng thời --replace và --confirm-user trùng --user.
Importer chỉ thay bảng transactions của user đã chọn; không xóa budgets/chat/media/recurring.
Các recurring bill được giữ nguyên và phải được rà soát sau khi thay lịch sử giao dịch.`;
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function printDryRun(plan, walletName) {
  const output = serializablePlan(plan);
  console.log('DRY-RUN — chưa kết nối hoặc ghi PostgreSQL');
  console.log(`Nguồn: ${output.source.file}`);
  console.log(`SHA-256: ${output.source.sha256}`);
  console.log(`Dòng nguồn: ${output.source.raw_rows}`);
  console.log(`Sẽ import: ${output.summary.import_rows}`);
  console.log(`Trùng bị loại: ${output.summary.duplicate_rows_dropped}`);
  console.log(`Lỗi validation: ${output.errors.length}`);
  console.log(`Khoảng thời gian: ${output.summary.date_min} → ${output.summary.date_max}`);
  console.log(`Thu: ${formatMoney(output.summary.totals.income)} VND`);
  console.log(`Chi: ${formatMoney(output.summary.totals.expense)} VND`);
  console.log(`Dòng tiền ròng: ${formatMoney(output.summary.totals.net)} VND`);
  console.log(`Ví đích khi apply: ${walletName}`);
  console.log('\nÁnh xạ danh mục:');
  for (const row of output.category_crosswalk) {
    console.log(`  ${row.type.padEnd(7)} ${(row.source_category || '(trống)').padEnd(16)} -> ${row.target_category} (${row.count})`);
  }
  if (output.warnings.length) {
    console.log('\nCảnh báo:');
    for (const warning of output.warnings) console.log(`  [${warning.code}] ${warning.message}`);
  }
  if (output.errors.length) {
    console.log('\nLỗi đầu tiên:');
    for (const error of output.errors.slice(0, 20)) {
      console.log(`  dòng ${error.row ?? '-'}, ${error.field}: ${error.message}`);
    }
  }
}

async function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) {
    console.log(usage());
    return { mode: 'help' };
  }
  if (options.apply && argv.includes('--dry-run')) throw new Error('Không dùng đồng thời --apply và --dry-run');
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 2000) {
    throw new Error('--batch-size phải là số nguyên từ 1 đến 2000');
  }

  const csvText = fs.readFileSync(options.file, 'utf8');
  const mapping = JSON.parse(fs.readFileSync(options.mapping, 'utf8'));
  const walletName = options.walletName || mapping.wallet || 'Tiền mặt';
  const plan = planFinanceCsvImport(csvText, mapping, {
    fileName: path.basename(options.file),
    dropExactDuplicates: options.dropExactDuplicates,
  });

  if (options.dryRun) {
    if (options.json) console.log(JSON.stringify(serializablePlan(plan), null, 2));
    else printDryRun(plan, walletName);
    if (plan.errors.length) process.exitCode = 1;
    return { mode: 'dry-run', plan };
  }

  assertValidPlan(plan);
  if (!options.replace) throw new Error('--apply cần --replace vì pipeline này thay toàn bộ transactions của user');
  if (options.confirmUser !== options.userId) {
    throw new Error(`Cần --confirm-user ${options.userId} để xác nhận phạm vi xóa/thay dữ liệu`);
  }

  // DB and cache modules are loaded only after every file-level validation and
  // destructive-action guard passes. Therefore the default dry-run is offline.
  const { pool } = require('../config/database');
  const KVStore = require('../services/store/kv.store');
  const client = await pool.connect();
  try {
    const recurring = await client.query(
      `SELECT COUNT(*)::integer AS count
       FROM recurring_bills
       WHERE user_id = $1`,
      [options.userId]
    );
    const result = await replaceTransactions(client, plan, {
      userId: options.userId,
      walletName,
      batchSize: options.batchSize,
    });
    result.recurring_bills_preserved = Number(recurring.rows[0]?.count || 0);
    await Promise.all([
      KVStore.del(`cache:wallets:${options.userId}`),
      KVStore.del(`cache:insights:${options.userId}`),
    ]);
    if (options.json) console.log(JSON.stringify({ success: true, result }, null, 2));
    else {
      console.log('IMPORT COMMITTED');
      console.log(`Đã xóa ${result.deleted_rows} và chèn ${result.inserted_rows} giao dịch.`);
      console.log(`Đối soát net: ${formatMoney(result.reconciliation.net)} VND.`);
      if (result.recurring_bills_preserved > 0) {
        console.log(`CẢNH BÁO: Đã giữ nguyên ${result.recurring_bills_preserved} recurring bill; hãy rà soát/tạm dừng các gợi ý không còn khớp lịch sử mới.`);
      }
    }
    return { mode: 'apply', result };
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`${error.code ? `[${error.code}] ` : ''}${error.message}`);
    if (error.details) console.error(JSON.stringify(error.details.slice(0, 20), null, 2));
    process.exitCode = 1;
  });
}

module.exports = { parseArguments, usage, run };

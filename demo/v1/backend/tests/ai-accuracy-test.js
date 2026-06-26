/**
 * ai-accuracy-test.js — Kiểm tra độ chính xác AI cho PERFIN MVP
 *
 * Sử dụng:
 *   node tests/ai-accuracy-test.js
 *   npm run test:ai
 *
 * Output: kết quả từng câu test + tổng accuracy %
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const AIService = require('../services/ai.service');
const CategoryModel = require('../models/category.model');
const { pool } = require('../config/database');

/* ────────── bộ test cases ────────── */
const TEST_CASES = [
  // Ăn uống
  { input: 'ăn phở 50k',                   expected: { type: 'expense', amount: 50000,   category: 'Ăn uống' } },
  { input: 'cà phê sáng 30 nghìn',          expected: { type: 'expense', amount: 30000,   category: 'Ăn uống' } },
  { input: 'bún bò 45k',                    expected: { type: 'expense', amount: 45000,   category: 'Ăn uống' } },
  { input: 'ăn trưa với đồng nghiệp 150k',  expected: { type: 'expense', amount: 150000,  category: 'Ăn uống' } },
  { input: 'trà sữa 55 nghìn',              expected: { type: 'expense', amount: 55000,   category: 'Ăn uống' } },
  { input: 'uống cà phê hết 35k',           expected: { type: 'expense', amount: 35000,   category: 'Ăn uống' } },

  // Di chuyển
  { input: 'đi grab 35k',                   expected: { type: 'expense', amount: 35000,   category: 'Di chuyển' } },
  { input: 'đổ xăng 200 nghìn',             expected: { type: 'expense', amount: 200000,  category: 'Di chuyển' } },
  { input: 'gửi xe 5k',                     expected: { type: 'expense', amount: 5000,    category: 'Di chuyển' } },
  { input: 'vé xe buýt 7 nghìn',            expected: { type: 'expense', amount: 7000,    category: 'Di chuyển' } },
  { input: 'taxi 80k',                      expected: { type: 'expense', amount: 80000,   category: 'Di chuyển' } },

  // Mua sắm
  { input: 'mua áo 300k',                   expected: { type: 'expense', amount: 300000,  category: 'Mua sắm' } },
  { input: 'shopping 1 triệu 5',            expected: { type: 'expense', amount: 1500000, category: 'Mua sắm' } },
  { input: 'mua giày 800k',                 expected: { type: 'expense', amount: 800000,  category: 'Mua sắm' } },
  { input: 'mua quần jeans 450 nghìn',      expected: { type: 'expense', amount: 450000,  category: 'Mua sắm' } },

  // Giải trí
  { input: 'xem phim 150k',                 expected: { type: 'expense', amount: 150000,  category: 'Giải trí' } },
  { input: 'karaoke 500 nghìn',             expected: { type: 'expense', amount: 500000,  category: 'Giải trí' } },

  // Nhà cửa
  { input: 'tiền nhà 3tr5',                 expected: { type: 'expense', amount: 3500000, category: 'Nhà cửa' } },
  { input: 'tiền trọ tháng 6 2 triệu',      expected: { type: 'expense', amount: 2000000, category: 'Nhà cửa' } },

  // Hóa đơn
  { input: 'tiền điện 400k',                expected: { type: 'expense', amount: 400000,  category: 'Hóa đơn & Dịch vụ' } },
  { input: 'tiền nước 80 nghìn',            expected: { type: 'expense', amount: 80000,   category: 'Hóa đơn & Dịch vụ' } },
  { input: 'internet 200k',                 expected: { type: 'expense', amount: 200000,  category: 'Hóa đơn & Dịch vụ' } },
  { input: 'tiền điện thoại 150k',          expected: { type: 'expense', amount: 150000,  category: 'Hóa đơn & Dịch vụ' } },

  // Sức khỏe
  { input: 'khám bệnh 300k',                expected: { type: 'expense', amount: 300000,  category: 'Sức khỏe' } },
  { input: 'mua thuốc 120 nghìn',           expected: { type: 'expense', amount: 120000,  category: 'Sức khỏe' } },

  // Thu nhập
  { input: 'nhận lương 15 triệu',           expected: { type: 'income',  amount: 15000000, category: 'Lương' } },
  { input: 'thưởng dự án 5tr',              expected: { type: 'income',  amount: 5000000,  category: 'Thưởng' } },
  { input: 'freelance 3 triệu',             expected: { type: 'income',  amount: 3000000,  category: null } }, // category linh hoạt

  // Edge cases
  { input: '50k x 2 ly cà phê',             expected: { type: 'expense', amount: 100000,  category: 'Ăn uống' } },
  { input: 'mua 3 cái áo mỗi cái 200k',     expected: { type: 'expense', amount: 600000,  category: 'Mua sắm' } },
  { input: 'đi ăn hết 250k cho 2 người',    expected: { type: 'expense', amount: 250000,  category: 'Ăn uống' } },
];

/* ────────── so sánh kết quả ────────── */
function evaluate(actual, expected) {
  if (!actual || !actual.transaction) return 'FAIL';
  const tx = actual.transaction;

  const amountMatch = Math.abs(Number(tx.amount) - expected.amount) < 1;
  const typeMatch   = tx.type === expected.type;
  const categoryOk  = !expected.category ||
    (tx.category_name && tx.category_name.toLowerCase().includes(expected.category.toLowerCase().split(' ')[0].toLowerCase()));

  if (amountMatch && typeMatch && categoryOk) return 'PASS';
  if (amountMatch && typeMatch)               return 'PARTIAL'; // amount + type đúng, category sai
  return 'FAIL';
}

const STATUS_ICON = { PASS: '✅', PARTIAL: '⚠️ ', FAIL: '❌' };

/* ────────── main ────────── */
async function run() {
  console.log('='.repeat(60));
  console.log('  PERFIN AI Accuracy Test — ' + new Date().toLocaleString('vi-VN'));
  console.log('='.repeat(60));

  let categories = [];
  try {
    categories = await CategoryModel.getAll();
    console.log(`📦 Loaded ${categories.length} categories from DB\n`);
  } catch (err) {
    console.warn(`⚠️  Không kết nối được DB: ${err.message}. Chạy với categories rỗng.\n`);
  }

  const results = [];
  let pass = 0;
  let partial = 0;
  let fail = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    const start = Date.now();
    let actual = null;
    let error = null;

    try {
      actual = await AIService.parseTransaction(tc.input, categories);
    } catch (err) {
      error = err.message;
    }

    const elapsed = Date.now() - start;
    const status = error ? 'FAIL' : evaluate(actual, tc.expected);

    if (status === 'PASS')    pass++;
    else if (status === 'PARTIAL') partial++;
    else fail++;

    const tx = actual?.transaction;
    const actualStr = tx
      ? `${tx.type}, ${tx.amount}, ${tx.category_name || '?'}`
      : (error || 'no transaction');
    const expectedStr = `${tc.expected.type}, ${tc.expected.amount}, ${tc.expected.category || 'any'}`;

    console.log(`${STATUS_ICON[status]} [${String(i + 1).padStart(2, '0')}] "${tc.input}"`);
    console.log(`     Expected : ${expectedStr}`);
    console.log(`     Actual   : ${actualStr} (${elapsed}ms, via ${actual?.provider_used || 'error'})`);
    if (error) console.log(`     Error    : ${error}`);
    console.log();

    results.push({ input: tc.input, expected: tc.expected, actual: tx, status, elapsed });
  }

  /* ────────── tổng kết ────────── */
  const total = TEST_CASES.length;
  const accuracy = Math.round((pass / total) * 100);
  const accuracyWithPartial = Math.round(((pass + partial * 0.5) / total) * 100);

  console.log('='.repeat(60));
  console.log('TỔNG KẾT:');
  console.log(`  ✅ PASS    : ${pass}/${total}`);
  console.log(`  ⚠️  PARTIAL : ${partial}/${total}`);
  console.log(`  ❌ FAIL    : ${fail}/${total}`);
  console.log(`  Accuracy  : ${accuracy}% (strict) | ${accuracyWithPartial}% (partial credit)`);
  console.log(`  Target    : > 80% — ${accuracy >= 80 ? '✅ ĐẠT' : '❌ CHƯA ĐẠT'}`);
  console.log('='.repeat(60));

  if (fail > 0) {
    console.log('\n❌ Các câu bị sai hoàn toàn:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => {
      console.log(`  - "${r.input}" → expected amount ${r.expected.amount}, got ${r.actual?.amount || 'null'}`);
    });
  }

  if (partial > 0) {
    console.log('\n⚠️  Các câu đúng amount nhưng sai category:');
    results.filter((r) => r.status === 'PARTIAL').forEach((r) => {
      console.log(`  - "${r.input}" → expected ${r.expected.category}, got ${r.actual?.category_name || 'null'}`);
    });
  }
}

run()
  .catch((err) => { console.error('Test runner error:', err); process.exit(1); })
  .finally(() => pool.end().catch(() => {}));

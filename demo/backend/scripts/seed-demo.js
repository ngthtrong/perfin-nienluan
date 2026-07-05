/**
 * seed-demo.js — Tạo dữ liệu demo cho PERFIN MVP
 *
 * Sử dụng:
 *   node scripts/seed-demo.js
 *   node scripts/seed-demo.js --clear   (xoá dữ liệu demo cũ trước)
 *   npm run seed:demo
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../config/database');

const DEFAULT_USER = 'default_user';
const CLEAR_FIRST = process.argv.includes('--clear');

/* ─────────────── helpers ─────────────── */
function rng(min, max) {
  return Math.round(min + Math.random() * (max - min));
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function toDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/* ─────────────── demo data config ─────────────── */
const FOOD_DESCRIPTIONS = ['Phở bò', 'Cơm gà', 'Bún chả', 'Cơm văn phòng', 'Bún bò Huế', 'Hủ tiếu', 'Cháo sườn', 'Bánh mì', 'Trà sữa', 'Cà phê sữa', 'Cơm tấm', 'Bột chiên'];
const TRANSPORT_DESCRIPTIONS = ['Grab xe máy', 'Grab ô tô', 'Đổ xăng xe', 'Gửi xe máy', 'Vé xe buýt', 'Taxi Vinasun'];
const SHOPPING_DESCRIPTIONS = ['Mua áo', 'Mua quần', 'Mua giày', 'Mua túi xách', 'Mua đồ dùng nhà bếp', 'Mua sách'];
const ENTERTAINMENT_DESCRIPTIONS = ['Xem phim rạp', 'Đi karaoke', 'Cà phê cùng bạn', 'Đặt phòng du lịch', 'Vé sự kiện'];
const HEALTH_DESCRIPTIONS = ['Khám bệnh tổng quát', 'Mua thuốc cảm', 'Khám nha khoa', 'Mua vitamin', 'Spa & massage'];
const BILLS_DESCRIPTIONS = ['Tiền điện', 'Tiền nước sinh hoạt', 'Internet cáp quang', 'Điện thoại di động', 'Netflix'];
const GROCERY_DESCRIPTIONS = ['Siêu thị BigC', 'WinMart', 'Chợ rau củ', 'Coopmart', 'Thực phẩm sạch'];
const EDUCATION_DESCRIPTIONS = ['Học phí khóa học online', 'Mua sách giáo khoa', 'Phí luyện thi', 'Học tiếng Anh'];

/* ─────────────── main seed logic ─────────────── */
async function loadCategories(client) {
  const res = await client.query(
    `SELECT id, name, type FROM categories WHERE user_id = $1 OR is_default = true ORDER BY sort_order ASC`,
    [DEFAULT_USER]
  );
  const map = {};
  for (const row of res.rows) {
    map[row.name] = row.id;
  }
  return map;
}

async function getWallet(client) {
  const res = await client.query(
    `SELECT id FROM wallets WHERE user_id = $1 AND is_default = true LIMIT 1`,
    [DEFAULT_USER]
  );
  return res.rows[0]?.id || null;
}

function buildTransactions(categories, walletId, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const txs = [];

  // Monthly salary (ngày 5)
  txs.push({
    description: 'Nhận lương tháng ' + month,
    amount: rng(12000000, 20000000),
    type: 'income',
    category_id: categories['Lương'],
    wallet_id: walletId,
    transaction_date: toDate(year, month, 5),
    source: 'manual',
    note: 'Lương cơ bản + phụ cấp',
  });

  // Random bonus (30% chance)
  if (Math.random() < 0.3) {
    txs.push({
      description: 'Thưởng dự án',
      amount: rng(2000000, 8000000),
      type: 'income',
      category_id: categories['Thưởng'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, rng(10, 25)),
      source: 'manual',
    });
  }

  // Monthly bills (ngày 1–5)
  const billData = [
    { desc: 'Tiền nhà tháng ' + month, amount: rng(2000000, 4000000), cat: 'Nhà cửa' },
    { desc: pick(BILLS_DESCRIPTIONS), amount: rng(200000, 500000), cat: 'Hóa đơn & Dịch vụ' },
    { desc: 'Tiền nước sinh hoạt', amount: rng(50000, 150000), cat: 'Hóa đơn & Dịch vụ' },
    { desc: 'Internet cáp quang', amount: rng(150000, 250000), cat: 'Hóa đơn & Dịch vụ' },
    { desc: 'Điện thoại di động', amount: rng(100000, 200000), cat: 'Hóa đơn & Dịch vụ' },
  ];
  for (const b of billData) {
    if (categories[b.cat]) {
      txs.push({
        description: b.desc,
        amount: b.amount,
        type: 'expense',
        category_id: categories[b.cat],
        wallet_id: walletId,
        transaction_date: toDate(year, month, rng(1, 5)),
        source: 'manual',
      });
    }
  }

  // Daily food (every day: 2–3 meals)
  for (let day = 1; day <= daysInMonth; day++) {
    // Sáng
    if (Math.random() < 0.7) {
      txs.push({
        description: pick(['Cà phê sáng', 'Bánh mì', 'Xôi sáng', 'Bún riêu']),
        amount: rng(20000, 55000),
        type: 'expense',
        category_id: categories['Ăn uống'],
        wallet_id: walletId,
        transaction_date: toDate(year, month, day),
        source: 'ai_chat',
        original_text: 'bữa sáng',
      });
    }
    // Trưa
    txs.push({
      description: pick(FOOD_DESCRIPTIONS),
      amount: rng(35000, 85000),
      type: 'expense',
      category_id: categories['Ăn uống'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, day),
      source: 'ai_chat',
    });
    // Tối (70% chance)
    if (Math.random() < 0.7) {
      txs.push({
        description: pick(FOOD_DESCRIPTIONS),
        amount: rng(40000, 110000),
        type: 'expense',
        category_id: categories['Ăn uống'],
        wallet_id: walletId,
        transaction_date: toDate(year, month, day),
        source: 'ai_chat',
      });
    }
  }

  // Transport (every 2–3 days)
  for (let day = 1; day <= daysInMonth; day += rng(1, 3)) {
    txs.push({
      description: pick(TRANSPORT_DESCRIPTIONS),
      amount: rng(15000, 85000),
      type: 'expense',
      category_id: categories['Di chuyển'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, Math.min(day, daysInMonth)),
      source: 'manual',
    });
  }
  // Đổ xăng 2 lần/tháng
  txs.push({
    description: 'Đổ xăng xe máy',
    amount: rng(100000, 250000),
    type: 'expense',
    category_id: categories['Di chuyển'],
    wallet_id: walletId,
    transaction_date: toDate(year, month, rng(8, 14)),
    source: 'manual',
  });
  txs.push({
    description: 'Đổ xăng xe máy',
    amount: rng(100000, 250000),
    type: 'expense',
    category_id: categories['Di chuyển'],
    wallet_id: walletId,
    transaction_date: toDate(year, month, rng(20, 28)),
    source: 'manual',
  });

  // Shopping (3–5 times/month)
  for (let i = 0; i < rng(3, 5); i++) {
    txs.push({
      description: pick(SHOPPING_DESCRIPTIONS),
      amount: rng(150000, 900000),
      type: 'expense',
      category_id: categories['Mua sắm'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, rng(1, daysInMonth)),
      source: 'manual',
    });
  }

  // Grocery (weekly)
  for (let week = 0; week < 4; week++) {
    txs.push({
      description: pick(GROCERY_DESCRIPTIONS),
      amount: rng(200000, 600000),
      type: 'expense',
      category_id: categories['Tạp hóa'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, Math.min(week * 7 + rng(1, 6), daysInMonth)),
      source: 'manual',
    });
  }

  // Entertainment (2–3 times/month)
  for (let i = 0; i < rng(2, 3); i++) {
    txs.push({
      description: pick(ENTERTAINMENT_DESCRIPTIONS),
      amount: rng(100000, 550000),
      type: 'expense',
      category_id: categories['Giải trí'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, rng(1, daysInMonth)),
      source: 'manual',
    });
  }

  // Health (1–2 times/month)
  for (let i = 0; i < rng(1, 2); i++) {
    txs.push({
      description: pick(HEALTH_DESCRIPTIONS),
      amount: rng(80000, 500000),
      type: 'expense',
      category_id: categories['Sức khỏe'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, rng(1, daysInMonth)),
      source: 'manual',
    });
  }

  // Education (occasional)
  if (Math.random() < 0.6) {
    txs.push({
      description: pick(EDUCATION_DESCRIPTIONS),
      amount: rng(300000, 2000000),
      type: 'expense',
      category_id: categories['Giáo dục'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, rng(1, daysInMonth)),
      source: 'manual',
    });
  }

  // Electronics (occasional)
  if (Math.random() < 0.4) {
    txs.push({
      description: pick(['Phụ kiện điện thoại', 'Tai nghe bluetooth', 'Sạc dự phòng', 'Cáp sạc']),
      amount: rng(100000, 1200000),
      type: 'expense',
      category_id: categories['Điện tử'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, rng(1, daysInMonth)),
      source: 'manual',
    });
  }

  // Sports (occasional)
  if (Math.random() < 0.5) {
    txs.push({
      description: pick(['Đăng ký gym tháng', 'Mua đồ thể thao', 'Vé bơi lội', 'Bóng đá bạn bè']),
      amount: rng(80000, 500000),
      type: 'expense',
      category_id: categories['Thể thao'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, rng(1, daysInMonth)),
      source: 'manual',
    });
  }

  // Beauty (occasional)
  if (Math.random() < 0.4) {
    txs.push({
      description: pick(['Cắt tóc', 'Mua mỹ phẩm', 'Làm nail', 'Chăm sóc da']),
      amount: rng(80000, 400000),
      type: 'expense',
      category_id: categories['Làm đẹp'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, rng(1, daysInMonth)),
      source: 'manual',
    });
  }

  // Freelance income (occasional)
  if (Math.random() < 0.3) {
    txs.push({
      description: 'Thu nhập freelance',
      amount: rng(1000000, 5000000),
      type: 'income',
      category_id: categories['Khác'] || categories['Lương'],
      wallet_id: walletId,
      transaction_date: toDate(year, month, rng(15, 28)),
      source: 'manual',
    });
  }

  return txs;
}

async function insertTransactions(client, txs) {
  let count = 0;
  for (const tx of txs) {
    if (!tx.category_id || !tx.wallet_id) continue;
    await client.query(
      `INSERT INTO transactions (user_id, description, amount, type, category_id, wallet_id, transaction_date, source, note, original_text)
       VALUES ($1, $2, $3, $4::transaction_type, $5, $6, $7, $8::transaction_source, $9, $10)`,
      [
        DEFAULT_USER,
        tx.description,
        tx.amount,
        tx.type,
        tx.category_id,
        tx.wallet_id,
        tx.transaction_date,
        tx.source || 'manual',
        tx.note || null,
        tx.original_text || null,
      ]
    );
    // Cập nhật balance ví
    const delta = tx.type === 'income' ? tx.amount : -tx.amount;
    await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [delta, tx.wallet_id]);
    count++;
  }
  return count;
}

async function upsertBudgets(client, categories, month, year) {
  const budgets = [
    { name: 'Ăn uống', amount: 3000000 },
    { name: 'Di chuyển', amount: 1000000 },
    { name: 'Giải trí', amount: 500000 },
    { name: 'Mua sắm', amount: 1500000 },
    { name: 'Hóa đơn & Dịch vụ', amount: 1000000 },
    { name: 'Sức khỏe', amount: 500000 },
  ];
  let count = 0;
  for (const b of budgets) {
    const catId = categories[b.name];
    if (!catId) continue;
    await client.query(
      `INSERT INTO budgets (user_id, category_id, amount_limit, month, year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, category_id, month, year) DO UPDATE SET amount_limit = EXCLUDED.amount_limit`,
      [DEFAULT_USER, catId, b.amount, month, year]
    );
    count++;
  }
  return count;
}

async function seed() {
  const client = await pool.connect();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    await client.query('BEGIN');

    if (CLEAR_FIRST) {
      console.log('🗑  Xoá dữ liệu demo cũ...');
      // Reset balance trước, sau đó xoá transactions
      await client.query(`UPDATE wallets SET balance = 0 WHERE user_id = $1`, [DEFAULT_USER]);
      await client.query(`DELETE FROM transactions WHERE user_id = $1`, [DEFAULT_USER]);
      await client.query(`DELETE FROM budgets WHERE user_id = $1`, [DEFAULT_USER]);
      await client.query(`DELETE FROM chat_messages WHERE user_id = $1`, [DEFAULT_USER]);
    }

    const categories = await loadCategories(client);
    const walletId = await getWallet(client);

    if (!walletId) {
      throw new Error('Không tìm thấy ví mặc định. Hãy chạy migrate trước: npm run migrate');
    }

    if (Object.keys(categories).length === 0) {
      throw new Error('Không tìm thấy danh mục. Hãy chạy migrate trước: npm run migrate');
    }

    console.log(`📦 Đã tải ${Object.keys(categories).length} danh mục`);
    console.log(`💳 Ví mặc định: ${walletId}`);

    // Seed 30 ngày giao dịch (tháng hiện tại)
    console.log(`\n📅 Đang tạo giao dịch tháng ${month}/${year}...`);
    const currentMonthTxs = buildTransactions(categories, walletId, year, month);
    const currentCount = await insertTransactions(client, currentMonthTxs);
    console.log(`  ✅ Tháng ${month}: ${currentCount} giao dịch`);

    // Seed thêm 2 tháng trước (cho trend chart)
    for (let i = 1; i <= 2; i++) {
      let prevMonth = month - i;
      let prevYear = year;
      if (prevMonth <= 0) {
        prevMonth += 12;
        prevYear -= 1;
      }
      console.log(`📅 Đang tạo giao dịch tháng ${prevMonth}/${prevYear}...`);
      const prevTxs = buildTransactions(categories, walletId, prevYear, prevMonth);
      const prevCount = await insertTransactions(client, prevTxs);
      console.log(`  ✅ Tháng ${prevMonth}: ${prevCount} giao dịch`);
    }

    // Tạo budgets tháng hiện tại
    console.log('\n💰 Đang tạo ngân sách...');
    const budgetCount = await upsertBudgets(client, categories, month, year);
    console.log(`  ✅ ${budgetCount} ngân sách được tạo`);

    await client.query('COMMIT');

    // Hiển thị số dư cuối
    const balanceResult = await pool.query(
      `SELECT SUM(balance) AS total FROM wallets WHERE user_id = $1`,
      [DEFAULT_USER]
    );
    const total = Number(balanceResult.rows[0]?.total || 0);
    const formatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total);

    console.log('\n✅ Seed demo data hoàn tất!');
    console.log(`💰 Số dư hiện tại: ${formatted}`);
    console.log('\nGợi ý kiểm tra:');
    console.log('  - Mở Dashboard → xem tổng thu/chi tháng này');
    console.log('  - Mở Báo cáo → xem biểu đồ pie chart & bar chart xu hướng 3 tháng');
    console.log('  - Mở Ngân sách → xem tiến độ chi tiêu (nên có 1–2 cái warning/exceeded)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed thất bại:', err.message);
    if (err.detail) console.error('   Chi tiết:', err.detail);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

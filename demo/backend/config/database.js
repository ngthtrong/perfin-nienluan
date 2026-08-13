// Vai trò: Quản lý pool kết nối PostgreSQL và cung cấp các helper truy vấn dùng chung.
// Luồng chính: đọc cấu hình môi trường, thực thi SQL và bảo đảm rollback/release khi có lỗi.

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'demodb',
  password: process.env.DB_PASSWORD || 'password',
  port: Number(process.env.DB_PORT || 5432),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[database] unexpected idle client error', err);
});

// Thực thi một câu SQL qua pool; caller chỉ cần truyền text và tham số hóa.
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Roll back an open transaction without losing the error that caused the failure.
 * A bare `await client.query('ROLLBACK')` inside a catch block replaces the
 * original error when the rollback itself fails (dead connection, closed pool),
 * which hides the real cause. The rollback failure is attached to the original
 * error for diagnostics instead.
 */
// Giữ lỗi nghiệp vụ gốc nếu rollback cũng gặp sự cố, đồng thời luôn release client.
async function rollbackAfterFailure(client, error) {
  try {
    await client.query('ROLLBACK');
  } catch (rollbackError) {
    if (error && typeof error === 'object') error.rollbackError = rollbackError;
  }
}

module.exports = { pool, query, rollbackAfterFailure };

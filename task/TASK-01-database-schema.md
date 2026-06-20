# TASK-01: Triển khai Database Schema & Seed Data

| Thuộc tính | Giá trị |
|---|---|
| **Task ID** | TASK-01 |
| **Phase** | 0 — Foundation |
| **Priority** | 🔴 Critical |
| **Status** | ✅ DONE |
| **Depends on** | — |
| **Blocked by** | — |

---

## Tổng quan

Triển khai database schema cho PERFIN MVP dựa trên file `doc/diagrams/perfin_schema.sql` đã thiết kế sẵn (14 tables, 25+ ENUMs). Tuy nhiên, **không deploy toàn bộ** mà chỉ chọn lọc các tables cần thiết cho MVP. Đồng thời tạo seed data mặc định (16 danh mục, ví tiền mặt) và xây dựng migration script có thể tái sử dụng.

**Schema gốc** có 14 tables, nhưng MVP chỉ cần 6 tables cốt lõi:
- `categories` — Danh mục phân loại (expense/income)
- `wallets` — Ví/tài khoản tiền
- `transactions` — Giao dịch thu chi
- `budgets` — Ngân sách theo danh mục
- `budget_history` — Lịch sử thay đổi ngân sách
- `chat_messages` — Lịch sử chat với AI

**Các tables bỏ qua cho MVP:** `ai_personalities`, `recurring_bills`, `export_histories`, `backup_configs`, `user_traits`, `investment_pl_records`, và các tables phụ khác.

---

## Điều kiện tiên quyết

- [x] PostgreSQL đã cài đặt và chạy trên local
- [x] File `doc/diagrams/perfin_schema.sql` đã tồn tại
- [x] Backend Express server đã kết nối được PostgreSQL (pool trong `index.js`)
- [ ] Đã có thông tin kết nối DB trong `.env` (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)

---

## Chi tiết các subtask

### 1.1 — Review và điều chỉnh perfin_schema.sql cho MVP
- [ ] Đọc kỹ toàn bộ file `doc/diagrams/perfin_schema.sql`
- [ ] Xác định các tables cần cho MVP: `categories`, `wallets`, `transactions`, `budgets`, `budget_history`, `chat_messages`
- [ ] Xác định các ENUMs cần thiết cho các tables trên
- [ ] Liệt kê các foreign keys và relationships giữa 6 tables
- [ ] Ghi chú lại các tables bị loại bỏ và lý do (để reference sau này khi mở rộng)
- [ ] Kiểm tra xem có cần thêm column nào không (ví dụ: `deleted_at` cho soft delete ở `transactions`)
- [ ] Đảm bảo `transactions` có trường `source` để phân biệt AI-parsed vs manual input

### 1.2 — Tạo file migration `backend/migrations/001_init_mvp_schema.sql`
- [ ] Tạo thư mục `backend/migrations/`
- [ ] Extract các CREATE TYPE (ENUMs) cần thiết từ schema gốc
- [ ] Extract các CREATE TABLE cho 6 tables MVP
- [ ] Đảm bảo thứ tự tạo table đúng dependency (categories trước transactions)
- [ ] Thêm indexes cho các columns hay query:
  - `transactions.category_id`
  - `transactions.wallet_id`
  - `transactions.transaction_date`
  - `transactions.type`
  - `transactions.deleted_at`
  - `budgets.category_id`
  - `budgets.month`, `budgets.year`
- [ ] Thêm `IF NOT EXISTS` cho tất cả CREATE statements (idempotent)
- [ ] Thêm header comment với version, date, description

### 1.3 — Tạo file seed data `backend/migrations/002_seed_default_data.sql`
- [ ] Seed 12 default expense categories:

| # | Tên | Icon | Type |
|---|---|---|---|
| 1 | Ăn uống | 🍜 | expense |
| 2 | Di chuyển | 🚗 | expense |
| 3 | Mua sắm | 🛍️ | expense |
| 4 | Giải trí | 🎮 | expense |
| 5 | Sức khỏe | 🏥 | expense |
| 6 | Giáo dục | 📚 | expense |
| 7 | Nhà cửa | 🏠 | expense |
| 8 | Hóa đơn & Dịch vụ | 📄 | expense |
| 9 | Tạp hóa | 🛒 | expense |
| 10 | Điện tử | 📱 | expense |
| 11 | Thể thao | ⚽ | expense |
| 12 | Làm đẹp | 💅 | expense |
| 13 | Khác | 📦 | expense |

- [ ] Seed 4 default income categories:

| # | Tên | Icon | Type |
|---|---|---|---|
| 1 | Lương | 💰 | income |
| 2 | Thưởng | 🎁 | income |
| 3 | Đầu tư | 📈 | income |
| 4 | Khác | 📦 | income |

- [ ] Seed default wallet: `Tiền mặt` (Cash), balance = 0, currency = VND
- [ ] Sử dụng `ON CONFLICT DO NOTHING` để tránh duplicate khi chạy lại
- [ ] Đánh dấu `is_default = true` cho các categories mặc định (không cho xóa/sửa tên)

### 1.4 — Viết script `backend/scripts/migrate.js`
- [ ] Tạo thư mục `backend/scripts/`
- [ ] Đọc tất cả files `.sql` trong `backend/migrations/` theo thứ tự alphabetical
- [ ] Kết nối PostgreSQL pool
- [ ] Chạy từng file migration trong transaction (BEGIN → execute → COMMIT, nếu lỗi → ROLLBACK)
- [ ] Log kết quả: ✅ file đã chạy thành công / ❌ file bị lỗi + error message
- [ ] Tạo bảng `_migrations` để track đã chạy file nào (tránh chạy lại)
- [ ] Hỗ trợ flag `--fresh` để drop all tables và chạy lại từ đầu (dev only)
- [ ] Hỗ trợ flag `--seed-only` để chỉ chạy seed files

### 1.5 — Test migration và seed trên PostgreSQL local
- [ ] Chạy `node scripts/migrate.js` lần đầu — verify tất cả tables được tạo
- [ ] Kiểm tra: `SELECT * FROM categories;` — phải có 16 rows (13 expense + 4 income, note: "Khác" có 2 cái)
- [ ] Kiểm tra: `SELECT * FROM wallets;` — phải có 1 row "Tiền mặt"
- [ ] Chạy lại migration lần 2 — verify không có lỗi (idempotent)
- [ ] Chạy `node scripts/migrate.js --fresh` — verify drop + recreate thành công
- [ ] Test insert 1 transaction thủ công qua psql — verify foreign keys hoạt động
- [ ] Test constraint violations (amount âm, category_id không tồn tại, etc.)

### 1.6 — Tạo file `backend/config/database.js`
- [ ] Extract PostgreSQL pool configuration từ `index.js` hiện tại
- [ ] Sử dụng biến môi trường: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- [ ] Thêm pool settings: `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 2000`
- [ ] Export `pool` object và helper function `query(text, params)`
- [ ] Thêm event listener cho pool errors
- [ ] Update `index.js` để import từ `config/database.js` thay vì inline pool

---

## Tiêu chí hoàn thành

- [ ] 6 tables MVP được tạo thành công trên PostgreSQL local
- [ ] 16 default categories được seed đúng (13 expense + 4 income, với đúng icon và type)
- [ ] 1 default wallet "Tiền mặt" được seed
- [ ] Migration script `migrate.js` chạy được, có tracking, idempotent
- [ ] Foreign keys và indexes hoạt động (verify bằng test insert)
- [ ] `backend/config/database.js` hoạt động, `index.js` dùng import mới
- [ ] Chạy `--fresh` reset toàn bộ DB thành công

---

## Ghi chú kỹ thuật

1. **Thứ tự tạo tables quan trọng:** `categories` → `wallets` → `transactions` (vì transactions FK tới cả categories và wallets) → `budgets` → `budget_history` → `chat_messages`

2. **Soft delete pattern:** Table `transactions` cần có column `deleted_at TIMESTAMP NULL`. Khi "xóa" giao dịch, set `deleted_at = NOW()` thay vì DELETE. Tất cả queries mặc định phải có `WHERE deleted_at IS NULL`.

3. **ENUMs cần thiết cho MVP:**
   - `transaction_type`: `'income'`, `'expense'`
   - `category_type`: `'income'`, `'expense'`
   - `wallet_type`: `'cash'`, `'bank'`, `'e_wallet'`, `'credit_card'`
   - `currency_code`: `'VND'`, `'USD'`
   - `transaction_source`: `'manual'`, `'ai_chat'`, `'ocr'`, `'voice'`

4. **Migration tracking table `_migrations`:**
   ```sql
   CREATE TABLE IF NOT EXISTS _migrations (
     id SERIAL PRIMARY KEY,
     filename VARCHAR(255) UNIQUE NOT NULL,
     executed_at TIMESTAMP DEFAULT NOW()
   );
   ```

5. **Về "Khác" category:** Có 2 category tên "Khác" — 1 cho expense, 1 cho income. Cả 2 đều là `is_default = true` và không thể rename/delete. Đây là fallback category khi AI không match được.

6. **File gốc `perfin_schema.sql` không sửa:** Giữ nguyên file schema gốc trong `doc/diagrams/` làm reference. Migration file là bản rút gọn cho MVP.

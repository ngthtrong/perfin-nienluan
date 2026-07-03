# TASK-06: Hệ thống Tài khoản/Ví

| Thuộc tính | Giá trị |
|-----------|---------|
| **Task ID** | TASK-06 |
| **Phase** | 2 — Transaction System |
| **Ưu tiên** | 🟡 High |
| **Trạng thái** | ⬜ TODO |
| **Phụ thuộc** | TASK-01, TASK-02 |
| **Ước lượng** | 4-5 giờ |

---

## 📋 Tổng quan

Triển khai hệ thống tài khoản/ví cho MVP. Phiên bản MVP chỉ sử dụng **1 ví mặc định** ("Tiền mặt"). Tất cả giao dịch tự động liên kết với ví này. Hiển thị số dư trên Dashboard. Thiết kế sẵn cho multi-account ở v2+.

## 📌 Điều kiện tiên quyết

- TASK-01 hoàn thành (bảng `wallets` đã tạo + seed ví "Tiền mặt")
- TASK-02 hoàn thành (cấu trúc modular)

---

## 📝 Chi tiết các Subtask

### 6.1: Implement account.model.js
- [ ] `getDefault(userId)` — Lấy ví mặc định (is_default = true)
- [ ] `getAll(userId)` — Lấy tất cả ví (MVP: 1 ví)
- [ ] `getById(id)` — Chi tiết 1 ví
- [ ] `getBalance(id)` — Lấy balance hiện tại
- [ ] `updateBalance(id, amount, operation)` — Atomic balance update

```javascript
async updateBalance(id, amount, operation = 'add') {
  const sign = operation === 'add' ? '+' : '-';
  const result = await pool.query(
    `UPDATE wallets SET balance = balance ${sign} $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [Math.abs(amount), id]
  );
  return result.rows[0];
}
```

- [ ] `create({ name, type, balance, is_default, userId })` — Tạo ví mới (cho v2+)
- [ ] `update(id, { name })` — Cập nhật tên ví
- [ ] `ensureDefault(userId)` — Kiểm tra và tạo ví mặc định nếu chưa có

```javascript
async ensureDefault(userId = 'default_user') {
  const existing = await this.getDefault(userId);
  if (existing) return existing;

  const result = await pool.query(
    `INSERT INTO wallets (name, type, balance, is_default, user_id)
     VALUES ('Tiền mặt', 'cash', 0, TRUE, $1) RETURNING *`,
    [userId]
  );
  return result.rows[0];
}
```

### 6.2: Implement account.routes.js
- [ ] `GET /api/accounts` — Danh sách ví (MVP: 1 ví)

```json
{ "success": true, "data": [{ "id": 1, "name": "Tiền mặt", "type": "cash", "balance": 5000000, "is_default": true }] }
```

- [ ] `GET /api/accounts/:id` — Chi tiết ví
- [ ] `GET /api/accounts/balance` — Tổng số dư

```json
{ "success": true, "data": { "total_balance": 5000000, "wallets": [...] } }
```

- [ ] `PUT /api/accounts/:id` — Cập nhật thông tin ví (tên, MVP chỉ cho sửa tên)

### 6.3: Auto-creation logic
- [ ] Gọi `ensureDefault()` khi server start
- [ ] Hoặc middleware check trước mọi request cần wallet

```javascript
// Trong index.js
const AccountModel = require('./models/account.model');
(async () => {
  await AccountModel.ensureDefault();
  console.log('✅ Default wallet ensured');
})();
```

### 6.4: Link transactions to default wallet
- [ ] Trong `POST /api/transactions`:
  - Nếu `wallet_id` không được cung cấp → tự động dùng default wallet
  - `const wallet = await AccountModel.getDefault(userId);`
  - `data.wallet_id = wallet.id;`

### 6.5: Frontend — DashboardScreen.js
- [ ] **Balance Card** (phần nổi bật nhất):

```
┌─────────────────────────────────┐
│          💰 Tiền mặt            │
│                                 │
│        5.000.000₫               │
│   (số dư lớn, font bold)        │
│                                 │
│  Thu:  +15.000.000₫   tháng 6   │
│  Chi:   -10.000.000₫            │
│  Chênh lệch: +5.000.000₫       │
└─────────────────────────────────┘
```

- [ ] **Monthly summary**: Tổng thu (xanh), Tổng chi (đỏ), Chênh lệch
- [ ] **Recent transactions**: 5 giao dịch gần nhất (mini list)

```
🍜  Ăn phở           -50.000₫    Hôm nay
🚗  Đi grab          -35.000₫    Hôm nay
💰  Lương tháng 6  +15.000.000₫  19/06
```

- [ ] **Quick actions**: Nút "💬 Chat" + "➕ Thêm giao dịch"
- [ ] Fetch data từ:
  - `GET /api/accounts/balance` — Số dư
  - `GET /api/transactions/summary?month=6&year=2026` — Tổng hợp
  - `GET /api/transactions?limit=5` — 5 giao dịch gần nhất

### 6.6: Frontend — BalanceDisplay component
- [ ] Reusable component hiển thị số tiền formatted VND
- [ ] Props: `amount`, `size` (large/medium/small), `showSign` (true/false)
- [ ] Màu: positive = `#4CAF50` (xanh), negative = `#F44336` (đỏ), zero = `#757575` (xám)
- [ ] Format: `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`

---

## ✅ Tiêu chí hoàn thành

- [ ] Ví mặc định "Tiền mặt" tự động tạo khi chưa có
- [ ] API trả về thông tin ví đúng (name, type, balance)
- [ ] Balance phản ánh chính xác tất cả giao dịch
- [ ] Balance cập nhật atomic với mỗi thao tác transaction
- [ ] Dashboard hiển thị đúng: balance, monthly summary, recent transactions
- [ ] Quick actions navigate đúng đến Chat và Manual Input
- [ ] BalanceDisplay component reusable, format VND đẹp

---

## 📝 Ghi chú Kỹ thuật

- **Single wallet MVP**: Thiết kế DB đã hỗ trợ multi-wallet (bảng `wallets`), MVP chỉ dùng 1. Code nên viết sẵn cho multi-wallet
- **Balance precision**: `DECIMAL(15, 2)` — PostgreSQL handles arithmetic chính xác, không dùng JavaScript floating point
- **Negative balance**: Cho phép balance âm (người dùng có thể chi nhiều hơn thu)
- **Dashboard refresh**: Dùng `useFocusEffect` (React Navigation) để refresh data mỗi khi tab được focus
- **VND formatting**: 1000000 → "1.000.000₫" (dấu chấm ngăn hàng nghìn, ₫ cuối)

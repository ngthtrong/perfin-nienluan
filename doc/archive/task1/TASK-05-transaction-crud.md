# TASK-05: CRUD Giao dịch + API Endpoints

| Thuộc tính | Giá trị |
|---|---|
| **Task ID** | TASK-05 |
| **Phase** | 2 — Transaction System |
| **Priority** | 🔴 Critical |
| **Status** | ✅ DONE |
| **Depends on** | TASK-01 (transactions table), TASK-02 (models/, routes/, screens/), TASK-04 (categories) |
| **Blocked by** | TASK-01, TASK-02 |

---

## Tổng quan

Xây dựng toàn bộ hệ thống CRUD giao dịch (transactions) — core business logic của PERFIN. Bao gồm:
- **Backend:** Model, routes, balance management, pagination
- **Frontend:** Transaction list screen, detail modal, manual input form, filters

**Flow tạo giao dịch có 2 đường:**
1. **Qua AI Chat:** User nhắn "ăn phở 50k" → AI parse (TASK-03) → tự động tạo transaction
2. **Manual input:** User bấm nút "+" → điền form → tạo transaction

**Cả 2 flow đều gọi cùng 1 API:** `POST /api/transactions`

**Quy tắc balance quan trọng:**
- Mỗi transaction ảnh hưởng trực tiếp đến `wallet.balance`
- Tất cả operations phải atomic (PostgreSQL transactions)
- Soft delete: không xóa thật, set `deleted_at` + reverse balance
- 30-second undo: user có 30 giây để restore sau khi xóa

---

## Điều kiện tiên quyết

- [ ] TASK-01 hoàn thành: tables `transactions`, `wallets` tồn tại
- [ ] TASK-02 hoàn thành: project structure đã setup
- [ ] TASK-04 hoàn thành: categories system hoạt động
- [ ] Default wallet "Tiền mặt" đã seed (TASK-01)
- [ ] Frontend navigation đã setup (TASK-02)

---

## Chi tiết các subtask

### 5.1 — Implement `transaction.model.js`

- [ ] **`create(data)`** — Tạo giao dịch + cập nhật wallet balance
  - Input: `{ description, amount, type, category_id, wallet_id, transaction_date, source, note }`
  - **PHẢI dùng PostgreSQL transaction (atomic):**
    ```javascript
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Insert transaction
      const txResult = await client.query(
        `INSERT INTO transactions (description, amount, type, category_id, wallet_id, transaction_date, source, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [data.description, data.amount, data.type, data.category_id, data.wallet_id, data.transaction_date, data.source, data.note]
      );
      
      // 2. Update wallet balance
      const balanceChange = data.type === 'income' ? data.amount : -data.amount;
      await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
        [balanceChange, data.wallet_id]
      );
      
      await client.query('COMMIT');
      return txResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    ```

- [ ] **`getAll(userId, filters)`** — List giao dịch với pagination & filters
  - Filters: `{ from, to, category_id, type, search, page, limit, sort_by, sort_order }`
  - **Mặc định:** `page=1, limit=20, sort_by='transaction_date', sort_order='DESC'`
  - Filter `from/to`: `WHERE transaction_date BETWEEN $from AND $to`
  - Filter `category_id`: `WHERE category_id = $category_id`
  - Filter `type`: `WHERE type = $type`
  - Filter `search`: `WHERE description ILIKE '%search%'`
  - **Luôn exclude soft deleted:** `WHERE deleted_at IS NULL`
  - JOIN với categories để lấy `category_name`, `category_icon`
  - Return: `{ data: [...], pagination: { page, limit, total, totalPages } }`
  ```sql
  SELECT t.*, c.name as category_name, c.icon as category_icon, w.name as wallet_name
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  LEFT JOIN wallets w ON t.wallet_id = w.id
  WHERE t.deleted_at IS NULL
    AND t.wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)
    -- dynamic filters appended here
  ORDER BY t.transaction_date DESC, t.created_at DESC
  LIMIT $limit OFFSET ($page - 1) * $limit;
  ```

- [ ] **`getById(id)`**
  - JOIN categories và wallets
  - Include soft-deleted (để restore có thể tìm thấy)
  - Return: full transaction object với category_name, category_icon, wallet_name

- [ ] **`update(id, data)`** — Update transaction + recalculate balance
  - **Flow phức tạp — cần reverse old + apply new:**
    ```
    1. BEGIN transaction
    2. Get old transaction data
    3. Reverse old balance: if old.type === 'expense' → balance += old.amount; else balance -= old.amount
    4. Update transaction record
    5. Apply new balance: if new.type === 'expense' → balance -= new.amount; else balance += new.amount
    6. COMMIT
    ```
  - Chỉ cho update: `description, amount, type, category_id, transaction_date, note`
  - Không cho update: `wallet_id, source, created_at`
  - Return: updated transaction object

- [ ] **`softDelete(id)`** — Soft delete + reverse balance
  - Set `deleted_at = NOW()`
  - Reverse balance: expense → `balance += amount`; income → `balance -= amount`
  - Atomic (PostgreSQL transaction)
  - Return: `{ success: true, deleted_at: timestamp, restore_deadline: timestamp + 30s }`

- [ ] **`restore(id)`** — Restore soft-deleted transaction
  - **Chỉ cho phép trong 30 giây** sau khi xóa:
    ```sql
    WHERE id = $1 
      AND deleted_at IS NOT NULL 
      AND deleted_at > NOW() - INTERVAL '30 seconds'
    ```
  - Unset `deleted_at = NULL`
  - Reapply balance: expense → `balance -= amount`; income → `balance += amount`
  - Atomic
  - Return: restored transaction hoặc error "Đã quá thời hạn khôi phục (30 giây)"

- [ ] **`getMonthlySummary(userId, month, year)`**
  - Aggregate: tổng thu, tổng chi, net (thu - chi)
  ```sql
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as net
  FROM transactions
  WHERE deleted_at IS NULL
    AND EXTRACT(MONTH FROM transaction_date) = $1
    AND EXTRACT(YEAR FROM transaction_date) = $2
    AND wallet_id IN (SELECT id FROM wallets WHERE user_id = $3);
  ```
  - Return: `{ total_income, total_expense, net, month, year }`

- [ ] **`getCategoryBreakdown(userId, month, year)`**
  - Group by category, sum amounts
  ```sql
  SELECT c.id, c.name, c.icon, c.type,
    SUM(t.amount) as total,
    COUNT(t.id) as count,
    ROUND(SUM(t.amount) * 100.0 / NULLIF(SUM(SUM(t.amount)) OVER(), 0), 1) as percentage
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  WHERE t.deleted_at IS NULL
    AND t.type = 'expense'
    AND EXTRACT(MONTH FROM t.transaction_date) = $1
    AND EXTRACT(YEAR FROM t.transaction_date) = $2
  GROUP BY c.id, c.name, c.icon, c.type
  ORDER BY total DESC;
  ```
  - Return: array of `{ category_id, category_name, icon, total, count, percentage }`

- [ ] **`getMonthlyTrend(userId, year)`**
  - 12 tháng xu hướng thu/chi
  ```sql
  SELECT 
    EXTRACT(MONTH FROM transaction_date) as month,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
  FROM transactions
  WHERE deleted_at IS NULL
    AND EXTRACT(YEAR FROM transaction_date) = $1
  GROUP BY EXTRACT(MONTH FROM transaction_date)
  ORDER BY month;
  ```
  - Return: array 12 items `{ month, income, expense }`

### 5.2 — Implement `transaction.routes.js`

- [ ] **`POST /api/transactions`** — Tạo giao dịch
  - Body:
    ```json
    {
      "description": "Ăn phở",
      "amount": 50000,
      "type": "expense",
      "category_id": 1,
      "wallet_id": 1,
      "transaction_date": "2026-06-20",
      "source": "ai_chat",
      "note": ""
    }
    ```
  - Validation:
    - `description`: required, 1-200 chars
    - `amount`: required, positive number, > 0
    - `type`: required, 'income' | 'expense'
    - `category_id`: required, must exist in DB
    - `wallet_id`: optional (default = wallet mặc định "Tiền mặt")
    - `transaction_date`: optional (default = today), format YYYY-MM-DD
    - `source`: optional, default 'manual'
  - Response 201:
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "description": "Ăn phở",
        "amount": 50000,
        "type": "expense",
        "category_id": 1,
        "category_name": "Ăn uống",
        "category_icon": "🍜",
        "wallet_id": 1,
        "wallet_name": "Tiền mặt",
        "transaction_date": "2026-06-20",
        "source": "ai_chat",
        "created_at": "2026-06-20T10:30:00Z"
      },
      "wallet_balance": -50000
    }
    ```

- [ ] **`GET /api/transactions`** — List giao dịch
  - Query params: `?from=2026-06-01&to=2026-06-30&category_id=1&type=expense&search=phở&page=1&limit=20`
  - Tất cả params đều optional
  - Response 200:
    ```json
    {
      "success": true,
      "data": [ ... ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 45,
        "totalPages": 3
      }
    }
    ```

- [ ] **`GET /api/transactions/:id`** — Chi tiết giao dịch
  - 404 nếu không tìm thấy hoặc đã soft delete
  - Response: `{ success: true, data: { ... } }`

- [ ] **`PUT /api/transactions/:id`** — Cập nhật giao dịch
  - Body: partial update (chỉ gửi fields cần update)
  - Recalculate balance nếu amount hoặc type thay đổi
  - 404 nếu không tìm thấy
  - Response: `{ success: true, data: { ... }, wallet_balance: number }`

- [ ] **`DELETE /api/transactions/:id`** — Soft delete
  - Không xóa thật, set `deleted_at = NOW()`
  - Reverse wallet balance
  - Response:
    ```json
    {
      "success": true,
      "message": "Đã xóa giao dịch",
      "restore_deadline": "2026-06-20T10:31:00Z",
      "restore_url": "/api/transactions/1/restore"
    }
    ```

- [ ] **`POST /api/transactions/:id/restore`** — Restore (30s window)
  - Chỉ hoạt động trong 30 giây sau khi xóa
  - Reapply wallet balance
  - 410 (Gone) nếu quá 30 giây: `{ success: false, message: "Đã quá thời hạn khôi phục (30 giây)" }`
  - Response: `{ success: true, data: { ... }, message: "Đã khôi phục giao dịch" }`

- [ ] **`GET /api/transactions/summary`** — Tổng thu/chi tháng hiện tại
  - Query params: `?month=6&year=2026` (optional, default tháng hiện tại)
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "total_income": 15000000,
        "total_expense": 5200000,
        "net": 9800000,
        "month": 6,
        "year": 2026,
        "transaction_count": 23
      }
    }
    ```

### 5.3 — Balance recalculation logic

- [ ] **Quy tắc cập nhật balance:**

  | Action | Expense | Income |
  |---|---|---|
  | Create | `balance -= amount` | `balance += amount` |
  | Delete (soft) | `balance += amount` (reverse) | `balance -= amount` (reverse) |
  | Restore | `balance -= amount` (reapply) | `balance += amount` (reapply) |
  | Update amount | reverse old → apply new | reverse old → apply new |
  | Update type (expense→income) | `balance += old_amount + new_amount` | reverse scenario |

- [ ] **Atomic operations:** Tất cả balance changes PHẢI nằm trong PostgreSQL transaction (BEGIN/COMMIT/ROLLBACK). Không bao giờ update balance ngoài transaction.

- [ ] **Concurrency safety:** Dùng `SELECT ... FOR UPDATE` cho wallet row khi cập nhật balance, tránh race condition:
  ```sql
  SELECT balance FROM wallets WHERE id = $1 FOR UPDATE;
  UPDATE wallets SET balance = balance + $2 WHERE id = $1;
  ```

- [ ] **Balance audit:** (Optional cho MVP) Tạo function `recalculateBalance(walletId)` — tính lại balance từ tất cả transactions. Dùng để debug nếu balance bị sai:
  ```sql
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as calculated_balance
  FROM transactions
  WHERE wallet_id = $1 AND deleted_at IS NULL;
  ```

### 5.4 — Pagination

- [ ] **Default values:** `page = 1`, `limit = 20`
- [ ] **Max limit:** 100 (tránh query quá lớn)
- [ ] **Count query riêng:** Chạy `SELECT COUNT(*)` riêng cho total (với cùng WHERE conditions)
- [ ] **Response format:**
  ```json
  {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```
- [ ] **Validation:**
  - `page` >= 1 (default 1)
  - `limit` >= 1 && <= 100 (default 20)
  - Nếu `page` > `totalPages` → trả về empty array (không error)

### 5.5 — Frontend — `TransactionScreen.js`

- [ ] **Layout tổng thể:**
  - Header: "Giao dịch" + tháng/năm hiện tại
  - Filter bar (collapsible): date range, category filter, type filter
  - Transaction list grouped by date
  - Floating action button "+" (góc phải dưới)

- [ ] **Transaction list:**
  - Grouped by date: "Hôm nay", "Hôm qua", "18/06/2026", ...
  - Mỗi nhóm: header date + tổng chi trong ngày
  - Mỗi item dùng `TransactionCard` component:
    - Trái: category icon (emoji)
    - Giữa: description (bold) + category name (light)
    - Phải: amount (đỏ cho expense `-50.000₫`, xanh cho income `+15.000.000₫`)
  - Format amount: VND với dấu chấm ngăn cách nghìn + ký hiệu ₫

- [ ] **Pull-to-refresh:**
  - `RefreshControl` component
  - Reload transaction list từ API

- [ ] **Infinite scroll / Load more:**
  - `onEndReached` → load page tiếp theo
  - Loading indicator ở cuối list
  - "Hết rồi!" message khi không còn data

- [ ] **Filter bar:**
  - Date range: nút "Tháng này", "Tháng trước", "Custom" (date picker)
  - Category: dropdown chọn category (hoặc "Tất cả")
  - Type: toggle "Tất cả" / "Chi tiêu" / "Thu nhập"
  - Mỗi filter thay đổi → gọi lại API

- [ ] **Swipe to delete:**
  - Swipe trái → hiện nút "Xóa" (đỏ)
  - Tap "Xóa" → soft delete + hiện undo toast
  - Toast: "Đã xóa giao dịch. Hoàn tác?" (30 giây countdown)
  - Tap "Hoàn tác" → call restore API

- [ ] **Tap item → navigate to detail/edit modal**

### 5.6 — Frontend — `TransactionDetailModal`

- [ ] **Chế độ xem (View):**
  - Category icon + name (lớn)
  - Description
  - Amount (lớn, đỏ/xanh)
  - Date + time
  - Wallet name
  - Source (AI Chat / Thủ công)
  - Note (nếu có)
  - Nút "Sửa" và "Xóa"

- [ ] **Chế độ sửa (Edit):**
  - Tap "Sửa" → chuyển sang edit mode
  - Fields có thể sửa:
    - `description`: TextInput
    - `amount`: NumberInput (keyboard numeric)
    - `category`: CategoryPicker modal (TASK-04 component)
    - `date`: DatePicker
    - `type`: Toggle "Chi tiêu" / "Thu nhập"
    - `note`: TextInput multiline
  - Nút "Lưu" (primary) và "Hủy" (secondary)
  - Lưu: call `PUT /api/transactions/:id`
  - Loading state khi saving
  - Success: đóng modal + refresh list
  - Error: hiện error message

- [ ] **Delete từ detail:**
  - Nút "Xóa" (đỏ) ở cuối modal
  - Confirm dialog: "Bạn có chắc muốn xóa giao dịch này?"
  - Xóa → đóng modal + show undo toast trên TransactionScreen

### 5.7 — Frontend — Manual Input Form

- [ ] **Trigger:** Tap nút "+" trên TransactionScreen
- [ ] **Layout:** Full-screen modal hoặc new screen
- [ ] **Form fields:**

  | Field | Type | Required | Default |
  |---|---|---|---|
  | Amount | Number input (lớn, prominent) | ✅ | — |
  | Type | Toggle: Chi tiêu / Thu nhập | ✅ | Chi tiêu |
  | Category | CategoryPicker (grid icons) | ✅ | — |
  | Description | TextInput | ✅ | — |
  | Date | DatePicker | ❌ | Hôm nay |
  | Note | TextInput multiline | ❌ | — |

- [ ] **Amount input UX:**
  - Hiển thị lớn ở trên cùng
  - Numeric keyboard
  - Auto format: `50000` → "50.000 ₫" (hiển thị)
  - Hỗ trợ nhập shorthand: "50k" → 50000 (dùng `normalizeAmount` từ parser.service)

- [ ] **Category picker UX:**
  - Grid 4 columns
  - Hiển thị icon (emoji) + tên
  - Highlight selected
  - Filter theo type đã chọn (nếu chọn "Thu nhập" → chỉ show income categories)

- [ ] **Submit flow:**
  1. Validate: amount > 0, category selected, description non-empty
  2. Show loading
  3. Call `POST /api/transactions` với `source: 'manual'`
  4. Success: đóng form + navigate to TransactionScreen + show success toast
  5. Error: show error message, giữ form data

- [ ] **UX improvements:**
  - "Lưu & Thêm tiếp" button (lưu + reset form, không đóng)
  - Remember last used category (per type)
  - Haptic feedback on submit (nếu có)

---

## Tiêu chí hoàn thành

- [ ] `POST /api/transactions` tạo giao dịch thành công, wallet balance cập nhật đúng
- [ ] `GET /api/transactions` trả về list với pagination hoạt động
- [ ] `GET /api/transactions?type=expense&category_id=1&from=2026-06-01&to=2026-06-30` filter hoạt động
- [ ] `PUT /api/transactions/:id` update thành công, balance recalculated
- [ ] `DELETE /api/transactions/:id` soft delete + reverse balance
- [ ] `POST /api/transactions/:id/restore` khôi phục trong 30 giây
- [ ] `POST /api/transactions/:id/restore` trả 410 sau 30 giây
- [ ] `GET /api/transactions/summary` trả đúng tổng thu/chi
- [ ] Wallet balance luôn chính xác (no corruption)
- [ ] Frontend: TransactionScreen hiển thị list grouped by date
- [ ] Frontend: Filter bar hoạt động (date, category, type)
- [ ] Frontend: Pull-to-refresh + infinite scroll
- [ ] Frontend: Swipe delete + 30s undo toast
- [ ] Frontend: Detail modal — xem + sửa + xóa
- [ ] Frontend: Manual input form hoạt động end-to-end
- [ ] Không có data corruption khi concurrent operations (test bằng rapid clicks)

---

## Ghi chú kỹ thuật

1. **PostgreSQL transactions là bắt buộc:** Mọi operation thay đổi balance PHẢI nằm trong `BEGIN/COMMIT`. Đây là quy tắc tuyệt đối, không có ngoại lệ. Nếu app crash giữa chừng, balance phải vẫn consistent.

2. **Soft delete vs Hard delete:** MVP dùng soft delete (`deleted_at`). Hard delete chỉ xảy ra khi chạy cron job cleanup (ngoài scope MVP). Tất cả queries mặc định phải có `WHERE deleted_at IS NULL`.

3. **30-second restore window:** Đây là thời gian rất ngắn. Frontend phải show countdown rõ ràng. Sau 30 giây, transaction vẫn nằm trong DB (soft deleted) nhưng không thể restore qua API. Admin có thể restore manual nếu cần.

4. **Amount luôn là positive integer:** Trong DB, `amount` luôn > 0. Type (`income`/`expense`) quyết định hướng: expense = trừ balance, income = cộng balance. KHÔNG lưu amount âm.

5. **Date handling:** 
   - Frontend gửi `transaction_date` dạng `YYYY-MM-DD` (chỉ ngày, không có time)
   - DB lưu dạng `DATE` (không phải TIMESTAMP)
   - `created_at` là TIMESTAMP (có time) — để tracking khi nào record được tạo

6. **Search performance:** `ILIKE '%search%'` không dùng index. Cho MVP với single user và vài trăm transactions, đây không phải vấn đề. Nếu scale lên, cần trigram index (`pg_trgm`) hoặc full-text search.

7. **Frontend state management:** Sau mỗi create/update/delete, có 2 cách update UI:
   - **Option A:** Re-fetch list từ API (đơn giản, đảm bảo data đúng)
   - **Option B:** Optimistic update local state + sync (nhanh hơn nhưng phức tạp)
   - **MVP dùng Option A** cho đơn giản. Optimistic update có thể thêm sau.

8. **Currency:** MVP chỉ hỗ trợ VND. Tất cả amounts đều là VND. Không cần currency conversion. Column `currency` trong wallet table để sẵn cho tương lai.

# TASK-07: Quản lý Ngân sách

| Thuộc tính | Giá trị |
|-----------|---------|
| **Task ID** | TASK-07 |
| **Phase** | 3 — Budget & Reports |
| **Ưu tiên** | 🟡 High |
| **Trạng thái** | ⬜ TODO |
| **Phụ thuộc** | TASK-01, TASK-02, TASK-04, TASK-05 |
| **Ước lượng** | 6-7 giờ |

---

## 📋 Tổng quan

Người dùng thiết lập mức chi tiêu giới hạn (ngân sách) cho từng danh mục expense theo tháng. Hệ thống tự động theo dõi tiến độ chi tiêu so với ngân sách, hiển thị % đã dùng qua progress bar color-coded (xanh/vàng/đỏ).

## 📌 Điều kiện tiên quyết

- TASK-04 (hệ thống categories hoạt động)
- TASK-05 (CRUD transactions hoạt động, có aggregation queries)

---

## 📝 Chi tiết các Subtask

### 7.1: Implement budget.model.js
- [ ] `create({ category_id, amount_limit, period, month, year, userId })`
  - Validate: category phải là expense type
  - Validate: amount_limit > 0
  - Constraint: unique(category_id, month, year, userId)
  - Nếu trùng → return error "Đã có ngân sách cho danh mục này trong tháng"

- [ ] `getAll(userId, month, year)` — Tất cả budgets trong kỳ

```sql
SELECT b.*, c.name as category_name, c.icon as category_icon
FROM budgets b JOIN categories c ON b.category_id = c.id
WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
ORDER BY c.name
```

- [ ] `getById(id)` — Chi tiết 1 budget
- [ ] `update(id, { amount_limit })` — Cập nhật mức ngân sách
- [ ] `delete(id)` — Xóa ngân sách
- [ ] `getProgress(userId, month, year)` — **Budget vs Actual** ⭐

```sql
SELECT
  b.id as budget_id,
  b.amount_limit,
  b.category_id,
  c.name as category_name,
  c.icon as category_icon,
  COALESCE(SUM(t.amount), 0) as spent,
  b.amount_limit - COALESCE(SUM(t.amount), 0) as remaining,
  CASE
    WHEN b.amount_limit = 0 THEN 0
    ELSE ROUND((COALESCE(SUM(t.amount), 0) / b.amount_limit) * 100, 1)
  END as percentage
FROM budgets b
JOIN categories c ON b.category_id = c.id
LEFT JOIN transactions t ON t.category_id = b.category_id
  AND t.user_id = b.user_id
  AND t.type = 'expense'
  AND t.deleted_at IS NULL
  AND EXTRACT(MONTH FROM t.transaction_date) = b.month
  AND EXTRACT(YEAR FROM t.transaction_date) = b.year
WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
GROUP BY b.id, b.amount_limit, b.category_id, c.name, c.icon
ORDER BY percentage DESC
```

- [ ] Thêm `status` field dựa trên percentage:

| Percentage | Status | Ý nghĩa |
|-----------|--------|---------|
| < 70% | `safe` | An toàn ✅ |
| 70% — 89% | `warning` | Cần chú ý ⚠️ |
| 90% — 100% | `danger` | Sắp hết 🔴 |
| > 100% | `exceeded` | Vượt ngân sách 💥 |

### 7.2: Implement budget.routes.js
- [ ] `POST /api/budgets` — Tạo ngân sách

```
Body: { category_id: 1, amount_limit: 2000000, month: 6, year: 2026 }
Validation:
  - category_id exists & is expense type
  - amount_limit > 0
  - month: 1-12, year: 2020-2100
  - unique per category/month/year
Response: { success: true, data: { ...budget } }
```

- [ ] `GET /api/budgets` — Danh sách ngân sách

```
Query: ?month=6&year=2026
Default: tháng hiện tại
Response: { success: true, data: [...budgets with category info] }
```

- [ ] `GET /api/budgets/:id` — Chi tiết
- [ ] `PUT /api/budgets/:id` — Cập nhật (chỉ amount_limit)
- [ ] `DELETE /api/budgets/:id` — Xóa
- [ ] `GET /api/budgets/progress` — ⭐ Budget vs Spent

```
Query: ?month=6&year=2026
Response: {
  success: true,
  data: [
    {
      budget_id: 1,
      category_name: "Ăn uống",
      category_icon: "🍜",
      amount_limit: 2000000,
      spent: 1500000,
      remaining: 500000,
      percentage: 75.0,
      status: "warning"
    },
    ...
  ]
}
```

### 7.3: Budget progress calculation
- [ ] Auto-update khi transaction create/update/delete (không cần re-query tất cả, nhưng progress endpoint luôn tính real-time từ DB)
- [ ] Handle edge cases:
  - Category không có giao dịch → spent = 0, percentage = 0%
  - Budget amount = 0 → percentage = 0 (tránh divide by zero)
  - Negative remaining → vượt ngân sách

### 7.4: Frontend — BudgetScreen.js
- [ ] **Month selector** ở header:

```
    ◀  Tháng 6, 2026  ▶
```

- [ ] **Budget list** — mỗi item:

```
┌──────────────────────────────────────┐
│ 🍜 Ăn uống                          │
│ ████████████░░░░░░  75% | 1.500.000₫ │
│ Ngân sách: 2.000.000₫  Còn: 500.000₫ │
└──────────────────────────────────────┘
```

- [ ] **Add budget FAB** (nút tròn "+") → modal:
  - Category picker (chỉ hiện expense categories chưa có budget trong tháng này)
  - Amount input (numeric, placeholder "Nhập mức ngân sách")
  - Nút "Tạo ngân sách"

- [ ] **Edit/Delete**: Long press hoặc swipe → ActionSheet/Menu
  - Sửa: modal edit amount
  - Xóa: confirm dialog "Bạn có chắc muốn xóa ngân sách cho [category]?"

- [ ] **Empty state**: Khi chưa có budget nào

```
📊 Chưa có ngân sách nào
Hãy thêm ngân sách để kiểm soát chi tiêu!
[+ Thêm ngân sách]
```

- [ ] **Total overview** ở header:

```
Tổng ngân sách: 5.000.000₫ | Đã chi: 3.200.000₫ (64%)
```

### 7.5: Frontend — BudgetProgressBar.js
- [ ] Animated horizontal progress bar
- [ ] Props: `percentage`, `spent`, `limit`, `status`
- [ ] Colors:
  - `safe` (< 70%): `#4CAF50` (green)
  - `warning` (70-90%): `#FF9800` (orange)
  - `danger` (90-100%): `#F44336` (red)
  - `exceeded` (> 100%): `#D32F2F` (dark red) + flash animation
- [ ] Animation: `Animated.timing` khi value thay đổi
- [ ] Text: "1.500.000₫ / 2.000.000₫ (75%)"

### 7.6: Validation rules
- [ ] Chỉ expense categories có thể tạo budget (income → reject)
- [ ] Amount > 0
- [ ] Một budget per category per month (unique constraint)
- [ ] Không block spending khi vượt ngân sách (chỉ cảnh báo visual)

---

## ✅ Tiêu chí hoàn thành

- [ ] CRUD budgets hoạt động qua API
- [ ] Budget progress tính đúng (spent, remaining, percentage, status)
- [ ] Progress bar hiển thị đúng màu theo status
- [ ] Unique constraint: 1 budget/category/month
- [ ] Chỉ expense categories có thể có budget
- [ ] Frontend: month selector, budget list, add/edit/delete, empty state
- [ ] BudgetProgressBar animated, color-coded

---

## 📝 Ghi chú Kỹ thuật

- **Real-time vs cached**: Progress luôn tính real-time từ DB (JOIN budgets + transactions). Đủ nhanh cho MVP (<100ms query). Cân nhắc cache ở v2+ nếu data lớn
- **Unique constraint**: PostgreSQL `UNIQUE(category_id, month, year, user_id)` — DB-level enforcement
- **Budget only for expense**: Validate ở application layer bằng cách check `category.type === 'expense'` trước khi insert
- **Progress bar animation**: Dùng `Animated` API của React Native, `useNativeDriver: false` cho width animation
- **Month navigation**: Lưu selectedMonth/selectedYear trong screen state, truyền vào API query

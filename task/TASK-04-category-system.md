# TASK-04: Hệ thống Danh mục Phân loại

| Thuộc tính | Giá trị |
|---|---|
| **Task ID** | TASK-04 |
| **Phase** | 1 — AI Core |
| **Priority** | 🟡 High |
| **Status** | ✅ DONE |
| **Depends on** | TASK-01 (categories table + seed data), TASK-02 (models/, routes/) |
| **Blocked by** | TASK-01 |

---

## Tổng quan

Xây dựng hệ thống quản lý danh mục phân loại (categories) cho PERFIN. Đây là thành phần nền tảng mà AI Service (TASK-03) và Transaction CRUD (TASK-05) đều phụ thuộc vào.

**Chức năng chính:**
- 16 default categories đã seed sẵn (TASK-01) — không cho xóa/rename
- User có thể tạo custom categories (tương lai, MVP giữ default)
- AI parse flow: AI trả về `category_name` → fuzzy match → lấy `category_id` từ DB
- Manual override: user có thể đổi category cho transaction sau khi tạo

**Danh mục mặc định:**

| Type | Categories |
|---|---|
| **Expense** (13) | 🍜 Ăn uống, 🚗 Di chuyển, 🛍️ Mua sắm, 🎮 Giải trí, 🏥 Sức khỏe, 📚 Giáo dục, 🏠 Nhà cửa, 📄 Hóa đơn & Dịch vụ, 🛒 Tạp hóa, 📱 Điện tử, ⚽ Thể thao, 💅 Làm đẹp, 📦 Khác |
| **Income** (4) | 💰 Lương, 🎁 Thưởng, 📈 Đầu tư, 📦 Khác |

---

## Điều kiện tiên quyết

- [ ] TASK-01 hoàn thành: `categories` table tồn tại trong PostgreSQL
- [ ] TASK-01 hoàn thành: 16 default categories đã seed
- [ ] TASK-02 hoàn thành: `models/category.model.js` skeleton tồn tại
- [ ] TASK-02 hoàn thành: `routes/category.routes.js` skeleton tồn tại

---

## Chi tiết các subtask

### 4.1 — Implement `category.model.js`

- [ ] **`getAll(userId)`**
  - Query: SELECT tất cả categories có `is_default = true` HOẶC `user_id = $1`
  - Order by: `type ASC, sort_order ASC, name ASC`
  - Return: array of category objects
  ```sql
  SELECT id, name, type, icon, is_default, parent_id, sort_order, created_at
  FROM categories
  WHERE is_default = true OR user_id = $1
  ORDER BY type ASC, sort_order ASC, name ASC;
  ```

- [ ] **`getById(id)`**
  - Query: SELECT by primary key
  - Return: single category object hoặc null

- [ ] **`getByName(name, type, userId)`**
  - Query: tìm category theo tên (case insensitive) và type
  - Dùng `LOWER(name) = LOWER($1)` cho case insensitive
  - Tìm trong cả default và custom categories
  - Return: single category object hoặc null
  ```sql
  SELECT * FROM categories
  WHERE LOWER(name) = LOWER($1)
    AND type = $2
    AND (is_default = true OR user_id = $3)
  LIMIT 1;
  ```

- [ ] **`getByType(type, userId)`**
  - Filter: chỉ lấy categories theo type ('expense' hoặc 'income')
  - Return: array of category objects

- [ ] **`create({ name, type, icon, parent_id, userId })`**
  - Validate: name không trùng với existing (case insensitive, same type)
  - Set `is_default = false` (custom category)
  - Set `user_id = userId`
  - Return: created category object (RETURNING *)
  ```sql
  INSERT INTO categories (name, type, icon, is_default, parent_id, user_id, sort_order)
  VALUES ($1, $2, $3, false, $4, $5, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories WHERE type = $2))
  RETURNING *;
  ```

- [ ] **`update(id, { name, icon })`**
  - Validate: không cho update `is_default = true` categories' name
  - Chỉ cho update: `name`, `icon`
  - Không cho update: `type`, `is_default`
  - Return: updated category object

- [ ] **`delete(id)`**
  - Validate: không cho delete `is_default = true` categories
  - Check: có transaction nào đang dùng category này không?
    - Nếu có → return error: "Không thể xóa danh mục đang có giao dịch. Hãy chuyển giao dịch sang danh mục khác trước."
    - Nếu không → DELETE
  - Return: `{ success: true }` hoặc `{ success: false, message: '...' }`

- [ ] **`initDefaults(userId)`**
  - Seed 16 default categories cho user (nếu chưa có)
  - Check: `SELECT COUNT(*) FROM categories WHERE is_default = true`
  - Nếu đã có → skip
  - Nếu chưa → INSERT tất cả (dùng ON CONFLICT DO NOTHING)
  - Return: number of categories created

### 4.2 — Implement `category.routes.js`

- [ ] **`GET /api/categories`** — List tất cả categories
  - Query params: `?type=expense|income` (optional filter)
  - Response:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "name": "Ăn uống",
          "type": "expense",
          "icon": "🍜",
          "is_default": true,
          "parent_id": null,
          "sort_order": 1
        }
      ],
      "total": 16
    }
    ```

- [ ] **`GET /api/categories/:id`** — Get single category
  - 404 nếu không tìm thấy
  - Response: `{ success: true, data: { ... } }`

- [ ] **`POST /api/categories`** — Create custom category
  - Body: `{ name: string, type: 'expense'|'income', icon: string }`
  - Validation:
    - `name`: required, 1-50 chars, không trùng tên (same type)
    - `type`: required, must be 'expense' or 'income'
    - `icon`: optional, default '📁'
  - 409 nếu tên đã tồn tại (same type)
  - Response: `{ success: true, data: { ... } }`

- [ ] **`PUT /api/categories/:id`** — Update category
  - Body: `{ name: string, icon: string }` (partial update)
  - 403 nếu `is_default = true` và cố gắng rename
  - 404 nếu không tìm thấy
  - Cho phép thay đổi icon ngay cả default categories
  - Response: `{ success: true, data: { ... } }`

- [ ] **`DELETE /api/categories/:id`** — Delete category
  - 403 nếu `is_default = true`
  - 409 nếu có transactions đang dùng
  - Response: `{ success: true, message: "Đã xóa danh mục" }`

### 4.3 — Default category seeding logic

- [ ] **Tự động seed khi cần:**
  - Trong middleware hoặc đầu route handler `GET /api/categories`:
    1. Check: `SELECT COUNT(*) FROM categories WHERE is_default = true`
    2. Nếu count = 0 → gọi `initDefaults()`
    3. Nếu count > 0 → proceed bình thường
  - Đây là safety net ngoài migration seed (TASK-01)

- [ ] **Data cho seeding:**
  ```javascript
  const DEFAULT_CATEGORIES = {
    expense: [
      { name: 'Ăn uống', icon: '🍜', sort_order: 1 },
      { name: 'Di chuyển', icon: '🚗', sort_order: 2 },
      { name: 'Mua sắm', icon: '🛍️', sort_order: 3 },
      { name: 'Giải trí', icon: '🎮', sort_order: 4 },
      { name: 'Sức khỏe', icon: '🏥', sort_order: 5 },
      { name: 'Giáo dục', icon: '📚', sort_order: 6 },
      { name: 'Nhà cửa', icon: '🏠', sort_order: 7 },
      { name: 'Hóa đơn & Dịch vụ', icon: '📄', sort_order: 8 },
      { name: 'Tạp hóa', icon: '🛒', sort_order: 9 },
      { name: 'Điện tử', icon: '📱', sort_order: 10 },
      { name: 'Thể thao', icon: '⚽', sort_order: 11 },
      { name: 'Làm đẹp', icon: '💅', sort_order: 12 },
      { name: 'Khác', icon: '📦', sort_order: 99 },
    ],
    income: [
      { name: 'Lương', icon: '💰', sort_order: 1 },
      { name: 'Thưởng', icon: '🎁', sort_order: 2 },
      { name: 'Đầu tư', icon: '📈', sort_order: 3 },
      { name: 'Khác', icon: '📦', sort_order: 99 },
    ],
  };
  ```

- [ ] **"Khác" là fallback category:** Khi AI không match được category nào, default sử dụng "Khác" (expense hoặc income tùy transaction type). Category "Khác" KHÔNG THỂ bị rename, delete, hoặc hide.

### 4.4 — Tích hợp category matching trong AI parse flow

- [ ] **Flow tích hợp với TASK-03 (`parser.service.js`):**
  1. AI trả về `category_name: "Ăn uống"` (hoặc variations)
  2. Gọi `matchCategory(categoryName, categories)` từ `parser.service.js`
  3. Function flow:
     - Exact match (case insensitive): "ăn uống" → ✅ match "Ăn uống"
     - Remove diacritics match: "an uong" → ✅ match "Ăn uống"
     - Alias match: "đồ ăn" → ✅ match "Ăn uống"
     - Partial match: "ăn" → ✅ match "Ăn uống" (nếu unique)
     - No match → 🔄 return "Khác"
  4. Return full category object với `id`, `name`, `icon`

- [ ] **Category alias map** (trong `parser.service.js` hoặc `constants`):
  ```javascript
  const CATEGORY_ALIASES = {
    'Ăn uống': ['đồ ăn', 'ăn', 'thức ăn', 'ẩm thực', 'cơm', 'bữa ăn', 'food'],
    'Di chuyển': ['đi lại', 'xe', 'xăng', 'grab', 'taxi', 'uber', 'xe buýt', 'transport'],
    'Mua sắm': ['mua đồ', 'shopping', 'mua hàng', 'shop'],
    'Giải trí': ['vui chơi', 'giải trí', 'entertainment', 'phim', 'game'],
    'Sức khỏe': ['y tế', 'thuốc', 'bệnh viện', 'khám bệnh', 'health'],
    'Giáo dục': ['học', 'sách', 'khóa học', 'học phí', 'education'],
    'Nhà cửa': ['nhà', 'phòng trọ', 'thuê nhà', 'rent', 'housing'],
    'Hóa đơn & Dịch vụ': ['hóa đơn', 'bill', 'dịch vụ', 'tiền điện', 'tiền nước', 'internet'],
    'Tạp hóa': ['siêu thị', 'chợ', 'grocery', 'đi chợ'],
    'Điện tử': ['công nghệ', 'tech', 'điện thoại', 'laptop', 'electronics'],
    'Thể thao': ['gym', 'fitness', 'sport', 'tập'],
    'Làm đẹp': ['mỹ phẩm', 'beauty', 'spa', 'tóc', 'nails'],
    'Lương': ['salary', 'wage', 'lương tháng'],
    'Thưởng': ['bonus', 'thưởng tết', 'thưởng cuối năm'],
    'Đầu tư': ['investment', 'lãi', 'cổ tức', 'dividend'],
  };
  ```

- [ ] **Normalize diacritics function:**
  ```javascript
  function removeDiacritics(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  ```

### 4.5 — Implement manual category override

- [ ] **Endpoint: `PUT /api/transactions/:id/category`**
  - Body: `{ category_id: number }`
  - Validate: category_id phải tồn tại trong DB
  - Validate: category type phải khớp transaction type (expense category cho expense transaction)
  - Update `transactions.category_id`
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "description": "Ăn phở",
        "amount": 50000,
        "category_id": 5,
        "category_name": "Sức khỏe",
        "category_icon": "🏥"
      },
      "message": "Đã cập nhật danh mục giao dịch"
    }
    ```
  - 400: category_id không tồn tại
  - 400: category type mismatch (ví dụ: gán income category cho expense transaction)
  - 404: transaction không tồn tại

- [ ] **Lưu ý:** Route này thuộc `transaction.routes.js` chứ không phải `category.routes.js`. Nhưng cần category model để validate.

---

## Tiêu chí hoàn thành

- [ ] 16 default categories tồn tại trong DB (13 expense + 4 income, note: "Khác" có cả expense và income)
- [ ] `GET /api/categories` trả về đủ 16 categories với đúng icon, type, sort_order
- [ ] `GET /api/categories?type=expense` trả về 13 expense categories
- [ ] `GET /api/categories?type=income` trả về 4 income categories
- [ ] `POST /api/categories` tạo được custom category
- [ ] `PUT /api/categories/:id` update icon thành công
- [ ] `PUT /api/categories/:id` bị chặn khi cố rename default category
- [ ] `DELETE /api/categories/:id` bị chặn cho default categories (403)
- [ ] `DELETE /api/categories/:id` bị chặn nếu có transactions đang dùng (409)
- [ ] AI parse flow match đúng category qua fuzzy matching
- [ ] "Khác" được dùng khi không match category nào
- [ ] Manual category override hoạt động: `PUT /api/transactions/:id/category`

---

## Ghi chú kỹ thuật

1. **Category "Khác" là đặc biệt:**
   - Có 2 cái: 1 expense, 1 income
   - Cả 2 đều `is_default = true`
   - Không thể rename, delete, hoặc hide
   - Là fallback category khi AI không match được
   - `sort_order = 99` → luôn ở cuối list

2. **Fuzzy matching priority:**
   1. Exact match (case insensitive) — highest
   2. Diacritics-removed exact match
   3. Alias match
   4. Partial match (nếu unique, không ambiguous)
   5. Default "Khác" — lowest (fallback)

3. **MVP scope:** Cho MVP, user chưa cần tạo custom categories. Nhưng API phải sẵn sàng để hỗ trợ. Frontend chỉ show default categories trong CategoryPicker.

4. **Icon storage:** Icons được lưu dạng emoji string trong DB (VARCHAR). Không dùng icon font hay image file. Emoji render natively trên cả iOS và Android.

5. **Về parent_id:** Schema hỗ trợ hierarchical categories (sub-categories). MVP không dùng feature này. `parent_id` luôn NULL cho tất cả default categories.

6. **Performance:** 16 categories là rất nhỏ. Không cần caching cho MVP. Nhưng nếu mở rộng (user tạo nhiều custom categories), có thể thêm in-memory cache với TTL 5 phút.

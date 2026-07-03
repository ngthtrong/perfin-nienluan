# TASK-02: Refactor Cấu trúc Backend & Frontend

| Thuộc tính | Giá trị |
|---|---|
| **Task ID** | TASK-02 |
| **Phase** | 0 — Foundation |
| **Priority** | 🔴 Critical |
| **Status** | ✅ DONE |
| **Depends on** | TASK-01 (database.js, models cần tables) |
| **Blocked by** | — |

---

## Tổng quan

Refactor toàn bộ codebase hiện tại từ "demo/prototype" thành cấu trúc modular, maintainable cho MVP. Hiện tại backend chỉ có 1 file `index.js` chứa tất cả route handlers, và frontend chỉ có `App.js` với chat UI cơ bản.

**Mục tiêu:**
- **Backend:** Tách thành layers rõ ràng — `config/` → `models/` → `services/` → `routes/` → `middleware/`
- **Frontend:** Tách thành screens, components, services, context với tab navigation 5 tabs
- **Không thay đổi business logic**, chỉ restructure code

**Sau khi hoàn thành, cấu trúc thư mục sẽ là:**

```
backend/
├── config/
│   └── database.js          # PostgreSQL pool config
├── middleware/
│   ├── error.middleware.js   # Global error handler
│   └── validation.middleware.js
├── models/
│   ├── category.model.js    # Data access layer
│   ├── transaction.model.js
│   ├── account.model.js     # Wallet/account model
│   └── budget.model.js
├── routes/
│   ├── ai.routes.js
│   ├── transaction.routes.js
│   ├── category.routes.js
│   ├── budget.routes.js
│   ├── account.routes.js
│   └── report.routes.js
├── services/
│   ├── ai.service.js        # Gemini + ChatGPT
│   ├── parser.service.js    # Validate AI output
│   └── report.service.js    # Aggregation queries
├── prompts/
│   └── transaction.prompt.js
├── migrations/
├── scripts/
├── index.js                 # Entry point (clean)
├── package.json
└── .env

frontend/
├── src/
│   ├── screens/
│   │   ├── ChatScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── TransactionScreen.js
│   │   ├── BudgetScreen.js
│   │   └── ReportScreen.js
│   ├── components/
│   │   ├── MessageBubble.js
│   │   ├── TransactionCard.js
│   │   ├── CategoryPicker.js
│   │   └── BudgetProgressBar.js
│   ├── services/
│   │   └── api.service.js
│   ├── context/
│   │   └── AppContext.js
│   └── utils/
│       ├── formatters.js
│       └── constants.js
├── App.js                   # Tab navigation
├── app.json
└── package.json
```

---

## Điều kiện tiên quyết

- [x] Backend Express server hoạt động (`demo/v1/`)
- [x] Frontend React Native Expo chạy được
- [x] PostgreSQL đã kết nối
- [ ] TASK-01 hoàn thành (database.js, tables đã tạo)

---

## Chi tiết các subtask

### BACKEND

#### 2.1 — Tạo `config/database.js`
- [ ] Extract PostgreSQL pool configuration từ `index.js`
- [ ] Import `pg` package, tạo `Pool` instance với env vars
- [ ] Export: `pool`, `query(text, params)` helper function
- [ ] Thêm error event listener: `pool.on('error', ...)`
- [ ] Cấu hình pool: `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 2000`

> **Lưu ý:** Subtask này trùng với TASK-01 subtask 1.6. Nếu TASK-01 đã hoàn thành, skip subtask này.

#### 2.2 — Tạo `models/` — Data Access Layer
- [ ] **`category.model.js`** — export object:
  - `getAll(userId)` — SELECT tất cả categories (default + custom)
  - `getById(id)` — SELECT by primary key
  - `getByName(name, type, userId)` — tìm theo tên (cho AI matching)
  - `getByType(type, userId)` — filter theo expense/income
  - `create({ name, type, icon, parent_id, userId })`
  - `update(id, data)`
  - `delete(id)` — validate không phải default trước khi xóa
- [ ] **`transaction.model.js`** — export object:
  - `create(data)` — INSERT + update wallet balance (atomic transaction)
  - `getAll(userId, filters)` — SELECT với pagination, filter, sort
  - `getById(id)`
  - `update(id, data)` — UPDATE + recalculate balance
  - `softDelete(id)` — SET deleted_at + reverse balance
  - `restore(id)` — UNSET deleted_at + reapply balance
  - `getMonthlySummary(userId, month, year)` — SUM thu/chi
  - `getCategoryBreakdown(userId, month, year)` — GROUP BY category
- [ ] **`account.model.js`** (Wallet/Account) — export object:
  - `getAll(userId)`
  - `getById(id)`
  - `create(data)`
  - `updateBalance(id, amount, type)` — atomic balance update
  - `getBalance(id)`
- [ ] **`budget.model.js`** — export object:
  - `getAll(userId, month, year)`
  - `getById(id)`
  - `create(data)`
  - `update(id, data)`
  - `delete(id)`
  - `getProgress(userId, month, year)` — so sánh budget vs actual spending

> **Pattern chung cho tất cả models:**
> ```javascript
> const { query } = require('../config/database');
> 
> const CategoryModel = {
>   async getAll(userId) {
>     const result = await query('SELECT * FROM categories WHERE user_id = $1 OR is_default = true', [userId]);
>     return result.rows;
>   },
>   // ... other methods
> };
> 
> module.exports = CategoryModel;
> ```

#### 2.3 — Tạo `routes/`
- [ ] **`ai.routes.js`**
  - `POST /chat` — (migrate từ index.js) chat với AI
  - `POST /parse-transaction` — AI parse text thành transaction
  - `POST /ocr` — (migrate từ index.js) OCR xử lý ảnh
  - `POST /speech` — (migrate từ index.js) speech-to-text
- [ ] **`transaction.routes.js`**
  - `POST /` — tạo giao dịch
  - `GET /` — list giao dịch (với filters)
  - `GET /summary` — tổng thu/chi tháng
  - `GET /:id` — chi tiết
  - `PUT /:id` — cập nhật
  - `DELETE /:id` — soft delete
  - `POST /:id/restore` — khôi phục
- [ ] **`category.routes.js`**
  - `GET /` — list all (?type=expense|income)
  - `GET /:id`
  - `POST /` — tạo custom
  - `PUT /:id` — update
  - `DELETE /:id` — delete (chỉ custom)
- [ ] **`budget.routes.js`**
  - `GET /` — list budgets tháng hiện tại
  - `POST /` — tạo budget
  - `PUT /:id` — update
  - `DELETE /:id`
  - `GET /progress` — tiến độ budget vs actual
- [ ] **`account.routes.js`**
  - `GET /` — list wallets
  - `GET /:id`
  - `POST /` — tạo wallet
  - `PUT /:id`
- [ ] **`report.routes.js`**
  - `GET /monthly` — báo cáo tháng
  - `GET /category-breakdown` — chi tiêu theo danh mục
  - `GET /trend` — xu hướng 12 tháng

#### 2.4 — Tạo `services/`
- [ ] **`ai.service.js`** — (skeleton, chi tiết ở TASK-03)
  - Class `GeminiService` — gọi Gemini API
  - Class `ChatGPTService` — gọi ChatGPT API
  - Class `AIServiceManager` — factory/strategy pattern
  - Export singleton instance
- [ ] **`parser.service.js`** — (skeleton, chi tiết ở TASK-03)
  - `validateParsedTransaction(data)` — validate output từ AI
  - `normalizeAmount(amountStr)` — parse "50k", "3tr5", "15 triệu"
  - `matchCategory(name, categories)` — fuzzy match category
- [ ] **`report.service.js`**
  - `getMonthlySummary(userId, month, year)` — aggregate từ transaction model
  - `getCategoryBreakdown(userId, month, year)` — pie chart data
  - `getMonthlyTrend(userId, year)` — 12-month trend data
  - `getTopExpenses(userId, month, year, limit)` — top N chi tiêu lớn

#### 2.5 — Tạo `prompts/`
- [ ] **`transaction.prompt.js`** — (skeleton, chi tiết ở TASK-03)
  - `getSystemPrompt(categories)` — system prompt template
  - `getParsePrompt(userText, categories)` — prompt cho parse transaction
  - `getChatPrompt(userText, context)` — prompt cho general chat
  - Export các template functions

#### 2.6 — Tạo `middleware/`
- [ ] **`error.middleware.js`**
  - Global error handler: `(err, req, res, next) => { ... }`
  - Log error với timestamp, request info
  - Return JSON error response: `{ success: false, error: { message, code } }`
  - Phân biệt: validation error (400), not found (404), server error (500)
  - Ẩn error details trong production mode
- [ ] **`validation.middleware.js`**
  - `validateTransaction(req, res, next)` — validate body cho create/update transaction
  - `validateCategory(req, res, next)` — validate body cho create/update category
  - `validateBudget(req, res, next)` — validate body cho create/update budget
  - `validatePagination(req, res, next)` — validate query params page, limit

#### 2.7 — Refactor `index.js`
- [ ] Import tất cả route files
- [ ] Mount routes:
  ```javascript
  app.use('/api/ai', aiRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/budgets', budgetRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/reports', reportRoutes);
  ```
- [ ] Thêm error middleware cuối cùng: `app.use(errorMiddleware)`
- [ ] Xóa tất cả inline route handlers
- [ ] Giữ lại: CORS config, body parser, static files, port listen
- [ ] Đảm bảo backward compatibility: `/api/chat` vẫn hoạt động (redirect hoặc mount ở cùng path)

#### 2.8 — Thêm openai package
- [ ] `npm install openai` trong thư mục backend
- [ ] Thêm `OPENAI_API_KEY` vào `.env.example`
- [ ] Verify import hoạt động: `const OpenAI = require('openai')`

#### 2.9 — Thêm npm scripts
- [ ] Thêm vào `package.json`:
  ```json
  {
    "scripts": {
      "start": "node index.js",
      "dev": "node --watch index.js",
      "migrate": "node scripts/migrate.js",
      "migrate:fresh": "node scripts/migrate.js --fresh",
      "seed": "node scripts/migrate.js --seed-only"
    }
  }
  ```
- [ ] Test: `npm run dev` — server starts với file watching
- [ ] Test: `npm run migrate` — migration chạy thành công

---

### FRONTEND

#### 2.10 — Cài đặt navigation dependencies
- [ ] `npx expo install @react-navigation/native @react-navigation/bottom-tabs`
- [ ] `npx expo install react-native-screens react-native-safe-area-context`
- [ ] Verify: `npx expo start` — không có lỗi dependency

#### 2.11 — Tạo `src/screens/`
- [ ] **`ChatScreen.js`**
  - Move toàn bộ chat UI logic từ `App.js` hiện tại
  - Giữ nguyên: input bar, message list, send button
  - Import `MessageBubble` component
  - Import `api.service.js` thay vì gọi fetch trực tiếp
- [ ] **`DashboardScreen.js`** (skeleton)
  - Header: "Tổng quan" + tháng hiện tại
  - Tổng số dư (lấy từ AppContext)
  - Thu/Chi tháng này (placeholder, sẽ connect ở TASK-05)
  - Giao dịch gần đây (top 5)
- [ ] **`TransactionScreen.js`** (skeleton)
  - Header: "Giao dịch"
  - Placeholder list
  - Nút "+" để thêm giao dịch thủ công
- [ ] **`BudgetScreen.js`** (skeleton)
  - Header: "Ngân sách"
  - Placeholder budget list
- [ ] **`ReportScreen.js`** (skeleton)
  - Header: "Báo cáo"
  - Placeholder charts area

> **Lưu ý:** Các screens ngoài ChatScreen chỉ cần skeleton UI với layout cơ bản. Business logic sẽ được thêm ở các TASK sau.

#### 2.12 — Tạo `src/components/`
- [ ] **`MessageBubble.js`**
  - Extract từ ChatScreen
  - Props: `{ message, isUser, timestamp }`
  - Style: user bubble (phải, màu xanh), AI bubble (trái, màu xám)
- [ ] **`TransactionCard.js`** (skeleton)
  - Props: `{ transaction }` — { icon, description, amount, category, date, type }
  - Style: icon trái, description + category giữa, amount phải
  - Amount: đỏ cho expense, xanh cho income
  - Format: VND với dấu chấm ngăn cách nghìn
- [ ] **`CategoryPicker.js`** (skeleton)
  - Props: `{ categories, selected, onSelect, type }`
  - Grid/list view các categories với icon
  - Filter theo expense/income
- [ ] **`BudgetProgressBar.js`** (skeleton)
  - Props: `{ budget }` — { category, limit, spent, percentage }
  - Progress bar with percentage
  - Color: xanh (< 50%), vàng (50-80%), đỏ (> 80%)

#### 2.13 — Tạo `src/services/api.service.js`
- [ ] Centralized API client
- [ ] `baseURL` từ environment variable hoặc constant
- [ ] Methods:
  ```javascript
  const api = {
    async get(endpoint, params) { ... },
    async post(endpoint, body) { ... },
    async put(endpoint, body) { ... },
    async delete(endpoint) { ... },
  };
  ```
- [ ] Tự động handle:
  - JSON headers
  - Error responses → throw với message
  - Timeout (10 seconds)
  - Base URL configuration

#### 2.14 — Tạo `src/context/AppContext.js`
- [ ] React Context + useReducer pattern
- [ ] State:
  ```javascript
  {
    balance: 0,
    recentTransactions: [],
    categories: [],
    isLoading: false,
    error: null,
  }
  ```
- [ ] Actions: `SET_BALANCE`, `SET_TRANSACTIONS`, `ADD_TRANSACTION`, `SET_CATEGORIES`, `SET_LOADING`, `SET_ERROR`
- [ ] Provider component wrap toàn bộ app
- [ ] Custom hook: `useApp()` → { state, dispatch, actions }

#### 2.15 — Tạo `src/utils/`
- [ ] **`formatters.js`**
  - `formatVND(amount)` — "1.500.000 ₫" (dùng toLocaleString('vi-VN'))
  - `formatDate(date)` — "20/06/2026" (DD/MM/YYYY)
  - `formatRelativeDate(date)` — "Hôm nay", "Hôm qua", "2 ngày trước", "20/06/2026"
  - `formatShortAmount(amount)` — "1.5tr", "500k" (cho dashboard)
- [ ] **`constants.js`**
  - `CATEGORY_ICONS` — map category name → emoji icon
  - `CATEGORY_COLORS` — map category name → hex color (cho charts)
  - `TRANSACTION_TYPES` — { INCOME: 'income', EXPENSE: 'expense' }
  - `API_BASE_URL` — base URL cho API calls

#### 2.16 — Refactor `App.js` — Tab Navigation
- [ ] Import `NavigationContainer` từ `@react-navigation/native`
- [ ] Import `createBottomTabNavigator` từ `@react-navigation/bottom-tabs`
- [ ] Tạo 5 tabs:

| Tab | Label | Icon | Screen |
|---|---|---|---|
| 1 | Chat | 💬 | ChatScreen |
| 2 | Tổng quan | 🏠 | DashboardScreen |
| 3 | Giao dịch | 📋 | TransactionScreen |
| 4 | Ngân sách | 💰 | BudgetScreen |
| 5 | Báo cáo | 📊 | ReportScreen |

- [ ] Default tab: Chat (tab đầu tiên)
- [ ] Tab bar style: bottom, background color phù hợp, active color highlight
- [ ] Wrap trong `AppProvider` (context)
- [ ] Wrap trong `SafeAreaProvider`

---

## Tiêu chí hoàn thành

- [ ] Backend starts thành công với cấu trúc mới (`npm run dev`)
- [ ] Tất cả endpoints hiện tại vẫn hoạt động (backward compatible):
  - `POST /api/chat` — AI chat
  - `POST /api/ocr` — OCR
  - `POST /api/speech` — Speech
- [ ] Frontend chạy được với 5 tabs navigation
- [ ] Chat screen hoạt động giống trước refactor
- [ ] Không có regression — tất cả features hiện tại vẫn hoạt động
- [ ] Code clean: mỗi file có 1 responsibility rõ ràng
- [ ] Tất cả models có đầy đủ basic CRUD methods (có thể chưa có route/UI dùng)

---

## Ghi chú kỹ thuật

1. **Thứ tự thực hiện nên là:**
   Backend: 2.1 → 2.6 → 2.5 → 2.4 → 2.2 → 2.3 → 2.7 → 2.8 → 2.9
   Frontend: 2.10 → 2.15 → 2.13 → 2.14 → 2.12 → 2.11 → 2.16

2. **Backward compatibility quan trọng:** Route `/api/chat` hiện tại đang hoạt động. Khi refactor, đảm bảo path này vẫn hoạt động. Có thể mount `aiRoutes` ở cả `/api/ai` và redirect `/api/chat` → `/api/ai/chat`.

3. **Models chỉ là data access layer:** Models KHÔNG chứa business logic phức tạp. Chúng chỉ wrap SQL queries. Business logic (validation, transformation) thuộc về services.

4. **Skeleton vs Implementation:** Nhiều files trong task này chỉ cần skeleton (export empty functions / placeholder UI). Implementation chi tiết sẽ ở TASK-03, 04, 05. Điều này cho phép frontend và backend develop song song.

5. **Frontend navigation:** Sử dụng `@react-navigation/bottom-tabs` vì đây là pattern phổ biến nhất cho mobile app. Có thể switch sang `expo-router` sau nếu cần, nhưng cho MVP thì bottom-tabs là đủ.

6. **API service pattern:**
   ```javascript
   // Thay vì:
   fetch('http://localhost:3000/api/chat', { method: 'POST', body: JSON.stringify(data) })
   
   // Dùng:
   import api from '../services/api.service';
   api.post('/ai/chat', data);
   ```
   Centralized error handling, timeout, và base URL management.

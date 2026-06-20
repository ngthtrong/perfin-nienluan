# TASK-10: Kiểm thử & Hoàn thiện MVP

| Thuộc tính | Giá trị |
|------------|---------|
| **Task ID** | TASK-10 |
| **Phase** | 4 — Integration & Polish |
| **Priority** | 🟡 High |
| **Status** | ✅ DONE |

---

## Tổng quan

Giai đoạn cuối cùng trước khi hoàn thành MVP: kiểm thử tích hợp end-to-end, đánh giá độ chính xác AI, polish UI/UX, tối ưu hiệu suất, audit error handling, viết tài liệu, và tạo demo data. Mục tiêu: **app chạy mượt, không có critical bug, sẵn sàng demo**.

**Mục tiêu chính:**
- 10 E2E test scenarios pass
- AI accuracy > 80% trên bộ test 30+ câu
- UI/UX nhất quán, chuyên nghiệp
- Performance đạt yêu cầu
- Documentation đầy đủ
- Demo data sẵn sàng

---

## Điều kiện tiên quyết

- [x] TASK-06: Account/Wallet system hoạt động
- [x] TASK-07: Budget management hoạt động
- [x] TASK-08: Reports & Charts hoạt động
- [x] TASK-09: Chat integration E2E hoạt động
- [ ] Tất cả TASK-01 đến TASK-09 ở trạng thái ✅ DONE

---

## Chi tiết các subtask

### 10.1: Integration testing (E2E)

- [ ] Chuẩn bị test plan — có thể chạy manual hoặc viết script
- [ ] **Scenario 1: Chat → Parse → Confirm → Verify**
  - Gửi: "ăn phở 50k"
  - Expect: preview card hiển thị (description: "ăn phở", amount: 50000, category: "Ăn uống")
  - Nhấn Xác nhận
  - Verify: giao dịch xuất hiện trong transaction list
  - Verify: balance giảm 50000
- [ ] **Scenario 2: Chat → Parse → Edit → Confirm → Verify**
  - Gửi: "cà phê 30k"
  - Preview hiển thị
  - Nhấn Sửa → đổi amount thành 35000
  - Nhấn Xác nhận
  - Verify: transaction amount = 35000 (không phải 30000)
- [ ] **Scenario 3: Chat → Parse → Cancel → Verify**
  - Gửi: "mua áo 300k"
  - Preview hiển thị
  - Nhấn Hủy
  - Verify: không có transaction mới trong list
  - Verify: balance không thay đổi
- [ ] **Scenario 4: Chat → Ambiguous → Clarification → Confirm**
  - Gửi: "50k" (không rõ mô tả)
  - Expect: AI hỏi clarification
  - Trả lời: "ăn trưa"
  - Expect: preview card với description "ăn trưa", amount 50000
  - Xác nhận → verify
- [ ] **Scenario 5: Manual add → Verify**
  - Thêm giao dịch thủ công qua form (nếu có)
  - Verify: xuất hiện trong list + balance cập nhật
- [ ] **Scenario 6: Edit transaction → Verify balance**
  - Sửa transaction: expense 50k → expense 80k
  - Verify: balance thay đổi chênh lệch 30k
  - Sửa transaction: expense → income
  - Verify: balance thay đổi đúng
- [ ] **Scenario 7: Delete transaction → Verify balance**
  - Xóa transaction (soft delete)
  - Verify: balance reversed (cộng lại nếu expense, trừ nếu income)
  - Verify: transaction có `deleted_at` trong DB
- [ ] **Scenario 8: Restore transaction → Verify balance**
  - Xóa giao dịch → thấy toast "Hoàn tác"
  - Nhấn Hoàn tác (trong 30s)
  - Verify: transaction khôi phục, balance đúng lại
- [ ] **Scenario 9: Budget + Expenses → Progress**
  - Tạo budget: "Ăn uống" = 2.000.000 ₫ / tháng
  - Thêm vài chi tiêu "Ăn uống" tổng = 1.500.000 ₫
  - Verify: budget progress = 75%, warning (vàng)
  - Thêm chi tiêu tới 2.100.000 ₫
  - Verify: budget exceeded (> 100%), đỏ
- [ ] **Scenario 10: Reports → Verify charts**
  - Mở ReportScreen
  - Verify: summary card hiển thị đúng tổng thu/chi
  - Verify: pie chart có segments cho các categories đã chi
  - Verify: bar chart hiển thị tháng hiện tại có data
  - Đổi tháng → verify data reload
- [ ] **Scenario 11: Voice input trên điện thoại → Verify**
  - Nhấn nút micro trong Chat
  - Nói: "uống cà phê hết 50 nghìn"
  - Dừng ghi âm
  - Expect: text STT xuất hiện, preview giao dịch hiển thị đúng amount/category
  - Xác nhận → verify giao dịch được lưu
- [ ] **Scenario 12: Ảnh hóa đơn trên điện thoại → Verify**
  - Nhấn camera để chụp hóa đơn hoặc chọn ảnh từ thư viện
  - Expect: OCR/Vision trích text, chat tạo preview giao dịch
  - Xác nhận → verify giao dịch được lưu
- [ ] Ghi lại kết quả: PASS ✅ / FAIL ❌ cho mỗi scenario
- [ ] Fix mọi FAIL trước khi đánh dấu task done

### 10.2: AI accuracy testing

- [ ] Tạo file `backend/tests/ai-accuracy-test.js` (hoặc spreadsheet)
- [ ] **Bộ test câu tiếng Việt** (30+ câu):

  **Ăn uống (Food):**
  - [ ] "ăn phở 50k" → expense, 50000, Ăn uống
  - [ ] "cà phê sáng 30 nghìn" → expense, 30000, Ăn uống
  - [ ] "bún bò 45k" → expense, 45000, Ăn uống
  - [ ] "ăn trưa với đồng nghiệp 150k" → expense, 150000, Ăn uống
  - [ ] "trà sữa 55 nghìn" → expense, 55000, Ăn uống

  **Di chuyển (Transport):**
  - [ ] "đi grab 35k" → expense, 35000, Di chuyển
  - [ ] "đổ xăng 200 nghìn" → expense, 200000, Di chuyển
  - [ ] "gửi xe 5k" → expense, 5000, Di chuyển
  - [ ] "vé xe buýt 7 nghìn" → expense, 7000, Di chuyển

  **Mua sắm (Shopping):**
  - [ ] "mua áo 300k" → expense, 300000, Mua sắm
  - [ ] "shopping 1 triệu 5" → expense, 1500000, Mua sắm
  - [ ] "mua giày 800k" → expense, 800000, Mua sắm

  **Giải trí (Entertainment):**
  - [ ] "xem phim 150k" → expense, 150000, Giải trí
  - [ ] "karaoke 500 nghìn" → expense, 500000, Giải trí

  **Nhà cửa (Housing):**
  - [ ] "tiền nhà 3tr5" → expense, 3500000, Nhà cửa
  - [ ] "tiền trọ tháng 6 2 triệu" → expense, 2000000, Nhà cửa

  **Hóa đơn (Bills):**
  - [ ] "tiền điện 400k" → expense, 400000, Hóa đơn
  - [ ] "tiền nước 80 nghìn" → expense, 80000, Hóa đơn
  - [ ] "internet 200k" → expense, 200000, Hóa đơn
  - [ ] "tiền điện thoại 150k" → expense, 150000, Hóa đơn

  **Sức khỏe (Health):**
  - [ ] "khám bệnh 300k" → expense, 300000, Sức khỏe
  - [ ] "mua thuốc 120 nghìn" → expense, 120000, Sức khỏe

  **Thu nhập (Income):**
  - [ ] "nhận lương 15 triệu" → income, 15000000, Lương
  - [ ] "thưởng dự án 5tr" → income, 5000000, Thưởng
  - [ ] "lãi đầu tư 500k" → income, 500000, Đầu tư
  - [ ] "freelance 3 triệu" → income, 3000000, Thu nhập khác

  **Edge cases:**
  - [ ] "50k x 2 ly cà phê" → expense, 100000, Ăn uống
  - [ ] "mua 3 cái áo mỗi cái 200k" → expense, 600000, Mua sắm
  - [ ] "đi ăn hết 250k cho 2 người" → expense, 250000, Ăn uống
  - [ ] "tiền nhà + điện nước 4tr" → cần clarification hoặc tách

- [ ] **Chạy test và ghi nhận kết quả**:
  - Đúng hoàn toàn (amount + category + type): ✅
  - Đúng một phần (amount đúng nhưng category sai): ⚠️
  - Sai hoàn toàn: ❌
  - Target: **> 80% accuracy** (✅ / total)
- [ ] **Document failures**:
  - Ghi lại câu nào sai
  - Phân tích nguyên nhân (prompt issue, category matching, VND parsing)
  - Đề xuất cải thiện (update prompt, thêm examples)
- [ ] Nếu accuracy < 80%: cải thiện AI prompt và re-test

### 10.3: UI/UX polish

- [ ] **Color scheme nhất quán**:
  - Primary: màu chính app (ví dụ `#1A73E8` hoặc tùy design)
  - Income: `#4CAF50` (green) — toàn app
  - Expense: `#F44336` (red) — toàn app
  - Background: `#F5F5F5` hoặc `#FAFAFA`
  - Card: `#FFFFFF` với shadow nhẹ
  - Text primary: `#212121`, secondary: `#757575`
  - Verify: tất cả screens dùng đúng màu

- [ ] **Loading states**:
  - Dashboard: skeleton placeholders cho balance, summary, transaction list
  - Transaction list: skeleton cho mỗi item
  - Reports: skeleton cho charts
  - Budget: skeleton cho list
  - Chat: typing indicator (3 dots)
  - Dùng `ActivityIndicator` hoặc custom skeleton component

- [ ] **Empty states**:
  - Transaction list: "Chưa có giao dịch nào. Hãy nhắn cho PERFIN khoản thu chi đầu tiên!"
  - Budget list: "Chưa có ngân sách nào. Hãy thêm ngân sách để quản lý chi tiêu!"
  - Reports (no data): "Chưa có dữ liệu. Hãy thêm giao dịch để xem báo cáo!"
  - Chat (first time): Welcome message từ PERFIN
  - Mỗi empty state nên có illustration/icon + text + CTA button

- [ ] **Error states**:
  - Network error: "Không có kết nối mạng. Vui lòng thử lại." + nút Thử lại
  - Server error: "Có lỗi xảy ra. Vui lòng thử lại sau." + nút Thử lại
  - Not found: "Không tìm thấy dữ liệu"
  - Validation error: highlight field lỗi + message cụ thể

- [ ] **Vietnamese text audit**:
  - Review tất cả screens: không có text tiếng Anh trong UI
  - Button labels: tiếng Việt
  - Error messages: tiếng Việt
  - Placeholder text: tiếng Việt
  - Date format: dd/MM/yyyy (không phải MM/dd/yyyy)
  - Currency: format VND (dấu chấm, ₫)

- [ ] **Keyboard behavior**:
  - `KeyboardAvoidingView` cho tất cả screens có input
  - Tap outside input → dismiss keyboard
  - Chat screen: input bar đẩy lên khi keyboard hiện
  - Numeric input: `keyboardType="numeric"`

- [ ] **Safe area handling**:
  - Dùng `SafeAreaView` hoặc `useSafeAreaInsets`
  - Test trên devices có notch (iPhone X+)
  - Bottom tab bar không bị che bởi home indicator
  - Status bar: phù hợp với theme (light/dark content)

- [ ] **Typography nhất quán**:
  - Heading: 24px bold
  - Subheading: 18px semibold
  - Body: 16px regular
  - Caption: 14px, color secondary
  - Amount (large): 28px bold
  - Verify: tất cả screens tuân theo

### 10.4: Performance optimization

- [ ] **API response time** (excluding AI):
  - Target: < 200ms cho mọi endpoint
  - Đo bằng: `console.time()` trong middleware hoặc logging
  - Nếu chậm: check EXPLAIN ANALYZE cho SQL queries

- [ ] **AI call time**:
  - Target: < 3 giây
  - Implement timeout: 10s, fallback nếu quá lâu
  - Log response time để monitor
  - Cân nhắc: cache common queries (optional)

- [ ] **Transaction list scroll performance**:
  - Target: smooth scroll với 100+ items
  - Dùng `FlatList` với `initialNumToRender={10}`
  - `maxToRenderPerBatch={10}`
  - `windowSize={5}`
  - `getItemLayout` nếu item height cố định
  - `removeClippedSubviews={true}` trên Android

- [ ] **Chart render time**:
  - Target: < 2 giây
  - Nếu chậm: giảm data points, simplify chart config
  - Lazy load charts (chỉ render khi scroll vào view)

- [ ] **Database indexes**:
  - Chạy `EXPLAIN ANALYZE` cho các query phức tạp:
    - Budget progress query (JOIN budgets + transactions)
    - Report category breakdown (GROUP BY)
    - Report monthly trend (GROUP BY month)
    - Transaction list (ORDER BY date, WHERE user_id + deleted_at)
  - Tạo missing indexes:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
      ON transactions(user_id, transaction_date DESC) 
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date 
      ON transactions(user_id, type, transaction_date) 
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_budgets_user_period 
      ON budgets(user_id, month, year);
    ```

- [ ] **Frontend re-render optimization**:
  - `useMemo` cho computed values (format currency, filter lists)
  - `useCallback` cho event handlers truyền vào child components
  - `React.memo` cho pure components (BalanceDisplay, BudgetProgressBar)
  - Verify: không re-render không cần thiết (React DevTools Profiler)

### 10.5: Error handling audit

- [ ] **Consistent API error format**:
  - Tất cả endpoints trả về cùng format khi lỗi:
    ```json
    {
      "success": false,
      "error": "Mô tả lỗi tiếng Việt",
      "code": "ERROR_CODE"
    }
    ```
  - Error codes chuẩn:
    - `VALIDATION_ERROR` — input không hợp lệ
    - `NOT_FOUND` — resource không tìm thấy
    - `UNAUTHORIZED` — chưa đăng nhập
    - `FORBIDDEN` — không có quyền
    - `CONFLICT` — duplicate (ví dụ budget đã tồn tại)
    - `AI_ERROR` — lỗi từ AI service
    - `INTERNAL_ERROR` — lỗi server

- [ ] **Network errors (Frontend)**:
  - Detect: `catch` trong API calls, check `error.response` vs `error.request`
  - No response (network): "Không có kết nối mạng"
  - 401: redirect to login
  - 403: "Bạn không có quyền thực hiện thao tác này"
  - 404: "Không tìm thấy"
  - 500: "Lỗi hệ thống, vui lòng thử lại"

- [ ] **AI service errors**:
  - Timeout: fallback response + thông báo user
  - Rate limit: queue hoặc thông báo "thử lại sau"
  - Invalid response: log + generic error to user
  - API key invalid: log critical, generic error to user

- [ ] **Database errors**:
  - Transaction rollback khi INSERT/UPDATE fail
  - Unique violation (23505): trả về conflict message cụ thể
  - Connection error: retry 1 lần, rồi error
  - Không expose DB error details cho client

- [ ] **Input validation errors**:
  - Return specific field errors:
    ```json
    {
      "success": false,
      "error": "Dữ liệu không hợp lệ",
      "code": "VALIDATION_ERROR",
      "details": {
        "amount": "Số tiền phải lớn hơn 0",
        "category_id": "Vui lòng chọn danh mục"
      }
    }
    ```
  - Frontend: highlight field lỗi, hiển thị message dưới field

### 10.6: Documentation

- [ ] **Update `README.md`**:
  - MVP features list:
    - ✅ AI chatbot ghi nhận thu chi bằng ngôn ngữ tự nhiên
    - ✅ Quản lý giao dịch (CRUD)
    - ✅ Hệ thống danh mục 16 loại (8 chi + 8 thu)
    - ✅ Quản lý ví/tài khoản với balance tracking
    - ✅ Ngân sách theo danh mục/tháng
    - ✅ Báo cáo & biểu đồ (pie chart, bar chart)
    - ✅ Multi-AI support (Google Gemini + OpenAI ChatGPT)
  - Complete setup guide:
    - Prerequisites: Node.js 20+, PostgreSQL 15+, Expo CLI, npm/yarn
    - Clone repo
    - Backend setup: `cd backend && npm install && cp .env.example .env`
    - Env vars: DB_URL, GEMINI_API_KEY, OPENAI_API_KEY, JWT_SECRET, ...
    - Database: `npm run migrate`
    - Seed categories: `npm run seed:categories`
    - Seed demo data (optional): `npm run seed:demo`
    - Run backend: `npm run dev`
    - Frontend setup: `cd frontend && npm install`
    - Run frontend: `npx expo start`
  - API documentation table (summary)
  - Project structure overview

- [ ] **Tạo `doc/API.md`** — Full endpoint documentation:
  - Cho mỗi endpoint:
    - Method + URL
    - Auth: Required/Optional
    - Request body/params
    - Response format (success + error)
    - Example request/response
  - Sections:
    - Authentication (`/api/auth/*`)
    - Transactions (`/api/transactions/*`)
    - Accounts (`/api/accounts/*`)
    - Categories (`/api/categories/*`)
    - Budgets (`/api/budgets/*`)
    - Reports (`/api/reports/*`)
    - Chat (`/api/chat/*`)

- [ ] **Update LaTeX report** (Chương 3 — Kết quả):
  - Implementation details
  - Screenshots các màn hình chính
  - AI accuracy results
  - Performance metrics
  - Challenges & solutions

### 10.7: Demo data seed script

- [ ] Tạo file `backend/scripts/seed-demo.js`
- [ ] **Generate realistic 30-day transaction history**:
  - **Daily food expenses** (mỗi ngày):
    - Sáng: random 20k-50k (cà phê, bánh mì)
    - Trưa: random 35k-80k (cơm, phở, bún)
    - Tối: random 40k-100k (cơm, bún, lẩu)
    - Descriptions thực tế: "phở bò", "cơm gà", "bún chả", "trà sữa"
  - **Weekly transport** (2-3 lần/tuần):
    - Grab/taxi: random 25k-80k
    - Xăng: random 100k-250k (2 lần/tháng)
    - Gửi xe: 5k-10k
  - **Monthly bills** (1 lần/tháng):
    - Tiền nhà/trọ: 2.000.000 - 4.000.000
    - Tiền điện: 200k-500k
    - Tiền nước: 50k-150k
    - Internet: 150k-250k
    - Điện thoại: 100k-200k
  - **Monthly salary** (1 lần, đầu tháng):
    - Lương: 12.000.000 - 20.000.000
  - **Random shopping** (3-5 lần/tháng):
    - Quần áo, giày dép: 200k-800k
  - **Entertainment** (2-3 lần/tháng):
    - Xem phim: 100k-200k
    - Karaoke/cafe: 100k-500k
  - **Health** (1-2 lần/tháng):
    - Khám bệnh, thuốc: 100k-500k
  - **Cover all 16 categories** — đảm bảo mỗi category có ít nhất 1 transaction
  - **Total**: ~80-120 transactions

- [ ] **Set up budgets** cho 3-5 categories:
  - Ăn uống: 3.000.000 ₫
  - Di chuyển: 1.000.000 ₫
  - Giải trí: 500.000 ₫
  - Mua sắm: 1.500.000 ₫
  - Hóa đơn: 1.000.000 ₫

- [ ] **Verify demo data**:
  - Chạy seed → check dashboard hiển thị đúng
  - Check reports: pie chart có nhiều segments
  - Check budgets: có ít nhất 1 warning/exceeded
  - Charts meaningful (không toàn 0)

- [ ] **Script chạy được lặp lại**:
  - Clear existing demo data trước khi seed (nếu chạy lại)
  - Hoặc chỉ seed cho user cụ thể
  - Sử dụng: `node scripts/seed-demo.js --userId=<uuid>` hoặc `npm run seed:demo`

- [ ] **Thêm npm script** trong `package.json`:
  ```json
  {
    "scripts": {
      "seed:demo": "node scripts/seed-demo.js"
    }
  }
  ```

---

## Tiêu chí hoàn thành

- [ ] Tất cả 10 E2E test scenarios: ✅ PASS
- [ ] AI accuracy > 80% trên bộ test 30+ câu
- [ ] Không còn critical bugs (crash, data loss, wrong balance)
- [ ] App chạy mượt trên Expo Go (test trên thiết bị thực)
- [ ] Quyền micro, camera và thư viện ảnh được request đúng trên iOS/Android
- [ ] Voice và ảnh hóa đơn tạo được preview giao dịch trên thiết bị thật
- [ ] README.md đầy đủ: features, setup guide, API table
- [ ] `doc/API.md` có documentation cho tất cả endpoints
- [ ] Demo data seed script hoạt động, tạo data meaningful
- [ ] LaTeX report Chapter 3 cập nhật
- [ ] Tất cả screens có loading state, empty state, error state
- [ ] Vietnamese text throughout — không có English UI

---

## Ghi chú kỹ thuật

### Test execution tracking template
```markdown
| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Chat → Confirm → Verify | ⬜ | |
| 2 | Chat → Edit → Confirm | ⬜ | |
| 3 | Chat → Cancel | ⬜ | |
| 4 | Clarification flow | ⬜ | |
| 5 | Manual add transaction | ⬜ | |
| 6 | Edit transaction | ⬜ | |
| 7 | Delete transaction | ⬜ | |
| 8 | Restore transaction | ⬜ | |
| 9 | Budget progress | ⬜ | |
| 10 | Reports & charts | ⬜ | |
| 11 | Voice input trên điện thoại | ⬜ | |
| 12 | Ảnh hóa đơn trên điện thoại | ⬜ | |
```

### AI accuracy tracking template
```markdown
| # | Input | Expected | Actual | Status |
|---|-------|----------|--------|--------|
| 1 | "ăn phở 50k" | expense, 50000, Ăn uống | | ⬜ |
| 2 | "cà phê sáng 30 nghìn" | expense, 30000, Ăn uống | | ⬜ |
| ... | ... | ... | ... | ... |
```

### Demo seed script structure
```javascript
// backend/scripts/seed-demo.js
const { pool } = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

const CATEGORIES = { /* loaded from DB */ };

const generateDemoTransactions = (userId, month, year) => {
  const transactions = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    
    // Daily food (2-3 meals)
    transactions.push({
      description: randomChoice(['phở bò', 'cơm gà', 'bún chả', 'cơm văn phòng']),
      amount: randomBetween(35000, 80000),
      type: 'expense',
      category: 'Ăn uống',
      date,
    });
    
    // ... more generation logic
  }
  
  return transactions;
};

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // ... insert transactions
    // ... insert budgets
    await client.query('COMMIT');
    console.log('✅ Demo data seeded successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
```

### Thứ tự thực hiện khuyến nghị
1. Demo data seed script (10.7) — cần data để test
2. E2E testing (10.1) — tìm bugs
3. AI accuracy testing (10.2) — đánh giá + cải thiện
4. Fix bugs found in 10.1 + 10.2
5. UI/UX polish (10.3)
6. Performance optimization (10.4)
7. Error handling audit (10.5)
8. Documentation (10.6)
9. Final round of testing

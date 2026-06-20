# TASK-09: Tích hợp Chat End-to-End

| Thuộc tính | Giá trị |
|------------|---------|
| **Task ID** | TASK-09 |
| **Phase** | 4 — Integration & Polish |
| **Priority** | 🔴 Critical |
| **Status** | ✅ DONE |

> **⚠️ ĐÂY LÀ LUỒNG CHÍNH (CORE USER FLOW) CỦA MVP.**
> Mọi thứ hội tụ tại đây: AI parsing + Transaction CRUD + Wallet balance + Chat UI.
> User nhắn tin tự nhiên → AI parse → preview → xác nhận → lưu giao dịch → cập nhật số dư.

---

## Tổng quan

Tích hợp hoàn chỉnh luồng chat end-to-end: user gửi tin nhắn bằng tiếng Việt tự nhiên → AI phân tích và trích xuất thông tin giao dịch → hiển thị preview card để user xác nhận → lưu vào database → cập nhật số dư ví. Đồng thời xử lý các trường hợp: câu không rõ ràng (clarification), chỉnh sửa trước khi xác nhận, hủy giao dịch, và truy vấn thông tin (số dư, chi tiêu tháng).

**Luồng chính:**
```
User nhắn → AI parse → Preview card → [Xác nhận / Sửa / Hủy] → Lưu + Cập nhật balance
```

**Các luồng phụ:**
- Voice input: user ghi âm trên điện thoại → `/api/speech` → text → chat parse → preview
- Image input: user chụp/chọn ảnh hóa đơn → `/api/ocr` → text → chat parse → preview
- Clarification: AI chưa hiểu → hỏi lại → user trả lời → parse lại
- Query: "số dư", "chi tiêu tháng này" → trả về thông tin
- General chat: chào hỏi, hỏi đáp → AI response tự nhiên

---

## Điều kiện tiên quyết

- [x] TASK-01: Database schema deployed
- [x] TASK-02: Authentication hoạt động
- [x] TASK-03: AI service hoạt động (parseTransaction, chat)
- [x] TASK-04: Category system hoạt động
- [x] TASK-05: Transaction CRUD hoạt động
- [x] TASK-06: Account/Wallet system hoạt động (balance update)

---

## Chi tiết các subtask

### 9.1: Implement chat flow endpoint `POST /api/chat/message`

- [ ] Tạo/update file `backend/src/routes/chat.routes.js`
- [ ] Endpoint: `POST /api/chat/message`
  - Input: `{ text: string }`
  - Validate: `text` không rỗng, max 500 ký tự
- [ ] Luồng xử lý trong controller/service:
  ```
  1. Nhận text từ user
  2. Lưu message vào chat_messages (role: 'user')
  3. Load context: recent messages + user categories
  4. Gọi AI service: parseTransaction(text, user_categories, context)
  5. Phân loại response:
     a. Nếu AI trả về transaction hợp lệ → lưu pending → return preview
     b. Nếu AI cần clarification → return câu hỏi
     c. Nếu không phải transaction → return AI chat response
  6. Lưu AI response vào chat_messages (role: 'assistant')
  7. Return response cho frontend
  ```
- [ ] Response format:
  ```json
  {
    "success": true,
    "data": {
      "type": "transaction_preview",
      "message": "Mình hiểu bạn muốn ghi nhận chi tiêu:",
      "transaction": {
        "description": "ăn phở",
        "amount": 50000,
        "type": "expense",
        "category_id": "uuid",
        "category_name": "Ăn uống",
        "category_icon": "🍜",
        "transaction_date": "2026-06-20"
      },
      "pending_id": "uuid"
    }
  }
  ```
  ```json
  {
    "success": true,
    "data": {
      "type": "clarification",
      "message": "Bạn muốn ghi nhận 50k là chi tiêu hay thu nhập?"
    }
  }
  ```
  ```json
  {
    "success": true,
    "data": {
      "type": "chat_response",
      "message": "Chào bạn! Mình là PERFIN, trợ lý tài chính cá nhân. Bạn có thể nhắn cho mình các khoản thu chi hàng ngày nhé!"
    }
  }
  ```

### 9.2: Implement chat context management

- [ ] Tạo/update bảng `chat_messages` (nếu chưa có trong migration):
  ```sql
  CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX idx_chat_messages_user_time ON chat_messages(user_id, created_at DESC);
  ```
- [ ] Implement `chatMessage.model.js`:
  - `create({ userId, role, content, metadata })` — lưu tin nhắn
  - `getRecent(userId, limit = 10)` — lấy N tin nhắn gần nhất
  - `getByTimeWindow(userId, hours = 48)` — lấy tin nhắn trong X giờ
- [ ] Load context khi gọi AI:
  - Lấy 10 tin nhắn gần nhất HOẶC tin nhắn trong 48h (lấy ít hơn)
  - Format thành mảng `[{ role, content }]` cho AI API
  - Bao gồm cả system message nếu cần
- [ ] Clear pending transaction khi user gửi tin nhắn mới không liên quan:
  - Detect: nếu có pending transaction + tin nhắn mới không phải "confirm/edit/cancel"
  - Action: auto-cancel pending, log warning

### 9.3: Implement transaction confirmation flow

- [ ] `POST /api/chat/confirm` — Xác nhận giao dịch pending
  - Lấy pending transaction của user
  - Validate: pending tồn tại và chưa expire
  - Gọi `transaction.service.create()` với data từ pending
  - Gọi `account.model.updateBalance()` để cập nhật số dư
  - Clear pending state
  - Lưu system message: "✅ Đã lưu giao dịch"
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "type": "system_message",
        "message": "✅ Đã lưu giao dịch: ăn phở - 50.000 ₫ vào Ăn uống. Số dư hiện tại: 14.950.000 ₫",
        "transaction": { "...saved transaction data..." },
        "new_balance": 14950000
      }
    }
    ```

- [ ] `POST /api/chat/edit` — Sửa giao dịch pending
  - Body: `{ field: value }` — ví dụ `{ amount: 60000 }` hoặc `{ category_id: "uuid" }`
  - Validate: pending tồn tại
  - Update pending data với fields mới
  - Return preview card mới (updated)
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "type": "transaction_preview",
        "message": "Mình đã cập nhật. Bạn xác nhận nhé:",
        "transaction": { "...updated data..." },
        "pending_id": "uuid"
      }
    }
    ```

- [ ] `POST /api/chat/cancel` — Hủy giao dịch pending
  - Clear pending state
  - Lưu system message
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "type": "system_message",
        "message": "❌ Đã hủy giao dịch"
      }
    }
    ```

### 9.4: Implement pending transaction state

- [ ] Chọn storage cho pending state:
  - **Option A (Khuyến nghị cho MVP)**: In-memory Map
    ```javascript
    // pendingStore.js
    const pendingTransactions = new Map(); // key: userId, value: { data, createdAt }
    ```
    - Ưu: đơn giản, không cần thêm dependency
    - Nhược: mất khi restart server
  - **Option B (Production)**: Redis
    - `SET pending:${userId} JSON.stringify(data) EX 300` (5 min TTL)
    - Ưu: persistent, scalable
    - Nhược: cần setup Redis
- [ ] Implement `pendingTransaction.service.js`:
  - `set(userId, transactionData)` — lưu pending, auto-expire sau 5 phút
  - `get(userId)` — lấy pending (null nếu expired)
  - `update(userId, updates)` — update partial fields
  - `clear(userId)` — xóa pending
  - `exists(userId)` — check có pending không
- [ ] Auto-expire logic:
  - Mỗi pending có `createdAt` timestamp
  - Khi `get()`, check: `Date.now() - createdAt > 5 * 60 * 1000` → return null + auto clear
- [ ] Constraint: **1 pending transaction / user** tại 1 thời điểm
  - Nếu gửi transaction mới khi đang có pending → replace pending cũ

### 9.5: Refactor `ChatScreen.js`

- [ ] Cập nhật file `frontend/src/screens/ChatScreen.js`
- [ ] **Message types rendering**:
  - `TextBubble` — tin nhắn text (user + AI)
    - User: bubble bên phải, màu primary
    - AI: bubble bên trái, màu nhạt/trắng
  - `TransactionPreviewCard` — preview giao dịch (component riêng, xem 9.6)
    - Render khi `message.type === 'transaction_preview'`
  - `SystemMessage` — thông báo hệ thống
    - Centered, nhỏ hơn, màu xám hoặc highlight
    - Ví dụ: "✅ Đã lưu giao dịch", "❌ Đã hủy"
- [ ] **Message list** (`FlatList` hoặc `ScrollView`):
  - `data`: mảng messages từ state
  - `renderItem`: switch theo `message.type`
  - `inverted={true}` hoặc auto-scroll to bottom
  - `keyExtractor`: `message.id`
- [ ] **Auto-scroll**:
  - Scroll xuống tin nhắn mới nhất khi gửi/nhận
  - Dùng `ref.current.scrollToEnd()` hoặc `scrollToIndex`
- [ ] **Loading state**:
  - Khi chờ AI response → hiển thị typing indicator
  - 3 dots animation (bouncing dots)
  - Hiển thị ở vị trí tin nhắn AI tiếp theo
- [ ] **Input bar**:
  - TextInput + Send button
  - Disable send khi đang loading
  - Clear input sau khi gửi
  - Keyboard dismiss khi tap ngoài
- [ ] **Pull-to-load older messages**:
  - `onEndReached` (inverted list) hoặc pull-to-refresh
  - Load thêm messages từ API: `GET /api/chat/messages?before=timestamp`
- [ ] **State management**:
  - `messages`: mảng tin nhắn hiển thị
  - `isLoading`: đang chờ AI
  - `pendingTransaction`: data preview hiện tại (nếu có)

### 9.6: Implement `TransactionPreviewCard` component

- [ ] Tạo file `frontend/src/components/TransactionPreviewCard.js`
- [ ] **Display fields**:
  - Mô tả: "ăn phở"
  - Số tiền: `50.000 ₫` (format VND, bold, lớn)
  - Danh mục: icon + tên — "🍜 Ăn uống"
  - Ngày: "20/06/2026" (format dd/MM/yyyy)
  - Type badge: "Chi" (đỏ) hoặc "Thu" (xanh)
- [ ] **Action buttons** (3 nút ngang hàng):
  - ✅ **Xác nhận** — gọi `POST /api/chat/confirm`
    - Disable sau khi nhấn (prevent double-tap)
    - Loading spinner trên nút
  - ✏️ **Sửa** — chuyển sang edit mode
  - ❌ **Hủy** — gọi `POST /api/chat/cancel`
    - Confirm dialog: "Bạn có chắc muốn hủy?"
- [ ] **Edit mode** (khi nhấn "Sửa"):
  - Inline editable fields:
    - Amount: TextInput numeric, pre-filled
    - Category: dropdown picker (danh sách categories)
    - Date: DatePicker
    - Description: TextInput
  - 2 nút: "💾 Lưu thay đổi" (gọi `POST /api/chat/edit`) | "↩️ Bỏ qua"
- [ ] **Styling**:
  - Card elevated: shadow, border-radius 12px
  - Background: khác biệt với chat bubble (ví dụ gradient nhẹ hoặc border)
  - Chiều rộng: ~90% chat width
  - Margin/padding thoải mái

### 9.7: Success/error feedback messages

- [ ] Định nghĩa tất cả system messages trong `constants/chatMessages.js`:
  ```javascript
  export const CHAT_MESSAGES = {
    // Confirm success
    CONFIRM_SUCCESS: (desc, amount, category, balance) =>
      `✅ Đã lưu giao dịch: ${desc} - ${formatVND(amount)} vào ${category}. Số dư hiện tại: ${formatVND(balance)}`,
    
    // Cancel
    CANCEL_SUCCESS: '❌ Đã hủy giao dịch',
    
    // Error
    GENERIC_ERROR: '⚠️ Có lỗi xảy ra, vui lòng thử lại',
    AI_TIMEOUT: '⏳ AI đang bận, vui lòng thử lại sau giây lát',
    
    // Clarification
    CLARIFICATION: (question) => `🤔 Mình chưa hiểu rõ. ${question}`,
    
    // Edit success
    EDIT_SUCCESS: 'Mình đã cập nhật. Bạn xác nhận nhé:',
    
    // Greeting
    GREETING: 'Chào bạn! 👋 Mình là PERFIN, trợ lý tài chính cá nhân của bạn. Hãy nhắn cho mình các khoản thu chi hàng ngày nhé!',
    
    // Pending expired
    PENDING_EXPIRED: '⏰ Giao dịch chờ xác nhận đã hết hạn. Vui lòng nhập lại.',
  };
  ```
- [ ] Retry button cho error messages:
  - Hiển thị nút "Thử lại" bên dưới error message
  - Nhấn → gửi lại tin nhắn cuối cùng
- [ ] Success message bao gồm số dư mới để user thấy ngay tác động

### 9.8: Handle non-transaction queries in chat

- [ ] Implement query detection trong AI service hoặc middleware:
  - **Số dư / Balance queries**:
    - Keywords: "số dư", "balance", "còn bao nhiêu", "tài khoản"
    - Action: gọi `GET /api/accounts/balance`
    - Response: "💰 Số dư hiện tại: 14.950.000 ₫"
  - **Chi tiêu tháng queries**:
    - Keywords: "chi tiêu tháng", "tháng này chi", "đã tiêu bao nhiêu"
    - Action: gọi `GET /api/reports/summary?month=current`
    - Response: "📊 Tháng 6/2026:\n• Tổng thu: 15.000.000 ₫\n• Tổng chi: 8.500.000 ₫\n• Chênh lệch: +6.500.000 ₫"
  - **Chào hỏi / General**:
    - Keywords: "xin chào", "hello", "hi", "chào"
    - Response: greeting message tự nhiên từ AI
  - **Unknown / Không hiểu**:
    - Response: "Mình chưa hiểu câu này. Bạn có thể nhắn các khoản thu chi bằng ngôn ngữ tự nhiên, ví dụ: 'ăn phở 50k' hoặc 'nhận lương 15 triệu'."
- [ ] Implement trong AI prompt hoặc post-processing:
  - AI classify intent: `transaction`, `query_balance`, `query_spending`, `greeting`, `unknown`
  - Route tương ứng dựa trên intent

---

## Tiêu chí hoàn thành

- [ ] **Luồng chính hoàn chỉnh**: nhắn → preview → xác nhận → lưu → balance cập nhật
- [ ] **Voice flow trên mobile**: nhấn micro → ghi âm → dừng ghi → Speech-to-Text → preview giao dịch
- [ ] **Camera/gallery flow trên mobile**: chụp hoặc chọn ảnh hóa đơn → OCR/Vision → preview giao dịch
- [ ] **Clarification flow**: AI chưa hiểu → hỏi lại → user trả lời → parse lại → preview
- [ ] **Edit flow**: nhấn Sửa → chỉnh fields → lưu thay đổi → preview mới → xác nhận
- [ ] **Cancel flow**: nhấn Hủy → xác nhận hủy → không có gì được lưu
- [ ] **Chat history**: tin nhắn lưu lại, reload trang vẫn thấy
- [ ] **Non-transaction queries**: "số dư", "chi tiêu tháng" trả lời đúng
- [ ] **Response time** < 3 giây (bao gồm AI call)
- [ ] **Hoạt động trên Expo Go** (iOS + Android)
- [ ] **UI/UX**: preview card rõ ràng, buttons dễ nhấn, loading indicator

---

## Ghi chú kỹ thuật

### Luồng xử lý chi tiết (Sequence Diagram)
```
User                  Frontend            Backend              AI Service        Database
 |                       |                    |                     |                |
 |-- "ăn phở 50k" ----->|                    |                     |                |
 |                       |-- POST /chat/msg ->|                     |                |
 |                       |                    |-- save user msg --->|                |
 |                       |                    |-- parseTransaction->|                |
 |                       |                    |<-- transaction obj--|                |
 |                       |                    |-- save pending ---->|                |
 |                       |                    |-- save AI msg ----->|                |
 |                       |<-- preview card ---|                     |                |
 |<-- show preview ------|                    |                     |                |
 |                       |                    |                     |                |
 |-- tap "Xác nhận" ---->|                    |                     |                |
 |                       |-- POST /chat/conf->|                     |                |
 |                       |                    |-- INSERT transaction|--------------->|
 |                       |                    |-- UPDATE balance ---|--------------->|
 |                       |                    |-- clear pending --->|                |
 |                       |<-- success msg ----|                     |                |
 |<-- "✅ Đã lưu..." ----|                    |                     |                |
```

### Pending transaction in-memory store (MVP)
```javascript
// services/pendingTransaction.service.js
const store = new Map();
const EXPIRE_MS = 5 * 60 * 1000; // 5 phút

module.exports = {
  set(userId, data) {
    store.set(userId, { data, createdAt: Date.now() });
  },
  
  get(userId) {
    const entry = store.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > EXPIRE_MS) {
      store.delete(userId);
      return null;
    }
    return entry.data;
  },
  
  update(userId, updates) {
    const entry = store.get(userId);
    if (!entry) return null;
    entry.data = { ...entry.data, ...updates };
    return entry.data;
  },
  
  clear(userId) {
    store.delete(userId);
  },
  
  exists(userId) {
    return this.get(userId) !== null;
  }
};
```

### TransactionPreviewCard layout
```
┌──────────────────────────────────┐
│  💰 Chi tiêu                    │
│                                  │
│  ăn phở                          │
│  50.000 ₫                   🍜   │
│  Ăn uống · 20/06/2026           │
│                                  │
│  ┌────────┬────────┬────────┐   │
│  │✅ Xác  │✏️ Sửa │❌ Hủy  │   │
│  │  nhận  │        │        │   │
│  └────────┴────────┴────────┘   │
└──────────────────────────────────┘
```

### Error handling strategy
```javascript
// Trong chat controller
try {
  const aiResponse = await Promise.race([
    aiService.parseTransaction(text, categories),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI_TIMEOUT')), 10000)
    )
  ]);
  // ... process response
} catch (error) {
  if (error.message === 'AI_TIMEOUT') {
    return res.json({
      success: true,
      data: {
        type: 'system_message',
        message: CHAT_MESSAGES.AI_TIMEOUT
      }
    });
  }
  // ... other errors
}
```

### Thứ tự implement khuyến nghị
1. `pendingTransaction.service.js` → 2. `chatMessage.model.js` → 3. `POST /api/chat/message` (main flow) → 4. `POST /api/chat/confirm` → 5. `POST /api/chat/cancel` → 6. `POST /api/chat/edit` → 7. Test API bằng Postman → 8. `TransactionPreviewCard.js` → 9. Refactor `ChatScreen.js` → 10. Non-transaction queries → 11. Error handling + feedback messages

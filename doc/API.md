# 📖 PERFIN MVP — API Documentation

> **Base URL:** `http://localhost:3000`  
> **Auth:** MVP sử dụng `default_user` (không cần token). Tất cả request không cần header Authorization.  
> **Content-Type:** `application/json` (trừ upload endpoint dùng `multipart/form-data`)

---

## Response Format

### Thành công
```json
{
  "success": true,
  "data": { ... }
}
```

### Lỗi
```json
{
  "success": false,
  "error": "Mô tả lỗi tiếng Việt",
  "code": "ERROR_CODE"
}
```

**Error codes:** `VALIDATION_ERROR` | `NOT_FOUND` | `CONFLICT` | `AI_ERROR` | `INTERNAL_ERROR`

---

## 💬 Chat — `/api/chat`

### `POST /api/chat/message` — Gửi tin nhắn
User gửi văn bản, AI phân tích và trả về preview giao dịch hoặc chat response.

**Request:**
```json
{ "text": "ăn phở 50k" }
```

**Response (transaction preview):**
```json
{
  "success": true,
  "data": {
    "type": "transaction_preview",
    "message": "Mình hiểu bạn muốn ghi nhận giao dịch này:",
    "transaction": {
      "description": "ăn phở",
      "amount": 50000,
      "type": "expense",
      "category_id": "uuid",
      "category_name": "Ăn uống",
      "category_icon": "🍜",
      "transaction_date": "2026-06-26"
    },
    "pending_id": "uuid"
  }
}
```

**Response (clarification):**
```json
{
  "success": true,
  "data": {
    "type": "clarification",
    "message": "Bạn có thể nói rõ hơn giúp mình nhé?"
  }
}
```

**Response (general chat):**
```json
{
  "success": true,
  "data": {
    "type": "chat_response",
    "message": "Chào bạn! Mình có thể giúp ghi nhận thu chi..."
  }
}
```

---

### `POST /api/chat/confirm` — Xác nhận giao dịch pending

**Request:** `{}` (body rỗng)

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "system_message",
    "message": "Đã lưu giao dịch: ăn phở - 50.000 ₫ vào Ăn uống. Số dư hiện tại: 14.950.000 ₫",
    "transaction": { "...saved transaction..." },
    "new_balance": 14950000
  }
}
```

---

### `POST /api/chat/edit` — Chỉnh sửa giao dịch pending

**Request:**
```json
{ "amount": 60000, "description": "phở bò tái" }
```

**Response:** Giống `transaction_preview` với data đã cập nhật.

---

### `POST /api/chat/cancel` — Hủy giao dịch pending

**Response:**
```json
{
  "success": true,
  "data": { "type": "system_message", "message": "Đã hủy giao dịch" }
}
```

---

### `GET /api/chat/messages` — Lịch sử chat

**Query params:** `?limit=30`

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "role": "user", "content": "ăn phở 50k", "metadata": {}, "created_at": "..." },
    { "id": "uuid", "role": "assistant", "content": "...", "metadata": { "type": "transaction_preview", ... }, "created_at": "..." }
  ]
}
```

---

## 💰 Transactions — `/api/transactions`

### `GET /api/transactions` — Lấy danh sách giao dịch

**Query params:**
| Param | Type | Mô tả |
|-------|------|-------|
| `limit` | int | Số lượng (default 20, max 100) |
| `page` | int | Trang (default 1) |
| `type` | string | `income` hoặc `expense` |
| `from` | date | `YYYY-MM-DD` |
| `to` | date | `YYYY-MM-DD` |
| `category_id` | uuid | Lọc theo danh mục |
| `search` | string | Tìm trong mô tả |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "description": "ăn phở",
      "amount": "50000",
      "type": "expense",
      "category_id": "uuid",
      "category_name": "Ăn uống",
      "category_icon": "🍜",
      "wallet_name": "Tiền mặt",
      "transaction_date": "2026-06-26",
      "source": "ai_chat",
      "created_at": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

---

### `POST /api/transactions` — Tạo giao dịch mới

**Request:**
```json
{
  "description": "ăn phở",
  "amount": 50000,
  "type": "expense",
  "category_id": "uuid",
  "transaction_date": "2026-06-26",
  "note": "Ghi chú tùy chọn"
}
```

**Response:** Object giao dịch đầy đủ + `wallet_balance`.

---

### `GET /api/transactions/:id` — Lấy chi tiết giao dịch

**Response:** Object giao dịch đầy đủ.

---

### `PUT /api/transactions/:id` — Cập nhật giao dịch

**Request:** Bất kỳ field nào muốn cập nhật: `description`, `amount`, `type`, `category_id`, `transaction_date`, `note`.

---

### `DELETE /api/transactions/:id` — Xoá giao dịch (soft delete)

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted_at": "...",
    "restore_deadline": "..." // 30 giây để khôi phục
  }
}
```

---

### `POST /api/transactions/:id/restore` — Khôi phục giao dịch (trong 30 giây)

---

### `PATCH /api/transactions/:id/category` — Đổi danh mục

**Request:** `{ "category_id": "uuid" }`

---

### `GET /api/transactions/summary` — Tổng thu/chi theo tháng

**Query:** `?month=6&year=2026`

**Response:**
```json
{
  "success": true,
  "data": {
    "month": 6, "year": 2026,
    "total_income": 15000000,
    "total_expense": 8500000,
    "net": 6500000,
    "transaction_count": 85
  }
}
```

---

## 🏦 Accounts — `/api/accounts`

### `GET /api/accounts` — Lấy tất cả ví

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Tiền mặt", "type": "cash", "balance": "14950000", "is_default": true }
  ]
}
```

---

### `GET /api/accounts/balance` — Tổng số dư

**Response:**
```json
{
  "success": true,
  "data": { "total_balance": 14950000 }
}
```

---

### `POST /api/accounts` — Tạo ví mới

**Request:** `{ "name": "Tài khoản ngân hàng", "type": "bank", "balance": 10000000 }`

---

### `PUT /api/accounts/:id` — Cập nhật ví

**Request:** `{ "name": "Tên mới" }`

---

## 🏷️ Categories — `/api/categories`

### `GET /api/categories` — Lấy tất cả danh mục

**Query:** `?type=expense` hoặc `?type=income` (tùy chọn)

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Ăn uống", "type": "expense", "icon": "🍜", "is_default": true, "sort_order": 1 }
  ]
}
```

---

### `POST /api/categories` — Tạo danh mục tùy chỉnh

**Request:**
```json
{ "name": "Thú cưng", "type": "expense", "icon": "🐾" }
```

---

### `PUT /api/categories/:id` — Cập nhật danh mục (không phải default)

**Request:** `{ "name": "Tên mới", "icon": "🆕" }`

---

### `DELETE /api/categories/:id` — Xoá danh mục (không phải default, không có transaction)

---

## 💡 Budgets — `/api/budgets`

### `GET /api/budgets` — Lấy danh sách ngân sách

**Query:** `?month=6&year=2026`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category_id": "uuid",
      "category_name": "Ăn uống",
      "category_icon": "🍜",
      "amount_limit": "3000000",
      "month": 6, "year": 2026
    }
  ]
}
```

---

### `POST /api/budgets` — Tạo ngân sách

**Request:**
```json
{
  "category_id": "uuid",
  "amount_limit": 3000000,
  "month": 6,
  "year": 2026
}
```

---

### `GET /api/budgets/progress` — Tiến độ ngân sách (với spending)

**Query:** `?month=6&year=2026`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "budget_id": "uuid",
      "category_name": "Ăn uống",
      "category_icon": "🍜",
      "amount_limit": 3000000,
      "spent": 1850000,
      "remaining": 1150000,
      "percentage": 61.7,
      "status": "warning"
    }
  ]
}
```

**Status values:** `safe` (<70%) | `warning` (70–90%) | `danger` (90–100%) | `exceeded` (>100%)

---

### `PUT /api/budgets/:id` — Cập nhật mức ngân sách

**Request:** `{ "amount_limit": 4000000 }`

---

### `DELETE /api/budgets/:id` — Xoá ngân sách

---

## 📊 Reports — `/api/reports`

### `GET /api/reports/summary` — Tổng hợp thu/chi tháng

**Query:** `?month=6&year=2026`

**Response:** Giống `/api/transactions/summary`.

---

### `GET /api/reports/category-breakdown` — Phân tích theo danh mục

**Query:** `?month=6&year=2026`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category_id": "uuid",
      "category_name": "Ăn uống",
      "icon": "🍜",
      "total": 1850000,
      "percentage": 35.2,
      "transaction_count": 45
    }
  ]
}
```

---

### `GET /api/reports/monthly-trend` — Xu hướng 12 tháng

**Query:** `?year=2026`

**Response:**
```json
{
  "success": true,
  "data": [
    { "month": 1, "month_name": "T1", "income": 15000000, "expense": 8200000, "net": 6800000 },
    { "month": 2, "month_name": "T2", "income": 15000000, "expense": 9100000, "net": 5900000 }
  ]
}
```

---

## 🤖 AI — `/api/ai`

### `GET /api/ai/models` — Danh sách models khả dụng

**Response:**
```json
{
  "success": true,
  "data": {
    "gemini": { "status": "available", "selected": "gemini-2.5-flash", "models": ["gemini-2.5-flash", ...] },
    "chatgpt": { "status": "not_configured", "selected": "gpt-4o-mini", "models": [] },
    "local": { "status": "available", "selected": "local", "models": ["local"] }
  },
  "status": {
    "selected_provider": "gemini",
    "selected_models": { "gemini": "gemini-2.5-flash", "chatgpt": "gpt-4o-mini" }
  }
}
```

---

### `POST /api/ai/selection` — Chọn AI provider/model

**Request:**
```json
{ "provider": "gemini", "model": "gemini-2.5-flash" }
```

---

### `POST /api/ai/parse` — Parse trực tiếp (debug)

**Request:** `{ "text": "ăn phở 50k" }`

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "transaction",
    "transaction": {
      "description": "ăn phở",
      "amount": 50000,
      "type": "expense",
      "category_name": "Ăn uống",
      "confidence": 0.95
    },
    "provider_used": "gemini",
    "model": "gemini-2.5-flash"
  }
}
```

---

### `POST /api/ai/ocr` (alias: `POST /api/ocr`) — OCR ảnh hóa đơn

**Request:** `multipart/form-data`, field: `image`

**Response:** `{ "success": true, "text": "Nội dung text trích xuất từ ảnh" }`

---

### `POST /api/ai/speech` (alias: `POST /api/speech`) — Speech-to-Text

**Request:** `multipart/form-data`, field: `audio`

**Response:** `{ "success": true, "text": "Nội dung đã nhận dạng từ giọng nói" }`

---

## 🔧 System

### `GET /` — Health check

**Response:** `{ "success": true, "message": "PERFIN MVP API is running" }`

### `GET /api/test-db` — Kiểm tra kết nối DB

**Response:** `{ "success": true, "data": { "now": "..." } }`

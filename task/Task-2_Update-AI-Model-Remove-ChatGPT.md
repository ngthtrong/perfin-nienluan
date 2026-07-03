# Task 2: Cập nhật Model mặc định & Xóa ChatGPT trong Chat AI

## 🎯 Mục tiêu

1. Đặt model mặc định là **Gemini 3.1 Flash Lite** (`gemini-3.1-flash-lite`) — *(kiểm tra tên model chính xác trên Google AI Studio)*
2. Giới hạn lựa chọn model chỉ còn: **2.5 Flash, 2.5 Flash Lite, 3 Flash, 3.5 Flash**
3. **Xóa hoàn toàn lựa chọn ChatGPT** khỏi cả backend lẫn frontend

## 📍 File cần sửa

### Backend

#### 1. `demo/v1/backend/services/ai.service.js`

**Hiện trạng:**
```javascript
// Default models
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Fallback lists
const GEMINI_FALLBACK = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
const CHATGPT_FALLBACK = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'];

// Provider selection: 'auto', 'gemini', 'chatgpt', 'local'
const AI_PROVIDER = process.env.AI_PROVIDER || 'auto';
```

**Cần sửa thành:**
```javascript
// Default model: Gemini 3.1 Flash Lite
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

// Chỉ cho phép các model Gemini sau:
const ALLOWED_MODELS = [
  'gemini-3.1-flash-lite',  // Mặc định
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.0-flash',       // Kiểm tra tên chính xác
  'gemini-3.5-flash',       // Kiểm tra tên chính xác
];

// Fallback list (theo thứ tự ưu tiên)
const GEMINI_FALLBACK = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.0-flash',
  'gemini-3.5-flash',
];

// XÓA: Tất cả biến và code liên quan đến ChatGPT/OpenAI
// - OPENAI_MODEL
// - CHATGPT_FALLBACK
// - Provider 'chatgpt' trong AI_PROVIDER
// - Hàm fetch đến api.openai.com
// - Logic auto-fallback sang ChatGPT
```

**Chi tiết các thay đổi trong `ai.service.js`:**

1. **Xóa biến OPENAI:**
   - Xóa `OPENAI_MODEL`, `OPENAI_API_KEY`, `CHATGPT_FALLBACK`
   
2. **Xóa logic ChatGPT trong class `AIServiceManager`:**
   - Xóa method/logic liên quan đến ChatGPT fetch (URL `api.openai.com`)
   - Xóa case `'chatgpt'` trong `setSelection()`
   - Xóa ChatGPT models khỏi `getModels()`
   - Trong `parseTransaction()`: xóa fallback sang ChatGPT, chỉ giữ Gemini → Local
   - Trong `chat()`: tương tự, xóa ChatGPT fallback

3. **Cập nhật `getModels()`:**
   - Chỉ trả về models trong `ALLOWED_MODELS`
   - Filter kết quả từ Gemini API để chỉ hiển thị models được phép

4. **Cập nhật `setSelection()`:**
   - Validate model phải nằm trong `ALLOWED_MODELS`
   - Reject provider !== 'gemini' và provider !== 'local'

5. **Cập nhật `getStatus()`:**
   - Không trả về thông tin ChatGPT

#### 2. `demo/v1/backend/.env`

**Cần sửa:**
```env
# Xóa dòng:
OPENAI_API_KEY =sk-proj-...

# Thêm/sửa:
GEMINI_MODEL=gemini-3.1-flash-lite
AI_PROVIDER=gemini
```

> ⚠️ Lưu ý: Dòng `OPENAI_API_KEY` hiện tại có **space trước dấu `=`** (`OPENAI_API_KEY =sk-proj...`) → dotenv có thể parse sai. Dù sao cũng xóa luôn.

#### 3. `demo/v1/backend/routes/ai.routes.js`

- Xóa references đến ChatGPT trong comments/docs nếu có
- Đảm bảo endpoint `POST /api/ai/selection` reject provider 'chatgpt'

---

### Frontend

#### 4. `demo/v1/frontend/src/screens/ChatScreen.js`

**Hiện trạng:** AI Model Selection UI hiển thị 3 provider chips:
```javascript
// Provider metadata hiện tại
{
  gemini: { label: 'Gemini', icon: 'auto-awesome' },
  chatgpt: { label: 'ChatGPT', icon: 'smart-toy' },
  local: { label: 'Local', icon: 'memory' }
}
```

**Cần sửa:**
```javascript
// Chỉ giữ Gemini và Local
{
  gemini: { label: 'Gemini', icon: 'auto-awesome' },
  local: { label: 'Local', icon: 'memory' }
}
```

**Các thay đổi cụ thể:**

1. **Xóa ChatGPT chip** khỏi UI provider selector
2. **Cập nhật model list:** Chỉ hiển thị models trong allowed list
3. **Cập nhật default state:** Model mặc định là `gemini-3.1-flash-lite`
4. **Cập nhật fallback config:** Khi API unreachable, default về `gemini` provider (không phải `local`)

---

## 🔍 Kiểm tra tên Model chính xác

> **QUAN TRỌNG:** Trước khi sửa code, cần xác nhận tên model API chính xác trên Google AI Studio hoặc qua API:

```bash
# Liệt kê models có sẵn qua Gemini API
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY" \
  | jq '.models[] | .name'
```

Các model cần xác nhận tên chính xác:
- `gemini-3.1-flash-lite` — Model mặc định (có thể là `gemini-3.1-flash-lite-001` hoặc tên khác)
- `gemini-2.5-flash` — Đã biết hoạt động
- `gemini-2.5-flash-lite` — Đã biết hoạt động
- `gemini-3.0-flash` — Cần xác nhận (có thể là `gemini-3-flash` hoặc `gemini-3.0-flash`)
- `gemini-3.5-flash` — Cần xác nhận (có thể là `gemini-3.5-flash-preview`)

---

## ✅ Checklist sau khi sửa

- [ ] Backend khởi động không lỗi
- [ ] `GET /api/ai/models` chỉ trả về 5 model Gemini cho phép (+ Local)
- [ ] `GET /api/ai/status` hiển thị default model là `gemini-3.1-flash-lite`
- [ ] `POST /api/ai/selection` reject provider `chatgpt` → trả 400
- [ ] Frontend không hiển thị chip "ChatGPT"
- [ ] Frontend hiển thị đúng 5 models + Local option
- [ ] Chat vẫn hoạt động bình thường với model mới
- [ ] Parse transaction vẫn chính xác
- [ ] Không còn reference nào đến `openai` / `chatgpt` / `gpt-4` trong code (grep kiểm tra)

## ⚠️ Lưu ý

- **Không xóa logic Local parser** — vẫn giữ làm fallback khi Gemini API không khả dụng
- **Giữ nguyên cấu trúc code** — chỉ xóa phần ChatGPT, không refactor lớn
- Sau khi sửa, chạy: `grep -ri "openai\|chatgpt\|gpt-4\|gpt-3" demo/v1/` để đảm bảo clean
- Tên model có thể thay đổi theo thời gian → nên dùng env var `GEMINI_MODEL` để dễ cập nhật

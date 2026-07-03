# TASK-03: Xây dựng AI Service (Gemini + ChatGPT Fallback)

| Thuộc tính | Giá trị |
|---|---|
| **Task ID** | TASK-03 |
| **Phase** | 1 — AI Core |
| **Priority** | 🔴 Critical |
| **Status** | ✅ DONE |
| **Depends on** | TASK-01 (categories trong DB), TASK-02 (project structure, services/, prompts/) |
| **Blocked by** | TASK-02 |

---

## Tổng quan

Xây dựng AI Service layer cho PERFIN — trái tim của ứng dụng. Service này nhận câu tiếng Việt từ user (ví dụ: "ăn phở hết 50k"), gọi AI (Gemini hoặc ChatGPT) để parse thành structured transaction data, validate output, và trả về kết quả.

**Kiến trúc:**
```
User Input (Vietnamese text)
    ↓
AIServiceManager (auto/gemini/chatgpt)
    ↓
┌─────────────────┐    fallback    ┌──────────────────┐
│  GeminiService   │ ───────────→ │  ChatGPTService   │
│  (gemini-2.5-flash)              │  (gpt-4o-mini)   │
└─────────────────┘               └──────────────────┘
    ↓
ParserService (validate + normalize)
    ↓
Structured Transaction JSON
```

**Hai use cases chính:**
1. **Parse transaction:** "ăn phở 50k" → `{ description: "Ăn phở", amount: 50000, type: "expense", category: "Ăn uống", date: "2026-06-20" }`
2. **General chat:** "tháng này chi bao nhiêu rồi?" → AI trả lời dựa trên context tài chính
3. **Multimodal input:** giọng nói/ảnh hóa đơn → Speech-to-Text hoặc Vision/OCR → text tiếng Việt → parse transaction như input text.

---

## Điều kiện tiên quyết

- [ ] TASK-01 hoàn thành: categories đã seed trong database
- [ ] TASK-02 hoàn thành: project structure đã setup (services/, prompts/, routes/)
- [ ] `@google/genai` package đã cài (có sẵn trong demo/v1)
- [ ] `openai` package đã cài (TASK-02 subtask 2.8)
- [ ] Env vars đã set: `GEMINI_API_KEY`, `OPENAI_API_KEY`
- [ ] Env vars Google Cloud đã set: `GOOGLE_APPLICATION_CREDENTIALS` cho Vision và Speech-to-Text
- [ ] Hiểu rõ Gemini 2.5 Flash JSON mode API
- [ ] Hiểu rõ OpenAI Chat Completions API với JSON mode

---

## Chi tiết các subtask

### 3.1 — Thiết kế Prompt Template (`prompts/transaction.prompt.js`)

- [ ] **System Prompt** — Định nghĩa role và rules cho AI:
  ```
  Bạn là PERFIN AI — trợ lý tài chính cá nhân thông minh.
  Nhiệm vụ: Phân tích câu tiếng Việt của người dùng và trích xuất thông tin giao dịch tài chính.
  ```

- [ ] **Output JSON Schema** — Định nghĩa rõ format output:
  ```json
  {
    "intent": "transaction | question | greeting | unclear",
    "transaction": {
      "description": "string — mô tả ngắn gọn giao dịch",
      "amount": "number — số tiền (đơn vị: VND, số nguyên)",
      "type": "string — 'income' hoặc 'expense'",
      "category_name": "string — tên danh mục khớp với danh sách",
      "date": "string — ngày giao dịch format YYYY-MM-DD",
      "confidence": "number — độ tin cậy 0.0 đến 1.0"
    },
    "needs_clarification": "boolean — true nếu cần hỏi thêm",
    "clarification_message": "string|null — câu hỏi làm rõ",
    "chat_response": "string|null — câu trả lời cho câu hỏi"
  }
  ```

- [ ] **Danh sách categories** — Inject dynamic từ DB:
  ```
  DANH MỤC CHI TIÊU (expense): Ăn uống, Di chuyển, Mua sắm, Giải trí, Sức khỏe, Giáo dục, Nhà cửa, Hóa đơn & Dịch vụ, Tạp hóa, Điện tử, Thể thao, Làm đẹp, Khác
  DANH MỤC THU NHẬP (income): Lương, Thưởng, Đầu tư, Khác
  ```

- [ ] **Quy tắc xử lý ngày:**
  - Không đề cập ngày → dùng ngày hôm nay
  - "hôm nay" → today
  - "hôm qua" → yesterday
  - "hôm kia" → 2 days ago
  - "thứ 2 tuần trước" → last Monday
  - "ngày 15" → ngày 15 tháng hiện tại
  - "15/6" hoặc "15-6" → 15/06/năm hiện tại

- [ ] **Quy tắc parse tiền VND:**
  - `k` hoặc `nghìn` hoặc `ngàn` = ×1,000
  - `triệu` hoặc `tr` = ×1,000,000
  - `củ` = ×1,000,000
  - `tỷ` = ×1,000,000,000
  - `3tr5` = 3,500,000
  - `1.5 triệu` = 1,500,000
  - Dấu chấm ngăn cách nghìn: `1.500.000` = 1500000
  - Phép tính: `50k x 3` = 150,000

- [ ] **Few-shot examples** (tối thiểu 8):

  | Input | Expected Output |
  |---|---|
  | "ăn phở hết 50k" | expense, Ăn uống, 50000, today |
  | "nhận lương tháng 6 là 15 triệu" | income, Lương, 15000000, today |
  | "đi grab 35 nghìn" | expense, Di chuyển, 35000, today |
  | "mua sách 120k hôm qua" | expense, Giáo dục, 120000, yesterday |
  | "cà phê sáng 30k" | expense, Ăn uống, 30000, today |
  | "tiền nhà tháng 6 là 3tr5" | expense, Nhà cửa, 3500000, today |
  | "mua iphone 25 triệu" | expense, Điện tử, 25000000, today |
  | "đóng tiền điện 500 nghìn" | expense, Hóa đơn & Dịch vụ, 500000, today |

- [ ] **Export functions:**
  - `getSystemPrompt(categories, today)` — trả về system prompt string
  - `getParsePrompt(userText)` — trả về user prompt cho parse
  - `getChatPrompt(userText, context)` — trả về user prompt cho chat
  - `getFewShotExamples()` — trả về array few-shot examples

### 3.2 — Implement `GeminiService` trong `services/ai.service.js`

- [ ] Import `@google/genai` SDK
- [ ] Khởi tạo client: `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })`
- [ ] Model: `gemini-2.5-flash`
- [ ] **Method `parseTransaction(text, categories)`:**
  - Build prompt từ template (subtask 3.1)
  - Gọi Gemini với JSON mode: `response_mime_type: 'application/json'`
  - Truyền `generationConfig`:
    ```javascript
    {
      responseMimeType: 'application/json',
      temperature: 0.1,      // low for consistent parsing
      maxOutputTokens: 1024,
    }
    ```
  - Parse JSON response
  - Return structured data
  - Timeout: 10 seconds (AbortController)
- [ ] **Method `chat(text, context)`:**
  - Build chat prompt với context (balance, recent transactions)
  - Gọi Gemini (text mode, không JSON mode)
  - Temperature: 0.7 (creative cho chat)
  - Return string response
- [ ] **Error handling:**
  - Catch `GoogleGenerativeAIError`
  - Catch timeout (AbortController)
  - Catch JSON parse errors
  - Return `{ success: false, error: 'message', provider: 'gemini' }`
- [ ] **Logging:** Log mỗi request: prompt length, response time, success/fail

### 3.3 — Implement `ChatGPTService` (Fallback)

- [ ] Import `openai` SDK
- [ ] Khởi tạo: `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`
- [ ] Model: `gpt-4o-mini`
- [ ] **Method `parseTransaction(text, categories)`:**
  - Same prompt template như Gemini
  - Gọi ChatGPT Chat Completions API:
    ```javascript
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1024,
    })
    ```
  - Parse `choices[0].message.content` as JSON
  - Return structured data
  - Timeout: 15 seconds
- [ ] **Method `chat(text, context)`:**
  - Same logic, text response (không JSON mode)
  - Temperature: 0.7
- [ ] **Error handling:** Same pattern như GeminiService
- [ ] **Logging:** Same pattern, log `provider: 'chatgpt'`

### 3.4 — Implement `AIServiceManager` (Factory/Strategy Pattern)

- [ ] Env var: `AI_PROVIDER` — giá trị: `gemini`, `chatgpt`, `auto` (default: `auto`)
- [ ] **Constructor:**
  - Khởi tạo `GeminiService` instance
  - Khởi tạo `ChatGPTService` instance
  - Đọc `AI_PROVIDER` từ env
- [ ] **Method `parseTransaction(text, categories)`:**
  - **Mode `gemini`:** chỉ dùng Gemini, throw nếu fail
  - **Mode `chatgpt`:** chỉ dùng ChatGPT, throw nếu fail
  - **Mode `auto`:**
    1. Try Gemini
    2. If Gemini fails → log warning → try ChatGPT
    3. If ChatGPT fails → return error
    4. Include `provider_used` trong response
  - Log: `[AIService] Using ${provider} for parseTransaction`
- [ ] **Method `chat(text, context)`:**
  - Same fallback pattern
- [ ] **Health check method `getStatus()`:**
  - Return: `{ gemini: 'available'|'error', chatgpt: 'available'|'error', mode: 'auto' }`
- [ ] Export singleton: `module.exports = new AIServiceManager()`

### 3.5 — Implement `parser.service.js`

- [ ] **`validateParsedTransaction(data)`:**
  - Required fields: `description`, `amount`, `type`, `category_name`
  - `description`: non-empty string, max 200 chars
  - `amount`: positive number, > 0, <= 100,000,000,000 (100 tỷ)
  - `type`: must be `'income'` or `'expense'`
  - `category_name`: non-empty string
  - `date`: valid date string (YYYY-MM-DD), not in future > 1 year
  - Return: `{ valid: true }` hoặc `{ valid: false, errors: ['...'] }`

- [ ] **`normalizeAmount(amountStr)`:**
  - Input: string hoặc number
  - Nếu là number → return as is
  - Parse suffixes: `k/K` → ×1000, `tr/triệu` → ×1000000, `củ` → ×1000000, `tỷ` → ×1000000000
  - Handle `3tr5` → 3500000 (regex: `/(\d+)tr(\d+)/`)
  - Handle `1.5 triệu` → 1500000
  - Remove dots dùng làm separator nghìn: `1.500.000` → 1500000
  - Handle arithmetic: `50k x 2` → 100000 (basic multiply only)
  - Return: number (integer VND)
  - Return `null` nếu không parse được

- [ ] **`matchCategory(categoryName, categories)`:**
  - Input: AI output category name, DB categories list
  - Exact match (case insensitive): "Ăn uống" === "ăn uống" ✅
  - Normalize diacritics: "an uong" → match "Ăn uống" ✅
  - Partial match: "ăn" → match "Ăn uống" ✅ (nếu unique)
  - Common aliases:
    - "đồ ăn", "ăn", "ăn uống", "thức ăn" → Ăn uống
    - "đi lại", "xe", "xăng", "grab", "taxi" → Di chuyển
    - "mua đồ", "shopping" → Mua sắm
    - "hóa đơn", "bill", "dịch vụ" → Hóa đơn & Dịch vụ
    - "nhà", "phòng trọ", "thuê nhà" → Nhà cửa
  - Default: "Khác" (expense hoặc income tùy type)
  - Return: matched category object từ DB

- [ ] **`handleMissingFields(parsedData)`:**
  - Nếu thiếu `date` → default today
  - Nếu thiếu `amount` → `needs_clarification: true`, message: "Bạn chi bao nhiêu tiền?"
  - Nếu thiếu `description` → dùng category name
  - Nếu `confidence < 0.5` → `needs_clarification: true`, message: "Mình hiểu đúng không: [summary]?"
  - Return processed data

### 3.6 — Tạo route `POST /api/ai/parse-transaction`

- [ ] Endpoint: `POST /api/ai/parse-transaction`
- [ ] **Request body:**
  ```json
  {
    "text": "ăn phở hết 50k"
  }
  ```
- [ ] **Flow:**
  1. Validate input (text non-empty, max 500 chars)
  2. Fetch categories từ DB
  3. Call `AIServiceManager.parseTransaction(text, categories)`
  4. Call `ParserService.validateParsedTransaction(result)`
  5. Call `ParserService.matchCategory(result.category_name, categories)`
  6. Call `ParserService.handleMissingFields(result)`
  7. Return response
- [ ] **Response (success):**
  ```json
  {
    "success": true,
    "intent": "transaction",
    "transaction": {
      "description": "Ăn phở",
      "amount": 50000,
      "type": "expense",
      "category_id": 1,
      "category_name": "Ăn uống",
      "category_icon": "🍜",
      "date": "2026-06-20",
      "confidence": 0.95
    },
    "needs_clarification": false,
    "clarification_message": null,
    "provider_used": "gemini"
  }
  ```
- [ ] **Response (needs clarification):**
  ```json
  {
    "success": true,
    "intent": "transaction",
    "transaction": { "description": "...", "amount": null },
    "needs_clarification": true,
    "clarification_message": "Bạn chi bao nhiêu tiền cho việc này?",
    "provider_used": "gemini"
  }
  ```
- [ ] **Response (chat/question):**
  ```json
  {
    "success": true,
    "intent": "question",
    "transaction": null,
    "chat_response": "Tháng này bạn đã chi 5.200.000₫...",
    "provider_used": "gemini"
  }
  ```
- [ ] **Error handling:** 400 (invalid input), 503 (AI unavailable), 500 (server error)

### 3.7 — Test với 20+ câu tiếng Việt

- [ ] Tạo file test: `backend/tests/ai-parse.test.js` (có thể chạy manual bằng node)
- [ ] Test cases:

| # | Input | Expected Type | Expected Category | Expected Amount | Expected Date |
|---|---|---|---|---|---|
| 1 | "ăn phở hết 50k" | expense | Ăn uống | 50000 | today |
| 2 | "nhận lương tháng 6 là 15 triệu" | income | Lương | 15000000 | today |
| 3 | "đi grab 35 nghìn" | expense | Di chuyển | 35000 | today |
| 4 | "mua sách 120k hôm qua" | expense | Giáo dục | 120000 | yesterday |
| 5 | "cà phê sáng 30k" | expense | Ăn uống | 30000 | today |
| 6 | "tiền nhà tháng 6 là 3tr5" | expense | Nhà cửa | 3500000 | today |
| 7 | "mua iphone 25 triệu" | expense | Điện tử | 25000000 | today |
| 8 | "đóng tiền điện 500 nghìn" | expense | Hóa đơn & Dịch vụ | 500000 | today |
| 9 | "thưởng tết 5 triệu" | income | Thưởng | 5000000 | today |
| 10 | "mua thuốc 200k" | expense | Sức khỏe | 200000 | today |
| 11 | "vé xem phim 150k" | expense | Giải trí | 150000 | today |
| 12 | "đổ xăng 300 nghìn" | expense | Di chuyển | 300000 | today |
| 13 | "tiền gym tháng 6: 800k" | expense | Thể thao | 800000 | today |
| 14 | "mua mỹ phẩm 350k" | expense | Làm đẹp | 350000 | today |
| 15 | "siêu thị 1.2 triệu" | expense | Tạp hóa | 1200000 | today |
| 16 | "tiền nước 150 nghìn" | expense | Hóa đơn & Dịch vụ | 150000 | today |
| 17 | "lãi đầu tư 2tr" | income | Đầu tư | 2000000 | today |
| 18 | "ăn trưa với bạn 200k hôm kia" | expense | Ăn uống | 200000 | 2 days ago |
| 19 | "mua airpod 4 triệu 500" | expense | Điện tử | 4500000 | today |
| 20 | "đóng học phí 5.500.000" | expense | Giáo dục | 5500000 | today |

- [ ] Verify accuracy > 80% (16/20 cases correct)
- [ ] Log: input → AI raw output → parsed output → matched category
- [ ] Measure response time (target: < 3 seconds)
- [ ] Test fallback: disable Gemini key → verify ChatGPT picks up

---

## Tiêu chí hoàn thành

- [ ] Prompt template hoàn chỉnh với system prompt, JSON schema, categories, rules, và few-shot examples
- [ ] `GeminiService` hoạt động — parse transaction và chat
- [ ] `ChatGPTService` hoạt động — same interface, same accuracy
- [ ] `POST /api/ocr` nhận ảnh upload/chụp từ mobile, trích text hóa đơn bằng Google Cloud Vision, fallback mock khi chưa cấu hình credential
- [ ] `POST /api/speech` nhận audio ghi âm từ mobile, chuyển tiếng Việt sang text bằng Google Cloud Speech-to-Text, fallback mock khi chưa cấu hình credential
- [ ] Text từ OCR/STT được đưa tiếp vào `parseTransaction` và tạo preview giao dịch như text nhập tay
- [ ] `AIServiceManager` auto mode hoạt động — Gemini → ChatGPT fallback
- [ ] `ParserService` validate, normalize, và match category chính xác
- [ ] `POST /api/ai/parse-transaction` endpoint hoạt động end-to-end
- [ ] Parse common Vietnamese financial sentences với accuracy > 80%
- [ ] Extract đúng tất cả required fields: description, amount, type, category, date
- [ ] Fallback Gemini → ChatGPT hoạt động seamless
- [ ] Response time < 3 seconds (trung bình)
- [ ] Edge cases handled: missing date → today, ambiguous amount → clarification, unknown category → "Khác"

---

## Ghi chú kỹ thuật

1. **Temperature thấp cho parsing:** Dùng `temperature: 0.1` khi parse transaction (cần output consistent). Dùng `temperature: 0.7` khi chat (cần creative responses).

2. **JSON mode quan trọng:**
   - Gemini: `responseMimeType: 'application/json'`
   - ChatGPT: `response_format: { type: 'json_object' }`
   - Đảm bảo AI luôn trả về valid JSON, tránh text wrapping.

3. **Prompt injection prevention:** Không cho phép user input thay đổi system prompt. Luôn tách biệt system prompt và user input.

4. **Token optimization:** System prompt khá dài (categories list, rules, examples). Cache system prompt, chỉ thay đổi user prompt mỗi request. Gemini 2.5 Flash có context window lớn nhưng vẫn nên optimize.

5. **Rate limiting:** Cả Gemini và ChatGPT đều có rate limits. Cho MVP, chưa cần implement rate limiting phía server vì single user. Nhưng nên log warning khi gần limit.

6. **Cost estimation:**
   - Gemini 2.5 Flash: Free tier 15 RPM, 1M tokens/day
   - GPT-4o-mini: ~$0.15/1M input tokens, ~$0.60/1M output tokens
   - Mỗi parse request ≈ 2000 input tokens + 200 output tokens
   - MVP budget: rất thấp, ưu tiên Gemini free tier

7. **Diacritics handling:** Tiếng Việt có dấu (ăn uống) và không dấu (an uong). Parser cần handle cả hai. Dùng `normalize('NFD').replace(/[\u0300-\u036f]/g, '')` để remove diacritics khi fuzzy matching.

8. **Amount edge case `3tr5`:** Pattern phổ biến trong tiếng Việt. Regex: `/^(\d+)tr(\d+)$/i` → `parseInt($1) * 1000000 + parseInt($2) * 100000`. Ví dụ: 3tr5 = 3×1000000 + 5×100000 = 3500000.

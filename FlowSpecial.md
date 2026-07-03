# Các luồng xử lý đặc biệt — PERFIN

> *Tài liệu liệt kê các luồng nghiệp vụ phức tạp trong hệ thống PERFIN, phục vụ vẽ sơ đồ Sequence Diagram và Activity Diagram.*
> *Tham chiếu: Report_v0.md §3.2.3, REQ-01 đến REQ-09, source code `demo/v1/backend/`*

---

## Luồng 1: Nhập giao dịch bằng văn bản tự nhiên (NLP Text → Transaction)

**Trigger:** User gửi tin nhắn text trong chat (ví dụ: *"ăn sáng 30k bằng Momo"*)

**Mô tả:**
1. User nhắn text → Frontend gọi `POST /api/chat/message`
2. Backend (`chat.routes.js`) nhận text → gọi `AIService.parseTransaction(text, categories)`
3. `ai.service.js` gửi text kèm system prompt lên Gemini API
4. Gemini trả về JSON gồm: `intent` + `transaction` (description, amount, type, category, date)
5. Nếu `intent = transaction` → tạo bản ghi **pending transaction** (chưa lưu DB)
6. Backend trả về response type `transaction_preview` kèm thông tin giao dịch đã bóc tách
7. Frontend hiển thị `TransactionPreviewCard` — user có thể **Xác nhận / Sửa / Hủy**
8. User xác nhận → `POST /api/chat/confirm` → lưu vào DB, cập nhật số dư ví, kiểm tra ngưỡng ngân sách

**Các component liên quan:**
`ChatScreen.js` → `api.sendChat()` → `chat.routes.js` → `ai.service.js` → `transaction.prompt.js` → Gemini API → `transaction.routes.js` → PostgreSQL

**Điểm đặc biệt:**
- Hỗ trợ tiếng Việt, tiếng Anh, pha trộn Việt-Anh
- Xử lý viết tắt tiền Việt: `30k` = 30.000đ, `1.5tr` = 1.500.000đ
- Suy đoán danh mục dựa ngữ cảnh, không phải keyword mapping
- Xử lý câu chứa nhiều giao dịch: *"ăn sáng 30k, grab 45k"*
- Trạng thái pending cho phép user review trước khi commit vào DB
- Nếu intent không phải giao dịch → xử lý như chat thông thường (Luồng 8)

---

## Luồng 2: Nhập giao dịch bằng giọng nói (Voice → STT → Transaction)

**Trigger:** User nhấn nút micro trong chat, nói và nhấn dừng

**Mô tả:**
1. Frontend (`ChatScreen.js`) yêu cầu quyền micro → `requestRecordingPermissionsAsync()`
2. Khởi tạo recorder: `setAudioModeAsync({allowsRecording: true})` → `recorder.prepareToRecordAsync()` → `recorder.record()`
3. UI hiển thị `RecordingPulse` animation (nhấp nháy đỏ + "Đang ghi âm...")
4. User nhấn dừng → `recorder.stop()` → lấy URI file audio (`.m4a` trên iOS)
5. Frontend upload file audio lên `POST /api/speech` (base64 hoặc multipart)
6. Backend (`ai.routes.js`) nhận file → xác định `SPEECH_PROVIDER`:
   - `phowhisper`: spawn Python process → `scripts/phowhisper_speech.py` → convert audio sang WAV 16kHz mono (FFmpeg) → chạy model `vinai/PhoWhisper-small` → trả text
   - `google`: gửi lên `@google-cloud/speech` với `languageCode: vi-VN`
   - Mock fallback: nếu cả 2 fail → trả text mẫu (cần cấu hình đúng để tránh)
7. Backend nhận text thô từ STT → gọi `AIService.parseFromMedia(text, categories, 'voice')` với `getVoicePrompt()` (prompt chuyên biệt cho giọng nói: bỏ qua từ đệm, ậm ừ)
8. Kết quả trả về `{text, provider, parsed}` → Frontend nhận và tự động gửi `text` vào luồng chat (Luồng 1)

**Các component liên quan:**
`ChatScreen.js` (expo-audio) → `api.transcribeAudio()` → `ai.routes.js` → `media-ai.service.js` → Python/PhoWhisper hoặc Google Speech → `ai.service.js` → `transaction.prompt.getVoicePrompt()` → Gemini API

**Điểm đặc biệt:**
- Chạy hoàn toàn offline khi dùng PhoWhisper (không cần internet cho STT)
- Cần FFmpeg cài trên server để convert audio format
- Python venv `.venv-ai/` phải được setup trước
- Model PhoWhisper cần cache sẵn (lần đầu cần tắt `MEDIA_AI_OFFLINE=1`)
- Frontend không dùng SDK STT — toàn bộ xử lý giọng nói ở phía backend
- Prompt voice chuyên biệt: lọc nhiễu ngôn ngữ nói trước khi parse entity

---

## Luồng 3: Nhập giao dịch bằng ảnh hóa đơn (Image → OCR → Transaction)

**Trigger:** User chụp ảnh hoặc chọn ảnh từ gallery, gửi trong chat

**Mô tả:**
1. Frontend: user nhấn nút Camera (`ImagePicker.launchCameraAsync`) hoặc Gallery (`launchImageLibraryAsync`)
2. Hiển thị preview trong chat: *"📸 Đã chụp ảnh hóa đơn"*
3. Upload ảnh lên `POST /api/ocr` (base64 hoặc multipart, max 10MB)
4. Backend xác định `OCR_PROVIDER`:
   - `paddleocr`: spawn Python → `scripts/paddleocr_ocr.py` → tiền xử lý ảnh (grayscale, upscale, tăng contrast) → chạy PaddleOCR tiếng Việt → trả raw text
   - `google`: gửi lên `@google-cloud/vision` Vision API
5. Raw text từ OCR → gọi `AIService.parseFromMedia(text, categories, 'receipt')` với `getReceiptPrompt()` (prompt chuyên biệt cho hóa đơn: trích xuất tên cửa hàng, mặt hàng, tổng tiền)
6. LLM bóc tách 1 hoặc nhiều giao dịch từ hóa đơn
7. Frontend nhận `text` đã parse → tự động gửi vào luồng chat để tạo pending transaction

**Các component liên quan:**
`ChatScreen.js` (expo-image-picker) → `api.extractImageText()` → `ai.routes.js` → `media-ai.service.js` → Python/PaddleOCR hoặc Google Vision → `ai.service.js` → `transaction.prompt.getReceiptPrompt()` → Gemini API

**Điểm đặc biệt:**
- Hóa đơn Việt Nam có format rất đa dạng (siêu thị, nhà hàng, chuyển khoản ngân hàng)
- PaddleOCR tiền xử lý ảnh để tăng độ chính xác: upscale 1000px, contrast boost 1.5x
- Một hóa đơn siêu thị có thể sinh nhiều giao dịch con (mỗi mặt hàng)
- OCR trả về text thô → LLM hiểu ngữ nghĩa và cấu trúc (text "30,000" là số tiền chứ không phải ngày)
- Cần PaddleOCR được cài trong `.venv-ai/` (hoặc cấu hình Google Vision)

---

## Luồng 4: Phân loại thông minh + Feedback Loop (Auto-Categorization — REQ-02)

**Trigger:** Giao dịch mới được tạo từ bất kỳ nguồn nào (text, voice, OCR)

**Mô tả:**
1. AI trả về giao dịch kèm `category_name` đã gợi ý (từ Luồng 1/2/3)
2. `parser.service.js` → `matchCategory()` so khớp `category_name` với danh sách categories trong DB
3. Nếu khớp → gán `category_id`; nếu không khớp → tạo danh mục mới hoặc để null
4. Frontend hiển thị `TransactionPreviewCard` với danh mục gợi ý
5. User có thể **chỉnh sửa danh mục** → `POST /api/chat/edit` với danh mục mới
6. Khi lưu giao dịch, hệ thống ghi nhận lựa chọn cuối cùng của user
7. *(Feedback loop — future)* Lịch sử chỉnh sửa của user được dùng làm few-shot context cho lần parse tiếp theo: `"user thường phân loại 'grab bệnh viện' vào Y tế thay vì Di chuyển"`

**Các component liên quan:**
`ai.service.js` → `parser.service.matchCategory()` → `category.routes.js` → DB (bảng `categories`) → `TransactionPreviewCard` (edit)

**Điểm đặc biệt:**
- Phân loại dựa ngữ cảnh đầy đủ, không chỉ keyword: *"grab đi bệnh viện"* → Y tế
- Hỗ trợ danh mục phân cấp cha-con (ăn uống → cà phê, cơm bình dân...)
- Feedback loop cá nhân hóa theo thói quen từng user (dự kiến tích hợp trong tương lai)
- LLM có thể gợi ý tạo danh mục mới khi pattern chưa có trong hệ thống

---

## Luồng 5: Cảnh báo ngân sách chủ động (Proactive Budget Alert — REQ-03)

**Trigger:** Sau mỗi giao dịch chi tiêu (expense) được xác nhận lưu DB

**Mô tả:**
1. Giao dịch expense lưu thành công → `transaction.routes.js` trigger kiểm tra budget
2. Tính tổng chi tiêu hiện tại: theo danh mục cụ thể + tổng thể trong kỳ (tuần/tháng)
3. So sánh với budget đã thiết lập (bảng `budgets`)
4. Nếu đạt ngưỡng:
   - **70%**: cảnh báo sắp chạm giới hạn
   - **90%**: cảnh báo khẩn cấp
   - **100%**: thông báo đã vượt ngân sách
5. Tạo nội dung cảnh báo: *(hiện tại format cứng; dự kiến: LLM format theo persona)*
   - Ví dụ: *"⚠️ Bạn đã dùng 90% ngân sách Ăn uống tháng này (1.800k/2.000k). Chỉ còn 200k cho 8 ngày cuối tháng."*
6. Chèn tin nhắn cảnh báo vào lịch sử chat (bảng `chat_messages`)
7. Frontend tự load lại chat khi nhận response → hiển thị cảnh báo

**Các component liên quan:**
`transaction.routes.js` → `budget.routes.js` → DB (bảng `budgets`, `transactions`) → `chat.routes.js` (inject message)

**Điểm đặc biệt:**
- 3 ngưỡng cảnh báo khác nhau (70%, 90%, 100%)
- Budget theo danh mục riêng lẻ VÀ tổng thể
- Cảnh báo được inject vào chat như tin nhắn assistant → tự nhiên, không phải popup
- Dự kiến: LLM format cảnh báo theo persona hiện tại của user (bà mẹ mắng khác chuyên gia phân tích)
- Hỗ trợ rollover: ngân sách chưa dùng hết kỳ trước có thể cộng sang kỳ sau

---

## Luồng 6: Nhắc nhở chi phí cố định (Recurring Bill Reminder — REQ-08)

**Trigger:** Khi user mở chat (load history) hoặc cron job hàng ngày

**Mô tả:**
1. **Trigger A — Khi mở chat:** `GET /api/chat/messages` kiểm tra recurring bills sắp đến hạn (trong vòng 3 ngày tới)
2. **Trigger B — Cron job:** `recurring.routes.js` chạy định kỳ, tìm bills đến hạn hôm nay
3. Truy vấn DB: tìm các `recurring_transactions` có `next_due_date` trong khoảng thời gian cần nhắc
4. Kiểm tra số dư ví liên quan — có đủ tiền trả không?
5. Tạo tin nhắn nhắc nhở kèm ngữ cảnh:
   - Tên bill + số tiền + ngày đến hạn
   - Số dư ví hiện tại và gợi ý nếu thiếu tiền
6. Frontend nhận `reminders` trong response → hiển thị vào đầu chat session
7. User trả lời *"đã trả rồi"* → `POST /api/chat/message` → AI nhận diện intent = `bill_paid` → gọi `recurring.routes` xác nhận thanh toán + cập nhật `next_due_date`

**Các component liên quan:**
`chat.routes.js` (GET messages) → `recurring.routes.js` → DB (bảng `recurring_transactions`, `wallets`) → Frontend reminders array

**Điểm đặc biệt:**
- AI có thể **tự nhận diện** chi phí cố định từ lịch sử: giao dịch cùng tên, cùng số tiền, đều đặn hàng tháng → gợi ý thêm vào recurring
- Nhắc kèm thông tin số dư → cảnh báo chủ động nếu ví sắp không đủ tiền
- Xác nhận thanh toán bằng ngôn ngữ tự nhiên qua chat (không cần bấm nút riêng)
- Hỗ trợ tạm dừng và kích hoạt lại recurring bill

---

## Luồng 7: Phân tích & Báo cáo cá nhân hóa (Personalized Insights — REQ-04)

**Trigger:** User yêu cầu xem báo cáo qua chat (hoặc báo cáo định kỳ cuối tháng)

**Mô tả:**
1. User nhắn: *"phân tích chi tiêu tháng này cho mình"* hoặc nhấn vào Report tab
2. `chat.routes.js` nhận diện intent = `report_request`
3. Gọi `report.service.js` → truy vấn DB: tổng hợp giao dịch theo khoảng thời gian
4. Tính toán thống kê:
   - Tổng thu / tổng chi / số dư
   - Phân tích theo danh mục (top chi tiêu)
   - So sánh với kỳ trước (% thay đổi)
   - Tiến độ ngân sách theo danh mục
5. Gửi data thống kê + toàn bộ context lên Gemini API với prompt phân tích chuyên sâu
6. LLM phân tích:
   - Xu hướng tăng/giảm bất thường
   - Pattern ẩn (ví dụ: tiêu nhiều hơn vào cuối tuần)
   - Gợi ý cải thiện cụ thể
7. Trả về: `data` (cho biểu đồ frontend) + `ai_comment` (text nhận xét của AI)

**Các component liên quan:**
`chat.routes.js` / `report.routes.js` → `report.service.js` → DB → `ai.service.js` → Gemini API → Frontend (charts + chat)

**Điểm đặc biệt:**
- LLM không chỉ echo lại số liệu, mà **diễn giải** và **phát hiện pattern**
- Cùng một data → LLM format theo persona (chuyên gia viết báo cáo, bà mẹ nhận xét thực tế)
- Cross-category insight: liên hệ giữa các danh mục tưởng không liên quan
- Dự đoán xu hướng tháng tới dựa trên trend hiện tại
- Báo cáo định kỳ tự động (cuối tháng) hoặc theo yêu cầu qua chat

---

## Luồng 8: Chat hỏi đáp tự do với AI (General AI Chat)

**Trigger:** User gửi tin nhắn không phải tạo giao dịch (hỏi tư vấn, hỏi thông tin, trò chuyện)

**Mô tả:**
1. User nhắn: *"Tôi nên tiết kiệm bao nhiêu % thu nhập mỗi tháng?"*
2. `chat.routes.js` gọi `AIService.parseTransaction()` → Gemini trả về `intent: 'chat'`
3. Luồng chuyển sang `AIService.chat(text, context)` với context gồm:
   - Persona hiện tại của user
   - Tóm tắt tình hình tài chính (thu nhập, số dư, ngân sách)
   - Lịch sử hội thoại gần đây (conversation history)
4. Gemini tạo phản hồi dựa trên context đầy đủ
5. Trả về tin nhắn text thông thường (không phải transaction_preview)

**Các component liên quan:**
`ChatScreen.js` → `chat.routes.js` → `ai.service.chat()` → `transaction.prompt.getChatPrompt()` → Gemini API

**Điểm đặc biệt:**
- LLM cần truy cập data tài chính user để trả lời câu hỏi cụ thể (không phải tư vấn chung chung)
- Conversation history duy trì ngữ cảnh xuyên suốt phiên chat
- Persona ảnh hưởng toàn bộ tone và cách tiếp cận tư vấn
- *(Hiện tại)* `applyPersona()` chưa implement đầy đủ — dự kiến inject persona vào system prompt

---

## Luồng 9: Xuất dữ liệu qua Chat (Data Export — REQ-07)

**Trigger:** User yêu cầu xuất dữ liệu qua chat (ví dụ: *"xuất giao dịch tháng 6 ra CSV"*)

**Mô tả:**
1. User nhắn yêu cầu → Gemini nhận diện `intent: 'export'`
2. Extract params từ câu chat:
   - Loại file: CSV hoặc PDF
   - Khoảng thời gian: *"tháng 6"*, *"3 tháng gần đây"*, *"năm nay"*
   - Bộ lọc: danh mục cụ thể (nếu có)
3. Gọi `export.service.js`:
   - CSV: generate CSV từ data giao dịch filtered
   - PDF: tạo báo cáo PDF kèm biểu đồ và nhận xét
4. Lưu file vào thư mục `exports/`
5. Trả về link download trong chat message

**Các component liên quan:**
`chat.routes.js` → `ai.service.js` (intent detection) → `export.service.js` → `export.routes.js` → file system (`exports/`)

**Điểm đặc biệt:**
- LLM hiểu thời gian mơ hồ: *"mấy tháng gần đây"* → tự suy ra 3 tháng gần nhất
- Hỗ trợ cả CSV (raw data) và PDF (báo cáo có format đẹp)
- Export có thể được kích hoạt từ chat (tự nhiên) hoặc từ Export tab (UI truyền thống)
- File được lưu server-side và trả về link (không stream trực tiếp)

---

## Luồng 10: Chuyển tiền giữa các ví (Transfer — REQ-05/06)

**Trigger:** User nhắn qua chat (ví dụ: *"chuyển 500k từ ví chính sang tiết kiệm"*)

**Mô tả:**
1. Gemini nhận diện `intent: 'transfer'` (phân biệt với expense thông thường)
2. Extract: số tiền, ví nguồn, ví đích
3. Kiểm tra số dư ví nguồn — có đủ không?
4. Tạo **2 bản ghi giao dịch liên kết** (atomic):
   - Giao dịch debit ở ví nguồn (type = `transfer_out`)
   - Giao dịch credit ở ví đích (type = `transfer_in`)
5. **KHÔNG tính vào thu chi** — chỉ điều chuyển tài sản, không ảnh hưởng Net Worth
6. Cập nhật số dư cả 2 ví
7. Xác nhận qua chat: *"Đã chuyển 500k từ Ví chính sang Tiết kiệm. Số dư Ví chính: 1.3tr, Tiết kiệm: 2.0tr"*

**Các component liên quan:**
`chat.routes.js` → `ai.service.js` → `cashflow.routes.js` → `account.routes.js` → DB (atomic transaction trên 2 bảng)

**Điểm đặc biệt:**
- Phân biệt 3 loại: **Expense** (chi tiêu), **Transfer** (điều chuyển), **Investment** (đầu tư)
- Transfer không ảnh hưởng Net Worth; Investment thay đổi cơ cấu tài sản nhưng không phải chi phí
- Atomic transaction: cả 2 ví cập nhật đồng thời, không bị inconsistent state
- LLM cần hiểu ngữ cảnh: *"chuyển 10tr vào MBS đánh phái sinh"* → Investment, không phải Transfer thông thường
- Hỗ trợ tên ví tiếng Việt tự nhiên: *"ví chính"*, *"tài khoản ngân hàng"*, *"ví tiết kiệm"*

---

## Luồng 11: Xác thực & Khởi tạo phiên (Auth — Nền tảng)

**Trigger:** App khởi động, user đăng nhập

**Mô tả:**
1. App khởi động → kiểm tra JWT token trong local storage
2. Nếu có token hợp lệ → tự động đăng nhập, load user profile và danh mục
3. Nếu không có token → hiển thị màn hình đăng nhập
4. Đăng nhập thành công → nhận JWT → lưu local → redirect vào app
5. Mọi API request đều kèm `Authorization: Bearer <token>` header
6. Backend middleware kiểm tra token trước mỗi request

**Các component liên quan:**
Frontend auth flow → `middleware/auth.js` → JWT verify → user context

**Điểm đặc biệt:**
- JWT-based auth (stateless)
- Token expiry → refresh hoặc re-login
- User ID được dùng để isolate data (mỗi user chỉ thấy data của mình — NFR-07)

---

## Luồng 12: Hỏi lại khi thiếu thông tin giao dịch (Clarification Loop)

**Trigger:** LLM phân tích câu chat nhưng thiếu thông tin bắt buộc để tạo giao dịch (không có số tiền, hoặc intent không rõ ràng)

**Mô tả:**

Có **hai cơ chế** kích hoạt clarification, hoạt động ở các tầng khác nhau:

**Cơ chế A — LLM tự nhận ra thiếu thông tin (`needs_clarification` flag):**
1. User nhắn câu mơ hồ: *"hôm nay ăn phở"* (thiếu số tiền) hoặc *"tiêu tiền rồi"* (thiếu mọi thứ)
2. Gemini phân tích → trả JSON với `"needs_clarification": true` + `"clarification_message": "Bạn ăn phở tốn bao nhiêu tiền vậy?"`
3. `chat.routes.js` (dòng 197–198) kiểm tra flag → trả response type `"clarification"` kèm câu hỏi
4. Frontend hiển thị câu hỏi trong bubble chat như tin nhắn assistant bình thường
5. User trả lời: *"45k"* → gửi tin nhắn mới → bắt đầu lại Luồng 1 với text mới

**Cơ chế B — Local parser không tìm được số tiền:**
1. Khi Gemini fail → fallback sang `parseLocalTransaction()` (parser.service.js)
2. `normalizeAmount()` không tìm được số tiền trong text → trả `amount = null`
3. Parser trả `{ intent: 'unclear', needs_clarification: true, clarification_message: 'Bạn muốn ghi nhận bao nhiêu tiền?' }`
4. Backend trả clarification → user nhập lại

**Cơ chế C — Thiếu thông tin khi tạo recurring bill:**
1. User nhắn: *"nhắc tiền phòng trọ"* (thiếu số tiền và ngày)
2. `handleRecurringCreate()` (dòng 63–70) kiểm tra các field bắt buộc: `name`, `amount`, `due_day`
3. Nếu thiếu → trả: *"Bạn bổ sung giúp mình số tiền, ngày thanh toán để tạo nhắc nhở nhé."*
4. User bổ sung → gửi lại → parse lại recurring_create với đầy đủ thông tin

**Vòng lặp clarification (multi-turn):**
```
User: "hôm nay ăn phở"
  → AI: "Bạn ăn phở tốn bao nhiêu?"       [clarification]
User: "45k"
  → AI: [transaction_preview: phở 45k]    [Luồng 1]
User: "xác nhận"
  → AI: "Đã lưu: ăn phở 45.000đ"          [confirm]
```

**Các component liên quan:**
`chat.routes.js` (POST /message) → `ai.service.parseTransaction()` → kiểm tra `needs_clarification` / `RECURRING_HANDLERS` → response type `'clarification'` → Frontend bubble → User reply → lặp lại

**Điểm đặc biệt:**
- **Không có state lưu lại giữa các vòng** — mỗi tin nhắn là một request độc lập; LLM dùng conversation history để hiểu ngữ cảnh hỏi lại
- **Pending transaction TTL = 5 phút** — nếu user trả lời sau 5 phút, phải bắt đầu lại
- Clarification message được format qua `applyPersona()` → khi persona implement đầy đủ, "bà mẹ" sẽ hỏi khác "chuyên gia"
- Clarification type khác transaction_preview: không có card confirm/cancel, chỉ là text bubble
- Câu hỏi hệ thống giải thích rõ thiếu gì (không chỉ "không hiểu") → giúp user biết cần cung cấp thêm gì

---

## Luồng 13: Clarification khi Tên Bill Mơ Hồ (Ambiguous Recurring Bill)

**Trigger:** User nhắn lệnh liên quan đến recurring bill nhưng tên không khớp duy nhất một bill trong DB

**Mô tả:**

Ba hành động `recurring_pay`, `recurring_pause`, `recurring_history` đều có sub-flow clarification riêng khi tên bill mơ hồ:

**Ví dụ — `recurring_pause` (tạm dừng):**
1. User nhắn: *"tạm dừng tiền nhà"*
2. LLM nhận diện `intent = recurring_pause`, extract `name = "tiền nhà"`
3. `handleRecurringPause()` → `findBillByName("tiền nhà")` → tìm trong DB
4. Nếu khớp nhiều hơn 1 bill (ví dụ: "Tiền nhà Quận 7" và "Tiền nhà ba mẹ"):
   ```
   → trả clarification: "Bạn muốn tạm dừng khoản nào?
     • Tiền nhà Quận 7
     • Tiền nhà ba mẹ"
   ```
5. User trả lời: *"tiền nhà quận 7"* → gửi lại → `recurring_pause` với tên rõ hơn
6. Lần này `findBillByName()` khớp chính xác → thực thi pause

**Ví dụ — `recurring_pay` (xác nhận đã trả):**
1. User nhắn: *"đã trả rồi"* (không nêu tên bill)
2. `handleRecurringPay()` → kiểm tra `getDueBills()` — các bill đến hạn hôm nay
3. Nếu có **nhiều bill** đến hạn cùng ngày:
   ```
   → clarification: "Bạn vừa thanh toán khoản nào trong số này?
     • Tiền phòng trọ
     • Tiền điện"
   ```
4. User trả lời tên cụ thể → xử lý ghi nhận thanh toán

**Logic `findBillByName()` (parser.service):**
- So khớp exact → partial → substring
- Nếu tìm được đúng 1 bill → tiếp tục luồng chính
- Nếu tìm được 0 hoặc nhiều → clarification

**Các component liên quan:**
`chat.routes.js` → `RECURRING_HANDLERS[intent]` → `findBillByName()` → `RecurringBillModel.getAll()` → clarification response hoặc thực thi

**Điểm đặc biệt:**
- Clarification liệt kê các lựa chọn có thể → user không cần nhớ chính xác tên
- Khác Luồng 12: đây là clarification về *định danh đối tượng*, không phải thiếu thông tin số liệu
- Nếu không có bill nào đến hạn khi user nói "đã trả rồi" → trả lời thông thường, không clarification

---

## Luồng 14: Gợi ý Danh mục Mới (New Category Suggestion)

**Trigger:** LLM gợi ý category không có trong danh sách hiện tại; hoặc user chỉnh sửa danh mục khi review giao dịch

**Mô tả:**

**Hiện tại (đã implement) — fallback về "Khác":**
1. Gemini trả `category_name = "Cà phê"` trong JSON
2. `matchCategory("Cà phê", categories)` tìm trong DB → không thấy danh mục "Cà phê" riêng
3. Tìm alias mapping (`CATEGORY_ALIASES`) → `"cà phê"` nằm trong aliases của `"Ăn uống"` → trả về danh mục "Ăn uống"
4. Nếu không khớp alias nào → fallback về danh mục `"Khác"` (hoặc danh mục đầu tiên của type đó)
5. TransactionPreviewCard hiển thị danh mục gợi ý → user có thể **chỉnh sửa** tại đây

**Luồng chỉnh sửa danh mục trên Preview Card:**
1. TransactionPreviewCard hiển thị: `[Ăn uống]` — user muốn đổi thành "Cà phê"
2. User nhấn edit → chọn hoặc nhập danh mục mới
3. `POST /api/chat/edit` với `{ category_name: "Cà phê", category_id: <id_mới> }`
4. `pending.update(userId, updates)` → cập nhật pending transaction in-memory
5. Backend trả lại `transaction_preview` với danh mục đã cập nhật để user review lần nữa
6. User xác nhận → lưu vào DB với danh mục đã chỉnh

**Luồng gợi ý tạo danh mục mới (dự kiến — chưa implement đầy đủ):**
1. Sau khi giao dịch lưu với category "Khác", hệ thống (hoặc theo batch) phân tích
2. Nếu user có ≥ N giao dịch cùng từ khóa không khớp danh mục nào (ví dụ: nhiều lần "cà phê sáng"):
   ```
   AI nhắn vào chat: "Mình thấy bạn có 8 giao dịch liên quan đến 'cà phê' trong tháng này,
   tất cả đang được phân vào 'Ăn uống'. Bạn có muốn tạo danh mục riêng 'Cà phê' không?
   Điều này giúp báo cáo của bạn chi tiết hơn."
   ```
3. User đồng ý → `POST /api/category` tạo danh mục mới
4. Hệ thống re-tag các giao dịch cũ thuộc pattern đó sang danh mục mới *(dự kiến)*

**Các component liên quan:**
`ai.service.parseTransaction()` → `parser.service.matchCategory()` → `CATEGORY_ALIASES` lookup → fallback "Khác" → `TransactionPreviewCard` (edit) → `POST /api/chat/edit` → `pending.update()` → `category.routes.js` (tạo mới nếu cần)

**Điểm đặc biệt:**
- `matchCategory()` có 3 cấp so khớp: exact → partial substring → alias mapping → fallback "Khác"
- Alias mapping (`CATEGORY_ALIASES` trong parser.service.js) là tầng đệm quan trọng: LLM đặt tên "cà phê" vẫn được map đúng vào "Ăn uống" mà không cần tạo danh mục mới
- Danh mục hỗ trợ cấu trúc cha-con (ví dụ: "Ăn uống > Cà phê") — cho phép báo cáo chi tiết theo cả 2 cấp
- Feedback khi user sửa danh mục là dữ liệu quý để cải thiện alias mapping theo thời gian

---

## Luồng 15: Các Luồng Clarification Đặc biệt trong Chat Thông thường

**Trigger:** Trong quá trình chat tự do, phát sinh các tình huống đặc biệt cần hỏi lại hoặc xác nhận

**Mô tả — 4 tình huống cụ thể từ code:**

### 15A. Câu chat vừa là giao dịch vừa là câu hỏi (Intent Ambiguity)
```
User: "hôm qua mình mua điện thoại rồi giờ còn bao nhiêu tiền?"
```
1. LLM phân tích → phát hiện 2 intent cùng lúc: `transaction` (mua điện thoại) + `question` (còn bao nhiêu tiền)
2. Gemini trả JSON ưu tiên `intent = "transaction"` (ghi nhận trước, hỏi sau)
3. Backend tạo pending transaction_preview → hiển thị card confirm
4. Sau khi user xác nhận giao dịch → trả thêm thông tin số dư ví trong message xác nhận:
   *"Đã lưu: mua điện thoại 8.500.000đ. Số dư ví chính còn 2.340.000đ."*

**Điểm đặc biệt:** Hệ thống giải quyết 2 intent tuần tự, không bỏ sót câu hỏi — số dư được trả tự động sau khi lưu.

---

### 15B. User xác nhận bill đã trả nhưng số tiền khác (Override Amount)
```
User: "đã đóng tiền điện rồi nhưng tháng này 680k"
```
1. LLM nhận diện `intent = recurring_pay` + extract `amount = 680000` (override)
2. `handleRecurringPay()` dòng 133: `overrideAmount = parsed.recurring?.amount || parsed.transaction?.amount`
3. Nếu có override amount → ghi nhận payment với số tiền mới thay vì số tiền cố định trong DB
4. Phản hồi: *"Đã ghi nhận thanh toán 680.000đ tiền điện (khác so với mức cố định 650.000đ). Số dư ví còn..."*

**Điểm đặc biệt:** Luồng recurring_pay xử lý gracefully khi số tiền tháng này khác template, không yêu cầu user sửa trong settings trước.

---

### 15C. User hủy giữa chừng rồi bắt đầu giao dịch mới
```
User: "ăn phở 50k"     → [preview: phở 50k]
User: "thôi bỏ đi"     → [hủy pending]
User: "cà phê 30k"     → [preview: cà phê 30k mới]
```
1. `POST /api/chat/cancel` → `pending.clear(userId)` xóa pending khỏi Map
2. Trả: `{ type: 'system_message', message: 'Đã hủy' }`
3. Chat message "Đã hủy" được lưu vào lịch sử
4. Tin nhắn tiếp theo của user → `pending.get(userId)` trả null → bắt đầu fresh

**Điểm đặc biệt:** Pending service dùng in-memory Map (không phải DB) → cancel là tức thì, nhẹ; TTL 5 phút tự dọn nếu user bỏ dở mà không hủy.

---

### 15D. User chỉnh sửa pending transaction (Edit Loop)
```
User: "ăn phở 50k"         → [preview: phở, Ăn uống, 50k]
User: [nhấn sửa → đổi danh mục thành "Bữa sáng"]
                            → [preview cập nhật: phở, Bữa sáng, 50k]
User: [nhấn sửa → đổi số tiền thành 45k]
                            → [preview cập nhật: phở, Bữa sáng, 45k]
User: "xác nhận"           → [lưu DB]
```
1. Mỗi lần user edit → `POST /api/chat/edit` với field cần thay đổi
2. `pending.update(userId, { category_name: 'Bữa sáng', ... })` merge vào pending object
3. Backend gọi lại `previewResponse()` với data đã merge → trả transaction_preview mới
4. User có thể edit nhiều lần trong vòng 5 phút TTL
5. Sau khi confirm → lưu version cuối cùng vào DB

**Điểm đặc biệt:** Edit không tạo pending mới — chỉ merge vào pending đang có (cùng `pendingId`). Mỗi edit trả về preview mới để user thấy kết quả trước khi confirm lần cuối.

---

**Tóm tắt các loại response type trong chat và luồng tương ứng:**

| `type` trong response | Luồng | Mô tả |
|-----------------------|-------|-------|
| `transaction_preview` | 1, 2, 3, 15D | Hiển thị card confirm/edit/cancel |
| `clarification` | 12, 13, 15A | Hỏi lại — bubble text đơn giản |
| `recurring_preview` | 6 (tạo mới) | Card xác nhận tạo recurring bill |
| `system_message` | 6, 10, 15B, 15C | Thông báo hệ thống (đã lưu, đã hủy...) |
| `chat_response` | 8 | Trả lời hội thoại / tư vấn thông thường |

---

*Các luồng trên được mô tả dựa trên source code hiện tại tại `demo/v1/`. Các tính năng đánh dấu `(dự kiến)` đã được đặc tả trong REQ nhưng chưa implement đầy đủ trong bản demo hiện tại.*


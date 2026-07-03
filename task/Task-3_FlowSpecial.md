# Task 3: Tạo `/FlowSpecial.md` — Liệt kê các luồng xử lý đặc biệt

## 🎯 Mục tiêu

Liệt kê và mô tả ngắn gọn **tất cả các luồng xử lý đặc biệt** (special/complex processing flows) trong hệ thống PERFIN. File này phục vụ làm input để vẽ sơ đồ (sequence diagram, activity diagram) sau.

## 📍 File đầu ra

`/FlowSpecial.md` (đặt tại root dự án: `/home/ngthtrong/perfin-nienluan/FlowSpecial.md`)

## 📋 Danh sách các luồng cần liệt kê

Dựa trên tài liệu `doc/archive/Report_v0.md` (mục 3.2.3 — Mô tả thuật toán và kỹ thuật quan trọng) và các REQ specs, hãy liệt kê và mô tả các luồng sau:

---

### Luồng 1: Nhập giao dịch bằng văn bản tự nhiên (NLP Text → Transaction)

- **Trigger:** User gửi tin nhắn text trong chat (ví dụ: "ăn sáng 30k bằng Momo")
- **Mô tả:** Tin nhắn → Backend nhận text → Gửi đến AI Service → LLM phân tích intent (tạo giao dịch? hỏi đáp? chit-chat?) → Nếu intent = tạo giao dịch: extract entities (tên, giá, danh mục, ví, thời gian) → Auto-categorize → Tạo bản ghi pending → Trả về user confirm → User xác nhận → Lưu DB → Cập nhật budget tracking
- **Các component liên quan:** Chat UI → chat.routes → ai.service → parser.service → transaction.prompt → Gemini API → transaction.routes → DB
- **Điểm đặc biệt:** Hỗ trợ tiếng Việt, tiếng Anh, pha trộn Việt-Anh; xử lý viết tắt (30k = 30.000); suy đoán danh mục dựa ngữ cảnh

### Luồng 2: Nhập giao dịch bằng giọng nói (Voice → Text → Transaction)

- **Trigger:** User nhấn nút ghi âm trong chat, nói và gửi
- **Mô tả:** Ghi âm audio (frontend) → Gửi file audio lên backend → Backend chuyển cho Google Speech-to-Text API (hoặc Gemini multimodal) → Nhận text thô → Đưa vào luồng NLP Text ở Luồng 1 → Xử lý bình thường từ đây
- **Các component liên quan:** VoiceInput component → media-ai.service → Speech-to-Text → ai.service → (tiếp tục như Luồng 1)
- **Điểm đặc biệt:** Cần xử lý noise, accent tiếng Việt; file audio format (wav/m4a); timeout recording

### Luồng 3: Nhập giao dịch bằng hình ảnh hóa đơn (Image → OCR → Transaction)

- **Trigger:** User chụp ảnh hoặc chọn ảnh hóa đơn từ gallery, gửi trong chat
- **Mô tả:** Ảnh → Upload lên backend (multipart/form-data) → Backend gửi ảnh tới Google Cloud Vision API (OCR) → Nhận raw text → Gửi text đã OCR vào LLM để bóc tách cấu trúc (tên cửa hàng, danh sách sản phẩm, tổng tiền, ngày) → Tạo 1 hoặc nhiều giao dịch pending → User xác nhận
- **Các component liên quan:** ImagePicker/Camera → media-ai.service → Cloud Vision API → ai.service → parser.service
- **Điểm đặc biệt:** Hóa đơn Việt Nam có format đa dạng; cần xử lý ảnh mờ/nghiêng; một hóa đơn siêu thị có thể tạo nhiều giao dịch con

### Luồng 4: Auto-Categorization với Feedback Loop (REQ-02)

- **Trigger:** Mỗi khi giao dịch mới được tạo (từ bất kỳ phương thức nhập nào)
- **Mô tả:** Giao dịch mới → LLM phân loại dựa trên (tên giao dịch + ngữ cảnh + lịch sử user) → Gợi ý danh mục → User có thể accept hoặc chỉnh sửa → Nếu chỉnh sửa: lưu feedback → Lần sau LLM dùng feedback làm context để phân loại chính xác hơn
- **Các component liên quan:** ai.service → category.routes → Gemini API → DB (categories, user_category_mapping)
- **Điểm đặc biệt:** Feedback loop giúp model cá nhân hóa theo thói quen từng user; cần lưu history để few-shot learning

### Luồng 5: Cảnh báo ngân sách chủ động (Proactive Budget Alert — REQ-03)

- **Trigger:** Sau mỗi giao dịch chi tiêu mới được xác nhận lưu
- **Mô tả:** Giao dịch lưu → Hệ thống tính tổng chi tiêu hiện tại theo danh mục/tổng thể → So sánh với budget đã thiết lập → Nếu đạt ngưỡng 70%/90%/100% → Tạo alert message → LLM format cảnh báo theo persona hiện tại → Gửi tin nhắn cảnh báo trong chat
- **Các component liên quan:** transaction.routes (after save) → budget.routes → ai.service (personality formatting) → chat notification
- **Điểm đặc biệt:** Cảnh báo phải mang tính persona (bà mẹ sẽ mắng, chuyên gia sẽ phân tích); 3 ngưỡng cảnh báo

### Luồng 6: Nhắc nhở chi phí cố định (Recurring Bill Reminder — REQ-08)

- **Trigger:** Cron job chạy hàng ngày (hoặc realtime check) so sánh ngày hiện tại với ngày đến hạn
- **Mô tả:** Cron job check → Tìm các recurring bills sắp đến hạn → LLM tạo tin nhắn nhắc nhở (kèm ngữ cảnh: số dư hiện tại, có đủ tiền không) → Gửi push notification + tin nhắn chat → User trả lời "đã trả rồi" → Ghi nhận thanh toán → Cập nhật next due date
- **Các component liên quan:** recurring.routes → cron scheduler → ai.service → notification → chat.routes
- **Điểm đặc biệt:** AI có thể tự nhận diện pattern recurring từ lịch sử (FR-08-02); nhắc trước 1-3 ngày; kiểm tra cross-reference với số dư ví

### Luồng 7: Phân tích & Báo cáo cá nhân hóa bằng AI (REQ-04)

- **Trigger:** User yêu cầu xem báo cáo (qua chat hoặc qua UI), hoặc hệ thống tự tạo báo cáo định kỳ cuối tháng
- **Mô tả:** Tổng hợp data giao dịch theo khoảng thời gian → Tính toán thống kê (tổng thu, tổng chi, theo danh mục, so sánh kỳ trước) → Gửi data thống kê cho LLM → LLM phân tích xu hướng, phát hiện bất thường, đưa ra tư vấn cá nhân hóa → Trả về cả data (cho biểu đồ) + text nhận xét (cho chat)
- **Các component liên quan:** report.service → report.routes → ai.service → Gemini API → frontend charts
- **Điểm đặc biệt:** LLM không chỉ đọc số liệu mà phân tích sâu (trend, anomaly, correlation giữa các danh mục)

### Luồng 8: Chat hỏi đáp tự do với AI (General AI Chat)

- **Trigger:** User gửi tin nhắn không phải tạo giao dịch (hỏi tư vấn, hỏi thông tin, chit-chat tài chính)
- **Mô tả:** Tin nhắn → LLM nhận diện intent = conversation/query → Tùy loại câu hỏi: truy vấn data user (gọi DB) hoặc tư vấn chung → LLM tạo phản hồi theo persona hiện tại → Trả về chat
- **Các component liên quan:** chat.routes → ai.service → Gemini API (với system prompt chứa persona + user context)
- **Điểm đặc biệt:** LLM cần access được data tài chính user để trả lời chính xác; phải duy trì conversation history

### Luồng 9: Xuất dữ liệu qua Chat (REQ-07)

- **Trigger:** User yêu cầu xuất dữ liệu qua chat (ví dụ: "xuất giao dịch tháng 6 ra CSV")
- **Mô tả:** Tin nhắn → LLM nhận diện intent = export request → Extract params (loại file, khoảng thời gian, bộ lọc) → Gọi export.service → Tạo file CSV/PDF → Trả link download trong chat
- **Các component liên quan:** chat.routes → ai.service (intent detection) → export.service → export.routes
- **Điểm đặc biệt:** LLM hiểu yêu cầu mơ hồ ("xuất mấy tháng gần đây" → 3 tháng gần nhất)

### Luồng 10: Chuyển tiền giữa các ví (Transfer — REQ-05/06)

- **Trigger:** User nhắn qua chat (ví dụ: "chuyển 500k từ ví chính sang tiết kiệm")
- **Mô tả:** Tin nhắn → LLM nhận diện intent = transfer → Extract: số tiền, ví nguồn, ví đích → Tạo 2 bản ghi giao dịch liên kết (debit ví nguồn + credit ví đích) → KHÔNG tính vào thu chi → Cập nhật Net Worth
- **Các component liên quan:** chat.routes → ai.service → cashflow.routes → account.routes → transaction.routes
- **Điểm đặc biệt:** Phân biệt Transfer vs Expense vs Investment; cập nhật 2 ví cùng lúc (atomic transaction)

---

## ⚠️ Lưu ý khi thực hiện

- **Chỉ cần liệt kê và mô tả**, không cần vẽ sơ đồ (sẽ vẽ sau)
- Mỗi luồng nên có: Trigger, Mô tả ngắn gọn, Các component liên quan, Điểm đặc biệt
- Viết bằng **tiếng Việt**
- Tham khảo source code thực tế trong `demo/v1/backend/routes/` và `demo/v1/backend/services/` để đảm bảo mô tả đúng luồng hiện tại
- Tham khảo Report_v0.md mục 3.2.3 (Mô tả thuật toán và kỹ thuật quan trọng)
- Có thể bổ sung thêm luồng nếu phát hiện trong code (ví dụ: luồng auth, luồng backup...)

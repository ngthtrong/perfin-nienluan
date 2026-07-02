# 02 — Làm rõ tính năng & lợi ích của LLM trong hệ thống PERFIN

> Trả lời câu hỏi cốt lõi: *Nếu LLM chỉ để hỏi "tháng vừa rồi tôi tiêu bao nhiêu?" thì câu hỏi
> đó hoàn toàn nhìn thấy được trong dữ liệu — vậy LLM mang lại giá trị thật ở đâu?*

## 1. Vấn đề: ranh giới giữa "truy vấn dữ liệu" và "hiểu ngôn ngữ"

Rất nhiều câu hỏi tài chính chỉ là **tổng hợp số liệu** và nên giải bằng SQL/aggregate — vừa rẻ,
vừa chính xác tuyệt đối, không tốn token, không phụ thuộc mạng/API:

- "Tháng rồi tôi tiêu bao nhiêu?" → `transaction.model.js: getMonthlySummary`.
- "Danh mục nào tốn nhất?" → `report.service` / `reports/category-breakdown`.
- "Số dư hiện tại?" → `accounts/balance`.
- "So sánh tháng này với tháng trước?" → `reports/monthly-trend`.

➡️ **Nguyên tắc thiết kế:** với các câu hỏi tính toán có cấu trúc, hệ thống nên ưu tiên trả lời
bằng truy vấn dữ liệu, **không** đẩy nguyên dữ liệu cho LLM "tự cộng" (vừa sai số, vừa tốn kém,
vừa rủi ro lộ dữ liệu). LLM chỉ nên **hiểu câu hỏi → ánh xạ sang truy vấn** và **diễn giải kết quả**.

## 2. LLM tạo giá trị thật ở đâu

LLM là **lớp hiểu ngôn ngữ và sinh ngôn ngữ** — giá trị nằm ở những việc mà code truyền thống
(regex, rule) làm rất kém:

### 2.1 Bóc tách ngôn ngữ tự nhiên đa dạng, đa ngôn ngữ, có lỗi
Người dùng gõ tự do: *"sáng nay cà phê với bạn hết 2 đứa 90k"*, *"chuyển 500 nghìn đóng điện bằng
Momo"*, pha trộn Việt-Anh, viết tắt, sai chính tả. Parser regex hiện tại
(`services/parser.service.js`) xử lý được các mẫu đơn giản ("ăn phở 50k") nhưng gãy với câu phức.
LLM bóc tách ổn định hơn nhiều: tên giao dịch, số tiền, thời gian, nguồn tiền, loại thu/chi.

### 2.2 Trích xuất từ dữ liệu lộn xộn (OCR hóa đơn / voice)
Text OCR hóa đơn có hàng chục dòng nhiễu, nhiều con số (đơn giá, thuế, tiền khách đưa, tiền thối).
Regex rất dễ lấy nhầm số. LLM với prompt chuyên biệt (`getReceiptPrompt` trong
`prompts/transaction.prompt.js`) biết **chọn đúng dòng "Tổng cộng/Thành tiền"**, bỏ số nhiễu. Đây
là khác biệt định tính, không chỉ là tiện lợi.

### 2.3 Suy luận phân loại danh mục cho mô tả mơ hồ
"đi cắt tóc 80k" → Làm đẹp; "mua cáp sạc 120k" → Điện tử. Bảng alias tĩnh không bao giờ phủ hết.
LLM suy luận theo ngữ nghĩa. (Và mở ra Luồng 1 ở tài liệu 01: gợi ý **danh mục mới** khi không khớp.)

### 2.4 Nhận diện ý định (intent routing)
Cùng một ô chat, người dùng có thể: ghi giao dịch, tạo nhắc nhở chi phí cố định, xác nhận đã thanh
toán, đổi nhân cách, hay hỏi số liệu. LLM phân loại intent (xem schema mở rộng trong
`prompts/transaction.prompt.js`: `transaction`, `recurring_create`, `recurring_pay`, …) rồi route
tới đúng handler. Không có lớp này thì phải bắt người dùng bấm menu — phá vỡ trải nghiệm chat-centric.

### 2.5 Hội thoại nhiều bước & hỏi lại thông minh
Khi thiếu thông tin (*"nhắc tôi đóng tiền điện mỗi tháng"* — thiếu số tiền/ngày), LLM biết **hỏi
đúng cái còn thiếu** thay vì báo lỗi cứng. Khi mơ hồ (nhiều khoản tên gần giống), biết hỏi làm rõ.

### 2.6 Diễn giải số liệu thành lời khuyên cá nhân hóa (và theo nhân cách — REQ-09)
Đây là giá trị **cao nhất** và là điểm khác biệt của PERFIN so với app nhập tay truyền thống.
Cùng một dữ kiện "vượt ngân sách ăn uống 15%", LLM diễn giải thành lời khuyên — và với REQ-09, đổi
giọng điệu theo nhân cách (Chuyên gia / Bà mẹ nghiêm khắc / Bạn thân / HLV). Con số thì SQL tính,
nhưng **biến con số thành hành vi tích cực** là việc của LLM (nudge — tham chiếu Thaler & Sunstein
trong tài liệu tham khảo của đề tài).

## 3. Bảng phân định: tác vụ → có cần LLM không

| Tác vụ | Cần LLM? | Lý do / Cách làm đúng |
|---|---|---|
| Tổng chi tháng, theo danh mục | ❌ | SQL aggregate — chính xác, rẻ |
| Số dư ví, net worth | ❌ | Truy vấn trực tiếp |
| So sánh kỳ, xu hướng | ❌ | Aggregate + (LLM chỉ diễn giải nếu cần) |
| Bóc tách "ăn phở 50k" | ⚠️ | Regex đủ cho mẫu đơn giản; LLM cho câu phức |
| Bóc tách câu tự nhiên/đa ngôn ngữ | ✅ | Regex gãy, LLM ổn định |
| Trích xuất từ OCR hóa đơn | ✅ | Chọn đúng tổng tiền giữa dữ liệu nhiễu |
| Trích xuất từ voice transcript | ✅ | Loại từ đệm, hiểu ngữ cảnh |
| Suy luận danh mục mơ hồ / đề xuất danh mục mới | ✅ | Ngữ nghĩa vượt bảng alias tĩnh |
| Nhận diện ý định (tạo bill / đổi nhân cách / hỏi) | ✅ | Router ngôn ngữ tự nhiên |
| Hỏi lại khi thiếu/mơ hồ thông tin | ✅ | Hội thoại đa lượt |
| Lời khuyên cá nhân hóa & theo nhân cách | ✅ | Giá trị khác biệt cốt lõi (REQ-09) |
| Nhận diện chi phí cố định từ lịch sử | ⚠️ | Hiện làm bằng giải thuật thống kê; LLM có thể tăng độ chính xác đặt tên |

Chú thích: ✅ nên dùng LLM · ⚠️ tùy độ phức tạp · ❌ không nên dùng LLM (dùng truy vấn).

## 4. Kết luận cho báo cáo

LLM trong PERFIN **không phải để trả lời câu hỏi mà SQL trả lời được**. Vai trò của nó là cây cầu
giữa **ngôn ngữ tự do của con người** và **dữ liệu có cấu trúc**: hiểu đầu vào hỗn loạn (chat/ảnh/
giọng nói), định tuyến ý định, và biến số liệu khô khan thành tương tác cá nhân hóa. Phần tính
toán nặng về độ chính xác vẫn thuộc về cơ sở dữ liệu và giải thuật — đúng tinh thần "Dữ liệu &
Giải thuật" của niên luận. Đây cũng là lập luận nên đưa vào Chương 2 (cơ sở lý thuyết) và Chương 4
(kết luận) để biện minh cho lựa chọn kiến trúc lai (LLM + SQL) thay vì "LLM cho mọi thứ".

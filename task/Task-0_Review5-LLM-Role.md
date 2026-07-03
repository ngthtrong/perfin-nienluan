# Task 0: Tạo `/Review5.md` — Làm rõ vai trò của LLM trong hệ thống PERFIN

## 🎯 Mục tiêu

Viết tài liệu phân tích **vai trò thực sự của LLM (Large Language Model)** trong hệ thống PERFIN, trả lời câu hỏi cốt lõi: **"LLM mang lại giá trị gì mà việc lọc/hiển thị dữ liệu thông thường không làm được?"**

## 📍 File đầu ra

`/Review5.md` (đặt tại root dự án: `/home/ngthtrong/perfin-nienluan/Review5.md`)

## 📋 Nội dung cần bao gồm

### Phần 1: Vấn đề — Tại sao không chỉ dùng bộ lọc?

- Chỉ ra rằng nếu chỉ là hỏi đáp đơn giản ("tháng này chi bao nhiêu?", "danh mục nào tốn nhất?"), người dùng hoàn toàn có thể tự lọc/xem biểu đồ → LLM là thừa thãi
- Nêu rõ ranh giới giữa **"hiển thị dữ liệu"** (UI/filter làm được) vs **"phân tích dữ liệu"** (cần LLM)

### Phần 2: Vai trò cốt lõi của LLM — Trợ lý tài chính siêu cá nhân hóa

Phân tích chi tiết từng vai trò LLM, kèm ví dụ cụ thể trong ngữ cảnh PERFIN:

#### 2.1. Nhập liệu thông minh (NLP Entity Extraction)
- Input tự nhiên → tự bóc tách entity (tên, giá, danh mục, ví, thời gian)
- Ví dụ: `"ăn phở sáng nay 45k bằng Momo"` → LLM hiểu được 5 thực thể

#### 2.2. Auto-Categorization thông minh
- Suy đoán danh mục dựa trên ngữ cảnh, không phải keyword mapping đơn giản
- Ví dụ: `"grab đi bệnh viện"` → "Y tế" chứ không phải "Di chuyển"
- **Gợi ý danh mục mới:** Khi LLM thấy nhiều giao dịch không khớp danh mục hiện có, có thể chủ động gợi ý tạo danh mục mới (ví dụ: nếu user hay ghi "cà phê sáng", "cà phê chiều" → gợi ý tách danh mục "Cà phê" riêng khỏi "Ăn uống")

#### 2.3. Persona / Nhân cách AI (REQ-09)
- Không chỉ thay đổi giọng điệu, mà thay đổi **cách tiếp cận tư vấn**:
  - **Bà mẹ nghiêm khắc:** Cằn nhằn khi tiêu quá budget, so sánh với tháng trước
  - **Chuyên gia tài chính:** Phân tích xu hướng, đề xuất chiến lược tiết kiệm dài hạn
  - **Bạn thân:** Nhẹ nhàng nhắc nhở, khích lệ khi tiết kiệm tốt
- LLM mới có khả năng duy trì persona xuyên suốt cuộc hội thoại, rule-based sẽ cứng nhắc và dễ đoán

#### 2.4. Phát hiện điểm mù tài chính (Proactive Insights)
> **Đây là giá trị lớn nhất của LLM — nhìn ra điều mà người bình thường dễ bỏ sót**

- **Phát hiện xu hướng leo thang:** "Chi tiêu Grab của bạn đã tăng 15% mỗi tháng trong 3 tháng qua. Nếu tiếp tục, tháng tới bạn sẽ vượt 600k cho riêng di chuyển."
- **Phát hiện chi tiêu bất thường ẩn:** "Bạn có 12 giao dịch subscription dưới 50k mỗi cái, nhưng tổng cộng là 480k/tháng — gần bằng tiền ăn 1 tuần."
- **Cảnh báo dòng tiền (Cashflow Warning):** "Với tốc độ chi tiêu hiện tại, số dư ví chính sẽ về 0 trước ngày lương (ngày 25) khoảng 5 ngày."
- **Phát hiện pattern lặp:** "Mỗi thứ 6, bạn chi trung bình 200k cho giải trí — nhiều hơn 3 lần so với ngày thường."
- **Cross-category correlation:** "Khi chi tiêu Ăn uống tăng, chi tiêu Sức khỏe cũng tăng sau 2 tuần → có thể liên quan đến thói quen ăn ngoài."

#### 2.5. Nhắc nhở chủ động thông minh (REQ-08)
- Không chỉ nhắc "đến hạn trả tiền phòng", mà nhắc kèm ngữ cảnh:
  - "Hôm nay đến hạn trả tiền phòng 2.5tr, nhưng ví chính chỉ còn 1.8tr. Bạn cần chuyển thêm 700k từ ví tiết kiệm."
- LLM hiểu **ngữ cảnh tổng thể** nên nhắc nhở có giá trị hơn cron job đơn thuần

#### 2.6. Xử lý đa phương thức (OCR + Voice → Structured Data)
- OCR trích xuất text thô từ hóa đơn → LLM hiểu cấu trúc và bóc tách thành giao dịch có ý nghĩa
- Voice-to-Text cho text thô → LLM hiểu intent và extract entity (một câu nói có thể chứa nhiều giao dịch)

### Phần 3: Tổng kết — So sánh "Có LLM" vs "Không có LLM"

Tạo bảng so sánh:

| Khả năng | Không có LLM (UI + Filter) | Có LLM |
|----------|----------------------------|--------|
| Xem chi tiêu tháng | ✅ Biểu đồ, bộ lọc | ✅ + Nhận xét, so sánh trend |
| Nhập giao dịch | ❌ Form thủ công | ✅ Chat tự nhiên |
| Phát hiện bất thường | ❌ Tự nhìn biểu đồ | ✅ AI chủ động cảnh báo |
| Tư vấn cá nhân hóa | ❌ | ✅ Dựa trên data thực tế |
| Dự đoán tương lai | ❌ | ✅ Dựa trên xu hướng |

### Phần 4: Kết luận

- LLM trong PERFIN **không phải chatbot hỏi đáp** mà là **trợ lý tài chính cá nhân**
- Giá trị chính: nhìn ra bức tranh lớn từ data rời rạc, phát hiện pattern mà con người dễ bỏ sót
- Mục tiêu: biến mỗi tin nhắn phản hồi thành một "lời khuyên tài chính" có giá trị, không chỉ là echo lại data

## ⚠️ Lưu ý khi thực hiện

- File nên viết bằng **tiếng Việt**, markdown format
- Ví dụ cần **cụ thể**, liên quan đến người dùng Việt Nam (VNĐ, Momo, Grab, tiền phòng trọ...)
- Tham khảo REQ-01 đến REQ-09 trong `doc/requirements/` để đảm bảo phủ đúng các feature đã đặc tả
- Tham khảo Report_v0 phần 3.1.3 (Yêu cầu chức năng) để hiểu scope hệ thống

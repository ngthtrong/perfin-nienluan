# PerFin (Rolly) - Sequence Diagrams

> Các sơ đồ tuần tự mô tả luồng hoạt động chính của ứng dụng quản lý tài chính cá nhân PerFin.

---

## 1. Nhập liệu bằng văn bản → AI Engine → Tự động phân loại → Lưu giao dịch

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant App as Ứng dụng PerFin
    participant AI as AI Engine
    participant DB as Cơ sở dữ liệu

    User->>App: Nhập văn bản giao dịch<br/>("Ăn phở 50k sáng nay")
    App->>AI: Gửi văn bản để phân tích NLP
    AI->>AI: Phân tích ngữ nghĩa<br/>(trích xuất: số tiền, danh mục, thời gian)
    AI-->>App: Trả về kết quả phân tích<br/>{amount: 50000, category: "Ăn uống",<br/>date: "2026-05-27", note: "Ăn phở"}

    App->>App: Hiển thị kết quả để xác nhận
    User->>App: Xác nhận thông tin giao dịch

    App->>DB: Lưu Transaction mới
    DB-->>App: Xác nhận lưu thành công
    App->>DB: Lưu AILog (input, output, confidence)
    DB-->>App: OK

    App-->>User: Hiển thị thông báo<br/>"Đã lưu giao dịch thành công ✅"
```

---

## 2. Nhập liệu bằng giọng nói → Speech-to-Text → AI Engine → Lưu

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant App as Ứng dụng PerFin
    participant STT as Speech-to-Text Service
    participant AI as AI Engine
    participant DB as Cơ sở dữ liệu

    User->>App: Nhấn nút ghi âm 🎙️
    App->>App: Bắt đầu ghi âm
    User->>App: Nói: "Chi hai trăm ngàn<br/>đổ xăng xe máy"
    User->>App: Nhấn dừng ghi âm

    App->>STT: Gửi file âm thanh
    STT->>STT: Chuyển đổi giọng nói → văn bản
    STT-->>App: Trả về văn bản:<br/>"Chi hai trăm ngàn đổ xăng xe máy"

    App->>AI: Gửi văn bản để phân tích NLP
    AI->>AI: Phân tích ngữ nghĩa<br/>(trích xuất thông tin giao dịch)
    AI-->>App: Kết quả phân tích<br/>{amount: 200000, category: "Di chuyển",<br/>subcategory: "Xăng dầu", type: "expense"}

    App->>App: Hiển thị kết quả để xác nhận
    User->>App: Xác nhận / chỉnh sửa

    App->>DB: Lưu Transaction
    DB-->>App: OK
    App->>DB: Lưu AILog (voice input)
    DB-->>App: OK

    App-->>User: "Đã lưu giao dịch thành công ✅"
```

---

## 3. Nhập liệu bằng hình ảnh/OCR → Hóa đơn chi tiết → Lưu nhiều giao dịch

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant App as Ứng dụng PerFin
    participant OCR as OCR Service
    participant AI as AI Engine
    participant DB as Cơ sở dữ liệu

    User->>App: Chụp ảnh / chọn ảnh hóa đơn 📸
    App->>OCR: Gửi hình ảnh hóa đơn

    OCR->>OCR: Xử lý ảnh<br/>(tiền xử lý, nhận dạng ký tự)
    OCR-->>App: Trả về văn bản trích xuất<br/>(raw text từ hóa đơn)

    App->>AI: Gửi raw text để phân tích
    AI->>AI: Phân tích hóa đơn chi tiết<br/>(nhận dạng từng mục hàng,<br/>số tiền, tổng cộng)
    AI-->>App: Trả về danh sách giao dịch:<br/>[{item: "Gạo", amount: 120000, cat: "Thực phẩm"},<br/> {item: "Nước mắm", amount: 35000, cat: "Thực phẩm"},<br/> {item: "Bột giặt", amount: 89000, cat: "Sinh hoạt"}]

    App->>App: Hiển thị danh sách các mục<br/>để người dùng xem & chỉnh sửa

    User->>App: Chỉnh sửa danh mục nếu cần
    User->>App: Xác nhận lưu tất cả

    loop Với mỗi mục hàng trong danh sách
        App->>DB: Lưu Transaction
        DB-->>App: OK
    end

    App->>DB: Lưu AILog (OCR input, kết quả)
    App->>DB: Lưu Attachment (ảnh hóa đơn gốc)
    DB-->>App: OK

    App-->>User: "Đã lưu 3 giao dịch thành công ✅"
```

---

## 4. Luồng AI làm rõ thông tin (thiếu dữ liệu → hỏi → trả lời → lưu)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant App as Ứng dụng PerFin
    participant AI as AI Engine
    participant Personality as AI Personality
    participant DB as Cơ sở dữ liệu

    User->>App: Nhập: "Chi tiền sáng nay"
    App->>AI: Gửi văn bản để phân tích

    AI->>AI: Phân tích → phát hiện<br/>thiếu thông tin (số tiền?)
    AI-->>App: Trả về: cần làm rõ<br/>{status: "need_clarification",<br/>missing: ["amount"],<br/>partial: {date: "today", type: "expense"}}

    App->>DB: Lấy UserPersonalitySetting
    DB-->>App: personality = "angry_mom"

    App->>Personality: Format câu hỏi theo tính cách<br/>"Angry Mom"
    Personality-->>App: "Trời ơi con ơi! Chi bao nhiêu<br/>mà không nhớ? Nói mẹ nghe<br/>số tiền đi con! 😤"

    App-->>User: Hiển thị câu hỏi AI
    User->>App: Trả lời: "50 ngàn"

    App->>AI: Gửi thông tin bổ sung
    AI->>AI: Ghép thông tin:<br/>{amount: 50000, date: "today",<br/>type: "expense", category: "Khác"}
    AI-->>App: Kết quả hoàn chỉnh

    App->>App: Hiển thị để xác nhận
    User->>App: Chọn danh mục "Ăn uống"
    User->>App: Xác nhận lưu

    App->>DB: Lưu Transaction
    DB-->>App: OK
    App->>DB: Lưu AILog (multi-turn conversation)
    DB-->>App: OK

    App-->>User: "Đã lưu! Lần sau nhớ nói<br/>rõ ràng nghen con! 😤✅"
```

---

## 5. Luồng cảnh báo ngân sách (giao dịch mới → kiểm tra → cảnh báo)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant App as Ứng dụng PerFin
    participant DB as Cơ sở dữ liệu
    participant BudgetSvc as Budget Service
    participant Notif as Notification Service

    User->>App: Lưu giao dịch mới<br/>(Ăn uống - 150,000đ)
    App->>DB: INSERT Transaction
    DB-->>App: OK

    App->>BudgetSvc: Kiểm tra ngân sách liên quan

    BudgetSvc->>DB: Lấy Budget theo category "Ăn uống"<br/>& Budget tổng (nếu có)
    DB-->>BudgetSvc: Budget "Ăn uống": limit = 3,000,000đ

    BudgetSvc->>DB: Tính tổng chi tiêu tháng này<br/>cho category "Ăn uống"
    DB-->>BudgetSvc: totalSpent = 2,700,000đ<br/>(đã bao gồm giao dịch mới)

    BudgetSvc->>BudgetSvc: Tính tỷ lệ: 2,700,000 / 3,000,000 = 90%<br/>→ Vượt ngưỡng cảnh báo (80%)

    BudgetSvc->>DB: Tạo BudgetAlert<br/>{type: "WARNING_90%", budgetId, percentage: 90}
    DB-->>BudgetSvc: OK

    BudgetSvc-->>App: Alert: Đã chi 90% ngân sách

    App->>Notif: Gửi push notification
    Notif-->>User: 🔔 "Cảnh báo: Bạn đã chi 90%<br/>ngân sách Ăn uống (2,700,000 / 3,000,000đ).<br/>Còn lại 300,000đ cho tháng này."

    alt Ngân sách vượt 100%
        BudgetSvc->>DB: Tạo BudgetAlert<br/>{type: "EXCEEDED", budgetId}
        BudgetSvc->>Notif: Gửi cảnh báo khẩn
        Notif-->>User: 🚨 "VƯỢT NGÂN SÁCH!<br/>Bạn đã chi vượt mức cho phép."
    end
```

---

## 6. Luồng nhắc nhở giao dịch định kỳ

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Hệ thống Cron Job
    participant System as System Service
    participant DB as Cơ sở dữ liệu
    participant Notif as Notification Service
    actor User as Người dùng
    participant App as Ứng dụng PerFin

    Cron->>System: Trigger kiểm tra hàng ngày (00:00)

    System->>DB: Lấy danh sách Reminder & RecurringTransaction<br/>có nextDueDate = today
    DB-->>System: Danh sách nhắc nhở:<br/>1. Tiền nhà (5,000,000đ) - RecurringTransaction<br/>2. Trả nợ (1,000,000đ) - Reminder (Debt)

    loop Với mỗi Reminder/RecurringTransaction
        System->>Notif: Gửi push notification
        Notif-->>User: 🔔 "Nhắc nhở: Hôm nay cần trả<br/>Tiền nhà 5,000,000đ"
    end

    User->>App: Mở thông báo nhắc nhở
    App-->>User: Hiển thị chi tiết nhắc nhở

    alt Người dùng xác nhận đã chi
        User->>App: Nhấn "Đã thanh toán"
        App->>DB: Tạo Transaction từ RecurringTransaction
        DB-->>App: OK
        App->>DB: Cập nhật nextDueDate<br/>(tính ngày tiếp theo theo recurrence rule)
        DB-->>App: OK
        App-->>User: "Đã ghi nhận thanh toán ✅"
    else Người dùng bỏ qua
        User->>App: Nhấn "Nhắc lại sau"
        App->>DB: Cập nhật Reminder<br/>(snooze / đánh dấu chưa xử lý)
        DB-->>App: OK
    else Người dùng bỏ qua (tự động)
        System->>DB: Đánh dấu Reminder là "missed"
        DB-->>System: OK
    end
```

---

## 7. Luồng xuất dữ liệu (Export)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant App as Ứng dụng PerFin
    participant DB as Cơ sở dữ liệu
    participant ExportSvc as Export Service
    participant Storage as File Storage

    User->>App: Chọn "Xuất dữ liệu"
    App-->>User: Hiển thị tùy chọn xuất:<br/>- Định dạng: CSV / PDF<br/>- Khoảng thời gian<br/>- Danh mục / Ví

    User->>App: Chọn: PDF, Tháng 5/2026,<br/>Tất cả danh mục, Ví "Tiền mặt"
    App->>DB: Tạo ExportJob<br/>{format: "PDF", status: "PENDING",<br/>dateRange, filters}
    DB-->>App: exportJobId

    App->>ExportSvc: Bắt đầu xuất (exportJobId)

    ExportSvc->>DB: Lấy dữ liệu Transaction<br/>theo bộ lọc
    DB-->>ExportSvc: Danh sách giao dịch

    ExportSvc->>DB: Lấy thông tin Category, Wallet
    DB-->>ExportSvc: Metadata

    ExportSvc->>ExportSvc: Tạo file PDF<br/>(bảng biểu, tổng hợp, biểu đồ)

    ExportSvc->>Storage: Lưu file PDF
    Storage-->>ExportSvc: fileUrl

    ExportSvc->>DB: Cập nhật ExportJob<br/>{status: "COMPLETED", fileUrl}
    DB-->>ExportSvc: OK

    ExportSvc-->>App: Xuất hoàn tất

    App-->>User: 📄 "File PDF đã sẵn sàng!<br/>Nhấn để tải xuống hoặc chia sẻ"

    User->>App: Nhấn "Tải xuống"
    App->>Storage: Tải file PDF
    Storage-->>App: File PDF
    App-->>User: Lưu file vào thiết bị ✅
```

---

## 8. Luồng chi tiêu ví chung (thêm chi phí → chia → tính nợ)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Chủ ví chung
    participant App as Ứng dụng PerFin
    participant DB as Cơ sở dữ liệu
    participant SplitSvc as Split Service
    participant Notif as Notification Service
    actor Member1 as Thành viên A
    actor Member2 as Thành viên B

    Owner->>App: Mở Shared Wallet "Nhóm bạn"
    Owner->>App: Thêm chi phí mới:<br/>"Ăn lẩu" - 900,000đ

    App->>App: Hiển thị tùy chọn chia:<br/>- Chia đều<br/>- Chia theo tỷ lệ<br/>- Chia theo số tiền cụ thể

    Owner->>App: Chọn "Chia đều" cho 3 người<br/>(Owner, Member A, Member B)

    App->>SplitSvc: Tính toán chia tiền

    SplitSvc->>SplitSvc: Tính: 900,000 / 3 = 300,000đ mỗi người<br/>Owner đã trả → A nợ 300k, B nợ 300k

    SplitSvc->>DB: Lưu SharedTransaction<br/>{sharedWalletId, paidBy: Owner,<br/>amount: 900000, splitMethod: "EQUAL"}
    DB-->>SplitSvc: OK

    SplitSvc->>DB: Cập nhật số dư nợ từng thành viên<br/>- Member A: owes Owner 300,000đ<br/>- Member B: owes Owner 300,000đ
    DB-->>SplitSvc: OK

    SplitSvc-->>App: Kết quả chia tiền

    App->>Notif: Gửi thông báo cho các thành viên
    Notif-->>Member1: 🔔 "Owner đã thêm chi phí 'Ăn lẩu'<br/>900,000đ. Phần của bạn: 300,000đ"
    Notif-->>Member2: 🔔 "Owner đã thêm chi phí 'Ăn lẩu'<br/>900,000đ. Phần của bạn: 300,000đ"

    Member1->>App: Xem chi tiết & nhấn "Đã trả"
    App->>DB: Cập nhật trạng thái thanh toán<br/>Member A → Owner: SETTLED
    DB-->>App: OK

    App->>Notif: Thông báo cho Owner
    Notif-->>Owner: "✅ Member A đã thanh toán 300,000đ"

    Owner->>App: Xem tổng hợp nợ ví chung
    App->>DB: Lấy tất cả outstanding debts
    DB-->>App: Danh sách: Member B còn nợ 300,000đ
    App-->>Owner: Hiển thị bảng tổng hợp nợ
```

# Sequence Diagrams

## 1. Flow Nhập liệu Văn bản & Phân loại tự động
```mermaid
sequenceDiagram
    actor User
    participant App as Mobile App
    participant API as API Gateway
    participant AI as AI Engine
    participant DB as Database

    User->>App: Nhập text "Uống cafe 50k"
    App->>API: POST /transactions/text
    API->>AI: Phân tích NLP (text)
    AI-->>API: JSON {Amount: 50000, Category: "Ăn uống", Type: Expense}
    API->>DB: Lưu Transaction
    DB-->>API: Success
    API-->>App: Trả về UI giao dịch đã lưu
    App-->>User: Hiển thị giao dịch & số dư mới
```

## 2. Flow Nhập liệu Giọng nói
```mermaid
sequenceDiagram
    actor User
    participant App as Mobile App
    participant STT as Speech-to-Text API
    participant API as API Gateway
    participant AI as AI Engine
    participant DB as Database

    User->>App: Bấm mic & nói "Đổ xăng 100 ngàn"
    App->>STT: Gửi file audio
    STT-->>App: Trả về text "Đổ xăng 100 ngàn"
    App->>API: POST /transactions/text
    API->>AI: Phân tích NLP (text)
    AI-->>API: JSON {Amount: 100000, Category: "Di chuyển", Type: Expense}
    API->>DB: Lưu Transaction
    DB-->>API: Success
    API-->>App: Trả về UI giao dịch đã lưu
```

## 3. Flow Nhập liệu Hình ảnh & OCR
```mermaid
sequenceDiagram
    actor User
    participant App as Mobile App
    participant Storage as S3 Storage
    participant API as API Gateway
    participant OCR as OCR Service
    participant AI as AI Engine

    User->>App: Chụp ảnh hóa đơn siêu thị
    App->>Storage: Upload ảnh
    Storage-->>App: Trả về URL ảnh
    App->>API: POST /transactions/image {url}
    API->>OCR: Trích xuất text từ ảnh
    OCR-->>API: Raw Text OCR
    API->>AI: Bóc tách itemized (nhiều món)
    AI-->>API: Array of JSON [{Món 1}, {Món 2}]
    API-->>App: Trả về danh sách draft để User xác nhận
    User->>App: Xác nhận & Lưu
    App->>API: POST /transactions/bulk
```

## 4. Flow Cảnh báo Ngân sách
```mermaid
sequenceDiagram
    participant API as API Gateway
    participant Budget as Budget Service
    participant DB as Database
    participant Notification as Push Notification

    API->>DB: Lưu giao dịch chi phí mới
    DB-->>API: Success
    API->>Budget: Trigger check_budget()
    Budget->>DB: Lấy ngân sách hiện tại & tổng chi
    DB-->>Budget: Data
    Budget->>Budget: Tính toán tỷ lệ %
    
    alt Tỷ lệ >= 90%
        Budget->>DB: Lưu BudgetAlert
        Budget->>Notification: Send Warning Alert
    else Tỷ lệ >= 100%
        Budget->>DB: Lưu BudgetAlert
        Budget->>Notification: Send Exceeded Alert
    end
```

## 5. Flow Nhắc nhở Giao dịch định kỳ
```mermaid
sequenceDiagram
    participant Cron as Cron Job Scheduler
    participant Reminder as Reminder Service
    participant DB as Database
    participant Notification as Push Notification

    Cron->>Reminder: Chạy daily check lúc 08:00 AM
    Reminder->>DB: Query các nhắc nhở đến hạn hôm nay
    DB-->>Reminder: Danh sách nhắc nhở
    loop Cho mỗi nhắc nhở
        Reminder->>Notification: Gửi Push Notification "Đến hạn thanh toán..."
    end
```

## 6. Flow Ví dùng chung (Chia tiền)
```mermaid
sequenceDiagram
    actor UserA as User A (Thanh toán)
    participant App as Mobile App
    participant API as API Gateway
    participant AI as AI Engine
    participant Shared as Shared Wallet Service
    participant UserB as User B

    UserA->>App: Chat vào ví chung "Ăn lẩu 600k chia đôi"
    App->>API: POST /shared-wallets/transactions
    API->>AI: Phân tích ngữ cảnh
    AI-->>API: {Amount: 600k, Payer: A, Split: [A:300k, B:300k]}
    API->>Shared: Ghi nhận nợ (B nợ A 300k)
    Shared->>API: Success
    API-->>App: Update UI
    API->>UserB: Push Notification "A đã thêm giao dịch..."
```

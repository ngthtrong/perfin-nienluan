# State Diagrams

## 1. Trạng thái Giao dịch (Transaction)
```mermaid
stateDiagram-v2
    [*] --> Draft: Đang chờ Confirm (Từ ảnh OCR)
    [*] --> Active: Lưu thành công
    Draft --> Active: User Xác nhận
    Draft --> [*]: User Hủy
    
    Active --> SoftDeleted: User Xóa
    SoftDeleted --> Active: Undo (trong vòng 30s)
    SoftDeleted --> HardDeleted: Hết 48h hoặc Xóa vĩnh viễn
    HardDeleted --> [*]
```

## 2. Trạng thái Ngân sách (Budget)
```mermaid
stateDiagram-v2
    [*] --> Active: Bắt đầu chu kỳ
    
    Active --> NearLimit: Chi tiêu >= 70%
    NearLimit --> Warning: Chi tiêu >= 90%
    Warning --> Exceeded: Chi tiêu >= 100%
    
    Active --> Expired: Hết hạn chu kỳ
    NearLimit --> Expired: Hết hạn chu kỳ
    Warning --> Expired: Hết hạn chu kỳ
    Exceeded --> Expired: Hết hạn chu kỳ
    
    Expired --> Renewed: Tự động gia hạn (Tháng mới)
    Renewed --> Active
```

## 3. Trạng thái Nhắc nhở (Reminder)
```mermaid
stateDiagram-v2
    [*] --> Active: Đã đặt lịch
    
    Active --> Triggered: Đến hạn
    Triggered --> Confirmed: User xác nhận đã trả
    Triggered --> Skipped: User bỏ qua kỳ này
    Triggered --> Rescheduled: User lùi ngày
    
    Confirmed --> Active: Lên lịch kỳ tiếp theo (Nếu Recurring)
    Skipped --> Active: Lên lịch kỳ tiếp theo (Nếu Recurring)
    Rescheduled --> Active: Cập nhật lại ngày
    
    Active --> Paused: User tạm dừng
    Paused --> Active: User bật lại
    Active --> Canceled: User xóa nhắc nhở
    Canceled --> [*]
```

## 4. Trạng thái Khoản nợ (Debt/Loan)
```mermaid
stateDiagram-v2
    [*] --> Active: Tạo khoản vay/nợ mới
    
    Active --> PartiallyPaid: Trả một phần
    PartiallyPaid --> Active: Vẫn còn nợ
    PartiallyPaid --> Paid: Đã trả hết
    Active --> Paid: Trả hết 1 lần
    
    Active --> Overdue: Quá hạn thanh toán
    PartiallyPaid --> Overdue: Quá hạn thanh toán
    Overdue --> Paid: Thanh toán trễ
    Overdue --> PartiallyPaid: Thanh toán một phần trễ
    
    Paid --> [*]
```

## 5. Trạng thái Ví dùng chung (Shared Wallet)
```mermaid
stateDiagram-v2
    [*] --> Active: Tạo mới
    Active --> Settled: Tất cả nợ đã được thanh toán
    Settled --> Active: Có giao dịch mới phát sinh
    Settled --> Archived: User chọn Đóng ví
    Archived --> [*]
```

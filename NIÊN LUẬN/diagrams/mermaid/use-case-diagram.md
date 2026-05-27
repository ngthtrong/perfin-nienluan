# Use Case Diagram

```mermaid
usecaseDiagram
  actor User as "Người dùng (User)"
  actor AI as "AI Engine"
  actor Admin as "Quản trị viên (Admin)"
  actor System as "Hệ thống (System)"

  package "Rolly - Quản lý Tài chính Thông minh" {
    usecase "Ghi chép giao dịch (Text/Voice/Image)" as UC1
    usecase "Phân loại tự động (Auto-Categorization)" as UC2
    usecase "Quản lý ngân sách (Budget)" as UC3
    usecase "Xem báo cáo & Phân tích (Analytics)" as UC4
    usecase "Quản lý đa ví (Multi-Account)" as UC5
    usecase "Nhắc nhở & Lập lịch" as UC6
    usecase "Xuất dữ liệu & Sao lưu" as UC7
    usecase "Xác thực & Bảo mật" as UC8
    usecase "Đổi nhân cách AI" as UC9
    usecase "Quản lý ví dùng chung (Collaboration)" as UC10
    
    usecase "Sinh AI Insight" as UC11
    usecase "Gửi thông báo vượt ngân sách" as UC12
  }

  User --> UC1
  User --> UC3
  User --> UC4
  User --> UC5
  User --> UC6
  User --> UC7
  User --> UC8
  User --> UC9
  User --> UC10

  AI --> UC2
  AI --> UC11
  
  System --> UC12
  System --> UC7
  System --> UC6

  UC1 ..> UC2 : <<include>>
  UC4 ..> UC11 : <<extend>>
  UC3 ..> UC12 : <<extend>>
```

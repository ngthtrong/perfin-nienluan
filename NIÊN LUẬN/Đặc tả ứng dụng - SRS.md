---
tags:
  - nien-luan
---
# Đặc tả ứng dụng - SRS (Software Requirements Specification)

## Tổng quan dự án (Project Overview)
**Tên dự án:** Rolly - Trợ lý Tài chính Cá nhân Thông minh (AI-Powered Personal Finance Assistant)
**Mục tiêu:** Giúp người dùng quản lý chi tiêu dễ dàng thông qua các phương thức nhập liệu bằng AI (chat, voice, hình ảnh) thay vì thao tác nhập tay phức tạp truyền thống.

## Danh sách Yêu cầu (Requirements)
Dự án được chia thành 10 tài liệu đặc tả yêu cầu (REQ) riêng biệt, phân rã theo từng tính năng lớn:

- [[requirements/REQ-01 Nhập liệu đa phương thức bằng AI (AI-Powered Input)]]
- [[requirements/REQ-02 Phân loại thông minh (Auto-Categorization)]]
- [[requirements/REQ-03 Quản lý ngân sách (Budget Management)]]
- [[requirements/REQ-04 Báo cáo và phân tích chi tiêu (Spending Analytics)]]
- [[requirements/REQ-05 Quản lý tài khoản đa nguồn (Multi-Account)]]
- [[requirements/REQ-06 Nhắc nhở và lập lịch giao dịch (Reminders)]]
- [[requirements/REQ-07 Xuất dữ liệu và sao lưu (Export & Backup)]]
- [[requirements/REQ-08 Bảo mật và xác thực (Security & Auth)]]
- [[requirements/REQ-09 Nhân cách AI (AI Personalities)]]
- [[requirements/REQ-10 Tương tác đa chiều và hợp tác (Collaboration)]]

---

## Kiến trúc Hệ thống và Sơ đồ (System Architecture & Diagrams)
Dưới đây là tập hợp các sơ đồ kỹ thuật mô tả cấu trúc và luồng hoạt động của hệ thống Rolly, được cung cấp dưới 2 định dạng (Mermaid và PlantUML):

### 1. Sơ đồ Use Case (Use Case Diagram)
Mô tả các hành vi người dùng và AI tương tác với hệ thống:
- Bản Mermaid: [[diagrams/mermaid/use-case-diagram|Use Case Diagram (Mermaid)]]
- Bản PlantUML: [[diagrams/puml/use-case-diagram|Use Case Diagram (PlantUML)]]

### 2. Sơ đồ Lớp (Class Diagram)
Cấu trúc các thực thể cốt lõi (User, Transaction, Category, Wallet...):
- Bản Mermaid: [[diagrams/mermaid/class-diagram|Class Diagram (Mermaid)]]
- Bản PlantUML: [[diagrams/puml/class-diagram|Class Diagram (PlantUML)]]

### 3. Sơ đồ Tuần tự (Sequence Diagrams)
Các luồng tương tác chi tiết cho Nhập liệu NLP, Nhắc nhở, Ngân sách:
- Bản Mermaid: [[diagrams/mermaid/sequence-diagrams|Sequence Diagrams (Mermaid)]]
- Bản PlantUML: [[diagrams/puml/sequence-diagrams|Sequence Diagrams (PlantUML)]]

### 4. Sơ đồ Thực thể - Liên kết (ER Diagram)
Thiết kế Database (Primary Key, Foreign Key):
- Bản Mermaid: [[diagrams/mermaid/er-diagram|ER Diagram (Mermaid)]]
- Bản PlantUML: [[diagrams/puml/er-diagram|ER Diagram (PlantUML)]]

### 5. Sơ đồ Thành phần (Component Diagram)
Kiến trúc Microservices và luồng kết nối API/AI/DB:
- Bản Mermaid: [[diagrams/mermaid/component-diagram|Component Diagram (Mermaid)]]
- Bản PlantUML: [[diagrams/puml/component-diagram|Component Diagram (PlantUML)]]

### 6. Sơ đồ Hoạt động (Activity Diagrams)
Các luồng nghiệp vụ kinh doanh như Tạo giao dịch, Phân loại:
- Bản Mermaid: [[diagrams/mermaid/activity-diagrams|Activity Diagrams (Mermaid)]]
- Bản PlantUML: [[diagrams/puml/activity-diagrams|Activity Diagrams (PlantUML)]]

### 7. Sơ đồ Trạng thái (State Diagrams)
Vòng đời của Transaction, Budget, Reminder, Debt:
- Bản Mermaid: [[diagrams/mermaid/state-diagram|State Diagrams (Mermaid)]]
- Bản PlantUML: [[diagrams/puml/state-diagram|State Diagrams (PlantUML)]]

### 8. Sơ đồ Triển khai (Deployment Diagram)
Kiến trúc hạ tầng mạng, Client-Server-Cloud:
- Bản Mermaid: [[diagrams/mermaid/deployment-diagram|Deployment Diagram (Mermaid)]]
- Bản PlantUML: [[diagrams/puml/deployment-diagram|Deployment Diagram (PlantUML)]]

---

*Lưu ý: Các file nháp kiến trúc cũ đã được đưa vào thư mục `archive/` để giữ gìn lịch sử phát triển.*
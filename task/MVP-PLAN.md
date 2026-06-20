# 📋 KẾ HOẠCH MVP — PERFIN v1

> **Dự án:** PERFIN — Trợ lý Tài chính Cá nhân Thông minh  
> **Phiên bản:** v1 (MVP — Minimum Viable Product)  
> **Ngày tạo:** 2026-06-20  
> **Cập nhật lần cuối:** 2026-06-20

---

## 1. 📊 Phân tích Hiện trạng

### ✅ Đã hoàn thành
| Hạng mục | Chi tiết |
|----------|---------|
| **Tài liệu yêu cầu** | 9 REQ đặc tả chi tiết (REQ-01 → REQ-09) |
| **Backend boilerplate** | Node.js/Express, kết nối PostgreSQL |
| **Frontend boilerplate** | React Native Expo, giao diện chat cơ bản |
| **AI demo** | Gemini API (`/api/chat`), GCP Vision (`/api/ocr`), GCP Speech (`/api/speech`) |
| **Test scripts** | Test riêng cho Gemini, ChatGPT, MongoDB, Redis |
| **Báo cáo LaTeX** | Khung mẫu + script convert Markdown → LaTeX |

### ❌ Chưa hoàn thành (cần làm cho MVP)
- Database schema chi tiết cho giao dịch, tài khoản, danh mục, ngân sách
- AI service xử lý ngôn ngữ tự nhiên → trích xuất thực thể giao dịch
- API endpoints CRUD cho giao dịch, danh mục, ngân sách, báo cáo
- Giao diện chat thông minh (hiểu ngữ cảnh, xác nhận giao dịch)
- Giao diện quản lý ví, thống kê, biểu đồ
- Luồng xử lý hoàn chỉnh: nhập → AI parse → phân loại → lưu DB → hiển thị

---

## 2. 🎯 Phạm vi MVP v1

Dựa trên tài liệu yêu cầu, MVP v1 tập trung vào **5 tính năng cốt lõi**:

| # | Tính năng | REQ | Phạm vi MVP |
|---|-----------|-----|-------------|
| 1 | **Nhập liệu bằng AI** | REQ-01 | Text input, speech-to-text tiếng Việt, OCR/Vision ảnh hóa đơn, trích xuất giao dịch |
| 2 | **Phân loại thông minh** | REQ-02 | Danh mục định sẵn, AI auto-categorize, cho phép sửa |
| 3 | **Quản lý ngân sách** | REQ-03 | Thiết lập ngân sách theo danh mục/tháng, hiển thị tiến độ |
| 4 | **Báo cáo cơ bản** | REQ-04 | Tổng thu/chi, biểu đồ tròn theo danh mục, biểu đồ cột theo tháng |
| 5 | **Tài khoản đơn** | REQ-05 | 1 ví chính mặc định, hiển thị số dư |

### Ngoài phạm vi MVP (sẽ làm ở v2+)
- ❌ REQ-06: Phân tách dòng tiền & tài sản
- ❌ REQ-07: Xuất dữ liệu & sao lưu
- ❌ REQ-08: Chi phí cố định & nhắc nhở
- ❌ REQ-09: Nhân cách AI

---

## 3. 🏗️ Kiến trúc Hệ thống MVP

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT NATIVE EXPO APP                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Chat UI  │  │Dashboard │  │ Budget   │  │ Transaction │ │
│  │(Chatbot) │  │(Reports) │  │ Manager  │  │   History   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
└───────┼──────────────┼──────────────┼───────────────┼───────┘
        │              │              │               │
        ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS API SERVER                         │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │
│  │ AI Service │  │ Transaction│  │ Budget / Report      │   │
│  │ (Gemini/   │  │    CRUD    │  │     Service          │   │
│  │  ChatGPT)  │  │  Service   │  │                      │   │
│  └─────┬──────┘  └─────┬──────┘  └──────────┬───────────┘   │
└────────┼───────────────┼─────────────────────┼──────────────┘
         │               │                     │
         ▼               ▼                     ▼
    ┌─────────┐   ┌─────────────┐
    │ Gemini  │   │ PostgreSQL  │
    │ / GPT   │   │  Database   │
    │  API    │   │             │
    └─────────┘   └─────────────┘
```

### Tech Stack xác nhận cho MVP
| Layer | Công nghệ | Ghi chú |
|-------|-----------|---------|
| Frontend | React Native Expo | Đã có boilerplate |
| Backend | Node.js + Express | Đã có boilerplate |
| Database | PostgreSQL | Đã có kết nối, cần thiết kế schema |
| AI Primary | Google Gemini API | Đã test, dùng làm primary |
| AI Fallback | OpenAI ChatGPT API | Đã test, dùng làm fallback |
| Vision/OCR | Google Cloud Vision | Upload/chụp ảnh hóa đơn từ mobile, OCR ra text rồi đưa vào AI parse |
| Speech-to-Text | Google Cloud Speech | Ghi âm từ mobile, chuyển tiếng Việt thành text rồi đưa vào AI parse |
| State Mgmt | React Hooks + Context | Lightweight cho MVP |

---

## 4. 📁 Cấu trúc Thư mục MVP

```
demo/v1/
├── backend/
│   ├── config/
│   │   └── database.js          # Cấu hình PostgreSQL pool
│   ├── models/
│   │   ├── category.model.js    # Model danh mục
│   │   ├── transaction.model.js # Model giao dịch
│   │   ├── account.model.js     # Model tài khoản/ví
│   │   └── budget.model.js      # Model ngân sách
│   ├── routes/
│   │   ├── ai.routes.js         # Endpoints AI (chat, parse)
│   │   ├── transaction.routes.js# CRUD giao dịch
│   │   ├── category.routes.js   # CRUD danh mục
│   │   ├── budget.routes.js     # CRUD ngân sách
│   │   ├── account.routes.js    # Thông tin tài khoản
│   │   └── report.routes.js     # Endpoints báo cáo
│   ├── services/
│   │   ├── ai.service.js        # Logic AI (Gemini + ChatGPT fallback)
│   │   ├── parser.service.js    # Trích xuất giao dịch từ AI response
│   │   └── report.service.js    # Logic tổng hợp báo cáo
│   ├── migrations/
│   │   └── 001_init_schema.sql  # SQL tạo bảng
│   ├── prompts/
│   │   └── transaction.prompt.js # Prompt templates cho AI
│   ├── index.js                 # Entry point (refactored)
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── screens/
│   │   │   ├── ChatScreen.js       # Màn hình chat chính
│   │   │   ├── DashboardScreen.js   # Dashboard tổng quan
│   │   │   ├── TransactionScreen.js # Lịch sử giao dịch
│   │   │   ├── BudgetScreen.js      # Quản lý ngân sách
│   │   │   └── ReportScreen.js      # Báo cáo & biểu đồ
│   │   ├── components/
│   │   │   ├── MessageBubble.js     # Bong bóng tin nhắn
│   │   │   ├── TransactionCard.js   # Card giao dịch
│   │   │   ├── CategoryPicker.js    # Chọn danh mục
│   │   │   ├── BudgetProgressBar.js # Thanh tiến độ ngân sách
│   │   │   └── Chart.js            # Components biểu đồ
│   │   ├── services/
│   │   │   └── api.service.js       # API client
│   │   ├── context/
│   │   │   └── AppContext.js        # Global state
│   │   └── utils/
│   │       ├── formatters.js        # Format tiền, ngày
│   │       └── constants.js         # Constants, categories
│   ├── App.js                       # Root (refactored, navigation)
│   └── package.json
```

---

## 5. 🗓️ Phân chia Phase

MVP được chia thành **5 phase**, mỗi phase là một milestone có thể demo:

| Phase | Tên | Mô tả | Task |
|-------|-----|--------|------|
| **Phase 0** | Foundation | Database schema, refactor project structure | TASK-01, TASK-02 |
| **Phase 1** | AI Core | AI service nhập liệu + phân loại giao dịch | TASK-03, TASK-04 |
| **Phase 2** | Transaction System | CRUD giao dịch, lịch sử, tài khoản | TASK-05, TASK-06 |
| **Phase 3** | Budget & Reports | Ngân sách, báo cáo, biểu đồ | TASK-07, TASK-08 |
| **Phase 4** | Integration & Polish | Tích hợp E2E, giao diện chat thông minh, kiểm thử | TASK-09, TASK-10 |

---

## 6. 📝 Danh sách Task tổng quan

| Task ID | Phase | Tên | Ưu tiên | Trạng thái |
|---------|-------|-----|---------|-----------|
| [TASK-01](file:///home/ngthtrong/perfin-nienluan/task/TASK-01-database-schema.md) | 0 | Thiết kế Database Schema | 🔴 Critical | ✅ DONE |
| [TASK-02](file:///home/ngthtrong/perfin-nienluan/task/TASK-02-project-restructure.md) | 0 | Refactor cấu trúc dự án | 🔴 Critical | ✅ DONE |
| [TASK-03](file:///home/ngthtrong/perfin-nienluan/task/TASK-03-ai-service.md) | 1 | Xây dựng AI Service | 🔴 Critical | ✅ DONE |
| [TASK-04](file:///home/ngthtrong/perfin-nienluan/task/TASK-04-category-system.md) | 1 | Hệ thống Danh mục phân loại | 🟡 High | ✅ DONE |
| [TASK-05](file:///home/ngthtrong/perfin-nienluan/task/TASK-05-transaction-crud.md) | 2 | CRUD Giao dịch + API | 🔴 Critical | ✅ DONE |
| [TASK-06](file:///home/ngthtrong/perfin-nienluan/task/TASK-06-account-system.md) | 2 | Hệ thống Tài khoản/Ví | 🟡 High | ✅ DONE |
| [TASK-07](file:///home/ngthtrong/perfin-nienluan/task/TASK-07-budget-management.md) | 3 | Quản lý Ngân sách | 🟡 High | ✅ DONE |
| [TASK-08](file:///home/ngthtrong/perfin-nienluan/task/TASK-08-reports-charts.md) | 3 | Báo cáo & Biểu đồ | 🟡 High | ✅ DONE |
| [TASK-09](file:///home/ngthtrong/perfin-nienluan/task/TASK-09-chat-integration.md) | 4 | Tích hợp Chat E2E | 🔴 Critical | ✅ DONE |
| [TASK-10](file:///home/ngthtrong/perfin-nienluan/task/TASK-10-testing-polish.md) | 4 | Kiểm thử & Hoàn thiện | 🟡 High | ✅ DONE |

---

## 7. 📐 Sơ đồ Database (Tổng quan)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   accounts   │     │   transactions   │     │  categories  │
├──────────────┤     ├──────────────────┤     ├──────────────┤
│ id (PK)      │◄────│ account_id (FK)  │     │ id (PK)      │
│ name         │     │ id (PK)          │────►│ name         │
│ balance      │     │ category_id (FK) │     │ type         │
│ type         │     │ amount           │     │ icon         │
│ created_at   │     │ type (in/out)    │     │ parent_id    │
└──────────────┘     │ description      │     │ is_default   │
                     │ original_text    │     └──────────────┘
                     │ ai_parsed        │
                     │ date             │            ┌──────────────┐
                     │ created_at       │            │   budgets    │
                     └──────────────────┘            ├──────────────┤
                                                     │ id (PK)      │
                                                     │ category_id  │
                                                     │ amount       │
                                                     │ month        │
                                                     │ year         │
                                                     │ created_at   │
                                                     └──────────────┘
```

---

## 8. ✅ Tiêu chí hoàn thành MVP

- [ ] Người dùng có thể nhập giao dịch bằng câu tiếng Việt tự nhiên
- [ ] Người dùng có thể ghi âm tiếng Việt trên điện thoại để tạo giao dịch
- [ ] Người dùng có thể chụp ảnh hoặc chọn ảnh hóa đơn trên điện thoại để tạo giao dịch
- [ ] AI tự động trích xuất: mô tả, số tiền, danh mục, ngày, loại (thu/chi)
- [ ] Giao dịch được lưu vào PostgreSQL
- [ ] Hiển thị lịch sử giao dịch với bộ lọc
- [ ] Có hệ thống danh mục phân cấp định sẵn
- [ ] Cho phép sửa danh mục sau khi AI phân loại
- [ ] Thiết lập ngân sách theo danh mục/tháng
- [ ] Hiển thị tiến độ ngân sách (% đã dùng)
- [ ] Dashboard tổng quan: tổng thu, tổng chi, số dư
- [ ] Biểu đồ tròn chi tiêu theo danh mục
- [ ] Biểu đồ cột xu hướng chi tiêu theo tháng
- [ ] Ứng dụng chạy được trên Expo Go (iOS/Android)

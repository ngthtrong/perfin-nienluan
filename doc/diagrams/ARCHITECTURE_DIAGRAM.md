# 📐 SƠ ĐỒ KIẾN TRÚC HỆ THỐNG — PERFIN

> File này chứa các sơ đồ Mermaid mô tả kiến trúc tổng quan của hệ thống PERFIN,  
> phục vụ báo cáo trực tiếp với giảng viên hướng dẫn.

---

## 1. Sơ đồ Kiến trúc Tổng quan (System Architecture Overview)

```mermaid
graph TB
    subgraph CLIENT ["📱 TẦNG CLIENT<br/>React Native + Expo Go"]
        direction LR
        ChatUI["💬 Chat UI<br/>Hội thoại AI"]
        TransUI["💰 Transaction UI<br/>Quản lý giao dịch"]
        ReportUI["📊 Report UI<br/>Biểu đồ thống kê"]
        BudgetUI["📋 Budget UI<br/>Ngân sách"]
        WalletUI["👛 Wallet UI<br/>Quản lý ví"]
        SettingsUI["⚙️ Settings UI<br/>Cài đặt & AI Persona"]
    end

    subgraph GATEWAY ["🔐 TẦNG API GATEWAY — Express.js"]
        GW["API Gateway<br/>Routing · CORS · Rate Limiting · JWT Auth"]
    end

    subgraph CORE ["⚙️ TẦNG CORE SERVICES — Node.js / Express"]
        direction LR
        AuthSvc["🔑 Auth"]
        TransSvc["💳 Transaction"]
        CatSvc["📂 Category"]
        BudgetSvc["📋 Budget"]
        WalletSvc["👛 Wallet"]
        ReminderSvc["⏰ Reminder"]
        ExportSvc["📤 Export"]
        ReportSvc["📊 Report"]
    end

    subgraph AI ["🤖 TẦNG AI SERVICES — Google Cloud"]
        direction LR
        NLP["🧠 NLP Engine<br/>Gemini 2.5 Flash"]
        OCR["📷 OCR Engine<br/>Cloud Vision API"]
        STT["🎤 Voice Engine<br/>Speech-to-Text API"]
        CatEngine["🏷️ Categorization<br/>Engine"]
        PersonaEngine["🎭 Personality<br/>Engine"]
    end

    subgraph DATA ["💾 TẦNG DỮ LIỆU"]
        PG[("🐘 PostgreSQL<br/>14 bảng · 26 ENUM types<br/>Users · Transactions · Budgets<br/>Wallets · Categories · Chat")]
        Storage[("📁 File Storage<br/>Hóa đơn · Backups<br/>Exports")]
    end

    CLIENT -->|"HTTP / REST API · JSON"| GATEWAY
    GATEWAY --> CORE
    GATEWAY --> AI
    CORE <-->|"Internal Call"| AI
    CORE --> PG
    CORE --> Storage
    AI --> PG

    style CLIENT fill:#E3F2FD,stroke:#1565C0,stroke-width:2px
    style GATEWAY fill:#FFF3E0,stroke:#E65100,stroke-width:2px
    style CORE fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px
    style AI fill:#F3E5F5,stroke:#6A1B9A,stroke-width:2px
    style DATA fill:#FBE9E7,stroke:#BF360C,stroke-width:2px
```

---

## 2. Luồng Xử lý Nhập liệu Đa phương thức (Multi-modal Input Flow)

```mermaid
sequenceDiagram
    actor User as 👤 Người dùng
    participant App as 📱 Mobile App<br/>React Native
    participant GW as 🔐 API Gateway<br/>Express.js
    participant Core as ⚙️ Core Service
    participant AI as 🤖 AI Service
    participant Gemini as 🧠 Google Gemini
    participant Vision as 📷 Cloud Vision
    participant Speech as 🎤 Speech-to-Text
    participant DB as 🐘 PostgreSQL

    Note over User,DB: 💬 LUỒNG 1: NHẬP BẰNG VĂN BẢN CHAT

    User->>App: Gõ "ăn sáng 30k"
    App->>GW: POST /api/chat {prompt}
    GW->>AI: Forward request
    AI->>Gemini: Phân tích ngữ cảnh tiếng Việt
    Gemini-->>AI: {name: "Ăn sáng", amount: 30000, category: "Ăn uống"}
    AI->>Core: Tạo giao dịch
    Core->>DB: INSERT INTO transactions
    DB-->>Core: OK
    Core-->>App: {success: true, transaction}
    App-->>User: Hiển thị "Đã thêm: Ăn sáng - 30.000đ"

    Note over User,DB: 📷 LUỒNG 2: NHẬP BẰNG ẢNH HÓA ĐƠN

    User->>App: Chụp/chọn ảnh hóa đơn
    App->>GW: POST /api/ocr {image file}
    GW->>AI: Forward image
    AI->>Vision: textDetection(image)
    Vision-->>AI: "Co.opmart - Tổng: 250.000đ"
    AI->>Gemini: Phân tích text OCR → giao dịch
    Gemini-->>AI: {name: "Mua sắm Co.opmart", amount: 250000}
    AI->>Core: Tạo giao dịch
    Core->>DB: INSERT INTO transactions
    Core-->>App: {success: true}
    App-->>User: Hiển thị kết quả

    Note over User,DB: 🎤 LUỒNG 3: NHẬP BẰNG GIỌNG NÓI

    User->>App: Nhấn ghi âm + nói
    App->>GW: POST /api/speech {audio file}
    GW->>AI: Forward audio
    AI->>Speech: recognize(audio, vi-VN)
    Speech-->>AI: "Hôm nay đi uống cà phê hết 50 nghìn"
    AI->>Gemini: Phân tích text → giao dịch
    Gemini-->>AI: {name: "Uống cà phê", amount: 50000}
    AI->>Core: Tạo giao dịch
    Core->>DB: INSERT INTO transactions
    Core-->>App: {success: true}
    App-->>User: Hiển thị kết quả
```

---

## 3. Sơ đồ Thành phần Hệ thống (Component Diagram)

```mermaid
graph LR
    subgraph Mobile ["📱 Mobile App — React Native / Expo"]
        ChatComp["💬 Chat Component<br/>TextInput + FlatList"]
        ImageComp["📷 Image Picker<br/>expo-image-picker"]
        AudioComp["🎤 Audio Recorder<br/>expo-av"]
        APIClient["🔌 API Client<br/>fetch() + FormData"]
    end

    subgraph Backend ["🖥️ Backend Server — Node.js / Express"]
        Router["🛣️ Router<br/>Express Routes"]
        ChatHandler["💬 /api/chat<br/>Text → Gemini"]
        OCRHandler["📷 /api/ocr<br/>Image → Vision → Gemini"]
        STTHandler["🎤 /api/speech<br/>Audio → STT → Gemini"]
        DBPool["🗄️ pg.Pool<br/>PostgreSQL Client"]
        FileUpload["📁 Multer<br/>File Upload Handler"]
    end

    subgraph GoogleCloud ["☁️ Google Cloud Platform"]
        GeminiAPI["🧠 Gemini 2.5 Flash<br/>@google/genai"]
        VisionAPI["📷 Cloud Vision<br/>@google-cloud/vision"]
        SpeechAPI["🎤 Speech-to-Text<br/>@google-cloud/speech"]
    end

    subgraph Database ["💾 Database"]
        PostgreSQL[("🐘 PostgreSQL<br/>14 Tables")]
    end

    ChatComp --> APIClient
    ImageComp --> APIClient
    AudioComp --> APIClient
    APIClient -->|"HTTP/REST"| Router

    Router --> ChatHandler
    Router --> OCRHandler
    Router --> STTHandler

    ChatHandler --> GeminiAPI
    OCRHandler --> FileUpload
    OCRHandler --> VisionAPI
    OCRHandler --> GeminiAPI
    STTHandler --> FileUpload
    STTHandler --> SpeechAPI
    STTHandler --> GeminiAPI

    ChatHandler --> DBPool
    OCRHandler --> DBPool
    STTHandler --> DBPool
    DBPool --> PostgreSQL

    style Mobile fill:#E3F2FD,stroke:#1565C0,stroke-width:2px
    style Backend fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px
    style GoogleCloud fill:#F3E5F5,stroke:#6A1B9A,stroke-width:2px
    style Database fill:#FBE9E7,stroke:#BF360C,stroke-width:2px
```

---

## 4. Sơ đồ ERD — Quan hệ Cơ sở dữ liệu

```mermaid
erDiagram
    USERS ||--o{ TRANSACTIONS : "tạo"
    USERS ||--o{ WALLETS : "sở hữu"
    USERS ||--o{ CATEGORIES : "định nghĩa"
    USERS ||--o{ BUDGETS : "thiết lập"
    USERS ||--o{ RECURRING_BILLS : "quản lý"
    USERS ||--o{ CHAT_MESSAGES : "gửi/nhận"
    USERS ||--o{ AI_PERSONALITIES : "chọn"
    USERS ||--|| BACKUP_CONFIGS : "cấu hình"

    TRANSACTIONS }|--|| WALLETS : "sử dụng ví nguồn"
    TRANSACTIONS }o--o| WALLETS : "sử dụng ví đích"
    TRANSACTIONS }o--|| CATEGORIES : "phân loại bởi"
    TRANSACTIONS }o--o| CATEGORIES : "phân loại phụ"
    TRANSACTIONS }o--o| RECURRING_BILLS : "sinh ra từ"

    CATEGORIES ||--o{ CATEGORIES : "cha-con"

    BUDGETS }o--o| CATEGORIES : "theo dõi"
    BUDGETS ||--o{ BUDGET_HISTORY : "ghi log"

    RECURRING_BILLS }|--|| WALLETS : "trừ từ"
    RECURRING_BILLS }|--|| CATEGORIES : "phân loại"
    RECURRING_BILLS ||--o{ RECURRING_BILL_PAYMENTS : "theo dõi"

    CHAT_MESSAGES }o--o| AI_PERSONALITIES : "dùng phong cách"

    USERS {
        int id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar language_preference
        int active_personality_id FK
    }

    TRANSACTIONS {
        int id PK
        int user_id FK
        varchar name
        decimal amount
        timestamp transaction_date
        enum type
        int category_id FK
        int wallet_id FK
        enum input_source
        enum status
    }

    WALLETS {
        int id PK
        int user_id FK
        varchar name
        enum type
        decimal balance
        decimal initial_balance
    }

    CATEGORIES {
        int id PK
        int user_id FK
        varchar name
        enum type
        int parent_id FK
        boolean is_system
    }

    BUDGETS {
        int id PK
        int user_id FK
        int category_id FK
        enum budget_type
        enum period
        decimal amount_limit
        decimal amount_spent
    }

    CHAT_MESSAGES {
        int id PK
        int user_id FK
        enum role
        text content
        enum msg_type
        int personality_id FK
    }

    AI_PERSONALITIES {
        int id PK
        varchar name
        text description
        text style_prompt
        boolean is_system
    }

    RECURRING_BILLS {
        int id PK
        int user_id FK
        varchar name
        decimal amount
        enum frequency
        enum status
    }
```

---

## 5. Sơ đồ Triển khai (Deployment Overview)

```mermaid
graph TB
    subgraph DEV ["🖥️ MÁY PHÁT TRIỂN (Development)"]
        NodeServer["Node.js Server<br/>localhost:3000"]
        PGLocal[("PostgreSQL<br/>localhost:5432")]
        ExpoDevServer["Expo Dev Server<br/>localhost:8081"]
    end

    subgraph PHONE ["📱 THIẾT BỊ DI ĐỘNG"]
        ExpoGo["Expo Go App<br/>Quét QR Code"]
    end

    subgraph CLOUD ["☁️ GOOGLE CLOUD PLATFORM"]
        GeminiCloud["🧠 Gemini API<br/>generativelanguage.googleapis.com"]
        VisionCloud["📷 Cloud Vision API<br/>vision.googleapis.com"]
        SpeechCloud["🎤 Speech-to-Text API<br/>speech.googleapis.com"]
    end

    ExpoGo -->|"Wi-Fi LAN<br/>HTTP REST"| NodeServer
    ExpoDevServer -->|"Metro Bundler<br/>QR Code"| ExpoGo
    NodeServer --> PGLocal
    NodeServer -->|"HTTPS API Call<br/>API Key / Service Account"| GeminiCloud
    NodeServer -->|"HTTPS API Call<br/>Service Account JSON"| VisionCloud
    NodeServer -->|"HTTPS API Call<br/>Service Account JSON"| SpeechCloud

    style DEV fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px
    style PHONE fill:#E3F2FD,stroke:#1565C0,stroke-width:2px
    style CLOUD fill:#F3E5F5,stroke:#6A1B9A,stroke-width:2px
```

---

## 6. Bảng Tổng hợp Công nghệ & Dịch vụ

```mermaid
mindmap
  root((PERFIN<br/>Tech Stack))
    📱 Frontend
      React Native 0.81
      Expo 54
      expo-av
      expo-image-picker
      React 19
    🖥️ Backend
      Node.js
      Express 5
      pg driver
      multer
      cors
      dotenv
    🐘 Database
      PostgreSQL
      14 Tables
      26 ENUM Types
      Indexes
    🤖 AI Services
      Google Gemini 2.5 Flash
      Google Cloud Vision
      Google Speech-to-Text
    📄 Documentation
      LaTeX
      PlantUML
      Mermaid
      Python Scripts
```

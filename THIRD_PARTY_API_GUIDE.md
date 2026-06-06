# 🔑 HƯỚNG DẪN TRUY CẬP & LẤY API KEY CÁC DỊCH VỤ BÊN THỨ 3

> **Dự án:** PERFIN — Ứng dụng Quản lý Tài chính Cá nhân tích hợp AI  
> **Mục đích:** Hướng dẫn chi tiết từng bước để lấy API key/credentials kết nối các dịch vụ Google Cloud vào ứng dụng demo.

---

## 📌 MỤC LỤC

1. [Tổng quan các dịch vụ cần kết nối](#-1-tổng-quan-các-dịch-vụ-cần-kết-nối)
2. [Bước 0: Tạo tài khoản Google Cloud](#-bước-0-tạo-tài-khoản-google-cloud-platform)
3. [Bước 1: Lấy Google Gemini API Key](#-bước-1-lấy-google-gemini-api-key)
4. [Bước 2: Bật Google Cloud Vision API & tạo Service Account](#-bước-2-bật-google-cloud-vision-api--tạo-service-account)
5. [Bước 3: Bật Google Speech-to-Text API](#-bước-3-bật-google-speech-to-text-api)
6. [Bước 4: Cấu hình file .env cho Backend](#-bước-4-cấu-hình-file-env-cho-backend)
7. [Bước 5: Kiểm tra kết nối](#-bước-5-kiểm-tra-kết-nối)
8. [Giới hạn Free Tier & Chi phí](#-giới-hạn-free-tier--chi-phí)
9. [Xử lý sự cố thường gặp](#-xử-lý-sự-cố-thường-gặp)

---

## 📋 1. Tổng quan các Dịch vụ Cần Kết nối

| # | Dịch vụ | Loại xác thực | Free Tier |
|:-:|:--------|:-------------|:----------|
| 1 | **Google Gemini API** | API Key | 60 requests/phút miễn phí |
| 2 | **Google Cloud Vision API** | Service Account JSON | 1.000 requests/tháng miễn phí |
| 3 | **Google Speech-to-Text API** | Service Account JSON | 60 phút/tháng miễn phí |

> **Lưu ý quan trọng:** Gemini API dùng **API Key đơn giản**, còn Vision và Speech-to-Text dùng **Service Account** (file JSON credentials). Cả 2 loại đều lấy từ Google Cloud Console.

---

## 🌐 Bước 0: Tạo Tài khoản Google Cloud Platform

### 0.1. Đăng ký Google Cloud

1. Truy cập: **https://console.cloud.google.com/**
2. Đăng nhập bằng **tài khoản Gmail** của bạn
3. Nếu lần đầu sử dụng, Google sẽ yêu cầu:
   - Chấp nhận điều khoản sử dụng
   - Thêm thông tin thanh toán (thẻ Visa/Mastercard) — **KHÔNG bị tính phí** nếu dùng trong Free Tier
   - Google tặng **$300 credit miễn phí** trong 90 ngày cho tài khoản mới

### 0.2. Tạo Project mới

1. Trên thanh trên cùng của Google Cloud Console, click vào **dropdown chọn project** (bên trái)
2. Click **"New Project"**
3. Điền thông tin:
   - **Project name:** `perfin-nienluan` (hoặc tên tùy chọn)
   - **Organization:** Để mặc định (No organization)
4. Click **"Create"**
5. Đợi vài giây, sau đó chọn project vừa tạo từ dropdown

> 💡 **Ghi nhớ Project ID** (ví dụ: `perfin-nienluan-123456`) — sẽ cần dùng sau này.

---

## 🧠 Bước 1: Lấy Google Gemini API Key

> Gemini API Key được lấy qua **Google AI Studio** (không phải Cloud Console).

### 1.1. Truy cập Google AI Studio

1. Truy cập: **https://aistudio.google.com/apikey**
2. Đăng nhập bằng **cùng tài khoản Gmail** đã dùng ở Bước 0

### 1.2. Tạo API Key

1. Click nút **"Create API key"**
2. Chọn project Google Cloud vừa tạo ở Bước 0 (ví dụ: `perfin-nienluan`)
   - Nếu không thấy project, click **"Create API key in new project"**
3. Một API key sẽ được tạo dạng: `AIzaSy...` (khoảng 40 ký tự)
4. **COPY và LƯU LẠI** API key này ngay lập tức — sau này không thể xem lại

### 1.3. Kiểm tra nhanh API Key

Mở terminal và chạy lệnh sau (thay `YOUR_API_KEY`):

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Xin chào, bạn là ai?"}]}]}' | head -c 500
```

Nếu nhận được phản hồi JSON có `"text"` → **API Key hoạt động!**

### 1.4. Giới hạn Free Tier Gemini

| Model | RPM (Requests/Phút) | RPD (Requests/Ngày) | TPM (Tokens/Phút) |
|:------|:-------------------:|:-------------------:|:------------------:|
| gemini-2.5-flash | 60 | 1.500 | 250.000 |
| gemini-2.5-pro | 5 | 25 | 25.000 |

> 💡 **Khuyến nghị:** Dùng model `gemini-2.5-flash` cho demo vì free tier hào phóng hơn nhiều.

---

## 📷 Bước 2: Bật Google Cloud Vision API & Tạo Service Account

### 2.1. Bật Cloud Vision API

1. Truy cập: **https://console.cloud.google.com/apis/library**
2. Tìm kiếm: **"Cloud Vision API"**
3. Click vào kết quả **"Cloud Vision API"**
4. Click nút **"ENABLE"** (Bật)
5. Đợi vài giây cho API được kích hoạt

### 2.2. Tạo Service Account

> Service Account là "tài khoản robot" dùng cho backend server gọi API, thay vì dùng tài khoản cá nhân.

1. Truy cập: **https://console.cloud.google.com/iam-admin/serviceaccounts**
2. Click **"+ CREATE SERVICE ACCOUNT"**
3. Điền thông tin:
   - **Service account name:** `perfin-backend`
   - **Service account ID:** `perfin-backend` (tự sinh)
   - **Description:** `Service account for PERFIN backend to access Vision & Speech APIs`
4. Click **"CREATE AND CONTINUE"**
5. Ở bước **"Grant this service account access to project"**, thêm các role:
   - `Cloud Vision API User` (hoặc search "Vision")
   - `Cloud Speech-to-Text API User` (hoặc search "Speech")
   
   > Nếu không tìm thấy role chính xác, chọn **"Owner"** cho đơn giản (demo project)
6. Click **"CONTINUE"** → **"DONE"**

### 2.3. Tạo & Tải xuống Key JSON

1. Trong danh sách Service Accounts, click vào **`perfin-backend@...`** vừa tạo
2. Chuyển sang tab **"KEYS"**
3. Click **"ADD KEY"** → **"Create new key"**
4. Chọn **"JSON"** → Click **"CREATE"**
5. Một file `.json` sẽ tự động tải xuống máy bạn (ví dụ: `perfin-nienluan-123456-abcdef.json`)
6. **Di chuyển file này** vào thư mục backend:

```bash
# Di chuyển file credentials vào thư mục backend
mv ~/Downloads/perfin-nienluan-*.json demo/v1/backend/gcp-credentials.json
```

> ⚠️ **BẢO MẬT:** File JSON này chứa private key — **KHÔNG COMMIT LÊN GIT**!  
> File `.gitignore` trong backend đã bao gồm pattern `*.json` credentials.

### 2.4. Nội dung file JSON credentials (ví dụ)

```json
{
  "type": "service_account",
  "project_id": "perfin-nienluan-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvg...\n-----END PRIVATE KEY-----\n",
  "client_email": "perfin-backend@perfin-nienluan-123456.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

---

## 🎤 Bước 3: Bật Google Speech-to-Text API

### 3.1. Bật API

1. Truy cập: **https://console.cloud.google.com/apis/library**
2. Tìm kiếm: **"Cloud Speech-to-Text API"**
3. Click vào kết quả **"Cloud Speech-to-Text API"**
4. Click nút **"ENABLE"** (Bật)

> 💡 **Không cần tạo Service Account mới** — Service Account `perfin-backend` đã tạo ở Bước 2 sẽ dùng cho cả Vision lẫn Speech-to-Text.

### 3.2. Kiểm tra các API đã bật

1. Truy cập: **https://console.cloud.google.com/apis/dashboard**
2. Kiểm tra danh sách phải có:
   - ✅ Cloud Vision API
   - ✅ Cloud Speech-to-Text API
   - ✅ Generative Language API (tự bật khi tạo Gemini key)

---

## ⚙️ Bước 4: Cấu hình file `.env` cho Backend

### 4.1. Tạo file `.env`

Tạo file `.env` trong thư mục `demo/v1/backend/`:

```bash
cd demo/v1/backend
touch .env
```

### 4.2. Nội dung file `.env`

```env
# ===== SERVER CONFIG =====
PORT=3000

# ===== POSTGRESQL DATABASE =====
DB_USER=postgres
DB_HOST=localhost
DB_NAME=demodb
DB_PASSWORD=your_postgres_password
DB_PORT=5432

# ===== GOOGLE GEMINI API =====
# Lấy từ: https://aistudio.google.com/apikey
GEMINI_API_KEY=AIzaSy_YOUR_GEMINI_API_KEY_HERE

# ===== GOOGLE CLOUD CREDENTIALS =====
# Đường dẫn TUYỆT ĐỐI tới file Service Account JSON (cho Vision & Speech)
# Lấy từ: Google Cloud Console > IAM > Service Accounts > Keys
GOOGLE_APPLICATION_CREDENTIALS=/home/YOUR_USERNAME/perfin-nienluan/demo/v1/backend/gcp-credentials.json
```

### 4.3. Giải thích từng biến

| Biến | Nguồn | Cách lấy |
|:-----|:------|:---------|
| `GEMINI_API_KEY` | Google AI Studio | Bước 1.2 — Copy API key từ https://aistudio.google.com/apikey |
| `GOOGLE_APPLICATION_CREDENTIALS` | Google Cloud Console | Bước 2.3 — Đường dẫn tuyệt đối tới file `.json` đã tải |
| `DB_USER` | PostgreSQL local | Username PostgreSQL trên máy bạn |
| `DB_PASSWORD` | PostgreSQL local | Password PostgreSQL trên máy bạn |
| `DB_NAME` | PostgreSQL local | Tên database (mặc định: `demodb`) |

### 4.4. Thêm vào `.gitignore`

Đảm bảo file `.gitignore` trong backend có:

```gitignore
# Environment variables
.env

# Google Cloud credentials
gcp-credentials.json
*-credentials.json
*.json
!package.json
!package-lock.json
```

---

## 🧪 Bước 5: Kiểm tra Kết nối

### 5.1. Khởi động Backend

```bash
cd demo/v1/backend
npm install
node index.js
```

**Kết quả mong đợi:**
```
✅ Connected to PostgreSQL successfully!
🚀 Server listening on port 3000
```

> Nếu thiếu `GOOGLE_APPLICATION_CREDENTIALS`, sẽ thấy warning:  
> `GCP Credentials missing. OCR and Speech will use MOCK_RESULT.`  
> → Server vẫn chạy nhưng OCR & Speech trả về kết quả mock.

### 5.2. Test API Gemini (Chat)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "ăn sáng 30k"}'
```

**Kết quả thành công:**
```json
{
  "success": true,
  "text": "Tôi nhận diện giao dịch: Ăn sáng - 30.000 VNĐ - Danh mục: Ăn uống..."
}
```

**Nếu mock (không có API key):**
```json
{
  "success": true,
  "text": "[MOCK GEMINI] Nhận diện giao dịch: \"ăn sáng 30k\". Đã thêm vào danh mục!"
}
```

### 5.3. Test API OCR (Vision)

```bash
curl -X POST http://localhost:3000/api/ocr \
  -F "image=@/path/to/receipt_photo.jpg"
```

**Kết quả thành công:**
```json
{
  "success": true,
  "text": "SIÊU THỊ CO.OPMART\nHÓA ĐƠN BÁN HÀNG\n...\nTỔNG CỘNG: 250.000đ"
}
```

### 5.4. Test API Speech-to-Text

```bash
curl -X POST http://localhost:3000/api/speech \
  -F "audio=@/path/to/voice_recording.m4a"
```

**Kết quả thành công:**
```json
{
  "success": true,
  "text": "Hôm nay đi uống cà phê hết 50 nghìn"
}
```

---

## 💰 Giới hạn Free Tier & Chi phí

### Bảng tổng hợp Free Tier

| Dịch vụ | Free Tier hàng tháng | Giá sau Free Tier |
|:--------|:---------------------|:-----------------|
| **Gemini 2.5 Flash** | 60 RPM · 1.500 RPD | $0.15/1M input tokens |
| **Cloud Vision (OCR)** | 1.000 requests | $1.50/1.000 requests |
| **Speech-to-Text** | 60 phút | $0.006/15 giây |

### Ước tính chi phí cho demo

| Kịch bản | Gemini | Vision | Speech | Tổng/tháng |
|:---------|:------:|:------:|:------:|:----------:|
| Demo nhẹ (50 giao dịch/tháng) | **$0** (free) | **$0** (free) | **$0** (free) | **$0** |
| Demo trung bình (500 giao dịch/tháng) | **$0** (free) | **$0** (free) | **$0** (free) | **$0** |
| Demo nặng (2.000 giao dịch/tháng) | **$0** (free) | ~$1.50 | ~$0.50 | ~$2 |

> 💡 **Kết luận:** Với quy mô Niên luận (demo + kiểm thử), hoàn toàn nằm trong Free Tier = **$0/tháng**.

---

## 🔧 Xử lý Sự cố Thường gặp

### ❌ Lỗi 1: `GEMINI_API_KEY is invalid`

```
Error: API key not valid. Please pass a valid API key.
```

**Nguyên nhân:** API key sai hoặc chưa được tạo  
**Cách sửa:**
1. Truy cập https://aistudio.google.com/apikey
2. Kiểm tra key đã tạo hay chưa
3. Tạo key mới nếu cần
4. Copy chính xác vào file `.env`

---

### ❌ Lỗi 2: `Could not load the default credentials`

```
Error: Could not load the default credentials.
```

**Nguyên nhân:** Biến `GOOGLE_APPLICATION_CREDENTIALS` trỏ sai đường dẫn  
**Cách sửa:**
1. Kiểm tra file JSON tồn tại:
   ```bash
   ls -la /path/to/gcp-credentials.json
   ```
2. Đảm bảo đường dẫn trong `.env` là **đường dẫn tuyệt đối** (bắt đầu bằng `/`)
3. Đảm bảo file JSON có nội dung hợp lệ (mở bằng text editor kiểm tra)

---

### ❌ Lỗi 3: `Cloud Vision API has not been enabled`

```
Error: Cloud Vision API has not been used in project XXX before or it is disabled.
```

**Nguyên nhân:** Chưa bật API trong Cloud Console  
**Cách sửa:**
1. Truy cập: https://console.cloud.google.com/apis/library/vision.googleapis.com
2. Click **"ENABLE"**
3. Đợi 1–2 phút rồi thử lại

---

### ❌ Lỗi 4: `Permission denied on Cloud Speech`

```
Error: The caller does not have permission
```

**Nguyên nhân:** Service Account chưa có role phù hợp  
**Cách sửa:**
1. Truy cập: https://console.cloud.google.com/iam-admin/iam
2. Tìm email Service Account (dạng `perfin-backend@...iam.gserviceaccount.com`)
3. Click **Edit** (biểu tượng bút chì)
4. Thêm role: **"Cloud Speech Client"** hoặc **"Owner"**
5. Click **"Save"**

---

### ❌ Lỗi 5: `ECONNREFUSED` khi test từ mobile

```
Network request failed: connect ECONNREFUSED
```

**Nguyên nhân:** Mobile app không kết nối được tới backend  
**Cách sửa:**
1. Đảm bảo máy tính và điện thoại cùng **mạng Wi-Fi**
2. Lấy IP máy tính:
   ```bash
   # Linux/Mac
   hostname -I
   # hoặc
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
3. Cập nhật `EXPO_PUBLIC_API_URL` trong frontend thành `http://YOUR_IP:3000`
4. Đảm bảo server lắng nghe trên `0.0.0.0` (đã cấu hình sẵn trong `index.js`)

---

### ❌ Lỗi 6: `PostgreSQL connection error`

```
❌ PostgreSQL connection error: FATAL: password authentication failed
```

**Nguyên nhân:** Sai thông tin kết nối PostgreSQL  
**Cách sửa:**
1. Kiểm tra PostgreSQL đang chạy:
   ```bash
   sudo systemctl status postgresql
   ```
2. Kiểm tra username/password:
   ```bash
   psql -U postgres -h localhost
   ```
3. Tạo database nếu chưa có:
   ```sql
   CREATE DATABASE demodb;
   ```
4. Cập nhật `DB_USER`, `DB_PASSWORD`, `DB_NAME` trong `.env`

---

## 📝 Checklist Trước khi Demo

- [ ] PostgreSQL đang chạy và database `demodb` đã tạo
- [ ] File `.env` đã cấu hình đầy đủ
- [ ] `GEMINI_API_KEY` hợp lệ (test bằng curl)
- [ ] File `gcp-credentials.json` tồn tại và đúng đường dẫn
- [ ] Cloud Vision API đã **ENABLE** trên Cloud Console
- [ ] Cloud Speech-to-Text API đã **ENABLE** trên Cloud Console
- [ ] Backend chạy thành công (`node index.js` → thấy ✅)
- [ ] Mobile app kết nối được backend (cùng Wi-Fi, đúng IP)
- [ ] Test thành công: `/api/chat`, `/api/ocr`, `/api/speech`

---

## 🔗 Tổng hợp Liên kết Quan trọng

| Dịch vụ | Console URL |
|:--------|:-----------|
| Google Cloud Console | https://console.cloud.google.com/ |
| Google AI Studio (Gemini Key) | https://aistudio.google.com/apikey |
| Cloud Vision API | https://console.cloud.google.com/apis/library/vision.googleapis.com |
| Speech-to-Text API | https://console.cloud.google.com/apis/library/speech.googleapis.com |
| Service Accounts | https://console.cloud.google.com/iam-admin/serviceaccounts |
| IAM & Permissions | https://console.cloud.google.com/iam-admin/iam |
| Billing | https://console.cloud.google.com/billing |
| API Dashboard | https://console.cloud.google.com/apis/dashboard |

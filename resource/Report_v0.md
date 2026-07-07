# TRANG BÌA

> **TRƯỜNG ĐẠI HỌC CẦN THƠ**
> **KHOA CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG**
> 
> ---
> 
> **NIÊN LUẬN CƠ SỞ NGÀNH**
> 
> **ỨNG DỤNG MOBILE QUẢN LÝ TÀI CHÍNH CÁ NHÂN BẰNG TRÍ TUỆ NHÂN TẠO — PERFIN**
> 
> *Ngành: Công nghệ thông tin*
> *Khóa: [TODO — Khóa]*
> *Lớp: [TODO — Lớp]*
> 
> **Giảng viên hướng dẫn:** [TODO — Học vị và họ tên GVHD]
> 
> **Sinh viên thực hiện:**
> | MSSV | Họ và tên |
> |------|-----------|
> | [TODO] | [TODO] |
> 
> **Học kỳ [TODO], Năm học [TODO]**

---

# TÓM TẮT (ABSTRACT)

> *Viết tóm tắt ngắn gọn về toàn bộ đề tài. Tóm tắt cần bao gồm:*
> - *Mục tiêu chính của đề tài.*
> - *Mô tả ngắn gọn phương pháp / cách tiếp cận.*
> - *Kết quả chính hoặc phát hiện từ đề tài.*
> - *Ý nghĩa hoặc tác động của đề tài.*
> - *Độ dài: 150–200 từ, viết sau cùng nhưng trình bày ở đầu.*

[TODO — Viết tóm tắt 150–200 từ]

---

# MỤC LỤC

> *Sử dụng công cụ tạo mục lục tự động. Trình bày theo 4 cấp (Heading 1, 2, 3, 4).*

[TODO — Tạo mục lục tự động khi xuất file Word/PDF]

---

# DANH MỤC BẢNG

> *Liệt kê tất cả các bảng trong báo cáo, đánh số thứ tự.*

| STT | Tên bảng | Trang |
|-----|----------|-------|
| Bảng 1 | [TODO] | [TODO] |

[TODO — Cập nhật danh mục bảng khi hoàn thiện báo cáo]

---

# DANH MỤC HÌNH

> *Liệt kê tất cả các hình (sơ đồ, biểu đồ, ảnh minh họa) trong báo cáo.*

| STT | Tên hình | Trang |
|-----|----------|-------|
| Hình 1 | Sơ đồ Use Case tổng quan | [TODO] |
| Hình 2 | Sơ đồ thành phần (Component Diagram) | [TODO] |
| Hình 3 | Sơ đồ lớp (Class Diagram) | [TODO] |
| Hình 4 | Sơ đồ tuần tự (Sequence Diagram) | [TODO] |
| Hình 5 | Sơ đồ hoạt động (Activity Diagram) | [TODO] |

[TODO — Cập nhật danh mục hình khi hoàn thiện báo cáo]

---

# DANH MỤC CÁC TỪ VIẾT TẮT

| Từ viết tắt | Giải thích đầy đủ |
|-------------|-------------------|
| AI | Artificial Intelligence — Trí tuệ nhân tạo |
| NLP | Natural Language Processing — Xử lý ngôn ngữ tự nhiên |
| OCR | Optical Character Recognition — Nhận dạng ký tự quang học |
| LLM | Large Language Model — Mô hình ngôn ngữ lớn |
| API | Application Programming Interface — Giao diện lập trình ứng dụng |
| SRS | Software Requirement Specification — Đặc tả yêu cầu phần mềm |
| MVP | Minimum Viable Product — Sản phẩm khả thi tối thiểu |
| CRUD | Create, Read, Update, Delete — Tạo, Đọc, Cập nhật, Xóa |
| JWT | JSON Web Token |
| OAuth | Open Authorization — Ủy quyền mở |
| 2FA | Two-Factor Authentication — Xác thực hai yếu tố |
| ERD | Entity Relationship Diagram — Sơ đồ quan hệ thực thể |
| CSV | Comma-Separated Values — Giá trị phân cách bằng dấu phẩy |
| PDF | Portable Document Format |
| UI | User Interface — Giao diện người dùng |
| UX | User Experience — Trải nghiệm người dùng |
| FR | Functional Requirement — Yêu cầu chức năng |
| NFR | Non-Functional Requirement — Yêu cầu phi chức năng |

[TODO — Bổ sung thêm từ viết tắt nếu cần]

---

# CHƯƠNG 1: GIỚI THIỆU

## 1.1. Đặt vấn đề

Trong bối cảnh kinh tế hiện đại, việc quản lý tài chính cá nhân ngày càng trở nên quan trọng, đặc biệt đối với giới trẻ — những người thường gặp khó khăn trong việc kiểm soát chi tiêu và xây dựng thói quen tài chính lành mạnh. Các ứng dụng quản lý tài chính hiện có trên thị trường (Money Lover, Misa, Spendy...) tuy cung cấp đầy đủ tính năng ghi chép thu chi, nhưng đa phần mang tính thủ công cao: người dùng phải mở ứng dụng, chọn danh mục, nhập số tiền, chọn ngày tháng — quá trình này tạo rào cản thao tác khiến nhiều người bỏ cuộc sau vài ngày sử dụng.

Sự phát triển vượt bậc của Trí tuệ nhân tạo (AI), đặc biệt các Mô hình Ngôn ngữ Lớn (LLM) như GPT, Gemini, đã mở ra hướng tiếp cận mới: cho phép người dùng tương tác bằng ngôn ngữ tự nhiên thay vì các biểu mẫu cứng nhắc. Người dùng chỉ cần gõ "trà sữa 50k" hoặc chụp tờ hóa đơn, hệ thống AI sẽ tự động bóc tách dữ liệu, phân loại danh mục, và ghi nhận giao dịch.

Xuất phát từ nhu cầu thực tiễn đó, đề tài **"Ứng dụng mobile quản lý tài chính cá nhân bằng trí tuệ nhân tạo — PerFin"** được thực hiện nhằm xây dựng một giải pháp quản lý tài chính cá nhân thông minh, lấy trải nghiệm hội thoại (conversational interface) làm trung tâm, kết hợp các kỹ thuật AI tiên tiến để tự động hóa tối đa quy trình ghi chép và phân tích tài chính.

## 1.2. Mục tiêu

Đề tài hướng đến các mục tiêu cụ thể sau:

1. **Xây dựng hệ thống nhập liệu đa phương thức bằng AI**: Cho phép người dùng ghi chép giao dịch thông qua chat văn bản tự nhiên, tin nhắn giọng nói (Voice-to-Text), và chụp ảnh/tải hóa đơn (OCR). Hệ thống sử dụng NLP và LLM để tự động bóc tách thông tin giao dịch (tên, số tiền, danh mục).

2. **Phân loại giao dịch thông minh**: Xây dựng hệ thống tự động phân loại giao dịch vào danh mục phù hợp dựa trên ngữ cảnh, có khả năng học từ phản hồi người dùng (feedback loop).

3. **Quản lý ngân sách và cảnh báo chủ động**: Cho phép thiết lập hạn mức chi tiêu theo danh mục hoặc tổng thể, theo dõi tiến độ chi tiêu real-time, và gửi cảnh báo proactive khi đạt ngưỡng 70%, 90%, 100%.

4. **Phân tích và báo cáo cá nhân hóa**: Cung cấp biểu đồ trực quan và nhận xét AI dựa trên thói quen chi tiêu, phát hiện xu hướng bất thường, đưa ra tư vấn tài chính cá nhân hóa.

5. **Quản lý đa tài khoản và dòng tiền**: Hỗ trợ nhiều ví/tài khoản (tiền mặt, ngân hàng, ví điện tử, đầu tư), theo dõi dòng tiền, tính tài sản ròng (Net Worth), phân biệt Transfer/Investment/Expense.

6. **Tăng cường trải nghiệm người dùng với nhân cách AI**: Áp dụng yếu tố gamification và tâm lý hành vi (Behavioral Psychology) thông qua các nhân cách AI đa dạng (Chuyên gia tài chính, Bà mẹ nghiêm khắc, Bạn thân...).

7. **Đảm bảo bảo mật và xuất dữ liệu**: Hỗ trợ xuất dữ liệu CSV/PDF, sao lưu/khôi phục, mã hóa dữ liệu, và xác thực an toàn.

---

# CHƯƠNG 2: CƠ SỞ LÝ THUYẾT

## 2.1. Tổng quan về quản lý tài chính cá nhân

[TODO — Trình bày khái niệm quản lý tài chính cá nhân, tầm quan trọng, các phương pháp phổ biến (nguyên tắc 50/30/20, envelope budgeting...), thực trạng quản lý tài chính của giới trẻ Việt Nam.]

## 2.2. Trí tuệ nhân tạo và Xử lý ngôn ngữ tự nhiên (NLP)

### 2.2.1. Khái niệm trí tuệ nhân tạo (AI)

[TODO — Định nghĩa AI, phân loại AI (Narrow AI, General AI), các ứng dụng của AI trong đời sống.]

### 2.2.2. Xử lý ngôn ngữ tự nhiên (NLP)

[TODO — Định nghĩa NLP, các bài toán chính trong NLP (Named Entity Recognition, Intent Classification, Text Classification), ứng dụng NLP trong fintech.]

### 2.2.3. Mô hình ngôn ngữ lớn (LLM)

[TODO — Giới thiệu LLM (GPT, Gemini), cách hoạt động cơ bản (Transformer architecture), khả năng few-shot learning và in-context learning, ưu/nhược điểm khi tích hợp vào ứng dụng.]

## 2.3. Nhận dạng ký tự quang học (OCR)

[TODO — Giới thiệu OCR, quy trình xử lý ảnh (preprocessing → text detection → recognition), các công cụ/thư viện OCR phổ biến (Tesseract, Google Vision API), thách thức với hóa đơn tiếng Việt.]

## 2.4. Chuyển đổi giọng nói thành văn bản (Speech-to-Text)

[TODO — Giới thiệu Speech-to-Text, các dịch vụ cloud (Google Speech API, Whisper), xử lý tiếng Việt.]

## 2.5. Công nghệ và công cụ sử dụng

### 2.5.1. Ngôn ngữ lập trình và Framework

[TODO — Liệt kê và giải thích lựa chọn: Flutter/React Native cho mobile, Node.js/Python cho backend, lý do chọn.]

### 2.5.2. Cơ sở dữ liệu

[TODO — PostgreSQL/MongoDB, lý do chọn, so sánh ưu nhược điểm.]

### 2.5.3. Dịch vụ AI/Cloud

[TODO — LLM API (GPT/Gemini), Google Vision API, Speech-to-Text API, lý do chọn và chi phí.]

### 2.5.4. Công cụ phát triển và quản lý dự án

[TODO — Git, GitHub/GitLab, Figma, draw.io, VS Code, các công cụ khác.]

## 2.6. Các nghiên cứu và ứng dụng liên quan

[TODO — Review các ứng dụng tương tự: Money Lover, Misa, Cleo AI, Plum, các nghiên cứu liên quan về AI trong fintech cá nhân.]

---

# CHƯƠNG 3: KẾT QUẢ ỨNG DỤNG

## 3.1. Đặc tả Yêu cầu Phần mềm (SRS)

### 3.1.1. Mô tả tổng quan

PerFin là ứng dụng mobile quản lý tài chính cá nhân với giao diện hội thoại AI (chatbot) làm trung tâm. Ứng dụng cho phép người dùng ghi chép giao dịch thông qua nhiều phương thức nhập liệu (văn bản, giọng nói, hình ảnh), tự động phân loại và phân tích chi tiêu bằng AI, quản lý ngân sách, theo dõi dòng tiền đa tài khoản, và nhận tư vấn tài chính cá nhân hóa.

**Đối tượng người dùng mục tiêu:**
- Sinh viên, người đi làm trẻ (18–35 tuổi) muốn quản lý tài chính cá nhân nhưng ngại các ứng dụng truyền thống phức tạp.
- Người dùng thích giao tiếp bằng ngôn ngữ tự nhiên hơn là điền biểu mẫu.

**Các tác nhân chính (Actors):**

| Actor | Mô tả |
|-------|--------|
| **User** | Người dùng cuối quản lý tài chính cá nhân |
| **AI Engine** | Hệ thống AI xử lý NLP, OCR, Voice-to-Text, phân loại tự động |
| **System** | Hệ thống backend tự động (cron jobs, notifications, encryption) |
| **Admin/Reviewer** | Quản trị viên duyệt dữ liệu, quản lý danh mục hệ thống & nhân cách AI |

### 3.1.2. Yêu cầu cụ thể

Hệ thống PerFin được phân tách thành 9 nhóm yêu cầu chính (Requirements), mỗi nhóm đặc tả chi tiết trong tài liệu REQ riêng biệt:

| Mã REQ | Tên yêu cầu | Mô tả tóm tắt |
|--------|-------------|----------------|
| REQ-01 | Nhập liệu đa phương thức bằng AI (AI-Powered Input) | Ghi chép giao dịch bằng chat văn bản, giọng nói, hoặc hình ảnh. AI tự động bóc tách dữ liệu. |
| REQ-02 | Phân loại thông minh (Auto-Categorization) | Tự động phân loại giao dịch vào danh mục dựa trên ngữ cảnh, học từ phản hồi người dùng. |
| REQ-03 | Quản lý Ngân sách (Budget Management) | Thiết lập hạn mức chi tiêu, theo dõi tiến độ, cảnh báo proactive, rollover. |
| REQ-04 | Phân tích và Báo cáo cá nhân hóa (Personalized Insights) | Biểu đồ trực quan, phát hiện bất thường, tư vấn AI cá nhân hóa. |
| REQ-05 | Quản lý Tài khoản đa nguồn (Multi-Account) | Quản lý nhiều ví/tài khoản, chuyển tiền giữa ví, tính tài sản ròng. |
| REQ-06 | Phân tách Dòng tiền & Tài sản (Cashflow & Asset Management) | Tracking đầu tư, phân biệt Transfer/Investment/Expense, Net Worth, dòng tiền. |
| REQ-07 | Xuất Dữ liệu & Sao lưu (Export & Backup) | Xuất CSV/PDF, sao lưu mã hóa, khôi phục dữ liệu, sao lưu tự động. |
| REQ-08 | Quản lý Chi phí Cố định & Nhắc nhở (Recurring Bills & Reminders) | Chi phí định kỳ, AI nhận diện chu kỳ, nhắc nhở thanh toán, lịch sử thanh toán. |
| REQ-09 | Nhân cách AI (AI Personalities) | Phong cách giao tiếp đa dạng, gamification, behavioral psychology. |

### 3.1.3. Yêu cầu chức năng

#### 3.1.3.1. REQ-01: Nhập liệu đa phương thức bằng AI

**Tóm tắt:** Cho phép người dùng tạo giao dịch thu/chi mới thông qua giao diện hội thoại bằng văn bản tự nhiên, tin nhắn thoại hoặc hình ảnh. Hệ thống sử dụng AI để đọc hiểu đầu vào tiếng Việt, tiếng Anh hoặc câu pha trộn Việt - Anh; bóc tách tên giao dịch và giá tiền; suy đoán danh mục tương ứng; hỏi lại khi thiếu thông tin.

**Các yêu cầu chức năng chính:**
- FR-01-01 → FR-01-10: Xem chi tiết tại tài liệu REQ-01.

> *Chi tiết đầy đủ: xem tài liệu `requirements/REQ-01 Nhập liệu đa phương thức bằng AI (AI-Powered Input).md`*

#### 3.1.3.2. REQ-02: Phân loại thông minh

**Tóm tắt:** Dựa trên ngữ cảnh chat hoặc nội dung hóa đơn, hệ thống tự động phân loại giao dịch vào đúng danh mục. Hỗ trợ danh mục mặc định, danh mục tùy chỉnh, danh mục con, và học từ phản hồi người dùng.

**Các yêu cầu chức năng chính:**
- FR-02-01 → FR-02-17: Xem chi tiết tại tài liệu REQ-02.

> *Chi tiết đầy đủ: xem tài liệu `requirements/REQ-02 Phân loại thông minh (Auto-Categorization).md`*

#### 3.1.3.3. REQ-03: Quản lý Ngân sách

**Tóm tắt:** Cho phép thiết lập hạn mức chi tiêu theo danh mục hoặc tổng thể trong kỳ tuần/tháng. Hệ thống tự động theo dõi tiến độ chi tiêu, cảnh báo proactive tại ngưỡng 70%, 90%, 100%, hỗ trợ rollover ngân sách chưa dùng hết.

**Các yêu cầu chức năng chính:**
- FR-03-01 → FR-03-09: Xem chi tiết tại tài liệu REQ-03.

> *Chi tiết đầy đủ: xem tài liệu `requirements/REQ-03 Quản lý ngân sách (Budget Management).md`*

#### 3.1.3.4. REQ-04: Phân tích và Báo cáo cá nhân hóa

**Tóm tắt:** Hệ thống tổng hợp dữ liệu giao dịch thành biểu đồ trực quan và đưa ra nhận xét, tư vấn bằng AI dựa trên thói quen chi tiêu thực tế của người dùng. Phát hiện xu hướng bất thường và đưa ra gợi ý cải thiện.

**Các yêu cầu chức năng chính:**
- FR-04-01 → FR-04-XX: Xem chi tiết tại tài liệu REQ-04.

> *Chi tiết đầy đủ: xem tài liệu `requirements/REQ-04 Phân tích và báo cáo cá nhân hóa (Personalized Insights).md`*

#### 3.1.3.5. REQ-05: Quản lý Tài khoản đa nguồn

**Tóm tắt:** Cho phép tạo và quản lý nhiều ví/tài khoản tài chính (tiền mặt, ngân hàng, ví điện tử, đầu tư). Hỗ trợ chuyển tiền giữa các ví (Transfer), tính tài sản ròng (Net Worth), gán giao dịch vào ví bằng chat.

**Các yêu cầu chức năng chính:**
- FR-05-01 → FR-05-10: Xem chi tiết tại tài liệu REQ-05.

> *Chi tiết đầy đủ: xem tài liệu `requirements/REQ-05 Quản lý tài khoản đa nguồn (Multi-Account).md`*

#### 3.1.3.6. REQ-06: Phân tách Dòng tiền & Tài sản

**Tóm tắt:** Tracking dòng tiền đầu tư, phân biệt Transfer/Investment/Expense, tính tài sản ròng (Net Worth) chính xác. Theo dõi lãi/lỗ đầu tư cơ bản, báo cáo tổng quan dòng tiền, quản lý dòng tiền bằng chat.

**Các yêu cầu chức năng chính:**
- FR-06-01 → FR-06-07: Xem chi tiết tại tài liệu REQ-06.

> *Chi tiết đầy đủ: xem tài liệu `requirements/REQ-06 Phân tách dòng tiền và tài sản (Cashflow & Asset Management).md`*

#### 3.1.3.7. REQ-07: Xuất Dữ liệu & Sao lưu

**Tóm tắt:** Xuất giao dịch ra CSV, xuất báo cáo ra PDF, sao lưu toàn bộ dữ liệu dưới dạng mã hóa, khôi phục dữ liệu, sao lưu tự động định kỳ, yêu cầu xuất/sao lưu qua chat.

**Các yêu cầu chức năng chính:**
- FR-07-01 → FR-07-09: Xem chi tiết tại tài liệu REQ-07.

> *Chi tiết đầy đủ: xem tài liệu `requirements/REQ-07 Xuất dữ liệu và sao lưu (Export & Backup).md`*

#### 3.1.3.8. REQ-08: Quản lý Chi phí Cố định & Nhắc nhở

**Tóm tắt:** Thiết lập chi phí cố định (tiền nhà, tiền điện, tiền nước...), AI tự động nhận diện chi phí cố định từ lịch sử giao dịch, nhắc nhở chủ động khi đến hạn thanh toán, xác nhận và ghi nhận thanh toán, tạm dừng/kích hoạt lại, theo dõi lịch sử thanh toán.

**Các yêu cầu chức năng chính:**
- FR-08-01 → FR-08-08: Xem chi tiết tại tài liệu REQ-08.

> *Chi tiết đầy đủ: xem tài liệu `requirements/REQ-08 Quản lý chi phí cố định và nhắc nhở (Recurring Bills & Reminders).md`*

#### 3.1.3.9. REQ-09: Nhân cách AI

**Tóm tắt:** Chatbot áp dụng các phong cách giao tiếp khác nhau (Chuyên gia tài chính, Bà mẹ nghiêm khắc, Bạn thân, Huấn luyện viên). Mỗi nhân cách ảnh hưởng đến giọng điệu và cách đưa ra lời khuyên nhưng không thay đổi logic xử lý giao dịch.

**Các yêu cầu chức năng chính:**
- FR-09-01 → FR-09-11: Xem chi tiết tại tài liệu REQ-09.

> *Chi tiết đầy đủ: xem tài liệu `requirements/REQ-09 Nhân cách AI (AI Personalities).md`*

### 3.1.4. Yêu cầu phi chức năng

| # | Yêu cầu | Mô tả |
|---|---------|-------|
| NFR-01 | **Ngôn ngữ** | Hệ thống hỗ trợ tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh. |
| NFR-02 | **Hiệu năng** | Thời gian phản hồi chat ≤ 3 giây cho xử lý văn bản, ≤ 8 giây cho OCR. |
| NFR-03 | **Bảo mật** | Mã hóa dữ liệu at-rest (AES-256) và in-transit (TLS 1.2+). JWT cho xác thực. |
| NFR-04 | **Khả dụng** | Uptime ≥ 99% cho dịch vụ core (không tính downtime API bên ngoài). |
| NFR-05 | **Khả năng mở rộng** | Kiến trúc microservice, có thể scale horizontal từng service. |
| NFR-06 | **Tương thích** | Hỗ trợ Android 8.0+ và iOS 14.0+. |
| NFR-07 | **Dữ liệu per-user** | Tất cả dữ liệu tài chính là riêng tư, chỉ người sở hữu mới có quyền truy cập. |
| NFR-08 | **Độ chính xác AI** | Tỷ lệ phân loại danh mục chính xác ≥ 85% cho danh mục mặc định. |
| NFR-09 | **Sao lưu** | Hỗ trợ sao lưu tự động và khôi phục dữ liệu hoàn toàn. |
| NFR-10 | **Xuất dữ liệu** | Hỗ trợ xuất CSV và PDF với định dạng chuẩn. |

[TODO — Bổ sung và chi tiết hóa NFR nếu cần]

## 3.2. Thiết kế Phần mềm

### 3.2.1. Kiến trúc ứng dụng (Application Architecture)

PerFin được xây dựng theo kiến trúc phân tầng (Layered Architecture) kết hợp microservice, bao gồm 5 tầng chính:

1. **Tầng Client (Mobile App):** Giao diện người dùng trên mobile, bao gồm Chat UI, Transaction UI, Report UI, Settings UI.
2. **Tầng API Gateway:** Điểm vào duy nhất cho mọi yêu cầu từ client, xử lý rate limiting, routing, kiểm tra xác thực.
3. **Tầng Dịch vụ Lõi (Core Services):** Các service nghiệp vụ chính — Auth, Transaction, Category, Budget, Reminder, Export, Backup, Report, Notification.
4. **Tầng Dịch vụ AI:** AI Service điều phối các engine con — NLP Engine, OCR Engine, Voice-to-Text, Categorization Engine, Personality Engine.
5. **Tầng Dữ liệu:** Cơ sở dữ liệu chính (PostgreSQL/MongoDB) và Object Storage (S3) cho ảnh, exports, backups.

> *Xem Hình: Sơ đồ thành phần (Component Diagram) tại `diagrams/mermaid/component-diagram.md`*

[TODO — Chèn hình sơ đồ thành phần và giải thích chi tiết từng tầng]

### 3.2.2. Thiết kế dữ liệu (Data Design)

#### Sơ đồ lớp (Class Diagram)

Hệ thống PerFin bao gồm các entity chính:

- **User**: Thông tin người dùng, cài đặt cá nhân.
- **Transaction**: Giao dịch thu/chi/đặc biệt, liên kết với Category và Wallet.
- **Category**: Danh mục giao dịch (mặc định và tùy chỉnh), hỗ trợ cấu trúc cha-con.
- **Wallet**: Ví/tài khoản tài chính (tiền mặt, ngân hàng, ví điện tử, đầu tư).
- **Budget**: Ngân sách theo danh mục hoặc tổng thể, với kỳ tuần/tháng.
- **Reminder**: Nhắc nhở giao dịch và chi phí cố định.
- **AIPersonality**: Nhân cách AI chatbot.
- **ChatMessage**: Lưu trữ lịch sử hội thoại.

> *Xem Hình: Sơ đồ lớp (Class Diagram) tại `diagrams/mermaid/class-diagram.md`*

[TODO — Chèn hình sơ đồ lớp và giải thích các quan hệ giữa các entity]

#### Sơ đồ quan hệ thực thể (ERD)

[TODO — Tạo ERD từ Class Diagram, bổ sung các trường dữ liệu, kiểu dữ liệu, khóa chính, khóa ngoại]

### 3.2.3. Thiết kế chi tiết (Detailed Design)

#### Sơ đồ Use Case tổng quan

Sơ đồ Use Case mô tả tổng quan các tác nhân và chức năng chính của hệ thống PerFin, được tổ chức theo 9 nhóm yêu cầu (REQ-01 đến REQ-09).

> *Xem Hình: Sơ đồ Use Case tổng quan tại `diagrams/mermaid/use-case-diagram.md`*

[TODO — Chèn hình sơ đồ Use Case và giải thích]

#### Sơ đồ tuần tự (Sequence Diagrams)

Các sơ đồ tuần tự mô tả luồng tương tác giữa các tác nhân và hệ thống cho các use case quan trọng:

> *Xem Hình: Các sơ đồ tuần tự tại `diagrams/mermaid/sequence-diagrams.md`*

[TODO — Chèn các sơ đồ tuần tự chính và giải thích từng luồng]

#### Sơ đồ hoạt động (Activity Diagrams)

Các sơ đồ hoạt động mô tả chi tiết quy trình xử lý cho các luồng nghiệp vụ phức tạp:

> *Xem Hình: Các sơ đồ hoạt động tại `diagrams/mermaid/activity-diagrams.md`*

[TODO — Chèn các sơ đồ hoạt động chính và giải thích]

#### Thiết kế giao diện người dùng (UI Design)

[TODO — Trình bày wireframe/mockup cho các màn hình chính:
1. Màn hình Chat (giao diện chính)
2. Màn hình Dashboard/Tổng quan
3. Màn hình Báo cáo/Biểu đồ
4. Màn hình Quản lý Ngân sách
5. Màn hình Quản lý Ví/Tài khoản
6. Màn hình Cài đặt]

#### Mô tả thuật toán và kỹ thuật quan trọng

[TODO — Giải thích chi tiết:
1. Luồng xử lý NLP: từ input text → intent classification → entity extraction → transaction creation
2. Luồng xử lý OCR: từ image → preprocessing → text detection → structured data extraction
3. Thuật toán phân loại danh mục: prompt engineering cho LLM, feedback loop
4. Thuật toán phát hiện bất thường chi tiêu
5. Cơ chế cảnh báo ngân sách proactive]

## 3.3. Kiểm thử (Testing)

### 3.3.1. Kế hoạch kiểm thử (Test Plan)

[TODO — Trình bày chiến lược kiểm thử bao gồm:]

#### Các loại kiểm thử

| Loại kiểm thử | Mô tả | Công cụ |
|---------------|-------|---------|
| Unit Testing | Kiểm thử từng hàm/module riêng lẻ | [TODO] |
| Integration Testing | Kiểm thử tích hợp giữa các service | [TODO] |
| System Testing | Kiểm thử toàn hệ thống end-to-end | [TODO] |
| User Acceptance Testing | Kiểm thử chấp nhận với người dùng thực | [TODO] |

#### Các test case chính

[TODO — Liệt kê test case cho các luồng quan trọng:]

| Mã TC | Mô tả | Đầu vào | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|-------|-------|---------|-------------------|-----------------|------------|
| TC-01 | Nhập giao dịch bằng văn bản tiếng Việt | "trà sữa 50k" | Tạo giao dịch: tên="trà sữa", số tiền=50.000đ, danh mục="Ăn uống" | [TODO] | [TODO] |
| TC-02 | Nhập giao dịch bằng hình ảnh hóa đơn | Ảnh hóa đơn siêu thị | Trích xuất danh sách sản phẩm và tổng tiền | [TODO] | [TODO] |
| TC-03 | Cảnh báo ngân sách 70% | Chi tiêu vượt 70% hạn mức | Hệ thống gửi cảnh báo trong chat | [TODO] | [TODO] |
| TC-04 | Phân loại tự động | "grab đi làm 30k" | Giao dịch phân loại vào "Di chuyển" | [TODO] | [TODO] |

[TODO — Bổ sung thêm test case]

### 3.3.2. Kết quả và phân tích (Results & Analysis)

[TODO — Trình bày kết quả kiểm thử:]

[TODO — Sử dụng bảng, biểu đồ để minh họa:
- Tỷ lệ pass/fail của test case
- Độ chính xác phân loại danh mục
- Thời gian phản hồi trung bình
- Kết quả UAT]

---

# CHƯƠNG 4: KẾT LUẬN

## 4.1. Kết quả đạt được

[TODO — Tóm tắt các mục tiêu đã đạt được:]

- [TODO — Liệt kê từng mục tiêu và mức độ hoàn thành]

## 4.2. Hạn chế

[TODO — Nêu các hạn chế của đề tài:]

- [TODO — Ví dụ: giới hạn về thời gian, tính năng chưa hoàn thiện, dữ liệu kiểm thử hạn chế...]

## 4.3. Hướng phát triển

[TODO — Đề xuất hướng phát triển trong tương lai:]

- Mở rộng hỗ trợ đa ngôn ngữ (ngoài Việt - Anh).
- Tích hợp API ngân hàng để đồng bộ giao dịch tự động (Open Banking).
- Phát triển tính năng ví chung (Shared Wallets) cho nhóm.
- Tự động đề xuất hạn mức ngân sách dựa trên lịch sử chi tiêu (AI auto-suggest).
- Tối ưu hóa model AI on-device để giảm phụ thuộc vào cloud.

---

# TÀI LIỆU THAM KHẢO

> *Tài liệu tham khảo theo chuẩn IEEE.*

[TODO — Bổ sung tài liệu tham khảo theo format IEEE:]

[1] [TODO — Tên tác giả], "[TODO — Tên bài báo/sách]", *[TODO — Tên tạp chí/NXB]*, [TODO — năm].

[2] [TODO]

[3] [TODO]

---

# PHỤ LỤC

## Phụ lục A: Tài liệu đặc tả yêu cầu chi tiết

> *Toàn bộ tài liệu REQ-01 đến REQ-09 được lưu trữ tại thư mục `requirements/`.*

| Tài liệu | Đường dẫn |
|-----------|-----------|
| REQ-01 | `requirements/REQ-01 Nhập liệu đa phương thức bằng AI (AI-Powered Input).md` |
| REQ-02 | `requirements/REQ-02 Phân loại thông minh (Auto-Categorization).md` |
| REQ-03 | `requirements/REQ-03 Quản lý ngân sách (Budget Management).md` |
| REQ-04 | `requirements/REQ-04 Phân tích và báo cáo cá nhân hóa (Personalized Insights).md` |
| REQ-05 | `requirements/REQ-05 Quản lý tài khoản đa nguồn (Multi-Account).md` |
| REQ-06 | `requirements/REQ-06 Phân tách dòng tiền và tài sản (Cashflow & Asset Management).md` |
| REQ-07 | `requirements/REQ-07 Xuất dữ liệu và sao lưu (Export & Backup).md` |
| REQ-08 | `requirements/REQ-08 Quản lý chi phí cố định và nhắc nhở (Recurring Bills & Reminders).md` |
| REQ-09 | `requirements/REQ-09 Nhân cách AI (AI Personalities).md` |

## Phụ lục B: Sơ đồ thiết kế

> *Toàn bộ sơ đồ thiết kế được lưu trữ tại thư mục `diagrams/`.*

| Sơ đồ | Đường dẫn Mermaid | Đường dẫn PlantUML |
|-------|--------------------|--------------------|
| Use Case Diagram | `diagrams/mermaid/use-case-diagram.md` | `diagrams/puml/use-case-diagram.puml` |
| Component Diagram | `diagrams/mermaid/component-diagram.md` | `diagrams/puml/component-diagram.puml` |
| Class Diagram | `diagrams/mermaid/class-diagram.md` | `diagrams/puml/class-diagram.puml` |
| Sequence Diagrams | `diagrams/mermaid/sequence-diagrams.md` | `diagrams/puml/sequence-diagrams.puml` |
| Activity Diagrams | `diagrams/mermaid/activity-diagrams.md` | `diagrams/puml/activity-diagrams.puml` |

## Phụ lục C: Hướng dẫn sử dụng

[TODO — Nếu có, bổ sung hướng dẫn sử dụng ứng dụng cho người dùng cuối]

## Phụ lục D: Tài liệu bổ sung

[TODO — Các tài liệu bổ sung khác nếu cần]

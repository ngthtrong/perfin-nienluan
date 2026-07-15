# BÁO CÁO TRẠNG THÁI HỆ THỐNG PERFIN

**Mốc đánh giá:** 15/07/2026  
**Phạm vi:** mã nguồn trong `demo/`, migrations, kiểm thử tự động và tài liệu hiện hành  
**Mục đích:** xác định phần đã hiện thực, phần chỉ hoạt động khi có hạ tầng/provider, phần còn khuyết hoặc lỗi, và phạm vi phù hợp với niên luận cơ sở ngành.

## 1. Kết luận điều hành

PERFIN đã có một lõi dữ liệu và giải thuật đáng kể cho bài toán quản lý tài chính cá nhân: sổ giao dịch, ví, danh mục, ngân sách, mục tiêu, khoản chi định kỳ, phân tích thống kê, phát hiện mẫu và luồng hội thoại có bước xem trước/xác nhận. Backend có 12 nhóm route được gắn tại `demo/backend/index.js`; giao diện Expo đã bao phủ các màn hình nghiệp vụ chính.

Tuy nhiên, hệ thống hiện chưa nên được mô tả là một sản phẩm hoàn chỉnh hoặc đã sẵn sàng triển khai thực tế. Các luồng phụ thuộc PostgreSQL, Redis, Gemini, OCR và STT chưa được kiểm chứng end-to-end trong đợt đánh giá này. Cơ chế xác thực chưa tồn tại, mọi route đang dùng `default_user`; một số lỗi toàn vẹn dữ liệu, lựa chọn provider, xuất PDF và sao lưu vẫn cần sửa.

Vai trò đúng của LLM trong PERFIN là **bộ chuyển đổi ngữ nghĩa** và **bộ diễn đạt có căn cứ**, không phải bộ máy tính toán số liệu tài chính:

1. LLM chuyển câu tiếng Việt tự nhiên thành lệnh có kiểu dữ liệu rõ ràng.
2. SQL và các hàm JavaScript tất định lấy dữ liệu, kiểm tra điều kiện và tính toán kết quả.
3. LLM chỉ diễn đạt lại các `facts` đã tính; khi không có LLM, hệ thống dùng parser và mẫu diễn đạt cục bộ.
4. Mọi thao tác làm thay đổi dữ liệu phải đi qua bản xem trước, xác nhận của người dùng và service cơ sở dữ liệu.

Với định hướng niên luận cơ sở ngành, phần có giá trị học thuật nhất là mô hình dữ liệu, pipeline xử lý, giải thuật và phương pháp đánh giá. Xác thực đa người dùng, đồng bộ ngân hàng, thông báo đẩy và vận hành production nên được ghi rõ là ngoài phạm vi, thay vì mở rộng thành một ứng dụng thương mại đầy đủ.

## 2. Phương pháp và giới hạn đánh giá

Đợt đánh giá sử dụng bốn nguồn bằng chứng:

- đọc tĩnh mã nguồn backend, frontend, migrations và tài liệu;
- chạy bộ unit/service test của backend;
- chạy bộ câu kiểm thử parser ở chế độ local, không dùng Gemini;
- build tĩnh frontend cho nền tảng web bằng Expo.

Các nhãn trạng thái trong báo cáo có nghĩa như sau:

| Nhãn | Ý nghĩa |
|---|---|
| **Đã hiện thực** | Có mã nguồn và đã có bằng chứng unit/build tương ứng; không đồng nghĩa đã kiểm chứng production |
| **Hoạt động có điều kiện** | Có mã nguồn nhưng cần PostgreSQL, Redis, khóa API, model hoặc tiến trình worker để chạy đầy đủ |
| **Đang phát triển/khuyết** | Luồng chính đã có nhưng thiếu API, UI, kiểm thử tích hợp hoặc một phần nghiệp vụ |
| **Chưa hoạt động/lỗi** | Tên tính năng gây hiểu nhầm, có lỗi đã xác định, hoặc chưa có cơ chế thực thi cần thiết |
| **Ngoài phạm vi** | Không cần hoàn thành để đạt mục tiêu dữ liệu/giải thuật của niên luận cơ sở ngành |

Không có tuyên bố nào trong tài liệu này rằng tích hợp PostgreSQL trực tiếp, Gemini trực tuyến, Google Vision, PaddleOCR, Google Speech hoặc PhoWhisper đã đạt độ chính xác end-to-end. Đợt chạy trong môi trường đánh giá không có kết nối live PostgreSQL/Redis và chưa có tập ground truth cho OCR/STT.

## 3. Kiến trúc và hiện trạng mã nguồn

### 3.1. Thành phần đang tồn tại

- **Ứng dụng khách:** React Native/Expo, điều hướng và màn hình trong `demo/frontend/src/`.
- **API:** Express 5, khởi tạo tại `demo/backend/index.js`.
- **Dữ liệu bền vững:** PostgreSQL qua `demo/backend/config/database.js` và migrations `demo/backend/migrations/001_init_mvp_schema.sql` đến `008_legacy_user_fks_and_schema_views.sql`.
- **Trạng thái tạm/cache:** Redis nếu khả dụng, nếu không dùng `Map` trong tiến trình tại `demo/backend/services/store/kv.store.js`.
- **Xử lý nền:** BullMQ worker tại `demo/backend/scripts/worker.js` và `demo/backend/services/jobs/`.
- **AI ngôn ngữ:** Gemini function calling và fallback local tại `demo/backend/services/ai.service.js`.
- **Media AI:** Google Cloud hoặc script PaddleOCR/PhoWhisper tại `demo/backend/services/media-ai.service.js` và `demo/backend/scripts/`.

Docker Compose hiện chủ yếu cung cấp Redis (`demo/backend/compose.redis.yml`); API, worker và PostgreSQL chưa được đóng gói thành một deployment duy nhất có health/readiness đầy đủ.

### 3.2. Ranh giới nguồn sự thật

PostgreSQL phải là nguồn sự thật cho giao dịch, số dư, ngân sách và mục tiêu. Redis/Map chỉ giữ cache, rate limit, trạng thái hội thoại và bản ghi chờ xác nhận có TTL. LLM không được xem là nguồn sự thật vì đầu ra có thể biến thiên và phụ thuộc provider.

Luồng thay đổi dữ liệu dự kiến là:

`văn bản/media → lệnh có kiểu → kiểm tra/chuẩn hóa → preview → người dùng xác nhận → transaction SQL → phản hồi`

Sự tách biệt này đã xuất hiện trong `demo/backend/services/ai/toolDeclarations.js`, `demo/backend/routes/chat.routes.js`, `demo/backend/services/pendingTransaction.service.js` và `demo/backend/models/transaction.model.js`. Đây là nền tảng tốt, nhưng bước “nhận quyền xử lý” pending hiện chưa nguyên tử và cần được gia cố trước khi xem là ổn định.

## 4. Ma trận trạng thái tính năng

| Nhóm tính năng | Trạng thái | Bằng chứng và nhận xét |
|---|---|---|
| Giao dịch thu/chi thủ công | **Đã hiện thực; runtime có điều kiện** | CRUD, lọc, phân trang, cập nhật số dư và soft-delete/restore 30 giây có trong `demo/backend/routes/transaction.routes.js` và `demo/backend/models/transaction.model.js`; cần PostgreSQL để chạy end-to-end |
| Tạo nhiều giao dịch nguyên tử | **Đã hiện thực** | `createMany()` dùng một SQL transaction tại `demo/backend/models/transaction.model.js` |
| Danh mục | **Đã hiện thực ở backend; UI khuyết** | CRUD và gợi ý/retag ở `demo/backend/routes/category.routes.js`; frontend chưa có màn hình quản trị danh mục đầy đủ |
| Ví/tài khoản | **Đang phát triển/khuyết** | Model có `create()` nhưng `demo/backend/routes/account.routes.js` không có `POST`; frontend không có luồng tạo/quản trị nhiều ví hoàn chỉnh |
| Số dư, cashflow, chuyển ví và P&L đầu tư | **Đã hiện thực; runtime có điều kiện** | API trong `demo/backend/routes/cashflow.routes.js`; tính hữu dụng của chuyển ví/P&L bị giới hạn khi chưa tạo được nhiều ví từ API/UI |
| Dashboard và báo cáo | **Đã hiện thực; runtime có điều kiện** | Query tổng hợp và insights trong `demo/backend/services/report.service.js`, `demo/backend/services/analytics/` và `demo/frontend/src/screens/ReportScreen.js` |
| Ngân sách CRUD và tiến độ | **Đã hiện thực** | Backend có CRUD/progress tại `demo/backend/routes/budget.routes.js`; màn hình hiện chưa khai thác đầy đủ thao tác xóa và dự báo |
| Đề xuất và dự báo ngân sách | **Đã hiện thực ở service; UI khuyết** | Trung bình lịch sử, buffer, hybrid, 50/30/20 và ngoại suy tuyến tính tại `demo/backend/services/budgets/`; đã có unit test nhưng cần đánh giá trên dữ liệu thật |
| Mục tiêu tài chính | **Đã hiện thực** | Lập kế hoạch tiết kiệm/mua sắm/trả nợ, deadline và what-if tại `demo/backend/services/goals/` cùng màn hình `demo/frontend/src/screens/GoalsScreen.js` |
| Khoản chi định kỳ | **Đã hiện thực nhưng cần gia cố** | CRUD, nhắc hạn, thanh toán, lịch sử tại `demo/backend/routes/recurring.routes.js`; thao tác thanh toán gồm nhiều bước chưa nằm trong cùng một SQL transaction |
| Chat nhập giao dịch bằng văn bản | **Đã hiện thực** | Parse, hỏi bổ sung, preview, sửa, xác nhận và hủy tại `demo/backend/routes/chat.routes.js`; local parser vẫn dùng được khi không có Gemini |
| Gemini function calling | **Hoạt động có điều kiện** | Có tám tool declaration tại `demo/backend/services/ai/toolDeclarations.js`; cần khóa API/model khả dụng và chưa được chạy benchmark online trong đợt này |
| OCR hóa đơn | **Hoạt động có điều kiện, chưa xác nhận chất lượng** | Có Google Vision/PaddleOCR và bước xác nhận tại `demo/backend/routes/ai.routes.js`; chưa có ground truth để kết luận độ chính xác |
| Speech-to-text | **Hoạt động có điều kiện, chưa xác nhận chất lượng** | Có Google Speech/PhoWhisper tại `demo/backend/services/media-ai.service.js`; chưa có benchmark transcript chuẩn |
| Feedback cá nhân hóa | **Đã hiện thực ở backend; UI khuyết** | Lưu sửa sai, fuzzy matching, discovery/retag tại `demo/backend/services/feedback/`; đây là retrieval/rule-based learning, không phải fine-tuning model |
| Persona | **Đã hiện thực một phần** | Chọn persona có UI tại `demo/frontend/src/screens/SettingsScreen.js`; consent và user traits có API tại `demo/backend/routes/persona.routes.js` nhưng chưa có UI đầy đủ |
| Cache, pending state và rate limit | **Đã hiện thực; chế độ phân tán có điều kiện** | Có Redis và fallback memory tại `demo/backend/services/store/`; fallback memory chỉ phù hợp một tiến trình phát triển |
| Worker chủ động | **Hoạt động có điều kiện** | Lịch recurring, runway, subscription, month-end và cleanup tại `demo/backend/services/jobs/`; cần Redis và worker chạy riêng |
| Thông báo | **Đang phát triển/khuyết** | Worker ghi thông báo vào `chat_messages` qua `demo/backend/services/jobs/internalMessage.js`; chưa phải push notification của thiết bị |
| CSV export | **Đã hiện thực; runtime có điều kiện** | Sinh CSV UTF-8 và lịch sử tải xuống tại `demo/backend/services/export.service.js` |
| PDF export | **Chưa hoạt động đúng tên gọi** | Endpoint `/pdf` thực tế tạo tệp `.html` và trả `text/html` tại `demo/backend/services/export.service.js` và `demo/backend/routes/export.routes.js` |
| Backup/restore thủ công | **Đang phát triển; chưa an toàn để dùng thật** | Có bundle AES-256-GCM và restore backend, nhưng khóa mã hóa được nhúng trong chính file; payload/restore chưa bao phủ toàn bộ bảng và frontend chưa có luồng restore |
| Auto-backup | **Chưa hoạt động** | Có cấu hình `auto_enabled`, `frequency`, `keep_count`, nhưng `demo/backend/services/jobs/schedules.js` không định nghĩa job tạo backup định kỳ |
| Xác thực và phân quyền | **Chưa hiện thực** | Các route dùng hằng `default_user`; ví dụ `demo/backend/routes/chat.routes.js`, `transaction.routes.js`, `goal.routes.js` và `export.routes.js` |
| Đa người dùng | **Ngoài phạm vi niên luận hiện tại; bắt buộc nếu triển khai công khai** | Schema có `users`/`user_id`, nhưng nhiều truy vấn theo `id` chưa kèm `user_id`; không được quảng bá là multi-user an toàn |
| Đồng bộ ngân hàng, chia sẻ ví, thanh toán thật | **Ngoài phạm vi** | Không cần thiết để chứng minh mô hình dữ liệu và giải thuật của đề tài cơ sở ngành |

## 5. Vai trò, lợi ích và tác động của LLM

### 5.1. Vai trò được phép

**Bộ chuyển đổi ngữ nghĩa.** Gemini nhận câu tự nhiên và chọn/điền một trong tám lệnh: ghi giao dịch, quản lý khoản định kỳ, tạo mục tiêu, truy vấn dữ liệu, gợi ý ngân sách, xuất dữ liệu, chuyển tiền và ghi P&L. Kết quả được chuyển thành intent có cấu trúc bởi `demo/backend/services/ai/toolDeclarations.js`.

**Bộ diễn đạt có căn cứ.** `demo/backend/services/analytics/index.js` tính `facts`; `demo/backend/services/ai.service.js` chỉ dùng LLM để trình bày các facts theo persona. Nếu provider không có, `demo/backend/services/analytics/narrator.fallback.js` tạo câu trả lời tất định.

**Bộ hỗ trợ nhập liệu đa phương thức.** OCR/STT chỉ biến ảnh/âm thanh thành văn bản; parser/LLM tiếp tục biến văn bản thành bản ghi có cấu trúc. Không bước nào được tự ghi giao dịch mà bỏ qua preview/xác nhận.

### 5.2. Vai trò không được gán cho LLM

- Không cộng tổng thu/chi, tính số dư hay phần trăm ngân sách.
- Không tự suy đoán một con số không có trong dữ liệu.
- Không trực tiếp `INSERT`, `UPDATE` hoặc `DELETE` dữ liệu.
- Không thay thế kiểm tra ràng buộc, transaction SQL hay xác nhận của người dùng.
- Không được mô tả feedback hiện tại là “huấn luyện lại” hoặc “fine-tuning”.

### 5.3. Lợi ích có thể kiểm chứng

- giảm số bước nhập cho câu tự nhiên tiếng Việt;
- hỗ trợ nhiều cách diễn đạt cho cùng một intent;
- biến kết quả thống kê thành giải thích dễ đọc;
- cho phép cá nhân hóa giọng điệu mà không thay đổi số liệu;
- duy trì chức năng cơ bản bằng local fallback khi provider ngoài không sẵn sàng.

Để chứng minh tác động thay vì chỉ mô tả, báo cáo cuối nên đo ít nhất: độ chính xác intent, amount/type/category, tỷ lệ cần hỏi lại, tỷ lệ preview bị người dùng sửa, hallucination của narration, latency, chi phí, và tỷ lệ fallback thành công. Kết quả LLM phải được so sánh với baseline local parser trên cùng tập câu.

## 6. Kiểm kê dữ liệu

### 6.1. Lược đồ vật lý

Tám migration hiện tạo 18 bảng:

1. `users`
2. `ai_personalities`
3. `user_traits`
4. `categories`
5. `wallets`
6. `transactions`
7. `budgets`
8. `budget_history`
9. `chat_messages`
10. `investment_pnl`
11. `wallet_transfers`
12. `export_history`
13. `backup_config`
14. `recurring_bills`
15. `recurring_bill_payments`
16. `recurring_suggestions_dismissed`
17. `financial_goals`
18. `ai_feedback_logs`

Nguồn: `demo/backend/migrations/001_init_mvp_schema.sql` đến `demo/backend/migrations/008_legacy_user_fks_and_schema_views.sql`. Migration 008 còn tạo ba compatibility view: `investment_pl_records`, `export_histories`, `backup_configs`.

### 6.2. Nhóm dữ liệu trọng tâm của đề tài

| Nhóm | Dữ liệu | Giá trị đối với niên luận |
|---|---|---|
| Sổ cái cá nhân | giao dịch, ví, chuyển ví, P&L | Bảo toàn số dư, truy vấn tổng hợp, transaction và ràng buộc |
| Phân loại | danh mục, văn bản gốc, kết quả AI, feedback | Đánh giá parser, fuzzy matching và sửa nhãn |
| Lập kế hoạch | ngân sách, lịch sử ngân sách, mục tiêu | Dự báo, khuyến nghị và mô phỏng what-if |
| Chu kỳ | recurring bill, payment, dismissed suggestion | Tính kỳ hạn và khai phá mẫu lặp |
| Hội thoại | messages, pending/conversation state | Mô hình trạng thái và kiểm soát side effect |
| Cá nhân hóa | persona, traits, consent | Tách nội dung facts khỏi phong cách trình bày |
| Vận hành | export history, backup config | Theo dõi artifact và tác vụ nền |

Các trường `original_text`, `ai_parsed` và `ai_feedback_logs` đặc biệt quan trọng vì cho phép xây dựng tập đánh giá có truy vết: đầu vào nào, hệ thống dự đoán gì, người dùng sửa gì và phiên bản giải thuật nào đã tạo kết quả.

## 7. Kiểm kê giải thuật

| Nhóm giải thuật | Hiện thực | Nguồn |
|---|---|---|
| Parser cục bộ | Chuẩn hóa tiếng Việt, nhận dạng số tiền, intent và alias danh mục | `demo/backend/services/parser.service.js`, `demo/backend/services/ai/localIntentRouter.js` |
| Thống kê mô tả | Mean, sample standard deviation, median, quantile | `demo/backend/services/analytics/algorithms.js` |
| Xu hướng | Hồi quy tuyến tính OLS, slope, intercept, R², forecast bước kế | `demo/backend/services/analytics/algorithms.js` |
| Bất thường | Z-score kết hợp IQR upper fence | `demo/backend/services/analytics/algorithms.js` |
| Runway | Số dư chia mức đốt tiền trung bình theo ngày | `demo/backend/services/analytics/algorithms.js` |
| Tương quan | Hệ số Pearson giữa hai chuỗi | `demo/backend/services/analytics/algorithms.js` |
| Phát hiện subscription | Nhóm mô tả chuẩn hóa, độ ổn định tiền ±15%, nhịp 20–40 ngày | `demo/backend/services/analytics/subscriptionMiner.js` |
| Khuyến nghị ngân sách | Trung bình lịch sử + buffer; category average, hybrid, 50/30/20 | `demo/backend/services/budgets/recommender.js` |
| Dự báo ngân sách | Ngoại suy tốc độ chi tiêu hiện tại đến cuối tháng | `demo/backend/services/budgets/forecast.js` |
| Lập kế hoạch mục tiêu | Tiết kiệm/mua sắm, deadline, dư địa tháng, mô phỏng trả nợ theo lãi suất | `demo/backend/services/goals/planner.js` |
| Lịch định kỳ | Tính ngày đến hạn tiếp theo theo tuần/tháng/quý/năm | `demo/backend/models/recurringBill.model.js` |
| Học từ feedback | Levenshtein, Dice, containment, correction retrieval, discovery/retag | `demo/backend/services/feedback/` |
| Lập lịch nền | Cron, retry exponential và idempotent internal message | `demo/backend/services/jobs/` |

Điểm mạnh là phần lớn phép tính được viết thành hàm thuần, có thể unit test độc lập với LLM và cơ sở dữ liệu. Đây nên là trọng tâm trình bày, thực nghiệm và phản biện trong niên luận.

## 8. Kết quả kiểm thử đã đo

### 8.1. Baseline tại thời điểm audit, trước sửa lỗi

| Phép kiểm tra | Kết quả | Kết luận hợp lệ |
|---|---:|---|
| `npm test` tại `demo/backend` | **13/13 tệp test pass**, 0 tệp fail | Các unit/service test hiện có chạy qua; chưa chứng minh API + PostgreSQL end-to-end |
| `AI_PROVIDER=local GEMINI_API_KEY= npm run test:ai` | **27/31 pass strict**, 2 partial, 2 fail | Local parser đạt 87% strict và 90% theo cách tính partial-credit của harness trên 31 câu cố định |
| Expo web export | **Pass**, 652 modules, bundle khoảng 1,49 MB | Frontend có thể bundle cho web; chưa thay thế kiểm thử hành vi hoặc native build |

Bộ AI harness nằm ở `demo/backend/tests/ai-accuracy-test.js`. Hai trường hợp partial là:

- `mua quần jeans 450 nghìn`: đúng amount/type nhưng phân loại thành `Khác` thay vì `Mua sắm`;
- `đi ăn hết 250k cho 2 người`: đúng amount/type nhưng phân loại thành `Tạp hóa` thay vì `Ăn uống`.

Hai trường hợp fail là:

- `shopping 1 triệu 5`: nhận 1.000.000 thay vì 1.500.000;
- `mua 3 cái áo mỗi cái 200k`: nhận 200.000 thay vì nhân thành 600.000.

### 8.2. Điều chưa được kết luận từ baseline

- Chưa có live test với PostgreSQL nên chưa xác nhận migrations, khóa ngoại, transaction và API cùng hoạt động trong một môi trường sạch.
- Chưa có Redis/worker integration test thực tế trong đợt này.
- Chưa benchmark Gemini trên cùng 31 câu; không được dùng kết quả local để tuyên bố độ chính xác LLM.
- Chưa có tập ảnh hóa đơn và transcript chuẩn để tính CER/WER hoặc độ chính xác trường dữ liệu OCR/STT.
- Chưa có E2E test từ thao tác UI đến dữ liệu bền vững.
- Ở baseline, harness AI chỉ in tỷ lệ; các câu sai chưa làm tiến trình tự động trả exit code khác 0.

### 8.3. Kết quả sau đợt ổn định hóa

Các lỗi baseline được giữ ở trên để truy vết. Sau khi triển khai các sửa đổi trong `Stabilization_Log_2026-07-15.md`, bộ kiểm tra được chạy lại:

| Phép kiểm tra | Kết quả sau sửa | Thay đổi so với baseline |
|---|---:|---|
| `npm test` tại `demo/backend` | **18/18 tệp đạt**, 0 fail, khoảng 1,028 giây | Thêm hồi quy transaction, pending race, recurring, parser, export và time-series |
| `npm run test:ai` | **31/31 strict**, 0 partial, 0 fail | Sửa hai lỗi amount và hai lỗi category; harness trở thành strict quality gate có exit code |
| Expo web export | **Pass**, 652 modules, bundle khoảng 1,49 MB | Xác nhận các thay đổi frontend vẫn biên dịch/đóng gói được |
| `git diff --check` | **Sạch** | Không phát hiện lỗi whitespace trong phần thay đổi |

Các sửa đổi chính gồm claim pending nguyên tử và `pending_id`; recurring payment chạy trong transaction khóa hàng, bắt buộc kỳ dự kiến và qua preview/confirm; rollback/post-commit đúng ngữ nghĩa; parser/date local; provider selection; zero-fill ngày/tháng cho runway/OLS; mẫu số export và HTML escaping. Đây là bằng chứng unit/service/build, **không thay thế** live integration test PostgreSQL, Redis, Gemini, OCR hoặc STT.

## 9. Lỗi và rủi ro ưu tiên

Mức ưu tiên dưới đây là đánh giá kỹ thuật cho lộ trình ổn định hóa, không phải điểm số an toàn đã được kiểm định độc lập.

Các bảng 9.1–9.3 ghi lại phát hiện ở **mốc baseline**. Trạng thái sau xử lý được đối chiếu tại Mục 8.3 và biên bản ổn định hóa; các mục production/out-of-scope vẫn còn hiệu lực.

### 9.1. Mức C — chặn triển khai công khai

| Vấn đề | Tác động | Bằng chứng/đề xuất |
|---|---|---|
| Không có xác thực/phân quyền; mọi request dùng `default_user` | Bất kỳ client nào truy cập API đều thao tác cùng dữ liệu | Các file trong `demo/backend/routes/`; giữ single-user local cho niên luận hoặc thêm auth trước khi public |
| Nhiều thao tác lấy/sửa theo `id` không kèm `user_id` | IDOR khi chuyển sang multi-user | Ví dụ `demo/backend/models/account.model.js`, `transaction.model.js`, `budget.model.js`, `recurringBill.model.js`; mọi query ownership phải được scope |
| Khóa AES được nhúng trong chính file backup | Người có file cũng có khóa; “mã hóa” không tạo bí mật thực chất | `demo/backend/services/export.service.js`; dùng khóa dẫn xuất từ mật khẩu/KMS hoặc mô tả rõ đây chỉ là format MVP |

Ba vấn đề này có thể được ghi là ngoài phạm vi triển khai của niên luận single-user, nhưng không được bỏ qua nếu hệ thống được mở mạng hoặc quảng bá là đa người dùng/an toàn.

### 9.2. Mức H — ảnh hưởng chức năng lõi hoặc toàn vẹn dữ liệu

| Vấn đề | Tác động | Vị trí |
|---|---|---|
| Chọn provider trên UI không thay đổi thứ tự provider thực thi | `setSelection()` cập nhật `selected.provider`, nhưng `getProviderOrder()` đọc `this.provider` | `demo/backend/services/ai.service.js` |
| Media text rỗng gọi hàm chưa import | Có thể phát sinh `ReferenceError` ở nhánh empty input | `parseFromMedia()` trong `demo/backend/services/ai.service.js` |
| Xác nhận pending không có thao tác claim nguyên tử | Hai request confirm đồng thời có thể cùng tạo dữ liệu | `demo/backend/services/pendingTransaction.service.js`, `demo/backend/routes/chat.routes.js` |
| Thanh toán recurring gồm nhiều lần ghi độc lập | Có thể đã tạo transaction nhưng chưa ghi payment/advance due date | `recordPayment()` trong `demo/backend/models/recurringBill.model.js` |
| Một số nhánh không tìm thấy bản ghi rời transaction trước khi commit/rollback | Kết nối được release khi SQL transaction còn mở, tạo rủi ro trạng thái phiên | `update()` và `softDelete()` trong `demo/backend/models/transaction.model.js` |
| Không thể tạo ví qua API/UI | Chặn kịch bản nhiều ví, transfer và P&L trên fresh install | Model có `create()`, route `demo/backend/routes/account.routes.js` không có `POST` |
| HTML report chèn trực tiếp dữ liệu người dùng | Mô tả/nội dung có thể phá markup hoặc tạo stored script khi mở report | `buildReportHTML()` trong `demo/backend/services/export.service.js`; cần HTML escaping |
| Tỷ lệ danh mục của export dùng mẫu số không theo bộ lọc ngày | Tổng phần trăm có thể sai đối với khoảng thời gian chọn | Subquery `percentage` trong `exportPDF()` tại `demo/backend/services/export.service.js` |

### 9.3. Mức M — thiếu hoàn thiện hoặc gây hiểu nhầm

| Vấn đề | Tác động | Vị trí |
|---|---|---|
| “PDF” là HTML | Sai định dạng so với tên API/UI | `demo/backend/services/export.service.js`, `demo/backend/routes/export.routes.js` |
| Auto-backup có cấu hình nhưng không có scheduler | Bật tùy chọn không tạo backup định kỳ | `demo/backend/services/jobs/schedules.js` |
| Backup/restore chỉ bao phủ một phần bảng | Có thể mất recurring, goals, persona/traits và feedback khi khôi phục | `createBackup()`/`restoreBackup()` trong `demo/backend/services/export.service.js` |
| Frontend không có restore backup | Endpoint tồn tại nhưng người dùng không dùng được từ UI | `demo/frontend/src/screens/ExportScreen.js`, `demo/frontend/src/services/api.service.js` |
| Lịch sử chat bị reverse hai lần | Thứ tự hiển thị có thể ngược | Model reverse tại `demo/backend/models/chatMessage.model.js`, UI reverse tại `demo/frontend/src/screens/ChatScreen.js` |
| `due_day` route chỉ kiểm tra có giá trị | Giá trị ngoài miền có thể sinh lịch bất ngờ | `demo/backend/routes/recurring.routes.js`, `demo/backend/models/recurringBill.model.js` |
| Root endpoint là liveness dù bootstrap DB thất bại | API có thể báo “running” nhưng nghiệp vụ đều lỗi | `bootstrap()` và route `/` trong `demo/backend/index.js`; cần readiness riêng |
| Notification chỉ là chat nội bộ | Không nhắc được khi ứng dụng không mở | `demo/backend/services/jobs/internalMessage.js` |
| UI chưa bao phủ toàn bộ backend | Category management, generic transaction edit, restore, budget delete/forecast và traits/consent còn thiếu hoặc chưa nối đủ | `demo/frontend/src/screens/` |

## 10. Độ lệch tài liệu

Tài liệu cũ không còn là nguồn sự thật đáng tin cậy nếu không đối chiếu mã nguồn:

- `demo/README.md` vẫn hướng dẫn đường dẫn `demo/v1/`, mô tả `GET/POST /api/accounts` dù route không có `POST`, và nói media fallback trả mock trong khi mã hiện tại trả lỗi/provider state.
- `resource/API.md` ghi `POST /api/accounts` và `POST /api/ai/parse`; mã hiện tại dùng `POST /api/ai/parse-transaction` và không có create-account route.
- `resource/API.md` ghi `PATCH /api/transactions/:id/category`; mã hiện tại dùng `PUT` trong `demo/backend/routes/transaction.routes.js`.
- `resource/flow/FlowSpecial.md` còn mô tả feedback loop là “future”, trong khi `demo/backend/services/feedback/` đã có correction retrieval, discovery và retag.
- Các tài liệu gọi LLM là “bộ não” dễ làm người đọc hiểu rằng LLM tính và quyết định số liệu. Báo cáo mới phải dùng ranh giới semantic adapter + grounded narrator.
- Dự án `archive/latex/` mô tả kiến trúc và yêu cầu của phiên bản cũ, không nên dùng làm bằng chứng trạng thái hiện tại; chỉ nên tham khảo bố cục trình bày.

Quy tắc đề xuất: mã nguồn + migrations + test là bằng chứng hiện trạng; `resource/report/Report_v1.md` là đặc tả/báo cáo mới; các Markdown cũ được lưu như tài liệu lịch sử và phải gắn nhãn phiên bản.

## 11. Giới hạn phương pháp hiện tại

### 11.1. Phân tích và dự báo

- `cashflowRunway()` loại các ngày chi tiêu bằng 0 trước khi lấy trung bình. Điều này có thể làm burn rate cao hơn thực tế và runway ngắn hơn; dữ liệu cũng chưa tách chi bất thường.
- Chuỗi tháng cho hồi quy chỉ chứa tháng có giao dịch; nếu thiếu tháng giữa, chỉ số thời gian bị nén và slope không còn phản ánh đúng lịch.
- Dự báo ngân sách dùng tốc độ chi trung bình đến ngày hiện tại, chưa mô hình hóa ngày lương, cuối tuần, học phí hoặc sự kiện mùa vụ.
- Pearson điền/ghép chuỗi theo cách nghiệp vụ hiện tại nhưng không có p-value, khoảng tin cậy hoặc kiểm định giả thuyết; không nên diễn giải tương quan thành nhân quả.
- Thống kê theo ngày trong tuần chỉ dựa trên ngày có phát sinh; ngày 0 đồng chưa được đưa vào mẫu.

Hai lỗi đầu tiên của mục này (runway bỏ ngày 0 và OLS nén tháng trống) đã được sửa trong đợt ổn định hóa bằng trục lịch zero-fill và kiểm thử neo ngày/tháng. Hạn chế còn lại là mô hình dự báo đơn giản, chưa hiệu chỉnh trên dữ liệu đại diện; thống kê theo ngày trong tuần vẫn dùng `avgPerActiveDay` theo đúng tên nhưng chưa có biến thể calendar-day.

### 11.2. Khai phá subscription và recurring

- `subscriptionMiner` yêu cầu mô tả sau chuẩn hóa giống nhau, amount trong ±15%, cadence khoảng 20–40 ngày và mặc định bỏ khoản trên 500.000 đồng.
- Quy tắc trên dễ bỏ sót merchant đổi mô tả, phí theo năm/quý, giá biến động hoặc subscription giá cao; cũng có thể gộp nhầm các khoản có mô tả chung.
- `computeNextDueDate()` là quy tắc lịch, chưa xử lý ngày nghỉ, timezone nghiệp vụ hoặc lịch thanh toán ngân hàng.

### 11.3. Khuyến nghị ngân sách và feedback

- Số “tháng lịch sử” hiện chủ yếu dựa trên tháng có dữ liệu; tháng không chi chưa chắc được biểu diễn bằng 0.
- Nhóm needs/wants dựa trên tập mặc định và override, mang tính heuristic chứ không phải nhãn khách quan.
- Fuzzy feedback dùng Levenshtein, Dice và containment; chưa có precision/recall trên tập nhãn độc lập.
- Dữ liệu chỉ của một `default_user` không đủ để kết luận khả năng khái quát hóa.

Những giới hạn này không làm giải thuật vô nghĩa. Ngược lại, chúng là nội dung phù hợp để thiết kế thí nghiệm, so sánh baseline, phân tích sai số và đề xuất cải tiến trong niên luận.

## 12. Lộ trình ưu tiên để ổn định tính năng quan trọng

### Giai đoạn 0 — đóng băng phạm vi và nguồn sự thật

1. Chốt hệ thống niên luận là single-user local/demo; không tuyên bố multi-user hoặc production-ready.
2. Chọn các luồng bắt buộc: giao dịch thủ công; chat text preview/confirm; báo cáo; ngân sách; mục tiêu; recurring; local fallback.
3. Đánh dấu OCR/STT, Gemini, Redis worker là module tùy chọn nhưng phải fail rõ ràng, không sinh dữ liệu mock.
4. Đồng bộ `Report_v1`, API docs và README với route/schema hiện tại.

### Giai đoạn 1 — sửa lỗi toàn vẹn và luồng lõi

1. Sửa provider selection và import nhánh media rỗng.
2. Thêm thao tác claim-and-delete nguyên tử cho pending confirm; kiểm thử hai request đồng thời.
3. Đưa recurring payment vào một SQL transaction.
4. Rollback rõ ràng ở mọi nhánh return trong transaction.
5. Thêm create wallet API/UI tối thiểu hoặc chủ động loại multi-wallet khỏi luồng trình diễn.
6. Escape HTML, sửa mẫu số percentage theo filter; đổi tên export HTML hoặc tạo PDF thật.

**Trạng thái sau đợt này:** các mục 1–4 và phần escape/mẫu số của mục 6 đã hoàn tất kèm test; recurring qua chat cũng đã được đưa vào preview/confirm và chống request lặp theo kỳ. Create-wallet và PDF nhị phân đúng nghĩa vẫn còn; live DB integration chưa được chạy.

### Giai đoạn 2 — tạo bằng chứng end-to-end tái lập

1. Dựng PostgreSQL sạch, chạy migrations 001–008 và seed theo một script duy nhất.
2. Thêm integration test cho transaction → wallet balance → report; multi-transaction rollback; recurring payment; pending confirm.
3. Thêm readiness endpoint kiểm tra DB và, khi bật worker, Redis.
4. Chuyển AI harness thành test có exit code khác 0 khi dưới ngưỡng; tách bộ train/dev/test câu tiếng Việt.
5. Tạo dataset OCR/STT có ground truth trước khi công bố độ chính xác.

### Giai đoạn 3 — củng cố phần dữ liệu và giải thuật

1. Zero-fill chuỗi ngày/tháng trước khi tính burn rate, trend và forecast; ghi rõ cửa sổ thời gian.
2. So sánh OLS với baseline naive/seasonal; báo MAE/MAPE trên backtest theo thời gian.
3. Đánh giá anomaly và subscription bằng precision, recall, F1; lưu reason/explanation cho từng phát hiện.
4. Đánh giá feedback matcher trên tập độc lập và theo dõi tỷ lệ sửa danh mục trước/sau khi áp dụng correction.
5. Lưu `algorithm_version`, provider/model và timestamp cùng kết quả đánh giá để tái lập.

### Giai đoạn 4 — hoàn thiện trải nghiệm trình diễn

1. Nối các thao tác UI thiết yếu còn thiếu: quản lý danh mục, sửa giao dịch, budget forecast/delete và trạng thái provider.
2. Hiển thị rõ “đang dùng local/Gemini”, “provider không khả dụng”, confidence và dữ liệu cần xác nhận.
3. Với media, luôn cho người dùng xem/sửa transcript hoặc dữ liệu trích xuất trước khi commit.
4. Nếu giữ backup, thêm restore UI và kiểm thử round-trip toàn bộ bảng trong phạm vi; nếu không, loại auto-backup khỏi feature key.

### Giai đoạn 5 — chỉ khi mở rộng ngoài niên luận

Thêm xác thực, authorization theo ownership, secret management, push notification, observability, backup an toàn, deployment nhiều tiến trình và kiểm thử bảo mật. Đây là cổng bắt buộc trước triển khai công khai nhưng không nên lấn át phần dữ liệu/giải thuật của niên luận cơ sở ngành.

## 13. Tiêu chí “hoàn thành” phù hợp với niên luận

Hệ thống có thể được xem là hoàn thành trong phạm vi đề tài khi đáp ứng đồng thời các điều kiện sau:

- migrations tạo được cơ sở dữ liệu sạch và seed chạy tái lập;
- giao dịch, số dư và recurring giữ toàn vẹn khi thành công, lỗi hoặc request lặp;
- chat text luôn preview trước khi ghi, local fallback hoạt động và provider lỗi không tạo dữ liệu giả;
- report, budget, goal và subscription dùng facts do SQL/giải thuật tính, không dùng số do LLM tự sinh;
- test unit + integration của các luồng lõi chạy pass bằng một lệnh được tài liệu hóa;
- parser/LLM/OCR/STT chỉ được công bố bằng số liệu trên dataset có ground truth và nêu rõ cấu hình;
- báo cáo phân biệt rõ kết quả **đã đo**, tính năng **đã hiện thực**, module **hoạt động có điều kiện** và thiết kế **mục tiêu**;
- các giới hạn giải thuật và ngoài phạm vi được công khai, không che bằng mô tả sản phẩm.

Theo các tiêu chí này, baseline ngày 15/07/2026 là: **lõi dữ liệu/giải thuật đã hình thành nhưng còn lỗi toàn vẹn và parser**. Sau đợt sửa cùng mốc báo cáo, các lỗi lõi đã nêu ở Mục 8.3 có hồi quy và đạt 18/18 tệp test, parser đạt 31/31 strict, frontend export đạt. Tuy nhiên hệ thống vẫn **chưa đủ bằng chứng để gọi là hoàn thiện end-to-end** vì chưa chạy integration test với PostgreSQL/Redis/provider thật và chưa giải quyết các cổng production ở Mục 9.1.

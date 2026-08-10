# BÁO CÁO CHẤT LƯỢNG VÀ PIPELINE THAY DỮ LIỆU DEMO

Ngày kiểm kê: 10/08/2026
Phạm vi: `demo/data/`, schema PostgreSQL qua migrations `001`–`008`, các model giao dịch/danh mục/ví.  
Trạng thái: **đã import và đối soát giao dịch trên PostgreSQL demo**, theo output apply ngày 10/08/2026; backup PostgreSQL chưa được xác nhận trong output cung cấp.

## 1. Kết luận ngắn

`dataFinance.csv` đủ tốt để làm tập dữ liệu demo cho phần dữ liệu và giải thuật sau một bước chuẩn hóa có kiểm soát. Tệp có 5.328 dòng logic, không thiếu mô tả/số tiền/ngày/loại, không có ngày sai, không có sai khác giữa hai cột tiền và không có dấu thu/chi ngược. Pipeline mặc định giữ cả 5.328 giao dịch. Có 24 dòng giống hoàn toàn với dòng khác, nhưng nguồn không có ID hoặc giờ giao dịch để chứng minh đây là bản sao thay vì hai sự kiện thật cùng ngày.

Rủi ro chính không nằm ở định dạng mà ở ngữ nghĩa:

- taxonomy nguồn gồm 26 nhãn chi (kể cả nhãn trống) và 8 nhãn thu, trong khi hệ thống chỉ có 13 danh mục chi và 4 danh mục thu;
- nguồn không có ví, mã giao dịch ổn định, giờ giao dịch hoặc currency; importer phải giả định VND và ánh xạ toàn bộ vào ví `Tiền mặt`;
- các khoản vay/cho vay đang bị ép về danh mục `Khác`, không thể hiện đúng bản chất nợ hoặc chuyển khoản;
- 24 dòng giống hoàn toàn và 615 giá trị vượt ngưỡng IQR chỉ được gắn cờ; muốn loại exact-match phải dùng tùy chọn rõ ràng;
- hai ảnh chứa PII hoặc bí mật hiển thị trực tiếp; ảnh hóa đơn còn metadata thiết bị/GPS. Không được đưa nguyên trạng lên kho công khai hoặc phụ lục công khai.

## 2. Kiểm kê dữ liệu

| Tệp | Kích thước | Định dạng/thuộc tính | SHA-256 | Đánh giá |
|---|---:|---|---|---|
| `dataFinance.csv` | 326.590 byte | UTF-8, CSV, 5.333 dòng vật lý/5.328 bản ghi logic | `418a9439...aed7` | Đã validation và import |
| `img/chuyen-khoan.jpg` | 236.887 byte | JPEG 1184×2560 | `146881fe...bfb` | OCR service smoke PASS; chứa PII ngân hàng |
| `img/hoa-don.jpg` | 3.510.143 byte | JPEG 3024×4032, EXIF từ điện thoại và tag GPS | `f821c791...d9b` | OCR service smoke PASS; chứa PII/bí mật và metadata nhạy cảm |
| `audio/recording.m4a` | 52.224 byte | AAC mono, 48 kHz, 5,525 giây, khoảng 75,6 kbps | `d82eda58...248b` | PhoWhisper local smoke PASS, transcript 53 ký tự; chưa có ground truth để đo WER |

Không có tệp `.mp4` trong `demo/data`; media âm thanh thực tế là `.m4a`. Nhãn kỳ vọng không chứa PII được lưu tại `media-fixtures.json`. Root đã chạy service thật: OCR thành công với cả 2/2 ảnh và PhoWhisper local thành công với M4A, sinh transcript dài 53 ký tự. Đây chỉ là smoke test khả dụng, không phải kết quả accuracy vì chưa có bộ nhãn chuẩn để so sánh.

## 3. Hợp đồng dữ liệu CSV

### 3.1 Grain

Mỗi dòng biểu diễn một sự kiện dòng tiền cá nhân. CSV không có khóa định danh nguồn, nên importer dùng số thứ tự bản ghi logic làm provenance nhưng không coi đó là business key. Không thể kết luận hai giao dịch cùng ngày, cùng mô tả và cùng số tiền luôn là một giao dịch. Do đó pipeline mặc định giữ cả các dòng giống hoàn toàn trên tám cột; `--drop-exact-duplicates` là lựa chọn opt-in sau review thủ công.

### 3.2 Schema và cách chuyển đổi

| Cột nguồn | Ý nghĩa | Quy tắc validation/chuyển đổi | Cột đích |
|---|---|---|---|
| `Title` | Mô tả | Bắt buộc; Unicode NFC; gom whitespace; tối đa 200 ký tự | `transactions.description`, bản gốc ở `original_text` |
| `Budget` | Số tiền có dấu | Bắt buộc, khác 0; âm cho chi, dương cho thu; lấy trị tuyệt đối | `amount` |
| `Cost` | Chuỗi tiền VND dư thừa | Bắt buộc và phải bằng `abs(Budget)` | Chỉ dùng đối soát |
| `Date` | Ngày `DD/MM/YYYY` | Parse nghiêm ngặt và đổi sang `YYYY-MM-DD` | `transaction_date` |
| `Ex/In` | Hướng dòng tiền | `Expenses` → `expense`; `In-come` → `income` | `type` |
| `Special` | Nhãn quy mô/tần suất/vay | Không dùng thay đổi nghiệp vụ; lưu provenance | `ai_parsed.import.special` |
| `Type Expenses` | Taxonomy chi cũ | Ánh xạ theo JSON versioned | `category_id` qua tên+type |
| `Type In come` | Taxonomy thu cũ | Ánh xạ theo JSON versioned | `category_id` qua tên+type |

Các giả định rõ ràng:

- currency là VND vì toàn bộ `Cost` dùng ký hiệu đồng và schema ví mặc định là VND;
- source là `manual`, không gán giả là AI/OCR;
- mọi dòng được đưa vào ví được chỉ định, mặc định `Tiền mặt`;
- taxonomy nguồn và `Special` luôn được giữ trong `ai_parsed.import` để không mất dấu vết sau khi gộp danh mục.

## 4. Hồ sơ chất lượng `dataFinance.csv`

### 4.1 Quy mô, completeness và tính hợp lệ

| Chỉ số | Kết quả |
|---|---:|
| Bản ghi logic | 5.328 |
| Thu / chi trong nguồn | 424 / 4.904 |
| Thiếu `Title`, `Budget`, `Cost`, `Date`, `Ex/In` | 0 |
| Ngày không hợp lệ | 0 |
| `Budget` bằng 0 hoặc không parse được | 0 |
| Dấu `Budget` mâu thuẫn `Ex/In` | 0 |
| `Cost != abs(Budget)` | 0 |
| Giao dịch chi thiếu nhãn nguồn | 1 |
| Dòng giống hoàn toàn | 24 dòng trong 23 nhóm được gắn cờ, mặc định không loại |
| Mô tả được chuẩn hóa Unicode/whitespace trong kế hoạch mặc định | 378 |

Các ô trống lớn ở hai cột category là có chủ ý: dòng thu để trống `Type Expenses`, dòng chi để trống `Type In come`. `Special` trống 5.038/5.328 dòng và chỉ nên xem là metadata tùy chọn.

### 4.2 Thời gian

- Min–max: `2022-01-01` đến `2026-08-10`.
- Theo năm: 2022 = 540; 2023 = 1.568; 2024 = 1.521; 2025 = 1.049; 2026 đến 10/08 = 650.
- Có một bản ghi tháng 01/2022, sau đó thiếu toàn bộ 02–08/2022; chuỗi liên tục bắt đầu từ 09/2022.
- Tháng 08/2026 là tháng chưa hoàn tất nên không được so sánh trực tiếp với tháng đầy đủ.
- Nguồn chỉ có ngày, không có giờ hoặc timezone; không dùng được cho phân tích theo giờ trong ngày.

Khoảng trống đầu chuỗi và tháng biên phải được giữ trong thuật toán time-series dưới dạng tháng không quan sát, không được nén khoảng cách thời gian.

### 4.3 Phân bố số tiền

| Min | Q1 | Median | Q3 | Max | Ngưỡng trên IQR | Số điểm vượt ngưỡng |
|---:|---:|---:|---:|---:|---:|---:|
| 1.000 | 14.000 | 25.000 | 45.000 | 48.000.000 | 91.500 | 615 |

Ngưỡng IQR gắn cờ khá nhiều vì phân bố chi tiêu cá nhân lệch phải. Các điểm lớn nhất gồm vốn vay và học phí, không có bằng chứng đủ mạnh để coi là lỗi. Pipeline giữ nguyên toàn bộ và để thuật toán anomaly/insight xử lý riêng.

### 4.4 Kết quả sau chuẩn hóa dự kiến

| Chỉ số | Kết quả dry-run |
|---|---:|
| Dòng import | 5.328 |
| Thu / chi | 424 / 4.904 |
| Tổng thu | 373.432.659 VND |
| Tổng chi | 373.062.659 VND |
| Dòng tiền ròng | 370.000 VND |
| Dòng bị reject | 0 |

## 5. Ánh xạ taxonomy

Mapping đầy đủ, có version và checksum nguồn nằm trong `dataFinance.category-map.json`. Tổng số dòng của kế hoạch mặc định theo category đích:

| Loại | Category đích | Nhãn nguồn | Số dòng |
|---|---|---|---:|
| Chi | Ăn uống | `AC`, `AV`, `Coffee` | 2.276 |
| Chi | Di chuyển | `DC` | 497 |
| Chi | Giải trí | `Bida`, `Entertainment`, `G`, `NET`, `RL` | 677 |
| Chi | Thể thao | `Badmintion`, `Gym`, `Sport`, `Swimming` | 397 |
| Chi | Giáo dục | `English`, `Study` | 343 |
| Chi | Hóa đơn & Dịch vụ | `Utility` | 358 |
| Chi | Nhà cửa | `Home` | 152 |
| Chi | Sức khỏe | `Body`, `Mental` | 80 |
| Chi | Mua sắm | `CL` | 39 |
| Chi | Khác | trống, `Accident`, `Cho vay`, `Family`, `Ngu`, `Smoking` | 85 |
| Thu | Lương | `Salary` | 67 |
| Thu | Đầu tư | `Invest` | 3 |
| Thu | Khác | `Anh em`, `Cho vay`, `Clan`, `Family`, `Luck`, `Sell old things` | 354 |

Đây là phép ánh xạ mất mát. Đặc biệt `Cho vay`, hỗ trợ gia đình, bán đồ cũ và tiền may mắn đều bị gộp vào `Khác` vì schema hiện tại không có category tương ứng. Khi đánh giá thuật toán phân loại, không được coi mapping này là ground truth hoàn hảo; nó chỉ là nhãn quy ước để chạy demo.

## 6. Đối chiếu schema hiện tại

Pipeline phù hợp các ràng buộc trong migrations/models:

- `transactions.amount` yêu cầu số dương, nên importer dùng `abs(Budget)` và biểu diễn hướng bằng enum `type`;
- `description` tối đa 200 ký tự; toàn bộ dữ liệu sau normalize đều đạt;
- `transaction_date` là PostgreSQL `DATE`, phù hợp độ phân giải của nguồn;
- `category_id` và `wallet_id` là `NOT NULL`; importer resolve theo `(type, name)` và khóa ví thuộc đúng `user_id` trước khi ghi;
- `source` nhận `manual`; provenance cấu trúc được lưu trong `ai_parsed` JSONB;
- `user_id` phải tồn tại trong `users` sau migration 006/008;
- FK từ feedback/payment đến transaction dùng `ON DELETE SET NULL`, nên lịch sử liên quan không bị xóa theo. Tuy vậy ID giao dịch cũ sẽ không còn liên kết sau replace và phải được chấp nhận trước khi chạy.

Nguồn không có thông tin ví. Việc dồn 5.328 dòng vào `Tiền mặt` là quyết định demo, không phải kết luận rằng mọi giao dịch thực tế dùng tiền mặt.

## 7. Pipeline import an toàn và tái lập

Mã nguồn:

- parser/planner/transaction runner: `../backend/scripts/lib/financeCsvImport.js`;
- CLI: `../backend/scripts/import-finance-csv.js`;
- mapping: `dataFinance.category-map.json`;
- regression tests: `../backend/tests/finance-csv-import.test.js`.

### 7.1 Dry-run bắt buộc trước khi apply

```bash
cd demo/backend
npm run data:profile
```

Dry-run mặc định:

- không load module database;
- không kết nối PostgreSQL/Redis;
- kiểm tra checksum, schema cột, CSV quoting, ngày, tiền, dấu thu/chi, mapping và các dòng exact-match;
- in tổng thu/chi/net, thời gian, category crosswalk, warning và error.

Nếu hội đồng hoặc người review quyết định loại các exact-match sau khi kiểm tra thủ công, dùng `npm run data:profile -- --drop-exact-duplicates` trước; không đổi chính sách mặc định để tránh xóa nhầm hai lần chi thật.

Nếu checksum khác, pipeline dừng để tránh dùng mapping cũ cho nguồn đã thay đổi.

### 7.2 Lệnh apply dành cho người review

```bash
cd demo/backend
npm run data:import -- --confirm-user default_user
```

CLI chỉ cho ghi khi đồng thời có `--apply`, `--replace` và `--confirm-user` đúng user đích. Lệnh trên đã được chạy thành công sau dry-run, backup và hai lần thử tái lập trên database clone.

### 7.3 Tính nguyên tử và đối soát

Khi apply, pipeline:

1. mở một DB transaction và lấy advisory lock theo user;
2. đặt `lock_timeout` ngắn, khóa bảng transaction chống ghi đồng thời và xác nhận user/category;
3. khóa toàn bộ ví của user bằng `FOR UPDATE`, rồi chọn duy nhất ví đích theo tên;
4. tính contribution của các transaction cũ theo từng ví;
5. trừ contribution cũ khỏi balance, giữ nguyên initial balance/chuyển khoản/P&L và các adjustment khác;
6. xóa transaction của đúng user;
7. chèn theo batch, mọi dòng có provenance;
8. cộng net mới vào ví đích;
9. đối soát số dòng, tổng thu, tổng chi và net ngay trong transaction;
10. chỉ `COMMIT` khi mọi số khớp; mọi lỗi đều `ROLLBACK`;
11. sau commit mới xóa cache ví và insight.

Chạy lại cùng nguồn ở chế độ replace là tái lập: contribution của lần import trước được trừ trước khi cộng lại cùng net. Pipeline không xóa budget, chat, recurring bill, goal hoặc media.

Table lock có thể tạm chặn luồng ghi giao dịch khác, nên apply phải chạy trong cửa sổ bảo trì ngắn. Nếu không lấy được lock trong 5 giây, lệnh thất bại và rollback thay vì chờ vô hạn.

### 7.4 Kết quả áp dụng trên demo

Output apply xác nhận đã xóa 5.304 giao dịch cũ và commit 5.328 giao dịch mới sau dry-run. Backup PostgreSQL custom-format và kiểm tra danh mục restore không nằm trong output cung cấp, nên cần bổ sung nếu muốn hoàn tất hồ sơ vận hành.

Khi áp dụng lên database demo thật, bản ghi cashflow thử nghiệm `Test nạp đầu tư` được đảo tác động số dư và xóa trước vì không thuộc dữ liệu cá nhân nguồn. Kết quả live sau commit:

| Chỉ số đối soát live | Kết quả |
|---|---:|
| Giao dịch active | 5.328 (theo đối soát importer) |
| Thu / chi | 424 / 4.904 (theo kế hoạch đã đối soát) |
| Min–max | 01/01/2022 – 10/08/2026 |
| Tổng thu | 373.432.659 VND |
| Tổng chi | 373.062.659 VND |
| Net và số dư ví `Tiền mặt` | 370.000 VND net kế hoạch; số dư xác nhận sau import |
| Dòng có provenance `dataFinance.csv` | 5.328 / 5.328 (theo kế hoạch importer) |
| Source row provenance phân biệt | 5.328 / 5.328 (theo kế hoạch importer) |
| Dòng bị reject | 0 |

Importer báo đã giữ nguyên 4 recurring bill; cần rà soát các recurring bill này với lịch sử mới. Regression backend offline đã pass trước import; smoke test API/chat/database live sau import chưa được ghi nhận.

## 8. Chất lượng và an toàn media

### 8.1 Ảnh chuyển khoản

Ảnh đủ rõ để kiểm tra OCR amount/date và đã có nhãn không chứa PII trong `media-fixtures.json`. Lần chạy service thật đã PASS smoke test. Tuy nhiên ảnh hiển thị tên và thông tin tài khoản ngân hàng. Chỉ dùng nội bộ; cần tạo ảnh tổng hợp hoặc che hoàn toàn định danh trước khi công khai.

### 8.2 Ảnh hóa đơn

Ảnh có độ phân giải cao, chữ và tổng tiền rõ; lần chạy OCR service thật đã PASS smoke test. Rủi ro cao hơn vì nội dung hiển thị thông tin liên hệ/bí mật và JPEG còn EXIF thiết bị cùng tag GPS. Cần xóa EXIF và redact nội dung nhạy cảm; không chỉ đổi tên tệp.

### 8.3 Audio

Audio hợp lệ về container/codec. PhoWhisper local đã PASS smoke test và trả transcript dài 53 ký tự. Tuy nhiên chưa có transcript ground truth để biết 53 ký tự đó đúng đến đâu, nên chưa thể tính WER hoặc độ chính xác trích xuất giao dịch. Cần bổ sung một sidecar transcript đã ẩn danh và expected JSON trước khi dùng trong đánh giá niên luận.

## 9. Hành động đề xuất

1. Lưu backup khỏi thư mục tạm nếu cần giữ lâu dài; pipeline nguyên tử không thay thế chính sách backup vận hành.
2. Thay hai ảnh bằng bản synthetic/redacted, xóa EXIF và cập nhật checksum/fixture.
3. Ghi transcript chuẩn cho audio; thêm ít nhất 20–30 fixture đa dạng nếu muốn báo cáo độ chính xác OCR/STT có ý nghĩa.
4. Với mục tiêu nghiên cứu dữ liệu, cân nhắc thêm taxonomy `Vay/Cho vay`, `Gia đình`, `Bán tài sản` thay vì tiếp tục gộp vào `Khác`.
5. Khi thay CSV trong tương lai, bắt buộc cập nhật checksum/mapping, chạy dry-run và đối soát lại toàn bộ tổng.

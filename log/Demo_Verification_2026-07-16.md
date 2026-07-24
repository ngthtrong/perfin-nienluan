# Evidence log — Demo PerFin — 16/07/2026

Tài liệu này là nguồn kiểm chứng kỹ thuật cho báo cáo HTML cùng ngày. Nội dung chỉ ghi lại lệnh, kết quả quan sát được và giới hạn diễn giải; không chứa secret hoặc dữ liệu giao dịch cấp dòng.

## Môi trường

- Workspace commit nền tại thời điểm kiểm tra: `8bebe83` (các thay đổi của phiên làm việc chưa commit).
- Node.js: `v24.16.0`.
- PostgreSQL client/server family: `16.14`.
- Chromium: `150.0.7871.46`.
- Docker, Redis CLI và Redis server không khả dụng trong WSL hiện tại.

## Ma trận kiểm chứng đã chạy

| Cổng kiểm chứng | Lệnh/phương pháp | Kết quả quan sát | Diễn giải hợp lệ |
|---|---|---|---|
| Backend regression | `cd demo/backend && npm test` | 100/100 test pass, 0 fail | Khóa các hành vi service/model/router đã có test |
| Local parser quality gate | `cd demo/backend && npm run test:ai` | 31/31 strict pass | Baseline xác định cục bộ; không phải benchmark Gemini |
| API + DB + chat + media | `cd demo/backend && npm run smoke:full` | 23/23 kiểm tra pass | PostgreSQL thật, REST API, preview/edit/cancel, OCR 2 ảnh và STT 1 M4A hoạt động |
| Mobile-web UI | `cd demo/frontend && npm run ui:smoke -- --output-dir /home/ngthtrong/perfin-ui-smoke-start-app` | Dashboard, Report và Chat không tràn ngang ở 390×844; ảnh 1184×2560 hiển thị trong bubble; không có browser runtime exception | Xác nhận các luồng UI trọng yếu ở một viewport mobile Chromium |
| Expo web export | `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 npx expo export --platform web --output-dir /tmp/perfin-expo-web-final` | Pass, 653 module | Xác nhận bundle web tạo được |
| Expo Android export | `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 npx expo export --platform android --output-dir /tmp/perfin-expo-android-final` | Pass, 960 module | Xác nhận bundle Android tạo được; chưa thay kiểm thử thiết bị vật lý |
| Expo dependency check | `cd demo/frontend && npx expo install --check` | Pass, dependencies tương thích SDK hiện tại | Không đồng nghĩa không có cảnh báo bảo mật transitive |
| Startup orchestration | `cd demo && ./start-app.sh web --skip-ai-setup --no-docker --no-clear` rồi chạy UI smoke | Backend và Expo khởi động; UI smoke pass; Ctrl+C dừng sạch | Worker chủ động tắt vì Redis không có; API vẫn dùng fallback bộ nhớ |
| Shell/diff hygiene | `bash -n demo/start-app.sh`; `git diff --check` | Pass tại các lần kiểm tra | Không phát hiện lỗi cú pháp shell hoặc whitespace diff |

## Đối soát dữ liệu live

Importer đã được chạy hai lần trên database clone để kiểm tra tính tái lập, sau đó mới chạy trên PostgreSQL demo thật. Kết quả live:

- 5.265 giao dịch active, gồm 420 khoản thu và 4.845 khoản chi.
- Khoảng ngày: 01/01/2022–15/07/2026.
- Tổng thu: 393.770.659 VND.
- Tổng chi: 393.176.659 VND.
- Dòng tiền ròng và số dư ví `Tiền mặt`: 594.000 VND.
- 5.265/5.265 dòng có provenance `dataFinance.csv`; 5.265 source-row phân biệt.
- Theo năm: 2022 = 540; 2023 = 1.567; 2024 = 1.525; 2025 = 1.050; 2026 đến 15/07 = 583.
- Bản backup custom-format trước import: `/tmp/perfin-demodb-before-dataFinance-20260716.dump`; SHA-256 `5523105cfbddaf79035d6c2ec72e6e21ce945d3414d7e6c317ee2dbb45aea5ba`; danh mục restore đã được kiểm tra bằng `pg_restore --list`.

## Media và provider

- PaddleOCR local xử lý thành công 2/2 ảnh fixture.
- PhoWhisper local xử lý thành công `recording.m4a`, trả transcript 53 ký tự.
- Gemini xử lý đầu ra cấu trúc trong luồng smoke thật.
- Lần smoke cuối ghi nhận thời gian xấp xỉ: ảnh chuyển khoản 12,4 giây; ảnh hóa đơn 40,2 giây; audio 23,7 giây. Đây là latency quan sát đơn lẻ, không phải p50/p95.
- Không có ground truth đầy đủ cho OCR/STT, vì vậy không công bố accuracy, CER hoặc WER.

## Rủi ro và giới hạn còn lại

- Readiness trả trạng thái `degraded` khi Redis không khả dụng; API và dữ liệu cốt lõi vẫn sẵn sàng, còn scheduled/proactive jobs bị tắt.
- `npm audit --omit=dev --json` ghi nhận 12 cảnh báo mức moderate, 0 high và 0 critical trong dependency transitive. Bản sửa tự động yêu cầu nâng Expo lên major 57 nên không áp dụng cưỡng bức trong phiên ổn định hóa này.
- UI smoke kiểm tra Chromium ở viewport 390×844, không chứng nhận Safari, Firefox, thiết bị vật lý, accessibility toàn diện hoặc pixel parity.
- 24 dòng CSV giống hoàn toàn được giữ vì nguồn không có transaction ID hoặc timestamp để chứng minh chúng là bản sao.
- 621 giá trị vượt ngưỡng IQR chỉ là cờ phân bố, không phải bằng chứng dữ liệu sai.
- Taxonomy import là ánh xạ mất mát; đặc biệt các khoản vay/cho vay và một số nguồn thu bị gộp vào `Khác`.
- Hai ảnh fixture có PII; ảnh hóa đơn còn EXIF/GPS. Chỉ dùng nội bộ cho smoke test.

## Ghi chú trình bày và chart map

Báo cáo dùng bảng cho các bằng chứng pass/fail, số test, số module và số dòng dữ liệu vì chúng có đơn vị không đồng nhất; vẽ chung sẽ tạo so sánh sai ngữ nghĩa. Một biểu đồ cột rời rạc được dùng riêng để cho thấy độ phủ số giao dịch theo năm:

- section: dataset gần bốn năm;
- analytical question: mỗi năm lịch trong nguồn đóng góp bao nhiêu giao dịch;
- takeaway: dữ liệu phủ 2022–2026, tập trung nhiều nhất ở 2023–2024; 2026 chỉ đến 15/07 nên không được xem là giảm cả năm;
- family/type: comparison, `bar`, không dùng `line` vì chỉ có năm mốc và năm cuối chưa đầy đủ;
- fields: `year` → trục x, `record_count` → trục y; giữ `period_status` và `share_total` trong tooltip/source rows;
- palette: single-root blue, không legend và không color encoding dư thừa;
- source: `demo/data/DATA_QUALITY_REPORT.md`;
- final surface: `resource/report/Demo_Verification_2026-07-16.html`; portable verifier đạt validation/package/structural checks. Chromium Snap không tương thích probe của builder nên enhanced-reader desktop/narrow và source-dialog interaction chưa được chứng nhận; semantic fallback vẫn được đóng gói.

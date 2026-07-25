# Nhật ký thay đổi demo PERFIN — 18/07/2026

## 1. Mục đích và phạm vi

Tài liệu này ghi nhận các thay đổi của phiên chỉnh sửa demo ngày 18/07/2026 để phục vụ lần cập nhật báo cáo sau. Hai tài liệu được dùng làm ngữ cảnh là `Report_v1.md` và `evidence/Demo_Verification_2026-07-16.md`.

Phiên này **không cập nhật nội dung `Report_v1.md`**, không thay thế evidence log ngày 16/07/2026 và không được diễn giải là một đợt kiểm chứng production.

## 2. Các quyết định nghiệp vụ đã chốt

| Nội dung | Quyết định áp dụng trong demo |
|---|---|
| Ngày của sự kiện tài chính đã phát sinh | Không được lớn hơn ngày hiện tại |
| Ngày phục vụ lập kế hoạch | Vẫn được phép nằm trong tương lai, gồm ngày đích mục tiêu, kỳ ngân sách và ngày đến hạn |
| Số dư ví | Được phép âm, kể cả sau ghi chi, thanh toán định kỳ hoặc điều chuyển |
| Dữ liệu học từ thao tác sửa preview | Chỉ lưu sửa danh mục; sửa ngày không tạo feedback học |
| Hướng màu giao diện | Thay indigo bằng tông ấm; giữ màu semantic tiết chế cho thu, chi và cảnh báo |
| Trang cần thêm bộ lọc | Ngân sách, chi phí định kỳ và mục tiêu |

## 3. Thay đổi đã thực hiện

### 3.1. Lời khuyên tổng thể trong báo cáo

- Bổ sung bộ sinh lời khuyên xác định tại `demo/backend/services/analytics/overallAdvice.js`.
- Lời khuyên chỉ sử dụng facts đã được Analytics Engine tính, ưu tiên tối đa hai hành động ngắn gọn từ runway, xu hướng 6 tháng, khoản định kỳ 90 ngày, bất thường 30 ngày, nhịp chi theo thứ và tương quan 12 tuần.
- `GET /api/reports/insights` bổ sung các trường:
  - `overall_advice`;
  - `advice_basis`;
  - `advice_scope: "multi_period_history"`.
- `ReportScreen` hiển thị thẻ **Lời khuyên tổng thể** tách khỏi phần diễn giải persona và ghi rõ đây là kết quả dựa trên insight nhiều kỳ, không chỉ tháng đang xem.

### 3.2. Ràng buộc ngày và số dư ví

- Chuẩn hóa so sánh ngày theo ngày lịch local, tránh dùng UTC ISO làm lệch ngày tại múi giờ Việt Nam.
- Chặn ngày tương lai ở cả đường API trực tiếp và bước xác nhận pending đối với:
  - giao dịch thu/chi: `transaction_date`;
  - điều chuyển ví: `transaction_date`;
  - ghi nhận lãi/lỗ đầu tư: `recorded_at`;
  - thanh toán chi phí định kỳ: `paid_date`.
- Preview có ngày tương lai bị từ chối trước khi bị claim, vì vậy người dùng vẫn có thể sửa ngày rồi xác nhận lại.
- Giữ khả năng lập kế hoạch cho tương lai đối với mục tiêu, ngân sách và lịch đến hạn.
- Bỏ nhánh chặn thiếu số dư khi điều chuyển; các luồng ghi chi và điều chuyển đều có thể đưa ví xuống số âm theo quyết định đã chốt.
- Các ràng buộc miền hiện có vẫn giữ nguyên, ví dụ số tiền giao dịch/ngân sách dương, danh mục khớp loại giao dịch, ví thuộc người dùng, hai ví điều chuyển phải khác nhau và ngày trong lịch phải hợp lệ.

### 3.3. Bộ lọc cho các trang nhiều dữ liệu

- **Ngân sách:** chuyển tháng, tìm theo danh mục, lọc trạng thái, sắp xếp theo tỷ lệ sử dụng/đã chi/hạn mức/tên và hiển thị số kết quả.
- **Chi phí định kỳ:** tìm theo tên, lọc trạng thái hoạt động/tạm dừng, lọc tần suất và đặt lại bộ lọc.
- **Mục tiêu:** tìm theo tên, lọc nhóm trạng thái tiến độ, lọc loại mục tiêu và đặt lại bộ lọc.
- Cả ba trang có empty state riêng khi dữ liệu tồn tại nhưng không khớp bộ lọc.

### 3.4. Chỉnh sửa giao dịch chờ xác nhận và feedback học

- Preview một giao dịch và nhiều giao dịch cho phép sửa:
  - mô tả;
  - số tiền;
  - ngày giao dịch;
  - danh mục;
  - loại giao dịch ở preview nhiều giao dịch, kèm tự chọn lại danh mục phù hợp.
- Backend kiểm tra danh mục tồn tại, thuộc tập danh mục người dùng và khớp loại giao dịch trước khi cập nhật pending.
- Metadata pending giữ danh mục AI ban đầu và danh mục người dùng sửa theo từng giao dịch.
- Feedback phân loại chỉ được ghi sau khi giao dịch commit thành công và có `transaction_id` bền vững.
- Hủy preview, commit lỗi, sửa riêng ngày hoặc đổi danh mục trở lại kết quả AI ban đầu không tạo dữ liệu học.
- Sửa mô tả/số tiền vẫn tuân theo feedback extraction hiện có; ngày không thuộc tập trường extraction được học.

### 3.5. Gửi ảnh và mô tả trong cùng một lần gửi

- Ảnh sau khi chụp/chọn được đưa vào composer dưới dạng attachment draft, chưa upload ngay.
- Người dùng có thể nhập tối đa 1.000 ký tự mô tả bổ sung, xem thumbnail, bỏ ảnh hoặc gửi ảnh và mô tả bằng **một nút gửi**.
- Frontend gửi `context` cùng file ảnh trong cùng request multipart hoặc JSON base64, không tạo hai request/tin nhắn người dùng độc lập.
- Backend nhận các alias context tương thích, kiểm tra kiểu và độ dài, rồi kết hợp context với OCR trong cả prompt AI và local fallback.
- Raw OCR vẫn được giữ riêng trong response; provenance dùng cho feedback chứa cả context và OCR.
- Bước chọn lưu tổng hóa đơn hoặc từng mặt hàng tiếp tục mang context sang request xác nhận.

### 3.6. Ô nhập tiền và ngày

- Thêm `MoneyInput` dùng chung, tự định dạng dấu phẩy hàng nghìn khi nhập, ví dụ `100,000` và `1,000,000`, sau đó bỏ định dạng trước khi gửi API.
- Hỗ trợ số âm tại các trường có nghiệp vụ cho phép, gồm số dư ví ban đầu và lãi/lỗ đầu tư.
- Áp dụng cho form giao dịch, preview chat, ngân sách, chi phí định kỳ, mục tiêu, ví, điều chuyển và lãi/lỗ.
- Thêm `DatePickerField` dùng chung:
  - Android/iOS dùng `@react-native-community/datetimepicker`;
  - web dùng native DOM `<input type="date">` với `min`/`max` thực sự được trình duyệt áp dụng.
- Các ngày giao dịch và khoảng lọc giao dịch có giới hạn tối đa là hôm nay; ngày đích mục tiêu cho phép chọn tương lai.
- Trường `due_day` của chi phí định kỳ vẫn là tham số chu kỳ `1–7` hoặc `1–31`, không phải một ngày lịch đầy đủ.

### 3.7. Theme tông ấm và UI chat tối giản

- Thay bộ màu indigo/cool bằng tông terracotta và warm neutral cho light/dark theme.
- Bong bóng người dùng dùng màu thương hiệu ấm; bong bóng AI, thông báo hệ thống, trạng thái phân tích ảnh và các bề mặt thường dùng màu trung tính.
- Giữ xanh/đỏ/vàng ở mức semantic cho thu nhập, chi tiêu, lỗi và cảnh báo.
- Đồng bộ lại chart palette, shadow và badge ảnh để không còn màu indigo cũ trong frontend.
- Độ tương phản chữ trắng trên màu brand đã được kiểm tra nhanh: khoảng `5.65:1` ở light theme và `4.57:1` ở dark theme.

## 4. File và nhóm mã chính bị ảnh hưởng

- Backend: `routes/report.routes.js`, `routes/ai.routes.js`, `routes/chat.routes.js`, `models/cashflow.model.js`, `models/recurringBill.model.js`, `services/ai.service.js`, `services/pendingTransaction.service.js`, `services/transactions/validation.js`, `services/analytics/overallAdvice.js`.
- Frontend: `ChatScreen`, `ReportScreen`, `BudgetScreen`, `RecurringScreen`, `GoalsScreen`, `TransactionScreen`, `CashflowScreen`, các preview card, `api.service.js`, `theme/tokens.js`.
- UI dùng chung mới: `MoneyInput.js`, `DatePickerField.js`, `DatePickerField.web.js`.
- Cấu hình: thêm dependency và Expo plugin `@react-native-community/datetimepicker` phiên bản `9.1.0`.

## 5. Kiểm tra trọng điểm đã chạy

| Kiểm tra | Kết quả |
|---|---|
| 10 tệp test backend liên quan validation, atomicity, pending edit, feedback, media và overall advice | 10/10 tệp đạt, 0 lỗi |
| Expo export web | Thành công, 668 modules |
| Expo export Android | Thành công, 984 modules |
| `git diff --check` cho thay đổi trong phạm vi | Sạch |
| Rà soát chéo API frontend/backend | Không còn finding mức cao hoặc trung bình |

Các kiểm tra trên chỉ nhằm bắt lỗi tích hợp trực tiếp của phiên demo. Phiên này **không chạy lại** full smoke với PostgreSQL/provider OCR/STT thật, toàn bộ test suite, benchmark, UAT hoặc kiểm thử tải.

## 6. Điểm cần lưu ý khi cập nhật báo cáo sau này

- Báo cáo hiện có mô tả trường hợp điều chuyển bị từ chối khi số dư nguồn không đủ; quyết định demo mới cho phép ví âm nên phần đặc tả/ràng buộc này cần được đối soát lại khi cập nhật báo cáo.
- Luồng đa phương thức cần bổ sung nhánh `ảnh + context trong cùng request` và attachment draft ở UI.
- Luồng feedback cần phản ánh rằng sửa danh mục ngay trong pending preview cũng tạo feedback, nhưng chỉ sau commit; sửa ngày không tạo dữ liệu học.
- Mô tả Report/Insight cần tách `ai_comment` khỏi lời khuyên tổng thể có scope nhiều kỳ.
- Số module export trong tài liệu này chỉ là kết quả đóng gói của phiên demo, không nên thay số liệu kiểm chứng chính thức trong báo cáo nếu chưa chạy lại quy trình evidence đầy đủ.
- So sánh “hôm nay” hiện dựa trên timezone của tiến trình backend. Môi trường phiên này là `Asia/Bangkok` (cùng UTC+7 với Việt Nam); khi triển khai ở môi trường khác cần cấu hình business timezone rõ ràng.


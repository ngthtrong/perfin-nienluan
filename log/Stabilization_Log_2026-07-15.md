# BIÊN BẢN ỔN ĐỊNH HÓA CHỨC NĂNG LÕI PERFIN

**Mốc thực hiện:** sau audit ngày 15/07/2026  
**Phạm vi:** tính toàn vẹn dữ liệu, luồng xác nhận, recurring, parser cục bộ, analytics và khả năng đóng gói frontend  
**Không thuộc phạm vi:** biến nguyên mẫu single-user thành hệ thống production đầy đủ

## 1. Kết quả trước và sau

| Phép kiểm tra | Baseline audit | Sau ổn định hóa | Kết luận hợp lệ |
|---|---:|---:|---|
| Backend `npm test` | 13/13 tệp đạt | **18/18 tệp đạt**, 0 lỗi, khoảng 1,028 giây | Unit/service và mock transaction đạt; chưa thay live integration test |
| Local-parser quality gate | 27/31 strict; 2 partial; 2 fail | **31/31 strict**, 0 partial, 0 fail | Đạt trên 31 câu cố định; không phải benchmark Gemini |
| Expo web export | 652 module; ~1,49 MB | **Đạt**, 652 module; ~1,49 MB | Frontend biên dịch/đóng gói được; chưa phải E2E/native test |
| `git diff --check` | Không áp dụng | **Sạch** | Không có lỗi whitespace trong phần thay đổi |

Harness parser nay tự cố định provider `local`, không phụ thuộc PostgreSQL/LLM ngoài và trả exit code khác 0 nếu có bất kỳ ca nào không đạt strict.

## 2. Các sửa đổi đã thực hiện

### 2.1. Giao dịch và trạng thái chờ xác nhận

- Rollback trước khi trả `null` ở nhánh update/delete không tìm thấy bản ghi.
- Tách phần cache/hydration khỏi SQL transaction; lỗi sau `COMMIT` không còn kích hoạt rollback sai hoặc trả thất bại giả khiến client tạo giao dịch lặp.
- Thêm claim-and-delete nguyên tử cho pending state bằng Redis Lua và bộ nhớ fallback.
- Client gửi `pending_id`; confirm/cancel/edit cũ không thể xử lý hoặc ghi đè preview mới hơn.
- Thêm `SET NX` cho bước phục hồi sau edit để loại race giữa edit và preview mới.

### 2.2. Recurring payment

- Chuẩn hóa ngày lịch local, loại lỗi lệch ngày do chuyển local midnight sang UTC.
- Kiểm tra miền `due_day`: tuần 1–7, các chu kỳ tháng/quý/năm 1–31.
- Gộp insert transaction, cập nhật ví, insert payment và advance kỳ vào một SQL transaction với `FOR UPDATE`.
- Bắt buộc `period_due_date` làm optimistic-concurrency token; request lặp không thể thanh toán nhầm kỳ kế tiếp.
- Luồng chat recurring chuyển từ ghi ngay sang preview → confirm; frontend recurring gửi đúng kỳ đang hiển thị.
- Lỗi cache/hydration sau commit không biến khoản thanh toán bền vững thành phản hồi thất bại.

### 2.3. Parser và ranh giới AI

- Nhận đúng cách nói `1 triệu 5` và phép nhân `3 cái áo mỗi cái 200k`.
- Bổ sung alias có kiểm soát cho `quần`, `jeans`, `đi ăn`.
- Ngày tương đối dùng lịch local thay vì `toISOString()`.
- Provider thực thi bám theo lựa chọn hiện tại; nhánh media rỗng dùng đúng local parser đã import.
- Lịch sử chat không còn bị đảo lần thứ hai ở frontend.

### 2.4. Analytics và export

- Runway lấy trung bình trên đủ ngày lịch, kể cả ngày chi 0 đồng.
- Chuỗi ngày và tháng được zero-fill; OLS không còn nén mất tháng trống và monthly cashflow không chia theo số tháng có giao dịch.
- Cửa sổ SQL dùng đúng N ngày/N tháng và loại giao dịch tương lai ngoài kỳ.
- Mẫu số tỷ lệ danh mục của export dùng cùng bộ lọc ngày với tử số.
- Escape dữ liệu động trước khi chèn vào HTML report.

## 3. Kiểm thử hồi quy mới

- transaction rollback và lỗi post-commit;
- pending confirm đồng thời, stale ID và edit/preview race;
- recurring schedule, ngày local, stale period, rollback và cache failure;
- parser amount/category/date;
- time-series zero-fill, runway và OLS;
- export denominator và HTML escaping;
- AI provider/media fallback.

## 4. Phần chưa được tuyên bố là ổn định production

Các kết quả trên không xác nhận PostgreSQL/Redis/provider thật theo kiểu end-to-end. Những khoảng trống còn lại gồm authentication/authorization và ownership theo user; readiness; PDF nhị phân đúng nghĩa; backup/restore đầy đủ; tạo ví và một số UI quản trị; push notification; benchmark LLM/OCR/STT; numeric-grounding benchmark; hiệu năng và UAT. Hệ thống vì vậy phù hợp để trình diễn niên luận single-user tập trung dữ liệu/giải thuật, chưa phù hợp mở công khai.

## 5. Lệnh tái lập

```bash
cd demo/backend
npm test
npm run test:ai

cd ../frontend
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 \
  npx expo export --platform web --output-dir /tmp/perfin-web-final
```

Không chạy migration hoặc seed trên cơ sở dữ liệu cá nhân chỉ để tái lập các phép kiểm tra trên. Một đợt integration test riêng phải dùng PostgreSQL/Redis test cô lập và fixture có thể dọn sạch.

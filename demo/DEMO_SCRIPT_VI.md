# Kịch bản báo cáo và demo chi tiết hệ thống PERFIN

## 1. Thông tin chung

- **Tên đề tài:** PERFIN — Ứng dụng hỗ trợ quản lý và phân tích tài chính cá nhân.
- **Thời lượng đề xuất:** 12–15 phút trình bày chính, 5–10 phút phản biện.
- **Đối tượng:** Giảng viên hướng dẫn, hội đồng và người xem không cần có kiến thức chuyên sâu về AI.
- **Mục tiêu buổi demo:** Chứng minh PERFIN có thể biến đầu vào tự nhiên thành dữ liệu tài chính có cấu trúc, kiểm soát việc ghi dữ liệu bằng bước xác nhận, sau đó dùng dữ liệu đã xác nhận để quản lý ngân sách, phân tích và lập kế hoạch.

### Thông điệp trung tâm

> PERFIN không giao quyền quyết định tài chính cho AI. AI chỉ hỗ trợ trích xuất và diễn giải; backend kiểm tra quy tắc nghiệp vụ, người dùng xác nhận, rồi hệ thống mới cập nhật sổ cái.

### Ba giá trị cần làm nổi bật

1. **Nhập liệu thuận tiện:** hỗ trợ văn bản tự nhiên, ảnh hóa đơn và giọng nói.
2. **An toàn và có kiểm soát:** mọi thao tác thay đổi tiền từ chat hoặc media đều đi qua preview, sửa, xác nhận hoặc hủy.
3. **Phân tích có căn cứ:** các con số do thuật toán xác định tính từ dữ liệu; LLM chỉ diễn giải facts và có cơ chế fallback.

---

## 2. Phạm vi chức năng sẽ trình bày

### Nhóm bắt buộc trình bày trực tiếp

1. Dashboard tổng quan tài chính.
2. Nhập một hoặc nhiều giao dịch bằng ngôn ngữ tự nhiên.
3. Preview, chỉnh sửa, xác nhận và hủy giao dịch.
4. Phân biệt câu hỏi tra cứu với lệnh tạo giao dịch.
5. Theo dõi, dự báo và đề xuất ngân sách.
6. Báo cáo, runway và nhận diện khoản chi có dấu hiệu định kỳ.
7. Lập kế hoạch mục tiêu tài chính trước khi lưu.

### Nhóm trình bày nếu môi trường ổn định hoặc còn thời gian

1. OCR ảnh hóa đơn và lựa chọn ghi tổng hoặc từng mặt hàng.
2. Speech-to-Text và sửa transcript.
3. Quản lý khoản chi định kỳ và lịch sử thanh toán.
4. Chuyển tiền giữa các ví và theo dõi tài sản ròng.
5. Soft delete và khôi phục giao dịch.
6. Học từ việc người dùng sửa danh mục.
7. Xuất dữ liệu CSV.

### Nhóm không nên tuyên bố đã hoàn thiện ở mức production

- Authentication, authorization và multi-user thực tế.
- Độ chính xác OCR/STT trên tập dữ liệu đại diện.
- Redis worker đã được nghiệm thu end-to-end trong môi trường live.
- p95 latency, UAT và numeric grounding toàn diện.
- Xuất PDF thật; nhánh hiện tại mới sinh HTML.
- Quy đổi tiền tệ, đồng bộ nhiều thiết bị và triển khai production.

---

## 3. Chuẩn bị trước buổi báo cáo

### 3.1. Chuẩn bị dữ liệu

- Khóa một snapshot PostgreSQL dùng riêng cho demo.
- Không chạy seed ngẫu nhiên ngay trước giờ trình bày.
- Bảo đảm Dashboard có dữ liệu thu, chi và giao dịch gần đây.
- Bảo đảm ít nhất một danh mục ngân sách đang gần hoặc dự kiến vượt hạn mức.
- Bảo đảm màn hình Báo cáo có đủ dữ liệu để hiện runway hoặc khoản chi có dấu hiệu đăng ký.
- Chuẩn bị ít nhất hai ví VND nếu muốn trình bày chuyển ví.
- Chuẩn bị một khoản định kỳ đến hạn đúng ngày demo nếu muốn trình bày acknowledgment từ reminder.
- Không dùng trực tiếp ảnh trong `demo/data/img/` trước công chúng vì các ảnh hiện tại có PII hoặc metadata nhạy cảm.
- Tạo một ảnh hóa đơn synthetic, không có tên thật, số tài khoản, số điện thoại, mật khẩu Wi-Fi hoặc EXIF/GPS.

### 3.2. Chuẩn bị môi trường

1. Khởi động PostgreSQL.
2. Khởi động backend Express.
3. Nếu trình bày worker, khởi động Redis và worker riêng.
4. Khởi động Expo trước giờ demo và mở sẵn ứng dụng.
5. Warm-up PaddleOCR và PhoWhisper để tránh thời gian tải model ở lần gọi đầu tiên.
6. Kiểm tra URL backend từ thiết bị trình chiếu.
7. Khóa độ sáng màn hình và tắt thông báo cá nhân.
8. Chuẩn bị video hoặc ảnh chụp dự phòng cho OCR/STT.

### 3.3. Kiểm tra nhanh backend

Từ thư mục `demo/backend`:

```bash
npm test
```

Kết quả kiểm tra gần nhất trên worktree hiện tại: lệnh hoàn tất không lỗi và báo 46 subtest đạt.

Có thể kiểm tra thêm API khi backend đã chạy:

```bash
curl http://localhost:3000/
curl http://localhost:3000/api/test-db
```

### 3.4. Lựa chọn provider khi demo

- Dùng local parser cho các câu lệnh giao dịch cốt lõi để có kết quả ổn định.
- Chỉ dùng Gemini cho phần mở rộng hoặc narration nếu API, quota và mạng đã được kiểm tra.
- Nếu Gemini lỗi, giải thích rằng hệ thống có parser hoặc template fallback; không cần che giấu lỗi provider.

---

## 4. Kịch bản trình bày chính 12–15 phút

## Phần 1 — Giới thiệu bài toán và giải pháp

**Thời lượng:** 1 phút.

### Lời thoại đề xuất

> Trong quản lý tài chính cá nhân, khó khăn đầu tiên không phải là vẽ biểu đồ mà là duy trì dữ liệu đúng và đầy đủ. Biểu mẫu truyền thống yêu cầu nhiều thao tác nên người dùng dễ bỏ qua việc ghi chép hoặc phân loại không nhất quán.
>
> PERFIN giải quyết bài toán này bằng cách cho phép nhập giao dịch qua chat, ảnh hoặc giọng nói. Tuy nhiên, hệ thống không để AI tự ghi tiền. AI chỉ tạo bản nháp có cấu trúc; backend kiểm tra dữ liệu, người dùng xem lại và xác nhận, sau đó hệ thống mới cập nhật sổ cái. Dữ liệu đã xác nhận tiếp tục được dùng cho ngân sách, phân tích, khoản định kỳ và mục tiêu tài chính.

### Điểm cần nhấn mạnh

- Đây là nguyên mẫu tập trung vào mô hình dữ liệu, tính đúng của thuật toán và ranh giới an toàn với AI.
- Mobile app là lớp thu nhận đầu vào và trình bày kết quả.
- PostgreSQL là nguồn dữ liệu chuẩn; Redis chỉ dùng cho pending state, cache và queue có TTL.

---

## Phần 2 — Dashboard và bức tranh tài chính hiện tại

**Thời lượng:** 45–60 giây.

### Thao tác

1. Mở tab **Tổng quan**.
2. Chỉ vào số dư khả dụng.
3. Chỉ vào tổng thu, tổng chi và chênh lệch tháng hiện tại.
4. Cuộn tới danh sách giao dịch gần đây.
5. Chỉ vào nút **Nhập bằng Chat AI**.

### Lời thoại đề xuất

> Đây là Dashboard của PERFIN. Màn hình tổng hợp số dư khả dụng, thu nhập, chi tiêu và các giao dịch gần đây. Các con số này không do AI tự sinh mà được tổng hợp từ các giao dịch đã commit trong PostgreSQL.
>
> Điểm bắt đầu chính của trải nghiệm là Chat AI ở giữa thanh điều hướng. Người dùng có thể nhắn, nói hoặc chụp hóa đơn, nhưng mọi thao tác thay đổi tiền vẫn phải qua bước xem lại.

### Kết quả cần thấy

- Dashboard tải thành công.
- Có số dư, thu, chi và ít nhất một giao dịch gần đây.
- Không có lỗi kết nối API.

### Chuyển ý

> Tiếp theo, em sẽ ghi hai khoản chi bằng một câu tự nhiên để minh họa toàn bộ pipeline từ ngôn ngữ đến sổ cái.

---

## Phần 3 — Nhập nhiều giao dịch bằng chat và xác nhận có kiểm soát

**Thời lượng:** 2–2,5 phút.

### Câu lệnh demo

```text
ăn sáng 30k, grab 45k
```

### Thao tác

1. Mở tab **Chat**.
2. Nhập câu lệnh trên.
3. Chờ hệ thống trả preview nhiều giao dịch.
4. Chỉ vào số lượng giao dịch, mô tả, danh mục, ngày và tổng chi.
5. Bấm **Sửa** tại dòng `grab 45k`.
6. Đổi số tiền thành `50.000`.
7. Lưu chỉnh sửa.
8. Bấm **Xác nhận tất cả**.

### Kết quả mong đợi

- Hệ thống nhận diện hai giao dịch.
- `ăn sáng` được phân loại vào Ăn uống.
- `grab` được phân loại vào Di chuyển.
- Có thể chỉnh sửa từng dòng trước khi commit.
- Sau xác nhận, hệ thống thông báo đã lưu hai giao dịch.

### Lời thoại đề xuất

> Một câu có thể tạo một hoặc nhiều draft giao dịch. Hệ thống chuẩn hóa số tiền, xác định hướng thu hoặc chi, đối chiếu danh mục và ví, sau đó tạo preview.
>
> Ở giai đoạn này chưa có thay đổi nào trong sổ cái. Em có thể sửa một giao dịch riêng lẻ. Sau khi xác nhận tất cả, backend mới claim pending state và ghi các giao dịch bằng transaction cơ sở dữ liệu.
>
> Nếu một dòng không hợp lệ hoặc quá trình commit lỗi, toàn bộ thao tác phải rollback thay vì để lại dữ liệu ghi dở dang.

### Điểm kỹ thuật có thể nói thêm

- Pending preview có ID và TTL.
- Một pending ID chỉ được claim thành công một lần.
- Xác nhận đồng thời hoặc xác nhận lại không được tạo giao dịch trùng.
- Việc hủy preview không làm thay đổi số dư.

### Chuyển ý

> Không phải mọi câu trong chat đều là lệnh ghi tiền. PERFIN phải phân biệt rõ câu hỏi tra cứu và thao tác thay đổi dữ liệu.

---

## Phần 4 — Luồng đặc biệt: clarification và câu hỏi chen ngang

**Thời lượng:** 1–1,5 phút.

### Câu lệnh thứ nhất

```text
ăn phở
```

### Kết quả mong đợi

- Hệ thống nhận ra thiếu số tiền.
- Chat hỏi người dùng bổ sung thông tin thay vì tự đoán.

### Câu lệnh chen ngang

```text
tôi có những ví nào?
```

### Kết quả mong đợi

- Hệ thống nhận ra đây là một câu hỏi mới.
- Clarification cũ bị bỏ thay vì nuốt câu hỏi mới làm dữ liệu cho giao dịch `ăn phở`.
- Chat trả danh sách ví và số dư.
- Không có giao dịch mới được tạo.

### Lời thoại đề xuất

> Đây là một luồng biên quan trọng. Khi giao dịch thiếu số tiền, hệ thống lưu trạng thái làm rõ. Tuy nhiên, trạng thái này không được phép chiếm mọi tin nhắn trong năm phút tiếp theo.
>
> Câu hỏi “tôi có những ví nào?” được nhận diện là read intent, nên hệ thống bỏ luồng làm rõ cũ và trả dữ liệu ví. Một câu hỏi tra cứu không thể mở luồng thay đổi tiền.

### Câu hỏi tra cứu bổ sung

```text
tuần này tôi xài bao nhiêu?
```

### Điểm cần chỉ ra

- Kết quả phải ghi đúng khoảng ngày của tuần.
- Không được mở rộng câu hỏi tuần thành báo cáo cả tháng.

### Trường hợp có thể trình bày thêm

```text
tôi có bao nhiêu ngân sách cho bida?
```

Kết quả đúng là báo chưa đặt ngân sách cho `bida`, không tạo một giao dịch và không liệt kê sai toàn bộ ngân sách như thể đó là câu trả lời trực tiếp.

---

## Phần 5 — Đầu vào đa phương thức

**Thời lượng:** 1–1,5 phút. Có thể bỏ qua nếu runtime media chưa ổn định.

### Phương án A — Ảnh hóa đơn

#### Thao tác

1. Từ Chat, chọn **Camera** hoặc **Thư viện**.
2. Chọn ảnh hóa đơn synthetic đã làm sạch.
3. Nếu cần, nhập context ngắn cho ảnh.
4. Chờ OCR trả raw text.
5. Chỉ ra raw text để chứng minh người dùng có thể kiểm tra.
6. Nếu hệ thống nhận diện được cả tổng và mặt hàng, chọn một trong hai:
   - **Ghi tổng hóa đơn**; hoặc
   - **Ghi từng mặt hàng**.
7. Bấm **Tiếp tục**.
8. Kiểm tra preview giao dịch và xác nhận hoặc hủy.

#### Lời thoại đề xuất

> OCR không ghi trực tiếp vào cơ sở dữ liệu. Nó chỉ trả văn bản thô và metadata provider. Người dùng kiểm tra kết quả, sau đó dữ liệu mới đi qua pipeline giao dịch giống như đầu vào văn bản.
>
> Với hóa đơn có cả tổng cộng và từng mặt hàng, PERFIN bắt buộc chọn một cách ghi để tránh double counting.

### Phương án B — Giọng nói

#### Câu nói gợi ý

```text
Hôm nay tôi đổ xăng hai trăm nghìn.
```

#### Thao tác

1. Chọn **Ghi âm**.
2. Thu câu nói trên.
3. Chờ PhoWhisper trả transcript.
4. Sửa transcript nếu cần.
5. Bấm **Xác nhận transcript**.
6. Kiểm tra preview và xác nhận giao dịch.

#### Điểm cần nói rõ

- Đây là smoke demonstration về khả năng chạy pipeline.
- Không tuyên bố WER, CER hoặc field accuracy vì chưa có ground truth đủ lớn.
- Nếu provider không trả được văn bản, hệ thống báo lỗi thật và không tạo dữ liệu mock hoặc pending giả.

### Phương án dự phòng

Nếu OCR/STT chậm hoặc lỗi:

> Thành phần media chạy cục bộ và phụ thuộc model trên máy backend. Kết quả này minh họa đúng ranh giới thiết kế: khi provider lỗi, hệ thống dừng ở bước media và không tạo giao dịch giả. Em sẽ chuyển sang ảnh chụp/video của cùng luồng đã chuẩn bị trước.

---

## Phần 6 — Ngân sách, dự báo và đề xuất

**Thời lượng:** 1,5–2 phút.

### Thao tác

1. Mở tab **Ngân sách**.
2. Chỉ vào tổng đã chi, tổng ngân sách và tỷ lệ đã sử dụng.
3. Mở phần **Dự báo có thể vượt ngân sách**.
4. Chọn một danh mục có projected percentage cao.
5. Chỉ vào ngày dự kiến vượt và số tiền dự kiến vượt.
6. Mở phần **Ngân sách PERFIN đề xuất**.
7. Chỉ vào hạn mức, rationale, confidence và warning.
8. Bấm **Áp dụng đề xuất**.
9. Dừng ở hộp thoại xác nhận một nhịp rồi mới đồng ý.

### Lời thoại đề xuất

> Màn hình này không chỉ cho biết đã chi bao nhiêu mà còn forecast chi tiêu cuối tháng dựa trên tốc độ chi hiện tại.
>
> Đề xuất ngân sách được tính từ lịch sử theo các trục tháng đã zero-fill. Nếu tổng hạn mức thô vượt trần, hệ thống co tỷ trọng và đối soát sau làm tròn. Đề xuất không được tự động áp dụng; người dùng vẫn phải xác nhận.

### Luồng đặc biệt cần biết

- Lịch sử dưới ba tháng: hiển thị cảnh báo về độ tin cậy.
- Amount không dương: từ chối.
- Danh mục thu nhập: không được dùng làm ngân sách chi tiêu.
- Không đủ dữ liệu: trả đề xuất rỗng/cảnh báo thay vì tự bịa hạn mức.

### Chuyển ý

> Từ dữ liệu giao dịch và ngân sách, PERFIN tiếp tục tạo các facts phân tích có thể truy vết.

---

## Phần 7 — Báo cáo và insight có căn cứ

**Thời lượng:** 1,5–2 phút.

### Thao tác

1. Mở tab **Báo cáo**.
2. Chỉ vào tổng thu, tổng chi, tiết kiệm hoặc bội chi.
3. Chỉ vào biểu đồ chi tiêu theo danh mục.
4. Chỉ vào xu hướng 12 tháng.
5. Mở **Xem phân tích chi tiết**.
6. Chỉ vào provider/persona đang được sử dụng.
7. Trình bày thẻ **Đường băng dòng tiền**.
8. Trình bày thẻ **Khoản chi có dấu hiệu đăng ký**, nếu có.
9. Nếu xuất hiện degraded components, giải thích cảnh báo.

### Lời thoại đề xuất

> Analytics Engine tạo facts trước bằng thuật toán xác định. Ví dụ, runway dùng số dư của các ví VND có tính thanh khoản và nhịp chi trong 14 ngày gần đây. Phần narration chỉ diễn giải facts này để người dùng dễ hiểu hơn.
>
> Response vẫn trả facts, kỳ tính, phương pháp, số mẫu và warning để UI hoặc test có thể đối chiếu. Nếu một component thiếu dữ liệu, hệ thống trả trạng thái suy giảm hoặc null thay vì suy diễn.

### Điểm cần tránh nói quá

- Correlation không chứng minh quan hệ nhân quả.
- Runway là ngoại suy từ tốc độ chi gần đây, không phải dự báo chắc chắn.
- Numeric grounding checker toàn diện vẫn là hướng hoàn thiện.
- Persona chỉ thay đổi giọng điệu, không được thay đổi facts.

---

## Phần 8 — Mục tiêu tài chính và preview bắt buộc

**Thời lượng:** 1,5–2 phút.

### Kịch bản thông thường

Vào **Khác → Mục tiêu tài chính → Tạo mục tiêu mới** và nhập:

| Trường | Giá trị |
|---|---:|
| Loại | Tiết kiệm |
| Tên | Quỹ dự phòng |
| Số tiền mục tiêu | 100.000.000 VND |
| Hiện đã có | 20.000.000 VND |
| Góp mỗi tháng | 5.000.000 VND |
| Ngày đích | Có thể để trống hoặc chọn một ngày phù hợp |

### Thao tác

1. Bấm **Xem kế hoạch**.
2. Chỉ vào số tiền còn thiếu.
3. Chỉ vào khoản góp mỗi tháng.
4. Chỉ vào số tháng và ngày dự kiến.
5. Chỉ vào thông điệp what-if nếu có.
6. Thay đổi số tiền mục tiêu sau khi đã preview.
7. Chỉ ra preview cũ bị vô hiệu hóa và nút lưu yêu cầu xem kế hoạch lại.
8. Bấm **Xem kế hoạch** lần nữa.
9. Bấm **Lưu mục tiêu**.

### Lời thoại đề xuất

> Lập kế hoạch và lưu mục tiêu là hai bước tách biệt. Endpoint plan chỉ tính toán và phát preview token, không ghi dữ liệu. Token gắn với đúng payload và có thời hạn.
>
> Nếu em thay đổi một trường sau khi preview, kế hoạch cũ không còn hợp lệ. Frontend yêu cầu xem lại, đồng thời backend cũng từ chối token không khớp. Vì vậy không thể xem một kế hoạch rồi lưu một payload khác.

### Luồng đặc biệt A — Góp bằng 0

Đặt `Góp mỗi tháng = 0`.

Kết quả mong đợi:

- Trạng thái chưa có khoản góp.
- Số tháng hoặc ngày hoàn tất không xác định.
- Hệ thống không tự thay số 0 bằng dòng tiền dư và không bịa ngày hoàn thành.

### Luồng đặc biệt B — Nợ không giảm

| Trường | Giá trị |
|---|---:|
| Loại | Trả nợ |
| Dư nợ | 10.000.000 VND |
| Trả mỗi tháng | 100.000 VND |
| Lãi suất năm | 24% |

Tiền lãi tháng đầu khoảng 200.000 VND, lớn hơn khoản trả 100.000 VND.

Kết quả mong đợi:

- Hệ thống cảnh báo khoản trả không đủ bù lãi.
- Trạng thái `Nợ không giảm` hoặc kế hoạch chưa khả thi.
- Không đưa ra ngày tất toán giả.

---

## Phần 9 — Kết luận demo

**Thời lượng:** 30–45 giây.

### Thao tác

1. Quay lại Dashboard.
2. Chỉ ra các giao dịch vừa xác nhận đã xuất hiện.
3. Nếu phù hợp, refresh để thấy số dư và tổng chi thay đổi.
4. Nhắc rằng preview đã hủy hoặc chỉ xem thử không xuất hiện trong sổ cái.

### Lời kết đề xuất

> Qua demo, PERFIN đã thể hiện ba điểm chính. Thứ nhất, người dùng có thể nhập tài chính bằng ngôn ngữ tự nhiên hoặc media. Thứ hai, mọi thao tác thay đổi tiền đều qua validation, preview và xác nhận trước khi ghi nguyên tử. Thứ ba, dữ liệu đã xác nhận được tái sử dụng cho ngân sách, phân tích và mục tiêu bằng các thuật toán có thể kiểm tra độc lập.
>
> Đóng góp chính của đề tài không chỉ là một chatbot tài chính, mà là ranh giới rõ giữa AI và lõi nghiệp vụ: AI hỗ trợ ngữ nghĩa, còn dữ liệu, công thức và quyền commit vẫn thuộc về hệ thống xác định và người dùng.

---

## 5. Các luồng đặc biệt dành cho phần phản biện

## 5.1. Preview bị hủy

### Cách trình bày

1. Nhập `cà phê 35k`.
2. Chờ preview.
3. Ghi nhớ số dư hiện tại.
4. Bấm **Hủy**.
5. Quay lại Dashboard hoặc danh sách giao dịch.

### Kết quả mong đợi

- Không có giao dịch mới.
- Số dư không đổi.
- Pending state bị xóa.

### Ý nghĩa

Chứng minh parse/preview không có side effect.

---

## 5.2. Xác nhận trùng hoặc pending đã được claim

### Cách giải thích

- Mỗi preview có một `pending_id`.
- Backend claim pending theo thao tác nguyên tử.
- Request confirm đầu tiên có thể commit.
- Confirm thứ hai với cùng ID phải bị từ chối hoặc không có hiệu ứng.

### Ý nghĩa

Ngăn double-click, retry mạng hoặc duplicate delivery tạo hai giao dịch.

### Cách trình bày an toàn

Không cần thao tác thủ công qua UI. Có thể chỉ vào regression test hoặc minh họa bằng API đã chuẩn bị trước.

---

## 5.3. Pending hết hạn hoặc sai ID

### Kết quả mong đợi

- Không ghi dữ liệu.
- Yêu cầu người dùng tạo lại preview.
- Không dùng draft cũ đã hết hạn.

### Ý nghĩa

Tránh xác nhận nhầm một hành động cũ sau khi bối cảnh tài chính đã thay đổi.

---

## 5.4. Chỉnh sửa giao dịch và rollback số dư

### Cách trình bày

1. Mở **Khác → Giao dịch**.
2. Chọn một giao dịch đã tạo trong demo.
3. Sửa số tiền hoặc loại thu/chi.
4. Lưu.

### Kết quả mong đợi

- Backend tính delta giữa trạng thái cũ và mới.
- Bản ghi giao dịch và số dư ví thay đổi trong cùng transaction.
- Nếu bất kỳ bước nào lỗi, toàn bộ thao tác rollback.

---

## 5.5. Soft delete và khôi phục

### Cách trình bày

1. Xóa một giao dịch nhỏ vừa tạo.
2. Quan sát thông báo có nút hoàn tác.
3. Bấm **Hoàn tác**.

### Kết quả mong đợi

- Khi soft delete, giao dịch không còn trong báo cáo mặc định và số dư được điều chỉnh.
- Khi restore, giao dịch và tác động số dư được phục hồi.
- Lịch sử không bị mất như hard delete.

---

## 5.6. Xóa danh mục đang có giao dịch

### Cách trình bày

1. Tạo một danh mục cá nhân.
2. Gán một vài giao dịch vào danh mục đó.
3. Xóa danh mục.

### Kết quả mong đợi

- Các giao dịch liên quan được re-tag có kiểm soát sang `Khác`, hoặc thao tác bị chặn theo rule hiện hành.
- Không để lại `category_id` mồ côi.

### Ý nghĩa

Chứng minh tính toàn vẹn tham chiếu và xử lý dữ liệu phụ thuộc.

---

## 5.7. Chuyển tiền giữa hai ví

### Chuẩn bị

- Ví `Tiền mặt`.
- Ví `Ngân hàng`.
- Cả hai cùng VND.

### Thao tác

1. Vào **Khác → Dòng tiền & Tài sản**.
2. Ghi lại tài sản ròng trước chuyển.
3. Chọn **Chuyển tiền**.
4. Chuyển `1.000.000 VND` từ Tiền mặt sang Ngân hàng.
5. Xác nhận giao dịch.

### Kết quả mong đợi

- Ví nguồn giảm 1.000.000 VND.
- Ví đích tăng 1.000.000 VND.
- Tổng biến thiên của hai ví bằng 0.
- Tài sản ròng không đổi.

### Luồng bị từ chối

- Ví nguồn và ví đích giống nhau.
- Hai ví khác currency.
- Số tiền không dương.
- Ví không thuộc hồ sơ hiện tại.

---

## 5.8. Khoản chi định kỳ và acknowledgment ngắn

### Tạo khoản định kỳ

```text
nhắc tiền phòng trọ 1.5 triệu mỗi tháng ngày 5
```

Kết quả mong đợi:

- Tạo preview khoản định kỳ.
- Hiển thị tên, số tiền, chu kỳ và ngày đến hạn.
- Chỉ lưu sau khi xác nhận.

### Trả lời reminder

```text
đã thanh toán rồi
```

Kết quả mong đợi khi có reminder gần nhất:

- Hệ thống dùng metadata reminder để chọn đúng bill.
- Vẫn tạo preview giao dịch thanh toán.
- Chỉ commit khi người dùng xác nhận.
- Retry hoặc acknowledgment lặp không được thanh toán sang kỳ tiếp theo.

### Luồng mơ hồ

Nếu có hai khoản gần giống như `iCloud` và `iCloud+`, hệ thống phải hỏi người dùng chọn bằng số thứ tự thay vì tự chọn.

---

## 5.9. Worker và duplicate delivery

### Điều có thể trình bày

- Worker chạy job nhắc định kỳ, runway scan, month-end insight, backup và cleanup theo cấu hình.
- Job có user scope, fingerprint/event key, retry và cơ chế chống hiệu ứng lặp.

### Giới hạn phải nói rõ

- Logic handler và idempotency đã có kiểm thử.
- Chưa nên tuyên bố Redis worker đã được nghiệm thu live nếu buổi demo không chạy và đối chiếu queue thật.

---

## 5.10. Provider AI lỗi

### Kết quả mong đợi

- Với text: hệ thống có thể dùng local parser hoặc báo lỗi phù hợp.
- Với narration: dùng template fallback.
- Với OCR/STT local: nếu runtime/model lỗi thì trả lỗi thật.
- Không adapter nào được phép ghi trực tiếp PostgreSQL.

### Lời giải thích đề xuất

> Provider là thành phần có thể thay thế. Tính đúng tài chính không phụ thuộc vào việc LLM đang hoạt động, vì validation, tính toán và commit đều nằm trong backend xác định.

---

## 6. Kịch bản rút gọn khi chỉ có 7 phút

| Thời gian | Nội dung |
|---:|---|
| 0:00–0:45 | Giới thiệu bài toán và nguyên tắc AI không tự ghi dữ liệu. |
| 0:45–1:30 | Dashboard. |
| 1:30–3:15 | Chat nhiều giao dịch, sửa và xác nhận. |
| 3:15–4:15 | Clarification và câu hỏi chen ngang. |
| 4:15–5:15 | Ngân sách và forecast. |
| 5:15–6:15 | Báo cáo, runway và facts trước narration. |
| 6:15–7:00 | Goal preview bắt buộc và kết luận. |

Trong phiên bản rút gọn, bỏ OCR/STT, recurring, chuyển ví và export khỏi phần live; chỉ nhắc chúng ở slide tổng quan hoặc khi phản biện.

---

## 7. Phương án dự phòng khi demo gặp lỗi

| Sự cố | Cách xử lý ngay | Nội dung vẫn có thể chứng minh |
|---|---|---|
| Expo không kết nối backend | Chuyển sang Expo web hoặc video dự phòng | Luồng UI và expected state. |
| Gemini timeout/quota | Chuyển local parser hoặc template fallback | Ranh giới provider và core xác định. |
| OCR/STT tải model lâu | Dùng ảnh/video chụp trước | Raw-text review và human-in-the-loop. |
| Redis/worker không chạy | Không cố sửa trực tiếp trong buổi báo cáo | Trình bày unit test và nêu đúng giới hạn live worker. |
| Dataset bị thay đổi | Restore snapshot demo đã khóa | Tính tái lập của báo cáo và analytics. |
| Report không có runway | Dùng dataset/snapshot đã chuẩn bị hoặc ảnh capture | Facts contract và UI degraded state. |
| Không có danh mục vượt ngân sách | Trình bày forecast hiện có hoặc capture dự phòng | Công thức forecast và cảnh báo. |
| Mất mạng | Dùng local parser, PostgreSQL và media local | Hệ thống không phụ thuộc hoàn toàn vào cloud AI. |

Nguyên tắc khi gặp lỗi: nói ngắn gọn trạng thái thật, chuyển sang phương án dự phòng và không tuyên bố kết quả chưa quan sát được.

---

## 8. Câu hỏi phản biện thường gặp và trả lời gợi ý

### 8.1. Vì sao phải dùng AI, biểu mẫu thông thường không đủ sao?

> Biểu mẫu vẫn được giữ cho các thao tác thủ công. AI giải quyết ma sát nhập liệu: người dùng có thể ghi một hoặc nhiều giao dịch bằng câu tự nhiên, ảnh hoặc giọng nói. Tuy nhiên, hệ thống không đánh đổi tính đúng lấy sự tiện lợi vì vẫn yêu cầu preview và xác nhận.

### 8.2. Nếu AI nhận diện sai số tiền thì sao?

> AI chỉ tạo draft. Backend validation kiểu dữ liệu và luật miền, sau đó UI hiển thị số tiền, loại, ngày, danh mục và ví để người dùng sửa hoặc hủy. Chỉ payload đã xác nhận mới được commit.

### 8.3. Làm sao tránh người dùng bấm xác nhận hai lần?

> Preview có `pending_id`. Backend claim pending nguyên tử; ID đã claim hoặc hết hạn không được dùng lại. Vì vậy retry hoặc double-click không tạo hai giao dịch.

### 8.4. LLM có tự tính runway hoặc ngân sách không?

> Không. Analytics, Budget và Goal Engine tính facts bằng hàm xác định. LLM chỉ nhận facts đã tính để diễn giải và không truy cập trực tiếp database.

### 8.5. Khi Gemini không hoạt động thì hệ thống có dùng được không?

> Các luồng cốt lõi vẫn có local parser và template narration fallback. Media chạy bằng PaddleOCR và PhoWhisper cục bộ. Provider lỗi không làm mất các quy tắc nghiệp vụ hay quyền kiểm soát commit.

### 8.6. Tại sao dùng modular monolith thay vì microservice?

> Quy mô nguyên mẫu chưa đủ để bù chi phí triển khai, tracing và nhất quán phân tán của microservice. Modular monolith giữ transaction cơ sở dữ liệu đơn giản nhưng vẫn tách route, service, model và engine để kiểm thử độc lập. Worker được tách thành tiến trình riêng cho job nền.

### 8.7. Runway được tính như thế nào?

> Hệ thống cộng số dư các ví VND có tính thanh khoản như cash, bank và e-wallet, sau đó chia cho chi trung bình theo ngày trong cửa sổ 14 ngày. Nếu chi trung bình bằng 0 thì ngày cạn không xác định; nếu số dư không dương thì runway bằng 0.

### 8.8. Correlation có nghĩa là hai loại chi tiêu gây ra nhau không?

> Không. Hệ thống chỉ báo hai chuỗi đồng biến đủ mạnh trên cùng trục tuần. Kết quả không được diễn giải thành quan hệ nhân quả.

### 8.9. Vì sao contribution bằng 0 không tự dùng surplus?

> `null` nghĩa là người dùng để hệ thống dùng surplus khả dụng. Số 0 là lựa chọn rõ ràng rằng hiện chưa có khoản góp. Hai trạng thái có ý nghĩa khác nhau nên hệ thống giữ nguyên số 0 và không tự thay thế.

### 8.10. Dataset demo có đáng tin không?

> Tập dữ liệu hiện có 5.328 giao dịch logic và đã qua validation định dạng, ngày, loại và đối soát tiền. Tuy nhiên, taxonomy nguồn phải ánh xạ sang taxonomy hệ thống, nguồn không có ví hoặc currency và có một số nhóm trùng/ngoại lệ chỉ được gắn cờ. Vì vậy dữ liệu đủ cho demo và kiểm thử pipeline nhưng không được coi là ground truth hoàn hảo cho mọi bài toán phân loại.

### 8.11. OCR/STT đã đạt độ chính xác bao nhiêu?

> Hiện mới chứng minh được các fixture chọn trước đi qua provider thật. Chưa có ít nhất 20 ảnh và 20 audio với ground truth để công bố CER, WER hoặc field accuracy, nên báo cáo không đưa ra một tỷ lệ chính xác chưa được đo.

### 8.12. Hệ thống đã sẵn sàng production chưa?

> Chưa. Đây là nguyên mẫu niên luận. Trước production cần authentication, authorization, audit, secret management, kiểm thử recovery, p95, UAT, ground truth media và kiểm chứng worker live trong môi trường kiểm soát.

### 8.13. Tại sao nhánh PDF không được trình bày như PDF hoàn chỉnh?

> Mã hiện tại mới sinh HTML cho nhánh từng được gọi là PDF. CSV có bằng chứng tốt hơn, nên khi demo chỉ công bố CSV là chức năng xuất đã được chứng minh.

---

## 9. Bảng câu lệnh chat dùng trong demo

| Mục đích | Câu lệnh |
|---|---|
| Một giao dịch | `ăn phở 50k` |
| Nhiều giao dịch | `ăn sáng 30k, grab 45k` |
| Thu nhập | `nhận lương 15 triệu` |
| Làm rõ số tiền | `ăn phở` |
| Hỏi danh sách ví | `tôi có những ví nào?` |
| Hỏi chi tuần | `tuần này tôi xài bao nhiêu?` |
| Hỏi chi theo mô tả | `tôi đã chi bao nhiêu tiền đánh bida trong tháng này?` |
| Hỏi ngân sách | `ngân sách ăn uống còn lại bao nhiêu?` |
| Danh mục chưa theo dõi | `tôi có bao nhiêu ngân sách cho bida?` |
| Đề xuất ngân sách | `gợi ý ngân sách giúp mình` |
| Xem mục tiêu | `tôi đang có các mục tiêu gì?` |
| Tạo mục tiêu | `trong 5 năm mình muốn tiết kiệm 300 triệu mua nhà` |
| Tạo khoản định kỳ | `nhắc tiền phòng trọ 1.5 triệu mỗi tháng ngày 5` |
| Danh sách khoản định kỳ | `danh sách khoản chi cố định` |
| Lịch sử khoản định kỳ | `lịch sử tiền phòng` |
| Tạm dừng nhắc | `tạm dừng nhắc internet` |
| Acknowledgment từ reminder | `đã thanh toán rồi` |
| Chuyển ví | `chuyển 2 triệu từ ví tiền mặt sang ví ngân hàng` |
| Phân tích | `phân tích chi tiêu của tôi` |
| Lời khuyên | `bạn có lời khuyên nào cho tôi không?` |
| Xuất CSV | `xuất báo cáo csv` |
| Hủy thao tác chờ | `hủy` |

Không nhập các câu chưa thử trước trong phần demo chính. Câu tự do có thể được dùng ở phần hỏi đáp sau khi luồng cốt lõi đã hoàn tất.

---

## 10. Checklist ngay trước khi bước vào phòng

- [ ] Backend, PostgreSQL và Expo đang chạy.
- [ ] Redis/worker chỉ bật nếu có kế hoạch trình bày live.
- [ ] Thiết bị truy cập được backend.
- [ ] Không có API key hoặc secret xuất hiện trên màn hình.
- [ ] Database demo đang ở snapshot mong muốn.
- [ ] Dashboard có dữ liệu.
- [ ] Budget có dữ liệu và ít nhất một forecast hữu ích.
- [ ] Report có insight/facts phù hợp.
- [ ] Có hai ví VND nếu trình bày chuyển tiền.
- [ ] Có recurring bill đúng kỳ nếu trình bày acknowledgment.
- [ ] Ảnh hóa đơn synthetic đã được kiểm tra và xóa metadata.
- [ ] OCR/STT đã warm-up.
- [ ] Local parser hoạt động ngay cả khi mất mạng.
- [ ] Video/ảnh dự phòng đã mở sẵn.
- [ ] Đã chạy `npm test` và lưu lại kết quả.
- [ ] Đã tập kịch bản rút gọn 7 phút.
- [ ] Không trình bày PDF, UAT, p95 hoặc OCR/STT accuracy như kết quả đã hoàn tất.

---

## 11. Tài liệu và mã nguồn đối chiếu

- Đặc tả FR và các luồng đặc biệt: `../latex/chapters/vi/chapter3.tex`.
- Đặc tả chức năng bổ sung: `../latex/chapters/vi/appendix-fr-supplement.tex`.
- Thuật toán và trường hợp biên: `../latex/chapters/vi/appendices.tex`.
- Chat orchestration: `backend/routes/chat.routes.js`.
- Local intent router: `backend/services/ai/localIntentRouter.js`.
- Pending state: `backend/services/pendingTransaction.service.js`.
- Budget engine: `backend/services/budgets/`.
- Analytics engine: `backend/services/analytics/`.
- Goal planner: `backend/services/goals/`.
- Recurring bill: `backend/models/recurringBill.model.js` và `backend/routes/recurring.routes.js`.
- Worker: `backend/services/jobs/`.
- Báo cáo chất lượng dữ liệu: `data/DATA_QUALITY_REPORT.md`.
- Protocol UAT: `evaluation/uat/README.md`.

---

## 12. Câu mở đầu và kết thúc ngắn để học thuộc

### Mở đầu

> PERFIN là nguyên mẫu quản lý tài chính cá nhân trong đó AI giúp giảm thao tác nhập liệu, nhưng không được tự quyết định hoặc tự ghi dữ liệu tài chính. Mọi draft đều được kiểm tra, cho người dùng xem lại và chỉ commit sau xác nhận.

### Kết thúc

> Điểm cốt lõi của PERFIN là sự kết hợp giữa trải nghiệm nhập liệu tự nhiên, sổ cái có ràng buộc và các thuật toán phân tích xác định. AI làm lớp giao tiếp; dữ liệu và tính đúng vẫn được bảo vệ bởi backend và quyết định cuối cùng của người dùng.

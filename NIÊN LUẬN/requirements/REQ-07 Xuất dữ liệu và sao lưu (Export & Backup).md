---
tags:
  - nien-luan
---
# REQ-07: Xuất Dữ liệu & Sao lưu (Export & Backup)

  

## Metadata

- **Brief nguồn**: `Yêu cầu tính năng.md` — mục 7: Xuất dữ liệu và sao lưu; tham chiếu `REQ-04`, `REQ-08`

- **Ngày tạo**: 25/05/2026

- **Lần cập nhật cuối**: 27/05/2026 — bản DRAFT ban đầu

- **Trạng thái**: DRAFT — chờ PO phê duyệt

  

## Tóm tắt

Tính năng Xuất dữ liệu & Sao lưu cho phép người dùng xuất giao dịch ra file CSV, xuất báo cáo tài chính ra file PDF có định dạng và biểu đồ, lọc dữ liệu trước khi xuất theo nhiều tiêu chí, sao lưu toàn bộ dữ liệu cá nhân dưới dạng file mã hóa, khôi phục dữ liệu từ bản sao lưu, cấu hình sao lưu tự động định kỳ, yêu cầu xuất/sao lưu thông qua giao diện chat bằng ngôn ngữ tự nhiên, xem lịch sử xuất và sao lưu, cũng như xóa các bản sao lưu cũ không cần thiết. Dữ liệu xuất CSV bao gồm ngày, mô tả, số tiền, danh mục, ví và loại giao dịch. File PDF xuất ra là báo cáo có định dạng kèm biểu đồ theo cấu trúc của REQ-04. Bản sao lưu là file mã hóa chứa toàn bộ dữ liệu người dùng gồm giao dịch, danh mục, ví, ngân sách, nhắc nhở và cài đặt cá nhân.

  

## Phân tích yêu cầu

  

### Actors

- **User**: Người dùng cuối thực hiện xuất dữ liệu, sao lưu, khôi phục, xem lịch sử và xóa bản sao lưu.

- **AI Engine**: Thành phần xử lý yêu cầu xuất/sao lưu bằng ngôn ngữ tự nhiên từ chat.

- **System**: Ứng dụng tạo file xuất, mã hóa/giải mã bản sao lưu, lưu trữ lịch sử, thực hiện sao lưu tự động và quản lý vòng đời bản sao lưu.

  

### Features

- Xuất danh sách giao dịch ra file CSV với các trường: ngày, mô tả, số tiền, danh mục, ví, loại giao dịch.

- Xuất báo cáo tài chính ra file PDF có định dạng và biểu đồ theo cấu trúc REQ-04.

- Lọc dữ liệu trước khi xuất theo khoảng thời gian, danh mục, ví hoặc kết hợp nhiều tiêu chí.

- Sao lưu toàn bộ dữ liệu người dùng dưới dạng file mã hóa.

- Khôi phục dữ liệu từ bản sao lưu đã mã hóa.

- Cấu hình sao lưu tự động định kỳ (tùy chọn trong MVP).

- Yêu cầu xuất/sao lưu thông qua giao diện chat bằng ngôn ngữ tự nhiên.

- Xem lịch sử các lần xuất và sao lưu.

- Xóa bản sao lưu cũ không cần thiết.

  

### Constraints

- File CSV xuất ra phải sử dụng mã hóa UTF-8 để hỗ trợ tiếng Việt.

- File PDF phải kế thừa cấu trúc và biểu đồ từ REQ-04 — Báo cáo tài chính.

- Bản sao lưu phải được mã hóa theo tiêu chuẩn bảo mật được chốt ở REQ-08.

- Chỉ người dùng sở hữu dữ liệu mới có quyền xuất, sao lưu, khôi phục và xóa bản sao lưu.

- Dữ liệu sao lưu bao gồm: giao dịch, danh mục (mặc định + tùy chỉnh), ví/tài khoản, ngân sách, nhắc nhở, cài đặt cá nhân.

- Khôi phục dữ liệu phải ghi đè hoàn toàn dữ liệu hiện tại hoặc gộp theo lựa chọn người dùng.

- Sao lưu tự động định kỳ là tính năng tùy chọn, mặc định tắt trong MVP.

  

### Ambiguities

- ⚠️ AMBIGUOUS: Dung lượng tối đa cho file sao lưu chưa được chốt; phụ thuộc vào lượng giao dịch và cài đặt của người dùng.

- ⚠️ AMBIGUOUS: Nơi lưu trữ bản sao lưu (cloud, local storage, hoặc cả hai) chưa được PO xác nhận.

- ⚠️ AMBIGUOUS: Khi khôi phục dữ liệu, chính sách xử lý xung đột giữa dữ liệu hiện tại và dữ liệu trong bản sao lưu (ghi đè hoàn toàn hay gộp thông minh) chưa được chốt chi tiết.

- ⚠️ AMBIGUOUS: Tần suất sao lưu tự động hỗ trợ (hàng ngày, hàng tuần, hàng tháng) và số bản sao lưu tự động được giữ lại tối đa chưa được chốt.

  

### Out of Scope sơ bộ

- Xuất dữ liệu ra định dạng khác ngoài CSV và PDF, ví dụ Excel, JSON, OFX.

- Đồng bộ sao lưu đa thiết bị real-time.

- Sao lưu tự động lên dịch vụ cloud bên thứ ba (Google Drive, Dropbox) nếu PO chưa xác nhận.

- Chia sẻ file xuất hoặc bản sao lưu trực tiếp cho người dùng khác trong app.

  

## Actors

- **User**: Người dùng cuối xuất dữ liệu, sao lưu, khôi phục, quản lý lịch sử và xóa bản sao lưu.

- **AI Engine**: Thành phần xử lý câu lệnh xuất/sao lưu bằng ngôn ngữ tự nhiên trong chat.

- **System**: Ứng dụng tạo file CSV/PDF, mã hóa/giải mã sao lưu, thực hiện sao lưu tự động, lưu lịch sử và quản lý vòng đời bản sao lưu.

  

## Yêu cầu Chức năng

  

### FR-07-01: Xuất giao dịch ra CSV

**Mô tả**: Người dùng có thể xuất danh sách giao dịch ra file CSV. File CSV bao gồm các cột: ngày giao dịch, mô tả/tên giao dịch, số tiền, danh mục, ví/tài khoản và loại giao dịch (Expense/Income/Special).

  

**Acceptance Criteria**:

- Given người dùng chọn chức năng xuất CSV

  When hệ thống xử lý yêu cầu xuất với dữ liệu giao dịch hiện có

  Then hệ thống tạo file CSV chứa các cột: `Ngày`, `Mô tả`, `Số tiền`, `Danh mục`, `Ví`, `Loại giao dịch` và cho phép người dùng tải về.

  

- Given người dùng có 100 giao dịch trong khoảng thời gian được chọn

  When hệ thống xuất CSV

  Then file CSV chứa đúng 100 dòng dữ liệu (không tính dòng header) với thông tin chính xác theo từng giao dịch.

  

- Given file CSV được tạo thành công

  When hệ thống ghi file

  Then file CSV phải sử dụng mã hóa UTF-8 và có thể mở đúng bằng phần mềm bảng tính mà không lỗi font tiếng Việt.

  

- Given người dùng không có giao dịch nào trong khoảng thời gian hoặc bộ lọc được chọn

  When hệ thống xử lý yêu cầu xuất CSV

  Then hệ thống thông báo rằng không có dữ liệu phù hợp để xuất và không tạo file CSV rỗng.

  

- Given giao dịch có danh mục phụ

  When hệ thống xuất CSV

  Then cột danh mục hiển thị cả danh mục chính và danh mục phụ, ví dụ `Ăn uống > Cà phê`.

  

### FR-07-02: Xuất báo cáo ra PDF

**Mô tả**: Người dùng có thể xuất báo cáo tài chính ra file PDF. File PDF có định dạng rõ ràng, bao gồm bảng tổng hợp số liệu và biểu đồ theo cấu trúc báo cáo của REQ-04.

  

**Acceptance Criteria**:

- Given người dùng chọn chức năng xuất PDF

  When hệ thống xử lý yêu cầu xuất với dữ liệu báo cáo hiện có

  Then hệ thống tạo file PDF có định dạng bao gồm bảng tổng hợp số liệu thu/chi, biểu đồ phân bổ theo danh mục và tiêu đề khoảng thời gian tương ứng.

  

- Given báo cáo tài chính trong REQ-04 có biểu đồ tròn phân bổ chi phí theo danh mục

  When hệ thống xuất PDF

  Then file PDF phải chứa biểu đồ tròn tương ứng với dữ liệu trong khoảng thời gian được chọn.

  

- Given người dùng xuất PDF cho tháng 5/2026

  When hệ thống tạo PDF

  Then file PDF hiển thị tiêu đề rõ ràng gồm tên người dùng (hoặc tên hiển thị), khoảng thời gian `Tháng 5/2026`, tổng thu, tổng chi và số dư.

  

- Given người dùng không có dữ liệu giao dịch trong khoảng thời gian được chọn

  When hệ thống xử lý yêu cầu xuất PDF

  Then hệ thống thông báo rằng không có dữ liệu phù hợp để tạo báo cáo và không tạo file PDF rỗng.

  

⚠️ AMBIGUOUS: Biểu đồ và cấu trúc cụ thể trong PDF phụ thuộc vào thiết kế báo cáo của REQ-04; nếu REQ-04 thay đổi, PDF xuất ra cần đồng bộ theo.

  

### FR-07-03: Lọc dữ liệu trước khi xuất

**Mô tả**: Người dùng có thể áp dụng bộ lọc trước khi xuất CSV hoặc PDF. Các tiêu chí lọc bao gồm khoảng thời gian, danh mục, ví/tài khoản và loại giao dịch. Người dùng có thể kết hợp nhiều tiêu chí lọc cùng lúc.

  

**Acceptance Criteria**:

- Given người dùng muốn xuất giao dịch trong khoảng thời gian cụ thể

  When người dùng chọn ngày bắt đầu `01/05/2026` và ngày kết thúc `31/05/2026`

  Then hệ thống chỉ xuất các giao dịch trong khoảng thời gian đó.

  

- Given người dùng muốn xuất giao dịch theo danh mục

  When người dùng chọn danh mục `Ăn uống`

  Then hệ thống chỉ xuất các giao dịch thuộc danh mục `Ăn uống`, bao gồm cả giao dịch thuộc danh mục phụ dưới `Ăn uống`.

  

- Given người dùng muốn xuất giao dịch theo ví

  When người dùng chọn ví `Tiền mặt`

  Then hệ thống chỉ xuất các giao dịch thuộc ví `Tiền mặt`.

  

- Given người dùng muốn kết hợp nhiều tiêu chí lọc

  When người dùng chọn khoảng thời gian `Tháng 5/2026`, danh mục `Ăn uống` và ví `Tiền mặt`

  Then hệ thống chỉ xuất các giao dịch thỏa đồng thời tất cả các tiêu chí lọc đã chọn.

  

- Given người dùng muốn xuất theo loại giao dịch

  When người dùng chọn loại `Expense`

  Then hệ thống chỉ xuất các giao dịch thuộc loại chi phí.

  

- Given người dùng không chọn bất kỳ bộ lọc nào

  When người dùng thực hiện xuất

  Then hệ thống xuất toàn bộ giao dịch hiện có của người dùng.

  

⚠️ AMBIGUOUS: Chưa rõ có cần hỗ trợ lọc theo nhiều danh mục hoặc nhiều ví cùng lúc trong một lần xuất hay không.

  

### FR-07-04: Sao lưu toàn bộ dữ liệu người dùng

**Mô tả**: Người dùng có thể tạo bản sao lưu chứa toàn bộ dữ liệu cá nhân. Dữ liệu sao lưu bao gồm: giao dịch, danh mục (mặc định + tùy chỉnh + danh mục phụ), ví/tài khoản, ngân sách, nhắc nhở, cài đặt cá nhân. File sao lưu phải được mã hóa để bảo vệ dữ liệu nhạy cảm.

  

**Acceptance Criteria**:

- Given người dùng chọn chức năng sao lưu dữ liệu

  When hệ thống xử lý yêu cầu sao lưu

  Then hệ thống tạo file sao lưu chứa toàn bộ: giao dịch, danh mục, ví, ngân sách, nhắc nhở và cài đặt cá nhân của người dùng.

  

- Given hệ thống tạo file sao lưu thành công

  When file sao lưu được ghi

  Then file sao lưu phải được mã hóa theo tiêu chuẩn bảo mật của REQ-08 và không thể đọc được nội dung bằng trình soạn thảo văn bản thông thường.

  

- Given hệ thống tạo file sao lưu thành công

  When hệ thống hoàn tất quá trình sao lưu

  Then hệ thống phản hồi cho người dùng gồm: xác nhận sao lưu thành công, thời điểm sao lưu, kích thước file và cho phép người dùng tải về hoặc lưu trữ.

  

- Given người dùng có dữ liệu giao dịch đặc biệt (nợ, vay, tiết kiệm, đầu tư)

  When hệ thống tạo bản sao lưu

  Then bản sao lưu phải bao gồm đầy đủ dữ liệu giao dịch đặc biệt cùng các trường dữ liệu liên quan.

  

- Given quá trình sao lưu gặp lỗi (ví dụ thiếu dung lượng, lỗi mạng)

  When hệ thống không thể hoàn tất sao lưu

  Then hệ thống thông báo lỗi rõ ràng cho người dùng và không tạo file sao lưu không đầy đủ.

  

### FR-07-05: Khôi phục dữ liệu từ bản sao lưu

**Mô tả**: Người dùng có thể khôi phục dữ liệu từ file sao lưu đã mã hóa. Hệ thống giải mã file, kiểm tra tính toàn vẹn và khôi phục dữ liệu vào tài khoản người dùng.

  

**Acceptance Criteria**:

- Given người dùng chọn chức năng khôi phục và tải lên file sao lưu hợp lệ

  When hệ thống giải mã và xác thực file sao lưu thành công

  Then hệ thống khôi phục toàn bộ dữ liệu từ bản sao lưu vào tài khoản người dùng.

  

- Given người dùng tải lên file sao lưu hợp lệ

  When hệ thống chuẩn bị khôi phục và tài khoản hiện tại đã có dữ liệu

  Then hệ thống cảnh báo người dùng rằng dữ liệu hiện tại sẽ bị ghi đè và yêu cầu xác nhận trước khi thực hiện khôi phục.

  

- Given người dùng xác nhận khôi phục từ bản sao lưu

  When hệ thống hoàn tất khôi phục

  Then dữ liệu sau khôi phục phải bao gồm đầy đủ: giao dịch, danh mục, ví, ngân sách, nhắc nhở và cài đặt cá nhân theo đúng nội dung trong bản sao lưu.

  

- Given người dùng tải lên file không phải định dạng sao lưu hợp lệ hoặc file bị hỏng

  When hệ thống cố gắng giải mã và xác thực

  Then hệ thống từ chối khôi phục, thông báo lỗi rõ ràng và không thay đổi dữ liệu hiện tại của người dùng.

  

- Given người dùng tải lên file sao lưu của tài khoản khác

  When hệ thống kiểm tra quyền sở hữu

  Then hệ thống từ chối khôi phục và thông báo rằng bản sao lưu không thuộc tài khoản hiện tại.

  

- Given hệ thống đang khôi phục dữ liệu và quá trình bị gián đoạn (ví dụ mất mạng, app bị đóng)

  When quá trình khôi phục không hoàn tất

  Then hệ thống rollback về trạng thái trước khi khôi phục và thông báo lỗi cho người dùng.

  

⚠️ AMBIGUOUS: Chưa rõ chính sách khôi phục là luôn ghi đè toàn bộ hay cho phép người dùng chọn gộp (merge) dữ liệu từ bản sao lưu với dữ liệu hiện tại.

  

### FR-07-06: Sao lưu tự động định kỳ

**Mô tả**: Người dùng có thể bật tính năng sao lưu tự động để hệ thống tự tạo bản sao lưu theo lịch định kỳ. Tính năng này mặc định tắt trong MVP. Khi bật, người dùng chọn tần suất sao lưu. Hệ thống tự động xóa bản sao lưu cũ khi vượt quá số lượng tối đa được giữ lại.

  

**Acceptance Criteria**:

- Given người dùng truy cập cài đặt sao lưu

  When người dùng bật sao lưu tự động và chọn tần suất (hàng ngày, hàng tuần, hoặc hàng tháng)

  Then hệ thống lưu cấu hình và bắt đầu thực hiện sao lưu tự động theo tần suất đã chọn.

  

- Given sao lưu tự động đã được bật

  When đến thời điểm sao lưu theo lịch

  Then hệ thống tự động tạo bản sao lưu mã hóa mà không cần người dùng thao tác thủ công.

  

- Given sao lưu tự động tạo bản sao lưu thành công

  When số bản sao lưu tự động đã vượt quá số lượng tối đa được giữ lại

  Then hệ thống tự động xóa bản sao lưu tự động cũ nhất để giữ đúng số lượng tối đa.

  

- Given người dùng muốn tắt sao lưu tự động

  When người dùng tắt tính năng trong cài đặt

  Then hệ thống ngừng sao lưu tự động nhưng giữ nguyên các bản sao lưu đã tạo trước đó.

  

- Given người dùng mới sử dụng ứng dụng lần đầu

  When hệ thống hiển thị cài đặt sao lưu

  Then tính năng sao lưu tự động phải ở trạng thái tắt theo mặc định.

  

⚠️ AMBIGUOUS: Tần suất sao lưu cụ thể (hàng ngày, hàng tuần, hàng tháng) và số bản sao lưu tự động tối đa được giữ lại chưa được PO chốt.

  

### FR-07-07: Yêu cầu xuất/sao lưu bằng chat

**Mô tả**: Người dùng có thể yêu cầu xuất dữ liệu hoặc sao lưu thông qua giao diện chat bằng ngôn ngữ tự nhiên. AI Engine nhận diện ý định xuất/sao lưu từ câu lệnh và thực thi tương ứng.

  

**Acceptance Criteria**:

- Given người dùng đang ở màn hình chat

  When người dùng nhập `Xuất giao dịch tháng 5 ra CSV`

  Then AI Engine nhận diện yêu cầu xuất CSV với bộ lọc tháng 5 và hệ thống tạo file CSV tương ứng.

  

- Given người dùng đang ở màn hình chat

  When người dùng nhập `Sao lưu dữ liệu`

  Then AI Engine nhận diện yêu cầu sao lưu và hệ thống tạo bản sao lưu mã hóa toàn bộ dữ liệu.

  

- Given người dùng đang ở màn hình chat

  When người dùng nhập `Xuất báo cáo quý 1 năm 2026 PDF`

  Then AI Engine nhận diện yêu cầu xuất PDF với khoảng thời gian quý 1/2026 và hệ thống tạo file PDF tương ứng.

  

- Given người dùng nhập yêu cầu xuất nhưng thiếu thông tin cần thiết, ví dụ `Xuất dữ liệu`

  When AI Engine không xác định được định dạng xuất (CSV hay PDF) hoặc khoảng thời gian

  Then hệ thống hỏi lại người dùng để làm rõ trước khi thực hiện.

  

- Given người dùng nhập câu lệnh bằng tiếng Việt, tiếng Anh hoặc pha trộn Việt - Anh

  When AI Engine xử lý yêu cầu xuất/sao lưu

  Then hệ thống nhận diện đúng ý định và thực thi tương ứng.

  

- Given người dùng yêu cầu xuất kèm bộ lọc phức tạp qua chat, ví dụ `Xuất CSV giao dịch ăn uống bằng ví Momo tháng 4`

  When AI Engine xử lý câu lệnh

  Then hệ thống áp dụng đồng thời bộ lọc danh mục `Ăn uống`, ví `Momo` và khoảng thời gian tháng 4 trước khi xuất.

  

### FR-07-08: Lịch sử xuất và sao lưu

**Mô tả**: Hệ thống lưu lại lịch sử các lần xuất dữ liệu và sao lưu để người dùng có thể xem lại, tải lại file đã xuất hoặc quản lý các bản sao lưu cũ.

  

**Acceptance Criteria**:

- Given người dùng truy cập mục lịch sử xuất/sao lưu

  When hệ thống hiển thị danh sách

  Then danh sách hiển thị các lần xuất/sao lưu gồm: loại thao tác (xuất CSV, xuất PDF, sao lưu), thời điểm thực hiện, kích thước file và trạng thái (thành công/thất bại).

  

- Given người dùng muốn tải lại file đã xuất trước đó

  When người dùng chọn một bản ghi trong lịch sử xuất

  Then hệ thống cho phép tải lại file nếu file vẫn còn được lưu trữ trong hệ thống.

  

- Given file đã xuất trước đó đã bị xóa hoặc hết hạn lưu trữ

  When người dùng cố gắng tải lại file đó

  Then hệ thống thông báo rằng file không còn khả dụng và gợi ý người dùng thực hiện xuất mới.

  

- Given hệ thống thực hiện sao lưu tự động

  When sao lưu tự động hoàn tất

  Then bản sao lưu tự động phải được ghi vào lịch sử với nhãn phân biệt `Tự động` để phân biệt với sao lưu thủ công.

  

⚠️ AMBIGUOUS: Thời gian lưu trữ file đã xuất (CSV/PDF) trên hệ thống trước khi tự động xóa chưa được chốt.

  

### FR-07-09: Xóa bản sao lưu cũ

**Mô tả**: Người dùng có thể xóa bản sao lưu cũ không cần thiết để giải phóng dung lượng. Hệ thống yêu cầu xác nhận trước khi xóa vĩnh viễn.

  

**Acceptance Criteria**:

- Given người dùng muốn xóa một bản sao lưu cũ

  When người dùng chọn bản sao lưu trong danh sách lịch sử và nhấn xóa

  Then hệ thống hiển thị cảnh báo xác nhận gồm thời điểm sao lưu, kích thước file và cảnh báo rằng sau khi xóa sẽ không thể khôi phục.

  

- Given hệ thống đã hiển thị cảnh báo xóa bản sao lưu

  When người dùng xác nhận xóa

  Then hệ thống xóa vĩnh viễn file sao lưu và cập nhật danh sách lịch sử.

  

- Given hệ thống đã hiển thị cảnh báo xóa bản sao lưu

  When người dùng hủy thao tác

  Then hệ thống giữ nguyên bản sao lưu và không thay đổi gì.

  

- Given người dùng chỉ có một bản sao lưu duy nhất

  When người dùng yêu cầu xóa bản sao lưu đó

  Then hệ thống cảnh báo thêm rằng đây là bản sao lưu duy nhất và hỏi xác nhận lần nữa trước khi xóa.

  

- Given người dùng muốn xóa nhiều bản sao lưu cùng lúc

  When người dùng chọn nhiều bản sao lưu và xác nhận xóa

  Then hệ thống xóa tất cả bản sao lưu đã chọn và cập nhật danh sách lịch sử.

  

## Yêu cầu Phi chức năng (NFR)

- **Mã hóa UTF-8**: File CSV xuất ra phải sử dụng mã hóa UTF-8 để hỗ trợ tiếng Việt đúng.

- **Định dạng CSV**: CSV sử dụng dấu phẩy làm dấu phân cách mặc định; các trường chứa dấu phẩy hoặc xuống dòng phải được bọc trong dấu ngoặc kép.

- **Biểu đồ PDF**: File PDF phải kế thừa biểu đồ và cấu trúc báo cáo từ REQ-04.

- **Mã hóa sao lưu**: Bản sao lưu phải được mã hóa theo tiêu chuẩn bảo mật xác định ở REQ-08; file sao lưu không được đọc được nội dung dưới dạng văn bản thô.

- **Toàn vẹn dữ liệu**: Hệ thống cần kiểm tra tính toàn vẹn của file sao lưu trước khi khôi phục bằng checksum hoặc cơ chế tương đương.

- **Rollback khi lỗi**: Nếu quá trình khôi phục bị gián đoạn, hệ thống phải rollback về trạng thái trước khi khôi phục.

- **Ngôn ngữ hỗ trợ**: Yêu cầu xuất/sao lưu qua chat cần hỗ trợ tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh.

- **Quyền truy cập**: Chỉ người dùng sở hữu dữ liệu mới có quyền xuất, sao lưu, khôi phục và xóa bản sao lưu.

- **Sao lưu tự động mặc định**: Tính năng sao lưu tự động phải mặc định tắt trong MVP.

- **Hiệu suất xuất**: Hệ thống cần xuất file CSV/PDF trong thời gian hợp lý, không quá `30 giây` cho lượng dữ liệu dưới 10.000 giao dịch.

- **Giới hạn kích thước**: Cần có cảnh báo khi file xuất hoặc sao lưu vượt quá ngưỡng dung lượng do PO chốt.

  

## Out of Scope

- Xuất dữ liệu ra định dạng khác ngoài CSV và PDF, ví dụ Excel (.xlsx), JSON, OFX.

- Đồng bộ sao lưu real-time đa thiết bị.

- Sao lưu lên dịch vụ cloud bên thứ ba (Google Drive, Dropbox, iCloud) nếu PO chưa xác nhận.

- Chia sẻ file xuất hoặc bản sao lưu cho người dùng khác trong ứng dụng.

- Khôi phục từng phần dữ liệu chọn lọc từ bản sao lưu (chỉ khôi phục giao dịch mà không khôi phục cài đặt).

- In trực tiếp báo cáo PDF từ ứng dụng.

  

## Open Questions

- [ ] Nơi lưu trữ bản sao lưu là cloud (server app), bộ nhớ thiết bị hay cả hai?

- [ ] Dung lượng tối đa cho file sao lưu là bao nhiêu? Có giới hạn số lượng bản sao lưu mỗi người dùng không?

- [ ] Tần suất sao lưu tự động hỗ trợ gồm những mức nào (hàng ngày, hàng tuần, hàng tháng)?

- [ ] Số bản sao lưu tự động tối đa được giữ lại là bao nhiêu trước khi xóa bản cũ nhất?

- [ ] Khi khôi phục, chính sách là ghi đè hoàn toàn hay cho phép gộp (merge) dữ liệu?

- [ ] Thời gian lưu trữ file CSV/PDF đã xuất trên hệ thống trước khi tự động dọn dẹp là bao lâu?

- [ ] Có cần hỗ trợ lọc theo nhiều danh mục hoặc nhiều ví cùng lúc trong một lần xuất không?

- [ ] Biểu đồ trong file PDF xuất ra có giống 100% giao diện báo cáo trên app hay chỉ cần dạng đơn giản hơn?

- [ ] Thuật toán mã hóa cụ thể cho bản sao lưu sẽ được chốt ở REQ-08 hay cần Tech Lead quyết định riêng?

  

## Hướng dẫn phê duyệt

> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-07.md` → `REQ-07.md`  

> Sau khi đổi tên, BA mới chuyển sang tạo DRAFT cho `REQ-08`.

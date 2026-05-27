---
tags:
  - nien-luan
---
# REQ-03: Quản lý Ngân sách (Budget Management)

  

## Metadata

- **Brief nguồn**: `Yêu cầu tính năng.md` — mục 3: Quản lý ngân sách; tham chiếu `REQ-02.md` (FR-02-08 nhận diện giao dịch `Ngân sách`)

- **Ngày tạo**: 25/05/2026

- **Lần cập nhật cuối**: 27/05/2026 — khởi tạo DRAFT REQ-03

- **Trạng thái**: DRAFT — chờ PO phê duyệt

  

## Tóm tắt

Tính năng Quản lý Ngân sách cho phép người dùng thiết lập hạn mức chi tiêu theo danh mục hoặc tổng thể trong kỳ tuần hoặc tháng. Hệ thống tự động theo dõi tiến độ chi tiêu so với ngân sách đã đặt, chủ động cảnh báo khi chi tiêu đạt các ngưỡng 70%, 90% và 100% hạn mức. Người dùng có thể thiết lập, chỉnh sửa, xem tóm tắt và xóa ngân sách thông qua giao diện hội thoại bằng ngôn ngữ tự nhiên trong chat. Hệ thống ghi nhận lịch sử thay đổi ngân sách để phục vụ truy vết và hỗ trợ tính năng tự động chuyển/tích lũy ngân sách chưa dùng hết (rollover) sang kỳ tiếp theo. Ngân sách được gắn với danh mục từ REQ-02 và là dữ liệu đầu vào cho báo cáo ngân sách tại REQ-04.

  

## Phân tích yêu cầu

  

### Actors

- **User**: Người dùng cuối thiết lập, chỉnh sửa, xem, xóa ngân sách và nhận cảnh báo chi tiêu.

- **AI Engine**: Thành phần xử lý ngôn ngữ tự nhiên để hiểu yêu cầu ngân sách từ chat, tạo tóm tắt ngân sách và chủ động gửi cảnh báo/insight.

- **System**: Ứng dụng lưu trữ ngân sách, tính toán tiến độ chi tiêu, kích hoạt cảnh báo tại các ngưỡng, quản lý rollover và ghi nhận lịch sử thay đổi.

- **Admin/Reviewer**: Người theo dõi log hệ thống và đánh giá chất lượng nhận diện yêu cầu ngân sách từ AI.

  

### Features

- Thiết lập ngân sách theo danh mục chi phí với kỳ tuần hoặc tháng.

- Thiết lập ngân sách tổng thể cho toàn bộ chi phí với kỳ tuần hoặc tháng.

- Theo dõi tiến độ chi tiêu real-time so với hạn mức ngân sách đã đặt.

- Cảnh báo chủ động khi chi tiêu đạt ngưỡng 70%, 90% và 100% hạn mức.

- Thiết lập và chỉnh sửa ngân sách bằng ngôn ngữ tự nhiên trong chat.

- Xem tóm tắt ngân sách trong chat.

- Ghi nhận lịch sử thay đổi ngân sách.

- Tự động chuyển/tích lũy ngân sách chưa dùng hết sang kỳ tiếp theo (rollover).

- Xóa/hủy ngân sách.

  

### Constraints

- Ngân sách là dữ liệu per-user; thay đổi ngân sách của một người dùng không ảnh hưởng đến người dùng khác.

- Ngân sách theo danh mục phải liên kết với danh mục chi phí đang tồn tại trong danh sách danh mục của người dùng (theo REQ-02).

- Khi danh mục bị xóa cứng (theo FR-02-05, FR-02-06), ngân sách liên kết với danh mục đó cũng phải bị xóa.

- Mỗi danh mục chỉ có tối đa một ngân sách đang hoạt động trong cùng một kỳ.

- Ngân sách tổng thể và ngân sách theo danh mục có thể tồn tại song song; hệ thống cần xử lý cả hai khi theo dõi tiến độ.

- Kỳ ngân sách hỗ trợ trong MVP: tuần và tháng.

- Ngữ cảnh chat thô chỉ được giữ trong 48 giờ theo REQ-01.

- Đầu vào cần hỗ trợ tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh theo REQ-01.

- Ngân sách chỉ áp dụng cho giao dịch loại `Expense`; không áp dụng cho `Income` hoặc giao dịch đặc biệt.

  

### Ambiguities

- ⚠️ AMBIGUOUS: Chưa rõ kỳ tuần bắt đầu từ thứ Hai hay Chủ Nhật, hoặc có cho phép người dùng tùy chỉnh ngày bắt đầu tuần hay không.

- ⚠️ AMBIGUOUS: Chưa rõ hành vi khi người dùng đặt ngân sách theo danh mục vượt quá ngân sách tổng thể — hệ thống có cần cảnh báo hay không.

- ⚠️ AMBIGUOUS: Chưa rõ rollover có giới hạn tối đa số tiền tích lũy hoặc số kỳ liên tiếp được rollover hay không.

- ⚠️ AMBIGUOUS: Chưa rõ ngân sách có thể áp dụng cho danh mục phụ hay chỉ danh mục chính.

- ⚠️ AMBIGUOUS: Chưa rõ khi giao dịch bị chỉnh sửa (sửa số tiền hoặc đổi danh mục), hệ thống có cần tính lại tiến độ ngân sách ngay lập tức hay không.

  

### Out of Scope sơ bộ

- Thiết lập ngân sách theo kỳ quý hoặc năm.

- Ngân sách cho giao dịch thu nhập hoặc giao dịch đặc biệt.

- Ngân sách nhóm/chia sẻ giữa nhiều người dùng.

- Tự động đề xuất hạn mức ngân sách dựa trên lịch sử chi tiêu (AI auto-suggest).

- Báo cáo chi tiết ngân sách — thuộc phạm vi REQ-04.

  

## Actors

- **User**: Người dùng cuối thiết lập, chỉnh sửa, xem, xóa ngân sách và nhận cảnh báo chi tiêu.

- **AI Engine**: Thành phần xử lý ngôn ngữ tự nhiên để hiểu yêu cầu ngân sách từ chat và tạo tóm tắt/cảnh báo.

- **System**: Ứng dụng lưu ngân sách, tính toán tiến độ, kích hoạt cảnh báo, quản lý rollover và ghi nhận lịch sử.

- **Admin/Reviewer**: Người theo dõi log hệ thống để đánh giá chất lượng nhận diện yêu cầu ngân sách.

  

## Yêu cầu Chức năng

  

### FR-03-01: Thiết lập ngân sách theo danh mục

**Mô tả**: Người dùng có thể thiết lập hạn mức chi tiêu cho một danh mục chi phí cụ thể trong kỳ tuần hoặc tháng. Ngân sách theo danh mục phải liên kết với danh mục chi phí đang tồn tại trong danh sách danh mục của người dùng.

  

**Acceptance Criteria**:

- Given người dùng muốn đặt ngân sách cho danh mục `Ăn uống`

  When người dùng chọn danh mục `Ăn uống`, nhập hạn mức `2.000.000đ` và chọn kỳ `tháng`

  Then hệ thống tạo ngân sách `Ăn uống` với hạn mức `2.000.000đ` cho kỳ tháng hiện tại và lưu vào hệ thống.

  

- Given người dùng muốn đặt ngân sách cho danh mục `Di chuyển`

  When người dùng chọn danh mục `Di chuyển`, nhập hạn mức `500.000đ` và chọn kỳ `tuần`

  Then hệ thống tạo ngân sách `Di chuyển` với hạn mức `500.000đ` cho kỳ tuần hiện tại.

  

- Given người dùng đã có ngân sách đang hoạt động cho danh mục `Ăn uống` trong kỳ tháng

  When người dùng cố gắng tạo thêm một ngân sách tháng khác cho `Ăn uống`

  Then hệ thống từ chối tạo trùng và thông báo rằng danh mục đã có ngân sách đang hoạt động trong cùng kỳ, đồng thời gợi ý chỉnh sửa ngân sách hiện tại.

  

- Given người dùng muốn đặt ngân sách cho một danh mục không tồn tại trong danh sách danh mục của người dùng

  When người dùng chọn hoặc nhập tên danh mục không có trong hệ thống

  Then hệ thống từ chối tạo ngân sách và thông báo rằng danh mục không tồn tại, gợi ý tạo danh mục trước.

  

- Given người dùng muốn đặt ngân sách cho danh mục thuộc nhóm `Income`

  When người dùng chọn danh mục thu nhập, ví dụ `Lương`

  Then hệ thống từ chối tạo ngân sách và thông báo rằng ngân sách chỉ áp dụng cho danh mục chi phí.

  

- Given người dùng nhập hạn mức bằng `0` hoặc số âm

  When hệ thống kiểm tra dữ liệu đầu vào

  Then hệ thống từ chối tạo ngân sách và yêu cầu nhập hạn mức lớn hơn `0`.

  

⚠️ AMBIGUOUS: Chưa rõ ngân sách có thể áp dụng cho danh mục phụ (subcategory) hay chỉ áp dụng cho danh mục chính.

  

### FR-03-02: Thiết lập ngân sách tổng thể

**Mô tả**: Người dùng có thể thiết lập hạn mức chi tiêu tổng thể cho toàn bộ chi phí trong kỳ tuần hoặc tháng. Ngân sách tổng thể áp dụng cho tất cả giao dịch chi phí bất kể danh mục.

  

**Acceptance Criteria**:

- Given người dùng muốn đặt ngân sách tổng thể

  When người dùng nhập hạn mức `10.000.000đ` và chọn kỳ `tháng`

  Then hệ thống tạo ngân sách tổng thể với hạn mức `10.000.000đ` cho kỳ tháng hiện tại.

  

- Given người dùng đã có ngân sách tổng thể đang hoạt động cho kỳ tháng

  When người dùng cố gắng tạo thêm một ngân sách tổng thể tháng khác

  Then hệ thống từ chối tạo trùng và thông báo rằng đã có ngân sách tổng thể đang hoạt động trong cùng kỳ, gợi ý chỉnh sửa ngân sách hiện tại.

  

- Given người dùng đã có ngân sách tổng thể `10.000.000đ/tháng` và ngân sách theo danh mục `Ăn uống 2.000.000đ/tháng`, `Di chuyển 1.000.000đ/tháng`

  When hệ thống theo dõi tiến độ chi tiêu

  Then hệ thống theo dõi đồng thời ngân sách tổng thể lẫn ngân sách theo từng danh mục và cảnh báo độc lập cho mỗi ngân sách khi đạt ngưỡng.

  

- Given người dùng nhập hạn mức tổng thể nhỏ hơn tổng hạn mức các ngân sách danh mục đang hoạt động

  When hệ thống kiểm tra dữ liệu đầu vào

  Then hệ thống hiển thị cảnh báo rằng hạn mức tổng thể thấp hơn tổng hạn mức danh mục nhưng vẫn cho phép lưu nếu người dùng xác nhận.

  

⚠️ AMBIGUOUS: Chưa rõ khi tổng ngân sách theo danh mục vượt ngân sách tổng thể, hệ thống chỉ cảnh báo hay bắt buộc điều chỉnh.

  

### FR-03-03: Theo dõi tiến độ chi tiêu so với ngân sách

**Mô tả**: Hệ thống tự động tính toán và cập nhật tiến độ chi tiêu thực tế so với hạn mức ngân sách đã đặt. Tiến độ được tính dựa trên tổng giá trị giao dịch chi phí thuộc danh mục và kỳ tương ứng.

  

**Acceptance Criteria**:

- Given người dùng đã đặt ngân sách `Ăn uống 2.000.000đ/tháng`

  When người dùng tạo giao dịch chi phí `trà sữa 50.000đ` thuộc danh mục `Ăn uống` trong tháng hiện tại

  Then hệ thống cập nhật tiến độ chi tiêu ngân sách `Ăn uống` thành `50.000đ / 2.000.000đ` (2.5%).

  

- Given người dùng đã đặt ngân sách tổng thể `10.000.000đ/tháng`

  When người dùng tạo giao dịch chi phí bất kỳ trong tháng hiện tại

  Then hệ thống cập nhật tiến độ chi tiêu ngân sách tổng thể bằng cách cộng thêm số tiền giao dịch mới.

  

- Given người dùng chỉnh sửa số tiền của một giao dịch chi phí đã lưu trong kỳ ngân sách hiện tại

  When giao dịch đã chỉnh sửa thuộc danh mục có ngân sách đang hoạt động

  Then hệ thống tính lại tiến độ chi tiêu ngân sách theo số tiền mới.

  

- Given người dùng xóa một giao dịch chi phí trong kỳ ngân sách hiện tại

  When giao dịch bị xóa thuộc danh mục có ngân sách đang hoạt động

  Then hệ thống trừ số tiền giao dịch đã xóa khỏi tiến độ chi tiêu ngân sách.

  

- Given người dùng đổi danh mục của một giao dịch chi phí từ `Ăn uống` sang `Giải trí`

  When cả hai danh mục đều có ngân sách đang hoạt động

  Then hệ thống trừ số tiền giao dịch khỏi tiến độ ngân sách `Ăn uống` và cộng vào tiến độ ngân sách `Giải trí`.

  

- Given giao dịch thuộc loại `Income` hoặc giao dịch đặc biệt

  When hệ thống tính toán tiến độ ngân sách

  Then hệ thống không tính giao dịch `Income` hoặc giao dịch đặc biệt vào tiến độ chi tiêu ngân sách.

  

### FR-03-04: Cảnh báo khi gần/vượt ngân sách

**Mô tả**: Hệ thống chủ động gửi cảnh báo cho người dùng khi tiến độ chi tiêu đạt các ngưỡng `70%`, `90%` và `100%` hạn mức ngân sách. Cảnh báo được gửi trực tiếp trong giao diện chat.

  

**Acceptance Criteria**:

- Given người dùng đã đặt ngân sách `Ăn uống 2.000.000đ/tháng` và tiến độ chi tiêu hiện tại chưa đến 70%

  When người dùng tạo giao dịch chi phí `Ăn uống` khiến tổng chi tiêu đạt hoặc vượt `1.400.000đ` (70%)

  Then hệ thống gửi cảnh báo trong chat thông báo chi tiêu `Ăn uống` đã đạt 70% hạn mức ngân sách.

  

- Given tiến độ chi tiêu danh mục `Ăn uống` đã vượt ngưỡng 70% nhưng chưa đến 90%

  When người dùng tạo giao dịch chi phí `Ăn uống` khiến tổng chi tiêu đạt hoặc vượt `1.800.000đ` (90%)

  Then hệ thống gửi cảnh báo trong chat thông báo chi tiêu `Ăn uống` đã đạt 90% hạn mức ngân sách.

  

- Given tiến độ chi tiêu danh mục `Ăn uống` đã vượt ngưỡng 90% nhưng chưa đến 100%

  When người dùng tạo giao dịch chi phí `Ăn uống` khiến tổng chi tiêu đạt hoặc vượt `2.000.000đ` (100%)

  Then hệ thống gửi cảnh báo trong chat thông báo chi tiêu `Ăn uống` đã đạt hoặc vượt 100% hạn mức ngân sách.

  

- Given tiến độ chi tiêu đã vượt 100% hạn mức ngân sách

  When người dùng tiếp tục tạo giao dịch chi phí trong cùng danh mục và cùng kỳ

  Then hệ thống không gửi thêm cảnh báo lặp lại cho cùng ngưỡng đã cảnh báo nhưng vẫn cho phép người dùng tạo giao dịch.

  

- Given người dùng đã đặt cả ngân sách tổng thể và ngân sách theo danh mục

  When chi tiêu vượt ngưỡng cảnh báo của ngân sách tổng thể

  Then hệ thống gửi cảnh báo riêng cho ngân sách tổng thể, độc lập với cảnh báo ngân sách theo danh mục.

  

- Given hệ thống gửi cảnh báo ngân sách trong chat

  When người dùng nhận được cảnh báo

  Then cảnh báo phải bao gồm tên ngân sách hoặc danh mục, ngưỡng đã đạt, số tiền đã chi và hạn mức ngân sách.

  

⚠️ AMBIGUOUS: Chưa rõ có cần hỗ trợ push notification ngoài app hoặc cảnh báo ngoài giao diện chat hay không, ví dụ notification trên thiết bị.

  

### FR-03-05: Thiết lập ngân sách bằng ngôn ngữ tự nhiên trong chat

**Mô tả**: Người dùng có thể thiết lập hoặc chỉnh sửa ngân sách bằng câu lệnh hội thoại tự nhiên trong chat. AI Engine phân tích yêu cầu để xác định danh mục, hạn mức và kỳ ngân sách. Tính năng này liên kết với FR-02-08 khi REQ-02 nhận diện input liên quan đến `Ngân sách` và chuyển sang luồng xử lý ngân sách thay vì tạo giao dịch chi phí thông thường.

  

**Acceptance Criteria**:

- Given người dùng nhập `đặt ngân sách ăn uống tháng này 2 triệu`

  When AI Engine xử lý đầu vào

  Then hệ thống tạo ngân sách cho danh mục `Ăn uống` với hạn mức `2.000.000đ` và kỳ tháng hiện tại.

  

- Given người dùng nhập `budget for food this month 2 million`

  When AI Engine xử lý đầu vào bằng tiếng Anh

  Then hệ thống tạo ngân sách cho danh mục `Ăn uống` (hoặc tên danh mục tương ứng) với hạn mức `2.000.000đ` và kỳ tháng hiện tại.

  

- Given người dùng nhập `đặt ngân sách tổng 10 triệu/tháng`

  When AI Engine xử lý đầu vào

  Then hệ thống tạo ngân sách tổng thể với hạn mức `10.000.000đ` cho kỳ tháng hiện tại.

  

- Given người dùng nhập `tăng ngân sách ăn uống lên 3 triệu`

  When AI Engine xử lý đầu vào và xác định ngân sách `Ăn uống` đang hoạt động

  Then hệ thống cập nhật hạn mức ngân sách `Ăn uống` thành `3.000.000đ` và ghi nhận thay đổi vào lịch sử.

  

- Given người dùng nhập `giảm ngân sách di chuyển xuống 300k`

  When AI Engine xử lý đầu vào và xác định ngân sách `Di chuyển` đang hoạt động

  Then hệ thống cập nhật hạn mức ngân sách `Di chuyển` thành `300.000đ` và ghi nhận thay đổi vào lịch sử.

  

- Given người dùng nhập yêu cầu ngân sách nhưng thiếu thông tin, ví dụ `đặt ngân sách 2 triệu` mà không rõ danh mục hoặc kỳ

  When AI Engine không xác định đủ thông tin

  Then hệ thống hỏi lại người dùng các thông tin còn thiếu trước khi tạo ngân sách.

  

- Given người dùng nhập yêu cầu ngân sách cho danh mục không tồn tại, ví dụ `đặt ngân sách du lịch 5 triệu/tháng`

  When danh mục `Du lịch` không có trong danh sách danh mục của người dùng

  Then hệ thống thông báo danh mục không tồn tại và gợi ý tạo danh mục mới trước khi đặt ngân sách.

  

### FR-03-06: Xem tóm tắt ngân sách trong chat

**Mô tả**: Người dùng có thể yêu cầu xem tóm tắt tình trạng ngân sách hiện tại bằng ngôn ngữ tự nhiên trong chat. Hệ thống phản hồi bản tóm tắt bao gồm danh sách ngân sách đang hoạt động, hạn mức, số tiền đã chi và tỷ lệ phần trăm tiến độ.

  

**Acceptance Criteria**:

- Given người dùng nhập `ngân sách tháng này thế nào?`

  When hệ thống xử lý yêu cầu

  Then hệ thống phản hồi tóm tắt toàn bộ ngân sách đang hoạt động trong kỳ tháng hiện tại, bao gồm ngân sách tổng thể và ngân sách theo từng danh mục.

  

- Given người dùng nhập `ngân sách ăn uống còn bao nhiêu?`

  When hệ thống xử lý yêu cầu và xác định danh mục `Ăn uống`

  Then hệ thống phản hồi thông tin ngân sách `Ăn uống` gồm hạn mức, số tiền đã chi, số tiền còn lại và tỷ lệ phần trăm tiến độ.

  

- Given người dùng nhập `how is my budget this week?`

  When hệ thống xử lý yêu cầu bằng tiếng Anh

  Then hệ thống phản hồi tóm tắt ngân sách đang hoạt động trong kỳ tuần hiện tại.

  

- Given người dùng không có ngân sách nào đang hoạt động

  When người dùng yêu cầu xem tóm tắt ngân sách

  Then hệ thống thông báo rằng chưa có ngân sách nào được thiết lập và gợi ý cách tạo ngân sách.

  

- Given bản tóm tắt ngân sách được hiển thị

  When hệ thống phản hồi trong chat

  Then bản tóm tắt phải bao gồm: tên ngân sách (hoặc danh mục), kỳ, hạn mức, số tiền đã chi, số tiền còn lại và tỷ lệ phần trăm tiến độ.

  

### FR-03-07: Lịch sử thay đổi ngân sách

**Mô tả**: Hệ thống ghi nhận mọi thay đổi liên quan đến ngân sách để phục vụ truy vết, bao gồm thời điểm tạo, chỉnh sửa hạn mức, thay đổi kỳ, bật/tắt rollover và xóa ngân sách.

  

**Acceptance Criteria**:

- Given người dùng tạo ngân sách mới

  When hệ thống lưu ngân sách thành công

  Then hệ thống ghi nhận bản ghi lịch sử gồm thời điểm tạo, danh mục, hạn mức và kỳ.

  

- Given người dùng chỉnh sửa hạn mức ngân sách từ `2.000.000đ` lên `3.000.000đ`

  When hệ thống cập nhật hạn mức thành công

  Then hệ thống ghi nhận bản ghi lịch sử gồm thời điểm chỉnh sửa, hạn mức cũ và hạn mức mới.

  

- Given người dùng bật hoặc tắt tính năng rollover cho một ngân sách

  When hệ thống cập nhật trạng thái rollover

  Then hệ thống ghi nhận bản ghi lịch sử gồm thời điểm thay đổi và trạng thái rollover mới.

  

- Given người dùng xóa một ngân sách

  When hệ thống xóa ngân sách thành công

  Then hệ thống ghi nhận bản ghi lịch sử gồm thời điểm xóa và thông tin ngân sách đã xóa.

  

- Given người dùng muốn xem lịch sử thay đổi ngân sách

  When người dùng yêu cầu xem lịch sử trong chat hoặc giao diện

  Then hệ thống hiển thị danh sách các thay đổi theo thứ tự thời gian giảm dần.

  

⚠️ AMBIGUOUS: Chưa rõ lịch sử thay đổi ngân sách được giữ trong bao lâu và có giới hạn số bản ghi hay không.

  

### FR-03-08: Tự động chuyển/tích lũy ngân sách chưa dùng hết (Rollover)

**Mô tả**: Khi kỳ ngân sách kết thúc và người dùng chưa chi hết hạn mức, hệ thống có thể tự động chuyển số tiền ngân sách còn lại sang kỳ tiếp theo nếu tính năng rollover được bật. Tính năng rollover có thể bật/tắt cho từng ngân sách riêng lẻ.

  

**Acceptance Criteria**:

- Given người dùng đã đặt ngân sách `Ăn uống 2.000.000đ/tháng` với rollover đang bật

  When kỳ tháng kết thúc và chi tiêu thực tế là `1.500.000đ`

  Then hệ thống tạo ngân sách `Ăn uống` cho kỳ tháng tiếp theo với hạn mức `2.500.000đ` (hạn mức gốc `2.000.000đ` + rollover `500.000đ`).

  

- Given người dùng đã đặt ngân sách `Ăn uống 2.000.000đ/tháng` với rollover đang tắt

  When kỳ tháng kết thúc và chi tiêu thực tế là `1.500.000đ`

  Then hệ thống tạo ngân sách `Ăn uống` cho kỳ tháng tiếp theo với hạn mức gốc `2.000.000đ`, không cộng thêm phần chưa dùng hết.

  

- Given người dùng đã đặt ngân sách `Ăn uống 2.000.000đ/tháng` với rollover đang bật

  When kỳ tháng kết thúc và chi tiêu thực tế vượt hạn mức, ví dụ `2.300.000đ`

  Then hệ thống tạo ngân sách `Ăn uống` cho kỳ tháng tiếp theo với hạn mức `1.700.000đ` (hạn mức gốc `2.000.000đ` - phần vượt `300.000đ`).

  

- Given người dùng bật rollover cho ngân sách đang hoạt động

  When người dùng gửi yêu cầu bật rollover trong chat, ví dụ `bật rollover cho ngân sách ăn uống`

  Then hệ thống cập nhật trạng thái rollover thành bật và phản hồi xác nhận.

  

- Given người dùng tắt rollover cho ngân sách đang hoạt động

  When người dùng gửi yêu cầu tắt rollover

  Then hệ thống cập nhật trạng thái rollover thành tắt và phản hồi xác nhận; kỳ tiếp theo sẽ sử dụng hạn mức gốc.

  

- Given ngân sách tổng thể có rollover đang bật

  When kỳ tổng thể kết thúc và còn ngân sách chưa dùng hết

  Then hệ thống áp dụng rollover cho ngân sách tổng thể tương tự như ngân sách theo danh mục.

  

⚠️ AMBIGUOUS: Chưa rõ khi rollover khiến hạn mức kỳ tiếp theo giảm về `0` hoặc âm do vượt chi nhiều kỳ liên tiếp, hệ thống xử lý thế nào — có đặt hạn mức tối thiểu hay không.

  

### FR-03-09: Xóa/hủy ngân sách

**Mô tả**: Người dùng có thể xóa hoặc hủy một ngân sách đang hoạt động. Khi xóa, hệ thống ngừng theo dõi tiến độ chi tiêu và ngừng gửi cảnh báo cho ngân sách đó. Giao dịch chi phí đã ghi nhận không bị ảnh hưởng.

  

**Acceptance Criteria**:

- Given người dùng muốn xóa ngân sách `Ăn uống` đang hoạt động

  When người dùng gửi yêu cầu xóa ngân sách

  Then hệ thống hiển thị xác nhận trước khi xóa, bao gồm thông tin ngân sách sẽ bị xóa.

  

- Given hệ thống đã hiển thị xác nhận xóa ngân sách

  When người dùng xác nhận xóa

  Then hệ thống xóa ngân sách, ngừng theo dõi tiến độ chi tiêu và ngừng gửi cảnh báo cho ngân sách đó.

  

- Given hệ thống đã hiển thị xác nhận xóa ngân sách

  When người dùng hủy thao tác

  Then hệ thống không xóa ngân sách và ngân sách vẫn tiếp tục hoạt động bình thường.

  

- Given người dùng xóa ngân sách bằng ngôn ngữ tự nhiên, ví dụ `xóa ngân sách ăn uống`

  When AI Engine xử lý đầu vào và xác định ngân sách `Ăn uống` đang hoạt động

  Then hệ thống chuyển sang luồng xác nhận xóa trước khi thực hiện.

  

- Given người dùng xóa ngân sách

  When hệ thống hoàn tất xóa

  Then các giao dịch chi phí đã ghi nhận trong kỳ ngân sách vừa xóa không bị ảnh hưởng.

  

- Given danh mục bị xóa cứng theo REQ-02 (FR-02-05, FR-02-06)

  When danh mục bị xóa có ngân sách liên kết đang hoạt động

  Then hệ thống tự động xóa ngân sách liên kết với danh mục đã bị xóa cứng.

  

- Given người dùng nhập yêu cầu xóa ngân sách nhưng có nhiều ngân sách khớp

  When AI Engine không xác định được duy nhất ngân sách cần xóa

  Then hệ thống hỏi lại người dùng để chọn đúng ngân sách trước khi xóa.

  

## Yêu cầu Phi chức năng (NFR)

- **Ngôn ngữ đầu vào**: Hệ thống cần hỗ trợ thiết lập và quản lý ngân sách bằng tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh.

- **Kỳ ngân sách**: MVP hỗ trợ kỳ tuần và tháng.

- **Giới hạn ngân sách trùng**: Mỗi danh mục chỉ được có tối đa một ngân sách đang hoạt động trong cùng một kỳ; ngân sách tổng thể cũng chỉ có tối đa một ngân sách đang hoạt động trong cùng một kỳ.

- **Phạm vi ngân sách**: Ngân sách chỉ áp dụng cho giao dịch chi phí (`Expense`); không áp dụng cho `Income` hoặc giao dịch đặc biệt.

- **Liên kết danh mục**: Ngân sách theo danh mục phải liên kết với danh mục chi phí đang tồn tại theo REQ-02; khi danh mục bị xóa cứng, ngân sách liên kết cũng bị xóa.

- **Cập nhật tiến độ**: Tiến độ chi tiêu ngân sách phải được cập nhật khi tạo, sửa, xóa hoặc đổi danh mục giao dịch chi phí.

- **Cảnh báo proactive**: Hệ thống phải chủ động gửi cảnh báo ngân sách tại các ngưỡng 70%, 90% và 100% mà không cần người dùng yêu cầu.

- **Không chặn giao dịch**: Hệ thống không chặn người dùng tạo giao dịch chi phí khi đã vượt hạn mức ngân sách; chỉ cảnh báo.

- **Lịch sử thay đổi**: Mọi thay đổi ngân sách cần được ghi nhận vào lịch sử để truy vết.

- **Dữ liệu per-user**: Ngân sách là dữ liệu riêng tư của từng người dùng.

- **Bảo mật**: Dữ liệu ngân sách, lịch sử thay đổi ngân sách phải được xem là dữ liệu nhạy cảm và chỉ hiển thị cho đúng người dùng sở hữu hoặc vai trò được phép.

- **Quản lý ngữ cảnh**: Nội dung chat thô chỉ được dùng trong thời hạn ngữ cảnh 48 giờ theo REQ-01.

- **Tích hợp REQ-02**: Khi REQ-02 nhận diện input liên quan đến `Ngân sách` (FR-02-08), hệ thống phải chuyển sang luồng xử lý ngân sách thay vì tạo giao dịch chi phí thông thường.

- **Tích hợp REQ-04**: Dữ liệu ngân sách phải sẵn sàng phục vụ báo cáo ngân sách tại REQ-04 (FR-04-06).

  

## Out of Scope

- Thiết lập ngân sách theo kỳ quý hoặc năm.

- Ngân sách cho giao dịch thu nhập hoặc giao dịch đặc biệt.

- Ngân sách nhóm/chia sẻ giữa nhiều người dùng.

- Tự động đề xuất hạn mức ngân sách dựa trên lịch sử chi tiêu (AI auto-suggest budget).

- Báo cáo biểu đồ chi tiết về ngân sách — thuộc phạm vi REQ-04.

- Đồng bộ ngân sách với ứng dụng/ngân hàng bên ngoài.

- Quản lý chi tiết ví/tài khoản — thuộc phạm vi REQ-05.

  

## Open Questions

- [ ] Kỳ tuần bắt đầu từ thứ Hai hay Chủ Nhật? Có cho phép người dùng tùy chỉnh ngày bắt đầu tuần hay không?

- [ ] Khi tổng ngân sách theo danh mục vượt ngân sách tổng thể, hệ thống chỉ cảnh báo hay bắt buộc người dùng điều chỉnh?

- [ ] Rollover có giới hạn tối đa số tiền tích lũy hoặc số kỳ liên tiếp được rollover hay không?

- [ ] Khi rollover khiến hạn mức kỳ tiếp theo giảm về 0 hoặc âm, hệ thống xử lý thế nào? Có đặt hạn mức tối thiểu không?

- [ ] Ngân sách có thể áp dụng cho danh mục phụ (subcategory) hay chỉ áp dụng cho danh mục chính?

- [ ] Lịch sử thay đổi ngân sách được giữ trong bao lâu và có giới hạn số bản ghi hay không?

- [ ] Có cần hỗ trợ push notification ngoài app hoặc cảnh báo ngoài giao diện chat hay không?

- [ ] Khi giao dịch bị chỉnh sửa (sửa số tiền hoặc đổi danh mục), hệ thống cần tính lại tiến độ ngân sách ngay lập tức hay cho phép độ trễ?

  

## Hướng dẫn phê duyệt

> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-03.md` → `REQ-03.md`  

> Sau khi đổi tên, BA mới chuyển sang tạo DRAFT cho `REQ-04`.

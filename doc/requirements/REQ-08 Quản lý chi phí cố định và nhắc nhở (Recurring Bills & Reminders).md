---
tags:
  - nien-luan
---
# REQ-08: Quản lý Chi phí Cố định & Nhắc nhở (Recurring Bills & Reminders)

  

## Metadata

- **Brief nguồn**: `Yêu cầu tính năng.md` — mục 6: Phân tách Dòng tiền & Tài sản — phần Quản lý chi phí cố định (Recurring Bills); tham chiếu `REQ-01`, `REQ-02`, `REQ-05`, `REQ-06`

- **Ngày tạo**: 28/05/2026

- **Lần cập nhật cuối**: 28/05/2026 — bản DRAFT đầu tiên

- **Trạng thái**: DRAFT — chờ PO phê duyệt

  

## Tóm tắt

Tính năng Quản lý Chi phí Cố định & Nhắc nhở cho phép người dùng thiết lập, theo dõi và quản lý các khoản chi phí có tính chất lặp lại theo chu kỳ cố định (hàng tuần, hàng tháng, hàng quý, hàng năm) như tiền nhà trọ, điện nước, Internet, bảo hiểm, học phí, trả góp. AI Engine có khả năng tự động nhận diện các khoản chi phí cố định tiềm năng từ lịch sử giao dịch của người dùng và đề xuất tạo lịch nhắc nhở. Khi đến hạn thanh toán, chatbot chủ động gửi tin nhắn nhắc nhở cho người dùng với nội dung cá nhân hóa, ví dụ: *"Hôm nay đến hạn đóng 1.500.000đ tiền phòng trọ, bạn đã thanh toán chưa để tôi cập nhật số dư?"*. Người dùng có thể xác nhận thanh toán trực tiếp qua chat, hệ thống tự động ghi nhận giao dịch và cập nhật số dư ví tương ứng (REQ-05). Ngoài ra, người dùng có thể quản lý danh sách chi phí cố định (xem, sửa, xóa), tạm dừng/kích hoạt lại chi phí cố định, theo dõi lịch sử thanh toán, và tạo/quản lý chi phí cố định bằng ngôn ngữ tự nhiên qua giao diện chat (REQ-01). Dữ liệu chi phí cố định được tích hợp với hệ thống phân loại (REQ-02) và dòng tiền (REQ-06) để cung cấp bức tranh tài chính toàn diện cho người dùng.

  

## Phân tích yêu cầu

  

### Actors

- **User**: Người dùng cuối thiết lập, quản lý, xác nhận thanh toán và theo dõi các khoản chi phí cố định.

- **AI Engine**: Thành phần nhận diện chi phí cố định từ lịch sử giao dịch, xử lý yêu cầu tạo/quản lý bằng ngôn ngữ tự nhiên, và gửi nhắc nhở chủ động.

- **System**: Ứng dụng lưu trữ danh sách chi phí cố định, lên lịch nhắc nhở, ghi nhận giao dịch thanh toán, cập nhật số dư ví và quản lý vòng đời chi phí cố định.

  

### Features

- Thiết lập chi phí cố định với thông tin: tên, số tiền, danh mục, ví thanh toán, chu kỳ lặp lại và ngày thanh toán.

- AI tự động nhận diện các khoản chi phí cố định tiềm năng từ lịch sử giao dịch.

- Nhắc nhở chủ động khi đến hạn thanh toán qua giao diện chat.

- Xác nhận thanh toán nhanh qua chat và tự động ghi nhận giao dịch vào ví tương ứng.

- Quản lý danh sách chi phí cố định: xem, sửa, xóa.

- Tạo và quản lý chi phí cố định bằng ngôn ngữ tự nhiên qua chat.

- Tạm dừng/Kích hoạt lại chi phí cố định.

- Theo dõi lịch sử thanh toán chi phí cố định.

  

### Constraints

- Mỗi chi phí cố định phải gắn với một ví/tài khoản thanh toán hợp lệ (REQ-05).

- Giao dịch thanh toán chi phí cố định phải được phân loại tự động theo danh mục phù hợp (REQ-02).

- Nhắc nhở phải được gửi qua giao diện chat chứ không phải push notification hệ thống (trong MVP).

- Chu kỳ lặp lại hỗ trợ: hàng tuần, hàng tháng, hàng quý, hàng năm.

- AI nhận diện chi phí cố định chỉ đề xuất, không tự động tạo — phải có xác nhận từ người dùng.

- Số tiền chi phí cố định phải dương và hợp lệ; hệ thống không cho phép tạo chi phí cố định với số tiền bằng 0 hoặc âm.

- Khi xóa chi phí cố định, lịch sử thanh toán đã ghi nhận trước đó vẫn được giữ nguyên trong danh sách giao dịch.

  

### Ambiguities

- ⚠️ AMBIGUOUS: Thời điểm gửi nhắc nhở trong ngày (sáng sớm, trưa, hay tối) chưa được PO chốt; có thể cần cho phép người dùng tùy chỉnh.

- ⚠️ AMBIGUOUS: Số ngày nhắc nhở trước hạn thanh toán (nhắc trước 1 ngày, đúng ngày, hay nhắc trước 3 ngày) chưa được xác nhận.

- ⚠️ AMBIGUOUS: Khi AI nhận diện chi phí cố định từ lịch sử, ngưỡng tối thiểu (bao nhiêu lần lặp lại liên tiếp) để xác định một khoản chi là "cố định" chưa được chốt.

- ⚠️ AMBIGUOUS: Chưa rõ có hỗ trợ chi phí cố định với số tiền thay đổi (ví dụ tiền điện nước dao động mỗi tháng) hay chỉ hỗ trợ số tiền cố định.

- ⚠️ AMBIGUOUS: Khi người dùng không phản hồi nhắc nhở, hệ thống có nhắc lại lần thứ hai hay không, và sau bao lâu.

  

### Out of Scope sơ bộ

- Thanh toán tự động qua cổng thanh toán trực tuyến (auto-pay).

- Liên kết với hệ thống ngân hàng hoặc ví điện tử để kiểm tra thanh toán đã hoàn tất hay chưa.

- Push notification hệ thống (chỉ nhắc nhở qua chat trong MVP).

- Chi phí cố định dùng chung (shared recurring bills) giữa nhiều người dùng.

- Dự đoán xu hướng tăng/giảm chi phí cố định theo thời gian.

  

## Actors

- **User**: Người dùng cuối thiết lập, quản lý, xác nhận thanh toán và theo dõi lịch sử thanh toán các khoản chi phí cố định.

- **AI Engine**: Thành phần xử lý ngôn ngữ tự nhiên nhận diện chi phí cố định từ lịch sử, xử lý yêu cầu qua chat, và gửi nhắc nhở chủ động khi đến hạn.

- **System**: Ứng dụng quản lý vòng đời chi phí cố định, lên lịch nhắc nhở, ghi nhận giao dịch thanh toán, cập nhật số dư ví (REQ-05) và đồng bộ với dòng tiền (REQ-06).

  

## Yêu cầu Chức năng

  

### FR-08-01: Thiết lập chi phí cố định (Create Recurring Bill)

**Mô tả**: Người dùng có thể tạo một khoản chi phí cố định mới bằng cách cung cấp các thông tin: tên khoản chi, số tiền, danh mục (REQ-02), ví/tài khoản thanh toán (REQ-05), chu kỳ lặp lại (hàng tuần, hàng tháng, hàng quý, hàng năm) và ngày thanh toán dự kiến. Hệ thống lưu trữ thông tin và tự động lên lịch nhắc nhở theo chu kỳ.

  

**Acceptance Criteria**:

- Given người dùng truy cập chức năng tạo chi phí cố định
  When người dùng nhập đầy đủ thông tin: tên `Tiền phòng trọ`, số tiền `1.500.000đ`, danh mục `Nhà ở`, ví `Tiền mặt`, chu kỳ `Hàng tháng`, ngày thanh toán `Ngày 5`
  Then hệ thống tạo chi phí cố định mới với trạng thái `Đang hoạt động` và lên lịch nhắc nhở vào ngày 5 mỗi tháng.

  

- Given người dùng tạo chi phí cố định
  When người dùng không nhập một trong các trường bắt buộc (tên, số tiền, chu kỳ, ngày thanh toán)
  Then hệ thống thông báo lỗi chỉ rõ trường còn thiếu và không tạo chi phí cố định.

  

- Given người dùng nhập số tiền không hợp lệ (bằng 0, âm, hoặc ký tự không phải số)
  When hệ thống xác thực dữ liệu đầu vào
  Then hệ thống từ chối tạo và thông báo lỗi yêu cầu nhập số tiền dương hợp lệ.

  

- Given người dùng chọn ví thanh toán
  When ví được chọn là ví hợp lệ đang tồn tại trong hệ thống (REQ-05)
  Then hệ thống gán chi phí cố định vào ví đó và sử dụng ví này khi ghi nhận thanh toán.

  

- Given người dùng không chọn danh mục khi tạo chi phí cố định
  When hệ thống xử lý yêu cầu tạo
  Then hệ thống sử dụng AI Engine (REQ-02) để tự động gán danh mục phù hợp dựa trên tên khoản chi.

  

- Given người dùng tạo chi phí cố định với chu kỳ `Hàng tháng` và ngày thanh toán `Ngày 31`
  When tháng hiện tại có ít hơn 31 ngày (ví dụ tháng 2)
  Then hệ thống tự động điều chỉnh ngày thanh toán sang ngày cuối cùng của tháng đó.

  

### FR-08-02: AI tự động nhận diện chi phí cố định từ lịch sử giao dịch

**Mô tả**: AI Engine phân tích lịch sử giao dịch của người dùng để nhận diện các khoản chi lặp lại có quy luật (cùng tên hoặc mô tả tương tự, cùng khoảng số tiền, cùng chu kỳ thời gian). Khi phát hiện, AI đề xuất cho người dùng tạo chi phí cố định tương ứng.

  

**Acceptance Criteria**:

- Given người dùng đã có lịch sử giao dịch với ít nhất 3 khoản chi tương tự nhau (ví dụ `Tiền phòng trọ 1.500.000đ` vào ngày 5 trong 3 tháng liên tiếp)
  When AI Engine phân tích lịch sử giao dịch
  Then AI Engine nhận diện đây là chi phí cố định tiềm năng và gửi đề xuất qua chat: *"Tôi nhận thấy bạn thanh toán 'Tiền phòng trọ' khoảng 1.500.000đ vào ngày 5 mỗi tháng. Bạn có muốn tôi tạo nhắc nhở tự động không?"*.

  

- Given AI Engine đề xuất chi phí cố định cho người dùng
  When người dùng xác nhận đồng ý
  Then hệ thống tự động tạo chi phí cố định với thông tin được điền sẵn từ lịch sử giao dịch (tên, số tiền trung bình, chu kỳ, ngày thanh toán) và người dùng có thể chỉnh sửa trước khi lưu.

  

- Given AI Engine đề xuất chi phí cố định cho người dùng
  When người dùng từ chối đề xuất
  Then hệ thống ghi nhận lựa chọn và không đề xuất lại khoản chi đó trong ít nhất 30 ngày.

  

- Given người dùng có các giao dịch lặp lại nhưng số tiền dao động (ví dụ tiền điện: 300.000đ, 350.000đ, 280.000đ)
  When AI Engine phân tích lịch sử
  Then AI Engine vẫn nhận diện đây là chi phí cố định tiềm năng và đề xuất với số tiền trung bình, kèm ghi chú rằng số tiền có thể thay đổi mỗi kỳ.

  

- Given người dùng chưa có đủ dữ liệu lịch sử giao dịch (ít hơn 3 khoản chi lặp lại)
  When AI Engine phân tích lịch sử
  Then AI Engine không đưa ra đề xuất chi phí cố định và chờ thu thập thêm dữ liệu.

  

- Given chi phí cố định đã được tạo từ đề xuất AI trước đó
  When AI Engine phân tích lịch sử trong lần tiếp theo
  Then AI Engine không đề xuất trùng lặp với chi phí cố định đã tồn tại.

  

### FR-08-03: Nhắc nhở chủ động khi đến hạn thanh toán

**Mô tả**: Khi đến ngày thanh toán (hoặc trước ngày thanh toán theo cấu hình), hệ thống gửi nhắc nhở chủ động cho người dùng qua giao diện chat. Tin nhắn nhắc nhở có nội dung cá nhân hóa, bao gồm tên khoản chi, số tiền và ví thanh toán. Phong cách nhắc nhở phù hợp với nhân cách AI mà người dùng đang sử dụng (REQ-09).

  

**Acceptance Criteria**:

- Given chi phí cố định `Tiền phòng trọ` có ngày thanh toán là ngày 5 hàng tháng
  When đến ngày 5 của tháng hiện tại
  Then hệ thống tự động gửi tin nhắn nhắc nhở qua chat với nội dung bao gồm: tên khoản chi, số tiền, ví thanh toán và câu hỏi xác nhận thanh toán, ví dụ: *"Hôm nay đến hạn đóng 1.500.000đ tiền phòng trọ, bạn đã thanh toán chưa để tôi cập nhật số dư?"*.

  

- Given người dùng đã cấu hình nhắc nhở trước hạn 1 ngày
  When đến ngày 4 của tháng (trước hạn 1 ngày)
  Then hệ thống gửi tin nhắn nhắc nhở trước hạn: *"Ngày mai là hạn đóng 1.500.000đ tiền phòng trọ, bạn chuẩn bị sẵn nhé!"*.

  

- Given người dùng đang sử dụng nhân cách AI `Bà mẹ nghiêm khắc` (REQ-09)
  When hệ thống gửi nhắc nhở thanh toán
  Then nội dung nhắc nhở phải phù hợp với phong cách nhân cách AI đang được chọn.

  

- Given người dùng có nhiều chi phí cố định đến hạn cùng một ngày
  When đến ngày thanh toán chung
  Then hệ thống gửi một tin nhắn tổng hợp liệt kê tất cả các khoản đến hạn, tổng số tiền cần thanh toán và danh sách từng khoản chi kèm ví tương ứng.

  

- Given chi phí cố định đang ở trạng thái `Tạm dừng`
  When đến ngày thanh toán theo lịch
  Then hệ thống KHÔNG gửi nhắc nhở cho chi phí cố định đang tạm dừng.

  

- Given người dùng đã xác nhận thanh toán trước ngày đến hạn
  When đến ngày thanh toán chính thức
  Then hệ thống KHÔNG gửi nhắc nhở lại vì khoản chi đã được thanh toán trong kỳ này.

  

- Given hệ thống gửi nhắc nhở nhưng người dùng không phản hồi trong ngày
  When hết ngày thanh toán
  Then hệ thống ghi nhận khoản chi là `Chưa thanh toán` trong kỳ này và đánh dấu trạng thái quá hạn.

  

### FR-08-04: Xác nhận và ghi nhận thanh toán chi phí cố định

**Mô tả**: Khi nhận được nhắc nhở, người dùng có thể xác nhận thanh toán ngay qua giao diện chat. Hệ thống tự động tạo giao dịch chi phí (REQ-01), phân loại theo danh mục (REQ-02), trừ số dư từ ví tương ứng (REQ-05) và cập nhật trạng thái thanh toán trong kỳ.

  

**Acceptance Criteria**:

- Given hệ thống đã gửi nhắc nhở thanh toán `Tiền phòng trọ 1.500.000đ`
  When người dùng phản hồi xác nhận, ví dụ: `Đã đóng rồi` hoặc `Xong rồi`
  Then hệ thống tự động tạo giao dịch chi phí `1.500.000đ` với danh mục `Nhà ở`, trừ từ ví được cấu hình, và phản hồi xác nhận: *"Đã ghi nhận thanh toán 1.500.000đ tiền phòng trọ. Số dư ví Tiền mặt còn X đồng."*.

  

- Given hệ thống gửi nhắc nhở thanh toán
  When người dùng phản hồi rằng chưa thanh toán, ví dụ: `Chưa đóng` hoặc `Để mai`
  Then hệ thống ghi nhận trạng thái chưa thanh toán và hỏi người dùng có muốn được nhắc lại sau không.

  

- Given người dùng xác nhận thanh toán nhưng số tiền thực tế khác so với cấu hình
  When người dùng phản hồi: `Đã đóng nhưng tháng này 1.600.000đ`
  Then AI Engine nhận diện số tiền mới `1.600.000đ` và ghi nhận giao dịch với số tiền cập nhật.

  

- Given người dùng xác nhận thanh toán từ ví khác với ví được cấu hình
  When người dùng phản hồi: `Đã đóng bằng ví Momo`
  Then AI Engine nhận diện ví thanh toán khác và ghi nhận giao dịch từ ví `Momo` thay vì ví mặc định.

  

- Given người dùng xác nhận thanh toán thành công
  When hệ thống ghi nhận giao dịch
  Then giao dịch được đánh dấu liên kết với chi phí cố định tương ứng để phục vụ theo dõi lịch sử (FR-08-08).

  

- Given số dư ví thanh toán không đủ để ghi nhận giao dịch
  When người dùng xác nhận thanh toán
  Then hệ thống cảnh báo số dư không đủ, hỏi người dùng có muốn tiếp tục ghi nhận (cho phép số dư âm) hoặc chọn ví khác.

  

### FR-08-05: Quản lý danh sách chi phí cố định (Xem, Sửa, Xóa)

**Mô tả**: Người dùng có thể xem danh sách tất cả chi phí cố định, bao gồm cả đang hoạt động và tạm dừng. Người dùng có thể chỉnh sửa thông tin (tên, số tiền, chu kỳ, ngày thanh toán, ví, danh mục) hoặc xóa chi phí cố định không cần thiết.

  

**Acceptance Criteria**:

- Given người dùng truy cập danh sách chi phí cố định
  When hệ thống hiển thị danh sách
  Then danh sách hiển thị tất cả chi phí cố định của người dùng với thông tin: tên, số tiền, chu kỳ, ngày thanh toán tiếp theo, ví thanh toán, trạng thái (Đang hoạt động / Tạm dừng) và trạng thái thanh toán kỳ hiện tại.

  

- Given người dùng muốn chỉnh sửa chi phí cố định
  When người dùng thay đổi số tiền từ `1.500.000đ` sang `1.800.000đ`
  Then hệ thống cập nhật số tiền mới và áp dụng từ kỳ thanh toán tiếp theo, các giao dịch đã ghi nhận trước đó không bị ảnh hưởng.

  

- Given người dùng muốn thay đổi chu kỳ thanh toán
  When người dùng thay đổi từ `Hàng tháng` sang `Hàng quý`
  Then hệ thống cập nhật lịch nhắc nhở theo chu kỳ mới và tính ngày thanh toán tiếp theo dựa trên chu kỳ quý.

  

- Given người dùng muốn xóa chi phí cố định
  When người dùng nhấn xóa
  Then hệ thống hiển thị cảnh báo xác nhận bao gồm tên khoản chi, và thông báo rằng nhắc nhở sẽ bị hủy nhưng lịch sử thanh toán đã ghi nhận vẫn được giữ nguyên.

  

- Given người dùng xác nhận xóa chi phí cố định
  When hệ thống xử lý xóa
  Then hệ thống xóa chi phí cố định, hủy tất cả lịch nhắc nhở liên quan, và cập nhật danh sách. Các giao dịch thanh toán đã ghi nhận trước đó vẫn tồn tại trong lịch sử giao dịch chung.

  

- Given người dùng thay đổi ví thanh toán cho chi phí cố định
  When người dùng chọn ví mới
  Then hệ thống xác thực ví mới hợp lệ (REQ-05) trước khi cập nhật, và áp dụng ví mới từ kỳ thanh toán tiếp theo.

  

### FR-08-06: Tạo và quản lý chi phí cố định bằng chat

**Mô tả**: Người dùng có thể tạo, chỉnh sửa, xóa và truy vấn thông tin chi phí cố định thông qua giao diện chat bằng ngôn ngữ tự nhiên. AI Engine nhận diện ý định và trích xuất thông tin liên quan từ câu lệnh.

  

**Acceptance Criteria**:

- Given người dùng đang ở màn hình chat
  When người dùng nhập: `Tạo nhắc nhở tiền phòng trọ 1.5 triệu mỗi tháng ngày 5`
  Then AI Engine nhận diện ý định tạo chi phí cố định và trích xuất: tên `Tiền phòng trọ`, số tiền `1.500.000đ`, chu kỳ `Hàng tháng`, ngày `5`. Hệ thống hỏi xác nhận thông tin trước khi tạo.

  

- Given người dùng muốn xem danh sách chi phí cố định qua chat
  When người dùng nhập: `Liệt kê các khoản chi cố định của tôi`
  Then hệ thống hiển thị danh sách chi phí cố định trong giao diện chat với thông tin tóm tắt: tên, số tiền, chu kỳ, ngày thanh toán tiếp theo.

  

- Given người dùng muốn chỉnh sửa chi phí cố định qua chat
  When người dùng nhập: `Đổi tiền phòng trọ thành 1.8 triệu`
  Then AI Engine nhận diện ý định sửa, tìm chi phí cố định `Tiền phòng trọ` và cập nhật số tiền thành `1.800.000đ` sau khi xác nhận.

  

- Given người dùng nhập câu lệnh tạo chi phí cố định nhưng thiếu thông tin
  When người dùng nhập: `Nhắc tôi đóng tiền điện mỗi tháng`
  Then AI Engine nhận diện thiếu thông tin (số tiền, ngày thanh toán) và hỏi lại người dùng các thông tin cần thiết.

  

- Given người dùng nhập câu lệnh bằng tiếng Việt, tiếng Anh hoặc pha trộn Việt - Anh
  When AI Engine xử lý yêu cầu liên quan đến chi phí cố định
  Then hệ thống nhận diện đúng ý định và thực thi tương ứng, bất kể ngôn ngữ sử dụng.

  

- Given người dùng có nhiều chi phí cố định có tên tương tự (ví dụ `Tiền nhà` và `Tiền nhà gửi xe`)
  When người dùng yêu cầu sửa `Tiền nhà` qua chat
  Then AI Engine hỏi người dùng làm rõ khoản chi cụ thể trước khi thực hiện chỉnh sửa.

  

### FR-08-07: Tạm dừng / Kích hoạt lại chi phí cố định

**Mô tả**: Người dùng có thể tạm dừng chi phí cố định khi không cần thiết trong một khoảng thời gian (ví dụ nghỉ hè không phải đóng học phí) mà không cần xóa. Khi cần, người dùng có thể kích hoạt lại chi phí cố định đã tạm dừng.

  

**Acceptance Criteria**:

- Given người dùng muốn tạm dừng chi phí cố định `Học phí`
  When người dùng chọn tạm dừng
  Then hệ thống chuyển trạng thái sang `Tạm dừng`, hủy tất cả nhắc nhở đang chờ, và hiển thị nhãn `Tạm dừng` trong danh sách.

  

- Given chi phí cố định đang ở trạng thái `Tạm dừng`
  When người dùng chọn kích hoạt lại
  Then hệ thống chuyển trạng thái sang `Đang hoạt động`, tính toán ngày thanh toán tiếp theo dựa trên chu kỳ và ngày hiện tại, và tái lập lịch nhắc nhở.

  

- Given chi phí cố định `Học phí` đang tạm dừng từ ngày 01/06/2026 và có chu kỳ hàng tháng ngày 15
  When người dùng kích hoạt lại vào ngày 20/07/2026
  Then hệ thống tính ngày thanh toán tiếp theo là 15/08/2026 (kỳ tháng tiếp theo sau ngày kích hoạt).

  

- Given người dùng tạm dừng chi phí cố định qua chat
  When người dùng nhập: `Tạm dừng nhắc học phí`
  Then AI Engine nhận diện ý định tạm dừng, tìm chi phí cố định `Học phí` và chuyển sang trạng thái `Tạm dừng` sau khi xác nhận.

  

- Given chi phí cố định đang ở trạng thái `Tạm dừng`
  When đến ngày thanh toán theo lịch
  Then hệ thống KHÔNG gửi nhắc nhở, KHÔNG tạo giao dịch tự động, và KHÔNG đánh dấu quá hạn.

  

### FR-08-08: Theo dõi lịch sử thanh toán chi phí cố định

**Mô tả**: Hệ thống lưu trữ lịch sử thanh toán cho mỗi chi phí cố định, cho phép người dùng xem lại các kỳ đã thanh toán, chưa thanh toán và quá hạn. Lịch sử bao gồm thông tin: ngày thanh toán dự kiến, ngày thanh toán thực tế, số tiền, ví thanh toán và trạng thái.

  

**Acceptance Criteria**:

- Given người dùng truy cập lịch sử thanh toán của chi phí cố định `Tiền phòng trọ`
  When hệ thống hiển thị lịch sử
  Then danh sách hiển thị các kỳ thanh toán gồm: ngày thanh toán dự kiến, ngày thanh toán thực tế (nếu đã thanh toán), số tiền, ví thanh toán và trạng thái (`Đã thanh toán` / `Chưa thanh toán` / `Quá hạn`).

  

- Given chi phí cố định có 6 kỳ thanh toán trong lịch sử
  When hệ thống hiển thị lịch sử
  Then danh sách sắp xếp theo thứ tự thời gian giảm dần (kỳ mới nhất hiển thị trước).

  

- Given người dùng muốn xem tổng quan thanh toán chi phí cố định
  When hệ thống hiển thị thông tin tổng quan
  Then hệ thống hiển thị: tổng số kỳ đã thanh toán, tổng số kỳ quá hạn, tổng số tiền đã thanh toán tích lũy, và tỷ lệ thanh toán đúng hạn.

  

- Given người dùng muốn xem lịch sử thanh toán qua chat
  When người dùng nhập: `Xem lịch sử thanh toán tiền phòng trọ`
  Then AI Engine nhận diện ý định và hiển thị tóm tắt lịch sử thanh toán gần nhất (3-5 kỳ gần nhất) trong giao diện chat.

  

- Given chi phí cố định có kỳ thanh toán bị quá hạn
  When hệ thống hiển thị lịch sử
  Then kỳ quá hạn được đánh dấu nổi bật để người dùng dễ nhận biết.

  

## Yêu cầu Phi chức năng (NFR)

- **Độ chính xác nhận diện AI**: AI Engine phải đạt độ chính xác tối thiểu 80% trong việc nhận diện các khoản chi phí cố định tiềm năng từ lịch sử giao dịch.

- **Thời gian phản hồi nhắc nhở**: Nhắc nhở phải được gửi trong vòng 5 phút kể từ thời điểm đến hạn thanh toán theo cấu hình.

- **Tích hợp REQ-01**: Giao dịch thanh toán chi phí cố định phải tuân thủ quy trình nhập liệu và lưu trữ giao dịch của REQ-01.

- **Tích hợp REQ-02**: Danh mục chi phí cố định phải sử dụng hệ thống danh mục phân loại thông minh của REQ-02.

- **Tích hợp REQ-05**: Số dư ví phải được cập nhật chính xác ngay sau khi ghi nhận thanh toán chi phí cố định theo quy tắc quản lý ví của REQ-05.

- **Tích hợp REQ-06**: Các khoản chi phí cố định phải được phản ánh trong dòng tiền (cashflow) theo REQ-06 để dự báo chi phí tương lai.

- **Tích hợp REQ-09**: Phong cách nhắc nhở phải tùy biến theo nhân cách AI đang được chọn (REQ-09).

- **Ngôn ngữ hỗ trợ**: Yêu cầu tạo/quản lý chi phí cố định qua chat cần hỗ trợ tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh.

- **Bảo mật dữ liệu**: Chỉ người dùng sở hữu dữ liệu mới có quyền xem, tạo, sửa, xóa và quản lý chi phí cố định của mình.

- **Hiệu suất**: Danh sách chi phí cố định phải tải trong thời gian không quá 2 giây cho tối đa 50 khoản chi phí cố định.

- **Độ tin cậy lịch nhắc nhở**: Hệ thống phải đảm bảo nhắc nhở không bị mất hoặc trùng lặp kể cả khi server khởi động lại hoặc có lỗi tạm thời.

  

## Out of Scope

- Thanh toán tự động qua cổng thanh toán trực tuyến (auto-pay liên kết ngân hàng/ví điện tử).

- Push notification hệ thống ngoài giao diện chat (trong phiên bản MVP).

- Chi phí cố định dùng chung (shared recurring bills) giữa nhiều người dùng hoặc ví dùng chung.

- Dự đoán xu hướng tăng/giảm chi phí cố định theo mùa hoặc theo thời gian.

- Liên kết với hệ thống hóa đơn điện tử của các nhà cung cấp dịch vụ (EVN, VNPT, v.v.).

- Nhắc nhở qua email, SMS hoặc kênh thông báo ngoài ứng dụng.

  

## Open Questions

- [ ] Thời điểm gửi nhắc nhở trong ngày là gì (sáng 8h, trưa 12h, hay tối 20h)? Có cho phép người dùng tùy chỉnh giờ nhắc nhở không?

- [ ] Số ngày nhắc nhở trước hạn thanh toán mặc định là bao nhiêu (0 ngày — đúng hạn, 1 ngày trước, hay 3 ngày trước)?

- [ ] Ngưỡng tối thiểu để AI nhận diện chi phí cố định là bao nhiêu kỳ lặp lại liên tiếp (2, 3, hay 5 kỳ)?

- [ ] Có hỗ trợ chi phí cố định với số tiền thay đổi mỗi kỳ (biến phí như tiền điện nước) hay chỉ chi phí cố định đúng nghĩa?

- [ ] Khi người dùng không phản hồi nhắc nhở, hệ thống có gửi nhắc nhở lần hai không? Nếu có, sau bao lâu?

- [ ] Giới hạn số lượng chi phí cố định tối đa mỗi người dùng được phép tạo là bao nhiêu?

- [ ] Khi xóa ví thanh toán (REQ-05) mà ví đó đang gắn với chi phí cố định, hệ thống xử lý ra sao (tự động gán ví khác, tạm dừng, hay yêu cầu người dùng chọn lại)?

- [ ] Có cần hiển thị tổng chi phí cố định hàng tháng trên dashboard chính hoặc trong báo cáo REQ-04 không?

  

## Hướng dẫn phê duyệt

> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-08.md` → `REQ-08.md`

> Sau khi đổi tên, BA mới chuyển sang tạo DRAFT cho `REQ-09`.

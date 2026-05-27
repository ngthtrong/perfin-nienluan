---
tags:
  - nien-luan
---
# REQ-03: Quản lý ngân sách (Budget Management)

## Metadata
- **Brief nguồn**: BRIEF-01.md, REQ-02
- **Ngày tạo**: 25/05/2026
- **Lần cập nhật cuối**: 25/05/2026
- **Trạng thái**: DRAFT — chờ PO phê duyệt

## Tóm tắt
Tính năng quản lý ngân sách cho phép người dùng thiết lập giới hạn chi tiêu tổng thể hoặc theo từng danh mục cụ thể theo các chu kỳ (tuần/tháng). Hệ thống tự động theo dõi, đối chiếu các khoản chi tiêu thực tế với ngân sách đã thiết lập, và gửi cảnh báo tự động khi mức chi tiêu chạm các ngưỡng (70%, 90%, 100%). Người dùng có thể thiết lập, tra cứu hoặc điều chỉnh ngân sách thông qua giao diện ứng dụng hoặc trực tiếp qua chatbot bằng ngôn ngữ tự nhiên. Tính năng cũng hỗ trợ cơ chế chuyển tiếp ngân sách (rollover) cho các chu kỳ tiếp theo nếu người dùng không dùng hết.

## Phân tích yêu cầu

### Actors
- **User**: Người dùng thiết lập, xem, thay đổi hoặc xóa ngân sách.
- **AI Engine**: Bóc tách yêu cầu tạo/sửa ngân sách từ văn bản, phân tích tiến độ ngân sách để đưa ra câu trả lời phù hợp trong chat.
- **System**: Theo dõi chi tiêu, kích hoạt các cảnh báo, thực hiện rollover tự động.

### Constraints
- Ngân sách luôn được áp dụng cho một người dùng (per-user).
- Ngân sách theo danh mục chỉ áp dụng cho nhóm Expense (chi phí).
- Chu kỳ ngân sách hỗ trợ hiện tại là Tuần và Tháng.

### Ambiguities
- ⚠️ AMBIGUOUS: Việc chuyển tiếp ngân sách (rollover) có áp dụng cho ngân sách tổng thể hay chỉ từng danh mục?
- ⚠️ AMBIGUOUS: Có cảnh báo khi vượt ngân sách > 100% không? (ví dụ 120%, 150%) hay chỉ chặn ở 100%?

### Out of Scope sơ bộ
- Khóa tính năng chi tiêu nếu vượt quá 100% ngân sách (Hệ thống không chặn người dùng tiêu tiền thực tế).
- Chia sẻ ngân sách với người dùng khác (Shared Budget) sẽ nằm ở REQ-10.

---

## Yêu cầu Chức năng (FR)

### FR-03-01: Thiết lập ngân sách theo danh mục
**Mô tả**: Người dùng có thể thiết lập một mức giới hạn chi tiêu cụ thể cho một danh mục trong khoảng thời gian nhất định (tuần, tháng).

**Acceptance Criteria**:
- Given người dùng đang ở màn hình quản lý ngân sách
  When người dùng chọn danh mục "Ăn uống", nhập mức ngân sách `3.000.000đ` cho chu kỳ `Tháng`
  Then hệ thống tạo một ngân sách mới cho danh mục "Ăn uống" áp dụng cho tháng hiện tại.
  
- Given người dùng đã có ngân sách cho danh mục "Ăn uống" trong tháng hiện tại
  When người dùng tạo một ngân sách khác cho cùng danh mục và cùng chu kỳ
  Then hệ thống hiển thị thông báo "Ngân sách cho danh mục này đã tồn tại" và gợi ý cập nhật ngân sách hiện có.

### FR-03-02: Thiết lập ngân sách tổng thể
**Mô tả**: Người dùng có thể đặt giới hạn tổng chi tiêu áp dụng cho mọi giao dịch chi phí trong kỳ.

**Acceptance Criteria**:
- Given người dùng muốn giới hạn tổng chi tiêu
  When người dùng thiết lập ngân sách tổng thể là `10.000.000đ` cho `Tháng`
  Then hệ thống ghi nhận ngân sách tổng và sẽ theo dõi tổng số tiền của mọi giao dịch thuộc nhóm Expense trong tháng đó.
  
- Given người dùng đã thiết lập ngân sách tổng thể và các ngân sách theo danh mục
  When tổng số tiền của các ngân sách danh mục lớn hơn ngân sách tổng thể
  Then hệ thống hiển thị cảnh báo để người dùng cân đối lại các con số.

### FR-03-03: Theo dõi tiến độ chi tiêu so với ngân sách
**Mô tả**: Hệ thống tự động tính toán tổng các khoản chi phí thực tế đã phát sinh và so sánh với mức ngân sách tương ứng.

**Acceptance Criteria**:
- Given người dùng có ngân sách "Di chuyển" là `1.000.000đ/tháng`
  When có giao dịch chi phí thuộc danh mục "Di chuyển" trị giá `200.000đ` được tạo thành công
  Then hệ thống cập nhật tiến độ ngân sách "Di chuyển" thành `200.000đ / 1.000.000đ` (20%).
  
- Given một giao dịch đã được ghi nhận vào ngân sách bị người dùng thay đổi danh mục hoặc xóa
  When sự thay đổi xảy ra
  Then hệ thống phải tính toán lại tiến độ chi tiêu của cả ngân sách cũ và ngân sách mới để đảm bảo tính chính xác.

### FR-03-04: Cảnh báo khi gần/vượt ngân sách (70%, 90%, 100%)
**Mô tả**: Khi chi tiêu đạt các ngưỡng nhất định so với ngân sách, hệ thống tự động gửi thông báo (Push Notification/In-app) để nhắc nhở người dùng.

**Acceptance Criteria**:
- Given tiến độ chi tiêu của một ngân sách đạt mức >= 70% và < 90%
  When hệ thống kiểm tra tiến độ định kỳ hoặc khi có giao dịch mới
  Then hệ thống gửi cảnh báo mức 1 (VD: "Bạn đã tiêu hết 70% ngân sách Ăn uống tháng này").
  
- Given tiến độ chi tiêu của một ngân sách đạt mức >= 90% và < 100%
  When giao dịch mới làm ngân sách chạm ngưỡng 90%
  Then hệ thống gửi cảnh báo mức 2, nhấn mạnh việc cần hạn chế chi tiêu.
  
- Given tiến độ chi tiêu của một ngân sách vượt mức 100%
  When giao dịch mới làm chi tiêu vượt ngân sách
  Then hệ thống gửi cảnh báo đỏ (Over-budget alert) báo hiệu ngân sách đã bị thủng.

### FR-03-05: Thiết lập ngân sách bằng ngôn ngữ tự nhiên trong chat
**Mô tả**: Người dùng có thể yêu cầu AI thiết lập ngân sách thông qua tin nhắn chat.

**Acceptance Criteria**:
- Given người dùng nhắn tin `Đặt ngân sách ăn uống tháng này 2 triệu`
  When AI bóc tách thông tin
  Then hệ thống tự động tạo hoặc cập nhật ngân sách cho danh mục "Ăn uống" tháng này là `2.000.000đ` và phản hồi xác nhận thành công.
  
- Given người dùng nhắn tin yêu cầu đặt ngân sách nhưng thiếu thời gian hoặc thiếu danh mục
  When AI phân tích tin nhắn
  Then hệ thống hỏi lại người dùng để bổ sung thông tin trước khi thiết lập (Ví dụ: "Bạn muốn áp dụng ngân sách này cho tuần hay tháng?").

### FR-03-06: Xem tóm tắt ngân sách trong chat
**Mô tả**: Người dùng có thể hỏi AI về tình hình ngân sách hiện tại thay vì phải mở màn hình xem báo cáo.

**Acceptance Criteria**:
- Given người dùng nhắn tin `Tháng này tôi còn bao nhiêu tiền ăn uống?`
  When AI Engine tiếp nhận câu hỏi
  Then hệ thống truy xuất dữ liệu ngân sách "Ăn uống" của tháng, tính toán số dư và AI phản hồi (VD: "Ngân sách ăn uống tháng này của bạn còn 800.000đ").
  
- Given người dùng hỏi về ngân sách của một danh mục chưa được thiết lập
  When hệ thống kiểm tra
  Then AI phản hồi rằng danh mục đó chưa có ngân sách và gợi ý người dùng thiết lập.

### FR-03-07: Lịch sử thay đổi ngân sách
**Mô tả**: Khi ngân sách bị thay đổi giữa kỳ (VD: tăng thêm ngân sách), hệ thống cần lưu lại lịch sử để theo dõi.

**Acceptance Criteria**:
- Given người dùng đang có ngân sách 2.000.000đ
  When người dùng sửa thành 3.000.000đ
  Then hệ thống cập nhật tiến độ mới và lưu một log thay đổi (từ 2tr -> 3tr) kèm thời điểm thay đổi.

### FR-03-08: Tự động chuyển/tích lũy ngân sách chưa dùng hết (Rollover)
**Mô tả**: Người dùng có thể chọn chế độ Rollover để số tiền chưa dùng hết của kỳ trước được cộng dồn vào ngân sách kỳ sau.

**Acceptance Criteria**:
- Given ngân sách danh mục "Sức khỏe" có bật tính năng Rollover
  When kết thúc tháng 5, ngân sách còn dư `500.000đ`
  Then hệ thống tự động cộng thêm `500.000đ` này vào mức ngân sách mặc định của tháng 6.
  
- Given ngân sách không bật tính năng Rollover
  When kết thúc tháng
  Then ngân sách tháng sau sẽ khởi tạo lại với mức mặc định, không cộng dồn số dư.

### FR-03-09: Xóa/hủy ngân sách
**Mô tả**: Người dùng có thể hủy theo dõi ngân sách cho một danh mục bất kỳ lúc nào.

**Acceptance Criteria**:
- Given người dùng muốn xóa ngân sách "Mua sắm" của tháng hiện tại
  When người dùng xác nhận xóa
  Then hệ thống đánh dấu ngân sách đó bị vô hiệu hóa, ngừng các cảnh báo liên quan.
  
- Given người dùng yêu cầu xóa qua chat `Hủy ngân sách mua sắm tháng này`
  When AI nhận diện yêu cầu
  Then hệ thống xóa ngân sách tương ứng và phản hồi xác nhận.

---

## Yêu cầu Phi chức năng (NFR)
- **Hiệu năng tính toán**: Việc kiểm tra tiến độ ngân sách và kích hoạt cảnh báo (FR-03-04) phải được thực hiện gần như real-time (< 2s) ngay sau khi giao dịch lưu thành công.
- **Tính trọn vẹn (Integrity)**: Khi danh mục bị xóa (FR-02-05), các ngân sách liên quan đến danh mục đó cũng phải bị xóa cứng theo hoặc chuyển về một trạng thái lưu trữ (Archive).
- **Trải nghiệm người dùng**: Cảnh báo ngân sách có thể sử dụng các "Nhân cách AI" (REQ-09) để nhắc nhở thay vì các thông báo hệ thống khô khan.

## Out of Scope
- Các tính năng lập kế hoạch tài chính dài hạn (5-10 năm) không thuộc phạm vi MVP.
- Đề xuất tự động cắt giảm ngân sách dựa trên lạm phát.

## Open Questions
- [ ] Việc Rollover (chuyển tiếp) có thể cộng dồn số âm (khi tiêu lố tháng trước) vào tháng sau hay không?
- [ ] Việc thông báo vượt ngân sách có nên được phép Tắt (Mute) bởi người dùng không?

## Hướng dẫn phê duyệt
> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-03.md` → `REQ-03 Quản lý ngân sách (Budget Management).md`

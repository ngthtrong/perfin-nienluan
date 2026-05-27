---
tags:
  - nien-luan
---
# REQ-06: Nhắc nhở và Lập lịch giao dịch (Reminders)

## Metadata
- **Brief nguồn**: BRIEF-01.md, Yêu cầu tính năng.md (Tính năng #6)
- **Ngày tạo**: 25/05/2026
- **Lần cập nhật cuối**: 25/05/2026
- **Trạng thái**: DRAFT — chờ PO phê duyệt

## Tóm tắt
Tính năng này giúp người dùng tự động hóa việc ghi chép các khoản thu/chi cố định lặp đi lặp lại (như tiền thuê nhà, tiền điện nước, Netflix) thông qua cơ chế lập lịch. AI sẽ đóng vai trò một trợ lý nhắc nhở thanh toán khi đến hạn. Ngoài ra, REQ-06 chịu trách nhiệm quản lý chi tiết các "Giao dịch đặc biệt" đã được REQ-02 nhận diện, bao gồm: theo dõi các khoản nợ/cho vay (biết ai nợ ai, khi nào phải trả), quản lý sổ tiết kiệm và cập nhật trạng thái lãi/lỗ của các khoản đầu tư.

## Phân tích yêu cầu

### Actors
- **User**: Thiết lập giao dịch định kỳ, phản hồi thông báo nhắc nhở từ AI.
- **AI Engine**: Quét và nhận diện các giao dịch có tính chu kỳ, sinh nội dung nhắc nhở thân thiện/đúng "nhân cách", bóc tách lệnh tạo nhắc nhở từ chat.
- **System**: Thực thi job quét theo lịch (Cron jobs) để kích hoạt nhắc nhở.

### Constraints
- Giao dịch định kỳ chỉ được tự động tạo nếu người dùng bật tùy chọn "Auto-save", nếu không chỉ là lời nhắc nhở.

### Ambiguities
- ⚠️ AMBIGUOUS: Với phần Nợ/Cho vay, nếu người dùng trả nợ lắt nhắt từng phần (Partially paid) thì hệ thống quản lý giao dịch con như thế nào?

### Out of Scope sơ bộ
- Thanh toán tự động qua cổng thanh toán thực tế (Auto-billing).

---

## Yêu cầu Chức năng (FR)

### FR-06-01: Tạo giao dịch định kỳ (Recurring Transactions)
**Mô tả**: Người dùng có thể thiết lập các giao dịch lặp lại theo chu kỳ cố định (hàng ngày, hàng tuần, hàng tháng, hàng năm).

**Acceptance Criteria**:
- Given người dùng thiết lập khoản phí Netflix `260.000đ` lặp lại vào ngày 15 hàng tháng
  When đến ngày 15
  Then hệ thống tự động ghi nhận một giao dịch chi phí `260.000đ` cho danh mục Giải trí.

### FR-06-02: Nhắc nhở thanh toán hóa đơn
**Mô tả**: Thay vì tự động lưu, hệ thống có thể chỉ gửi thông báo nhắc nhở người dùng thanh toán.

**Acceptance Criteria**:
- Given khoản tiền nhà `3.000.000đ` được cài đặt nhắc nhở vào ngày mùng 5
  When đến ngày mùng 5
  Then hệ thống gửi Push Notification và nhắn 1 tin vào khung chat (VD: "Hôm nay đến hạn đóng tiền phòng trọ, bạn đã thanh toán chưa?").

### FR-06-03: Xác nhận/bỏ qua giao dịch định kỳ
**Mô tả**: Khi AI nhắc nhở, người dùng có thể phản hồi trực tiếp để xác nhận thanh toán hoặc bỏ qua.

**Acceptance Criteria**:
- Given AI vừa nhắc "Đến hạn đóng tiền trọ 3tr" trong khung chat
  When người dùng nhắn trả lời "Tôi vừa đóng rồi"
  Then hệ thống tự động lưu giao dịch 3.000.000đ vào lịch sử và đánh dấu hóa đơn kỳ này đã hoàn tất.
- Given người dùng trả lời "Bỏ qua tháng này"
  When AI nhận phản hồi
  Then hệ thống không lưu giao dịch và chuyển sang kỳ nhắc nhở tiếp theo.

### FR-06-04: AI tự động nhận diện chu kỳ
**Mô tả**: Nếu AI nhận thấy một khoản chi phí có số tiền và nội dung giống nhau xuất hiện liên tục trong vài tháng, nó sẽ chủ động gợi ý tạo lịch lặp.

**Acceptance Criteria**:
- Given người dùng đã ghi chép "Đóng tiền mạng 220k" vào ngày mùng 1 trong 3 tháng liên tiếp
  When hệ thống chạy AI quét dữ liệu lịch sử
  Then hệ thống gửi một gợi ý: "Có vẻ bạn thường đóng tiền mạng vào ngày 1, bạn có muốn tôi tự động tạo nhắc nhở hàng tháng không?".

### FR-06-05: Thiết lập nhắc nhở bằng chat (NLP)
**Mô tả**: Người dùng giao tiếp với bot để cài đặt lịch hẹn.

**Acceptance Criteria**:
- Given người dùng nhắn `Nhắc tôi trả tiền An 500k vào thứ sáu tuần này`
  When AI phân tích
  Then hệ thống tạo một nhắc nhở "Trả tiền An" trị giá 500k, lịch hẹn vào thứ sáu tuần này.

### FR-06-06: Quản lý giao dịch đặc biệt — Nợ & Cho vay
**Mô tả**: Quản lý sổ ghi nợ (Tracking khoản người khác nợ mình và mình nợ người khác).

**Acceptance Criteria**:
- Given REQ-02 nhận diện giao dịch `Cho An vay 1 triệu`
  When hệ thống lưu giao dịch
  Then tạo một record nợ: Debtor = An, Amount = 1.000.000đ, Type = Cho vay. Không cộng vào Chi phí sinh hoạt.
- Given người dùng nhắn "An đã trả 1 triệu hôm trước"
  When hệ thống xử lý
  Then đánh dấu record khoản vay của An là "Đã trả" (Paid) và cộng 1.000.000đ vào ví tương ứng.

### FR-06-07: Quản lý giao dịch đặc biệt — Tiết kiệm
**Mô tả**: Theo dõi các mục tiêu tiết kiệm (Savings Goal).

**Acceptance Criteria**:
- Given người dùng tạo mục tiêu "Mua xe" 50tr
  When người dùng ghi "Gửi 2 triệu vào quỹ Mua xe"
  Then mục tiêu Mua xe tăng thêm 2tr (Tiến độ 2tr/50tr).

### FR-06-08: Quản lý giao dịch đặc biệt — Đầu tư
**Mô tả**: Theo dõi diễn biến của các khoản đầu tư (cập nhật lãi/lỗ thủ công).

**Acceptance Criteria**:
- Given người dùng đã có khoản đầu tư 10tr (từ REQ-05)
  When người dùng nhắn "Khoản đầu tư hôm bữa lãi 500k"
  Then hệ thống cập nhật Profit/Loss của khoản đầu tư đó thành +500.000đ, làm tăng Net Worth (REQ-04) tương ứng.

### FR-06-09: Tạm dừng/hủy giao dịch định kỳ
**Mô tả**: Quản lý danh sách các lịch hẹn.

**Acceptance Criteria**:
- Given người dùng vào màn hình "Lập lịch & Nhắc nhở"
  When người dùng chọn một nhắc nhở đang Active và gạt nút "Tắt" (Pause)
  Then nhắc nhở đó sẽ không gửi thông báo ở các kỳ tiếp theo cho đến khi được bật lại.

---

## Yêu cầu Phi chức năng (NFR)
- Tính chính xác thời gian: Cronjob kiểm tra nhắc nhở phải chạy đúng giờ, hỗ trợ theo múi giờ (Timezone) của thiết bị người dùng.
- Trải nghiệm hội thoại: Các câu nhắc nhở phải linh hoạt, không lặp lại nguyên văn như một cái máy, có thể áp dụng REQ-09 (Nhân cách AI) để đa dạng hóa.

## Out of Scope
- Tính toán lãi vay phức tạp (như lãi suất kép ngân hàng). Hệ thống chỉ quản lý số tiền nợ/cho vay gốc.

## Open Questions
- [ ] Phần Nợ/Cho vay có cho phép thiết lập tự động gửi tin nhắn SMS cho người nợ không? (Có vẻ hơi xâm phạm quyền riêng tư, cần cân nhắc cho MVP).

## Hướng dẫn phê duyệt
> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-06.md` → `REQ-06 Nhắc nhở và lập lịch giao dịch (Reminders).md`

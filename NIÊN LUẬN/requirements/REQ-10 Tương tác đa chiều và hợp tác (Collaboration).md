---
tags:
  - nien-luan
---
# REQ-10: Tương tác Đa chiều & Hợp tác (Collaboration & Shared Wallets)

## Metadata
- **Brief nguồn**: Yêu cầu tính năng.md (Tính năng #7)
- **Ngày tạo**: 25/05/2026
- **Lần cập nhật cuối**: 25/05/2026
- **Trạng thái**: DRAFT — chờ PO phê duyệt

## Tóm tắt
Tính năng "Ví dùng chung" (Shared Wallets) giải quyết bài toán quản lý chi tiêu nhóm rất phổ biến (Ví dụ: đi du lịch nhóm, quỹ phòng trọ, cặp đôi xài tiền chung). Người dùng có thể tạo một Ví chung và mời người khác tham gia (bằng link hoặc SĐT). Khi một thành viên chat báo cáo chi tiêu vào ví này, AI sẽ tự động phân tích để thực hiện thao tác chia tiền (Split Cost) dựa trên ngữ cảnh người dùng cung cấp. Hệ thống tự động theo dõi số dư của ví, tổng chi tiêu nhóm, và "Ai nợ ai bao nhiêu tiền", giúp loại bỏ hoàn toàn việc đối soát thủ công phức tạp cuối kỳ.

## Phân tích yêu cầu

### Actors
- **User (Admin)**: Người tạo ví dùng chung, có quyền thêm/xóa thành viên.
- **User (Member)**: Người tham gia ví chung, có quyền ghi nhận giao dịch.
- **AI Engine**: Đọc hiểu ngữ cảnh chia tiền (VD: "Chia đều", "Tao trả cho thằng A", "Trừ thằng B ra").
- **System**: Thực hiện nghiệp vụ chia nợ, tổng hợp số dư chung.

### Constraints
- Yêu cầu mọi thành viên trong Ví chung đều phải có tài khoản Rolly.
- Một khoản chi tiêu trong Ví chung chỉ ghi nhận vào Tổng chi tiêu cá nhân của user theo ĐÚNG phần tiền mà user đó phải chịu. (Ví dụ: Mua bill 100k chia đôi 2 người, thì báo cáo cá nhân của mỗi người chỉ hiện chi phí 50k).

### Ambiguities
- ⚠️ AMBIGUOUS: Số dư của Ví chung là "tiền ảo" (chỉ để ghi chép) hay đòi hỏi các thành viên phải nạp tiền thật vào (Fund in) giống quỹ? (Đề xuất MVP: Chỉ là tiền ảo ghi chép).

### Out of Scope sơ bộ
- Tích hợp cổng thanh toán để trả tiền thật cho nhau qua app (Người dùng tự chuyển khoản qua ngân hàng, sau đó lên Rolly báo "Đã trả").

---

## Yêu cầu Chức năng (FR)

### FR-10-01: Tạo ví dùng chung (Shared Wallet)
**Mô tả**: Admin tạo một không gian quản lý chung.

**Acceptance Criteria**:
- Given người dùng ở màn hình Ví
  When chọn "Tạo ví dùng chung", nhập tên "Quỹ đi Đà Lạt"
  Then hệ thống tạo một Shared Wallet độc lập, người tạo mặc định là Admin.

### FR-10-02: Mời và tham gia ví chung
**Mô tả**: Cách thức thêm thành viên vào nhóm.

**Acceptance Criteria**:
- Given Admin mở ví "Quỹ đi Đà Lạt"
  When bấm "Mời", hệ thống sinh một mã Invite Link hoặc QR code
  Then người được mời (đã cài app) bấm vào Link sẽ được join vào ví với vai trò Member.

### FR-10-03: Ghi nhận chi tiêu vào ví chung bằng chat
**Mô tả**: Thành viên nhắn tin trực tiếp trong không gian của Ví chung để khai báo khoản chi.

**Acceptance Criteria**:
- Given User A và User B ở trong ví "Quỹ đi Đà Lạt"
  When User A nhắn `Mình vừa mua vé xe hết 1.000.000đ, chia đều cho cả 2`
  Then AI nhận diện: Giao dịch 1tr, Trả trước bởi: A. Split: Chia đôi (A=500k, B=500k).
  AND hệ thống ghi nhận B nợ A 500.000đ.

### FR-10-04: AI bóc tách ngữ cảnh chia tiền phức tạp
**Mô tả**: AI đủ thông minh để xử lý các yêu cầu chia tiền không đồng đều.

**Acceptance Criteria**:
- Given ví chung có A, B, C
  When A nhắn `Mua lẩu 600k, tao trả tiền. Nhưng thằng C không ăn nên không phải trả.`
  Then AI tự chia tiền cho A và B (Mỗi người 300k). C = 0đ.
  AND hệ thống ghi nhận B nợ A 300.000đ. C không nợ.

### FR-10-05: Bảng đối soát "Ai nợ ai"
**Mô tả**: Màn hình tổng hợp các khoản nợ chéo trong nhóm một cách gọn gàng nhất.

**Acceptance Criteria**:
- Given trong suốt chuyến đi có nhiều người trả xen kẽ (A trả cho B, B trả cho C)
  When người dùng mở tab "Đối soát" của Ví chung
  Then hệ thống dùng thuật toán (Debt Simplification) rút gọn các khoản nợ chéo và hiển thị kết quả cuối cùng (VD: B chỉ cần đưa A 100k, C đưa A 200k là xong).

### FR-10-06: Xác nhận thanh toán nợ nhóm
**Mô tả**: Khi người nợ đã trả tiền thật, họ khai báo để xóa nợ.

**Acceptance Criteria**:
- Given B đang nợ A 100k trong hệ thống
  When B nhắn `Đã chuyển khoản trả A 100k` HOẶC bấm nút "Đã trả tiền"
  Then hệ thống gửi thông báo cho A xác nhận. Khi A bấm "Đã nhận", khoản nợ của B về 0.

### FR-10-07: Rời nhóm / Xóa ví chung
**Mô tả**: Kết thúc chuyến đi hoặc hết nhu cầu dùng chung.

**Acceptance Criteria**:
- Given Admin muốn xóa "Quỹ đi Đà Lạt"
  When chọn "Xóa ví"
  Then nếu vẫn còn người nợ tiền nhau -> Hệ thống chặn không cho xóa và báo "Vui lòng thanh toán hết nợ trước khi đóng quỹ".
  Then nếu không ai nợ ai -> Hệ thống Archive (lưu trữ) ví này, xóa khỏi view active.

### FR-10-08: Xuất báo cáo ví chung
**Mô tả**: Xuất chi tiết chuyến đi ra file chia sẻ.

**Acceptance Criteria**:
- Given nhóm vừa kết thúc chuyến đi
  When Admin bấm "Xuất báo cáo PDF"
  Then hệ thống tạo 1 file thống kê: Tổng chi tiêu nhóm, chi tiết từng người đã đóng/đã tiêu, và log thanh toán nợ.

---

## Yêu cầu Phi chức năng (NFR)
- **Real-time Synchronization**: Bất kỳ tin nhắn ghi chi tiêu nào trong Ví chung cũng phải hiện ngay lập tức (thông qua WebSockets/Push Notification) trên máy các thành viên khác.
- **Data Privacy**: Giao dịch ghi trong Ví chung thì mọi người trong ví đều thấy. Giao dịch ghi ở Ví cá nhân thì chỉ 1 mình user đó thấy.

## Open Questions
- [ ] Tính năng Rút gọn nợ (Debt Simplification algorithm) có nên code backend hay yêu cầu LLM tính toán? (Đề xuất Backend chạy thuật toán để đảm bảo chính xác 100%).
- [ ] Ví dùng chung có cần một màn hình Chat Group giống Zalo không? Hay chỉ là một list màn hình feed giống timeline?

## Hướng dẫn phê duyệt
> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-10.md` → `REQ-10 Tương tác đa chiều và hợp tác (Collaboration).md`

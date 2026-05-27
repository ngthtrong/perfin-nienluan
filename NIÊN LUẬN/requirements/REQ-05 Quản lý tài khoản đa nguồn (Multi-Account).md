---
tags:
  - nien-luan
---
# REQ-05: Quản lý tài khoản đa nguồn (Multi-Account)

## Metadata
- **Brief nguồn**: BRIEF-01.md, Yêu cầu tính năng.md (Tính năng #6)
- **Ngày tạo**: 25/05/2026
- **Lần cập nhật cuối**: 25/05/2026
- **Trạng thái**: DRAFT — chờ PO phê duyệt

## Tóm tắt
Ứng dụng cho phép người dùng quản lý nhiều nguồn tiền khác nhau (Ví tiền mặt, Tài khoản ngân hàng, Ví điện tử, Tài khoản đầu tư). Mỗi ví sẽ có một số dư độc lập và được tổng hợp lại thành Tổng tài sản. Người dùng có thể gắn giao dịch vào một ví cụ thể và thực hiện chức năng "Chuyển tiền" (Transfer) giữa các ví. Đặc biệt, thao tác chuyển tiền sẽ không được tính là Chi phí (Expense) hay Thu nhập (Income), giúp đảm bảo số liệu báo cáo dòng tiền luôn chính xác. 

## Phân tích yêu cầu

### Actors
- **User**: Tạo ví, sửa ví, xóa ví, thực hiện giao dịch chuyển tiền.
- **AI Engine**: Nhận diện tên ví từ văn bản/voice, phân biệt được hành vi "Chuyển tiền" vs "Chi tiêu".
- **System**: Quản lý số dư, thực hiện tính toán cộng trừ tài sản.

### Constraints
- Số dư của ví có thể rơi xuống mức âm (khi người dùng chi lố tài khoản tín dụng hoặc nhập thiếu thu nhập).
- Phải có ít nhất 1 ví luôn tồn tại (Ví mặc định) để gán cho các giao dịch không chỉ định ví.

### Ambiguities
- ⚠️ AMBIGUOUS: Khi xóa một ví có chứa dữ liệu lịch sử, các giao dịch cũ thuộc ví đó sẽ ra sao? Có được chuyển sang ví khác hay chỉ ẩn ví đó đi?

### Out of Scope sơ bộ
- Đồng bộ tự động số dư từ các ứng dụng ngân hàng (Bank Sync API) không nằm trong MVP.
- Quản lý tỷ giá ngoại tệ (Chỉ hỗ trợ VNĐ trong MVP).

---

## Yêu cầu Chức năng (FR)

### FR-05-01: Tạo và quản lý nhiều ví/tài khoản
**Mô tả**: Người dùng có thể tạo vô số ví với tên gọi, loại ví và số dư ban đầu tự chọn.

**Acceptance Criteria**:
- Given người dùng ở màn hình Quản lý ví
  When chọn "Thêm ví mới", nhập tên "Ví Momo", loại "Ví điện tử", số dư ban đầu "500.000đ"
  Then hệ thống tạo ví thành công và hiển thị trong danh sách.

### FR-05-02: Theo dõi số dư từng ví
**Mô tả**: Mỗi khi có giao dịch liên quan đến ví, số dư của ví đó phải được cập nhật tương ứng.

**Acceptance Criteria**:
- Given ví "Tiền mặt" có 1.000.000đ
  When người dùng lưu giao dịch chi phí `200.000đ` thuộc ví "Tiền mặt"
  Then số dư ví "Tiền mặt" giảm xuống còn 800.000đ.

### FR-05-03: Tổng hợp số dư toàn bộ
**Mô tả**: Màn hình chính sẽ hiển thị Tổng số dư bằng tổng cộng số dư của tất cả các ví (không tính tài khoản nợ/vay).

**Acceptance Criteria**:
- Given người dùng có 3 ví: A (1tr), B (2tr), C (500k)
  When load màn hình tổng quan
  Then Tổng số dư hiển thị là 3.500.000đ.

### FR-05-04: Chuyển tiền giữa các ví (Transfer)
**Mô tả**: Đây là một loại giao dịch đặc biệt, di chuyển dòng tiền từ ví A sang ví B mà không ghi nhận thành Thu nhập hay Chi phí.

**Acceptance Criteria**:
- Given ví A (1.000.000đ), ví B (0đ)
  When người dùng tạo lệnh "Chuyển 500k từ A sang B"
  Then ví A còn 500k, ví B thành 500k.
  AND giao dịch này không xuất hiện trong biểu đồ "Tổng Chi" hay "Tổng Thu" của tháng.

### FR-05-05: Gán ví bằng ngôn ngữ tự nhiên trong chat
**Mô tả**: Người dùng có thể chỉ định ví muốn dùng ngay trong câu chat ghi chép.

**Acceptance Criteria**:
- Given người dùng có ví tên là "Techcombank"
  When người dùng chat `Ăn lẩu 500k bằng Techcombank`
  Then AI nhận diện ví "Techcombank" và gán giao dịch 500k này vào Techcombank thay vì ví mặc định.

### FR-05-06: Nhận diện lệnh Chuyển tiền qua chat
**Mô tả**: AI phải phân biệt được câu lệnh chuyển tiền để tạo transaction loại Transfer.

**Acceptance Criteria**:
- Given người dùng chat `Chuyển 1 triệu từ tiền mặt sang thẻ tín dụng`
  When AI phân tích
  Then AI tạo giao dịch Transfer, Nguồn: Tiền mặt, Đích: Thẻ tín dụng, Số tiền: 1.000.000đ. (Không tạo giao dịch Expense).

### FR-05-07: Ví mặc định
**Mô tả**: Để tối ưu thao tác, luôn có 1 ví mặc định được thiết lập để gán cho các giao dịch không nhắc đến tên ví cụ thể.

**Acceptance Criteria**:
- Given ví mặc định là "Tiền mặt"
  When người dùng chat `Mua báo 10k` (không nhắc tên ví)
  Then giao dịch được tự động trừ vào số dư "Tiền mặt".

### FR-05-08: Tracking dòng tiền đầu tư (Tài khoản đầu tư)
**Mô tả**: Các ví có thể được đánh dấu là "Tài khoản đầu tư" (Investment Wallet) để tách biệt với tiền sinh hoạt.

**Acceptance Criteria**:
- Given người dùng có ví "Chứng khoán MBS" (loại Đầu tư)
  When người dùng thực hiện Transfer 10tr từ ví "Ngân hàng" sang ví "Chứng khoán MBS"
  Then 10tr vẫn nằm trong Tổng tài sản của người dùng, nhưng được tách riêng thành mục Đầu tư trong báo cáo.

### FR-05-09: Tính Tài sản ròng (Net Worth)
**Mô tả**: Tài sản ròng = Tổng tiền các ví + Tổng tài khoản đầu tư - Tổng dư nợ thẻ tín dụng / Các khoản nợ.

**Acceptance Criteria**:
- Given tổng các ví dương là 20tr, nợ thẻ tín dụng là 5tr
  When tính Net Worth
  Then hệ thống hiển thị Net Worth = 15tr.

### FR-05-10: Xóa ví và xử lý dữ liệu liên quan
**Mô tả**: Khi xóa một ví, hệ thống cần cảnh báo và xử lý các giao dịch cũ.

**Acceptance Criteria**:
- Given người dùng muốn xóa ví "Momo" có chứa 100 giao dịch lịch sử
  When người dùng chọn Xóa
  Then hệ thống hiện popup xác nhận: "Có 100 giao dịch gắn với ví này. Chọn ví thay thế để chuyển các giao dịch này sang, hoặc Xóa ví (các giao dịch sẽ bị xóa theo)".

---

## Yêu cầu Phi chức năng (NFR)
- Tính nhất quán: Giao dịch Transfer phải thực hiện thành công ở cả 2 ví (Cộng ví này và Trừ ví kia) trong cùng 1 transaction database. Không được phép trừ tiền nguồn mà chưa cộng đích.

## Out of Scope
- Chuyển khoản thực tế liên ngân hàng (Hệ thống này chỉ mang tính chất ghi chép cá nhân).

## Open Questions
- [ ] Việc xử lý dữ liệu khi xóa ví (FR-05-10) là bắt buộc chuyển sang ví khác hay cho phép lưu giao dịch ở trạng thái "Ví đã xóa"?

## Hướng dẫn phê duyệt
> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-05.md` → `REQ-05 Quản lý tài khoản đa nguồn (Multi-Account).md`

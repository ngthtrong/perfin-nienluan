---
tags:
  - nien-luan
---
# REQ-07: Xuất dữ liệu và Sao lưu (Export & Backup)

## Metadata
- **Brief nguồn**: BRIEF-01.md, Yêu cầu tính năng.md (Tính năng #7)
- **Ngày tạo**: 25/05/2026
- **Lần cập nhật cuối**: 25/05/2026
- **Trạng thái**: DRAFT — chờ PO phê duyệt

## Tóm tắt
Rolly cung cấp công cụ mạnh mẽ để người dùng nắm giữ và bảo vệ toàn bộ dữ liệu tài chính của mình. Người dùng có quyền xuất toàn bộ dữ liệu giao dịch thành file CSV để sử dụng ở phần mềm bên thứ ba (như Excel), hoặc xuất các báo cáo biểu đồ ra định dạng PDF để lưu trữ. Bên cạnh đó, hệ thống cung cấp cơ chế sao lưu (backup) và khôi phục (restore) tự động hoặc thủ công để đảm bảo an toàn dữ liệu trên nhiều thiết bị.

## Phân tích yêu cầu

### Actors
- **User**: Thực hiện yêu cầu xuất dữ liệu hoặc sao lưu.
- **System**: Xử lý tạo file, gửi file, thực hiện các lịch sao lưu tự động.

### Constraints
- File sao lưu (Backup) phải được mã hóa (Encrypted) để tránh lộ lọt dữ liệu nhạy cảm (Tham chiếu REQ-08).
- Kích thước xuất dữ liệu PDF lớn có thể yêu cầu xử lý bất đồng bộ (Asynchronous) để tránh treo ứng dụng.

### Ambiguities
- ⚠️ AMBIGUOUS: Bản sao lưu (Backup file) sẽ được lưu cục bộ trên máy hay đồng bộ lên cloud của hệ thống (ví dụ: Google Drive / iCloud của người dùng)?

### Out of Scope sơ bộ
- Import dữ liệu từ các ứng dụng quản lý tài chính khác (MoneyLover, Sổ Thu Chi MISA) vào hệ thống (Chưa rõ mapping schema nên tạm để ngoài MVP).

---

## Yêu cầu Chức năng (FR)

### FR-07-01: Xuất giao dịch ra CSV
**Mô tả**: Người dùng xuất dữ liệu giao dịch thô (Raw data) ra file `.csv`.

**Acceptance Criteria**:
- Given người dùng ở màn hình Cài đặt / Xuất dữ liệu
  When người dùng bấm "Xuất CSV"
  Then hệ thống gom toàn bộ dữ liệu giao dịch (hoặc theo bộ lọc) và tải xuống file `.csv` có chứa các cột: Date, Description, Amount, Category, Wallet, Transaction Type.

### FR-07-02: Xuất báo cáo ra PDF
**Mô tả**: Người dùng có thể in/tải về các biểu đồ và báo cáo (từ REQ-04) dưới dạng file PDF được định dạng đẹp.

**Acceptance Criteria**:
- Given người dùng đang xem báo cáo chi tiêu tháng 5
  When người dùng bấm "Lưu PDF"
  Then hệ thống generate một file PDF có chứa giao diện các biểu đồ (Pie chart, Bar chart) hiện tại và cho phép tải về.

### FR-07-03: Lọc dữ liệu trước khi xuất
**Mô tả**: Cho phép chọn phạm vi dữ liệu muốn xuất (thời gian, danh mục, ví).

**Acceptance Criteria**:
- Given màn hình Xuất dữ liệu
  When người dùng chọn khoảng thời gian "Từ 01/01 đến 31/03" và chọn ví "Ngân hàng"
  Then file CSV tải về chỉ bao gồm các giao dịch thỏa mãn điều kiện lọc.

### FR-07-04: Sao lưu toàn bộ dữ liệu (Manual Backup)
**Mô tả**: Đóng gói toàn bộ cấu hình, cài đặt, danh mục, ví, và giao dịch thành một bản sao lưu (Backup Snapshot).

**Acceptance Criteria**:
- Given người dùng muốn sao lưu dữ liệu hiện tại
  When người dùng bấm "Tạo bản sao lưu ngay"
  Then hệ thống đóng gói toàn bộ database của người dùng thành 1 file mã hóa và lưu trữ (Local hoặc Cloud).

### FR-07-05: Khôi phục dữ liệu từ bản sao lưu (Restore)
**Mô tả**: Lấy lại dữ liệu từ một bản sao lưu cũ.

**Acceptance Criteria**:
- Given người dùng cài lại ứng dụng trên máy mới
  When người dùng chọn "Khôi phục dữ liệu" và chọn bản sao lưu ngày hôm qua
  Then hệ thống ghi đè toàn bộ dữ liệu hiện tại bằng dữ liệu trong bản sao lưu.

### FR-07-06: Sao lưu tự động định kỳ (Auto-backup)
**Mô tả**: Nếu người dùng bật tính năng này, hệ thống sẽ tự động sao lưu ngầm.

**Acceptance Criteria**:
- Given tùy chọn "Auto-backup hàng tuần" được bật
  When hệ thống chạy Cron job vào chủ nhật
  Then một bản sao lưu mới được tạo mà không cần người dùng thao tác.

### FR-07-07: Yêu cầu xuất dữ liệu bằng chat
**Mô tả**: Người dùng có thể nhắn tin để AI tự động cấu hình và trả về file.

**Acceptance Criteria**:
- Given người dùng nhắn `Gửi tôi file excel chi tiêu tháng 4`
  When AI nhận diện
  Then hệ thống tự động lọc dữ liệu tháng 4, tạo file CSV, và gửi trực tiếp file đó vào khung chat cho người dùng tải.

### FR-07-08: Xóa bản sao lưu cũ
**Mô tả**: Quản lý dung lượng lưu trữ các bản sao lưu.

**Acceptance Criteria**:
- Given hệ thống đã lưu 5 bản sao lưu tự động cũ nhất
  When bản sao lưu thứ 6 được tạo
  Then hệ thống tự động xóa bản sao lưu cũ nhất (Cơ chế xoay vòng - Rolling Backup giữ tối đa 5 bản) để tiết kiệm dung lượng.

---

## Yêu cầu Phi chức năng (NFR)
- **Hiệu năng Export**: Quá trình Export file >10,000 dòng CSV hoặc PDF phải hiển thị Progress Bar và chạy ngầm (Background Task).
- **Bảo mật**: File export chứa thông tin nhạy cảm. Quá trình tạo file trên server phải tự động xóa file tạm (temp file) sau khi người dùng tải xong hoặc sau 15 phút.

## Open Questions
- [ ] Tính năng Auto-Backup có đồng bộ lên Google Drive / iCloud hay chỉ lưu trên Server của hệ thống? Nếu lưu Server thì giới hạn dung lượng là bao nhiêu?

## Hướng dẫn phê duyệt
> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-07.md` → `REQ-07 Xuất dữ liệu và sao lưu (Export & Backup).md`

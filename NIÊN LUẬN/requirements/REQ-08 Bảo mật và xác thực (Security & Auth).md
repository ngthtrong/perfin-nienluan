---
tags:
  - nien-luan
---
# REQ-08: Bảo mật và Xác thực (Security & Authentication)

## Metadata
- **Brief nguồn**: BRIEF-01.md, Yêu cầu hệ thống
- **Ngày tạo**: 25/05/2026
- **Lần cập nhật cuối**: 25/05/2026
- **Trạng thái**: DRAFT — chờ PO phê duyệt

## Tóm tắt
Yêu cầu thiết lập lớp bảo vệ cho toàn bộ dữ liệu tài chính của người dùng. Hệ thống cung cấp các phương thức đăng nhập từ truyền thống (Email/Mật khẩu) đến tiện lợi (Social Login - Google, Facebook). Dữ liệu nhạy cảm bao gồm: thông tin giao dịch, số dư ví, file backup, file export, hình ảnh hóa đơn, voice chat, và cả các "thói quen/đặc điểm" mà AI đã học được từ người dùng đều phải được mã hóa (End-to-End hoặc At-Rest). Ngoài ra, ứng dụng cung cấp lớp bảo mật nội bộ (Khóa app bằng PIN/Sinh trắc học) để ngăn người lạ mượn điện thoại mở app.

## Phân tích yêu cầu

### Actors
- **User**: Đăng ký, đăng nhập, quản lý phiên và cài đặt bảo mật.
- **Admin/Reviewer**: Quản trị hệ thống, xem log (phải được ẩn danh hóa).
- **System**: Cấp token, mã hóa dữ liệu, giải mã.

### Constraints
- Yêu cầu tuân thủ các nguyên tắc bảo mật cơ bản (Không lưu mật khẩu dạng plaintext, mã hóa đường truyền HTTPS).
- Hình ảnh/Voice tải lên để AI nhận diện (từ REQ-01) cũng phải được bảo mật, không được public url.

### Ambiguities
- ⚠️ AMBIGUOUS: End-to-End Encryption (E2EE) hay chỉ là Encryption at Rest? Nếu áp dụng E2EE hoàn toàn thì các tính năng Webhook hoặc background jobs của System có đọc được data để gửi cảnh báo không? (Đề xuất MVP chỉ làm Encryption At Rest và HTTPS).

### Out of Scope sơ bộ
- Xác thực eKYC (Chụp CCCD, khuôn mặt) không cần thiết cho ứng dụng quản lý chi tiêu cá nhân.

---

## Yêu cầu Chức năng (FR)

### FR-08-01: Đăng ký & Đăng nhập bằng Email/Password
**Mô tả**: Flow truyền thống để tạo tài khoản.

**Acceptance Criteria**:
- Given người dùng nhập Email và Mật khẩu hợp lệ
  When người dùng bấm Đăng ký
  Then hệ thống tạo tài khoản mới, mã hóa mật khẩu (hashing bằng Bcrypt/Argon2) và gửi email xác thực (OTP/Link).

### FR-08-02: Đăng nhập bằng OAuth (Google/Facebook)
**Mô tả**: Single Sign-On (SSO) giúp thao tác nhanh.

**Acceptance Criteria**:
- Given người dùng ở màn hình Login
  When chọn "Đăng nhập với Google"
  Then hệ thống gọi API Google, xác thực token và đăng nhập thành công vào app mà không cần tạo mật khẩu riêng.

### FR-08-03: Quên mật khẩu / Đặt lại mật khẩu
**Mô tả**: Hỗ trợ lấy lại quyền truy cập khi quên mật khẩu.

**Acceptance Criteria**:
- Given người dùng chọn "Quên mật khẩu"
  When nhập email tài khoản
  Then hệ thống gửi một mã OTP hoặc Link reset (có thời hạn 15 phút) về email. Người dùng dùng mã này để đặt mật khẩu mới.

### FR-08-04: Quản lý phiên đăng nhập (Session Management)
**Mô tả**: Hệ thống sử dụng JWT token có giới hạn thời gian sống (Access Token ngắn hạn, Refresh Token dài hạn).

**Acceptance Criteria**:
- Given người dùng đang đăng nhập (có Access Token)
  When token hết hạn
  Then ứng dụng ngầm dùng Refresh Token để lấy token mới mà không bắt người dùng đăng nhập lại (trừ khi họ đã logout hoặc đổi mật khẩu).

### FR-08-05: Khóa ứng dụng (App Lock - PIN/Biometric)
**Mô tả**: Bảo vệ sự riêng tư ngay cả khi điện thoại đang mở khóa.

**Acceptance Criteria**:
- Given người dùng bật tính năng Khóa App bằng FaceID/Vân tay
  When người dùng thoát app (đưa xuống background) và mở lại
  Then app yêu cầu xác thực FaceID/Vân tay trước khi hiển thị màn hình dữ liệu.

### FR-08-06: Xác thực 2 lớp (2FA) — Tuỳ chọn
**Mô tả**: Tăng cường bảo mật cho tài khoản bằng Authenticator App hoặc SMS/Email OTP.

**Acceptance Criteria**:
- Given tính năng 2FA được bật
  When người dùng đăng nhập đúng tài khoản/mật khẩu
  Then hệ thống yêu cầu nhập thêm mã gồm 6 số từ Google Authenticator (hoặc Email) mới cho phép vào app.

### FR-08-07: Mã hóa dữ liệu AI và Phân quyền (Data Privacy)
**Mô tả**: Log nhận diện, file ảnh hóa đơn, voice, và dữ liệu "Thói quen" của AI (REQ-02) chỉ chủ tài khoản mới được xem.

**Acceptance Criteria**:
- Given một bức ảnh hóa đơn được upload lên S3
  When có người lấy được trực tiếp URL của bức ảnh và cố truy cập mà không có token hợp lệ
  Then hệ thống chặn truy cập (HTTP 403 Forbidden). Cần dùng Signed URL hoặc qua Proxy phân quyền.

### FR-08-08: Ẩn danh hóa dữ liệu cho Reviewer
**Mô tả**: Đảm bảo quyền riêng tư khi Admin/Reviewer xem log AI để đánh giá (theo REQ-02).

**Acceptance Criteria**:
- Given Admin mở màn hình Review Log AI
  When xem các giao dịch AI bóc tách sai
  Then thông tin định danh (Tên user, Email, Số thẻ ngân hàng trên hóa đơn) phải được che mờ/loại bỏ.

### FR-08-09: Xóa tài khoản vĩnh viễn (Right to be forgotten)
**Mô tả**: Tính năng bắt buộc theo chuẩn Privacy (Apple/Google Store).

**Acceptance Criteria**:
- Given người dùng muốn xóa tài khoản
  When người dùng xác nhận "Xóa vĩnh viễn"
  Then hệ thống phải xóa hoàn toàn thông tin cá nhân, các ví, các giao dịch và file backup trên server của user đó.

---

## Yêu cầu Phi chức năng (NFR)
- Mật khẩu phải dài tối thiểu 8 ký tự, bao gồm chữ cái và số.
- Mọi API call đều phải đi qua đường truyền HTTPS bảo mật.
- Không log/in ra log file của server bất kỳ thông tin nhạy cảm nào (như Password, Token, hoặc Full số thẻ tín dụng).

## Open Questions
- [ ] Xác thực 2FA (FR-08-06) có đưa vào phạm vi Niên luận/MVP hay đẩy sang Phase 2?
- [ ] Chốt cơ chế mã hóa dữ liệu: Là Encryption At Rest (Mã hóa ở tầng DB/Storage) hay E2EE (User giữ private key)?

## Hướng dẫn phê duyệt
> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-08.md` → `REQ-08 Bảo mật và xác thực (Security & Auth).md`

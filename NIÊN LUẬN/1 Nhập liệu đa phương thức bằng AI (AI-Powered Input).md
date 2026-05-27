---
tags:
  - nien-luan
---
[[1. 2 Nhập liệu đa phương thức bằng AI (AI-Powered Input)]]
---

# REQ-01: Nhập liệu đa phương thức bằng AI (AI-Powered Input)

## Metadata
- **Brief nguồn**: BRIEF-01.md
- **Ngày tạo**: 20/05/2026
- **Lần cập nhật cuối**: Version 2
- **Trạng thái**: DRAFT — chờ PO phê duyệt

## Tóm tắt
Cho phép người dùng tạo giao dịch thu/chi mới thông qua giao diện hội thoại (chat) bằng cách gõ văn bản tự nhiên, gửi tin nhắn thoại hoặc gửi hình ảnh (hóa đơn, bill chuyển khoản, ảnh sự việc). AI sẽ tự động đọc hiểu, bóc tách chi tiết (kể cả chia nhỏ các hóa đơn phức tạp) và lưu trực tiếp vào cơ sở dữ liệu. Đồng thời, hệ thống hỗ trợ hỏi đáp làm rõ thông tin và học hỏi từ các chỉnh sửa của người dùng.

## Actors
- **User**: Người dùng cuối.
- **AI Engine**: Hệ thống xử lý ngôn ngữ tự nhiên, OCR và hình ảnh.

## Yêu cầu Chức năng

### FR-01-01: Nhập liệu bằng văn bản tự nhiên (Text Input)
**Mô tả**: Người dùng gõ tin nhắn văn bản vào khung chat để ghi chép giao dịch. Hỗ trợ gửi các phép toán trực tiếp.
**Acceptance Criteria**:
- Given người dùng đang ở màn hình chat
  When người dùng nhập câu văn bản chứa thông tin giao dịch có chứa phép tính (VD: "Trà sữa 50k x 2 ly") và gửi
  Then hệ thống gửi cho AI Engine xử lý bóc tách thông tin và tự động thực hiện phép tính để ra tổng số tiền chính xác.

### FR-01-02: Nhập liệu bằng giọng nói (Voice Input)
**Mô tả**: Người dùng ghi âm giọng nói để ghi chép giao dịch.
**Acceptance Criteria**:
- Given người dùng đang ở màn hình chat
  When người dùng ghi âm một đoạn thoại (tối đa 60 giây) và gửi
  Then hệ thống chuyển đổi giọng nói thành văn bản (Speech-to-Text) và chuyển cho AI Engine xử lý.

### FR-01-03: Nhập liệu bằng hình ảnh đa ngữ cảnh (Contextual Image Input)
**Mô tả**: Hỗ trợ bóc tách dữ liệu từ nhiều loại hình ảnh: Hóa đơn siêu thị, bill chuyển khoản ngân hàng, hoặc ảnh chụp bối cảnh thực tế kèm chú thích.
**Acceptance Criteria**:
- **Kịch bản 1 (Ảnh bối cảnh + Caption)**:
  Given người dùng tải lên một bức ảnh sự vật/sự việc (VD: ảnh đang rửa xe) kèm tin nhắn văn bản (VD: "30k")
  When hệ thống xử lý ảnh và văn bản
  Then AI nhận diện bối cảnh ảnh là "Rửa xe" kết hợp với "30k" để tạo giao dịch, đồng thời lưu bức ảnh làm thông tin đính kèm của giao dịch đó.
- **Kịch bản 2 (Bóc tách hóa đơn phức tạp / Itemized Receipt)**:
  Given người dùng tải lên hóa đơn có nhiều mặt hàng thuộc các nhóm khác nhau (VD: bill siêu thị có cả rau củ và dầu gội)
  When AI Engine quét hóa đơn
  Then AI phải bóc tách riêng biệt các mặt hàng để tạo thành nhiều giao dịch độc lập (VD: Giao dịch 1: Rau củ - Ăn uống; Giao dịch 2: Dầu gội - Sinh hoạt) thay vì gộp chung một cục "Tổng tiền".

### FR-01-04: Lưu tự động & Chỉnh sửa/Xóa bằng ngôn ngữ tự nhiên
**Mô tả**: Hệ thống tự động lưu ngay sau khi bóc tách thành công để giảm thao tác, người dùng có thể điều chỉnh lại thông qua chat.
**Acceptance Criteria**:
- **Kịch bản 1 (Lưu tự động)**:
  Given AI đã bóc tách thành công một khoản chi/thu hợp lệ
  When hệ thống nhận dữ liệu từ AI
  Then hệ thống tự động lưu vào cơ sở dữ liệu VÀ gửi một tin nhắn phản hồi thông báo đã lưu thành công (VD: "Đã ghi nhận: Rửa xe 30k").
- **Kịch bản 2 (Thao tác Edit/Delete qua chat)**:
  Given người dùng đã có các giao dịch được lưu trước đó
  When người dùng nhập câu lệnh hội thoại (VD: "Hãy xóa rửa xe ngày hôm qua" hoặc "Chỉnh sửa ăn lẩu hôm qua thành 300k")
  Then AI nhận diện yêu cầu, tự động cập nhật/xóa bản ghi tương ứng trong cơ sở dữ liệu VÀ phản hồi xác nhận cho người dùng.

### FR-01-05: Luồng yêu cầu cung cấp thêm thông tin (Clarification Flow)
**Mô tả**: Nếu thông tin đầu vào bị thiếu hoặc mơ hồ, AI sẽ chủ động hỏi lại thay vì lưu sai.
**Acceptance Criteria**:
- Given hệ thống nhận được một tin nhắn/hình ảnh từ người dùng (VD: bill chuyển khoản không ghi nội dung, hoặc trường hợp hóa đơn quá phức tạp)
  When AI bóc tách nhưng không đủ thông tin để định hình giao dịch (thiếu số tiền, nội dung không rõ)
  Then AI không lưu vào cơ sở dữ liệu MÀ phản hồi lại bằng một câu hỏi yêu cầu người dùng làm rõ (VD: "Bill này dành cho việc gì vậy bạn ơi?").

### FR-01-06: Cơ chế học hỏi (AI Feedback Loop)
**Mô tả**: Hệ thống ghi nhận những lần người dùng sửa lại thông tin do AI bóc tách sai để huấn luyện mô hình.
**Acceptance Criteria**:
- Given AI đã bóc tách và lưu tự động một giao dịch
  When người dùng thực hiện lệnh chỉnh sửa thông tin giao dịch đó (vì AI nhận diện sai nội dung hoặc số tiền)
  Then hệ thống lưu lại log so sánh giữa "Kết quả AI bóc tách ban đầu" và "Kết quả người dùng sửa cuối cùng" để làm dữ liệu huấn luyện (training data) giúp AI thông minh hơn ở các lần sau.

## Yêu cầu Phi chức năng (NFR)
- **Giới hạn tin nhắn thoại**: Tối đa `60 giây` (Có thể điều chỉnh sau khi đội Product có số liệu nghiên cứu người dùng thực tế).
- **Giới hạn hình ảnh**: Dung lượng tối đa `10MB` cho mỗi ảnh được tải lên.

## Out of Scope
- Tính năng chia tiền chung (Split bill) từ hóa đơn sẽ được xử lý ở `REQ-07`.

## Open Questions
- [ ] **Chưa rõ về Đa ngôn ngữ:** Tính năng có cần hỗ trợ nhận diện các ngôn ngữ khác ngoài tiếng Việt (VD: tiếng Anh, hoặc chêm tiếng Anh vào tiếng Việt) không? (Câu hỏi này sót lại từ bản v1 chưa thấy PO phản hồi).

## Hướng dẫn phê duyệt
> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-01.md` → `REQ-01.md`

---

### BÁO CÁO TỪ BA

**Gửi PO,**
Tôi đã cấu trúc lại toàn bộ Spec theo đúng những gì bạn chốt:
- Đã thêm khả năng **tính toán** vào cho Text (FR-01-01).
- Chốt voice là **60s** (có note lại là sẽ nghiên cứu thêm) và ảnh là **10MB**.
- Mở rộng xử lý đa dạng ảnh, chụp ảnh bối cảnh ghi giá tiền lưu luôn ảnh (FR-01-03 - Kịch bản 1).
- Chốt tính năng "Killer": **Bóc tách bill chi tiết (itemized)** thành nhiều khoản riêng (FR-01-03 - Kịch bản 2).
- **Bỏ nút Confirm**, thay bằng **Auto-save** (Lưu tự động) và hỗ trợ xóa/sửa lại bằng văn bản chat tự nhiên (FR-01-04).
- Thêm luồng AI **hỏi vặn lại** người dùng khi thiếu thông tin (FR-01-05).
- Thêm **AI Feedback Loop** để thu thập dữ liệu AI sai (FR-01-06).

**Action của PO bây giờ:** 
Chỉ còn sót đúng 1 Open Question về **Đa ngôn ngữ** (chỉ làm tiếng Việt hay hỗ trợ cả tiếng Anh/tiếng lóng). PO vui lòng chốt nốt điểm này. Nếu PO đồng ý với bản này, hãy báo tôi biết để coi như duyệt `REQ-01` và tôi sẽ lập tức phân tích và viết DRAFT cho **Tính năng 2: Auto-Categorization (Phân loại thông minh)**.
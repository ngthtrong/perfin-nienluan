---
tags:
  - nien-luan
---
# REQ-01: Nhập liệu đa phương thức bằng AI (AI-Powered Input)

  

## Metadata

- **Brief nguồn**: BRIEF-01.md

- **Ngày tạo**: 25/05/2026

- **Lần cập nhật cuối**: 25/05/2026 — cập nhật theo phản hồi PO lần 2

- **Trạng thái**: DRAFT — chờ PO phê duyệt

  

## Tóm tắt

Cho phép người dùng tạo giao dịch thu/chi mới thông qua giao diện hội thoại bằng văn bản tự nhiên, tin nhắn thoại hoặc hình ảnh. Trong phạm vi MVP, hình ảnh được hỗ trợ gồm: hóa đơn, bill chuyển khoản và ảnh bối cảnh. Hệ thống sử dụng AI để đọc hiểu đầu vào tiếng Việt, tiếng Anh hoặc câu pha trộn Việt - Anh; bóc tách tên giao dịch và giá tiền; suy đoán danh mục tương ứng nếu tên giao dịch đủ rõ; hỏi lại khi thiếu hoặc không chắc thông tin; lưu giao dịch hợp lệ; đồng thời cho phép chỉnh sửa, xóa mềm và khôi phục giao dịch trong thời gian cho phép.

  

## Actors

- **User**: Người dùng cuối ghi nhận, chỉnh sửa, xóa hoặc khôi phục giao dịch.

- **AI Engine**: Thành phần xử lý văn bản, giọng nói, hình ảnh và trích xuất thông tin giao dịch.

- **System**: Ứng dụng lưu trữ giao dịch, phản hồi kết quả, ghi nhận lịch sử xử lý, quản lý trạng thái giao dịch và quản lý ngữ cảnh chat.

- **Admin/Reviewer**: Người đánh giá thủ công log phản hồi AI để cải thiện chất lượng hệ thống.

  

## Yêu cầu Chức năng

  

### FR-01-01: Nhập liệu bằng văn bản tự nhiên

**Mô tả**: Người dùng có thể gửi tin nhắn văn bản tự nhiên để tạo giao dịch thu/chi. Nội dung có thể bao gồm tên giao dịch, số tiền, thời gian, ví/tài khoản và phép tính đơn giản.

  

**Acceptance Criteria**:

- Given người dùng đang ở màn hình chat

  When người dùng nhập tin nhắn `Trà sữa 50k x 2 ly` và gửi

  Then hệ thống chuyển nội dung cho AI Engine để bóc tách giao dịch và tính tổng số tiền là `100.000đ`.

  

- Given người dùng đang ở màn hình chat

  When người dùng nhập tin nhắn bằng tiếng Việt, tiếng Anh hoặc câu pha trộn Việt - Anh có đủ thông tin giao dịch hợp lệ

  Then hệ thống tạo giao dịch mới từ nội dung người dùng cung cấp.

  

- Given người dùng nhập tên giao dịch và giá tiền, ví dụ `ăn sáng 30k`

  When AI Engine xác định tên giao dịch đủ rõ để suy đoán danh mục

  Then hệ thống tạo giao dịch với tên giao dịch, số tiền và danh mục tương ứng do AI Engine suy đoán.

  

⚠️ AMBIGUOUS: Chưa rõ phạm vi phép tính cần hỗ trợ gồm những dạng nào ngoài nhân đơn giản, ví dụ cộng nhiều món, giảm giá, phần trăm, phí ship.

  

⚠️ AMBIGUOUS: “Tên giao dịch đủ rõ để LLM suy đoán danh mục” cần được kiểm chứng thêm ở REQ-02: Phân loại thông minh.

  

### FR-01-02: Nhập liệu bằng giọng nói

**Mô tả**: Người dùng có thể ghi âm giọng nói để tạo giao dịch. Hệ thống chuyển giọng nói thành văn bản trước khi AI Engine bóc tách giao dịch. Nội dung giọng nói cần hỗ trợ tiếng Việt, tiếng Anh hoặc câu nói pha trộn Việt - Anh.

  

**Acceptance Criteria**:

- Given người dùng đang ở màn hình chat

  When người dùng ghi âm một đoạn thoại có thời lượng không quá `60 giây` và gửi

  Then hệ thống chuyển giọng nói thành văn bản và gửi văn bản đó cho AI Engine xử lý.

  

- Given người dùng ghi âm đoạn thoại bằng tiếng Việt, tiếng Anh hoặc câu pha trộn Việt - Anh

  When hệ thống chuyển giọng nói thành văn bản thành công

  Then AI Engine sử dụng transcript để bóc tách thông tin giao dịch.

  

- Given người dùng ghi âm đoạn thoại vượt quá `60 giây`

  When người dùng gửi đoạn ghi âm

  Then hệ thống từ chối xử lý và hiển thị thông báo rằng thời lượng ghi âm vượt quá giới hạn cho phép.

  

⚠️ AMBIGUOUS: Chưa rõ có cần hỗ trợ tiếng địa phương, giọng nói nhiễu, nói nhanh hoặc nhiều người nói trong cùng một đoạn ghi âm hay không.

  

### FR-01-03: Nhập liệu bằng hình ảnh trong MVP

**Mô tả**: Người dùng có thể tải lên hoặc chụp ảnh để tạo giao dịch. Trong MVP, hệ thống hỗ trợ 3 loại ảnh: hóa đơn, bill chuyển khoản và ảnh bối cảnh thực tế kèm mô tả ngắn.

  

**Acceptance Criteria**:

- Given người dùng tải lên ảnh hóa đơn có thông tin mặt hàng và giá tiền rõ ràng

  When hệ thống xử lý ảnh

  Then AI Engine trích xuất được tên giao dịch, giá tiền và thời gian nếu có trên hóa đơn.

  

- Given người dùng tải lên ảnh bill chuyển khoản có số tiền rõ ràng nhưng không có nội dung giao dịch

  When AI Engine không xác định được mục đích giao dịch

  Then hệ thống không tự lưu giao dịch và hỏi lại người dùng về nội dung/mục đích giao dịch.

  

- Given người dùng tải lên ảnh bối cảnh, ví dụ ảnh rửa xe, kèm tin nhắn `30k`

  When hệ thống xử lý đồng thời ảnh và tin nhắn

  Then AI Engine tạo giao dịch với mô tả phù hợp với bối cảnh ảnh, số tiền `30.000đ`, và lưu ảnh làm tệp đính kèm của giao dịch.

  

- Given người dùng tải lên ảnh không thuộc 3 loại ảnh MVP gồm hóa đơn, bill chuyển khoản hoặc ảnh bối cảnh

  When hệ thống không thể xác định loại ảnh phù hợp để tạo giao dịch

  Then hệ thống không lưu giao dịch và phản hồi rằng loại ảnh này chưa được hỗ trợ trong MVP.

  

### FR-01-04: Bóc tách hóa đơn nhiều mặt hàng theo ngữ cảnh

**Mô tả**: Với hóa đơn có nhiều mặt hàng, mặc định hệ thống bóc tách thành nhiều giao dịch chi tiết. Tuy nhiên, hệ thống phải phân tích thêm ngữ cảnh người dùng cung cấp để quyết định chỉ lưu một hoặc một số mặt hàng cụ thể nếu người dùng nói rõ mục tiêu cần ghi nhận.

  

**Acceptance Criteria**:

- Given người dùng tải lên hóa đơn có nhiều mặt hàng thuộc nhiều nhóm khác nhau, ví dụ rau củ và dầu gội

  When người dùng không cung cấp thêm ngữ cảnh giới hạn mặt hàng cần ghi nhận

  Then hệ thống mặc định bóc tách các mặt hàng thành nhiều giao dịch chi tiết tương ứng.

  

- Given người dùng tải lên bill một buổi uống nước có nhiều món

  When người dùng gửi kèm tin nhắn chỉ nhắc đến một món cụ thể, ví dụ `matcha latte`

  Then hệ thống chỉ tạo giao dịch cho món `matcha latte` với số tiền tương ứng trên bill, thay vì lưu toàn bộ bill.

  

- Given người dùng tải lên bill có nhiều món và tin nhắn kèm theo không khớp rõ với mặt hàng nào trên bill

  When AI Engine không xác định chắc chắn mặt hàng cần ghi nhận

  Then hệ thống hỏi lại người dùng để chọn đúng mặt hàng trước khi lưu.

  

- Given hóa đơn có phí dịch vụ, giảm giá, VAT hoặc phí ship

  When hệ thống bóc tách các mặt hàng từ hóa đơn

  Then hệ thống lưu từng giao dịch chi tiết theo đúng giá hiển thị trên bill, không tự phân bổ lại phí dịch vụ, giảm giá, VAT hoặc phí ship vào từng giao dịch nếu bill không thể hiện rõ.

  

- Given AI Engine không đủ tin cậy để tách chính xác các mặt hàng trong hóa đơn

  When hệ thống xử lý xong hóa đơn

  Then hệ thống hỏi người dùng xác nhận hoặc cung cấp thêm thông tin trước khi lưu.

  

⚠️ AMBIGUOUS: “Khớp rõ” hoặc “không xác định chắc chắn” cần được định nghĩa bằng tiêu chí kiểm thử cụ thể hơn khi thiết kế AI rule/prompt ở bước kỹ thuật.

  

### FR-01-05: Lưu tự động giao dịch hợp lệ

**Mô tả**: Khi AI Engine bóc tách được thông tin giao dịch hợp lệ và không còn dữ liệu quan trọng bị thiếu, hệ thống tự động lưu giao dịch để giảm thao tác cho người dùng.

  

**Acceptance Criteria**:

- Given AI Engine đã bóc tách được tên giao dịch và giá tiền

  When tên giao dịch đủ rõ để AI Engine suy đoán được danh mục tương ứng

  Then hệ thống xem giao dịch là hợp lệ và tự động lưu vào cơ sở dữ liệu.

  

- Given AI Engine bóc tách được giá tiền nhưng thiếu tên giao dịch

  When hệ thống nhận kết quả xử lý từ AI Engine

  Then hệ thống không lưu giao dịch và hỏi lại người dùng tên/nội dung giao dịch.

  

- Given AI Engine bóc tách được tên giao dịch nhưng thiếu giá tiền

  When hệ thống nhận kết quả xử lý từ AI Engine

  Then hệ thống không lưu giao dịch và hỏi lại người dùng số tiền giao dịch.

  

- Given tên giao dịch quá mơ hồ khiến AI Engine không suy đoán được danh mục tương ứng

  When hệ thống nhận kết quả xử lý từ AI Engine

  Then hệ thống không tự lưu giao dịch và hỏi lại người dùng để cung cấp thêm ngữ cảnh.

  

### FR-01-06: Chỉnh sửa và xóa giao dịch bằng ngôn ngữ tự nhiên

**Mô tả**: Người dùng có thể yêu cầu chỉnh sửa hoặc xóa giao dịch đã lưu bằng câu lệnh hội thoại tự nhiên trong chat.

  

**Acceptance Criteria**:

- Given người dùng đã có giao dịch `Rửa xe 30.000đ` được lưu ngày hôm qua

  When người dùng nhập `Hãy xóa rửa xe ngày hôm qua`

  Then hệ thống xác định giao dịch phù hợp, chuyển giao dịch đó sang trạng thái đã xóa mềm và phản hồi xác nhận cho người dùng.

  

- Given người dùng đã có giao dịch `Ăn lẩu` được lưu ngày hôm qua

  When người dùng nhập `Chỉnh sửa ăn lẩu hôm qua thành 300k`

  Then hệ thống cập nhật số tiền giao dịch thành `300.000đ` và phản hồi xác nhận cho người dùng.

  

- Given câu lệnh chỉnh sửa hoặc xóa có thể khớp với nhiều giao dịch

  When hệ thống không xác định được duy nhất một giao dịch cần thao tác

  Then hệ thống hỏi lại người dùng để chọn đúng giao dịch trước khi cập nhật hoặc xóa.

  

### FR-01-07: Khôi phục giao dịch sau khi xóa

**Mô tả**: Người dùng có thể khôi phục giao dịch vừa xóa trong vòng `30 giây` để tránh mất dữ liệu do thao tác nhầm.

  

**Acceptance Criteria**:

- Given người dùng vừa xóa một giao dịch bằng chat

  When hệ thống phản hồi xác nhận đã xóa

  Then hệ thống phải hiển thị hoặc cung cấp khả năng khôi phục giao dịch đã xóa đó trong vòng `30 giây`.

  

- Given người dùng đã xóa một giao dịch và giao dịch đó vẫn đang trong vòng `30 giây` kể từ thời điểm xóa

  When người dùng nhập yêu cầu khôi phục bằng ngôn ngữ tự nhiên, ví dụ `khôi phục giao dịch vừa xóa`

  Then hệ thống khôi phục giao dịch đó và phản hồi xác nhận cho người dùng.

  

- Given giao dịch đã bị xóa quá `30 giây`

  When người dùng yêu cầu khôi phục giao dịch đó

  Then hệ thống không khôi phục giao dịch và phản hồi rằng thời gian khôi phục đã hết.

  

- Given yêu cầu khôi phục có thể khớp với nhiều giao dịch đã xóa trong vòng `30 giây`

  When hệ thống không xác định được duy nhất giao dịch cần khôi phục

  Then hệ thống hỏi lại người dùng để chọn đúng giao dịch trước khi khôi phục, nếu vẫn còn trong thời gian cho phép.

  

### FR-01-08: Xóa mềm và xóa cứng giao dịch

**Mô tả**: Khi người dùng xóa giao dịch, hệ thống không xóa khỏi cơ sở dữ liệu ngay lập tức. Giao dịch được chuyển sang trạng thái xóa mềm, sau đó bị xóa cứng sau `48 giờ`.

  

**Acceptance Criteria**:

- Given người dùng yêu cầu xóa một giao dịch

  When hệ thống xác định đúng giao dịch cần xóa

  Then hệ thống chuyển giao dịch sang trạng thái xóa mềm và không hiển thị giao dịch đó trong danh sách giao dịch đang hoạt động.

  

- Given một giao dịch đã ở trạng thái xóa mềm chưa quá `48 giờ`

  When hệ thống kiểm tra trạng thái dữ liệu

  Then giao dịch vẫn còn được lưu trong hệ thống để phục vụ truy vết/xử lý nội bộ theo phạm vi cho phép.

  

- Given một giao dịch đã ở trạng thái xóa mềm quá `48 giờ`

  When hệ thống thực hiện tiến trình dọn dữ liệu

  Then hệ thống xóa cứng giao dịch đó khỏi nơi lưu trữ giao dịch chính.

  

⚠️ AMBIGUOUS: Chưa rõ sau khi xóa cứng, dữ liệu liên quan trong log AI/feedback có cần ẩn danh hóa hoặc xóa theo giao dịch gốc hay không.

  

### FR-01-09: Luồng hỏi lại khi thiếu hoặc mơ hồ thông tin

**Mô tả**: Khi đầu vào không đủ thông tin để tạo giao dịch chính xác, hệ thống phải hỏi lại thay vì lưu sai. Ngữ cảnh hội thoại được giữ trong `48 giờ` để hỗ trợ hoàn tất giao dịch và tránh gửi quá nhiều context cho LLM.

  

**Acceptance Criteria**:

- Given hệ thống nhận được tin nhắn, giọng nói hoặc hình ảnh có thiếu thông tin quan trọng

  When AI Engine không thể xác định giao dịch hợp lệ

  Then hệ thống phản hồi bằng câu hỏi làm rõ và không lưu giao dịch vào cơ sở dữ liệu.

  

- Given hệ thống đã hỏi lại người dùng về thông tin còn thiếu

  When người dùng trả lời bổ sung thông tin trong vòng `48 giờ`

  Then hệ thống kết hợp câu trả lời mới với ngữ cảnh trước đó để tiếp tục tạo giao dịch.

  

- Given ngữ cảnh hội thoại đã quá `48 giờ`

  When hệ thống chuẩn bị context gửi cho LLM

  Then hệ thống không đưa nội dung thô của khung chat đã quá `48 giờ` vào context xử lý.

  

- Given người dùng trả lời bổ sung cho một câu hỏi làm rõ sau khi ngữ cảnh liên quan đã quá `48 giờ`

  When hệ thống không còn đủ ngữ cảnh để tiếp tục xử lý chính xác

  Then hệ thống yêu cầu người dùng cung cấp lại thông tin giao dịch cần thiết.

  

### FR-01-10: Ghi nhận phản hồi để cải thiện AI

**Mô tả**: Hệ thống ghi nhận trường hợp AI bóc tách sai và người dùng chỉnh sửa lại để làm dữ liệu đánh giá thủ công, cải thiện chất lượng AI và nhận diện đặc điểm/thói quen sử dụng của người dùng.

  

**Acceptance Criteria**:

- Given AI đã bóc tách và hệ thống đã lưu một giao dịch

  When người dùng chỉnh sửa giao dịch đó do AI nhận diện sai

  Then hệ thống lưu log gồm kết quả AI ban đầu, kết quả sau chỉnh sửa và thời điểm chỉnh sửa.

  

- Given hệ thống lưu log phản hồi AI

  When dữ liệu được ghi nhận

  Then log không được làm thay đổi dữ liệu giao dịch cuối cùng mà người dùng đã chỉnh sửa.

  

- Given Admin/Reviewer cần đánh giá chất lượng bóc tách của AI

  When Admin/Reviewer xem log phản hồi AI

  Then hệ thống cung cấp dữ liệu đủ để so sánh kết quả AI ban đầu với kết quả người dùng đã chỉnh sửa.

  

- Given hệ thống xử lý lịch sử chat và phản hồi AI của người dùng

  When hệ thống nhận diện được đặc điểm sử dụng lặp lại, ví dụ từ người dùng hay dùng, giao dịch hay chi, khung giờ hay chat

  Then hệ thống lưu các đặc điểm đã được đánh dấu để hỗ trợ cá nhân hóa xử lý ở các lần sau mà không cần gửi toàn bộ nội dung chat cũ cho LLM.

  

⚠️ AMBIGUOUS: Danh sách đặc điểm/thói quen người dùng cần nhận diện mới có ví dụ ban đầu gồm từ hay dùng, giao dịch hay chi, khung giờ hay chat; PO sẽ tìm kiếm và bổ sung thêm sau.

  

⚠️ AMBIGUOUS: Chưa rõ cách thông báo hoặc xin phép người dùng về việc hệ thống lưu đặc điểm/thói quen sử dụng để cá nhân hóa.

  

## Yêu cầu Phi chức năng (NFR)

- **Ngôn ngữ hỗ trợ**: Hệ thống cần hỗ trợ đầu vào tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh.

- **Giới hạn tin nhắn thoại**: Tối đa `60 giây` cho mỗi lần ghi âm.

- **Giới hạn hình ảnh**: Dung lượng tối đa `10MB` cho mỗi ảnh được tải lên.

- **Loại ảnh MVP**: MVP hỗ trợ hóa đơn, bill chuyển khoản và ảnh bối cảnh.

- **Tiêu chí giao dịch hợp lệ**: Giao dịch hợp lệ cần có đủ tên giao dịch và giá tiền; tên giao dịch phải đủ rõ để AI Engine suy đoán được danh mục tương ứng.

- **Tính đúng đắn dữ liệu**: Hệ thống không được lưu giao dịch khi thiếu tên giao dịch, thiếu giá tiền hoặc không đủ chắc chắn để suy đoán danh mục.

- **Quản lý ngữ cảnh chat**: Nội dung thô trong khung chat chỉ được giữ làm ngữ cảnh xử lý trong `48 giờ`.

- **Giới hạn context LLM**: Hệ thống không gửi toàn bộ lịch sử chat dài hạn cho LLM; chỉ sử dụng ngữ cảnh trong thời gian cho phép và các đặc điểm/thói quen đã được đánh dấu.

- **Xóa dữ liệu**: Giao dịch bị xóa sẽ được xóa mềm trước, sau `48 giờ` sẽ xóa cứng khỏi nơi lưu trữ giao dịch chính.

- **Khôi phục thao tác xóa**: Người dùng có thể khôi phục giao dịch đã xóa trong vòng `30 giây` kể từ thời điểm xóa.

- **Truy vết**: Các giao dịch được tạo từ AI cần lưu nguồn đầu vào tương ứng, ví dụ văn bản, voice transcript hoặc hình ảnh đính kèm.

- **Bảo mật**: Hình ảnh hóa đơn, bill chuyển khoản, dữ liệu giao dịch, log phản hồi AI và đặc điểm/thói quen người dùng phải được xem là dữ liệu nhạy cảm và chỉ hiển thị cho đúng người dùng sở hữu hoặc vai trò được phép.

- **Tích hợp AI bên ngoài**: Được phép tích hợp API model AI/LLM bên ngoài trong phạm vi niên luận.

  

## Out of Scope

- Chia tiền nhóm hoặc split bill giữa nhiều người.

- Tự động đồng bộ giao dịch trực tiếp từ ngân hàng hoặc ví điện tử.

- Xây dựng mô hình AI/OCR riêng từ đầu.

- Báo cáo tài chính tuần/tháng/quý/năm.

- Nhập liệu từ bảng giá nếu PO chưa xác nhận bổ sung vào MVP.

- Đăng nhập/đăng ký chi tiết, nếu chưa được PO xác nhận là thuộc phạm vi tính năng này.

- Thiết kế chi tiết mô hình phân loại danh mục; phần này sẽ được đặc tả ở `REQ-02: Phân loại thông minh`.

  

## Open Questions

- [ ] Phạm vi phép tính cần hỗ trợ ngoài nhân đơn giản gồm những dạng nào?

- [ ] Có cần hỗ trợ tiếng địa phương, giọng nói nhiễu, nói nhanh hoặc nhiều người nói trong cùng một đoạn ghi âm không?

- [ ] Tiêu chí kỹ thuật để xác định “khớp rõ” giữa ngữ cảnh người dùng và mặt hàng trên bill là gì?

- [ ] Sau khi giao dịch bị xóa cứng, dữ liệu liên quan trong log AI/feedback có cần ẩn danh hóa hoặc xóa theo giao dịch gốc không?

- [ ] Danh sách đặc điểm/thói quen người dùng cần nhận diện thêm ngoài từ hay dùng, giao dịch hay chi, khung giờ hay chat gồm những gì?

- [ ] Có cần hiển thị thông báo/xin phép người dùng trước khi lưu đặc điểm/thói quen sử dụng để cá nhân hóa không?

  

## Hướng dẫn phê duyệt

> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-01.md` → `REQ-01.md`  

> Sau khi đổi tên, chạy lệnh `/plan-sprint` để PM bắt đầu phân rã task.
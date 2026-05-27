---
tags:
  - nien-luan
---
# REQ-09: Nhân cách AI (AI Personalities)

  

## Metadata

- **Brief nguồn**: `Yêu cầu tính năng.md` — mục 9: Nhân cách AI; tham chiếu `REQ-01`, `REQ-03`

- **Ngày tạo**: 25/05/2026

- **Lần cập nhật cuối**: 27/05/2026 — bản DRAFT đầu tiên

- **Trạng thái**: DRAFT — chờ PO phê duyệt

  

## Tóm tắt

Tính năng Nhân cách AI cho phép chatbot PerFin áp dụng các phong cách giao tiếp khác nhau khi tương tác với người dùng. Thay vì luôn phản hồi bằng một giọng điệu cố định, hệ thống cung cấp nhiều nhân cách AI có sẵn như Chuyên gia tài chính (mặc định), Bà mẹ nghiêm khắc, Bạn thân, Huấn luyện viên động lực. Mỗi nhân cách ảnh hưởng đến giọng điệu, từ vựng, emoji và cách đưa ra lời khuyên/nhắc nhở tài chính, nhưng không làm thay đổi logic xử lý giao dịch, bóc tách dữ liệu hay phân loại danh mục. Người dùng có thể chuyển đổi nhân cách bằng lệnh chat hoặc qua cài đặt. Hệ thống cũng hỗ trợ cá nhân hóa nhân cách theo thời gian dựa trên hành vi tài chính của người dùng, và trong phạm vi optional MVP, cho phép tạo nhân cách AI tùy chỉnh. Đây là tính năng gamification/behavioral psychology nhằm tăng mức độ gắn bó và thúc đẩy hành vi tài chính tích cực.

  

## Phân tích yêu cầu

  

### Actors

- **User**: Người dùng cuối chọn, chuyển đổi, tùy chỉnh nhân cách AI và nhận phản hồi theo giọng điệu nhân cách đang kích hoạt.

- **AI Engine**: Thành phần tạo phản hồi văn bản theo phong cách nhân cách được chọn, đưa ra lời khuyên/nhắc nhở phù hợp với vai trò của nhân cách, đồng thời giữ nguyên logic xử lý giao dịch.

- **System**: Ứng dụng lưu trữ nhân cách đang kích hoạt, danh sách nhân cách có sẵn, nhân cách tùy chỉnh, quản lý cấu hình nhân cách và áp dụng prompt/system instruction tương ứng khi gọi AI Engine.

- **Admin/Reviewer**: Người quản lý/biên soạn nội dung nhân cách mặc định, đánh giá chất lượng phản hồi của từng nhân cách.

  

### Features

- Cung cấp danh sách nhân cách AI có sẵn trong MVP.

- Cho phép chọn nhân cách AI mặc định khi lần đầu sử dụng.

- Cho phép chuyển đổi nhân cách AI bằng chat hoặc cài đặt.

- Nhân cách AI ảnh hưởng đến giọng điệu, từ vựng, emoji trong phản hồi.

- Nhân cách AI đưa ra lời khuyên/nhắc nhở phù hợp với vai trò.

- Cá nhân hóa nhân cách AI theo thời gian dựa trên hành vi tài chính.

- Nhân cách AI không ảnh hưởng đến logic xử lý giao dịch.

- Tạo nhân cách AI tùy chỉnh (optional MVP).

  

### Constraints

- Nhân cách AI chỉ thay đổi lớp phản hồi (tone, vocabulary, emoji, lời khuyên); không thay đổi kết quả bóc tách giao dịch, phân loại danh mục hoặc logic lưu/xóa/chỉnh sửa giao dịch.

- Mỗi người dùng tại một thời điểm chỉ có thể kích hoạt đúng một nhân cách AI.

- Nhân cách mặc định `Chuyên gia tài chính` không được xóa khỏi danh sách nhân cách có sẵn.

- Nhân cách AI cần phản hồi phù hợp với ngôn ngữ mà người dùng đang sử dụng: tiếng Việt, tiếng Anh hoặc pha trộn Việt - Anh theo REQ-01.

- Nhân cách tùy chỉnh thuộc phạm vi optional MVP, có thể không triển khai trong bản MVP đầu tiên.

- Dữ liệu cá nhân hóa nhân cách phải tuân thủ chính sách minh bạch: thông báo/xin phép người dùng trước khi sử dụng hành vi cá nhân theo REQ-01.

  

### Ambiguities

- ⚠️ AMBIGUOUS: Danh sách nhân cách AI có sẵn trong MVP chưa được PO chốt chính thức; các nhân cách nêu dưới đây là gợi ý ban đầu.

- ⚠️ AMBIGUOUS: Mức độ "cằn nhằn" hay "nghiêm khắc" của nhân cách Bà mẹ nghiêm khắc cần được xác định rõ để tránh gây khó chịu cho người dùng.

- ⚠️ AMBIGUOUS: Chưa rõ nhân cách AI có cần giữ nhất quán giọng điệu xuyên suốt các phiên chat khác nhau hay chỉ trong cùng một phiên.

- ⚠️ AMBIGUOUS: Chưa xác định giới hạn số lượng nhân cách tùy chỉnh mỗi người dùng được tạo.

  

### Out of Scope sơ bộ

- Thiết kế avatar hoặc hình ảnh đại diện cho từng nhân cách AI.

- Tạo giọng nói TTS khác nhau cho từng nhân cách AI.

- Marketplace chia sẻ nhân cách AI giữa người dùng.

- Training mô hình AI riêng cho từng nhân cách; MVP sử dụng prompt engineering.

  

## Actors

- **User**: Người dùng cuối chọn, chuyển đổi và tùy chỉnh nhân cách AI.

- **AI Engine**: Thành phần tạo phản hồi theo phong cách nhân cách đang kích hoạt.

- **System**: Ứng dụng quản lý nhân cách, lưu cấu hình, áp dụng prompt tương ứng.

- **Admin/Reviewer**: Người biên soạn/đánh giá nội dung nhân cách mặc định.

  

## Yêu cầu Chức năng

  

### FR-09-01: Chọn nhân cách AI mặc định

**Mô tả**: Khi người dùng sử dụng ứng dụng lần đầu hoặc chưa chọn nhân cách nào, hệ thống tự động kích hoạt nhân cách mặc định `Chuyên gia tài chính` (Financial Expert). Người dùng có thể thay đổi lựa chọn bất kỳ lúc nào.

  

**Acceptance Criteria**:

- Given người dùng sử dụng ứng dụng lần đầu

  When hệ thống khởi tạo cấu hình nhân cách cho người dùng

  Then hệ thống tự động kích hoạt nhân cách `Chuyên gia tài chính` làm nhân cách mặc định.

  

- Given người dùng chưa bao giờ thay đổi nhân cách AI

  When người dùng gửi tin nhắn chat bất kỳ

  Then hệ thống phản hồi bằng giọng điệu của nhân cách `Chuyên gia tài chính`.

  

- Given người dùng mới vừa đăng ký tài khoản

  When hệ thống hiển thị giao diện onboarding hoặc cài đặt

  Then hệ thống giới thiệu tính năng nhân cách AI và cho phép người dùng chọn nhân cách khác nếu muốn.

  

### FR-09-02: Danh sách nhân cách AI có sẵn trong MVP

**Mô tả**: Hệ thống cung cấp một danh sách nhân cách AI có sẵn trong phiên bản MVP. Mỗi nhân cách có tên hiển thị, mô tả ngắn về phong cách và ví dụ phản hồi mẫu để người dùng hình dung trước khi chọn.

  

**Acceptance Criteria**:

- Given hệ thống cung cấp danh sách nhân cách AI trong MVP

  When người dùng xem danh sách nhân cách

  Then danh sách phải bao gồm tối thiểu các nhân cách sau:

  | Tên nhân cách | Tên gốc | Mô tả phong cách |
  |---|---|---|
  | Chuyên gia tài chính | Financial Expert | Lời khuyên nhẹ nhàng, chuyên nghiệp, dùng số liệu cụ thể |
  | Bà mẹ nghiêm khắc | Angry Mom | Cằn nhằn khi tiêu hoang, khen khi tiết kiệm, dùng từ ngữ thân mật kiểu gia đình |
  | Bạn thân | Best Friend | Casual, đồng cảm, khích lệ, dùng emoji nhiều |
  | Huấn luyện viên | Motivational Coach | Tích cực, đặt mục tiêu, thúc đẩy kỷ luật tài chính |

  

- Given người dùng xem danh sách nhân cách AI

  When hệ thống hiển thị từng nhân cách

  Then mỗi nhân cách phải có tên hiển thị, mô tả ngắn về phong cách và ít nhất một câu phản hồi mẫu.

  

- Given danh sách nhân cách AI có sẵn

  When Admin/Reviewer muốn cập nhật nội dung mô tả hoặc phản hồi mẫu

  Then Admin/Reviewer có thể chỉnh sửa nội dung nhân cách có sẵn mà không ảnh hưởng đến nhân cách đang kích hoạt của người dùng.

  

- Given người dùng xem danh sách nhân cách

  When hệ thống hiển thị danh sách

  Then nhân cách đang kích hoạt phải được đánh dấu rõ ràng để phân biệt với các nhân cách khác.

  

⚠️ AMBIGUOUS: Danh sách nhân cách AI trên là gợi ý ban đầu; PO cần chốt chính thức số lượng và nội dung nhân cách cho MVP.

  

### FR-09-03: Chuyển đổi nhân cách AI bằng chat hoặc cài đặt

**Mô tả**: Người dùng có thể chuyển đổi nhân cách AI đang kích hoạt bằng hai cách: gửi lệnh trong chat hoặc thao tác trên giao diện cài đặt. Việc chuyển đổi có hiệu lực ngay lập tức cho các phản hồi tiếp theo.

  

**Acceptance Criteria**:

- Given người dùng đang sử dụng nhân cách `Chuyên gia tài chính`

  When người dùng nhập lệnh chat, ví dụ `đổi sang Bà mẹ nghiêm khắc` hoặc `chuyển nhân cách thành Angry Mom`

  Then hệ thống chuyển nhân cách đang kích hoạt sang `Bà mẹ nghiêm khắc` và phản hồi xác nhận bằng giọng điệu của nhân cách mới.

  

- Given người dùng đang ở giao diện cài đặt nhân cách AI

  When người dùng chọn một nhân cách khác từ danh sách và xác nhận

  Then hệ thống cập nhật nhân cách đang kích hoạt và phản hồi trong chat tiếp theo sử dụng giọng điệu của nhân cách mới.

  

- Given người dùng gửi lệnh chuyển đổi nhân cách bằng chat

  When hệ thống nhận diện được yêu cầu chuyển nhân cách

  Then hệ thống không tạo giao dịch mới từ lệnh đó mà chỉ thực hiện chuyển đổi nhân cách.

  

- Given người dùng gửi lệnh chuyển đổi nhân cách nhưng tên nhân cách không khớp với nhân cách nào trong danh sách

  When AI Engine không xác định được nhân cách yêu cầu

  Then hệ thống hiển thị danh sách nhân cách có sẵn và yêu cầu người dùng chọn lại.

  

- Given người dùng vừa chuyển đổi nhân cách thành công

  When hệ thống lưu cấu hình nhân cách mới

  Then nhân cách mới được giữ nguyên cho các phiên chat tiếp theo cho đến khi người dùng chuyển đổi lại.

  

- Given người dùng đang trong cuộc hội thoại có ngữ cảnh liên quan đến giao dịch chưa hoàn tất

  When người dùng chuyển đổi nhân cách

  Then hệ thống chuyển đổi giọng điệu phản hồi nhưng giữ nguyên ngữ cảnh hội thoại đang xử lý; giao dịch chưa hoàn tất không bị mất.

  

⚠️ AMBIGUOUS: Chưa rõ hệ thống có cần hỗ trợ các câu lệnh chuyển nhân cách bằng tiếng Anh như `switch to Angry Mom` hoặc pha trộn Việt - Anh không.

  

### FR-09-04: Nhân cách AI ảnh hưởng đến giọng điệu phản hồi

**Mô tả**: Mỗi nhân cách AI phải tạo ra phản hồi có giọng điệu, từ vựng, emoji và cách diễn đạt khác biệt rõ rệt. Giọng điệu phải nhất quán trong toàn bộ phản hồi của hệ thống khi nhân cách đó đang kích hoạt.

  

**Acceptance Criteria**:

- Given nhân cách `Chuyên gia tài chính` đang kích hoạt

  When người dùng ghi nhận giao dịch `trà sữa 50k`

  Then hệ thống phản hồi bằng giọng điệu chuyên nghiệp, nhẹ nhàng, ví dụ: `Đã ghi nhận chi tiêu Trà sữa 50.000đ vào danh mục Ăn uống. Tuần này bạn đã chi 350.000đ cho Ăn uống — bạn có muốn xem lại ngân sách không?`

  

- Given nhân cách `Bà mẹ nghiêm khắc` đang kích hoạt

  When người dùng ghi nhận giao dịch `trà sữa 50k`

  Then hệ thống phản hồi bằng giọng điệu cằn nhằn, thân mật kiểu gia đình, ví dụ: `Lại trà sữa nữa hả con?! 🤦‍♀️ 50.000đ đó! Tuần này con uống bao nhiêu ly rồi biết không? 350.000đ cho mỗi trà sữa thôi! Tiết kiệm chút đi con ơi!`

  

- Given nhân cách `Bạn thân` đang kích hoạt

  When người dùng ghi nhận giao dịch `trà sữa 50k`

  Then hệ thống phản hồi bằng giọng điệu casual, đồng cảm, ví dụ: `Ghi rồi nha! 🧋 Trà sữa 50k — ai mà cưỡng lại được đúng không 😋 Tuần này mình chi 350k cho ăn uống rồi đó, nhưng thỉnh thoảng treat bản thân cũng ok mà!`

  

- Given nhân cách `Huấn luyện viên` đang kích hoạt

  When người dùng ghi nhận giao dịch `trà sữa 50k`

  Then hệ thống phản hồi bằng giọng điệu tích cực, thúc đẩy mục tiêu, ví dụ: `💪 Ghi nhận Trà sữa 50.000đ! Mỗi khoản chi đều là cơ hội để kiểm soát tài chính. Tuần này bạn đã chi 350.000đ cho Ăn uống — hãy đặt mục tiêu giảm 10% tuần tới nhé! Bạn làm được! 🔥`

  

- Given nhân cách AI đang kích hoạt

  When hệ thống phản hồi bất kỳ nội dung nào, bao gồm xác nhận giao dịch, hỏi lại, cảnh báo ngân sách, phản hồi lỗi

  Then giọng điệu phản hồi phải nhất quán với nhân cách đang kích hoạt, không lẫn sang phong cách của nhân cách khác.

  

- Given người dùng giao tiếp bằng tiếng Anh hoặc pha trộn Việt - Anh

  When nhân cách AI đang kích hoạt

  Then hệ thống phản hồi bằng ngôn ngữ phù hợp với ngôn ngữ người dùng sử dụng, nhưng vẫn giữ giọng điệu của nhân cách đang kích hoạt.

  

### FR-09-05: Nhân cách AI đưa ra lời khuyên/nhắc nhở phù hợp với vai trò

**Mô tả**: Mỗi nhân cách AI không chỉ thay đổi giọng điệu mà còn thay đổi cách đưa ra lời khuyên, nhắc nhở và phản ứng đối với hành vi tài chính của người dùng. Tham chiếu REQ-03 cho cảnh báo ngân sách — giọng điệu cảnh báo phải phù hợp với nhân cách đang kích hoạt.

  

**Acceptance Criteria**:

- Given nhân cách `Chuyên gia tài chính` đang kích hoạt và người dùng vượt ngân sách ăn uống

  When hệ thống gửi cảnh báo ngân sách theo REQ-03

  Then cảnh báo được trình bày bằng giọng điệu chuyên nghiệp, đưa ra phân tích và đề xuất cụ thể, ví dụ: `Ngân sách Ăn uống tháng này đã vượt 15%. Đề xuất: xem xét giảm chi tiêu ăn ngoài trong 2 tuần tới.`

  

- Given nhân cách `Bà mẹ nghiêm khắc` đang kích hoạt và người dùng vượt ngân sách ăn uống

  When hệ thống gửi cảnh báo ngân sách theo REQ-03

  Then cảnh báo được trình bày bằng giọng điệu cằn nhằn, lo lắng, ví dụ: `Con ơi! 😤 Ngân sách ăn uống vượt rồi! Mẹ nói bao nhiêu lần rồi, phải biết tiết kiệm chứ! Tháng này ráng nhịn miệng lại nha con!`

  

- Given nhân cách `Bạn thân` đang kích hoạt và người dùng tiết kiệm thành công trong tháng

  When hệ thống nhận diện hành vi tài chính tích cực

  Then hệ thống gửi phản hồi khích lệ, ví dụ: `Woww 🎉 Tháng này bạn tiết kiệm được 2 triệu luôn! Giỏi quá trời! Đi ăn mừng một bữa đi 🍕`

  

- Given nhân cách `Huấn luyện viên` đang kích hoạt và người dùng chi tiêu liên tục nhiều ngày không tiết kiệm

  When hệ thống nhận diện hành vi tài chính cần cải thiện

  Then hệ thống gửi nhắc nhở động viên, ví dụ: `Này, 5 ngày rồi chưa thấy khoản tiết kiệm nào! 💪 Nhớ mục tiêu đầu tháng không? Hôm nay là ngày bắt đầu lại — đặt aside 100k nhé! Bạn hoàn toàn có thể! 🔥`

  

- Given nhân cách AI đang kích hoạt

  When hệ thống cần hỏi lại người dùng do thiếu thông tin giao dịch theo REQ-01

  Then câu hỏi làm rõ phải phù hợp với giọng điệu nhân cách đang kích hoạt, ví dụ Bà mẹ nghiêm khắc: `Con mua cái gì giá bao nhiêu nói rõ cho mẹ nghe coi!` thay vì `Vui lòng cung cấp thêm thông tin về giao dịch.`

  

- Given nhân cách AI đang kích hoạt

  When người dùng ghi nhận giao dịch tiết kiệm hoặc trả nợ thành công

  Then hệ thống đưa ra phản hồi tích cực phù hợp với vai trò nhân cách, không chỉ xác nhận giao dịch mà còn động viên theo phong cách tương ứng.

  

⚠️ AMBIGUOUS: Chưa xác định danh sách tình huống tài chính nào kích hoạt lời khuyên/nhắc nhở chủ động (proactive) từ nhân cách AI ngoài cảnh báo ngân sách REQ-03.

  

### FR-09-06: Cá nhân hóa nhân cách AI theo thời gian

**Mô tả**: Hệ thống có thể điều chỉnh cách nhân cách AI phản hồi dựa trên hành vi tài chính lặp lại của người dùng. Ví dụ, nếu người dùng thường xuyên chi tiêu vượt ngân sách ăn uống, nhân cách Bà mẹ nghiêm khắc có thể phản ứng mạnh hơn; nếu người dùng cải thiện thói quen, phản hồi sẽ tích cực hơn.

  

**Acceptance Criteria**:

- Given hệ thống đã ghi nhận hành vi tài chính lặp lại của người dùng, ví dụ vượt ngân sách ăn uống 3 tháng liên tiếp

  When nhân cách `Bà mẹ nghiêm khắc` đang kích hoạt và người dùng lại chi tiêu ăn uống

  Then hệ thống có thể đề cập đến xu hướng chi tiêu trong phản hồi, ví dụ: `3 tháng rồi con vượt ngân sách ăn uống! 😤`

  

- Given hệ thống muốn sử dụng hành vi cá nhân của người dùng để điều chỉnh phong cách nhân cách

  When người dùng chưa từng được thông báo hoặc chưa cấp phép

  Then hệ thống hiển thị thông báo/xin phép trước khi áp dụng cá nhân hóa nhân cách.

  

- Given người dùng đã đồng ý cho hệ thống cá nhân hóa nhân cách

  When hệ thống nhận diện được xu hướng tài chính tích cực, ví dụ tiết kiệm tăng đều

  Then nhân cách AI phản hồi với mức độ tích cực, khích lệ phù hợp với xu hướng đó.

  

- Given người dùng từ chối cho hệ thống cá nhân hóa nhân cách

  When hệ thống phản hồi người dùng

  Then hệ thống chỉ sử dụng giọng điệu mặc định của nhân cách đang kích hoạt, không tham chiếu đến hành vi tài chính trong quá khứ.

  

- Given dữ liệu ngữ cảnh chat thô đã quá 48 giờ

  When hệ thống cần cá nhân hóa nhân cách

  Then hệ thống không gửi toàn bộ nội dung chat cũ cho LLM mà chỉ sử dụng các đặc điểm/thói quen đã được đánh dấu theo REQ-01.

  

### FR-09-07: Nhân cách AI không ảnh hưởng đến logic xử lý giao dịch

**Mô tả**: Dù nhân cách AI nào đang kích hoạt, logic xử lý giao dịch của hệ thống phải hoạt động giống hệt nhau. Nhân cách AI chỉ ảnh hưởng đến lớp trình bày phản hồi (presentation layer), không ảnh hưởng đến bóc tách dữ liệu, phân loại danh mục, lưu/xóa/chỉnh sửa giao dịch, hoặc tính toán số liệu.

  

**Acceptance Criteria**:

- Given người dùng nhập `trà sữa 50k` khi nhân cách `Bà mẹ nghiêm khắc` đang kích hoạt

  When hệ thống xử lý giao dịch

  Then giao dịch được bóc tách thành tên `trà sữa`, số tiền `50.000đ` và danh mục `Ăn uống` — kết quả giống hệt khi bất kỳ nhân cách nào khác đang kích hoạt.

  

- Given người dùng nhập giao dịch thiếu thông tin, ví dụ chỉ nhập `50k`

  When nhân cách `Huấn luyện viên` đang kích hoạt

  Then hệ thống vẫn hỏi lại để bổ sung thông tin theo REQ-01, chỉ giọng điệu câu hỏi thay đổi theo nhân cách, không tự động lưu giao dịch thiếu thông tin.

  

- Given người dùng chuyển đổi nhân cách từ `Bạn thân` sang `Chuyên gia tài chính`

  When hệ thống xem lại các giao dịch đã lưu trước đó

  Then dữ liệu giao dịch, danh mục, số tiền không bị thay đổi — chỉ giọng điệu phản hồi khi hiển thị hoặc tương tác với giao dịch cũ thay đổi theo nhân cách mới.

  

- Given nhân cách `Bà mẹ nghiêm khắc` đang kích hoạt và cằn nhằn về khoản chi tiêu

  When hệ thống lưu giao dịch

  Then hệ thống vẫn lưu giao dịch đúng theo logic, không từ chối lưu giao dịch hợp lệ chỉ vì nhân cách "không đồng ý" với khoản chi đó.

  

- Given hai người dùng khác nhau nhập cùng một giao dịch `ăn sáng 30k` nhưng sử dụng nhân cách khác nhau

  When hệ thống xử lý giao dịch cho cả hai

  Then kết quả bóc tách, danh mục, số tiền phải giống nhau; chỉ phản hồi hiển thị khác nhau theo nhân cách từng người dùng.

  

### FR-09-08: Tạo nhân cách AI tùy chỉnh (Optional MVP)

**Mô tả**: Trong phạm vi optional MVP, người dùng có thể tạo nhân cách AI tùy chỉnh bằng cách mô tả phong cách phản hồi mong muốn. Hệ thống sử dụng mô tả này để tạo prompt instruction cho AI Engine.

  

**Acceptance Criteria**:

- Given người dùng muốn tạo nhân cách AI tùy chỉnh

  When người dùng nhập tên nhân cách và mô tả phong cách, ví dụ tên `Ông nội` với mô tả `Hiền từ, nói chuyện từ tốn, hay kể chuyện ngày xưa, khuyên nhủ nhẹ nhàng`

  Then hệ thống lưu nhân cách tùy chỉnh vào danh sách nhân cách của người dùng.

  

- Given người dùng đã tạo nhân cách tùy chỉnh

  When người dùng kích hoạt nhân cách tùy chỉnh đó

  Then hệ thống sử dụng mô tả phong cách đã lưu để tạo prompt instruction cho AI Engine, phản hồi theo phong cách người dùng đã mô tả.

  

- Given người dùng tạo nhân cách tùy chỉnh với mô tả quá ngắn hoặc không rõ ràng

  When hệ thống xử lý mô tả phong cách

  Then hệ thống gợi ý người dùng bổ sung thêm chi tiết về phong cách mong muốn, ví dụ giọng điệu, từ vựng, emoji, cách phản ứng khi chi tiêu hoang.

  

- Given người dùng muốn chỉnh sửa nhân cách tùy chỉnh đã tạo

  When người dùng cập nhật tên hoặc mô tả phong cách

  Then hệ thống cập nhật cấu hình nhân cách và phản hồi tiếp theo sử dụng phong cách đã chỉnh sửa.

  

- Given người dùng muốn xóa nhân cách tùy chỉnh đã tạo

  When nhân cách đó đang kích hoạt

  Then hệ thống chuyển về nhân cách mặc định `Chuyên gia tài chính` trước khi xóa nhân cách tùy chỉnh.

  

- Given người dùng muốn xóa nhân cách tùy chỉnh đã tạo

  When nhân cách đó không phải nhân cách đang kích hoạt

  Then hệ thống xóa nhân cách tùy chỉnh khỏi danh sách nhân cách của người dùng.

  

- Given người dùng tạo nhân cách tùy chỉnh với nội dung vi phạm, ví dụ phân biệt chủng tộc, xúc phạm hoặc khuyến khích hành vi tài chính nguy hiểm

  When hệ thống xử lý mô tả phong cách

  Then hệ thống từ chối tạo nhân cách và thông báo lý do.

  

⚠️ AMBIGUOUS: Chưa xác định giới hạn số lượng nhân cách tùy chỉnh mỗi người dùng được tạo; đề xuất 3-5 trong MVP.

  

⚠️ AMBIGUOUS: Chưa rõ tiêu chí kiểm duyệt nội dung mô tả nhân cách tùy chỉnh do AI tự kiểm tra hay cần Admin review.

  

### FR-09-09: Hiển thị nhân cách AI đang kích hoạt

**Mô tả**: Hệ thống phải hiển thị rõ ràng nhân cách AI đang kích hoạt để người dùng biết mình đang tương tác với phong cách nào.

  

**Acceptance Criteria**:

- Given người dùng đang ở màn hình chat

  When nhân cách AI đang kích hoạt

  Then hệ thống hiển thị tên nhân cách đang kích hoạt tại vị trí dễ nhận biết trên giao diện chat.

  

- Given người dùng vừa chuyển đổi nhân cách thành công

  When hệ thống cập nhật giao diện

  Then tên nhân cách hiển thị trên giao diện chat được cập nhật ngay lập tức.

  

- Given người dùng đang ở giao diện cài đặt

  When hệ thống hiển thị phần cài đặt nhân cách AI

  Then nhân cách đang kích hoạt phải được đánh dấu rõ ràng, ví dụ bằng checkmark, highlight hoặc badge.

  

### FR-09-10: Xem trước phong cách nhân cách trước khi chọn

**Mô tả**: Trước khi chuyển đổi nhân cách, người dùng có thể xem trước cách nhân cách đó phản hồi thông qua các câu mẫu, giúp người dùng chọn nhân cách phù hợp.

  

**Acceptance Criteria**:

- Given người dùng đang xem danh sách nhân cách AI

  When người dùng nhấn vào một nhân cách để xem chi tiết

  Then hệ thống hiển thị ít nhất 2-3 câu phản hồi mẫu cho các tình huống khác nhau, ví dụ khi ghi nhận giao dịch, khi vượt ngân sách, khi tiết kiệm thành công.

  

- Given người dùng xem trước nhân cách `Bà mẹ nghiêm khắc`

  When hệ thống hiển thị câu mẫu

  Then các câu mẫu phải thể hiện rõ ràng giọng điệu cằn nhằn, thân mật kiểu gia đình, có emoji phù hợp.

  

- Given người dùng xem trước nhân cách tùy chỉnh do chính người dùng tạo

  When hệ thống hiển thị câu mẫu

  Then hệ thống tạo câu mẫu dựa trên mô tả phong cách do người dùng cung cấp.

  

### FR-09-11: Lịch sử chat giữ nguyên khi chuyển nhân cách

**Mô tả**: Khi người dùng chuyển đổi nhân cách AI, toàn bộ lịch sử chat trước đó phải được giữ nguyên. Phản hồi cũ không bị viết lại theo nhân cách mới.

  

**Acceptance Criteria**:

- Given người dùng đang sử dụng nhân cách `Bạn thân` và đã có 10 tin nhắn phản hồi

  When người dùng chuyển sang nhân cách `Chuyên gia tài chính`

  Then 10 tin nhắn phản hồi cũ vẫn hiển thị nguyên bản với giọng điệu `Bạn thân`, không bị viết lại.

  

- Given người dùng chuyển đổi nhân cách

  When hệ thống xử lý chuyển đổi

  Then tin nhắn đầu tiên sau khi chuyển đổi phải sử dụng giọng điệu của nhân cách mới.

  

- Given người dùng xem lại lịch sử chat có nhiều lần chuyển đổi nhân cách

  When hệ thống hiển thị lịch sử

  Then hệ thống có thể hiển thị dấu mốc hoặc nhãn nhỏ cho biết nhân cách đã thay đổi tại thời điểm đó, nhưng không bắt buộc trong MVP.

  

## Yêu cầu Phi chức năng (NFR)

- **Nhân cách mặc định**: `Chuyên gia tài chính` là nhân cách mặc định khi người dùng chưa chọn nhân cách nào.

- **Số lượng nhân cách MVP**: Tối thiểu 4 nhân cách có sẵn trong MVP: Chuyên gia tài chính, Bà mẹ nghiêm khắc, Bạn thân, Huấn luyện viên.

- **Tính nhất quán giọng điệu**: Phản hồi phải nhất quán với nhân cách đang kích hoạt trong mọi tình huống: xác nhận giao dịch, hỏi lại, cảnh báo ngân sách, phản hồi lỗi, lời khuyên chủ động.

- **Ngôn ngữ**: Nhân cách AI phải phản hồi phù hợp với ngôn ngữ người dùng sử dụng: tiếng Việt, tiếng Anh hoặc pha trộn Việt - Anh theo REQ-01.

- **Không ảnh hưởng logic**: Nhân cách AI không được thay đổi kết quả bóc tách giao dịch, phân loại danh mục, tính toán số tiền hoặc quyết định lưu/xóa giao dịch.

- **Hiệu năng**: Việc chuyển đổi nhân cách không được gây trễ đáng kể cho phản hồi chat; hệ thống chỉ thay đổi system prompt/instruction gửi cho LLM.

- **Bảo mật**: Dữ liệu nhân cách tùy chỉnh, cấu hình nhân cách đang kích hoạt là dữ liệu riêng tư, chỉ hiển thị cho người dùng sở hữu.

- **Kiểm duyệt nội dung**: Hệ thống cần kiểm tra nội dung mô tả nhân cách tùy chỉnh để tránh nội dung vi phạm.

- **Minh bạch cá nhân hóa**: Hệ thống phải thông báo/xin phép trước khi sử dụng hành vi tài chính cá nhân để điều chỉnh phong cách nhân cách.

- **Quản lý ngữ cảnh**: Cá nhân hóa nhân cách tuân thủ quy tắc ngữ cảnh 48 giờ và không gửi toàn bộ lịch sử chat dài hạn cho LLM theo REQ-01.

- **Triển khai kỹ thuật**: Nhân cách AI được triển khai thông qua prompt engineering (system prompt/instruction); MVP không yêu cầu training mô hình riêng cho từng nhân cách.

  

## Out of Scope

- Thiết kế avatar hoặc hình ảnh đại diện cho từng nhân cách AI.

- Tạo giọng nói TTS khác nhau cho từng nhân cách (tất cả nhân cách dùng cùng engine TTS nếu có).

- Marketplace chia sẻ nhân cách AI tùy chỉnh giữa người dùng.

- Training mô hình AI/LLM riêng từ đầu cho từng nhân cách.

- Nhân cách AI thay đổi giao diện (theme, màu sắc) của ứng dụng.

- Nhiều nhân cách hoạt động đồng thời trong cùng một phiên chat.

- Hệ thống tự động chuyển nhân cách dựa trên tâm trạng người dùng.

  

## Open Questions

- [ ] Danh sách nhân cách AI có sẵn trong MVP gồm chính xác những nhân cách nào? Có thêm nhân cách nào ngoài 4 nhân cách gợi ý ban đầu không?

- [ ] Mức độ "cằn nhằn" hoặc "nghiêm khắc" tối đa cho nhân cách Bà mẹ nghiêm khắc là gì để tránh gây khó chịu?

- [ ] Nhân cách AI có cần giữ nhất quán giọng điệu xuyên suốt các phiên chat khác nhau hay chỉ trong cùng một phiên?

- [ ] Giới hạn số lượng nhân cách tùy chỉnh mỗi người dùng được tạo là bao nhiêu?

- [ ] Tiêu chí kiểm duyệt nội dung mô tả nhân cách tùy chỉnh do AI tự kiểm tra hay cần Admin review?

- [ ] Hệ thống có hỗ trợ lệnh chuyển nhân cách bằng tiếng Anh hoặc pha trộn Việt - Anh không?

- [ ] Danh sách tình huống tài chính nào kích hoạt lời khuyên/nhắc nhở chủ động (proactive) từ nhân cách AI ngoài cảnh báo ngân sách REQ-03?

- [ ] Nhân cách tùy chỉnh có thuộc MVP bắt buộc hay chỉ là optional feature có thể bỏ qua?

  

## Hướng dẫn phê duyệt

> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-09.md` → `REQ-09.md`  

> Sau khi đổi tên, BA mới chuyển sang tạo DRAFT cho `REQ-10`.

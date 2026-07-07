---
tags:
  - nien-luan
---
# REQ-05: Quản lý Tài khoản Đa nguồn (Multi-Account Management)

  

## Metadata

- **Brief nguồn**: `Yêu cầu tính năng.md` — mục 5: Quản lý tài khoản đa nguồn; tham chiếu `REQ-01`, `REQ-02`, `REQ-06`

- **Ngày tạo**: 25/05/2026

- **Lần cập nhật cuối**: 27/05/2026 — bản DRAFT đầu tiên

- **Trạng thái**: DRAFT — chờ PO phê duyệt

  

## Tóm tắt

Cho phép người dùng tạo và quản lý nhiều ví/tài khoản tài chính trong cùng một ứng dụng, bao gồm ví tiền mặt, tài khoản ngân hàng, ví điện tử và tài khoản đầu tư. Hệ thống theo dõi số dư từng ví riêng biệt, tổng hợp số dư toàn bộ để cung cấp tổng quan tài sản, hỗ trợ chuyển tiền giữa các ví (Transfer) mà không tính là chi phí hoặc thu nhập, cho phép gán giao dịch vào ví cụ thể bằng ngôn ngữ tự nhiên trong chat, thiết lập ví mặc định, theo dõi dòng tiền đầu tư giữa ví thường và tài khoản đầu tư, tính tài sản ròng (Net Worth) bằng tổng tất cả ví trừ nợ, và xử lý xóa ví cùng dữ liệu liên quan.

  

## Phân tích yêu cầu

  

### Actors

- **User**: Người dùng cuối tạo, chỉnh sửa, xóa ví/tài khoản; thực hiện chuyển tiền giữa các ví; gán giao dịch vào ví; xem tổng quan tài sản và tài sản ròng.

- **AI Engine**: Thành phần xử lý ngôn ngữ tự nhiên để nhận diện ví đích từ input chat, xác định giao dịch chuyển tiền (Transfer) và phân biệt với chi phí/thu nhập thông thường.

- **System**: Ứng dụng quản lý danh sách ví, cập nhật số dư, thực hiện chuyển tiền nội bộ, tính toán tổng quan tài sản và tài sản ròng, xử lý xóa ví và dữ liệu liên quan.

- **Admin/Reviewer**: Người đánh giá thủ công các trường hợp AI nhận diện sai loại giao dịch Transfer hoặc gán sai ví để cải thiện chất lượng hệ thống.

  

### Features

- Tạo và quản lý nhiều ví/tài khoản thuộc các loại: tiền mặt, ngân hàng, ví điện tử, tài khoản đầu tư.

- Theo dõi số dư từng ví riêng biệt, cập nhật tự động khi có giao dịch mới, chỉnh sửa hoặc xóa giao dịch.

- Tổng hợp số dư toàn bộ ví để cung cấp tổng quan tài sản cho người dùng.

- Hỗ trợ chuyển tiền giữa các ví (Transfer) — không phải chi phí và không phải thu nhập.

- Gán giao dịch vào ví cụ thể khi tạo hoặc chỉnh sửa giao dịch.

- AI nhận diện ví đích từ ngôn ngữ tự nhiên trong chat.

- Thiết lập ví mặc định để giao dịch tự động gán vào ví đó khi người dùng không chỉ định.

- Theo dõi dòng tiền đầu tư giữa ví thường và tài khoản đầu tư.

- Tính tài sản ròng (Net Worth) = tổng số dư tất cả ví − tổng nợ.

- Xóa ví kèm xử lý dữ liệu giao dịch liên quan.

  

### Constraints

- Mỗi ví thuộc về một người dùng cụ thể; thay đổi ví của một người dùng không ảnh hưởng đến người dùng khác.

- Chuyển tiền giữa các ví (Transfer) không được tính vào chi phí hoặc thu nhập; tổng tài sản không thay đổi sau Transfer.

- Khi tạo giao dịch mà người dùng không chỉ định ví, hệ thống gán vào ví mặc định.

- Người dùng phải có ít nhất một ví hoạt động trong hệ thống.

- Số dư ví có thể âm (ví dụ tài khoản tín dụng hoặc thấu chi).

- Tài sản ròng phải tính đúng bao gồm cả khoản nợ từ REQ-06.

- Ngữ cảnh chat thô chỉ được giữ trong 48 giờ theo REQ-01.

- Đầu vào cần hỗ trợ tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh theo REQ-01.

  

### Loại ví/tài khoản hỗ trợ trong MVP

| Loại ví | Mô tả |
|---|---|
| Tiền mặt | Ví tiền mặt thực tế |
| Ngân hàng | Tài khoản ngân hàng (VCB, MB, TCB, v.v.) |
| Ví điện tử | Momo, ZaloPay, VNPay, ShopeePay, v.v. |
| Tài khoản đầu tư | Tài khoản chứng khoán, quỹ đầu tư, crypto, v.v. |

  

### Ambiguities

- ⚠️ AMBIGUOUS: Chưa rõ có cần hỗ trợ loại ví "Tín dụng" riêng biệt hay gộp chung với "Ngân hàng".

- ⚠️ AMBIGUOUS: Chưa rõ số dư ban đầu khi tạo ví mới có bắt buộc nhập hay mặc định là 0.

- ⚠️ AMBIGUOUS: Chưa chốt giới hạn số lượng ví tối đa một người dùng có thể tạo trong MVP.

- ⚠️ AMBIGUOUS: Chưa rõ giao dịch Transfer có hỗ trợ phí chuyển khoản (transfer fee) hay không.

- ⚠️ AMBIGUOUS: Khi ví bị xóa, chưa chốt nên chuyển giao dịch liên quan sang ví khác hay xóa cứng giao dịch.

  

### Out of Scope sơ bộ

- Đồng bộ tự động số dư từ ngân hàng hoặc ví điện tử qua API.

- Quản lý tài khoản tín dụng chi tiết (hạn mức, lãi suất, kỳ thanh toán).

- Chuyển tiền thực tế giữa các tài khoản ngân hàng/ví điện tử.

- Quản lý đa tiền tệ hoặc quy đổi ngoại tệ.

- Chia tiền nhóm hoặc ví chung giữa nhiều người dùng.

  

## Actors

- **User**: Người dùng cuối tạo, chỉnh sửa, xóa ví; chuyển tiền giữa ví; gán giao dịch vào ví; xem tổng quan tài sản và tài sản ròng.

- **AI Engine**: Thành phần nhận diện ví đích và loại giao dịch Transfer từ ngôn ngữ tự nhiên.

- **System**: Ứng dụng lưu trữ ví, cập nhật số dư, tính toán tổng tài sản, tài sản ròng, xử lý Transfer và xóa ví.

- **Admin/Reviewer**: Người đánh giá thủ công log AI nhận diện sai Transfer/ví để cải thiện chất lượng.

  

## Yêu cầu Chức năng

  

### FR-05-01: Tạo và quản lý nhiều ví/tài khoản

**Mô tả**: Người dùng có thể tạo nhiều ví/tài khoản thuộc các loại khác nhau gồm tiền mặt, ngân hàng, ví điện tử và tài khoản đầu tư. Mỗi ví cần có tên hiển thị, loại ví và số dư ban đầu. Người dùng có thể chỉnh sửa thông tin ví hoặc xóa ví không còn sử dụng.

  

**Acceptance Criteria**:

- Given người dùng sử dụng ứng dụng lần đầu

  When hệ thống khởi tạo dữ liệu cho người dùng mới

  Then hệ thống tạo sẵn một ví mặc định `Tiền mặt` với số dư ban đầu `0đ` và đặt làm ví mặc định.

  

- Given người dùng muốn tạo ví mới

  When người dùng nhập tên ví, chọn loại ví (tiền mặt, ngân hàng, ví điện tử, tài khoản đầu tư) và nhập số dư ban đầu

  Then hệ thống tạo ví mới với thông tin đã cung cấp và thêm vào danh sách ví của người dùng.

  

- Given người dùng muốn tạo ví trùng tên với ví đang tồn tại

  When người dùng xác nhận tạo ví

  Then hệ thống từ chối tạo ví trùng tên và yêu cầu người dùng chọn tên khác.

  

- Given người dùng muốn chỉnh sửa thông tin ví hiện có

  When người dùng cập nhật tên ví hoặc loại ví

  Then hệ thống cập nhật thông tin ví và phản hồi xác nhận cho người dùng.

  

- Given người dùng muốn chỉnh sửa số dư ví thủ công

  When người dùng nhập số dư mới

  Then hệ thống cập nhật số dư ví theo giá trị mới và ghi nhận thao tác điều chỉnh số dư để phục vụ truy vết.

  

⚠️ AMBIGUOUS: Chưa rõ có cần lưu thông tin bổ sung cho ví ngân hàng như tên ngân hàng, số tài khoản (tùy chọn) hay không.

  

### FR-05-02: Theo dõi số dư từng ví

**Mô tả**: Hệ thống tự động cập nhật số dư ví khi có giao dịch mới được tạo, chỉnh sửa hoặc xóa. Số dư ví phải phản ánh đúng tổng các giao dịch thu/chi/chuyển tiền đã ghi nhận.

  

**Acceptance Criteria**:

- Given người dùng tạo một giao dịch chi phí `trà sữa 50.000đ` gán vào ví `Momo`

  When hệ thống lưu giao dịch thành công

  Then số dư ví `Momo` giảm `50.000đ`.

  

- Given người dùng tạo một giao dịch thu nhập `lương 8.000.000đ` gán vào ví `VCB`

  When hệ thống lưu giao dịch thành công

  Then số dư ví `VCB` tăng `8.000.000đ`.

  

- Given người dùng chỉnh sửa số tiền giao dịch từ `50.000đ` thành `70.000đ`

  When hệ thống cập nhật giao dịch thành công

  Then số dư ví liên quan được điều chỉnh theo chênh lệch `20.000đ`.

  

- Given người dùng xóa một giao dịch chi phí `50.000đ` đã ghi nhận vào ví `Tiền mặt`

  When hệ thống xóa mềm giao dịch theo REQ-01

  Then số dư ví `Tiền mặt` được hoàn lại `50.000đ`.

  

- Given người dùng khôi phục giao dịch đã xóa trong vòng `30 giây` theo REQ-01

  When hệ thống khôi phục giao dịch thành công

  Then số dư ví liên quan được điều chỉnh lại về trạng thái trước khi xóa.

  

- Given người dùng muốn xem số dư hiện tại của một ví cụ thể

  When người dùng truy cập thông tin ví

  Then hệ thống hiển thị số dư hiện tại của ví đó, đã phản ánh tất cả giao dịch liên quan.

  

### FR-05-03: Tổng hợp số dư toàn bộ (tổng quan tài sản)

**Mô tả**: Hệ thống tổng hợp số dư từ tất cả ví đang hoạt động của người dùng để cung cấp cái nhìn tổng quan về tài sản hiện có. Tổng quan tài sản bao gồm tổng số dư tất cả ví, chi tiết từng ví và tỷ lệ phân bổ.

  

**Acceptance Criteria**:

- Given người dùng có 3 ví: `Tiền mặt` (2.000.000đ), `VCB` (15.000.000đ), `Momo` (500.000đ)

  When người dùng xem tổng quan tài sản

  Then hệ thống hiển thị tổng số dư `17.500.000đ` cùng chi tiết số dư từng ví.

  

- Given người dùng tạo giao dịch mới ảnh hưởng đến số dư ví

  When hệ thống cập nhật số dư ví

  Then tổng quan tài sản được cập nhật tương ứng.

  

- Given người dùng có ví với số dư âm, ví dụ tài khoản thấu chi `−1.000.000đ`

  When hệ thống tính tổng quan tài sản

  Then hệ thống tính đúng tổng bao gồm cả ví có số dư âm.

  

- Given người dùng muốn xem tỷ lệ phân bổ tài sản theo từng ví

  When người dùng xem tổng quan tài sản

  Then hệ thống hiển thị tỷ lệ phần trăm của từng ví so với tổng tài sản.

  

⚠️ AMBIGUOUS: Chưa rõ tổng quan tài sản có cần hiển thị biểu đồ (pie chart/bar chart) hay chỉ cần số liệu dạng danh sách trong MVP.

  

### FR-05-04: Chuyển tiền giữa các ví (Transfer)

**Mô tả**: Người dùng có thể chuyển tiền từ ví này sang ví khác trong cùng hệ thống. Giao dịch Transfer giảm số dư ví nguồn và tăng số dư ví đích với cùng số tiền, không tính là chi phí hoặc thu nhập thông thường. AI Engine cần nhận diện input Transfer từ ngôn ngữ tự nhiên để tránh phân loại sai thành Expense.

  

**Acceptance Criteria**:

- Given người dùng nhập `chuyển 1 triệu từ ví tiền mặt sang Momo`

  When AI Engine xử lý đầu vào

  Then hệ thống nhận diện đây là giao dịch `Transfer`, giảm số dư ví `Tiền mặt` 1.000.000đ, tăng số dư ví `Momo` 1.000.000đ và không tính vào chi phí hoặc thu nhập.

  

- Given người dùng thực hiện Transfer `500.000đ` từ ví A sang ví B

  When hệ thống hoàn tất Transfer

  Then tổng tài sản của người dùng không thay đổi so với trước Transfer.

  

- Given người dùng nhập `chuyển tiền sang VCB 2 triệu`

  When AI Engine không xác định được ví nguồn

  Then hệ thống hỏi lại người dùng ví nguồn muốn chuyển tiền từ đâu.

  

- Given người dùng yêu cầu Transfer nhưng ví nguồn không đủ số dư

  When hệ thống kiểm tra số dư ví nguồn

  Then hệ thống cảnh báo ví nguồn không đủ số dư và hỏi người dùng có muốn tiếp tục hay không.

  

- Given người dùng yêu cầu Transfer giữa hai ví cùng tên hoặc không tồn tại

  When hệ thống không xác định được ví nguồn hoặc ví đích

  Then hệ thống hỏi lại người dùng để chọn đúng ví trước khi thực hiện.

  

- Given giao dịch Transfer đã được lưu

  When hệ thống tổng hợp báo cáo chi phí/thu nhập

  Then giao dịch Transfer không xuất hiện trong danh sách chi phí hoặc thu nhập.

  

⚠️ AMBIGUOUS: Chưa rõ Transfer có hỗ trợ phí chuyển khoản (ví dụ phí chuyển tiền liên ngân hàng) hay không. Nếu có, phí chuyển khoản có được tính là chi phí riêng không.

  

### FR-05-05: Gán giao dịch vào ví cụ thể

**Mô tả**: Khi tạo giao dịch, người dùng có thể chỉ định ví mà giao dịch sẽ được ghi nhận. Nếu không chỉ định, hệ thống gán vào ví mặc định. Người dùng cũng có thể thay đổi ví của giao dịch đã lưu.

  

**Acceptance Criteria**:

- Given người dùng nhập `trà sữa 50k ví Momo`

  When AI Engine bóc tách giao dịch và nhận diện ví `Momo` đang tồn tại

  Then hệ thống tạo giao dịch chi phí `trà sữa 50.000đ` và gán vào ví `Momo`.

  

- Given người dùng nhập `ăn sáng 30k` mà không chỉ định ví

  When AI Engine bóc tách giao dịch

  Then hệ thống gán giao dịch vào ví mặc định của người dùng.

  

- Given người dùng nhập `đổi giao dịch trà sữa hôm nay sang ví VCB`

  When hệ thống xác định đúng giao dịch cần thay đổi

  Then hệ thống chuyển giao dịch sang ví `VCB`, cập nhật số dư ví cũ (hoàn lại) và số dư ví mới (trừ thêm).

  

- Given người dùng nhập tên ví không tồn tại trong danh sách ví hiện có

  When AI Engine xử lý đầu vào

  Then hệ thống hỏi lại người dùng muốn chọn ví hiện có hay tạo ví mới.

  

- Given người dùng chỉ định ví cho giao dịch nhưng câu lệnh có thể khớp với nhiều ví

  When AI Engine không xác định được duy nhất ví đích

  Then hệ thống hỏi lại người dùng để chọn đúng ví trước khi gán giao dịch.

  

### FR-05-06: Gán ví bằng ngôn ngữ tự nhiên trong chat

**Mô tả**: AI Engine nhận diện ví đích từ ngôn ngữ tự nhiên trong tin nhắn chat của người dùng. Hệ thống cần hiểu các cách diễn đạt khác nhau khi người dùng nhắc đến ví trong tiếng Việt, tiếng Anh hoặc câu pha trộn.

  

**Acceptance Criteria**:

- Given người dùng nhập `mua sách 120k bằng VCB`

  When AI Engine xử lý đầu vào

  Then hệ thống nhận diện ví đích là `VCB` và gán giao dịch vào ví đó.

  

- Given người dùng nhập `café 45k, trả bằng momo`

  When AI Engine xử lý đầu vào

  Then hệ thống nhận diện ví đích là `Momo` và gán giao dịch vào ví đó.

  

- Given người dùng nhập `grab 30k pay by cash`

  When AI Engine xử lý đầu vào pha trộn Việt - Anh

  Then hệ thống nhận diện ví đích là `Tiền mặt` và gán giao dịch vào ví đó.

  

- Given người dùng nhập `lunch 80k from my bank account`

  When AI Engine xử lý đầu vào tiếng Anh và người dùng có nhiều ví loại ngân hàng

  Then hệ thống hỏi lại người dùng để chọn đúng ví ngân hàng cụ thể.

  

- Given người dùng nhắc đến ví bằng tên viết tắt hoặc biệt danh không khớp chính xác

  When AI Engine cố gắng khớp với danh sách ví hiện có của người dùng

  Then hệ thống chọn ví có tên gần khớp nhất hoặc hỏi lại nếu không đủ tin cậy.

  

⚠️ AMBIGUOUS: Chưa rõ ngưỡng tin cậy (confidence threshold) để AI tự động gán ví thay vì hỏi lại người dùng.

  

### FR-05-07: Ví mặc định

**Mô tả**: Người dùng có thể thiết lập một ví làm ví mặc định. Tất cả giao dịch không chỉ định ví sẽ tự động được gán vào ví mặc định. Hệ thống luôn đảm bảo có đúng một ví mặc định.

  

**Acceptance Criteria**:

- Given người dùng sử dụng ứng dụng lần đầu

  When hệ thống tạo ví mặc định `Tiền mặt`

  Then ví `Tiền mặt` được đánh dấu là ví mặc định.

  

- Given người dùng muốn đổi ví mặc định sang ví `Momo`

  When người dùng xác nhận thay đổi

  Then hệ thống đặt ví `Momo` làm ví mặc định và bỏ đánh dấu ví mặc định cũ.

  

- Given người dùng tạo giao dịch mà không chỉ định ví

  When hệ thống xử lý giao dịch

  Then giao dịch được gán vào ví mặc định hiện tại.

  

- Given người dùng nhập `đặt ví mặc định là VCB` trong chat

  When AI Engine nhận diện yêu cầu thay đổi ví mặc định

  Then hệ thống cập nhật ví mặc định sang `VCB` và phản hồi xác nhận.

  

- Given người dùng xóa ví đang được đặt làm ví mặc định

  When hệ thống xử lý xóa ví

  Then hệ thống yêu cầu người dùng chọn ví khác làm ví mặc định trước khi cho phép xóa.

  

- Given hệ thống kiểm tra trạng thái ví mặc định

  When kiểm tra danh sách ví của người dùng

  Then luôn có đúng một ví được đánh dấu là ví mặc định.

  

### FR-05-08: Tracking dòng tiền đầu tư

**Mô tả**: Hệ thống theo dõi dòng tiền giữa ví thường và tài khoản đầu tư. Khi người dùng chuyển tiền từ ví thường sang tài khoản đầu tư, hệ thống ghi nhận đây là giao dịch đặc biệt `Chuyển tiền đi đầu tư` (theo REQ-02 FR-02-08), không phải chi phí sinh hoạt. Khi rút tiền từ tài khoản đầu tư về ví thường, hệ thống ghi nhận tương tự.

  

**Acceptance Criteria**:

- Given người dùng nhập `chuyển 10 triệu vào tài khoản MBS để đầu tư`

  When AI Engine nhận diện giao dịch đặc biệt `Chuyển tiền đi đầu tư` (theo REQ-02)

  Then hệ thống giảm số dư ví nguồn `10.000.000đ`, tăng số dư tài khoản đầu tư `MBS` `10.000.000đ` và ghi nhận loại giao dịch là `Chuyển tiền đi đầu tư`.

  

- Given người dùng nhập `rút 5 triệu từ MBS về VCB`

  When AI Engine nhận diện giao dịch rút tiền đầu tư

  Then hệ thống giảm số dư tài khoản đầu tư `MBS` `5.000.000đ`, tăng số dư ví `VCB` `5.000.000đ`.

  

- Given người dùng chuyển tiền từ ví thường sang tài khoản đầu tư

  When hệ thống tổng hợp chi phí sinh hoạt

  Then giao dịch chuyển tiền đầu tư không được tính vào chi phí sinh hoạt thông thường.

  

- Given người dùng chuyển tiền đi đầu tư

  When hệ thống tính tổng quan tài sản

  Then tổng tài sản không thay đổi vì tiền chỉ di chuyển từ ví này sang ví khác.

  

- Given tài khoản đầu tư có ghi nhận lãi/lỗ theo REQ-06

  When hệ thống tính số dư tài khoản đầu tư

  Then số dư tài khoản đầu tư phản ánh đúng giá trị bao gồm lãi/lỗ đã ghi nhận.

  

⚠️ AMBIGUOUS: Chưa rõ lãi/lỗ đầu tư được cập nhật tự động hay người dùng phải nhập thủ công. Chi tiết quản lý lãi/lỗ thuộc REQ-06.

  

### FR-05-09: Tính tài sản ròng (Net Worth)

**Mô tả**: Hệ thống tính tài sản ròng (Net Worth) của người dùng bằng tổng số dư tất cả ví trừ đi tổng nợ đang có. Nợ bao gồm các khoản vay mượn được quản lý theo REQ-06 (FR-06-05).

  

**Acceptance Criteria**:

- Given người dùng có tổng số dư tất cả ví là `20.000.000đ` và tổng nợ đang có là `3.000.000đ`

  When người dùng xem tài sản ròng

  Then hệ thống hiển thị Net Worth = `17.000.000đ`.

  

- Given người dùng vay thêm `1.000.000đ` (theo REQ-06)

  When hệ thống cập nhật tài sản ròng

  Then Net Worth giảm `1.000.000đ` so với trước đó.

  

- Given người dùng trả hết một khoản nợ `2.000.000đ`

  When hệ thống cập nhật tài sản ròng

  Then Net Worth tăng `2.000.000đ` so với trước đó (do nợ giảm).

  

- Given người dùng có khoản cho vay `500.000đ` (người khác nợ mình)

  When hệ thống tính tài sản ròng

  Then khoản cho vay được tính là tài sản, Net Worth bao gồm cả khoản cho vay chưa thu hồi.

  

- Given người dùng thực hiện Transfer giữa các ví

  When hệ thống tính tài sản ròng sau Transfer

  Then Net Worth không thay đổi so với trước Transfer.

  

- Given người dùng xem tài sản ròng

  When hệ thống hiển thị Net Worth

  Then hệ thống hiển thị chi tiết gồm: tổng tài sản (tổng ví + cho vay), tổng nợ, và Net Worth = tổng tài sản − tổng nợ.

  

⚠️ AMBIGUOUS: Chưa rõ khoản tiết kiệm (quản lý theo REQ-06) có được tính riêng trong Net Worth hay đã bao gồm trong số dư ví.

  

### FR-05-10: Xóa ví và xử lý dữ liệu liên quan

**Mô tả**: Khi người dùng xóa một ví, hệ thống phải cảnh báo về dữ liệu giao dịch liên quan, yêu cầu xác nhận, sau đó xử lý dữ liệu liên quan theo chính sách đã chốt. Hệ thống không cho phép xóa ví cuối cùng hoặc ví mặc định khi chưa có ví thay thế.

  

**Acceptance Criteria**:

- Given người dùng yêu cầu xóa một ví có giao dịch liên quan

  When hệ thống xử lý yêu cầu xóa

  Then hệ thống hiển thị cảnh báo gồm số lượng giao dịch liên quan và yêu cầu người dùng xác nhận trước khi xóa.

  

- Given hệ thống đã hiển thị cảnh báo xóa ví

  When người dùng hủy thao tác

  Then hệ thống không xóa ví và không xóa giao dịch liên quan.

  

- Given hệ thống đã hiển thị cảnh báo xóa ví

  When người dùng xác nhận xóa

  Then hệ thống xóa cứng ví và tất cả giao dịch liên quan đến ví đó.

  

- Given người dùng cố gắng xóa ví duy nhất còn lại

  When hệ thống kiểm tra danh sách ví

  Then hệ thống từ chối xóa và thông báo rằng người dùng phải có ít nhất một ví hoạt động.

  

- Given người dùng cố gắng xóa ví đang được đặt làm ví mặc định

  When hệ thống xử lý yêu cầu xóa

  Then hệ thống yêu cầu người dùng chọn ví khác làm ví mặc định trước khi cho phép xóa.

  

- Given ví bị xóa là ví nguồn hoặc ví đích của giao dịch Transfer

  When hệ thống xóa ví và giao dịch liên quan

  Then hệ thống cũng xóa hoặc đánh dấu các giao dịch Transfer liên quan và cập nhật lại số dư ví còn lại cho phù hợp.

  

⚠️ AMBIGUOUS: Chưa chốt chính sách xóa ví: xóa cứng giao dịch liên quan hay chuyển giao dịch sang ví khác trước khi xóa. Cần PO xác nhận.

  

## Yêu cầu Phi chức năng (NFR)

- **Loại ví MVP**: Hệ thống cần hỗ trợ ít nhất 4 loại ví: tiền mặt, ngân hàng, ví điện tử, tài khoản đầu tư.

- **Ví mặc định**: Hệ thống luôn đảm bảo có đúng một ví mặc định cho mỗi người dùng; ví mặc định ban đầu là `Tiền mặt`.

- **Tên ví**: Tên ví phải là duy nhất trong danh sách ví của mỗi người dùng.

- **Ngôn ngữ hỗ trợ**: AI Engine cần nhận diện ví từ đầu vào tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh.

- **Transfer không ảnh hưởng chi phí/thu nhập**: Giao dịch Transfer phải được tách riêng, không tính vào báo cáo chi phí hoặc thu nhập.

- **Tính nhất quán số dư**: Số dư ví phải luôn phản ánh đúng tổng các giao dịch đã ghi nhận; mọi thao tác tạo, sửa, xóa giao dịch phải cập nhật số dư ví tương ứng.

- **Tài sản ròng**: Net Worth = tổng số dư tất cả ví + khoản cho vay chưa thu hồi − tổng nợ đang có.

- **Bảo mật**: Danh sách ví, số dư, lịch sử Transfer và tài sản ròng phải được xem là dữ liệu nhạy cảm và chỉ hiển thị cho đúng người dùng sở hữu.

- **Quản lý ngữ cảnh**: Ngữ cảnh chat thô chỉ được giữ trong 48 giờ theo REQ-01.

- **Truy vết**: Giao dịch Transfer cần lưu thông tin ví nguồn, ví đích và số tiền để phục vụ truy vết.

- **Xóa ví**: Khi xóa ví có giao dịch liên quan, hệ thống phải cảnh báo số lượng giao dịch bị ảnh hưởng và yêu cầu xác nhận trước khi xóa cứng.

  

## Out of Scope

- Đồng bộ tự động số dư từ ngân hàng hoặc ví điện tử qua API.

- Quản lý tài khoản tín dụng chi tiết (hạn mức, lãi suất, kỳ thanh toán).

- Chuyển tiền thực tế giữa các tài khoản ngân hàng/ví điện tử.

- Quản lý đa tiền tệ hoặc quy đổi ngoại tệ.

- Chia tiền nhóm hoặc ví chung giữa nhiều người dùng.

- Báo cáo biểu đồ chi tiết theo ví tuần/tháng/quý/năm.

- Chi tiết quản lý nợ/cho vay, tiết kiệm, lãi/lỗ đầu tư; thuộc phạm vi REQ-06.

  

## Open Questions

- [ ] Có cần hỗ trợ loại ví "Tín dụng" riêng biệt hay gộp chung với loại "Ngân hàng"?

- [ ] Số dư ban đầu khi tạo ví mới có bắt buộc nhập hay mặc định là 0?

- [ ] Giới hạn số lượng ví tối đa một người dùng có thể tạo trong MVP là bao nhiêu?

- [ ] Transfer có hỗ trợ phí chuyển khoản (transfer fee) hay không? Nếu có, phí chuyển khoản có tính là chi phí riêng không?

- [ ] Khi xóa ví, giao dịch liên quan nên xóa cứng hay chuyển sang ví khác trước khi xóa?

- [ ] Khoản tiết kiệm (REQ-06) được tính riêng trong Net Worth hay đã bao gồm trong số dư ví?

- [ ] Có cần lưu thông tin bổ sung cho ví ngân hàng (tên ngân hàng, số tài khoản tùy chọn)?

- [ ] Ngưỡng tin cậy để AI tự động gán ví thay vì hỏi lại người dùng là bao nhiêu?

- [ ] Lãi/lỗ đầu tư được cập nhật tự động hay người dùng nhập thủ công?

  

## Hướng dẫn phê duyệt

> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-05.md` → `REQ-05.md`  

> Sau khi đổi tên, BA mới chuyển sang tạo DRAFT cho `REQ-07`.

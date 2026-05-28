---
tags:
  - nien-luan
---
# REQ-06: Phân tách Dòng tiền & Tài sản (Cashflow & Asset Management)

  

## Metadata

- **Brief nguồn**: `Yêu cầu tính năng.md` — mục 6: Phân tách Dòng tiền & Tài sản; tham chiếu `REQ-01`, `REQ-02`, `REQ-05`

- **Ngày tạo**: 28/05/2026

- **Lần cập nhật cuối**: 28/05/2026 — bản DRAFT đầu tiên

- **Trạng thái**: DRAFT — chờ PO phê duyệt

  

## Tóm tắt

Quản lý tài chính cá nhân không chỉ dừng ở thu – chi sinh hoạt mà còn bao gồm dòng tiền luân chuyển giữa các ví thường và kênh đầu tư. REQ-06 tập trung vào việc bóc tách rõ ràng các khoản tiền "đóng băng" hoặc đem đi sinh lời khỏi chi phí sinh hoạt thông thường, giúp bức tranh tài sản ròng (Net Worth) luôn phản ánh đúng thực tế. Hệ thống nhận diện và phân loại chính xác các giao dịch đầu tư (Investment) so với chi phí (Expense) và điều chuyển nội bộ (Transfer), theo dõi dòng tiền vào – ra giữa ví thường và tài khoản đầu tư, tính toán tài sản ròng bao gồm cả giá trị đầu tư, hỗ trợ ghi nhận lãi/lỗ đầu tư cơ bản để cập nhật giá trị danh mục, cung cấp báo cáo tổng quan dòng tiền (Cashflow Overview) phân biệt rõ dòng tiền hoạt động, dòng tiền đầu tư và dòng tiền điều chuyển, đồng thời cho phép người dùng xem và quản lý toàn bộ thông tin dòng tiền qua giao diện chat bằng ngôn ngữ tự nhiên.

  

## Phân tích yêu cầu

  

### Actors

- **User**: Người dùng cuối thực hiện các giao dịch đầu tư, ghi nhận lãi/lỗ, xem báo cáo dòng tiền và tài sản ròng, quản lý danh mục đầu tư cơ bản qua chat.

- **AI Engine**: Thành phần xử lý ngôn ngữ tự nhiên để nhận diện loại giao dịch (Investment, Transfer, Expense), bóc tách thông tin kênh đầu tư đích và tạo phản hồi báo cáo dòng tiền qua chat.

- **System**: Ứng dụng thực hiện tính toán tài sản ròng, theo dõi dòng tiền vào – ra tài khoản đầu tư, tổng hợp báo cáo dòng tiền, lưu trữ lịch sử giao dịch đầu tư và lãi/lỗ.

- **Admin/Reviewer**: Người đánh giá thủ công các trường hợp AI phân loại sai giao dịch (gán nhầm Investment thành Expense hoặc ngược lại) để cải thiện chất lượng hệ thống.

  

### Features

- Nhận diện và phân loại tự động giao dịch đầu tư từ ngôn ngữ tự nhiên, phân biệt rõ Investment, Transfer và Expense.

- Theo dõi dòng tiền vào – ra giữa ví thường (REQ-05) và tài khoản đầu tư; tiền chuyển đi đầu tư không tính là chi phí sinh hoạt.

- Tính toán tài sản ròng (Net Worth) bao gồm tổng số dư tất cả ví, giá trị tài khoản đầu tư, khoản cho vay chưa thu hồi, trừ đi tổng nợ.

- Phân biệt rõ ràng ba loại giao dịch: Transfer (điều chuyển nội bộ), Investment (đầu tư sinh lời), Expense (chi phí thực tế).

- Ghi nhận lãi/lỗ đầu tư cơ bản (thủ công) để cập nhật giá trị tài khoản đầu tư.

- Báo cáo tổng quan dòng tiền phân tách theo: dòng tiền hoạt động, dòng tiền đầu tư, dòng tiền điều chuyển.

- Quản lý và truy vấn thông tin dòng tiền, tài sản ròng, danh mục đầu tư qua giao diện chat.

  

### Constraints

- Giao dịch đầu tư phải liên kết với tài khoản đầu tư đã tạo trong REQ-05; nếu tài khoản chưa tồn tại, hệ thống hỏi người dùng có muốn tạo mới.

- Tiền chuyển từ ví thường sang tài khoản đầu tư không được tính vào chi phí sinh hoạt; tổng tài sản không thay đổi sau giao dịch này.

- Lãi/lỗ đầu tư trong MVP chỉ hỗ trợ nhập thủ công; không tự động lấy giá thị trường từ nguồn bên ngoài.

- Tài sản ròng (Net Worth) phải tính đúng công thức: tổng số dư ví + giá trị tài khoản đầu tư + khoản cho vay chưa thu hồi − tổng nợ.

- Đầu vào cần hỗ trợ tiếng Việt, tiếng Anh và câu pha trộn Việt – Anh theo REQ-01.

- Ngữ cảnh chat thô chỉ được giữ trong 48 giờ theo REQ-01.

- Phân loại giao dịch phải phối hợp chặt chẽ với REQ-02 để đảm bảo nhất quán giữa danh mục chi phí và loại giao dịch đầu tư.

  

### Ambiguities

- ⚠️ AMBIGUOUS: Chưa rõ lãi/lỗ đầu tư có hỗ trợ nhập theo từng mã chứng khoán/khoản đầu tư cụ thể hay chỉ tổng giá trị tài khoản đầu tư.

- ⚠️ AMBIGUOUS: Chưa chốt có cần hỗ trợ nhiều loại tài sản đầu tư riêng biệt (chứng khoán, crypto, quỹ mở, vàng) hay gộp chung thành "tài khoản đầu tư".

- ⚠️ AMBIGUOUS: Chưa rõ dòng tiền cho vay/vay nợ có nằm trong phạm vi REQ-06 hay thuộc REQ riêng biệt.

- ⚠️ AMBIGUOUS: Chưa chốt tần suất yêu cầu cập nhật giá trị đầu tư (hàng ngày, hàng tuần, khi người dùng yêu cầu).

- ⚠️ AMBIGUOUS: Chưa rõ báo cáo dòng tiền có cần hỗ trợ so sánh giữa các kỳ (tháng trước vs tháng này) hay chỉ hiển thị kỳ hiện tại trong MVP.

  

### Out of Scope sơ bộ

- Tự động lấy giá thị trường (market price) từ API bên ngoài để cập nhật giá trị đầu tư.

- Quản lý danh mục đầu tư chi tiết theo từng mã chứng khoán, lệnh mua/bán, giá mua trung bình.

- Phân tích rủi ro đầu tư hoặc đề xuất chiến lược đầu tư.

- Quản lý chi phí cố định / hóa đơn định kỳ (Recurring Bills) — thuộc phạm vi REQ-08.

- Quản lý nợ/cho vay chi tiết (lãi suất, kỳ hạn, lịch trả nợ) — nằm ngoài MVP.

- Quản lý đa tiền tệ hoặc quy đổi ngoại tệ cho tài khoản đầu tư.

  

## Actors

- **User**: Người dùng cuối thực hiện giao dịch đầu tư, ghi nhận lãi/lỗ, xem báo cáo dòng tiền và tài sản ròng qua chat hoặc giao diện.

- **AI Engine**: Thành phần nhận diện loại giao dịch (Investment vs Transfer vs Expense) từ ngôn ngữ tự nhiên; tạo phản hồi báo cáo dòng tiền qua chat.

- **System**: Ứng dụng lưu trữ giao dịch đầu tư, tính toán tài sản ròng, tổng hợp báo cáo dòng tiền, cập nhật giá trị tài khoản đầu tư theo lãi/lỗ.

- **Admin/Reviewer**: Người đánh giá thủ công log AI nhận diện sai loại giao dịch đầu tư để cải thiện chất lượng.

  

## Yêu cầu Chức năng

  

### FR-06-01: Nhận diện và phân loại giao dịch đầu tư (Investment Recognition)

**Mô tả**: AI Engine nhận diện từ ngôn ngữ tự nhiên khi người dùng thực hiện giao dịch liên quan đến đầu tư. Hệ thống phân biệt rõ ràng giữa giao dịch đầu tư (Investment) và chi phí sinh hoạt (Expense), đảm bảo khoản tiền chuyển vào tài khoản đầu tư không bị tính nhầm là chi phí. AI Engine sử dụng từ khóa ngữ cảnh (ví dụ: "đầu tư", "chứng khoán", "mua cổ phiếu", "gửi tiết kiệm", "đánh phái sinh") kết hợp với tài khoản đích thuộc loại đầu tư (REQ-05) để xác định loại giao dịch.

  

**Acceptance Criteria**:

- Given người dùng nhập `chuyển 10 triệu vào tài khoản MBS để đánh phái sinh`
  
  When AI Engine xử lý đầu vào và phát hiện từ khóa "đánh phái sinh" cùng tài khoản đích `MBS` thuộc loại tài khoản đầu tư (REQ-05)
  
  Then hệ thống phân loại giao dịch là `Investment`, không tính vào chi phí sinh hoạt, và ghi nhận loại giao dịch `Chuyển tiền đi đầu tư`.

  

- Given người dùng nhập `mua 5 triệu cổ phiếu VNM`
  
  When AI Engine xử lý đầu vào và nhận diện từ khóa "mua cổ phiếu"
  
  Then hệ thống phân loại giao dịch là `Investment` và hỏi người dùng xác nhận tài khoản đầu tư đích nếu có nhiều tài khoản đầu tư.

  

- Given người dùng nhập `chuyển 3 triệu vào VCB`
  
  When AI Engine xử lý đầu vào và tài khoản `VCB` thuộc loại ngân hàng (không phải đầu tư)
  
  Then hệ thống phân loại giao dịch là `Transfer` (điều chuyển nội bộ) chứ không phải `Investment`.

  

- Given người dùng nhập `gửi tiết kiệm 20 triệu kỳ hạn 6 tháng`
  
  When AI Engine xử lý đầu vào và nhận diện từ khóa "gửi tiết kiệm"
  
  Then hệ thống phân loại giao dịch là `Investment` (tiền đóng băng sinh lời) và ghi nhận vào tài khoản đầu tư/tiết kiệm tương ứng.

  

- Given người dùng nhập `trả tiền ăn trưa 80k` với nội dung không liên quan đến đầu tư
  
  When AI Engine xử lý đầu vào
  
  Then hệ thống phân loại giao dịch là `Expense` theo REQ-02, không liên quan đến dòng tiền đầu tư.

  

- Given AI Engine không chắc chắn giao dịch là Investment hay Expense (confidence thấp)
  
  When hệ thống phát hiện độ tin cậy phân loại dưới ngưỡng
  
  Then hệ thống hỏi lại người dùng: "Giao dịch này là chi phí hay đầu tư?" để xác nhận trước khi lưu.

  

- Given người dùng nhập bằng tiếng Anh `invest 5 million in crypto`
  
  When AI Engine xử lý đầu vào tiếng Anh
  
  Then hệ thống nhận diện đây là giao dịch `Investment` và xử lý tương tự input tiếng Việt.

  

### FR-06-02: Theo dõi dòng tiền giữa ví thường và tài khoản đầu tư

**Mô tả**: Hệ thống theo dõi chi tiết dòng tiền vào – ra giữa ví thường (tiền mặt, ngân hàng, ví điện tử) và tài khoản đầu tư. Khi tiền chuyển từ ví thường sang tài khoản đầu tư, hệ thống ghi nhận là "Nạp tiền đầu tư" (Investment Inflow). Khi tiền rút từ tài khoản đầu tư về ví thường, hệ thống ghi nhận là "Rút tiền đầu tư" (Investment Outflow). Cả hai chiều đều không ảnh hưởng đến tổng tài sản.

  

**Acceptance Criteria**:

- Given người dùng nhập `chuyển 10 triệu từ VCB vào tài khoản MBS`
  
  When hệ thống xử lý giao dịch Investment Inflow
  
  Then số dư ví `VCB` giảm `10.000.000đ`, số dư tài khoản đầu tư `MBS` tăng `10.000.000đ`, và giao dịch được ghi nhận loại `Investment Inflow`.

  

- Given người dùng nhập `rút 5 triệu từ MBS về ví tiền mặt`
  
  When hệ thống xử lý giao dịch Investment Outflow
  
  Then số dư tài khoản đầu tư `MBS` giảm `5.000.000đ`, số dư ví `Tiền mặt` tăng `5.000.000đ`, và giao dịch được ghi nhận loại `Investment Outflow`.

  

- Given người dùng chuyển `10.000.000đ` từ ví thường sang tài khoản đầu tư
  
  When hệ thống tính tổng tài sản trước và sau giao dịch
  
  Then tổng tài sản không thay đổi vì tiền chỉ di chuyển giữa các tài khoản cùng hệ thống.

  

- Given người dùng chuyển tiền vào tài khoản đầu tư
  
  When hệ thống tổng hợp báo cáo chi phí sinh hoạt hàng tháng
  
  Then giao dịch Investment Inflow không xuất hiện trong danh sách chi phí sinh hoạt.

  

- Given người dùng nhập `nạp thêm 2 triệu vào MBS` nhưng tài khoản `MBS` chưa tồn tại
  
  When AI Engine không tìm thấy tài khoản đầu tư `MBS` trong danh sách ví (REQ-05)
  
  Then hệ thống hỏi người dùng có muốn tạo tài khoản đầu tư `MBS` mới không trước khi thực hiện giao dịch.

  

- Given người dùng muốn xem lịch sử dòng tiền vào – ra tài khoản đầu tư `MBS`
  
  When người dùng yêu cầu xem lịch sử
  
  Then hệ thống hiển thị danh sách các giao dịch Investment Inflow và Investment Outflow liên quan đến tài khoản `MBS`, bao gồm ngày, số tiền, ví nguồn/đích.

  

### FR-06-03: Tính toán tài sản ròng (Net Worth Calculation)

**Mô tả**: Hệ thống tính toán tài sản ròng (Net Worth) của người dùng, phản ánh đúng giá trị thực tế bao gồm cả tài khoản đầu tư, khoản cho vay chưa thu hồi và các khoản nợ. Công thức: Net Worth = Tổng số dư ví thường + Giá trị tài khoản đầu tư (bao gồm lãi/lỗ) + Khoản cho vay chưa thu hồi − Tổng nợ. Kết quả phải cập nhật tự động khi có bất kỳ thay đổi nào trong số dư ví, giá trị đầu tư hoặc nợ.

  

**Acceptance Criteria**:

- Given người dùng có ví thường tổng `15.000.000đ`, tài khoản đầu tư `MBS` giá trị `10.000.000đ`, khoản cho vay `2.000.000đ` và nợ `3.000.000đ`
  
  When người dùng xem tài sản ròng
  
  Then hệ thống hiển thị Net Worth = `15.000.000 + 10.000.000 + 2.000.000 − 3.000.000 = 24.000.000đ`.

  

- Given người dùng chuyển `5.000.000đ` từ ví `VCB` sang tài khoản đầu tư `MBS`
  
  When hệ thống cập nhật tài sản ròng
  
  Then Net Worth không thay đổi vì tiền chỉ di chuyển nội bộ giữa ví thường và tài khoản đầu tư.

  

- Given người dùng ghi nhận lãi đầu tư `1.000.000đ` cho tài khoản `MBS`
  
  When hệ thống cập nhật giá trị tài khoản đầu tư
  
  Then Net Worth tăng `1.000.000đ` so với trước đó.

  

- Given người dùng ghi nhận lỗ đầu tư `500.000đ` cho tài khoản `MBS`
  
  When hệ thống cập nhật giá trị tài khoản đầu tư
  
  Then Net Worth giảm `500.000đ` so với trước đó.

  

- Given người dùng xem tài sản ròng
  
  When hệ thống hiển thị Net Worth
  
  Then hệ thống hiển thị chi tiết gồm: tổng ví thường, tổng giá trị đầu tư, tổng cho vay, tổng nợ, và Net Worth = (tổng ví thường + tổng đầu tư + tổng cho vay) − tổng nợ.

  

- Given người dùng tạo chi phí `Expense` mới `500.000đ` từ ví thường
  
  When hệ thống cập nhật số dư ví và tính lại Net Worth
  
  Then Net Worth giảm `500.000đ` phản ánh đúng chi phí thực tế.

  

- Given người dùng không có tài khoản đầu tư nào
  
  When người dùng xem tài sản ròng
  
  Then hệ thống tính Net Worth chỉ dựa trên tổng ví thường + cho vay − nợ, giá trị đầu tư hiển thị `0đ`.

  

### FR-06-04: Phân biệt Transfer vs Investment vs Expense

**Mô tả**: Hệ thống phân biệt rõ ràng ba loại giao dịch chính khi tiền rời khỏi ví thường: Transfer (điều chuyển nội bộ giữa các ví thường, tổng tài sản không đổi, không tính chi phí), Investment (chuyển tiền vào kênh đầu tư/tiết kiệm, tổng tài sản không đổi, tiền "đóng băng" sinh lời), và Expense (chi phí thực tế, tổng tài sản giảm). AI Engine kết hợp ngữ cảnh ngôn ngữ và loại tài khoản đích (REQ-05) để phân loại chính xác.

  

**Acceptance Criteria**:

- Given người dùng nhập `chuyển 2 triệu từ Momo sang VCB`
  
  When cả ví `Momo` và `VCB` đều thuộc loại ví thường (REQ-05)
  
  Then hệ thống phân loại là `Transfer`, tổng tài sản không đổi, giao dịch không xuất hiện trong báo cáo chi phí hoặc thu nhập.

  

- Given người dùng nhập `chuyển 10 triệu vào tài khoản chứng khoán SSI`
  
  When tài khoản `SSI` thuộc loại tài khoản đầu tư (REQ-05)
  
  Then hệ thống phân loại là `Investment`, tổng tài sản không đổi, giao dịch không xuất hiện trong báo cáo chi phí sinh hoạt.

  

- Given người dùng nhập `trả tiền điện 800k`
  
  When AI Engine nhận diện đây là chi phí sinh hoạt (REQ-02)
  
  Then hệ thống phân loại là `Expense`, tổng tài sản giảm `800.000đ`, giao dịch xuất hiện trong báo cáo chi phí.

  

- Given hệ thống đã phân loại giao dịch thành `Investment` nhưng người dùng muốn sửa
  
  When người dùng yêu cầu `đổi giao dịch chuyển 10 triệu MBS thành chi phí`
  
  Then hệ thống cho phép thay đổi loại giao dịch từ `Investment` sang `Expense`, cập nhật lại tổng tài sản và báo cáo tương ứng.

  

- Given người dùng nhập một giao dịch mà AI Engine phân loại sai (ví dụ gán `Expense` cho giao dịch đầu tư)
  
  When người dùng sửa lại loại giao dịch qua chat hoặc giao diện
  
  Then hệ thống cập nhật loại giao dịch, điều chỉnh số dư ví nguồn và ví đích, và ghi log để Admin/Reviewer đánh giá cải thiện AI.

  

- Given hệ thống hiển thị báo cáo chi phí tháng
  
  When báo cáo được tổng hợp
  
  Then chỉ giao dịch loại `Expense` xuất hiện trong tổng chi phí; `Transfer` và `Investment` được tách riêng hoặc loại bỏ khỏi báo cáo chi phí.

  

### FR-06-05: Theo dõi lãi/lỗ đầu tư cơ bản (Basic Investment P&L)

**Mô tả**: Hệ thống cho phép người dùng ghi nhận lãi hoặc lỗ từ hoạt động đầu tư để cập nhật giá trị thực tế của tài khoản đầu tư. Trong MVP, lãi/lỗ được nhập thủ công bởi người dùng. Hệ thống lưu lịch sử lãi/lỗ và tính tổng lãi/lỗ lũy kế cho từng tài khoản đầu tư.

  

**Acceptance Criteria**:

- Given người dùng nhập `lãi chứng khoán MBS tháng này 2 triệu`
  
  When AI Engine nhận diện đây là ghi nhận lãi đầu tư
  
  Then hệ thống tăng giá trị tài khoản đầu tư `MBS` thêm `2.000.000đ` và ghi nhận một bản ghi lãi với ngày, số tiền, tài khoản.

  

- Given người dùng nhập `lỗ crypto 500k`
  
  When AI Engine nhận diện đây là ghi nhận lỗ đầu tư
  
  Then hệ thống giảm giá trị tài khoản đầu tư crypto `500.000đ` và ghi nhận một bản ghi lỗ.

  

- Given người dùng muốn xem tổng lãi/lỗ lũy kế của tài khoản `MBS`
  
  When người dùng yêu cầu xem qua chat hoặc giao diện
  
  Then hệ thống hiển thị: tổng tiền đã nạp, giá trị hiện tại, tổng lãi/lỗ lũy kế = giá trị hiện tại − tổng tiền đã nạp.

  

- Given người dùng ghi nhận lãi đầu tư `1.000.000đ`
  
  When hệ thống cập nhật giá trị tài khoản đầu tư
  
  Then lãi đầu tư được tính là thu nhập đầu tư (Investment Income), không gộp chung với thu nhập thông thường (lương, thưởng) trong báo cáo.

  

- Given người dùng muốn xem lịch sử lãi/lỗ của một tài khoản đầu tư
  
  When người dùng yêu cầu xem lịch sử
  
  Then hệ thống hiển thị danh sách các bản ghi lãi/lỗ theo thời gian, bao gồm ngày ghi nhận, số tiền lãi/lỗ, và giá trị tài khoản sau mỗi lần cập nhật.

  

- Given người dùng sửa bản ghi lãi/lỗ đã nhập sai
  
  When người dùng yêu cầu chỉnh sửa qua chat `sửa lãi MBS tháng 5 từ 2 triệu thành 1.5 triệu`
  
  Then hệ thống cập nhật bản ghi lãi/lỗ, điều chỉnh giá trị tài khoản đầu tư và tính lại tổng lãi/lỗ lũy kế.

  

- Given người dùng xóa bản ghi lãi/lỗ
  
  When hệ thống xử lý xóa
  
  Then giá trị tài khoản đầu tư được điều chỉnh ngược lại (hoàn lãi hoặc hoàn lỗ) và tổng lãi/lỗ lũy kế được tính lại.

  

### FR-06-06: Báo cáo tổng quan dòng tiền (Cashflow Overview)

**Mô tả**: Hệ thống cung cấp báo cáo tổng quan dòng tiền cho người dùng, phân tách rõ ràng ba loại dòng tiền: (1) Dòng tiền hoạt động (Operating Cashflow) — thu nhập và chi phí sinh hoạt thực tế; (2) Dòng tiền đầu tư (Investment Cashflow) — tiền nạp/rút tài khoản đầu tư và lãi/lỗ; (3) Dòng tiền điều chuyển (Transfer Cashflow) — chuyển tiền giữa các ví thường. Báo cáo hỗ trợ xem theo khoảng thời gian tuần, tháng, quý, năm.

  

**Acceptance Criteria**:

- Given người dùng yêu cầu xem báo cáo dòng tiền tháng 5/2026
  
  When hệ thống tổng hợp dữ liệu tháng 5
  
  Then hệ thống hiển thị báo cáo gồm: dòng tiền hoạt động (tổng thu − tổng chi), dòng tiền đầu tư (tổng nạp − tổng rút + lãi/lỗ), dòng tiền điều chuyển (tổng transfer).

  

- Given người dùng có thu nhập `10.000.000đ`, chi phí `7.000.000đ`, nạp đầu tư `5.000.000đ`, lãi đầu tư `500.000đ` trong tháng
  
  When hệ thống tạo báo cáo dòng tiền
  
  Then dòng tiền hoạt động = `+3.000.000đ`, dòng tiền đầu tư = `−4.500.000đ` (nạp 5tr − lãi 500k cộng lại vào giá trị), dòng tiền ròng phản ánh đúng biến động tài sản.

  

- Given người dùng yêu cầu xem dòng tiền theo tuần
  
  When hệ thống xử lý yêu cầu
  
  Then hệ thống hiển thị báo cáo dòng tiền cho tuần hiện tại với cùng cấu trúc phân tách ba loại dòng tiền.

  

- Given người dùng không có giao dịch đầu tư nào trong kỳ báo cáo
  
  When hệ thống tạo báo cáo dòng tiền
  
  Then phần dòng tiền đầu tư hiển thị `0đ` và báo cáo chỉ hiển thị dòng tiền hoạt động và điều chuyển.

  

- Given người dùng yêu cầu xem dòng tiền theo quý hoặc năm
  
  When hệ thống xử lý yêu cầu
  
  Then hệ thống tổng hợp dữ liệu theo quý/năm và hiển thị báo cáo với cùng cấu trúc.

  

- Given hệ thống hiển thị báo cáo dòng tiền
  
  When báo cáo được hiển thị
  
  Then hệ thống hiển thị tóm tắt dòng tiền ròng (Net Cashflow) = dòng tiền hoạt động + dòng tiền đầu tư ròng, cho người dùng biết tiền "thực sự" tăng hay giảm trong kỳ.

  

### FR-06-07: Xem và quản lý dòng tiền bằng chat

**Mô tả**: Người dùng có thể truy vấn thông tin dòng tiền, tài sản ròng, danh mục đầu tư và thực hiện các thao tác quản lý thông qua giao diện chat bằng ngôn ngữ tự nhiên. AI Engine hiểu các câu hỏi liên quan đến tài chính và trả lời bằng dữ liệu thực tế từ hệ thống.

  

**Acceptance Criteria**:

- Given người dùng nhập `tài sản ròng của tôi bao nhiêu?`
  
  When AI Engine xử lý câu hỏi
  
  Then hệ thống trả lời bằng số liệu Net Worth hiện tại kèm chi tiết thành phần (ví thường, đầu tư, cho vay, nợ) theo FR-06-03.

  

- Given người dùng nhập `dòng tiền tháng này thế nào?`
  
  When AI Engine xử lý câu hỏi
  
  Then hệ thống trả lời bằng tóm tắt báo cáo dòng tiền tháng hiện tại theo FR-06-06.

  

- Given người dùng nhập `tổng đầu tư của tôi đang lãi hay lỗ?`
  
  When AI Engine xử lý câu hỏi
  
  Then hệ thống trả lời bằng tổng lãi/lỗ lũy kế từ tất cả tài khoản đầu tư theo FR-06-05.

  

- Given người dùng nhập `tháng này tôi chuyển bao nhiêu tiền vào đầu tư?`
  
  When AI Engine xử lý câu hỏi
  
  Then hệ thống tổng hợp và trả lời tổng giá trị Investment Inflow trong tháng hiện tại.

  

- Given người dùng nhập `so sánh dòng tiền tháng 4 và tháng 5`
  
  When AI Engine xử lý yêu cầu so sánh
  
  Then hệ thống hiển thị bảng so sánh dòng tiền hoạt động, dòng tiền đầu tư giữa hai tháng, kèm chênh lệch.

  

- Given người dùng nhập bằng tiếng Anh `what's my net worth?`
  
  When AI Engine xử lý đầu vào tiếng Anh
  
  Then hệ thống trả lời bằng tiếng Anh hoặc tiếng Việt (tùy cài đặt ngôn ngữ) với cùng nội dung Net Worth.

  

- Given người dùng nhập câu hỏi mơ hồ `tiền tôi đang ở đâu?`
  
  When AI Engine xử lý câu hỏi
  
  Then hệ thống trả lời bằng tổng quan phân bổ tài sản: bao nhiêu ở ví thường, bao nhiêu ở tài khoản đầu tư, bao nhiêu đang cho vay.

  

## Yêu cầu Phi chức năng (NFR)

- **Phân loại giao dịch**: AI Engine phải đạt độ chính xác tối thiểu 85% khi phân biệt Investment vs Transfer vs Expense từ ngôn ngữ tự nhiên; các trường hợp không chắc chắn phải hỏi lại người dùng.

- **Tính nhất quán Net Worth**: Tài sản ròng phải cập nhật tự động trong vòng 2 giây sau mỗi giao dịch mới, chỉnh sửa hoặc xóa giao dịch.

- **Không thay đổi tổng tài sản khi Transfer/Investment**: Mọi giao dịch Transfer và Investment Inflow/Outflow giữa các ví/tài khoản nội bộ không được làm thay đổi tổng tài sản.

- **Bảo mật**: Thông tin dòng tiền, tài sản ròng, danh mục đầu tư, lịch sử lãi/lỗ phải được xem là dữ liệu nhạy cảm và chỉ hiển thị cho đúng người dùng sở hữu.

- **Ngôn ngữ hỗ trợ**: AI Engine cần nhận diện các từ khóa đầu tư từ tiếng Việt, tiếng Anh và câu pha trộn Việt – Anh (ví dụ: "mua stock", "đầu tư crypto", "invest 5 triệu").

- **Phối hợp REQ-02**: Phân loại giao dịch đầu tư phải nhất quán với hệ thống danh mục (REQ-02); loại "Đầu tư" phải tồn tại trong danh mục hoặc được tách riêng khỏi danh mục chi phí.

- **Phối hợp REQ-05**: Giao dịch Investment phải liên kết với tài khoản đầu tư đã tạo trong REQ-05; loại tài khoản (ví thường vs đầu tư) là yếu tố chính để phân biệt Transfer và Investment.

- **Phối hợp REQ-01**: Đầu vào nhận diện giao dịch đầu tư qua chat, voice hoặc receipt scanning đều phải tuân thủ quy trình REQ-01.

- **Quản lý ngữ cảnh**: Ngữ cảnh chat thô chỉ được giữ trong 48 giờ theo REQ-01; dữ liệu giao dịch đầu tư và lãi/lỗ được lưu trữ vĩnh viễn.

- **Truy vết**: Giao dịch Investment cần lưu đầy đủ thông tin: ví nguồn, tài khoản đầu tư đích, số tiền, loại giao dịch (Inflow/Outflow), ngày giờ để phục vụ truy vết và báo cáo.

- **Báo cáo dòng tiền**: Hệ thống phải hỗ trợ tạo báo cáo dòng tiền theo các khoảng thời gian: tuần, tháng, quý, năm.

  

## Out of Scope

- Tự động lấy giá thị trường (market price) từ API bên ngoài để cập nhật giá trị đầu tư real-time.

- Quản lý danh mục đầu tư chi tiết theo từng mã chứng khoán, lệnh mua/bán, giá mua trung bình, phí giao dịch.

- Phân tích rủi ro đầu tư, đề xuất chiến lược đầu tư hoặc rebalancing danh mục.

- Quản lý chi phí cố định / hóa đơn định kỳ (Recurring Bills) — thuộc phạm vi REQ-08.

- Quản lý nợ/cho vay chi tiết (lãi suất, kỳ hạn, lịch trả nợ) — nằm ngoài phạm vi MVP.

- Quản lý đa tiền tệ hoặc quy đổi ngoại tệ cho tài khoản đầu tư.

- Biểu đồ trực quan phức tạp (candlestick chart, portfolio performance chart) — thuộc phạm vi REQ-04 hoặc sau MVP.

- Tính thuế thu nhập từ đầu tư.

  

## Open Questions

- [ ] Lãi/lỗ đầu tư có hỗ trợ nhập theo từng mã chứng khoán/khoản đầu tư cụ thể hay chỉ tổng giá trị tài khoản đầu tư?

- [ ] Có cần hỗ trợ nhiều loại tài sản đầu tư riêng biệt (chứng khoán, crypto, quỹ mở, vàng, tiết kiệm) hay gộp chung thành "tài khoản đầu tư"?

- [ ] Dòng tiền cho vay/vay nợ có nằm trong phạm vi REQ-06 hay thuộc REQ riêng biệt?

- [ ] Tần suất yêu cầu người dùng cập nhật giá trị đầu tư là bao nhiêu (hàng ngày, hàng tuần, khi yêu cầu)?

- [ ] Báo cáo dòng tiền có cần hỗ trợ so sánh giữa các kỳ (tháng trước vs tháng này) trong MVP không?

- [ ] Ngưỡng tin cậy (confidence threshold) để AI tự động phân loại Investment vs Expense mà không cần hỏi lại người dùng là bao nhiêu?

- [ ] Khoản tiết kiệm có kỳ hạn (gửi ngân hàng) có được coi là "tài khoản đầu tư" hay loại ví riêng?

- [ ] Khi tài khoản đầu tư bị xóa (REQ-05 FR-05-10), lịch sử lãi/lỗ có được giữ lại để báo cáo không?

  

## Hướng dẫn phê duyệt

> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-06.md` → `REQ-06.md`

> Sau khi đổi tên, BA mới chuyển sang tạo DRAFT cho `REQ-07`.

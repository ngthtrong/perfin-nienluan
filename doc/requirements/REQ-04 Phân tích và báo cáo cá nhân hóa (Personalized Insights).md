---
tags:
  - nien-luan
---
# REQ-04: Phân tích & Báo cáo cá nhân hóa (Personalized Insights & Reports)

  

## Metadata

- **Brief nguồn**: `Yêu cầu tính năng.md` — mục 5: Phân tích & Báo cáo cá nhân hóa; tham chiếu `REQ-01.md` (dữ liệu giao dịch đầu vào), `REQ-02.md` (danh mục), `REQ-03.md` (ngân sách), `REQ-05.md` (ví/tài khoản), `REQ-06.md` (dòng tiền & tài sản)

- **Ngày tạo**: 28/05/2026

- **Lần cập nhật cuối**: 28/05/2026 — bản DRAFT đầu tiên

- **Trạng thái**: DRAFT — chờ PO phê duyệt

  

## Tóm tắt

Tính năng Phân tích & Báo cáo cá nhân hóa cho phép hệ thống tổng hợp dữ liệu giao dịch của người dùng thành các báo cáo trực quan và đưa ra nhận xét, tư vấn bằng văn bản dựa trên chính thói quen tiêu dùng thực tế của cá nhân. Khác với các ứng dụng tài chính truyền thống chỉ hiển thị biểu đồ thô để người dùng tự phân tích, Rolly "đọc hiểu" biểu đồ và chủ động chỉ ra các điểm bất thường — ví dụ nhận diện và thông báo "Tháng này bạn chi tiền taxi tăng 30% so với tháng trước, hãy cân nhắc đi xe buýt". Hệ thống hỗ trợ các loại báo cáo: tổng quan thu chi theo kỳ (tuần/tháng/quý/năm), biểu đồ phân bổ chi tiêu theo danh mục, so sánh chi tiêu giữa các kỳ (trend analysis), phát hiện bất thường chi tiêu, tư vấn cá nhân hóa, báo cáo ngân sách liên kết REQ-03, và báo cáo dòng tiền liên kết REQ-05/REQ-06. Người dùng có thể xem báo cáo trực tiếp trong giao diện chat bằng ngôn ngữ tự nhiên hoặc trên màn hình báo cáo chuyên dụng. Dữ liệu đầu vào phụ thuộc vào giao dịch từ REQ-01, danh mục từ REQ-02, ngân sách từ REQ-03, ví/tài khoản từ REQ-05 và dòng tiền từ REQ-06.

  

## Phân tích yêu cầu

  

### Actors

- **User**: Người dùng cuối xem báo cáo, yêu cầu phân tích và nhận tư vấn cá nhân hóa về tài chính.

- **AI Engine**: Thành phần xử lý ngôn ngữ tự nhiên để hiểu yêu cầu báo cáo từ chat, phân tích dữ liệu giao dịch, phát hiện bất thường và tạo nhận xét/tư vấn cá nhân hóa bằng văn bản.

- **System**: Ứng dụng tổng hợp dữ liệu giao dịch, tính toán thống kê, tạo biểu đồ trực quan, lưu trữ lịch sử báo cáo và phối hợp dữ liệu từ các module REQ-01, REQ-02, REQ-03, REQ-05, REQ-06.

- **Admin/Reviewer**: Người theo dõi log hệ thống, đánh giá chất lượng insight được AI tạo ra và cấu hình các ngưỡng phát hiện bất thường.

  

### Features

- Báo cáo tổng quan thu chi theo kỳ tuần, tháng, quý, năm.

- Biểu đồ phân bổ chi tiêu theo danh mục (pie chart, bar chart).

- So sánh chi tiêu giữa các kỳ (trend analysis) với biểu đồ đường/cột.

- Phát hiện bất thường chi tiêu tự động (anomaly detection) dựa trên lịch sử.

- Tư vấn cá nhân hóa bằng văn bản dựa trên thói quen tiêu dùng thực tế.

- Báo cáo tiến độ ngân sách liên kết với REQ-03.

- Xem báo cáo bằng ngôn ngữ tự nhiên trong giao diện chat.

- Báo cáo dòng tiền (cashflow report) liên kết với REQ-05 và REQ-06.

  

### Constraints

- Báo cáo là dữ liệu per-user; một người dùng không thể xem báo cáo của người dùng khác.

- Dữ liệu báo cáo phụ thuộc hoàn toàn vào giao dịch đã lưu từ REQ-01; nếu không có giao dịch nào thì không thể tạo báo cáo.

- Danh mục trong báo cáo phải đồng bộ với danh sách danh mục của người dùng theo REQ-02; khi danh mục bị xóa/gộp, dữ liệu báo cáo phải phản ánh thay đổi.

- Ngân sách trong báo cáo ngân sách phải khớp với dữ liệu ngân sách đang hoạt động theo REQ-03.

- Báo cáo dòng tiền phải phản ánh đúng các tài khoản/ví theo REQ-05 và luồng tiền theo REQ-06.

- Đầu vào chat phải hỗ trợ tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh theo REQ-01.

- Ngữ cảnh chat thô chỉ được giữ trong 48 giờ theo REQ-01.

- Biểu đồ phải hiển thị được trên thiết bị di động với kích thước màn hình đa dạng.

- Tư vấn cá nhân hóa từ AI chỉ mang tính chất tham khảo, không phải lời khuyên tài chính chuyên nghiệp.

  

### Ambiguities

- ⚠️ AMBIGUOUS: Chưa rõ hệ thống cần lưu trữ lịch sử báo cáo đã tạo hay mỗi lần xem đều tạo báo cáo mới từ dữ liệu hiện tại.

- ⚠️ AMBIGUOUS: Chưa rõ ngưỡng phát hiện bất thường chi tiêu (anomaly detection) — tăng/giảm bao nhiêu phần trăm so với kỳ trước mới được coi là bất thường (ví dụ: 20%, 30% hay do AI tự học).

- ⚠️ AMBIGUOUS: Chưa rõ biểu đồ có hỗ trợ tương tác (interactive charts — zoom, tap xem chi tiết) hay chỉ hiển thị tĩnh.

- ⚠️ AMBIGUOUS: Chưa rõ tư vấn cá nhân hóa từ AI có cần thêm disclaimer/cảnh báo pháp lý rằng đây không phải lời khuyên tài chính chuyên nghiệp hay không.

- ⚠️ AMBIGUOUS: Chưa rõ khi người dùng yêu cầu báo cáo kỳ quý/năm nhưng dữ liệu chưa đủ (ví dụ: mới dùng app 2 tháng), hệ thống hiển thị dữ liệu hiện có hay từ chối tạo báo cáo.

- ⚠️ AMBIGUOUS: Chưa rõ báo cáo trong chat hiển thị dưới dạng ảnh biểu đồ, inline text hay card tương tác.

  

### Out of Scope sơ bộ

- Báo cáo nhóm/chia sẻ giữa nhiều người dùng.

- Xuất báo cáo ra PDF hoặc file ảnh — thuộc phạm vi REQ-07.

- So sánh chi tiêu giữa các người dùng (benchmark cộng đồng).

- Tích hợp dữ liệu tài chính từ ngân hàng hoặc ứng dụng bên ngoài.

- Dự báo chi tiêu tương lai bằng machine learning (predictive analytics).

- Tư vấn đầu tư chứng khoán, bất động sản hoặc các sản phẩm tài chính phức tạp.

  

## Actors

- **User**: Người dùng cuối xem báo cáo, yêu cầu phân tích và nhận tư vấn cá nhân hóa về tài chính.

- **AI Engine**: Thành phần xử lý ngôn ngữ tự nhiên để hiểu yêu cầu báo cáo từ chat, phân tích dữ liệu giao dịch, phát hiện bất thường và tạo nhận xét/tư vấn cá nhân hóa bằng văn bản.

- **System**: Ứng dụng tổng hợp dữ liệu giao dịch, tính toán thống kê, tạo biểu đồ trực quan và phối hợp dữ liệu từ các module liên quan.

- **Admin/Reviewer**: Người theo dõi log hệ thống, đánh giá chất lượng insight AI và cấu hình ngưỡng phát hiện bất thường.

  

## Yêu cầu Chức năng

  

### FR-04-01: Báo cáo tổng quan thu chi theo kỳ

**Mô tả**: Hệ thống cho phép người dùng xem báo cáo tổng quan về tổng thu nhập, tổng chi phí và số dư (thu - chi) trong một kỳ nhất định. Kỳ báo cáo hỗ trợ: tuần, tháng, quý và năm. Dữ liệu giao dịch được lấy từ REQ-01 và phân loại theo REQ-02.

  

**Acceptance Criteria**:

- Given người dùng muốn xem tổng quan thu chi tháng hiện tại
  When người dùng mở báo cáo và chọn kỳ `tháng` hiện tại
  Then hệ thống hiển thị tổng thu nhập, tổng chi phí, số dư (thu - chi) và số lượng giao dịch trong tháng hiện tại.

  

- Given người dùng muốn xem tổng quan thu chi tuần trước
  When người dùng chọn kỳ `tuần` và chọn tuần trước
  Then hệ thống hiển thị tổng thu nhập, tổng chi phí, số dư (thu - chi) của tuần trước.

  

- Given người dùng muốn xem tổng quan thu chi quý hoặc năm
  When người dùng chọn kỳ `quý` hoặc `năm`
  Then hệ thống tổng hợp dữ liệu giao dịch trong phạm vi quý hoặc năm được chọn và hiển thị tổng thu nhập, tổng chi phí, số dư.

  

- Given người dùng có nhiều ví/tài khoản (REQ-05)
  When người dùng xem báo cáo tổng quan thu chi
  Then hệ thống mặc định tổng hợp dữ liệu từ tất cả ví/tài khoản, đồng thời cho phép lọc theo ví/tài khoản cụ thể.

  

- Given người dùng không có giao dịch nào trong kỳ được chọn
  When hệ thống tạo báo cáo
  Then hệ thống hiển thị thông báo rằng chưa có dữ liệu giao dịch trong kỳ và gợi ý tạo giao dịch.

  

- Given người dùng mới sử dụng app chưa đầy một quý nhưng chọn kỳ `quý`
  When hệ thống tạo báo cáo
  Then hệ thống hiển thị báo cáo dựa trên dữ liệu hiện có kèm ghi chú rằng dữ liệu chưa đủ cho toàn bộ kỳ.

  

### FR-04-02: Biểu đồ phân bổ chi tiêu theo danh mục

**Mô tả**: Hệ thống hiển thị biểu đồ trực quan thể hiện tỷ lệ phân bổ chi tiêu của người dùng theo từng danh mục chi phí trong kỳ. Biểu đồ hỗ trợ dạng tròn (pie chart) để thể hiện tỷ lệ phần trăm và dạng cột (bar chart) để so sánh giá trị tuyệt đối. Danh mục chi phí liên kết với REQ-02.

  

**Acceptance Criteria**:

- Given người dùng có giao dịch chi phí thuộc nhiều danh mục trong tháng hiện tại
  When người dùng mở biểu đồ phân bổ chi tiêu theo danh mục cho kỳ `tháng`
  Then hệ thống hiển thị biểu đồ tròn (pie chart) với tỷ lệ phần trăm của từng danh mục so với tổng chi phí.

  

- Given người dùng muốn xem giá trị tuyệt đối từng danh mục
  When người dùng chuyển sang chế độ xem biểu đồ cột (bar chart)
  Then hệ thống hiển thị biểu đồ cột với giá trị chi tiêu tuyệt đối (đơn vị tiền) cho từng danh mục, sắp xếp từ cao xuống thấp.

  

- Given biểu đồ phân bổ chi tiêu được hiển thị
  When người dùng tap vào một phân khúc (segment) biểu đồ hoặc một cột
  Then hệ thống hiển thị chi tiết danh mục đó bao gồm tên danh mục, tổng số tiền, số lượng giao dịch và tỷ lệ phần trăm.

  

- Given người dùng có danh mục chiếm tỷ lệ rất nhỏ (dưới 2%)
  When hệ thống tạo biểu đồ tròn
  Then hệ thống gộp các danh mục nhỏ vào nhóm `Khác` để biểu đồ dễ đọc, đồng thời cho phép người dùng xem chi tiết nhóm `Khác`.

  

- Given người dùng chỉ có giao dịch thu nhập mà không có chi phí trong kỳ được chọn
  When hệ thống tạo biểu đồ phân bổ chi tiêu
  Then hệ thống thông báo rằng chưa có chi phí trong kỳ và không hiển thị biểu đồ rỗng.

  

- Given người dùng thay đổi kỳ báo cáo (ví dụ: từ tháng 4 sang tháng 5)
  When hệ thống cập nhật biểu đồ
  Then biểu đồ phản ánh chính xác dữ liệu chi tiêu theo danh mục của kỳ mới được chọn.

  

### FR-04-03: So sánh chi tiêu giữa các kỳ (Trend Analysis)

**Mô tả**: Hệ thống cho phép người dùng so sánh chi tiêu giữa các kỳ liên tiếp (ví dụ: tháng này vs tháng trước, quý này vs quý trước) hoặc giữa các kỳ tùy chọn để nhận diện xu hướng tăng/giảm chi tiêu. Kết quả được hiển thị bằng biểu đồ đường hoặc biểu đồ cột nhóm kèm tỷ lệ phần trăm thay đổi.

  

**Acceptance Criteria**:

- Given người dùng muốn so sánh chi tiêu tháng hiện tại với tháng trước
  When người dùng chọn chế độ so sánh `tháng này vs tháng trước`
  Then hệ thống hiển thị biểu đồ cột nhóm so sánh tổng chi phí hai tháng, kèm tỷ lệ phần trăm tăng hoặc giảm.

  

- Given người dùng muốn so sánh chi tiêu theo từng danh mục giữa hai kỳ
  When người dùng chọn so sánh chi tiết theo danh mục giữa tháng 4 và tháng 5
  Then hệ thống hiển thị biểu đồ cột nhóm cho từng danh mục với giá trị của cả hai kỳ cạnh nhau, kèm tỷ lệ phần trăm thay đổi cho mỗi danh mục.

  

- Given người dùng muốn xem xu hướng chi tiêu trong 6 tháng gần nhất
  When người dùng chọn chế độ xem trend 6 tháng
  Then hệ thống hiển thị biểu đồ đường (line chart) thể hiện tổng chi phí theo từng tháng trong 6 tháng gần nhất.

  

- Given người dùng muốn so sánh thu nhập giữa các kỳ
  When người dùng chọn so sánh thu nhập
  Then hệ thống hiển thị biểu đồ so sánh tổng thu nhập giữa các kỳ được chọn, kèm tỷ lệ phần trăm thay đổi.

  

- Given chỉ có dữ liệu của 1 kỳ (ví dụ: người dùng mới dùng app 1 tháng)
  When người dùng yêu cầu so sánh với kỳ trước
  Then hệ thống thông báo rằng chưa đủ dữ liệu để so sánh và chỉ hiển thị dữ liệu kỳ hiện tại.

  

- Given biểu đồ trend hiển thị nhiều tháng
  When người dùng tap vào một điểm dữ liệu trên biểu đồ đường
  Then hệ thống hiển thị chi tiết của tháng đó bao gồm tổng chi phí, tổng thu nhập và số lượng giao dịch.

  

### FR-04-04: Phát hiện bất thường chi tiêu (Anomaly Detection)

**Mô tả**: AI Engine tự động phân tích dữ liệu giao dịch của người dùng để phát hiện các mẫu chi tiêu bất thường so với lịch sử, bao gồm: chi tiêu tăng/giảm đột biến theo danh mục, giao dịch có giá trị lớn bất thường, hoặc xuất hiện danh mục chi tiêu mới chưa từng có. Khi phát hiện bất thường, hệ thống chủ động thông báo cho người dùng trong giao diện chat.

  

**Acceptance Criteria**:

- Given người dùng có lịch sử chi tiêu danh mục `Di chuyển` trung bình `500.000đ/tháng` trong 3 tháng gần nhất
  When chi tiêu danh mục `Di chuyển` tháng hiện tại đạt `750.000đ` (tăng 50% so với trung bình)
  Then AI Engine phát hiện bất thường và gửi thông báo trong chat, ví dụ: "Tháng này bạn chi tiền di chuyển tăng 50% so với trung bình 3 tháng trước. Hãy xem lại nhé!".

  

- Given người dùng tạo một giao dịch chi phí có giá trị lớn bất thường so với các giao dịch cùng danh mục
  When giá trị giao dịch vượt quá 3 lần giá trị trung bình của các giao dịch cùng danh mục trong 3 tháng gần nhất
  Then AI Engine gửi thông báo trong chat cảnh báo giao dịch có giá trị bất thường, kèm thông tin so sánh.

  

- Given người dùng chi tiêu vào một danh mục chưa từng có giao dịch trong 3 tháng gần nhất
  When hệ thống phát hiện danh mục chi tiêu mới xuất hiện
  Then AI Engine gửi thông báo nhẹ trong chat, ví dụ: "Bạn bắt đầu chi tiêu cho danh mục [tên danh mục]. Bạn có muốn đặt ngân sách cho danh mục này không?".

  

- Given người dùng chưa có đủ lịch sử giao dịch (dưới 1 tháng dữ liệu)
  When hệ thống chạy phân tích bất thường
  Then hệ thống không tạo cảnh báo bất thường do chưa đủ dữ liệu cơ sở để so sánh.

  

- Given AI Engine phát hiện chi tiêu một danh mục giảm đáng kể so với kỳ trước
  When chi tiêu giảm vượt ngưỡng bất thường
  Then AI Engine gửi thông báo tích cực trong chat, ví dụ: "Tuyệt vời! Tháng này bạn đã giảm chi tiêu [danh mục] được 25% so với tháng trước!".

  

- Given hệ thống đã gửi cảnh báo bất thường cho một danh mục trong kỳ hiện tại
  When chi tiêu danh mục đó tiếp tục tăng thêm nhưng không vượt ngưỡng cảnh báo mới
  Then hệ thống không gửi cảnh báo lặp lại cho cùng bất thường đã cảnh báo trong cùng kỳ.

  

⚠️ AMBIGUOUS: Chưa rõ ngưỡng phát hiện bất thường cụ thể — tăng/giảm bao nhiêu phần trăm so với trung bình mới kích hoạt cảnh báo. Cần PO xác nhận ngưỡng mặc định (ví dụ: 30%, 50%) hay để AI tự học ngưỡng phù hợp cho từng người dùng.

  

### FR-04-05: Tư vấn cá nhân hóa dựa trên dữ liệu (Personalized Insights)

**Mô tả**: AI Engine phân tích tổng hợp dữ liệu giao dịch, ngân sách và xu hướng chi tiêu của người dùng để đưa ra các nhận xét và tư vấn bằng văn bản, mang tính cá nhân hóa cao. Tư vấn có thể được gửi chủ động (proactive) theo định kỳ hoặc theo yêu cầu (on-demand) khi người dùng hỏi trong chat. Nội dung tư vấn bao gồm nhận xét về thói quen chi tiêu, gợi ý tiết kiệm và đánh giá sức khỏe tài chính.

  

**Acceptance Criteria**:

- Given người dùng có lịch sử chi tiêu từ 1 tháng trở lên
  When hệ thống tạo insight cuối kỳ (cuối tuần hoặc cuối tháng)
  Then AI Engine tạo bản nhận xét tổng hợp bao gồm: top 3 danh mục chi nhiều nhất, so sánh với kỳ trước (nếu có), và 1-2 gợi ý cải thiện cụ thể.

  

- Given người dùng nhập trong chat `phân tích chi tiêu tháng này giúp tôi`
  When AI Engine xử lý yêu cầu
  Then hệ thống phản hồi bản phân tích tổng hợp bao gồm tổng quan thu chi, danh mục chi nhiều nhất, so sánh với kỳ trước và nhận xét về thói quen chi tiêu.

  

- Given người dùng có ngân sách đang hoạt động (REQ-03) và đã chi vượt 80% hạn mức
  When AI Engine tạo insight chủ động
  Then hệ thống gửi tư vấn trong chat gợi ý cách điều chỉnh chi tiêu để không vượt ngân sách, ví dụ: "Bạn đã chi 85% ngân sách Ăn uống, còn 10 ngày nữa mới hết tháng. Hãy cân nhắc nấu ăn tại nhà để tiết kiệm nhé!".

  

- Given người dùng có xu hướng chi tiêu tăng liên tục trong 3 tháng cho một danh mục
  When AI Engine phân tích xu hướng
  Then hệ thống gửi nhận xét trong chat chỉ ra xu hướng tăng kèm gợi ý đặt ngân sách (nếu chưa có) hoặc điều chỉnh ngân sách hiện tại.

  

- Given người dùng nhập `how can I save more money this month?` bằng tiếng Anh
  When AI Engine xử lý yêu cầu
  Then hệ thống phân tích dữ liệu chi tiêu và phản hồi bằng tiếng Anh với các gợi ý tiết kiệm cụ thể dựa trên danh mục chi nhiều nhất.

  

- Given nội dung tư vấn được AI tạo ra
  When hệ thống hiển thị tư vấn cho người dùng
  Then nội dung tư vấn phải dựa trên dữ liệu thực tế của chính người dùng đó, không sử dụng nội dung chung chung hoặc dữ liệu của người dùng khác.

  

- Given người dùng mới sử dụng app chưa đầy 1 tuần và có ít hơn 5 giao dịch
  When hệ thống cố gắng tạo insight chủ động
  Then hệ thống không tạo tư vấn do chưa đủ dữ liệu, thay vào đó khuyến khích người dùng tiếp tục ghi chép giao dịch để nhận phân tích chi tiết hơn.

  

### FR-04-06: Báo cáo ngân sách (Budget Report)

**Mô tả**: Hệ thống cung cấp báo cáo trực quan về tình trạng sử dụng ngân sách trong kỳ, bao gồm tỷ lệ sử dụng từng ngân sách, ngân sách đã vượt/chưa vượt, và so sánh hiệu quả ngân sách giữa các kỳ. Dữ liệu ngân sách được lấy từ REQ-03. Đây là phần mở rộng phân tích cho dữ liệu ngân sách mà REQ-03 đã ghi nhận.

  

**Acceptance Criteria**:

- Given người dùng có ngân sách đang hoạt động trong kỳ tháng hiện tại
  When người dùng mở báo cáo ngân sách
  Then hệ thống hiển thị danh sách tất cả ngân sách kỳ tháng hiện tại với thông tin: tên ngân sách/danh mục, hạn mức, số tiền đã chi, số tiền còn lại, tỷ lệ phần trăm sử dụng và thanh tiến độ trực quan (progress bar).

  

- Given người dùng có ngân sách tổng thể và nhiều ngân sách theo danh mục
  When hệ thống hiển thị báo cáo ngân sách
  Then hệ thống hiển thị ngân sách tổng thể ở đầu danh sách, tiếp theo là các ngân sách theo danh mục, mỗi mục có thanh tiến độ với màu sắc phân biệt: xanh (dưới 70%), vàng (70%-90%), đỏ (trên 90%).

  

- Given kỳ ngân sách đã kết thúc
  When người dùng xem báo cáo ngân sách kỳ trước
  Then hệ thống hiển thị kết quả cuối cùng của kỳ đó, bao gồm số ngân sách đã vượt, số ngân sách còn dư, tổng số tiền tiết kiệm được (hoặc vượt chi).

  

- Given người dùng muốn so sánh hiệu quả ngân sách giữa tháng này và tháng trước
  When người dùng chọn chế độ so sánh ngân sách
  Then hệ thống hiển thị biểu đồ so sánh tỷ lệ sử dụng ngân sách từng danh mục giữa hai kỳ.

  

- Given người dùng không có ngân sách nào đang hoạt động
  When người dùng mở báo cáo ngân sách
  Then hệ thống thông báo rằng chưa có ngân sách nào được thiết lập và gợi ý tạo ngân sách theo REQ-03.

  

- Given ngân sách có tính năng rollover đang bật (FR-03-08)
  When hệ thống hiển thị báo cáo ngân sách
  Then hệ thống hiển thị rõ phần hạn mức gốc và phần rollover (cộng thêm hoặc trừ đi) trong báo cáo.

  

### FR-04-07: Xem báo cáo bằng ngôn ngữ tự nhiên trong chat

**Mô tả**: Người dùng có thể yêu cầu xem báo cáo và phân tích trực tiếp trong giao diện chat bằng ngôn ngữ tự nhiên. AI Engine hiểu yêu cầu, truy vấn dữ liệu và phản hồi bản tóm tắt báo cáo dạng văn bản kèm biểu đồ nhỏ (mini chart) hoặc bảng số liệu trong chat.

  

**Acceptance Criteria**:

- Given người dùng nhập `tháng này tôi chi bao nhiêu?`
  When AI Engine xử lý yêu cầu
  Then hệ thống phản hồi tổng chi phí tháng hiện tại, kèm top 3 danh mục chi nhiều nhất và so sánh phần trăm tăng/giảm với tháng trước (nếu có dữ liệu).

  

- Given người dùng nhập `so sánh chi tiêu tháng 4 và tháng 5`
  When AI Engine xử lý yêu cầu
  Then hệ thống phản hồi bản so sánh tổng chi phí hai tháng, tỷ lệ phần trăm thay đổi và nhận xét về các danh mục có thay đổi lớn nhất.

  

- Given người dùng nhập `show me my spending breakdown this month` bằng tiếng Anh
  When AI Engine xử lý yêu cầu
  Then hệ thống phản hồi bản phân bổ chi tiêu theo danh mục dạng bảng hoặc danh sách, kèm tỷ lệ phần trăm mỗi danh mục.

  

- Given người dùng nhập `ngân sách tháng này thế nào?`
  When AI Engine xử lý yêu cầu và xác định đây là yêu cầu báo cáo ngân sách
  Then hệ thống phản hồi tóm tắt tình trạng ngân sách gồm tên ngân sách, hạn mức, đã chi, còn lại và tỷ lệ phần trăm — liên kết với FR-03-06 và FR-04-06.

  

- Given người dùng nhập yêu cầu báo cáo không rõ ràng, ví dụ `cho tôi xem báo cáo`
  When AI Engine không xác định được loại báo cáo hoặc kỳ cụ thể
  Then hệ thống hỏi lại người dùng để làm rõ loại báo cáo (thu chi, ngân sách, danh mục) và kỳ mong muốn.

  

- Given người dùng nhập câu pha trộn Việt-Anh, ví dụ `cho xem spending report tháng này`
  When AI Engine xử lý đầu vào pha trộn ngôn ngữ
  Then hệ thống hiểu yêu cầu và phản hồi báo cáo chi tiêu tháng hiện tại.

  

- Given phản hồi báo cáo trong chat
  When hệ thống tạo nội dung phản hồi
  Then phản hồi phải ngắn gọn, dễ đọc trên thiết bị di động và có nút/link để xem chi tiết đầy đủ trên màn hình báo cáo chuyên dụng.

  

### FR-04-08: Báo cáo dòng tiền (Cashflow Report)

**Mô tả**: Hệ thống cung cấp báo cáo dòng tiền thể hiện luồng tiền vào (thu nhập) và luồng tiền ra (chi phí) theo thời gian, giúp người dùng hiểu rõ xu hướng dòng tiền và khả năng thanh toán. Báo cáo phân biệt giữa giao dịch thu chi thông thường và giao dịch chuyển khoản/điều chuyển tài sản (transfer) theo REQ-05 và REQ-06. Các giao dịch chuyển khoản nội bộ giữa các ví không được tính vào thu/chi thực tế.

  

**Acceptance Criteria**:

- Given người dùng muốn xem báo cáo dòng tiền tháng hiện tại
  When người dùng mở báo cáo dòng tiền
  Then hệ thống hiển thị biểu đồ dòng tiền gồm hai đường/cột: luồng tiền vào (thu nhập) và luồng tiền ra (chi phí) theo từng ngày hoặc tuần trong tháng, kèm số dư tích lũy.

  

- Given người dùng có giao dịch chuyển khoản nội bộ giữa các ví (transfer theo REQ-05)
  When hệ thống tính toán dòng tiền
  Then hệ thống loại trừ giao dịch chuyển khoản nội bộ khỏi luồng tiền vào/ra, chỉ phản ánh thu nhập và chi phí thực tế.

  

- Given người dùng có giao dịch đầu tư (investment theo REQ-06)
  When hệ thống tính toán dòng tiền
  Then hệ thống phân loại giao dịch đầu tư thành mục riêng trong báo cáo dòng tiền, tách biệt khỏi chi phí sinh hoạt thông thường.

  

- Given người dùng muốn xem dòng tiền theo từng ví/tài khoản
  When người dùng chọn lọc theo ví/tài khoản cụ thể (REQ-05)
  Then hệ thống hiển thị báo cáo dòng tiền chỉ cho ví/tài khoản được chọn.

  

- Given báo cáo dòng tiền có nhiều ngày chi phí vượt thu nhập
  When AI Engine phân tích dòng tiền
  Then hệ thống đánh dấu các giai đoạn dòng tiền âm và đưa ra nhận xét, ví dụ: "Tuần thứ 3 của tháng bạn có dòng tiền âm, chi phí vượt thu nhập 2.000.000đ."

  

- Given người dùng có chi phí cố định (recurring bills theo REQ-06)
  When hệ thống tạo báo cáo dòng tiền
  Then hệ thống thể hiện rõ phần chi phí cố định (recurring) và chi phí biến đổi (variable) trong báo cáo dòng tiền.

  

- Given người dùng không có giao dịch nào trong kỳ được chọn
  When hệ thống tạo báo cáo dòng tiền
  Then hệ thống thông báo rằng chưa có dữ liệu dòng tiền và gợi ý tạo giao dịch.

  

## Yêu cầu Phi chức năng (NFR)

- **Hiệu năng biểu đồ**: Biểu đồ phải được render và hiển thị trong vòng 2 giây trên thiết bị di động phổ thông, ngay cả khi dữ liệu giao dịch lên đến 5.000 bản ghi trong kỳ.

- **Phản hồi chat**: Khi người dùng yêu cầu báo cáo trong chat, AI Engine phải phản hồi trong vòng 3 giây với kết quả tóm tắt; biểu đồ/bảng có thể tải thêm 1-2 giây.

- **Tương thích di động**: Tất cả biểu đồ phải responsive, hiển thị đúng và dễ đọc trên màn hình di động từ 5 inch trở lên, hỗ trợ cả chế độ dọc (portrait) và ngang (landscape).

- **Ngôn ngữ đầu vào**: Hệ thống cần hỗ trợ yêu cầu báo cáo bằng tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh trong chat.

- **Ngôn ngữ đầu ra**: Nội dung báo cáo, nhận xét và tư vấn từ AI phải được trả về bằng ngôn ngữ phù hợp với ngôn ngữ yêu cầu của người dùng hoặc ngôn ngữ cài đặt trong app.

- **Bảo mật dữ liệu**: Dữ liệu báo cáo, insight và tư vấn cá nhân hóa phải được xem là dữ liệu nhạy cảm, chỉ hiển thị cho đúng người dùng sở hữu hoặc vai trò được phép.

- **Dữ liệu per-user**: Mỗi người dùng chỉ xem được báo cáo của chính mình; truy vấn báo cáo phải được lọc theo user ID.

- **Tích hợp REQ-01**: Dữ liệu giao dịch đầu vào cho báo cáo được lấy từ REQ-01; khi giao dịch được tạo/sửa/xóa, báo cáo phải phản ánh thay đổi khi người dùng yêu cầu xem lại.

- **Tích hợp REQ-02**: Danh mục trong biểu đồ phải đồng bộ với danh sách danh mục theo REQ-02; khi danh mục bị xóa/gộp, dữ liệu báo cáo phải phản ánh thay đổi.

- **Tích hợp REQ-03**: Báo cáo ngân sách (FR-04-06) phải lấy dữ liệu từ module ngân sách REQ-03; thay đổi ngân sách phải phản ánh ngay trong báo cáo.

- **Tích hợp REQ-05**: Báo cáo hỗ trợ lọc theo ví/tài khoản và phản ánh đúng cấu trúc tài khoản theo REQ-05.

- **Tích hợp REQ-06**: Báo cáo dòng tiền (FR-04-08) phải phân biệt đúng giao dịch transfer, investment và expense theo REQ-06.

- **Chất lượng insight**: Tư vấn và nhận xét từ AI phải dựa trên dữ liệu thực tế, không bịa đặt số liệu; mỗi nhận xét phải có dữ liệu minh chứng kèm theo.

- **Không chặn thao tác**: Khi báo cáo đang tải hoặc biểu đồ đang render, người dùng vẫn có thể sử dụng các tính năng khác của app.

- **Quản lý ngữ cảnh**: Nội dung chat thô chỉ được dùng trong thời hạn ngữ cảnh 48 giờ theo REQ-01; tuy nhiên dữ liệu giao dịch tổng hợp phục vụ báo cáo không bị giới hạn bởi thời hạn này.

  

## Out of Scope

- Báo cáo nhóm/chia sẻ giữa nhiều người dùng (shared reports).

- Xuất báo cáo ra PDF, file ảnh hoặc spreadsheet — thuộc phạm vi REQ-07.

- So sánh chi tiêu với người dùng khác hoặc benchmark cộng đồng.

- Dự báo chi tiêu tương lai bằng machine learning (predictive analytics).

- Tư vấn đầu tư chứng khoán, bất động sản hoặc các sản phẩm tài chính phức tạp.

- Tích hợp dữ liệu tài chính từ ngân hàng hoặc ứng dụng bên ngoài.

- Báo cáo thuế hoặc kế toán chuyên nghiệp.

- Tùy chỉnh giao diện biểu đồ (màu sắc, kiểu biểu đồ tùy ý) ngoài các kiểu mặc định.

- Dashboard real-time cập nhật liên tục (live dashboard) — báo cáo được tạo theo yêu cầu hoặc theo lịch.

  

## Open Questions

- [ ] Ngưỡng phát hiện bất thường chi tiêu cụ thể là bao nhiêu phần trăm (20%, 30%, 50%)? Hay để AI tự xác định dựa trên mô hình thống kê?

- [ ] Biểu đồ có hỗ trợ tương tác (interactive — zoom, pan, tap xem chi tiết) hay chỉ hiển thị tĩnh?

- [ ] Tư vấn cá nhân hóa từ AI có cần kèm disclaimer/cảnh báo pháp lý rằng không phải lời khuyên tài chính chuyên nghiệp?

- [ ] Khi người dùng chọn kỳ quý hoặc năm nhưng dữ liệu chưa đủ, hiển thị dữ liệu hiện có hay từ chối tạo báo cáo?

- [ ] Insight chủ động (proactive) được gửi với tần suất nào? Cuối tuần, cuối tháng, hay cả hai?

- [ ] Báo cáo trong chat hiển thị dưới dạng gì: ảnh biểu đồ, inline text, bảng markdown, hay card tương tác?

- [ ] Có cần lưu trữ lịch sử báo cáo đã xem/đã tạo không? Hay mỗi lần xem đều tạo mới từ dữ liệu hiện tại?

- [ ] Có giới hạn số lần yêu cầu báo cáo/insight trong chat mỗi ngày không (rate limiting)?

- [ ] Kỳ tuần bắt đầu từ thứ Hai hay Chủ Nhật? (tương tự open question của REQ-03)

  

## Hướng dẫn phê duyệt

> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-04.md` → `REQ-04.md`  

> Sau khi đổi tên, BA mới chuyển sang tạo DRAFT cho `REQ-05`.

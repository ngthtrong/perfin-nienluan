---
tags:
  - nien-luan
---
# REQ-04: Báo cáo và phân tích chi tiêu (Spending Analytics)

## Metadata
- **Brief nguồn**: BRIEF-01.md, Yêu cầu tính năng.md (Tính năng #5)
- **Ngày tạo**: 25/05/2026
- **Lần cập nhật cuối**: 25/05/2026
- **Trạng thái**: DRAFT — chờ PO phê duyệt

## Tóm tắt
Tính năng Báo cáo và phân tích chi tiêu cung cấp cho người dùng một cái nhìn tổng quan và trực quan về tình hình tài chính cá nhân thông qua các biểu đồ đa dạng (tròn, cột). Điểm nhấn của Rolly là khả năng "đọc hiểu" biểu đồ bằng AI để đưa ra các nhận xét tự động (AI Insights) về những điểm bất thường trong thói quen tiêu dùng, giúp người dùng dễ dàng hiểu được các báo cáo khô khan. Người dùng có thể xem báo cáo trong màn hình riêng hoặc yêu cầu báo cáo nhanh ngay trong màn hình chat.

## Phân tích yêu cầu

### Actors
- **User**: Người xem báo cáo, tương tác với biểu đồ và nhận các tư vấn từ AI.
- **AI Engine**: Phân tích dữ liệu giao dịch, phát hiện bất thường và sinh ra các AI Insights (nhận xét tự động).
- **System**: Tổng hợp dữ liệu, vẽ biểu đồ trực quan, lưu trữ các báo cáo.

### Constraints
- Dữ liệu hiển thị trong báo cáo phải là dữ liệu real-time hoặc có độ trễ cực thấp ngay sau khi giao dịch được tạo/sửa/xóa.
- Báo cáo phải tự động loại trừ các giao dịch bị đánh dấu Xóa mềm (Soft deleted) và Xóa cứng.
- AI Insight chỉ sinh ra khi có đủ lượng dữ liệu tối thiểu (ví dụ: cần ít nhất dữ liệu của 2 chu kỳ để so sánh).

### Ambiguities
- ⚠️ AMBIGUOUS: Với tính năng "Báo cáo tài sản ròng (Net Worth)", báo cáo có bao gồm các khoản nợ/cho vay chưa đòi được từ REQ-06 hay không?
- ⚠️ AMBIGUOUS: Các giao dịch đặc biệt (Investment, Transfer) có được tính vào báo cáo Thu/Chi tổng hợp (Income/Expense) không?

### Out of Scope sơ bộ
- Báo cáo chi tiết từng mã cổ phiếu/tài sản đầu tư cá biệt (Chỉ hiển thị tổng tiền đầu tư).
- Chức năng xuất báo cáo ra Excel/PDF sẽ nằm ở REQ-07.

---

## Yêu cầu Chức năng (FR)

### FR-04-01: Biểu đồ chi tiêu theo danh mục
**Mô tả**: Hệ thống tổng hợp và hiển thị tổng số tiền đã chi tiêu cho từng danh mục dưới dạng biểu đồ (Ví dụ: Biểu đồ tròn - Pie chart) để người dùng thấy tỷ trọng.

**Acceptance Criteria**:
- Given người dùng mở tab Báo cáo
  When người dùng chọn xem "Chi tiêu theo danh mục"
  Then hệ thống hiển thị biểu đồ tròn (Pie chart) thể hiện tỷ lệ % của từng danh mục trên tổng chi phí, kèm danh sách chi tiết số tiền bên dưới.
  
- Given người dùng chạm vào một phần của biểu đồ tròn (vd: Ăn uống 40%)
  When thao tác được thực hiện
  Then hệ thống lọc và hiển thị danh sách các giao dịch thuộc danh mục "Ăn uống" trong chu kỳ đó.

### FR-04-02: Phân tích xu hướng chi tiêu theo thời gian
**Mô tả**: Hiển thị biến động của chi tiêu hoặc thu nhập qua các ngày trong tuần/tháng bằng biểu đồ cột (Bar chart) hoặc đường (Line chart).

**Acceptance Criteria**:
- Given người dùng xem báo cáo xu hướng tháng
  When biểu đồ được render
  Then trục X sẽ là các ngày/tuần trong tháng, trục Y là số tiền, cho phép người dùng thấy ngày nào chi tiêu cao nhất.

### FR-04-03: So sánh chi tiêu giữa các kỳ
**Mô tả**: So sánh trực tiếp tổng chi tiêu của kỳ hiện tại với kỳ trước đó (Ví dụ: Tháng này vs Tháng trước) để người dùng biết mình đang tiêu nhiều hay ít hơn.

**Acceptance Criteria**:
- Given người dùng xem báo cáo Tháng 6
  When hệ thống tổng hợp dữ liệu
  Then hệ thống phải hiển thị con số chênh lệch so với Tháng 5 (VD: "Ít hơn tháng trước 1.500.000đ" kèm mũi tên xanh đi xuống).

### FR-04-04: AI Insight — Nhận xét tự động về bất thường chi tiêu
**Mô tả**: Rolly không chỉ vẽ biểu đồ mà AI còn đọc hiểu dữ liệu đó và chỉ ra các điểm bất thường bằng văn bản.

**Acceptance Criteria**:
- Given dữ liệu giao dịch danh mục "Di chuyển" tháng này cao đột biến so với trung bình 3 tháng trước
  When hệ thống sinh báo cáo
  Then AI Engine tạo ra một thẻ Insight (VD: "Tháng này bạn chi tiền taxi tăng 30% so với tháng trước, hãy cân nhắc đi xe buýt").
  
- Given người dùng vừa nhận lương và ngay lập tức chi tiêu 50% số lương trong 3 ngày đầu
  When hệ thống phát hiện hành vi chi tiêu nhanh
  Then AI Engine sinh ra một cảnh báo Insight khuyên người dùng nên chậm lại.

### FR-04-05: Tổng hợp thu/chi theo kỳ
**Mô tả**: Hiển thị tổng quan số tiền Thu (Income), Chi (Expense) và số dư (Balance = Thu - Chi) của một chu kỳ được chọn.

**Acceptance Criteria**:
- Given người dùng mở tab Tổng quan
  When hệ thống load dữ liệu tháng hiện tại
  Then hệ thống hiển thị 3 con số: Tổng Thu, Tổng Chi, và Số dư còn lại (Thu trừ Chi).

### FR-04-06: Báo cáo ngân sách
**Mô tả**: Hiển thị báo cáo so sánh giữa số tiền thực tế đã chi và số tiền ngân sách đã đặt ra.

**Acceptance Criteria**:
- Given người dùng đã đặt ngân sách cho các danh mục (theo REQ-03)
  When người dùng xem báo cáo Ngân sách
  Then hệ thống hiển thị thanh tiến trình (Progress bar) cho từng ngân sách, cho thấy mức độ hoàn thành và số tiền còn lại.

### FR-04-07: Xem báo cáo nhanh bằng chat
**Mô tả**: Người dùng có thể yêu cầu xem báo cáo nhanh thông qua ngôn ngữ tự nhiên trong màn hình chat.

**Acceptance Criteria**:
- Given người dùng nhắn "Tháng trước tôi tiêu bao nhiêu tiền cho ăn uống?"
  When AI nhận diện câu lệnh
  Then hệ thống trả về con số tổng chi tiêu danh mục Ăn uống của tháng trước dưới dạng tin nhắn, có thể kèm theo một mini chart.
  
- Given người dùng nhắn "Tổng kết tháng này đi"
  When AI nhận diện câu lệnh
  Then AI trả về một đoạn tóm tắt văn bản tổng Thu, tổng Chi và điểm nhấn (Insight) lớn nhất của tháng.

### FR-04-08: Lọc/Nhóm báo cáo theo nhiều tiêu chí
**Mô tả**: Người dùng có thể dùng công cụ filter để lọc biểu đồ theo thời gian tùy chỉnh, theo danh mục cụ thể, hoặc theo ví.

**Acceptance Criteria**:
- Given người dùng đang xem biểu đồ tổng
  When người dùng chọn filter "Ví Momo"
  Then hệ thống vẽ lại toàn bộ biểu đồ và tính toán lại số liệu chỉ dựa trên các giao dịch thuộc "Ví Momo".

### FR-04-09: Báo cáo Tài sản ròng (Net Worth)
**Mô tả**: Hiển thị bức tranh tổng thể về tài sản thực sự của người dùng (Tổng Tiền mặt/Ví + Đầu tư + Tiết kiệm - Nợ).

**Acceptance Criteria**:
- Given người dùng có tiền ở nhiều ví, có sổ tiết kiệm và có khoản vay nợ
  When người dùng xem báo cáo Tài sản ròng
  Then hệ thống hiển thị biểu đồ diễn biến Net Worth qua các tháng. Tổng Net Worth = (Tổng số dư các ví dương) - (Tổng các khoản nợ).

---

## Yêu cầu Phi chức năng (NFR)
- **UI/UX**: Các biểu đồ phải có tính tương tác cao (Interactive), cho phép chạm/click để xem chi tiết tooltips.
- **Tốc độ**: Báo cáo tổng quan phải load trong dưới 1 giây. Việc query dữ liệu lớn (nhiều năm) có thể dùng cơ chế lazy loading.
- **Cache**: Dữ liệu báo cáo của các tháng trong quá khứ (đã chốt số) nên được cache lại để giảm tải cho DB thay vì tính toán lại từ đầu mỗi lần xem.

## Out of Scope
- Tự động lấy dữ liệu thị trường (chứng khoán, giá vàng) để tính Net Worth realtime. Người dùng phải tự cập nhật lỗ/lãi đầu tư (sẽ nói ở REQ-06).

## Open Questions
- [ ] Tính năng Báo cáo tài sản ròng (Net Worth) có gộp luôn vào MVP không hay để phase sau?
- [ ] AI Insights có dùng một LLM Prompt mỗi lần người dùng mở màn hình không? Việc này có thể tốn kém chi phí API, có nên lập lịch (cron job) sinh Insight 1 lần/ngày không?

## Hướng dẫn phê duyệt
> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-04.md` → `REQ-04 Báo cáo và phân tích chi tiêu (Spending Analytics).md`

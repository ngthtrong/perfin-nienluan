---
tags:
  - nien-luan
---
[[Xây dựng hệ thống]]

# Draft Version

### 1. Nhập liệu đa phương thức bằng AI (AI-Powered Input)

[[1 Nhập liệu đa phương thức bằng AI (AI-Powered Input)]]

[[1. 2 Nhập liệu đa phương thức bằng AI (AI-Powered Input)]]

- **Tính năng:** Cho phép ghi chép giao dịch bằng cách chat văn bản tự nhiên, gửi tin nhắn giọng nói (Voice), hoặc chụp ảnh/tải lên hóa đơn (Receipt Scanning).
    
- **Phân tích:** Đây là tính năng cốt lõi tạo nên sức hút của Rolly. Thay vì phải mở ứng dụng, chọn nút thêm, nhập số tiền, chọn ngày tháng, tìm danh mục... người dùng chỉ cần gõ "Trà sữa 50k" hoặc chụp tờ biên lai siêu thị. AI sẽ tự động bóc tách dữ liệu. Điều này giảm thiểu tối đa rào cản thao tác, giúp người dùng dễ dàng duy trì thói quen ghi chép hàng ngày mà không cảm thấy phiền phức.
    
### 2. Phân loại thông minh (Auto-Categorization)
[[REQ-02 Phân loại thông minh (Auto-Categorization)]]
	
- **Tính năng:** Dựa trên ngữ cảnh của câu chat hoặc nội dung hóa đơn, hệ thống tự động xếp khoản tiền vào đúng danh mục (Ăn uống, Di chuyển, Hóa đơn điện nước, v.v.).
    
- **Phân tích:** Tính năng này giúp báo cáo tài chính luôn gọn gàng mà không đòi hỏi người dùng phải tự tư duy phân loại. Hơn nữa, nó hạn chế sai sót do thao tác nhầm lẫn, đảm bảo dữ liệu đầu vào luôn chuẩn xác để AI có thể phân tích xu hướng về sau.
    
### 3. Tương tác với "Nhân cách AI" (AI Personalities)

- **Tính năng:** Rolly không chỉ phản hồi như một cỗ máy khô khan mà có thể nhập vai. Người dùng có thể chọn chế độ "Bà mẹ nghiêm khắc" (Angry Mom) để bị cằn nhằn khi tiêu hoang, hoặc chế độ "Chuyên gia tài chính" để nhận những lời khuyên nhẹ nhàng, chuyên nghiệp.
    
- **Phân tích:** Đây là yếu tố đánh mạnh vào tâm lý hành vi (Behavioral Psychology) và tính giải trí (Gamification). Nó biến một công việc khô khan thành một cuộc trò chuyện thú vị. Những lời nhắc nhở hài hước thực chất là những cú hích tâm lý, giúp người dùng tự ý thức hơn về hành vi bốc đồng của mình và điều chỉnh thói quen chi tiêu.
    
### 4. Quản lý Ngân sách & Cảnh báo (Budgeting & Alerts)

- **Tính năng:** Người dùng có thể thiết lập hạn mức chi tiêu cho từng danh mục hoặc tổng thể theo tuần/tháng. AI sẽ theo dõi số dư và gửi cảnh báo khi người dùng sắp chạm ngưỡng giới hạn.
    
- **Phân tích:** Tính năng này chuyển đổi việc quản lý tài chính từ trạng thái "Bị động" (chỉ ghi chép lại những gì đã tiêu) sang "Chủ động" (kiểm soát trước khi tiêu). Nó giúp người dùng luôn nắm rõ mình còn bao nhiêu "ngân sách sinh tồn" cho đến kỳ lương tiếp theo, ngăn chặn hiệu quả tình trạng rỗng túi cuối tháng.
    
### 5. Phân tích & Báo cáo cá nhân hóa (Personalized Insights)

- **Tính năng:** Hệ thống tổng hợp dữ liệu thành các biểu đồ trực quan và đưa ra các nhận xét, tư vấn bằng văn bản dựa trên chính thói quen tiêu dùng thực tế của cá nhân.
    
- **Phân tích:** Khác với các ứng dụng truyền thống chỉ cung cấp biểu đồ tròn để người dùng tự xem, Rolly "đọc hiểu" biểu đồ đó và chỉ ra các điểm bất thường. Ví dụ: hệ thống có thể nhận diện và thông báo _"Tháng này bạn chi tiền taxi tăng 30% so với tháng trước, hãy cân nhắc đi xe buýt"_. Điều này cung cấp giá trị tư vấn sát sườn, giúp những người không có chuyên môn về tài chính vẫn đọc vị được bức tranh thu chi của mình.
### 6. Phân tách Dòng tiền & Tài sản (Cashflow & Asset Management)

Việc quản lý tài chính cá nhân không chỉ có thu - chi sinh hoạt, mà còn liên quan đến dòng tiền luân chuyển giữa các ví hoặc kênh đầu tư:

- **Tracking dòng tiền đầu tư:** Hệ thống cho phép bóc tách rõ ràng các khoản tiền "đóng băng" hoặc đem đi sinh lời. Ví dụ, khi bạn ghi nhận _"Chuyển 10 triệu vào tài khoản MBS để đánh phái sinh"_, Rolly sẽ nhận diện đây là hành động "Điều chuyển tài sản" (Transfer) hoặc "Đầu tư" (Investment) chứ không tính vào "Chi phí" (Expense), giúp bức tranh tài sản ròng (Net Worth) luôn phản ánh đúng thực tế.
    
- **Quản lý chi phí cố định (Recurring Bills):** AI tự động nhận diện các chu kỳ thanh toán. Đến ngày mùng 5 hàng tháng, chatbot có thể chủ động ping bạn: _"Hôm nay đến hạn đóng 1.500.000đ tiền phòng trọ, bạn đã thanh toán chưa để tôi cập nhật số dư?"_.
    

### 7. Tương tác đa chiều & Hợp tác (Collaboration)

- **Ví dùng chung (Shared Wallets):** Đây là tính năng rất mạnh dành cho các cặp đôi hoặc nhóm bạn. Khi đi du lịch chung, nhóm có thể tạo một ví chung. Bất kỳ ai chi tiền và nhắn vào nhóm (ví dụ: _"Tôi vừa thanh toán tiền vé tham quan Tháp đôi Petronas hết 200k cho cả nhóm"_), AI sẽ tự động chia đều chi phí (Split cost) và tính toán xem ai đang nợ ai bao nhiêu tiền, loại bỏ sự phức tạp của việc đối soát thủ công.
    
- **Xuất dữ liệu thô (Data Export):** Mặc dù ứng dụng có sẵn các báo cáo phân tích, người dùng vẫn có quyền xuất toàn bộ dữ liệu giao dịch ra file định dạng `.csv` hoặc Excel. Điều này rất hữu ích khi cần tổng hợp dữ liệu cuối năm hoặc import vào các công cụ phân tích dữ liệu chuyên nghiệp khác để tự tùy biến.
# Bộ prompt demo các trường hợp đặc biệt của PERFIN

## Mục lục

1. [Giao dịch văn bản](#1-giao-dịch-văn-bản)
2. [Ảnh và giọng nói](#2-ảnh-và-giọng-nói)
3. [Thiếu hoặc mơ hồ ngữ cảnh](#3-thiếu-hoặc-mơ-hồ-ngữ-cảnh)
4. [Khoản định kỳ và chuyển ví](#4-khoản-định-kỳ-và-chuyển-ví)
5. [Câu hỏi chỉ đọc và hành động nâng cao](#5-câu-hỏi-chỉ-đọc-và-hành-động-nâng-cao)
6. [An toàn của thao tác chờ](#6-an-toàn-của-thao-tác-chờ)

## 1. Giao dịch văn bản

| Tên trường hợp                          | Prompt / hành động                                                        | Kết quả mong đợi                                                                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Một khoản chi cơ bản                    | `Ăn phở 50k hôm nay`                                                    | Preview 1 khoản chi 50.000đ, danh mục Ăn uống, ngày hôm nay; chưa ghi trước khi xác nhận.                                                   |
| Ngày tương đối trong quá khứ         | `Hôm qua tôi đổ xăng 200k`                                            | Preview khoản chi 200.000đ, danh mục Di chuyển, ngày giao dịch là hôm qua.                                                                      |
| Ngày tương đối xa hơn trong quá khứ | `Hôm kia mua thuốc 85k`                                                  | Preview khoản chi 85.000đ, danh mục Sức khỏe, ngày giao dịch là hai ngày trước.                                                              |
| Ngày tương đối trong tương lai       | `Ngày mai đóng học phí 2 triệu`                                      | Có thể tạo preview với ngày mai, nhưng khi xác nhận backend từ chối vì ngày giao dịch không được ở tương lai; không ghi dữ liệu. |
| Ngày tuyệt đối                          | `Ngày 10/08/2026 mua sách 320k`                                          | Preview khoản chi 320.000đ với đúng ngày 10/08/2026.                                                                                              |
| Khoản thu                                  | `Hôm nay nhận lương 15 triệu`                                         | Preview khoản thu 15.000.000đ, danh mục Lương.                                                                                                     |
| Số tiền viết tắt tiếng Việt           | `Mua laptop 12tr5`                                                         | Chuẩn hóa số tiền thành 12.500.000đ và tạo preview khoản chi.                                                                                  |
| Số tiền bằng lời nói                   | `Mua bàn làm việc một triệu năm trăm nghìn`                        | Chuẩn hóa thành 1.500.000đ và tạo preview khoản chi.                                                                                             |
| Số lượng nhân đơn giá                | `Mua 3 cái áo, mỗi cái 200k`                                           | Tính tổng 600.000đ và tạo một preview khoản chi Mua sắm.                                                                                        |
| Nhiều khoản chi trong một câu           | `Ăn sáng 30k, Grab 45k, cà phê 25k`                                    | Preview 3 giao dịch, tổng chi 100.000đ; từng dòng có thể sửa riêng.                                                                            |
| Nhiều khoản thu và chi hỗn hợp         | `Nhận thưởng 2 triệu, mua quà 500k, ăn tối 180k`                    | Preview 3 giao dịch gồm 1 khoản thu và 2 khoản chi; tổng thu/chi hiển thị riêng.                                                               |
| Sửa trước khi xác nhận                 | Nhập`Cà phê 35k`, tại preview đổi thành `40.000` rồi xác nhận. | Chỉ giao dịch 40.000đ được lưu; bản nháp 35.000đ không được ghi.                                                                          |
| Hủy preview                                | Nhập`Xem phim 120k`, sau đó bấm **Hủy**.                        | Pending bị hủy; không có giao dịch mới và số dư không đổi.                                                                                  |

## 2. Ảnh và giọng nói

| Tên trường hợp                              | Prompt / hành động                                                                                                 | Kết quả mong đợi                                                                                                                                |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ảnh biên lai chuyển khoản — khoản chi     | Gửi ảnh chuyển khoản; thêm ngữ cảnh`Đây là khoản tôi chuyển để trả tiền phòng tháng này.`       | OCR hiển thị raw text; tạo preview 1 khoản chi theo số tiền/ngày đọc được, ưu tiên ngữ cảnh tiền phòng; chỉ lưu sau xác nhận. |
| Ảnh biên lai chuyển khoản — khoản thu     | Gửi ảnh báo có; thêm ngữ cảnh`Đây là tiền khách hàng chuyển cho tôi.`                                | OCR hiển thị raw text; tạo preview khoản thu theo số tiền/ngày đọc được; cho phép sửa trước khi xác nhận.                         |
| Ảnh hóa đơn chỉ có tổng                  | Gửi ảnh hóa đơn có dòng tổng cộng rõ ràng.                                                                 | OCR hiển thị raw text và preview một giao dịch bằng tổng hóa đơn.                                                                         |
| Ảnh hóa đơn có tổng và nhiều mặt hàng | Gửi ảnh hóa đơn siêu thị có từng mặt hàng và tổng; chọn**Ghi tổng hóa đơn**.                  | Tạo một preview bằng tổng hóa đơn, không ghi thêm từng mặt hàng để tránh đếm hai lần.                                             |
| Đa giao dịch từ một ảnh hóa đơn         | Gửi lại ảnh hóa đơn có nhiều mặt hàng; chọn**Ghi từng mặt hàng**.                                 | Tạo preview nhiều giao dịch theo các dòng hàng; không đồng thời tạo giao dịch tổng.                                                    |
| Ảnh cần bổ sung ngữ cảnh                   | Gửi ảnh chỉ thấy số tiền nhưng không rõ nội dung; không nhập mô tả.                                     | Hệ thống yêu cầu bổ sung/làm rõ hoặc cho sửa raw text; không tự đoán rồi ghi dữ liệu.                                               |
| Ảnh mờ hoặc không đọc được             | Gửi ảnh hóa đơn mờ đã chuẩn bị.                                                                             | Báo không trích xuất đủ thông tin và không tạo pending giả.                                                                              |
| Giao dịch bằng giọng nói                    | Bấm ghi âm và nói:`Hôm nay tôi đổ xăng hai trăm nghìn.`                                                  | Hiển thị transcript để kiểm tra; sau khi xác nhận transcript, tạo preview chi 200.000đ cho Di chuyển.                                     |
| Giọng nói cần sửa transcript                | Nói một câu có tên riêng hoặc tiếng ồn; sửa transcript thành`Mua thuốc 150k hôm qua`, rồi tiếp tục. | Parser dùng transcript đã sửa; preview đúng 150.000đ, danh mục Sức khỏe, ngày hôm qua.                                                  |

## 3. Thiếu hoặc mơ hồ ngữ cảnh

| Tên trường hợp                           | Prompt / hành động                                                         | Kết quả mong đợi                                                                                   |
| -------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Thiếu số tiền                             | `Ăn phở`                                                                  | Hỏi số tiền cần ghi nhận; chưa tạo giao dịch.                                                  |
| Bổ sung ở lượt sau                       | Sau câu`Ăn phở`, trả lời `50k`                                       | Ghép đúng ngữ cảnh và tạo preview ăn phở 50.000đ.                                            |
| Hủy luồng làm rõ                         | Nhập`Ăn phở`, sau đó trả lời `Hủy`.                               | Xóa trạng thái làm rõ; không tạo giao dịch.                                                    |
| Câu hỏi chen ngang khi đang làm rõ      | Nhập`Ăn phở`, sau đó hỏi `Tôi có những ví nào?`                | Bỏ luồng làm rõ cũ, trả danh sách ví; không dùng câu hỏi làm mô tả giao dịch.          |
| Câu hỏi không bị hiểu thành khoản chi | `Tôi có bao nhiêu ngân sách cho bida?`                                 | Trả lời chưa đặt ngân sách cho bida; không tạo giao dịch và không mở clarification tiền. |
| Chuyển ví thiếu dữ kiện                 | `Chuyển 2 triệu sang ví ngân hàng`                                     | Hỏi thêm ví nguồn; không tự chọn nếu thiếu ngữ cảnh.                                        |
| Hai đối tượng gần giống nhau           | Khi có hai khoản định kỳ gần tên nhau, nhập`Đã trả iCloud rồi`. | Yêu cầu chọn đúng khoản bằng số thứ tự thay vì tự chọn.                                   |

## 4. Khoản định kỳ và chuyển ví

| Tên trường hợp                       | Prompt / hành động                                                  | Kết quả mong đợi                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Tạo khoản chi định kỳ               | `Nhắc tiền phòng trọ 1,5 triệu mỗi tháng ngày 5`             | Preview khoản định kỳ gồm tên, 1.500.000đ, chu kỳ tháng và ngày đến hạn 5; chỉ lưu sau xác nhận.       |
| Xem danh sách khoản định kỳ         | `Danh sách khoản chi cố định của tôi`                         | Trả danh sách khoản định kỳ; không tạo giao dịch mới.                                                          |
| Xem lịch sử một khoản định kỳ     | `Lịch sử tiền phòng`                                             | Trả lịch sử thanh toán của đúng khoản tiền phòng.                                                              |
| Tạm dừng khoản định kỳ             | `Tạm dừng nhắc internet`                                          | Hiển thị hành động chờ/xác nhận tạm dừng đúng khoản internet.                                               |
| Xác nhận đã thanh toán từ reminder | Mở một reminder đến hạn, sau đó nhập`Đã thanh toán rồi`. | Dùng ngữ cảnh reminder để tạo preview giao dịch thanh toán; không commit trực tiếp.                           |
| Chuyển tiền giữa hai ví              | `Chuyển 2 triệu từ ví Tiền mặt sang ví Ngân hàng`           | Preview chuyển ví; sau xác nhận ví nguồn giảm, ví đích tăng cùng số tiền và tài sản ròng không đổi. |
| Chuyển về cùng một ví               | `Chuyển 500k từ ví Tiền mặt sang ví Tiền mặt`                | Từ chối vì ví nguồn và ví nhận trùng nhau; không đổi số dư.                                                |

## 5. Câu hỏi chỉ đọc và hành động nâng cao

| Tên trường hợp                   | Prompt / hành động                                        | Kết quả mong đợi                                                                               |
| ------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Tổng chi đúng khoảng tuần       | `Tuần này tôi xài bao nhiêu?`                         | Trả tổng chi và đúng khoảng ngày của tuần hiện tại; không mở rộng thành cả tháng. |
| Tra cứu theo mô tả và thời gian | `Tháng này tôi đã chi bao nhiêu tiền đánh bida?`  | Chỉ tổng hợp các giao dịch khớp bida trong tháng hiện tại.                                |
| Xem số dư ví                      | `Tôi có những ví nào?`                                | Liệt kê ví và số dư theo tiền tệ; không tạo pending thay đổi tiền.                    |
| Xem ngân sách một danh mục       | `Ngân sách ăn uống còn lại bao nhiêu?`              | Trả hạn mức, đã dùng và còn lại của Ăn uống trong tháng phù hợp.                    |
| Đề xuất ngân sách               | `Gợi ý ngân sách giúp mình`                          | Trả đề xuất dựa trên lịch sử và tạo bước xác nhận trước khi áp dụng.             |
| Phân tích tài chính              | `Phân tích chi tiêu của tôi`                          | Trả facts/insight từ dữ liệu hiện có; không tự tạo giao dịch.                            |
| Tạo mục tiêu tài chính          | `Trong 5 năm mình muốn tiết kiệm 300 triệu mua nhà` | Tạo preview mục tiêu/kế hoạch; chỉ lưu sau xác nhận.                                      |
| Xem mục tiêu hiện tại            | `Tôi đang có các mục tiêu gì?`                      | Trả danh sách và tiến độ mục tiêu; không mở luồng tạo mục tiêu.                      |
| Xuất dữ liệu                      | `Xuất báo cáo CSV`                                      | Chuẩn bị file CSV và cung cấp thao tác tải xuống.                                           |

## 6. An toàn của thao tác chờ

| Tên trường hợp    | Prompt / hành động                                                                               | Kết quả mong đợi                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Xác nhận hai lần   | Tạo`Cà phê 30k`, xác nhận rồi thử xác nhận lại cùng preview nếu giao diện cho phép. | Chỉ có một giao dịch được ghi; pending đã dùng không tạo bản sao.                |
| Pending hết hạn     | Mở một preview đã để quá thời hạn rồi bấm**Xác nhận**.                           | Từ chối xác nhận và yêu cầu tạo preview mới; không ghi draft cũ.                   |
| Lỗi OCR/STT/provider | Tắt provider hoặc dùng đầu vào khiến provider lỗi, rồi gửi lại.                          | Hiển thị lỗi/fallback phù hợp; không tạo dữ liệu giả và không tự ghi PostgreSQL. |

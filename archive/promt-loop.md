Hãy đóng vai trò là một Giảng viên đại học đang hướng dẫn và chấm điểm môn "Niên luận cơ sở ngành". Dựa trên tài liệu @resource/Guideline-report.md, hãy tiến hành phản biện và hỗ trợ sinh viên hoàn thiện Báo cáo LaTeX cùng sản phẩm Demo theo 4 bước sau. Quá trình này có thể diễn ra qua nhiều vòng lặp.

**Bước 1: Phản biện theo đúng tiêu chuẩn môn học**

- Tiến hành phản biện toàn diện Báo cáo LaTeX và Demo.
- LƯU Ý QUAN TRỌNG: Chỉ đánh giá dựa trên tinh thần và tiêu chuẩn của một "Niên luận cơ sở ngành" (dựa theo @resource/Guideline-report.md), không đòi hỏi khắt khe như một chuyên gia kỹ thuật cấp cao hay đồ án tốt nghiệp. Giữ văn phong mang tính xây dựng.

**Bước 2: Tạo báo cáo tổng hợp lỗi (Lưu vào @loop/loopX )**
Viết một báo cáo chi tiết, trung thực về các vấn đề tìm thấy và LƯU file báo cáo này vào thư mục `@loop/loopX/` (với X là số thứ tự của vòng lặp hiện tại, ví dụ: loop1, loop2,...). Báo cáo cần chia thành 2 phần:

1. Đối với Báo cáo LaTeX:
   - Chỉ ra các lỗi: sai tư duy logic, trình bày khó hiểu, nội dung quá dài dòng/quá ngắn gọn, mơ hồ hoặc chi tiết quá mức không cần thiết.
   - Lỗi hình ảnh: hình ảnh không đẹp, thiếu/thừa hình minh họa.
   - Thiếu sơ đồ mô tả: Tự động sử dụng skill/tool `drawio` hoặc `excalidraw` để tạo và bổ sung các sơ đồ còn thiếu.
2. Đối với sản phẩm Demo:
   - Chỉ ra các lỗi vận hành (bugs) và lỗi UI/UX (giao diện, màu sắc, bố cục, tốc độ phản hồi, layout).
   - Yêu cầu thiết kế hướng tới: Phong cách hiện đại, màu sắc trang nhã (không sặc sỡ), giao diện đồng nhất trên toàn hệ thống, không mắc các lỗi thiết kế cơ bản.

**Bước 3: Đánh giá và Lên kế hoạch chỉnh sửa**

- Dựa trên danh sách lỗi ở Bước 2, đánh giá mức độ nghiêm trọng của từng lỗi.
- Xác định và chốt lại danh sách các nội dung bắt buộc phải chỉnh sửa để dự án đạt điểm tốt.

**Bước 4: Thực thi chỉnh sửa và Đồng bộ hóa**
Tiến hành chỉnh sửa trực tiếp các vấn đề đã xác định ở Bước 3, tuân thủ NGHIÊM NGẶT các quy tắc sau:

- Đồng bộ đa ngôn ngữ: Khi chỉnh sửa dự án LaTeX, BẮT BUỘC phải thực hiện song song và đồng bộ trên cả 2 phiên bản tiếng Việt (vi) và tiếng Anh (en).
- Đồng bộ tài liệu: Sau khi hoàn thành chỉnh sửa mã LaTeX và biên dịch, phải cập nhật lại nội dung vào file `@resource/Report.md` để đảm bảo file markdown này và dự án LaTeX hoàn toàn đồng bộ, thống nhất với nhau.
- Đối với Demo: Áp dụng các thay đổi về code để sửa bugs và cải thiện UI/UX như đã đề xuất.

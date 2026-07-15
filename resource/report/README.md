# Nguồn báo cáo chính thức của PERFIN

Thư mục này phân biệt rõ tài liệu hiện trạng với báo cáo thiết kế đích:

| Tài liệu | Vai trò | Trạng thái sử dụng |
|---|---|---|
| `System_Status_2026-07-15.md` | Audit **AS-IS**: tính năng đang chạy, có điều kiện, còn thiếu và lỗi đã biết | Nguồn để lập kế hoạch sửa lỗi |
| `Stabilization_Log_2026-07-15.md` | Chênh lệch **baseline → sau sửa lỗi**, bằng chứng kiểm thử và phần còn lại | Biên bản triển khai sau audit |
| `Report_v1.md` | Báo cáo niên luận **TO-BE** sau khi hoàn tất sửa lỗi trong phạm vi | Nguồn nội dung cho dự án `latex/` mới |
| `Guideline-report.md` | Quy cách hình thức và cấu trúc báo cáo | Quy chuẩn trình bày |
| `Report_v0.md` | Bản lịch sử dùng để tham khảo cách tổ chức | Không phải nguồn sự thật kỹ thuật |

Dự án LaTeX hiện hành nằm ở `../../latex/`. Dự án `../../archive/latex/` và các
tệp Markdown khác trong `resource/` được giữ để truy vết lịch sử, nhưng không
được dùng để khẳng định kiến trúc hoặc trạng thái runtime nếu mâu thuẫn với mã
nguồn, migrations, test và hai tài liệu chính ở trên.

Quy tắc cập nhật:

1. Kết quả chưa chạy phải ghi là **mục tiêu** hoặc **chưa đo**.
2. Thay đổi runtime quan trọng phải cập nhật audit AS-IS trước khi chuyển nội dung
   tương ứng trong `Report_v1.md` từ “thiết kế đích” sang “đã hiện thực/đã đo”.
3. ERD lấy migrations trong `demo/backend/migrations/` làm nguồn sự thật.
4. Sơ đồ lấy tệp `.drawio` trong `latex/figures/drawio/` làm nguồn chỉnh sửa.
5. Không đưa credential, nội dung `.env` hay dữ liệu người dùng thật vào báo cáo.

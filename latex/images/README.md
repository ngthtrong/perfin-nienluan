# Ảnh dùng trực tiếp trong tài liệu

Thư mục này chứa ảnh bitmap/vector được nhúng ngoài bộ sơ đồ đã render
(`figures/rendered/`).

## `ctu_logo.png` — BẮT BUỘC, hiện đang thiếu

Guideline mục 2.1 yêu cầu trang bìa có **tên trường kèm logo**. Tệp logo
không nằm trong repo (chưa từng được commit), nên `frontmatter/{vi,en}/cover.tex`
hiện vẽ một khung dự phòng có chữ "THIẾU LOGO CTU" thay cho logo thật.

Để hoàn thiện bìa: tải logo chính thức của Trường Đại học Cần Thơ, lưu thành

    latex/images/ctu_logo.png

rồi biên dịch lại (`cd latex && make`). Không cần sửa `.tex`: cả hai bản ngôn ngữ
tự phát hiện tệp qua `\IfFileExists` và sẽ dùng logo ngay khi tệp tồn tại.

Yêu cầu tệp: PNG nền trong suốt, cạnh ngắn ít nhất 600 px để không bị rỗ khi in
ở khổ 0,20\textwidth.

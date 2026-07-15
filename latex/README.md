# Báo cáo LaTeX PERFIN

Đây là dự án báo cáo mới cho trạng thái và tầm nhìn hoàn thiện của PERFIN. Nội dung ưu tiên dữ liệu, giải thuật và ranh giới LLM; không kế thừa các khẳng định microservice, shared wallet hoặc authentication từ báo cáo cũ.

## Biên dịch

Yêu cầu XeLaTeX và các gói TeX Live thông dụng. Từ thư mục `latex/`:

```bash
make
```

Hoặc chạy thủ công ba lượt để mục lục, trích dẫn và tham chiếu ổn định:

```bash
xelatex -interaction=nonstopmode -halt-on-error main.tex
xelatex -interaction=nonstopmode -halt-on-error main.tex
xelatex -interaction=nonstopmode -halt-on-error main.tex
```

Không cần `--shell-escape`, Python, `minted`, BibTeX hoặc Biber. Tài liệu tham khảo IEEE được quản lý thủ công trong `chapters/references.tex`.

## Font và quy chuẩn

- Thân bài: Times New Roman 13 pt, giãn dòng 19,5 pt.
- Chương: Arial 14 pt, đậm, chữ hoa.
- Mục: Arial 13 pt, đậm, chữ hoa.
- Tiểu mục: Arial 13 pt, đậm nghiêng.
- Tiểu-tiểu mục: Arial 13 pt, nghiêng.
- Mục lục gồm bốn cấp từ chương đến tiểu-tiểu mục.

Nếu máy thiếu Times New Roman hoặc Arial, cấu hình tự dùng TeX Gyre Termes và TeX Gyre Heros để bản nháp vẫn biên dịch. Bản nộp chính thức nên cài đúng hai font yêu cầu.

## Cấu trúc

- `main.tex`: điểm vào và thứ tự tài liệu.
- `metadata.tex`: thông tin đề tài, sinh viên và giảng viên.
- `config/preamble.tex`: font, lề, heading, bảng và macro hình.
- `frontmatter/`: trang bìa, tóm tắt và từ viết tắt.
- `chapters/chapter1.tex` đến `chapter4.tex`: bốn chương theo guideline.
- `chapters/references.tex`: tài liệu tham khảo IEEE.
- `chapters/appendices.tex`: sơ đồ, lệnh tái lập, biên bản và tiêu chí ổn định.
- `figures/drawio/`: 13 tệp nguồn có thể chỉnh sửa.
- `figures/rendered/`: bản PDF/PNG/SVG đã xuất.

Trang bìa tái sử dụng logo CTU tại `../archive/latex/images/ctu_logo.png`; nếu tệp không tồn tại, tài liệu dùng khung logo dự phòng và vẫn biên dịch.

## Quy ước bằng chứng

Các nhãn “đã hiện thực”, “đã đo”, “mục tiêu”, “thiết kế đích” và “chưa đo” không được dùng thay thế cho nhau. Kết quả sau ổn định hóa được công bố là: backend 18/18 tệp pass; local-parser quality gate 31/31 strict; Expo web export 652 module và khoảng 1,49 MB. Baseline 13/13 và 27/31 được giữ để phân tích tác động bản sửa. Báo cáo không tuyên bố đã kiểm thử live PostgreSQL/Redis, độ chính xác LLM, OCR hoặc STT.

Các PDF Draw.io được chèn trực tiếp bằng `graphicx` và đã được xuất lại ở chế độ crop/one-page để giữ trọn sơ đồ dưới dạng vector. Khi chỉnh sửa, cần tiếp tục xuất PDF với tùy chọn crop; không thay nguồn `.drawio` bằng ảnh raster.

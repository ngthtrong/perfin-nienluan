# Báo cáo LaTeX PERFIN

Đây là dự án báo cáo mới cho trạng thái và tầm nhìn hoàn thiện của PERFIN. Nội dung ưu tiên dữ liệu, giải thuật và ranh giới LLM; không kế thừa các khẳng định microservice, shared wallet hoặc authentication từ báo cáo cũ.

## Biên dịch

Yêu cầu XeLaTeX và các gói TeX Live thông dụng. Dự án hỗ trợ hai ngôn ngữ từ cùng một mã nguồn; chỉ nội dung văn xuôi tách theo ngôn ngữ, còn preamble, font, heading và hình dùng chung. Từ thư mục `latex/`:

```bash
make vi    # -> main-vi.pdf (tiếng Việt)
make en    # -> main-en.pdf (tiếng Anh)
make all   # cả hai bản
```

Ngôn ngữ được chọn qua biến `\doclang` (mặc định `vi` trong `main.tex`). Có thể build thủ công bằng cách truyền biến từ dòng lệnh và tách tên tệp đầu ra bằng `-jobname`:

```bash
xelatex -interaction=nonstopmode -halt-on-error -jobname=main-en \
  "\def\doclang{en}\input{main.tex}"
```

Chạy ba lượt để mục lục, trích dẫn và tham chiếu ổn định (target `make` đã tự lặp ba lượt).

Lệnh cụ thể cho máy hiện tại (MiKTeX trên Windows, draw.io snap trong WSL) và các
lỗi thường gặp: xem [TOOLING.md](TOOLING.md).

Không cần `--shell-escape`, Python, `minted`, BibTeX hoặc Biber. Tài liệu tham khảo IEEE được quản lý thủ công trong `chapters/<lang>/references.tex`.

## Font và quy chuẩn

- Thân bài: Times New Roman 13 pt, giãn dòng 19,5 pt.
- Chương: Arial 14 pt, đậm, chữ hoa.
- Mục: Arial 13 pt, đậm, chữ hoa.
- Tiểu mục: Arial 13 pt, đậm nghiêng.
- Tiểu-tiểu mục: Arial 13 pt, nghiêng.
- Mục lục gồm bốn cấp từ chương đến tiểu-tiểu mục.
- Hình và bảng được đánh số theo chương (ví dụ `Hình 2.1`, `Bảng 2.1`); bảng quy ước ở phần đầu không đánh số.

Nếu máy thiếu Times New Roman hoặc Arial, cấu hình tự dùng TeX Gyre Termes và TeX Gyre Heros để bản nháp vẫn biên dịch. Bản nộp chính thức nên cài đúng hai font yêu cầu.

## Cấu trúc

- `main.tex`: điểm vào; chọn ngôn ngữ qua `\doclang` và nạp `config/lang-<lang>`, `metadata-<lang>`, nội dung `<lang>/`.
- `config/preamble.tex`: phần **dùng chung** — font, lề, heading, bảng và macro hình.
- `config/lang-vi.tex`, `config/lang-en.tex`: cấu hình polyglossia, tên khối (Chương/Chapter...) và macro trạng thái theo ngôn ngữ.
- `metadata-vi.tex`, `metadata-en.tex`: thông tin đề tài, sinh viên và giảng viên theo ngôn ngữ.
- `frontmatter/<lang>/`: trang bìa, tóm tắt và từ viết tắt.
- `chapters/<lang>/chapter1.tex` đến `chapter4.tex`: bốn chương theo guideline.
- `chapters/<lang>/references.tex`: tài liệu tham khảo IEEE (tiêu đề mục lục dùng `\bibname`).
- `chapters/<lang>/appendices.tex`: sơ đồ, lệnh tái lập, biên bản và tiêu chí ổn định.
- `figures/drawio/`: 14 tệp nguồn có nhãn tiếng Anh, có thể chỉnh sửa và dùng chung cho cả hai ngôn ngữ.
- `figures/rendered/`: bản PDF/PNG/SVG đã xuất (dùng chung).

Trang bìa tái sử dụng logo CTU tại `../archive/latex/images/ctu_logo.png`; nếu tệp không tồn tại, tài liệu dùng khung logo dự phòng và vẫn biên dịch.

## Quy ước bằng chứng

Các nhãn “đã hiện thực”, “đã đo”, “mục tiêu”, “thiết kế đích” và “chưa đo” không được dùng thay thế cho nhau. Các số liệu kiểm thử phải được sinh lại từ snapshot cuối trước khi đưa vào báo cáo; artifact lịch sử trên dataset cũ chỉ giữ để đối chiếu và đánh dấu superseded. Báo cáo không tuyên bố accuracy OCR/STT, numeric faithfulness, p95 production hoặc Redis worker live nếu chưa có artifact tương ứng.

Các PDF Draw.io được chèn trực tiếp bằng `graphicx` và đã được xuất lại ở chế độ crop/one-page để giữ trọn sơ đồ dưới dạng vector. Khi chỉnh sửa, cần tiếp tục xuất PDF với tùy chọn crop; không thay nguồn `.drawio` bằng ảnh raster.

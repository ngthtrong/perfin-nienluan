# Báo cáo LaTeX PERFIN

Thư mục này là bản LaTeX đã đồng bộ với `resource/report/Report_v1.md`. Nội dung
tuân theo `resource/report/Guideline-report.md`: thân bài Times New Roman 13 pt,
tiêu đề Arial, mục lục bốn cấp, hình/bảng đánh số liên tục và cấu trúc bốn
chương.

## Cấu trúc chính

```text
archive/latex/
├── main.tex
├── metadata.tex
├── chapters/
│   ├── introduction.tex
│   ├── theory.tex
│   ├── results.tex
│   ├── conclusion.tex
│   ├── references.tex
│   └── appendices.tex
├── figures/
│   ├── drawio/       # nguồn chỉnh sửa
│   └── rendered/     # SVG, PDF vector và PNG xem nhanh
└── scripts/
    └── generate_report_diagrams.py
```

`main.tex` dùng chung cấu hình trình bày tại `latex/config/preamble.tex`, nhưng
toàn bộ chương và hình của bản archive vẫn nằm trong thư mục này.

## Biên dịch báo cáo

Báo cáo dùng Unicode tiếng Việt và font hệ thống, vì vậy cần XeLaTeX:

```bash
cd archive/latex
xelatex -interaction=nonstopmode -halt-on-error main.tex
xelatex -interaction=nonstopmode -halt-on-error main.tex
```

Kết quả là `archive/latex/main.pdf`. Hai lượt biên dịch cập nhật mục lục, danh
mục hình/bảng và tham chiếu chéo.

## Tái tạo sơ đồ

```bash
python3 archive/latex/scripts/generate_report_diagrams.py
```

Script sinh lại 13 tệp Draw.io có thể chỉnh sửa và các bản SVG. Nếu có
`mutool`, script đồng thời tạo PDF vector và PNG. Mọi connector được khóa bằng
`edgeStyle=orthogonalEdgeStyle`, `curved=0`, `rounded=0`; bố cục mô-đun hạn chế
đường nối giao cắt và phù hợp để đặt toàn trang/landscape trong PDF.

Có thể kiểm tra cấu trúc một sơ đồ bằng:

```bash
python3 .codex/skills/drawio-skill/skills/drawio-skill/scripts/validate.py \
  archive/latex/figures/drawio/05-physical-erd.drawio --score
```

## Nguồn sự thật kỹ thuật

- Migration runtime trong `demo/backend/migrations/` quyết định ERD vật lý.
- Mã nguồn và test quyết định hành vi/giới hạn chức năng.
- Kết quả chưa có phép đo phải giữ nhãn “mục tiêu”, “thiết kế đích” hoặc “chưa
  đo”; không suy diễn smoke test thành độ chính xác LLM/OCR/STT.

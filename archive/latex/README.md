# Dự án LaTeX Báo cáo Niên luận PerFin

Thư mục này chứa toàn bộ dự án LaTeX được cấu trúc phân cấp (nested) rõ ràng, phục vụ cho việc biên dịch báo cáo niên luận chính thức dựa trên tài liệu `Report.md` và các tài liệu đặc tả yêu cầu chi tiết (REQ).

## 📂 Cấu trúc dự án

```
latex/
├── main.tex              # File entry point chính
├── metadata.tex          # Khai báo thông tin đề tài, sinh viên, GVHD
├── convert_reqs.py       # Script tự động đồng bộ từ Markdown REQ sang LaTeX
├── chapters/             # Chứa nội dung phân chia theo chương của Report.md
│   ├── cover.tex         # Trang bìa
│   ├── abstract.tex      # Tóm tắt báo cáo
│   ├── abbreviations.tex # Danh mục viết tắt
│   ├── introduction.tex  # Chương 1: Giới thiệu
│   ├── theory.tex        # Chương 2: Cơ sở lý thuyết
│   ├── results.tex       # Chương 3: Kết quả ứng dụng (SRS & Thiết kế sơ bộ)
│   ├── conclusion.tex    # Chương 4: Kết luận
│   ├── references.tex    # Tài liệu tham khảo (Chuẩn IEEE)
│   └── appendices.tex    # Khai báo phụ lục (Nhập các file requirements vào)
├── requirements/         # Chứa mã nguồn LaTeX của 9 REQ (REQ-01 -> REQ-09)
│   ├── req01.tex
│   └── ...
└── images/               # Thư mục chứa hình ảnh và logo (CTU Logo, UML Diagrams)
    └── README.txt        # Hướng dẫn xuất và đặt ảnh
```

## 🛠️ Hướng dẫn sử dụng

### 1. Đồng bộ hóa yêu cầu (Requirements) từ Markdown sang LaTeX
Nếu bạn cập nhật nội dung các file đặc tả yêu cầu dạng Markdown (`.md`) trong thư mục `NIÊN LUẬN/requirements/`, bạn chỉ cần chạy lệnh sau để tự động cập nhật các file `.tex` tương ứng trong dự án LaTeX:
```bash
python3 convert_reqs.py
```
*Lưu ý: Script đã được tối ưu hóa để định dạng lại các khối Acceptance Criteria (Given/When/Then) và chuyển đổi ký tự đặc biệt của LaTeX.*

### 2. Biên dịch cục bộ (Local Compilation)
Để biên dịch dự án LaTeX thành file PDF trên máy cá nhân, hãy đảm bảo bạn đã cài đặt gói TeX Live hoặc tương đương, sau đó chạy:
```bash
pdflatex main.tex
```
*(Chạy 2-3 lần để cập nhật số trang trong Mục lục).*

### 3. Biên dịch trên Overleaf (Khuyên dùng)
1. Nén toàn bộ thư mục `latex/` thành file `.zip`.
2. Tạo project mới trên Overleaf và upload file `.zip` lên.
3. Chọn file chính biên dịch là `main.tex` và nhấn **Recompile**.
4. Các font chữ và ký tự tiếng Việt được cấu trúc sẵn để hiển thị chính xác trên Overleaf.

## 📝 Các phần cần cập nhật trong tương lai
Theo yêu cầu dự án, các phần sau đã được cấu trúc sẵn các khung/bảng/placeholders và sẽ được bạn điền thêm trong giai đoạn phát triển phần mềm:
- Cập nhật thông tin MSSV, Lớp, Khóa, GVHD trong `metadata.tex`.
- Viết phần Tóm tắt (150-200 từ) trong `chapters/abstract.tex`.
- Điền các kiến thức lý thuyết chi tiết trong `chapters/theory.tex`.
- Chèn các sơ đồ UML (xuất ra dạng ảnh PNG) vào thư mục `images/`.
- Cập nhật kết quả kiểm thử (Test Cases thực tế) và Phân tích hiệu năng trong `chapters/results.tex`.

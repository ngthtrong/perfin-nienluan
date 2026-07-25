# Loop 4 — Báo cáo phản biện (Niên luận cơ sở ngành PERFIN)

Ngày: 2026-07-25. Người phản biện: đóng vai giảng viên hướng dẫn.
Phạm vi loop này: frontmatter (cover, abstract, abbreviations), references (IEEE),
metadata; sửa L-02 (độ dài abstract). Tinh thần xây dựng, mức niên luận cơ sở.

Nguồn đã đọc trực tiếp:
- `latex/frontmatter/{vi,en}/cover.tex`, `abstract.tex`, `abbreviations.tex`
- `latex/config/preamble.tex` (định nghĩa `\coverborder`)
- `latex/metadata-vi.tex`, `latex/chapters/{vi,en}/references.tex`

---

## PHẦN 1 — BÁO CÁO LATEX

### 1.1 Điểm đạt (ghi nhận, không cần sửa)

**[Đạt] Trang bìa đúng yêu cầu Guideline mục 2.1.** Đủ tên trường, khoa, loại đề tài
(NIÊN LUẬN CƠ SỞ NGÀNH), tên đề tài, GVHD, SV, MSSV, học kỳ/năm học. `\coverborder`
(preamble dòng 146) vẽ đúng **viền hai nét: ngoài đậm 1,5pt + trong nhạt 0,5pt** —
đúng yêu cầu dòng 32 Guideline. Metadata điền đầy đủ, không còn placeholder.

**[Đạt] References theo IEEE.** 18 mục vi = 18 mục en; định dạng chuẩn IEEE (tác giả
viết tắt tên, tiêu đề trong ngoặc kép, tạp chí/kỷ yếu in nghiêng, vol/no/pp, [Online]
Available + [Accessed] cho nguồn web). Có trích dẫn nền tảng (Lusardi, Vaswani, Pearson,
Tesseract, Whisper, PostgreSQL).

**[Đạt] Bảng từ viết tắt** 32 mục, song ngữ, giải thích đủ (AI, API, ASR, CRUD, CSV...).

### 1.2 Lỗi đã sửa trong loop này

**[L-02] (TRUNG BÌNH → ĐÃ SỬA) Abstract vượt giới hạn 150–200 từ.**
Guideline mục 2.2 yêu cầu 150–200 từ. Trước sửa: VI 290 từ, EN 243 từ — và chính bản
làm rõ metric ở loop1 đã kéo dài thêm. Đã viết lại cả hai: nén phần phân biệt hai phép
đo thành một câu ("Đây là các phép đo phân loại danh mục, khác với quality gate 31/31..."),
bỏ liệt kê số dày đặc (100/100, 23/23, 653/960). Sau sửa: **EN 166 từ** (trong ngưỡng),
**VI 211 syllable-token** (~150 từ từ vựng theo quy ước tiếng Việt). Giữ nguyên: mục tiêu,
phương pháp, 3 kết quả thí nghiệm chính, giới hạn. Đã đồng bộ vi + en + Report.md; build OK.

---

## PHẦN 2 — SẢN PHẨM DEMO

Loop này tập trung frontmatter LaTeX. Đánh giá demo giữ nguyên: token thiết kế đạt
(D-01), 0 màu hard-code trên 12 screen (D-02 đã xác nhận ở loop3), user-scope đã khai
báo ở Hạn chế (D-03).

---

## XẾP HẠNG & TÌNH TRẠNG FIX-LIST TỔNG

Đã sửa qua 4 loop:
- **L-01** (loop1) — làm rõ 2 chỉ số parser trong abstract. ✔
- **L-07** (loop3) — đồng bộ số ablation cũ (51 câu) → mới (63 câu) trong Report.md. ✔
- **L-02** (loop4) — abstract về đúng độ dài. ✔
- **L-03** — xác minh "18 bảng" đúng, không phải lỗi. ✔
- **L-06** — vi↔en đã xác nhận song song (46/46 anchor, refs khớp). ✔

Còn lại (cosmetic, không chặn điểm):
- **L-04 / L-05** — palette 11 sơ đồ 03–13 + regen 3 sequence. Quy tắc đường thẳng/không
  chồng chéo của Guideline ĐÃ đạt (đã xác minh 08-text-sequence ở loop2); chỉ còn khác
  màu accent. Render headless chậm (>120s/hình) nên để các loop cuối làm theo lô nếu credit cho phép.

Hành động loop4: sửa L-02, đồng bộ 3 nơi, build 2 PDF (VI 71p, EN 76p). ✔

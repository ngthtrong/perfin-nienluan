# Loop 3 — Báo cáo phản biện (Niên luận cơ sở ngành PERFIN)

Ngày: 2026-07-25. Người phản biện: đóng vai giảng viên hướng dẫn.
Phạm vi loop này: Chương 2 (cơ sở lý thuyết / giải thuật), Chương 3 mục Kiểm thử
(3.3), đối chiếu số liệu thí nghiệm giữa LaTeX ↔ Report.md ↔ artifact thực tế,
rà token UI toàn bộ frontend. Tinh thần xây dựng, mức niên luận cơ sở.

Nguồn đã đọc/kiểm trực tiếp trong loop này:
- `latex/chapters/vi/chapter2.tex` mục giải thuật (OLS, z-score/IQR, runway, recurring, Pearson)
- `latex/chapters/vi/chapter3.tex` dòng 480–659 (toàn bộ mục Kiểm thử + 3 thí nghiệm)
- Artifact thí nghiệm gốc: `log/ablation-parser-vs-llm_2026-07-24.{json,md}`,
  `log/classification-benchmark_2026-07-24.md`, `log/feedback-before-after_2026-07-24.md`
- Grep hardcoded hex trên toàn bộ 12 screen frontend

---

## PHẦN 1 — BÁO CÁO LATEX

### 1.1 Điểm đạt (ghi nhận, không cần sửa)

**[Đạt] Chương 2 giải thuật vững.** Các công thức OLS, R², z-score, IQR, burn-rate
runway, recurring cadence, Pearson đều có ký hiệu toán rõ, trích dẫn (`montgomery2012`,
`pearson1895`), điều kiện biên (chia 0, s=0, IQR=0), ví dụ số và caveat trung thực
("không chứng minh gian lận", "chưa mô hình hóa mùa vụ"). Vượt chuẩn niên luận cơ sở.

**[Đạt] Mục Kiểm thử (3.3) mạnh.** Có ma trận kiểm thử 8 cấp, bảng bộ chỉ số, bảng
"kết quả đã đo vs còn thiếu" dùng nhãn `\statusmeasured`/`\statusmissing` phân biệt rõ
điều đã đo và chưa đo, và provenance thí nghiệm tái lập (SHA-256, commit, model, Node
version). Cách phân biệt "đo được" vs "chưa đo" là điểm liêm chính học thuật đáng khen.

### 1.2 Lỗi nhất quán số liệu (ĐÃ SỬA trong loop này)

**[L-08] (NGHIÊM TRỌNG — đã sửa) Report.md mang số thí nghiệm CŨ, lệch với LaTeX.**
LaTeX (chapter3/chapter4/abstract) đã cập nhật sang lần chạy ablation 63 câu:
parser 22,2% / macro-F1 0,204; LLM (Gemini) 59,5% / 0,607; p50 964 ms. Nhưng
`resource/Report.md` vẫn còn lần chạy 51 câu cũ: parser 21,6% / 0,192; LLM 54,3% /
0,561; p50 897 ms — ở 6 vị trí (abstract, 2 dòng bảng trạng thái, tiểu mục ablation
Bảng 20, bảng đối chiếu mục tiêu O2, đoạn tổng kết §3.3.2.3).

Đây là hiện thực hóa của L-07 (loop1): người chấm so hai tài liệu sẽ thấy số mâu thuẫn.
**Cách xử lý:** đối chiếu với artifact gốc trong `log/` — xác nhận số 63-câu trong
LaTeX là đúng (ablation JSON: acc 0.2222/0.5952, macroF1 0.2039/0.6068, weightedF1
0.2045/0.5927, 63 API calls). Đã sync toàn bộ 6 vị trí trong Report.md sang số 63-câu.
Grep xác nhận không còn pattern cũ (`0,561`, `0,192`, `54,3`, `21,6`, `897 ms`, `51 câu`).

**[L-09] (NHỎ) Đường dẫn evidence trong ch3 chưa khớp thực tế.**
`chapter3.tex` dòng 596 ghi artifact nằm ở `resource/report/evidence/`, nhưng thực tế
artifact ở `log/` và `demo/backend/tests/experiments/`. `resource/report/evidence/`
không tồn tại. Nên sửa đường dẫn hoặc tạo thư mục evidence để khớp. Chưa sửa loop này
(ưu tiên thấp, không ảnh hưởng nội dung số liệu).

### 1.3 Diagram (tồn từ loop trước)

**[L-04, hạ mức ở loop2] (THẤP–TRUNG BÌNH) 11 sơ đồ chưa đồng bộ palette màu.**
Đã xác minh ở loop2: sequence diagram hiện tại ĐÃ có đường thẳng, lifeline thẳng hàng,
không chồng chéo (thỏa yêu cầu đích danh của guideline). Chỉ còn khác biệt màu palette
so với 01/02. Đây là polish thẩm mỹ, không phải lỗi chặn điểm. Xử lý dần nếu còn ngân sách.

---

## PHẦN 2 — SẢN PHẨM DEMO

**[D-02, CHỐT — đã đạt] Token UI đồng nhất tuyệt đối.** Grep toàn bộ 12 screen
(`demo/frontend/src/screens/*.js`): **0 mã màu hex hardcoded**. Tất cả dùng theme token
qua `useTheme()`. Giải toả hoàn toàn nghi vấn D-02 của loop1 — giao diện đồng nhất, đúng
yêu cầu "đồng nhất trên toàn hệ thống, không lỗi thiết kế cơ bản". Không cần sửa.

**[D-01, giữ nguyên] Design token đạt.** (đã đánh giá loop1)

---

## XẾP HẠNG & DANH SÁCH BẮT BUỘC SỬA (Bước 3)

Đã sửa trong loop này:
1. **L-08** — Sync 6 vị trí số thí nghiệm cũ trong Report.md sang số 63-câu (đối chiếu artifact gốc). ✅

Còn lại (ưu tiên giảm dần):
2. **L-09** — Sửa đường dẫn evidence trong ch3 (vi+en) cho khớp `log/`. (nhỏ)
3. **L-04/L-05** — Đồng bộ palette màu cho sơ đồ 03–13 nếu còn ngân sách (thẩm mỹ).

Đã chốt ĐẠT, không cần sửa: Chương 2 giải thuật, mục Kiểm thử 3.3, token UI (D-02),
design token (D-01).

## Ghi chú thực thi
- Loop này chỉ sửa `resource/Report.md` (đồng bộ tài liệu), không đụng LaTeX nên không cần build lại.
- Số liệu authoritative lấy từ `log/*_2026-07-24.{json,md}`, commit 5f03476, model gemini-3.1-flash-lite.

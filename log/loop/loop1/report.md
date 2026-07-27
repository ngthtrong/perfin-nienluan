# Loop 1 — Báo cáo phản biện (Niên luận cơ sở ngành PERFIN)

Ngày: 2026-07-25. Người phản biện: đóng vai giảng viên hướng dẫn.
Phạm vi: đối chiếu theo `resource/Guideline-report.md`. Tinh thần: xây dựng, ở mức
niên luận cơ sở ngành (trọng tâm dữ liệu + giải thuật), không đòi hỏi như đồ án tốt nghiệp.

Nguồn đã đọc trực tiếp (có căn cứ, không suy đoán):
- `latex/chapters/vi/chapter1.tex`, `latex/frontmatter/vi/abstract.tex`, `latex/chapters/vi/chapter4.tex`
- `demo/frontend/src/theme/tokens.js`
- Hình đã render + vision-check: `01-system-context`, `02-runtime-architecture`
- `resource/Guideline-report.md`, cấu trúc `latex/` và `resource/Report.md`

---

## PHẦN 1 — BÁO CÁO LATEX

### 1.1 Lỗi tư duy logic / trình bày / nhất quán số liệu

**[L-01] (NGHIÊM TRỌNG) Số liệu trong Tóm tắt dễ gây hiểu nhầm cho người chấm.**
`abstract.tex` nêu song song: "31/31 local-parser quality gate" và "parser cục bộ đạt
macro-F1 0,177". Người đọc lướt sẽ thấy mâu thuẫn (đỗ toàn bộ quality gate nhưng F1 rất
thấp). Bản chất là hai phép đo khác nhau (gate strict trên 31 câu cấu trúc rõ vs macro-F1
trên tập phân tầng), nhưng abstract không phân biệt. Cần một mệnh đề nối rõ hai chỉ số đo
việc khác nhau, tránh để hội đồng hiểu là số liệu tự mâu thuẫn.

**[L-02] (TRUNG BÌNH) Tóm tắt là một khối văn bản dày đặc.**
Guideline mục 2.2 yêu cầu 150–200 từ, gọn. `abstract.tex` hiện là một đoạn duy nhất nhồi
6+ con số (100/100, 31/31, 23/23, 5.265, 0,177, 0,607, 0%→68,19%). Đúng về tính trung
thực nhưng quá tải nhận thức. Nên tách 2–3 câu chốt (mục tiêu, cách làm, kết quả chính,
giới hạn) và giảm mật độ số.

**[L-03] (ĐÃ XÁC MINH — ĐÚNG, không cần sửa) Số bảng vật lý = 18.**
`chapter4.tex` viết "migration cho 18 bảng vật lý". Đã đối chiếu: các migration 001–008 tạo
đúng 18 bảng (grep `CREATE TABLE` trên toàn bộ chuỗi migration = 18 tên duy nhất). File
`perfin_schema.sql` chỉ có 15 `CREATE TABLE` vì 3 bảng được thêm ở migration về sau; con số
18 trong báo cáo là chính xác và đã được liệt kê đầy đủ ở chapter3 (dòng 369), có ghi chú
"3 compatibility view không đếm là bảng". → Không phải lỗi.

### 1.2 Lỗi hình ảnh / sơ đồ

**[L-04] (NGHIÊM TRỌNG — yêu cầu tường minh của giảng viên) 11/13 sơ đồ chưa đạt chuẩn.**
`Guideline-report.md` dòng 130: "Sơ đồ phải dùng mũi tên liên kết dạng đường thẳng chứ
không phải đường cong ... và hạn chế mũi tên chồng chéo". Hiện chỉ `01-system-context` và
`02-runtime-architecture` đã restyle (orthogonal, không chồng chéo, một màu nhấn cho
LLM/AI). 11 sơ đồ còn lại (03–13) vẫn style cũ. Đây là lỗi bị nhắc đích danh, mức ưu tiên cao.

**[L-05] (TRUNG BÌNH) Sơ đồ tuần tự phải sinh bằng script.**
`08-text-sequence`, `11-insight-sequence`, `13-worker-sequence` là sequence diagram; theo
kế hoạch phải sinh bằng `seqlayout.py` (đường thẳng, lifeline thẳng hàng), không hand-place.
Đường dẫn thực: `.claude/skills/drawio-skill/skills/drawio-skill/scripts/seqlayout.py`.

### 1.3 Đồng bộ đa ngôn ngữ & Report.md

**[L-06] (CẦN KIỂM CHỨNG) vi/en lệch số dòng.**
chapter2: 579 (vi) vs 607 (en); chapter3: 660 vs 663. Có thể chỉ do cách xuống dòng, nhưng
phải xác minh nội dung song song trước khi kết luận đồng bộ.

**[L-07] (TRUNG BÌNH) Report.md chưa xác minh đồng bộ từ mục 3.2 trở đi.**
`resource/Report.md` (1340 dòng) mới được đối chiếu tới FR-12 (3.1.3.12). Phần 3.2 Thiết kế
phần mềm → Chương 4 chưa được diff với nguồn LaTeX trong phiên này.

---

## PHẦN 2 — SẢN PHẨM DEMO

### 2.1 UI/UX

**[D-01] (TÍCH CỰC — đã đạt) Hệ thống token thiết kế tốt.**
`theme/tokens.js`: một màu nhấn (brand #A84B32 terracotta), semantic tokens cho light/dark,
bảng màu chart ấm và hạn chế, thang chữ + spacing + radius nhất quán. Đúng yêu cầu "hiện
đại, trang nhã, không sặc sỡ, đồng nhất". Không cần đổi ở loop này.

**[D-02] (CẦN KIỂM CHỨNG) Đồng nhất áp dụng token trên 12 màn hình.**
Có 12 screen (Dashboard, Chat, Budget, Report, Transaction, Category, Cashflow, Recurring,
Goals, Export, Settings, More). Chưa kiểm từng screen có dùng token nhất quán hay còn màu
hard-code. Cần rà chọn mẫu ở loop sau.

### 2.2 Vận hành / bug (chưa chạy được critique agent do giới hạn credit)

**[D-03] (CẦN KIỂM CHỨNG) Rủi ro user-scope khi thao tác theo ID.**
`chapter4.tex` mục Hạn chế tự nêu: "một số thao tác theo ID chưa luôn kèm điều kiện user".
Đây là mầm bug/bảo mật khi nâng multi-user. Ở mức prototype default_user thì chấp nhận, nhưng
nên đánh dấu rõ trong phần Hạn chế (đã có) — không phải lỗi chặn ở niên luận cơ sở.

---

## PHẦN 3 — TÌNH TRẠNG QUY TRÌNH LOOP (phát hiện phụ)

**[P-01] Artifact loop trước bị thiếu.** Git có commit `loop1` (×4) và `loop2` nhưng
`loop/loop1/` rỗng và `loop/loop2/` chưa tồn tại. Các vòng trước đã sửa code/LaTeX nhưng
không lưu báo cáo lỗi theo yêu cầu Bước 2. Từ loop này trở đi mỗi vòng phải để lại `report.md`.

---

## XẾP HẠNG MỨC ĐỘ & DANH SÁCH BẮT BUỘC SỬA (Bước 3)

Bắt buộc để đạt điểm tốt (ưu tiên giảm dần):
1. **L-04** — Restyle 11 sơ đồ còn lại theo palette + đường thẳng, không chồng chéo. (cao nhất)
2. **L-01** — [ĐÃ SỬA loop1] Làm rõ hai chỉ số parser trong abstract (vi+en+Report.md). Build vi/en OK.
3. **L-02** — Giảm mật độ số trong abstract, đưa về ~180 từ mạch lạc.
4. **L-05** — Sinh lại 3 sequence diagram bằng seqlayout.py.
5. **L-06 / L-07** — Xác minh đồng bộ vi↔en và Report.md phần 3.2→ch4.

Đã xác minh KHÔNG phải lỗi: **L-03** (18 bảng vật lý — đúng).

Chấp nhận ở mức niên luận cơ sở (không sửa gấp): D-03 (đã khai báo ở Hạn chế),
D-02 (rà ở loop sau).

## Ghi chú thực thi
- Đồng bộ đa ngôn ngữ: mọi sửa LaTeX làm song song vi + en.
- Sau khi sửa + build, cập nhật `resource/Report.md` cho khớp.
- Mỗi sơ đồ: ghi .drawio vào cả 2 dir nguồn, render pdf/png/svg vào cả 2 dir rendered, vision-check.

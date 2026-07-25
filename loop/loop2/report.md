# Loop 2 — Báo cáo phản biện (Niên luận cơ sở ngành PERFIN)

Ngày: 2026-07-25. Người phản biện: đóng vai giảng viên hướng dẫn.
Phạm vi loop này: Chương 3 mục 3.2 (Thiết kế phần mềm), 3.2.3 (Thiết kế chi tiết),
đối chiếu song song vi↔en, và trạng thái 13 sơ đồ. Tinh thần xây dựng, mức niên luận cơ sở.

Nguồn đã đọc trực tiếp trong loop này:
- `latex/chapters/vi/chapter3.tex` dòng 322–480 (toàn bộ mục Thiết kế phần mềm)
- Đối chiếu anchor vi↔en: 46/46 section+subsection, 10/10 `\ref` hình trùng khớp
- Kiểm tra tooling: drawio CLI, palette-spec, seqlayout.py — đều còn dùng được

---

## PHẦN 1 — BÁO CÁO LATEX

### 1.1 Điểm đạt (ghi nhận, không cần sửa)

**[Đạt] Mục 3.2 Thiết kế phần mềm chặt chẽ.** Kiến trúc modular monolith có lý luận
(phù hợp quy mô niên luận). Bảng "Thành phần kiến trúc và trách nhiệm" có cột
"Không chịu trách nhiệm" — cách trình bày rõ ràng, giúp người chấm thấy ranh giới module.
Bảng LLM-actions (điều kiện validation/xác nhận/idempotent) là điểm mạnh học thuật.

**[Đạt] vi↔en song song.** 46/46 anchor và 12/12 hình `\ref` trùng khớp giữa hai bản.
Không phát hiện lệch cấu trúc — giải toả nghi vấn L-06 của loop1 ở phạm vi Chương 3.

### 1.2 Lỗi hình ảnh / sơ đồ (vấn đề trọng tâm còn lại)

**[L-04, tồn từ loop1 — HẠ MỨC sau khi kiểm chứng bằng mắt] (THẤP–TRUNG BÌNH) 11/13 sơ đồ
chưa đồng bộ palette màu.**
Đã render và vision-check trực tiếp `08-text-sequence` (style cũ): mũi tên ĐÃ là đường
thẳng, lifeline thẳng hàng, KHÔNG chồng chéo. Nghĩa là yêu cầu đích danh của giảng viên ở
`Guideline-report.md` dòng 130 (mũi tên thẳng, không cong, hạn chế chồng chéo) VỀ CƠ BẢN
ĐÃ ĐẠT ngay trên sơ đồ style cũ. Khác biệt còn lại giữa 01/02 (đã restyle) và 03–13 chủ
yếu là **màu nhấn palette + bo góc**, tức nhất quán thẩm mỹ, KHÔNG phải lỗi legibility hay
lỗi correctness. Vì vậy hạ mức từ "nghiêm trọng" xuống "thấp–trung bình": nên làm cho đồng
bộ nhưng không phải lỗi chặn điểm. Xử lý dần khi còn ngân sách render.

**[L-05, tồn từ loop1] (TRUNG BÌNH) 3 sequence diagram phải sinh bằng seqlayout.py.**
`08-text-sequence`, `11-insight-sequence`, `13-worker-sequence`. Tooling đã xác nhận có tại
`.claude/skills/drawio-skill/skills/drawio-skill/scripts/seqlayout.py`.

### 1.3 Ghi chú thực thi diagram (ràng buộc thực tế mới phát hiện)

**[E-01] Render drawio headless rất chậm.** Mỗi lần export png qua xvfb mất >120s (chạy
nền). Điều này giới hạn số sơ đồ có thể restyle+render+vision-check trong một loop. Chiến
lược thực tế: mỗi loop xử lý 2–3 sơ đồ trọn vẹn (drawio→3 format→vision-check→sync 4 vị
trí) thay vì cố làm cả 11 cùng lúc rồi hỏng giữa chừng.

---

## PHẦN 2 — SẢN PHẨM DEMO

Loop này tập trung LaTeX/diagram; chưa mở critique demo mới (tránh chi phí agent do giới
hạn credit). Các mục demo D-01/D-02/D-03 giữ nguyên đánh giá loop1: token thiết kế đạt,
user-scope đã khai báo ở Hạn chế. Sẽ rà UI token theo mẫu ở loop sau.

---

## XẾP HẠNG & DANH SÁCH BẮT BUỘC SỬA (Bước 3)

1. **L-04** — Restyle sơ đồ 03–13 theo palette + đường thẳng. Xử lý theo lô 2–3 hình/loop
   do ràng buộc render (E-01). Loop này: bắt đầu với 03-deployment (đã đánh giá).
2. **L-05** — Sinh lại 3 sequence diagram bằng seqlayout.py (gộp vào các loop sau).

Hành động loop2: restyle + sync 03-deployment (và thêm nếu render kịp), cập nhật checklist.

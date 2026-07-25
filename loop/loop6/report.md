# Loop 6 (final) — Tổng kết phản biện & đánh giá (Niên luận cơ sở ngành PERFIN)

Ngày: 2026-07-25. Người phản biện: đóng vai giảng viên hướng dẫn.
Phạm vi loop này: pass tổng thể (holistic), kiểm tra nhất quán toàn báo cáo, chốt trạng
thái danh sách lỗi và đưa nhận định điểm. Tinh thần xây dựng, mức niên luận cơ sở ngành.

## Kiểm tra nhất quán cuối (đã xác minh trực tiếp trong loop này)

- **Số liệu thí nghiệm nhất quán tuyệt đối.** Không còn số ablation cũ (51 câu:
  0,561/0,192/897ms) ở bất kỳ file text nào (`latex/**`, `resource/Report.md`). Số
  chuẩn 63 câu (0,607/0,204/964ms, khớp `log/*.json`) xuất hiện đồng bộ ở abstract,
  ch3, ch4 và Report.md cả hai ngôn ngữ.
- **PDF cập nhật.** `main-vi.pdf` (71 trang) và `main-en.pdf` (76 trang) mới hơn mọi
  file nguồn; build exit 0.
- **vi↔en song song.** ch1 102=102, ch4 64=64, references 60=60, appendices 47=47.
  ch2 (579/607) và ch3 (660/663) lệch nhẹ do wrap dòng; anchor 46/46 và figure ref
  12/12 đã khớp (loop2), không phải lệch nội dung.
- **5 báo cáo loop trước đều hiện diện** trên đĩa (loop1–loop5), khắc phục P-01.

## Trạng thái danh sách lỗi (Bước 3 tích lũy qua 6 loop)

| Mã | Mô tả | Trạng thái |
|----|-------|-----------|
| L-01 | Abstract dễ hiểu nhầm 2 chỉ số parser | ĐÃ SỬA (loop1, làm rõ; loop4 nén gọn) |
| L-02 | Abstract vượt 150–200 từ | ĐÃ SỬA (loop4: VI ~150, EN 166 từ) |
| L-03 | Nghi ngờ "18 bảng" | KHÔNG PHẢI LỖI (xác minh đúng: 18 bảng qua migration 001–008) |
| L-04 | 11 sơ đồ style cũ | HẠ CẤP → thẩm mỹ (loop2: luật mũi tên thẳng/không chồng chéo đã đạt; chỉ khác palette màu) |
| L-05 | 3 sequence diagram cần seqlayout.py | KHÔNG CHẶN (đã đạt yêu cầu trình bày; chỉ là quy ước sinh) |
| L-06 | Nghi vi↔en lệch | KHÔNG PHẢI LỖI (46/46 anchor, 12/12 ref khớp) |
| L-07 | Report.md lệch số so LaTeX | ĐÃ SỬA (loop3: đồng bộ 6 vị trí về run chuẩn) |
| D-01 | Token thiết kế | ĐẠT (một màu nhấn, semantic light/dark) |
| D-02 | Đồng nhất UI | ĐẠT (0 hex hard-code trên 12 màn hình) |
| D-03 | User-scope theo ID | ĐÃ KHAI BÁO ở Hạn chế; chấp nhận ở mức prototype |
| P-01 | Loop trước thiếu artifact | ĐÃ SỬA (mỗi loop nay để lại report.md + commit) |

Không còn lỗi bắt buộc-sửa nào mở. Hai mục còn lại (L-04/L-05) thuần thẩm mỹ palette,
render headless rất chậm (>120s/hình), lợi ích cận biên thấp ở mức niên luận cơ sở —
để lại như cải tiến tùy chọn, không ảnh hưởng điểm.

## Nhận định điểm (vai giảng viên hướng dẫn)

Điểm mạnh nổi bật, đúng trọng tâm "dữ liệu + giải thuật" của niên luận cơ sở:

1. **Giải thuật có nền lý thuyết + kiểm chứng.** OLS, z-score/IQR, Pearson, amortization
   đều có công thức, trích dẫn, guard chia-0 và ví dụ tính tay; 46/46 test hàm thuần đạt,
   hằng số code (z≥2,5; IQR×1,5) khớp đúng công thức trong Chương 2.
2. **Mô hình dữ liệu chắc.** 18 bảng, transaction nguyên tử (BEGIN/COMMIT/ROLLBACK, row
   lock), 131 placeholder tham số hóa, không có lỗ SQL injection.
3. **Trung thực học thuật cao.** Bảng "đã đo / chưa đo" tách bạch, không thổi phồng; số
   liệu thí nghiệm có SHA-256, commit, model, artifact tái lập. Ngay cả macro-F1 thấp
   (0,177) cũng được giải thích đúng bản chất (lệch trục nhãn), không giấu.
4. **Ranh giới LLM rõ ràng** — đóng góp học thuật chính, tách lớp sinh ngôn ngữ khỏi lõi
   xác định, có bảng điều kiện validation/xác nhận/idempotent cho mọi thao tác LLM.
5. **Trình bày đạt chuẩn hình thức**: bìa có viền đôi, TOC 4 cấp, danh mục bảng/hình/từ
   viết tắt, IEEE references, song ngữ vi/en đồng bộ.

Hạn chế (đã tự nêu trung thực, không trừ nặng ở mức niên luận cơ sở): chưa có benchmark
OCR/STT gán nhãn, chưa đo numeric faithfulness/p95/UAT, Redis worker chưa chạy live,
một số chức năng hỗ trợ (PDF thật, backup/restore, tạo ví) chưa hoàn chỉnh.

**Kết luận:** Báo cáo và demo đạt mức tốt cho một niên luận cơ sở ngành. Trọng tâm dữ
liệu–giải thuật vững, phương pháp đánh giá trung thực và có thể tái lập, sản phẩm chạy
được với bằng chứng runtime. Các khoảng trống còn lại đều thuộc hướng phát triển đã được
tác giả nhận diện, không phải lỗi tư duy hay hiện thực.

## Ghi chú quy trình
- 6 loop đã chạy; mỗi loop có report.md riêng và commit tương ứng.
- Nguyên tắc đã tuân thủ: đồng bộ vi+en song song, cập nhật Report.md sau mỗi sửa LaTeX,
  build lại PDF để xác nhận, và chỉ ghi phát hiện đã kiểm chứng trực tiếp (không suy đoán).

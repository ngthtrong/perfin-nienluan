# loop14 — ch3 SRS/FR-NFR completeness & traceability

Ngày: 2026-07-25. Trọng tâm: tính đầy đủ của đặc tả FR/NFR trong chương 3 và
chuỗi truy vết FR → công thức → test → artifact mà NFR-09 tự cam kết.

## Kết quả kiểm tra (PASS)

| Hạng mục | Kết quả |
|---|---|
| FR codes | FR-01…FR-12, đủ 12, không trùng/thiếu, song song vi/en |
| NFR codes | NFR-01…NFR-10, đủ 10, song song vi/en |
| Test case | 48 mã `TC-FRxx-yy`, phủ cả 12 FR, không có lỗ số thứ tự |
| TC vi vs en | Tập mã **giống hệt** (48 = 48) |
| Ngưỡng ch2 vs code | Mọi hằng số khớp mã nguồn (đã đối chiếu ở loop13) |
| Nhãn trạng thái | `\statusmeasured` / `\statusmissing` dùng đúng, không suy diễn |

48 mã TC là **định danh ở mức đặc tả** theo tinh thần IEEE 830, không phải
tuyên bố đã tự động hoá — chương 3 nói rõ điều này ở đầu mục. Không có
overclaim: bảng kết quả tách riêng phần `Đã đo` (có log) và `Chưa đo`.

## Defect đã sửa

### L-19 — 15 tham chiếu mục được hard-code thay vì dùng `\ref`

Chương 3 và 4 trích dẫn công thức chương 2 bằng **số mục viết cứng**
("mục 2.2.1", "Sections~2.3.1--2.3.5", "mục 3.3.2"), không qua `\label`/`\ref`.

- Số hiện tại **đều đúng** — đây là lỗi về độ bền, không phải lỗi nội dung.
- Nhưng NFR-09 tự cam kết chuỗi truy vết "FR → công thức → test → artifact";
  chèn thêm một `\subsection` vào chương 2 sẽ làm cả 15 tham chiếu sai âm thầm,
  vì LaTeX không kiểm được số viết cứng.

Đã sửa: thêm 28 `\label` cho mọi section/subsection chương 2 + 2 nhãn nội
chương (`subsec:results`, dùng lại `sec:testing` từ loop11), rồi chuyển toàn bộ
15 tham chiếu mỗi ngôn ngữ sang `\ref`. Khoảng "2.3.1--2.3.5" thành
`\ref{subsec:ols-trend}--\ref{subsec:correlation}` (cả hai đầu đều động).

Đối chiếu sau khi build: 14/15 nhãn resolve ra **đúng số cũ** (2.1.1, 2.2.1,
2.2.2, 2.2.4, 2.3.1, 2.3.4, 2.3.5, 2.3.6, 2.3.7, 2.4.2, 2.4.3, 2.5.2, 2.1, 3.3),
`subsec:results` → 3.3.2. Không đổi một chữ nội dung nào.

### Phát hiện phụ — thiếu parity một cross-ref ở chương 4

EN ch4 dẫn `Section~\ref{subsec:results}` khi nêu ba thí nghiệm; VI không có.
Đã thêm để hai bản song song (ref count vi/en: 16/16 ở ch3, 2/2 ở ch4).

## Tự sửa lỗi trong loop này

Giữa loop tôi từng kết luận "4/9 mục công thức được cross-ref, 5/9 không" —
sai, do grep ghép số dòng của nhiều tệp. Thực tế **không có `\ref` nào**;
toàn bộ là số viết cứng. Phát hiện thật là tính dễ vỡ, không phải tính
không nhất quán. Đã ghi lại đây thay vì bỏ qua.

## Verify

- `make vi en` (force rebuild): exit 0, **0 undefined reference**, 0 dấu `??`
  trong cả hai log, 0 rerun warning.
- Overfull: vi 2 (đều là 1,9pt tồn từ trước — dưới ngưỡng nhìn thấy), en 0.
- Parity: section 20, subsection 36, subsubsection 33, label 57, ref 50,
  cite 21, caption 23 — **giống hệt** giữa vi và en.
- LoF 13 hình, LoT 23 bảng ở cả hai bản; 13/13 pdf sơ đồ có mặt.
- `resource/Report.md`: 17 tham chiếu "mục N.N" đều trỏ tới heading có thật
  (Markdown không có cơ chế `\ref` nên viết cứng là đúng ở đó).
- Backend: 182/182 test pass, 0 fail.

## Đánh giá

Cấu trúc SRS của chương 3 vững: FR/NFR/TC đủ, song song hai ngôn ngữ, không
overclaim mã TC thành kết quả đã chạy. Lỗi duy nhất là cơ chế tham chiếu dễ vỡ
— đã chuyển sang `\ref` để chính LaTeX bảo vệ chuỗi truy vết mà NFR-09 hứa.

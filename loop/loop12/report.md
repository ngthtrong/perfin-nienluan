# Loop 12 — Chất lượng & tính cần thiết của 13 sơ đồ

## Phạm vi lop này

**Vùng kiểm mới:** chất lượng và tính cần thiết của 13 sơ đồ (Bước 0.3) — vùng
này chưa từng được kiểm trực tiếp: loop2 chỉ xem 08-text-sequence, loop6 tự
biện minh bỏ qua bằng lý do sai (>120s/hình), loop7 chỉ sửa font chứ không xét
hình học đường nối hay tính cần thiết.

**Bỏ qua và vì sao:** không kiểm lại heading colors (loop7), abstract (loop4),
IEEE refs (loop4), backend logic/SQL injection (loop5), IDOR (loop11),
skeleton/a11y (loop9/loop10).

## Phần 1 — Báo cáo LaTeX

### ĐẠT — không cần tạo thêm sơ đồ nào

Kiểm trực tiếp, kết luận **13 sơ đồ hiện có là đủ**:

- 13 tệp `.drawio` ↔ 13 bộ `rendered/` (pdf+png+svg) ↔ 13 `\label` mỗi bản ngữ.
- Đánh số liên tục 1..13 trong cả `main-vi.lof` và `main-en.lof` (Guideline
  dòng 49 — "Number illustrations sequentially").
- **Không có sơ đồ THỪA**: cả 13 đều được `\ref` ít nhất một lần ở cả hai bản.
- **Không có khẳng định nào thiếu hình hỗ trợ**: mỗi hình đều có đoạn diễn giải
  ngay sau (Guideline dòng 92 — "Accompany each diagram with a short
  explanation"). Không đề xuất tạo mới.

### L-15 (mức 4) — hai hình không được gọi tên trong đoạn diễn giải

Bằng chứng: 11/13 hình được đoạn văn kế bên gọi bằng số ("Trong
Hình~\ref{fig:insight-sequence}, model SQL truy xuất..."), riêng
`fig:feedback-flow` (Hình 10) và `fig:worker-sequence` (Hình 13) có
`body-ref=0` — chỉ được `\ref` từ bảng phụ lục
[appendices.tex:25](latex/chapters/vi/appendices.tex#L25) và
[appendices.tex:28](latex/chapters/vi/appendices.tex#L28).

Đoạn diễn giải vẫn tồn tại nên không vi phạm Guideline dòng 92; đây là lỗi nhất
quán diễn đạt. Đã sửa: thêm "Hình~\ref{...}" vào câu mở đoạn của cả hai, song
ngữ. Số `\ref` vi/en: 31 → 33.

### L-16 (mức 1) — 36 đường nối bo góc, vi phạm Guideline dòng 130

Đây là phát hiện đáng kể nhất của lop này, và nó **đảo một phần kết luận
loop2**.

Guideline dòng 130 yêu cầu: *"Sơ đồ phải sử dụng mũi tên liên kết dạng đường
thẳng chứ không phải đường cong như hiện tại"*. loop2 kiểm `curved=1` (0 hit
trên cả 13 tệp) rồi hạ L-04 xuống mức thẩm mỹ. Nhưng `curved` không phải thuộc
tính duy nhất tạo đường không thẳng trong drawio:

```
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;...
```

`rounded=1` **trên edge** làm bo tròn các góc gấp của đường nối. Đếm chính xác
(phân biệt edge vs vertex, vì `rounded=1` trên vertex chỉ là hộp bo góc và hoàn
toàn hợp lệ):

| Tệp | edges rounded=1 | vertices rounded=1 |
|---|---|---|
| 01-system-context | **5** | 9 |
| 02-runtime-architecture | **11** | 8 |
| 10-feedback-flow | **20** | 1 |
| 10 tệp còn lại | 0 | 0–2 |

Tổng 36 edge bo góc trên 3 tệp. Đã sửa: đặt `rounded=0` cho đúng các edge đó
(không đụng vertex — hộp bo góc là ngôn ngữ thị giác của bộ hình, giữ nguyên).
XML sau sửa vẫn well-formed cả 13 tệp; toàn bộ 13 tệp giờ có
`edges_rounded=0`.

Re-render 3 hình × 3 định dạng = 9 output, tất cả exit 0. Kiểm chất lượng:
`pdfimages -list` → `images=0` (vẫn vector thật, không bị rasterize);
SVG well-formed. Chi phí thực đo: ~2,4s/định dạng — xác nhận lại rằng lý do
">120s/hình" của loop6 là sai và không được dùng để né việc sửa hình.

### L-17 (mức 2, tự gây ở loop11) — bảng IDOR tràn lề 81pt

Sau khi thêm `tab:idor-verification` ở loop11, build sinh overfull hbox mới:
VI 5, EN 2 (trước đó cả hai = 0). Nguyên nhân: `\code{}` dùng
`\detokenize` nên chuỗi `/api/recurring/:id/pause|resume|pay` không có điểm
ngắt dòng nào, tràn 81,49pt ≈ 2,9cm ra ngoài lề.

Đã sửa: tách ô thành `\code{POST} tới \code{:id/pause}, \code{:id/resume},
\code{:id/pay}` (nhiều `\code` ngắn → có khoảng trắng để ngắt), và thêm câu nêu
rõ base path để dạng viết tắt không mơ hồ. Cũng sửa một cụm
"authentication/authorization" (46pt) thành "xác thực và phân quyền".

Kết quả: EN 2 → **0**; VI 5 → **2**, và 2 ca còn lại là hai ca 1,9pt/1,88pt
(≈0,07mm) đã tồn tại từ trước loop12, dưới ngưỡng nhận biết bằng mắt.

## Phần 2 — Demo

Không kiểm mới ở lop này (đã dành cho hình). Không sửa code demo.

## Đã kiểm và ĐẠT (lop sau không cần lặp lại)

- 13/13 sơ đồ có nguồn `.drawio` + 3 định dạng render + label song ngữ.
- Đánh số hình liên tục 1..13 ở cả hai bản (Guideline dòng 49).
- Không có hình thừa, không có hình thiếu → **không đề xuất tạo sơ đồ mới**.
- Mỗi hình có đoạn diễn giải kèm theo (Guideline dòng 92).
- `curved=1`: 0/13 tệp. Sau L-16, `rounded=1` trên edge: 0/13 tệp
  → Guideline dòng 130 đạt đầy đủ (không cong, không bo góc).
- 13 hình PDF đều `images=0` (vector thật, không rasterize).

## Bảng mức độ + danh sách chốt

| Mã | Mô tả | Mức | Quyết định |
|---|---|---|---|
| L-16 | 36 edge `rounded=1` bo góc trên 3 sơ đồ, vi phạm Guideline dòng 130 | 1 | **ĐÃ SỬA** + re-render 9 output |
| L-17 | Bảng IDOR (thêm ở loop11) tràn lề 81pt | 2 | **ĐÃ SỬA** (EN về 0 overfull) |
| L-15 | Hình 10 và 13 không được gọi số trong đoạn diễn giải | 4 | **ĐÃ SỬA** song ngữ |
| — | Tạo sơ đồ mới | — | **GIỮ NGUYÊN**: 13 hình đã phủ hết khẳng định trong văn bản; thêm hình chỉ làm loãng |
| — | Đổi palette 13 hình | 5 | **GIỮ NGUYÊN**: thuần thẩm mỹ, bộ màu hiện tại đã nhất quán và có chú giải trong `figures/README.md` |
| L-04/L-05 | Palette sơ đồ (từ loop2) | 5 | **GIỮ NGUYÊN** — nhưng phần "đường nối" của L-04 nay đã đóng bằng L-16 |

## Kết quả thực thi

**Sửa nguồn sơ đồ:**
```
01-system-context.drawio: 5 edges set rounded=0
02-runtime-architecture.drawio: 11 edges set rounded=0
10-feedback-flow.drawio: 20 edges set rounded=0
all remaining files: edges_rounded=0, xml valid
```

**Re-render (9 output, tất cả exit 0), kiểm chất lượng:**
```
01-system-context.pdf   images=0    02-runtime-architecture.pdf  images=0
10-feedback-flow.pdf    images=0    (cả 3 SVG well-formed)
```

**Build cuối (buộc re-embed bằng cách xoá PDF — bẫy Makefile loop7):**
```
exit=0
main-vi overfull=2 undef=0 figs=26 (13 distinct)  ← 2 ca 1,9pt tồn tại từ trước
main-en overfull=0 undef=0 figs=26 (13 distinct)
main-vi: 7 warnings   main-en: 7 warnings
```

**Đối chiếu song ngữ — khớp tuyệt đối:**
```
vi: section=20 subsection=36 subsubsection=33 label=28 ref=33 cite=17 caption=23
en: section=20 subsection=36 subsubsection=33 label=28 ref=33 cite=17 caption=23
main-vi lot=23 lof=13    main-en lot=23 lof=13
```
`ref` 31→33 do L-15 thêm 2 cross-ref mỗi bản ngữ. Không có tệp nguồn nào mới
hơn PDF.

**Đồng bộ tài liệu:** L-16 và L-17 là thay đổi thuần trình bày (hình học đường
nối, ngắt dòng trong bảng); L-15 chỉ thêm cụm "Hình~N" dẫn chiếu. Không đổi số
liệu hay khẳng định → **không phát sinh lệch cần đồng bộ** sang
`resource/Report.md`.

**Không chạm backend/frontend** ở lop này nên không chạy lại test; trạng thái
loop11 vẫn giữ (182/182 backend, UI smoke PASS).

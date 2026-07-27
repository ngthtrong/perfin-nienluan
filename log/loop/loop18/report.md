# Loop 18 — Chất lượng & tính cần thiết của 13 sơ đồ (vùng kiểm mới)

## Phạm vi lop này

**Vùng kiểm mới (chưa từng kiểm trực tiếp):** *chất lượng & tính cần thiết của 13 sơ đồ* —
nhưng kiểm ở tầng **artifact thực sự được nhúng vào PDF**, không chỉ đọc file nguồn
`.drawio`. Đây là điểm khác biệt so với loop1/loop2/loop4/loop16, các loop đó chỉ đọc XML
nguồn hoặc xem PNG đã commit mà không đối chiếu mtime giữa hai bên.

**Bỏ qua:** ch1/ch2/ch4, abstract, bìa/TOC, references IEEE, backend logic, bảo mật, a11y —
đã kiểm ở các loop trước và không có bằng chứng mới cho thấy kết luận cũ sai.

**Không chạm demo** trong lop này (không phát sinh sửa code frontend/backend), nên không
chạy `npm test` / `ui:smoke`.

---

## Phần 1 — Báo cáo LaTeX

### L-22 (mức 2) — 7/13 sơ đồ nhúng bản render LỖI THỜI; đảo một phần kết luận L-04 của loop2

Đây là phát hiện gốc của lop này. Nguồn `.drawio` đã được sửa đúng, nhưng bản render
được commit và **được LaTeX nhúng vào PDF** lại là bản cũ hơn nguồn.

Bằng chứng (mtime thực, đo bằng lệnh đã chạy):

```
diagram                            src mtime    status
03-deployment                      07-25 20:14  png:STALE  pdf:STALE  svg:STALE
04-domain-class                    07-25 20:14  png:STALE  pdf:STALE  svg:STALE
05-physical-erd                    07-25 20:14  png:STALE  pdf:STALE  svg:STALE
06-llm-boundary                    07-25 20:14  png:STALE  pdf:STALE  svg:STALE
07-conversation-state              07-25 20:14  png:STALE  pdf:STALE  svg:STALE
09-multimodal-flow                 07-25 20:14  png:STALE  pdf:STALE  svg:STALE
12-goal-flow                       07-25 20:14  png:STALE  pdf:STALE  svg:STALE

STALE-or-missing diagrams: 7 of 13
```

Nguồn sửa lúc `20:14`, render commit lúc `12:49` — trễ hơn 7 giờ 25 phút.

Triệu chứng quan sát được: PNG đã commit của `04-domain-class` hiển thị **đường cong**,
trong khi XML nguồn khai báo rõ `edgeStyle=orthogonalEdgeStyle;rounded=0;curved=0` trên
cả 17 edge:

```
04-domain-class.drawio               edges= 17 orthogonal= 17 DEFAULT/curvy=  0
```

Render lại từ đúng nguồn đó cho ra hình **vuông góc hoàn toàn**, cùng tỉ lệ khung
(1.669 vs 1.668 → cùng hình học, khác nội dung đường):

```
=== fresh 04 ===      3963 x 2375   md5 4aa0dbdc...
=== committed 04 ===  2000 x 1199   md5 ef6f1265...
```

Kết luận: **đường cong không phải lỗi thiết kế sơ đồ, mà là lỗi artifact lỗi thời.**
Việc này **đảo một phần** kết luận của loop2 (`L-04 DOWNGRADED to cosmetic`) — loop2 xem
PNG đã commit rồi kết luận "straight-arrow rule already met" cho toàn bộ; thực tế bản
người đọc nhìn thấy trong PDF vẫn còn cong ở 7 hình. Nguồn thì đạt, bản in thì chưa.
Guideline dòng 130 (đường thẳng, không chồng chéo) được thỏa ở nguồn nhưng **không**
được thỏa ở PDF xuất bản trước lop này.

**Đã sửa:** render lại 7 sơ đồ × 3 định dạng. Audit cuối:

```
=== FINAL STALENESS AUDIT (13 diagrams x 3 formats) ===
ALL FRESH — 13/13 diagrams, 39/39 artifacts up to date
```

### L-23 (mức 2) — Hai khẳng định SAI SỰ THẬT về sơ đồ 04 và 05, ở cả hai bản ngữ

Văn bản mô tả sơ đồ không khớp với chính sơ đồ.

Khẳng định 1 — `chapters/{vi,en}/chapter3.tex:363`: "Hộp User được **lặp** làm neo bố
cục" / "The User box is **repeated** as a layout anchor".
Đếm thực tế trên `04-domain-class.drawio`: **đúng 1** hộp `User` trong 12 class.

```
   1 x <b>User</b>
   1 x <b>UserTrait</b>
```

Khẳng định 2 — `chapters/{vi,en}/chapter3.tex:369`: "Một bảng `users` được **lặp thành
bốn neo tham chiếu**" / "repeated as **four** reference anchors".
Đếm thực tế trên `05-physical-erd.drawio`: 18 bảng, mỗi bảng **đúng 1 lần**.

```
=== table vertices in 05 (count=18) ===
   1 x USERS
   1 x USER_TRAITS
   ... (mỗi bảng đúng 1 x)
USERS-ish tables: ['USERS', 'USER_TRAITS']
```

Con số **18 bảng là ĐÚNG** (khớp loop1 L-03), chỉ phần "lặp thành bốn neo" là bịa.
Nếu hội đồng đếm hộp trên hình sẽ không tìm thấy bốn `users` nào — đây là loại lỗi mất
điểm tin cậy nặng hơn giá trị chữ nghĩa của nó.

**Đã sửa** ở cả `vi` + `en` + `resource/Report.md`, diễn đạt lại theo đúng hình:
- 04: "Thực thể User được vẽ một lần duy nhất và là gốc sở hữu của cả bốn aggregate; …
  đều định tuyến vuông góc."
- 05: "Mỗi bảng xuất hiện đúng một lần, kể cả `users`; FK chéo mô-đun được ghi trong hộp
  bảng con thay vì kéo đường dài."

### L-24 (mức 2) — TOÀN BỘ 14 liên kết hình trong `resource/Report.md` bị vỡ

`resource/Report.md` là bản mirror Markdown mà Bước 4 của quy trình bắt buộc giữ đồng bộ.
Mọi liên kết hình trong đó trỏ tới `../../archive/latex/figures/rendered/` — thư mục
`archive/` **không tồn tại**, và đường dẫn còn thoát ra ngoài gốc repo:

```
total image links in Report.md: 14
  OK     : 0
  BROKEN : 14

broken by directory prefix:
    13 x ../../archive/latex/figures/rendered
     1 x ../../archive/latex/images
```

Hệ quả: mở `resource/Report.md` trên GitHub hay bất kỳ trình xem Markdown nào đều thấy
14 ảnh lỗi. Ảnh thật vẫn nằm nguyên ở `latex/figures/rendered/` (đủ 13 PNG) và
`latex/images/ctu_logo.png`.

**Đã sửa:** trỏ lại `../latex/figures/rendered` và `../latex/images`, cùng một câu prose
ở Phụ lục A (dòng 1287) cũng ghi sai hai đường dẫn `archive/`. Kết quả:

```
image links=14  OK=14  BROKEN=0
```

### Về câu hỏi "13 sơ đồ đã đủ chưa?"

**Đủ.** Không đề xuất tạo sơ đồ mới. Mỗi hình đều có `\ref` neo vào một khẳng định cụ thể
trong văn bản (8 `widereportfigure` + 13 `reportfigure`, khớp vi/en), và không tìm thấy
khẳng định nào trong ch2/ch3 bị "treo" mà thiếu hình hỗ trợ. Cũng không có hình THỪA:
cả 13 đều được tham chiếu, có mô tả trong Phụ lục A.

### Tồn đọng thẩm mỹ (mức 5, GIỮ NGUYÊN)

Trên `05-physical-erd`, vài nhãn edge ở dải trên chồng lên nhau khi render ở khổ rộng:
`cactive_fon` (chồng "active" + "config"), `signatonverses`, `scheduleedabled`. Đọc được
tên bảng, PK/FK/UK đầy đủ; chỉ nhãn quan hệ bị dính. Đây là hệ quả layout tự động từ
Mermaid (`mermaidId`/`mermaidBaseStyle` còn trong XML), sửa tay 33 edge chi phí cao,
lợi ích cận biên thấp — đúng giới hạn vận hành "không render lại hàng loạt chỉ để đổi màu".

---

## Phần 2 — Demo

Không kiểm mới trong lop này và **không phát sinh sửa** — lop dành cho vùng sơ đồ.
Các vùng demo (UI/UX token, a11y, trạng thái rỗng/lỗi, bảo mật, giao dịch backend) đã
được kiểm ở loop 9–17; không có bằng chứng mới cho thấy kết luận cũ sai.

---

## Đã kiểm và ĐẠT (lop sau không cần kiểm lại)

- **Độ tươi artifact:** 13/13 sơ đồ, 39/39 tệp (pdf+png+svg) mới hơn nguồn `.drawio`.
- **Định tuyến edge:** 10/13 sơ đồ khai báo `orthogonalEdgeStyle` trên 100% edge; 3 sơ đồ
  sequence (08, 11, 13) dùng đường mặc định — đúng bản chất sequence diagram, không phải lỗi.
- **Đếm bảng ERD:** 18 bảng vật lý, mỗi bảng xuất hiện đúng 1 lần. Khớp con số trong văn bản.
- **Đếm class 04:** 12 class, 1 `User` duy nhất, 17 edge.
- **Liên kết hình `resource/Report.md`:** 14/14 phân giải được tới tệp thật.
- **Tính cần thiết sơ đồ:** 13 hình đều được `\ref`, không thiếu không thừa.
- **Song ngữ:** section 20/20, subsection 36/36, subsubsection 33/33, label 56/56,
  ref 50/50, widereportfigure 8/8, reportfigure 13/13.

---

## Bảng mức độ + danh sách chốt

| mã | mô tả | mức độ | quyết định |
|---|---|---|---|
| L-22 | 7/13 sơ đồ nhúng render lỗi thời (nguồn 20:14 vs render 12:49); PDF xuất bản còn đường cong dù nguồn đã vuông góc. Đảo một phần L-04 của loop2 | 2 | **ĐÃ SỬA** — render lại 7×3 tệp, audit 39/39 fresh |
| L-23 | Hai khẳng định sai về sơ đồ ở cả vi+en: "hộp User được lặp", "`users` lặp thành bốn neo tham chiếu"; thực tế mỗi thứ đúng 1 lần | 2 | **ĐÃ SỬA** — sửa vi+en+Report.md theo đúng hình |
| L-24 | 14/14 liên kết hình trong `resource/Report.md` vỡ, trỏ `archive/` không tồn tại và thoát gốc repo | 2 | **ĐÃ SỬA** — trỏ lại `../latex/...`, 14/14 OK |
| P-02 | Không có script render nào trong repo; không có cơ chế phát hiện artifact lỗi thời → chính là nguyên nhân gốc của L-22 | 3 | **ĐÃ SỬA** — thêm `latex/figures/rerender-stale.sh` (tự audit mtime, retry, chỉ render hình lỗi thời) |
| — | Nhãn edge chồng nhau ở dải trên `05-physical-erd` (`cactive_fon`, `signatonverses`) | 5 | **GIỮ NGUYÊN** — đọc được toàn bộ bảng/khóa; sửa tay 33 edge Mermaid chi phí cao, lợi ích cận biên thấp |

---

## Kết quả thực thi

### Build

```
MAKE_EXIT=0
Output written on main-vi.pdf (80 pages).
Output written on main-en.pdf (86 pages).

=== PDF newer than all sources? ===
  main-vi.pdf: OK newer  (newest src=figures/rendered/12-goal-flow.pdf)
  main-en.pdf: OK newer  (newest src=figures/rendered/12-goal-flow.pdf)
```

### Đối chiếu song ngữ — không lệch

```
  \section{         vi= 20  en= 20
  \subsection{      vi= 36  en= 36
  \subsubsection{   vi= 33  en= 33
  \label{           vi= 56  en= 56
  \ref{             vi= 50  en= 50
  widereportfigure  vi=  8  en=  8
  reportfigure      vi= 13  en= 13
```

### Render lại 7 sơ đồ

```
ALL FRESH — 13/13 diagrams, 39/39 artifacts up to date
```

Ghi chú trung thực: `05-physical-erd.png` **thất bại 2 lần** ở `-s 2`
(`UnknownVizError` + `Failed to shutdown` — sơ đồ 466 vertex quá lớn cho renderer).
Đã render thành công ở `-s 1`, ra `4034 x 1780` px, vẫn đủ độ phân giải. PDF của hình này
(bản LaTeX thực sự nhúng) render thành công ngay lần đầu, 75067 bytes.

### Đồng bộ tài liệu

`resource/Report.md` đã cập nhật: 2 đoạn mô tả hình (L-23) + 14 liên kết + 1 câu prose
Phụ lục A (L-24). Riêng phần render lại artifact (L-22) là thay đổi thuần trình bày —
không đổi câu chữ hay số liệu, **không phát sinh lệch cần đồng bộ** ngoài các mục trên.

### Số liệu

Lop này không sửa bất kỳ số liệu định lượng nào. Con số duy nhất được kiểm chéo là
"18 bảng vật lý" — xác minh trực tiếp trên XML sơ đồ, **khớp**, giữ nguyên.

### Không chạm demo

Không sửa `demo/backend` hay `demo/frontend` → không chạy `npm test` / `ui:smoke`.

---

## Đánh giá điều kiện dừng

**Chưa đủ điều kiện dừng.** Điều kiện (c) — "hai loop liên tiếp không phát hiện lỗi mới
ngoài mức thẩm mỹ" — bị phá: loop17 tuyên bố tất cả gate xanh, nhưng lop18 tìm được
**ba lỗi mức 2** còn mở (L-22, L-23, L-24).

Bài học quy trình đáng ghi lại: cả 17 loop trước đều xác minh bằng "nguồn có đúng không"
và "build có exit 0 không". Không loop nào hỏi "**tệp được nhúng vào PDF có khớp nguồn
không**". Build vẫn exit 0 hoàn hảo với artifact lỗi thời — vì `latex/Makefile` không khai
báo `figures/rendered/*.pdf` là prerequisite, nên `make` không bao giờ biết hình đã cũ.
Đó là lý do lỗi này sống sót 17 vòng. Script `rerender-stale.sh` giờ bù được khoảng trống đó.

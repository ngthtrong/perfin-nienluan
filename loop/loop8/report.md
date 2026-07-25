# Loop 8 — Truy vết bằng chứng, mục lục 4 cấp, chương 1 & 4

## Phạm vi lop này

**Vùng kiểm mới (chưa từng kiểm trực tiếp ở loop 1–7):**

- **ch1 mục tiêu** — đối chiếu Bảng mục tiêu với Guideline dòng 65 ("specific, achievable, time-bound").
- **ch4 kết luận/hạn chế** — đối chiếu tuyên bố với bằng chứng thực tế.
- **Mục lục 4 cấp** — Guideline dòng 15 và 45.
- **Tính truy vết số liệu về `log/*.json`** — quy tắc Bước 4 của prompt.

**Bỏ qua:** sơ đồ (loop7 vừa xử lý font + xác nhận 13 hình đủ), bảo mật SQL
(loop5 đã kết luận sạch), màu tiêu đề (loop7 đã sửa L-08).

---

## Phần 1 — Báo cáo LaTeX

### P-01 (mức 2, NGHIÊM TRỌNG) — Toàn bộ thư mục bằng chứng `log/` đã bị xóa khỏi repo

Commit `c688762` xóa 12 tệp trong `log/` — chính là toàn bộ artifact mà mọi con
số "đã đo" trong báo cáo phải truy về:

```
$ git show --name-status --pretty=format: c688762 | grep '^D.log/'
D  log/ablation-parser-vs-llm_2026-07-24.json
D  log/classification-benchmark_2026-07-24.json
D  log/feedback-before-after_2026-07-24.json
D  log/Demo_Verification_2026-07-16.artifact.json
... (12 tệp)
```

Nghịch lý: cùng commit đó thêm `loop/promt-loop.md`, vốn quy định "mọi số trong
báo cáo phải truy được về `log/*.json`". Sau commit này, `ls log/` trả về
"No such file or directory" — nghĩa là **không một con số nào trong báo cáo còn
kiểm chứng được**. Đây là lỗi mức 2 (khẳng định mất bằng chứng), không phải
thẩm mỹ.

Đã phục hồi từ `c688762^`, đủ 12 tệp.

### L-11 (mức 2) — Báo cáo trích dẫn đường dẫn artifact không tồn tại

`chapters/{vi,en}/chapter3.tex:596` và `resource/Report.md:1149` ghi artifact
tái lập nằm ở `resource/report/evidence/`. Đường dẫn đó không tồn tại: commit
`d5c9eab` (loop1) đã đổi tên `resource/report/evidence/` → `log/` (R100, rename
100%), nhưng văn bản báo cáo không được cập nhật theo. Người đọc lần theo dẫn
chứng sẽ không tìm thấy gì.

### L-12 (mức 2) — Số test backend đã lỗi thời (100/100 vs thực tế 178/178)

Chạy thật:

```
$ cd demo/backend && npm test
ℹ tests 178
ℹ pass 178
ℹ fail 0
```

Báo cáo công bố "100/100" ở 6 vị trí. Số 100/100 đúng tại mốc 16/07/2026 nhưng
bộ test đã mở rộng lên 178 ca / 37 tệp sau các đợt sửa (gồm loop7 thêm test
user-scope). Công bố số cũ làm giảm chính công sức đã bỏ ra, và quan trọng hơn
là **không khớp với lệnh mà người đọc sẽ chạy lại**.

### L-13 (mức 2) — So sánh macro-F1 giữa hai tập khác nhau

Abstract (cả vi và en), ch4 §Kết quả và bảng O2 viết: "parser cục bộ đạt
macro-F1 0,177, LLM nâng lên 0,607 **trên cùng mẫu phân tầng**".

Đối chiếu artifact:

| Nguồn | Tập | parser macro-F1 |
|---|---|---|
| `log/classification-benchmark_2026-07-24.json` | 5.265 dòng (toàn tập) | **0,177** |
| `log/ablation-parser-vs-llm_2026-07-24.json` | 63 câu phân tầng | **0,204** |

0,607 của LLM đến từ tập 63 câu. Ghép nó với 0,177 của tập 5.265 dòng rồi gọi
là "cùng mẫu" là **so sánh sai tập** — và vô tình làm khoảng cách trông lớn hơn
thực tế (0,607/0,177 = 3,4× thay vì 3,0× đúng). §3.3.2.3 vốn đã trình bày đúng
(bảng ablation ghi rõ 0,204); lỗi chỉ nằm ở các chỗ tóm tắt lại.

Lưu ý: đây **không** phải đảo kết luận loop3/loop6. Loop3 sync số 63-câu vào
`Report.md`, loop6 xác nhận `0,607/0,204` khớp artifact — cả hai đều đúng ở phần
bảng chi tiết. Loop8 phát hiện phần *tóm tắt* (abstract/ch4) mới là chỗ hai tập
bị trộn.

### Đã kiểm và ĐẠT (lop sau không cần kiểm lại)

- **Mục lục 4 cấp (Guideline 15, 45): ĐẠT.** `tocdepth=3` trong
  `config/preamble.tex:87` cho đúng 4 cấp hiển thị (chapter → section →
  subsection → subsubsection). Đếm trong `.toc`: 13 chapter, 20 section,
  36 subsection, 33 subsubsection — giống nhau ở cả hai bản. 4 dòng
  `\contentsline{paragraph}` có trong tệp `.toc` nhưng bị `\@dottedtocline`
  chặn khi in, nên **không** thành cấp thứ 5. Không phải lỗi.
- **Đánh số outline (Guideline 16): ĐẠT.** `secnumdepth=3`, dạng `3.3.2`.
- **ch1 Mục tiêu (Guideline 65): ĐẠT.** 5 mục tiêu O1–O5 đều có tiêu chí
  nghiệm thu kiểm được (`chapters/vi/chapter1.tex:44-48`), và có câu chốt phân
  biệt "mục tiêu nghiệm thu" với "kết quả đã đạt" (dòng 53) — đúng tinh thần
  specific/achievable. Bản en song song.
- **ch4 §Hạn chế: ĐẠT và đáng khen.** 8 hạn chế tự nêu, trong đó mục 8 tự thừa
  nhận "một số thao tác theo ID chưa luôn kèm điều kiện user" — tự phê bình
  đúng chỗ, không tô hồng.
- **Bìa/metadata: ĐẠT.** `metadata-vi.tex` đủ 100% mục Guideline 2.1 (trường,
  khoa, loại niên luận, tên đề tài, ngành, khóa 49, lớp CT239H M01, GVHD
  TS. Phan Phương Lan, MSSV B2305615, HK3 2025–2026).
- **Độ dài abstract: vẫn ĐẠT sau khi sửa L-13.** VI 219 âm tiết-token (~156
  từ), EN 172 từ — trong khoảng 150–200 của Guideline 2.2.

### Về sơ đồ

Không đề xuất tạo hình mới. Bốn vùng kiểm của lop này (mục lục, ch1 mục tiêu,
ch4, truy vết số liệu) đều là văn bản/bảng; không có khẳng định nào thiếu hình
hỗ trợ. 13 sơ đồ hiện có là **đủ**.

---

## Phần 2 — Demo

Không kiểm mới trong lop này (đã dành cho vùng LaTeX + truy vết bằng chứng).
Chỉ chạy hồi quy: `npm test` → 178/178 pass, 0 fail. Không sửa code demo.

---

## Bước 3 — Bảng chốt danh sách sửa

| Mã | Mô tả | Mức | Quyết định |
|---|---|---|---|
| P-01 | `log/` (12 artifact bằng chứng) bị xóa khỏi repo ở commit c688762 | 2 | **SỬA NGAY** — phục hồi từ `c688762^` |
| L-11 | Báo cáo trích dẫn `resource/report/evidence/` (không tồn tại; đã rename → `log/`) | 2 | **SỬA NGAY** — sửa 3 vị trí |
| L-12 | Số test backend lỗi thời: công bố 100/100, thực tế 178/178 | 2 | **SỬA NGAY** — sửa 7 vị trí + tạo artifact mới |
| L-13 | Ghép macro-F1 0,177 (tập 5.265) với 0,607 (tập 63 câu) và gọi là "cùng mẫu" | 2 | **SỬA NGAY** — sửa 6 vị trí |
| L-04/L-05 | Palette sơ đồ 03–13 chưa đồng bộ | 5 | **GIỮ NGUYÊN** — thuần thẩm mỹ; đã hạ cấp ở loop2; re-render 13 hình chỉ để đổi màu không đổi tính đọc được |

---

## Bước 4 — Kết quả thực thi và xác minh

### Đã sửa

**P-01** — `git checkout c688762^ -- log/`, phục hồi 12 tệp
(3 experiment JSON + 3 Markdown + verification artifact/html/md + stabilization
log + system status + change log).

**L-11** — sửa `resource/report/evidence/` → `log/` tại:
`chapters/vi/chapter3.tex:596`, `chapters/en/chapter3.tex:596`,
`resource/Report.md:1149`.

**L-12** — tạo artifact mới `log/backend-test-run_2026-07-25.json` (ghi rõ
commit, Node v24.16.0, lệnh, 178/178, và trường `supersedes` giải thích quan hệ
với mốc 100/100 cũ). Cập nhật 7 vị trí, giữ mốc lịch sử thay vì xóa:
`chapters/{vi,en}/chapter3.tex:550`, `chapters/{vi,en}/chapter4.tex:18`,
`chapters/{vi,en}/chapter4.tex:25`, `resource/Report.md:28,1099,1107`,
`latex/README.md:54`.

**L-13** — diễn đạt lại để mỗi con số gắn với tập của nó, ở
`frontmatter/{vi,en}/abstract.tex`, `chapters/{vi,en}/chapter4.tex` (bảng O2 +
đoạn §Kết quả), `resource/Report.md:1219`. Bản vi mới:
"parser cục bộ đạt macro-F1 0,177 trên toàn bộ 5.265 dòng; trong ablation trên
mẫu phân tầng 63 câu, LLM đạt 0,607 so với 0,204 của parser trên *cùng mẫu*
(khoảng 3,0×)".

### Xác minh

```
$ cd latex && rm -f main-vi.pdf main-en.pdf && make
exit=0
Output written on main-vi.pdf (79 pages).
Output written on main-en.pdf (80 pages).

$ touch config/preamble.tex && make          # pass 2, ổn định TOC
exit=0
main-vi: overfull-hbox=0  undefined-ref=0
main-en: overfull-hbox=0  undefined-ref=0
```

Cả hai PDF mới hơn mọi tệp nguồn (19:52:53 / 19:53:03 vs nguồn 19:50:41).
13 sơ đồ được nhúng ở cả hai bản (26 lần gọi = 13 hình × 2 lượt xử lý).

Đối chiếu song ngữ — **khớp tuyệt đối**:

| | section | subsection | subsubsection | label | ref | cite |
|---|---|---|---|---|---|---|
| vi | 20 | 36 | 33 | 26 | 29 | 17 |
| en | 20 | 36 | 33 | 26 | 29 | 17 |

Backend (không chạm code, chạy để chắc không hồi quy):

```
$ cd demo/backend && npm test
ℹ tests 178   ℹ pass 178   ℹ fail 0   ℹ duration_ms 2220
```

Không chạm frontend nên không chạy `ui:smoke`.

### Đồng bộ tài liệu

`resource/Report.md` đã cập nhật khớp LaTeX ở cả 3 nhóm sửa nội dung (L-11,
L-12, L-13). Không có thay đổi thuần trình bày nào trong lop này.

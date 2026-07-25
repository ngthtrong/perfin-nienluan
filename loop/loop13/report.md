# Loop 13 — Chương 2: cơ sở lý thuyết, lý luận chọn công nghệ, tính trung thực công thức

## Phạm vi lop này

**Vùng kiểm mới:** Chương 2 xét theo **Lưu ý #2 của giảng viên** (Guideline dòng 129:
"việc lựa chọn sử dụng các công nghệ, mô hình, công thức phải có sự lý luận hợp lý")
và **đối chiếu từng hằng số/công thức trong ch2 với mã nguồn thật**. Loop3 đã kiểm
"ch2 giải thuật & công thức" ở mức có công thức + có trích dẫn; lop này kiểm điều
khác: (a) mọi lựa chọn công nghệ có lý luận và **có trích dẫn** hay không, (b) mọi
con số trong ch2 có **khớp code** hay không.

**Bỏ qua:** ch3 thiết kế/kiểm thử (loop2, loop3, loop11), demo (loop5, loop9–11),
hình thức/TOC/bìa (loop4, loop7, loop12), abstract (loop4, loop8).

## Phần 1 — Báo cáo LaTeX

### L-18 (đã sửa) — 4/18 tài liệu tham khảo có trong danh mục nhưng KHÔNG được trích dẫn ở đâu

Đây là lỗi mức 1 (vi phạm quy định tường minh: Guideline dòng 115 yêu cầu IEEE;
IEEE đánh số theo **thứ tự xuất hiện của trích dẫn trong văn bản**, nên một mục
không được trích dẫn thì không có vị trí hợp lệ trong danh mục).

Bằng chứng — script đối chiếu `\bibitem{key}` với `\cite{...}` trên toàn bộ
`latex/chapters/*` + `latex/frontmatter/*`:

```
=== vi === defined=18 cited=14
never cited: bullmq2026, geminifunctioncalling, postgresql2026, redisexpire
=== en === defined=18 cited=14
never cited: bullmq2026, geminifunctioncalling, postgresql2026, redisexpire
```

Điều đáng chú ý: cả 4 mục đều là tài liệu chính thức của **đúng những công nghệ mà
bảng "lý do lựa chọn" (`tab:technology-rationale`) đang biện minh** — PostgreSQL
transactions, Redis EXPIRE, BullMQ idempotent jobs, Gemini function calling. Nghĩa
là phần lý luận chọn công nghệ đang khẳng định đặc tính kỹ thuật ("TTL, cache-aside",
"retry và job ID", "transaction") mà không dẫn nguồn — vừa là lỗi IEEE, vừa là điểm
yếu đúng theo Lưu ý #2.

**Đã sửa:** thêm trích dẫn tại chính nơi phát sinh khẳng định, song ngữ:
`PostgreSQL \cite{postgresql2026}`, `Redis \cite{redisexpire}`,
`BullMQ \cite{bullmq2026}` trong bảng rationale; và trong §2.5.1 function calling:
"Tool được khai báo bằng schema **theo cơ chế function calling của nhà cung cấp**
\cite{geminifunctioncalling}".

Sau sửa: `vi: defined=18 cited=18 uncited=0`, `en: defined=18 cited=18 uncited=0`,
`main-vi.aux bibcite=18`, `main-en.aux bibcite=18`, 0 `Citation undefined`.

Ghi chú đồng bộ: `resource/Report.md` **vốn đã có** cả 4 trích dẫn inline ([4], [7],
[8], [9] tại dòng 505–507 và §2.5.1). Vậy bản LaTeX là bản bị thiếu, và sửa lần này
đưa LaTeX **về khớp với** bản Markdown — không phát sinh lệch cần đồng bộ ngược lại.

## Đã kiểm và ĐẠT (lop sau không cần kiểm lại)

### Tính trung thực công thức ch2 ↔ mã nguồn: ĐẠT toàn bộ

Đây là kiểm tra tốn công nhất của loop này và kết quả là **không có lỗi**. Từng hằng
số phát biểu trong ch2 được đối chiếu với code:

| ch2 phát biểu | Mã nguồn | Khớp |
|---|---|---|
| z-score cờ khi $z_i \ge 2{,}5$ | `analytics.service.js:16 ANOMALY_Z_THRESHOLD = 2.5` | ✔ |
| IQR: $x_i > Q_3 + 1{,}5\,IQR$ | `analytics.service.js:17 ANOMALY_IQR_MULTIPLIER = 1.5`; `algorithms.js` `iqrK = 1.5` | ✔ |
| cần $n \ge 4$ giá trị | `detectAnomalies`: `if (values.length < 4) return []` | ✔ |
| $s=0 \Rightarrow z_i=0$ | `const z = sd === 0 ? 0 : (p.value - m) / sd` | ✔ |
| $IQR=0$ thì nhánh IQR không phát cờ | `const byIqr = iqr > 0 && p.value > upperFence` | ✔ |
| method `z`/`iqr`/`z+iqr` | `method: byZ && byIqr ? 'z+iqr' : byZ ? 'z' : 'iqr'` | ✔ |
| $Q_1,Q_3$ nội suy tuyến tính | `quantile(values, 0.25)` / `(values, 0.75)` | ✔ |
| OLS $b,a$ và $R^2$ | `linearTrend`: `slope=num/den`, `intercept=my-slope*mx`, `r2=1-ssRes/ssTot` | ✔ |
| chuỗi hằng ⇒ $R^2=0$ | `const r2 = ssTot === 0 ? 0 : ...` | ✔ |
| $\hat y_n=\max(0,a+bn)$ | `forecastNext: Math.max(0, Math.round(slope * n + intercept))` | ✔ |
| xu hướng cần ≥3 tháng, $b>0$, $R^2\ge0{,}5$, %thay đổi ≥10% | `index.js:19 if (series.length < 3) continue` + `:28 if (t.avgPctChange >= 10 && t.r2 >= 0.5 && t.slope > 0)` | ✔ |
| runway cửa sổ $W=14$ ngày | `runwayFacts`: `AnalyticsModel.dailyExpenses(userId, 14)` | ✔ |
| $\bar e_W=0 \Rightarrow$ không dự báo (`null`) | `if (runway.daysLeft === null) return null` | ✔ |
| similarity $s=\max(s_{edit},\,0{,}92s_{dice},\,s_{contain})$ | `textSimilarity.js:71 Math.max(edit, dice * 0.92, containmentScore)` | ✔ |
| $s_{contain}\in[0{,}82;0{,}94]$ | `Math.min(0.94, 0.82 + (smaller.size/larger.size) * 0.12)` | ✔ |
| containment cần tập nhỏ ≥2 phần tử | `contained && smaller.size >= 2` | ✔ |
| ngưỡng $\tau=0{,}82$ (dài) / $0{,}90$ (ngắn) | `categoryMatcher.js:90 shortInput ? 0.9 : 0.82` | ✔ |
| margin $m=0{,}08$ | `categoryMatcher.js:91 options.minMargin ?? 0.08` | ✔ |
| recurring: $\delta_i \le 0{,}15$ | `mineSubscriptions`: `amountTolerance = 0.15` | ✔ |
| recurring: $20\le\bar\Delta\le40$ ngày | `cadenceMinDays = 20, cadenceMaxDays = 40` | ✔ |
| recurring: hoặc ≥3 lần xuất hiện | `if (amountStable && (periodic \|\| items.length >= 3))` | ✔ |
| recurring: chỉ expense ≤ 500.000đ | `maxAmount = 500000`, `t.type === 'expense'` | ✔ |
| recurring: $m=2$ tối thiểu | `minOccurrences = 2` | ✔ |
| Pearson trả 0 nếu $n<3$ | `pearson`: `if (n < 3) return 0` | ✔ |
| phương sai 0 ⇒ trả 0 | `return den === 0 ? 0 : ...` | ✔ |
| chỉ xét danh mục ≥4 tuần quan sát | `index.js` `.filter((c) => Object.keys(cats[c]).length >= 4)` | ✔ |
| chỉ công bố $r\ge0{,}6$, chọn $r$ lớn nhất | `if (r >= 0.6 && (!best \|\| r > best.r))` | ✔ |

Không có một sai lệch nào. Đây là điểm mạnh thực sự của báo cáo theo trọng tâm
"dữ liệu, giải thuật" của niên luận cơ sở ngành: công thức trong báo cáo **là** công
thức đang chạy, kèm cả các guard biên (chia 0, thiếu mẫu) được phát biểu đúng.

### Các mục khác ĐẠT

- **Có section riêng cho Lưu ý #2**: §2.6 "Hạ tầng, công nghệ và lý do lựa chọn" với
  bảng 3 cột (công nghệ | lý do phù hợp bài toán | ranh giới/phương án thay thế) — 7
  công nghệ đều có cả lý do **và** phương án thay thế. Đúng yêu cầu "lý luận hợp lý
  cho lý do lựa chọn và tại sao phù hợp với bài toán".
- **Trích dẫn học thuật cho từng giải thuật**: Levenshtein \cite{levenshtein1966},
  Dice \cite{dice1945}, OLS \cite{montgomery2012}, IQR/Tukey \cite{tukey1977},
  Pearson \cite{pearson1895}, Transformer \cite{vaswani2017}, Whisper
  \cite{radford2022}.
- **21 phương trình mỗi bản, số lượng và vị trí khớp nhau vi↔en.**
- **Không có công thức "trang trí"**: mọi phương trình đều có hằng số tương ứng trong
  code (bảng trên).

## Bảng mức độ + danh sách chốt

| Mã | Mô tả | Mức | Quyết định |
|---|---|---|---|
| L-18 | 4/18 tài liệu tham khảo không được trích dẫn ở bất kỳ đâu; đều là doc của công nghệ mà bảng rationale đang biện minh mà không dẫn nguồn | 1 (vi phạm IEEE tường minh + yếu theo Lưu ý #2) | **ĐÃ SỬA** — thêm 4 `\cite` đúng nơi phát sinh khẳng định, song ngữ |
| — | Toàn bộ hằng số/công thức ch2 ↔ code | — | **KHÔNG PHẢI LỖI** — 27/27 khớp, xem bảng trên |
| — | Bảng lý do chọn công nghệ (Lưu ý #2) | — | **ĐẠT** — có lý do + phương án thay thế cho cả 7 công nghệ |

Không phát hiện lỗi mức 2–5 nào khác ở vùng này.

## Kết quả thực thi

```
cd latex && make            → exit 0
main-vi: overfull=2  undefined-ref=0  Citation-undefined=0
main-en: overfull=0  undefined-ref=0  Citation-undefined=0
```

2 overfull còn lại ở bản VI là 1,90pt và 1,88pt (≈0,07mm) — đã ghi nhận từ loop7,
dưới ngưỡng thấy được bằng mắt.

Đối chiếu song ngữ (sau sửa):

```
vi: section=20 subsection=36 subsubsection=33 label=28 ref=33 cite=21
en: section=20 subsection=36 subsubsection=33 label=28 ref=33 cite=21
```

Khớp tuyệt đối. `cite` tăng 17→21 đúng bằng 4 trích dẫn mới ở mỗi bản.

```
vi: defined=18 cited=18 uncited=0
en: defined=18 cited=18 uncited=0
Report.md: defined=18 uncited=none
```

Không chạm backend/frontend trong loop này nên không chạy lại `npm test` /
`ui:smoke` (loop11 và loop12: 182/182 và UI smoke PASS).

Ghi chú về commit: commit loop13 mang theo `latex/config/preamble.tex` và
`latex/frontmatter/{vi,en}/cover.tex` — đây **không phải** thay đổi của loop13 mà là
phần viền bìa hai nét (TikZ overlay) đã tồn tại dưới dạng chưa commit từ trước phiên
này. Hai PDF vừa build có nhúng phần đó, nên phải commit cùng để PDF tái lập được.

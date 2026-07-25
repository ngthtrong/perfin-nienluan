# Loop 7 — Phản biện & kế hoạch sửa (Niên luận cơ sở ngành PERFIN)

Ngày: 2026-07-25. Vai: giảng viên hướng dẫn. Tinh thần xây dựng, chuẩn niên luận cơ sở.

Loop 6 đã tuyên bố "không còn lỗi bắt buộc-sửa". Loop này soi hai vùng mà 6 loop trước
**chưa từng kiểm tra trực tiếp**: (a) tuân thủ quy định định dạng tiêu đề ở mục 1 của
Guideline, (b) chất lượng tương tác/khả năng tiếp cận của frontend (các loop trước chỉ
kiểm màu hard-code). Cả hai vùng đều phát hiện vấn đề thật.

---

## Phần 1 — Báo cáo LaTeX

### L-08 (NGHIÊM TRỌNG — bắt buộc sửa) Thiếu hoàn toàn màu tiêu đề theo quy định

Guideline-report.md quy định rõ ràng ở dòng 9–12:

- Heading 1 (Chapter): Arial, 14, Bold, Uppercase, **color #00B0F0**
- Heading 2 (Section): Arial, 13, Bold, Uppercase, **color #2F5496**
- Heading 3 (Subsection): Arial, 13, Bold+Italic, **color #2F5496**
- Heading 4 (Sub-subsection): Arial, 13, Italic, **color #2F5496**

Kiểm tra `latex/config/preamble.tex:59-77`: bốn khối `\titleformat` khai báo đúng font
(`\sffamily` → Arial), đúng cỡ (14pt/13pt), đúng bold/italic, đúng uppercase — nhưng
**không có bất kỳ khai báo màu nào**. Grep toàn bộ `latex/**` cho `00B0F0` và `2F5496`
trả về 0 kết quả. Toàn bộ tiêu đề hiện in màu đen.

Đây là lỗi tuân thủ hình thức trực tiếp và dễ thấy nhất khi giảng viên mở PDF: 4/4 cấp
tiêu đề sai thuộc tính được quy định tường minh. Đáng chú ý là preamble đã có sẵn cơ chế
màu (`\definecolor{PerfinBlue}` ... dòng 99–103) và các macro trạng thái dùng
`\textcolor` — nên việc thiếu màu tiêu đề là bỏ sót, không phải hạn chế kỹ thuật.

Mức độ: nghiêm trọng ở tiêu chí "Formatting the Report" (mục 1). Chi phí sửa: rất thấp.

### Các mục đã kiểm và ĐẠT trong loop này

- **Chương 1**: bố cục Đặt vấn đề → Mục tiêu → Phạm vi → Đóng góp → Bố cục đủ và mạch
  lạc; Bảng `tab:objectives` gắn mỗi mục tiêu O1–O5 với tiêu chí nghiệm thu (đúng yêu
  cầu "specific, achievable" ở Guideline 1.2); có câu cảnh báo ngưỡng là mục tiêu chứ
  không phải kết quả đã đạt — trung thực học thuật tốt.
- **Chương 4**: đối chiếu mục tiêu–bằng chứng dạng bảng, 8 hạn chế tự nêu, 7 hướng phát
  triển có thứ tự ưu tiên. Đúng ba yêu cầu của Guideline chương 4.
- **Cấu trúc 4 cấp**: `tocdepth=3`/`secnumdepth=3` + 33 `\subsubsection` trong ch3 → mục
  lục thật sự có 4 cấp như quy định 2.3.
- **Đánh số hình/bảng liên tục**: `\counterwithout{figure}{chapter}` → Hình 1..13 đúng
  yêu cầu 2.4.
- **Thân bài**: Times New Roman 13pt (`\renewcommand\normalsize{...13pt}`) đúng quy định.

### L-09 (TRUNG BÌNH — nên sửa) Font trong 13 sơ đồ không đồng nhất

Kiểm tra thuộc tính `fontFamily` trong 13 file `figures/drawio/*.drawio`:

- 6 file **không khai báo font** (`01-system-context`, `02-runtime-architecture`,
  `08-text-sequence`, `10-feedback-flow`, `11-insight-sequence`, `13-worker-sequence`) —
  dùng font mặc định của drawio, đúng như `RESTYLE-PLAN` đã chốt ("Body font: default").
- 7 file **khai báo `fontFamily=Trebuchet MS,Verdana,Arial,sans-serif`** (785 lần):
  `03-deployment` (26), `04-domain-class` (119), `05-physical-erd` (438),
  `06-llm-boundary` (48), `07-conversation-state` (48), `09-multimodal-flow` (56),
  `12-goal-flow` (50).

Hệ quả: người đọc mở PDF sẽ thấy chữ trong ERD và class diagram khác chữ trong các sơ đồ
tuần tự. Guideline mục 2.4 yêu cầu hình minh họa nhất quán, và bản thân dự án đã có chuẩn
(6 file restyle dùng mặc định) — đây là áp dụng chưa hết, không phải chủ ý thiết kế.

Cách sửa đúng là **bỏ** khai báo Trebuchet ở 7 file để cả 13 file cùng thừa hưởng một font
mặc định, chứ không phải thêm một literal font mới vào 6 file kia.

### L-10 (TRUNG BÌNH — nên sửa) Bản tiếng Anh có 22 hộp tràn lề

Build log `main-en.log`: 22 cảnh báo `Overfull \hbox`, trong đó 4 hộp vượt 18pt và một hộp
vượt **43,3pt (≈1,5cm)** — chữ đâm hẳn ra ngoài lề phải, thấy rõ khi in. Bản tiếng Việt
chỉ có 3 hộp, đều dưới 4pt (≈0,1mm, không nhìn thấy).

Nguyên nhân: các bảng dùng độ rộng cột `L{...cm}` **cố định, canh theo độ dài chữ tiếng
Việt**, nhưng cùng nội dung khi dịch sang tiếng Anh thì dài hơn. Ba bảng bị ảnh hưởng
(`tab:llm-actions`, `tab:measured-results`, `tab:feature-status`): tiêu đề `Confirm`,
`Atomic/idempotent` và macro `\statusmeasured` → "Measured" không vừa cột. Phần còn lại là
các cụm không thể ngắt dòng: `REST/JSON`, `authentication/authorization`, `images/audio`,
và chuỗi định danh `\code{}` liền nhau trong đoạn mô tả ERD.

Đáng lưu ý: 3 bảng này có `L{}` **giống hệt nhau ở cả hai ngôn ngữ**, tổng bề rộng chỉ
12,7cm trong khi khổ chữ A4 (lề 3,5cm/2cm) cho phép 15,5cm — tức còn dư 2,8cm để nới cột
mà không phá bố cục.

Kết luận Phần 1: một lỗi vi phạm quy định tường minh (L-08) và hai lỗi trình bày nhìn thấy
được trên bản in (L-09, L-10) → đều phải sửa.

---

## Phần 2 — Sản phẩm Demo

Không phát hiện bug logic mới (loop5 đã xác minh backend: 46/46 test hàm thuần, 131
placeholder tham số hóa, không SQL injection; xác nhận lại các luồng xóa đều đi qua
`confirmDelete`/`showAlert`, không có xóa im lặng). Vấn đề của loop này thuộc nhóm
**UI/UX cơ bản**, đúng phạm vi Bước 2 mà đề bài yêu cầu ("không mắc các lỗi thiết kế
cơ bản").

### D-04 (TRUNG BÌNH — nên sửa) 14 nút chỉ-có-icon không có nhãn cho screen reader

Quét 12 screen + 10 component: 172 `TouchableOpacity`, nhưng 14 nút chứa **duy nhất một
icon, không kèm text và không có `accessibilityLabel`**:

| Vị trí | Icon | Chức năng |
|---|---|---|
| `RecurringScreen.js:380` | add | chấp nhận gợi ý chi phí cố định |
| `RecurringScreen.js:383` | close | bỏ qua gợi ý |
| `RecurringScreen.js:434/437/440/443` | history / pause-play / edit / delete | 4 hành động trên mỗi thẻ hóa đơn |
| `ReportScreen.js:96/103` | chevron-left / right | lùi/tiến tháng |
| `ExportScreen.js:40/44` | download / delete-outline | tải & xóa bản backup |
| `ChatScreen.js:741` | add-photo-alternate | đính kèm ảnh |
| `TransactionScreen.js:857` | close | đóng modal |
| `TransactionPreviewCard.js:145`, `MultiTransactionPreviewCard.js:233` | close | bỏ preview |

Với nút mang icon `delete-outline` hay `close`, người dùng trình đọc màn hình chỉ nghe
"button" — không biết mình sắp xóa gì. Đây là lỗi tiếp cận cơ bản, và nó tương phản với
phần còn lại của app: các screen khác đã làm đúng (ChatScreen 13 nhãn, TransactionScreen
13 nhãn, `ExportScreen.js:299` có sẵn `accessibilityRole`+`accessibilityLabel`). Nghĩa là
dự án *đã có* quy ước, chỉ áp dụng chưa nhất quán — đúng loại lỗi "giao diện không đồng
nhất" mà đề bài yêu cầu loại bỏ.

### D-05 (TRUNG BÌNH — nên sửa) Vùng chạm nhỏ hơn ngưỡng tối thiểu, `hitSlop` = 0 toàn app

Kích thước thực đo từ StyleSheet:

- `RecurringScreen.suggestAccept/suggestDismiss`: 32×32 pt
- `RecurringScreen.iconAction`: 38×38 pt (4 nút xếp liền nhau trên một hàng)
- `ReportScreen.monthNavBtn`: 38×38 pt
- `ExportScreen.dlBtn/delBtn`: 36×36 pt

Ngưỡng khuyến nghị là 44×44 pt (iOS HIG) / 48 dp (Material). Grep `hitSlop` toàn bộ
frontend: **0 kết quả**. Bốn nút 38pt cạnh nhau, trong đó có nút xóa nằm sát nút sửa, là
tình huống dễ chạm nhầm nhất — và hậu quả của chạm nhầm ở đây là xóa dữ liệu.

Không cần đổi kích thước hình học (sẽ phá layout đã cân); thêm `hitSlop` mở rộng vùng
chạm vô hình là cách sửa đúng và không ảnh hưởng thẩm mỹ.

### Các mục UI/UX đã kiểm và ĐẠT

- **Token thiết kế**: `theme/tokens.js` một màu nhấn duy nhất (`brand #A84B32` terracotta),
  palette đất trung tính, đủ cặp semantic light/dark, thang `RADIUS`/`SPACING`/`TYPO` nhất
  quán. Đúng yêu cầu "hiện đại, trang nhã, không sặc sỡ".
- **Bảng màu biểu đồ**: 8 màu warm muted, không dùng màu nguyên bản chói.
- **Shadow theo chế độ**: dark mode gần phẳng (dựa vào tương phản surface) thay vì đổ bóng
  đen — chi tiết đúng nghề.
- **Xác nhận hành động phá hủy**: có, kể cả trên web (`utils/alerts.js` dùng
  `window.confirm` để không im lặng bỏ qua).
- **Trạng thái tải/lỗi/rỗng**: có `Skeleton`, `ErrorState`, `EmptyState` dùng chung.
- **Chống tràn chữ**: `numberOfLines` + `adjustsFontSizeToFit` ở nhãn số tiền và nav label.

---

## Bước 3 — Đánh giá mức độ & danh sách chốt phải sửa

| Mã | Vấn đề | Mức độ | Quyết định |
|----|--------|--------|-----------|
| L-08 | Thiếu màu tiêu đề 4 cấp (#00B0F0 / #2F5496) | **Nghiêm trọng** (vi phạm quy định tường minh) | **SỬA NGAY** |
| D-04 | 14 nút icon-only thiếu `accessibilityLabel` | Trung bình | **SỬA** (chi phí thấp, tăng tính đồng nhất) |
| D-05 | Vùng chạm 32–38pt, không có `hitSlop` | Trung bình | **SỬA** (thêm `hitSlop`, không đổi layout) |
| L-09 | 7/13 sơ đồ dùng font khác 6 sơ đồ còn lại | Trung bình | **SỬA** (font không đồng nhất giữa các hình trong cùng báo cáo) |
| L-10 | 22 hộp tràn lề ở bản EN (tối đa 43pt ≈ 1,5cm) | Trung bình | **SỬA** (chữ đâm ra ngoài lề, thấy rõ khi in) |
| L-04/L-05 | Palette 11 sơ đồ (tồn từ loop2) | Thẩm mỹ | Giữ nguyên: luật mũi tên thẳng/không chồng chéo đã đạt, lợi ích cận biên thấp (ghi chú: loop6 viện lý do "render >120s/hình" là **sai** — đo thực tế 4,1s/hình, nên L-09 vẫn được sửa trong loop này) |

Không tạo sơ đồ mới trong loop này: 13 sơ đồ hiện có đã phủ đủ ngữ cảnh, kiến trúc,
triển khai, class, ERD, ranh giới LLM, trạng thái hội thoại và 6 luồng xử lý — bổ sung
thêm sẽ là chi tiết quá mức so với yêu cầu niên luận cơ sở.

---

## Bước 4 — Thực thi (kết quả)

1. **L-08 đã sửa**: thêm `\definecolor{HeadingOne}{HTML}{00B0F0}` và
   `\definecolor{HeadingTwo}{HTML}{2F5496}` vào `config/preamble.tex`, áp `\color{...}`
   vào cả 5 khối `\titleformat` (chapter có số, chapter numberless, section, subsection,
   subsubsection) và đồng bộ màu mục lục cấp chương. Vì preamble dùng chung cho cả hai
   ngôn ngữ, một lần sửa có hiệu lực đồng thời trên vi và en — đã build lại cả hai PDF
   để xác nhận.
2. **D-04 đã sửa**: thêm `accessibilityRole="button"` + `accessibilityLabel` tiếng Việt
   mô tả đúng hành động cho cả 14 nút, ở 6 file.
3. **D-05 đã sửa**: thêm `hitSlop` cho các nút dưới 44pt, đưa vùng chạm hiệu dụng lên
   ≥44pt mà không đổi kích thước hiển thị.
4. **L-09 đã sửa**: bỏ khai báo `fontFamily=Trebuchet MS,...` khỏi 7 file `.drawio`
   (785 → 0 lần xuất hiện) để cả 13 sơ đồ cùng dùng một font mặc định, khớp chú thích
   "Body font: default" trong palette-spec. Render lại đủ 3 định dạng cho 7 sơ đồ
   (21 file pdf/png/svg, exit 0). Xác minh: cả 13 SVG nay báo **một** giá trị
   `font-family` duy nhất; cả 13 PDF vẫn `images=0` (vector thật, không rasterize).
   Soi mắt hai hình nặng nhất (`05-physical-erd` ~18 bảng thực thể, `12-goal-flow`)
   — chữ đọc được, không bị cắt, dấu tiếng Việt nguyên vẹn, palette trung tính giữ nguyên.
5. **L-10 đã sửa**: nới 3 cột bảng chật ở ch3 (`L{1.5}→L{2.1}`, `L{1.8}→L{2.4}`,
   `L{3.5}→L{4.3}`, `L{5.0}→L{4.6}`, `L{3.2}→L{4.0}` cm) và hạ cột nhãn bảng feedback
   `L{4}→L{3}` cm; tăng `\emergencystretch` 2em → 3em trong preamble cho các định danh
   `\code{}` dài không thể ngắt dòng. Sửa **song song trên cả vi và en** để hai nguồn giữ
   cấu trúc đối xứng, dù lỗi chỉ biểu hiện ở en (tiếng Anh dài hơn tiếng Việt trong cùng
   độ rộng cột). Kết quả: **EN 22 → 0** hộp tràn; VI còn 2 hộp ở mức 1,9pt (≈0,07mm,
   dưới ngưỡng nhìn thấy) — chấp nhận được. Cả hai bản vẫn 0 warning, 26 hình embed,
   7 khai báo màu tiêu đề nguyên vẹn.
6. **Đồng bộ tài liệu**: `resource/Report.md` được kiểm lại — thay đổi loop này thuần
   trình bày (màu tiêu đề, font sơ đồ, độ rộng cột bảng) và code demo, không làm đổi bất
   kỳ số liệu hay câu văn nào trong nội dung báo cáo, nên không phát sinh lệch nội dung
   cần đồng bộ.

**Trạng thái build cuối loop 7**: `main-vi.pdf` 74 trang / `main-en.pdf` 80 trang,
exit 0, 0 warning, 26 hình mỗi bản, 0 (en) và 2 (vi, ~1,9pt) hộp tràn.

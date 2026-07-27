# loop16 — UI/UX design-token consistency

Ngày: 25/07/2026. Phạm vi: `demo/frontend/src` (12 screen + component dùng chung),
đối chiếu với `src/theme/tokens.js`.

## Cách kiểm

1. Đếm màu hex hard-code ngoài `tokens.js`.
2. Đối chiếu mức sử dụng từng nhóm token: `radius`, `typo`, `shadows`, `spacing`.
3. Đối chiếu giá trị padding/margin/gap hard-code với thang `SPACING`.
4. Xác minh: bundle Metro compile, UI smoke 4/4, backend 182/182.

## D-13 (đã sửa) — 12 vị trí dùng `'#fff'` thay vì token `onBrand`

Chứng cứ trực tiếp về tính không nhất quán: trong cùng một tệp
`CashflowScreen.js`, dòng 409 đã dùng `c.onBrand` còn dòng 440 vẫn dùng
`'#fff'` cho cùng một loại chip active.

Đã đổi 12 vị trí nằm trên nền thuộc họ `brand` sang `t.colors.onBrand` /
`c.onBrand`:

| Tệp | Vị trí |
|---|---|
| `CashflowScreen.js` | icon 309, chip 439--440, `netWorthTitle` 649, `netWorthValue` 650, `nwValue` 653 |
| `ChatScreen.js` | `modelChipTextActive` 807 |
| `DashboardScreen.js` | `primaryActionText` 212 |
| `ExportScreen.js` | `freqTextActive` 384 |
| `RecurringScreen.js` | icon 399 |
| `TransactionScreen.js` | icon 503, `segmentText` 504 |

Không đổi 7 vị trí còn lại vì nền **không** thuộc họ brand, gán `onBrand` vào
đó sẽ sai nghĩa:

- `RecurringScreen` `payBtn*` — nền `colors.income` (xanh).
- `ChatScreen` `userText` — nền `colors.chatUserBubble`.
- `ChatScreen` mic overlay 99 — nền scrim bán trong suốt.
- `ChatImagePreview` `receiptBadge*` — nền `rgba(38,31,27,0.72)`.
- `ExportScreen` `thumbColor` 264 — thumb của `Switch`, không phải nền brand.

Lưu ý phạm vi tác động: `onBrand` hiện là `#FFFFFF` ở **cả hai** palette
(`tokens.js:44` light, `tokens.js:83` dark), nên 12 thay đổi này **không** làm
đổi pixel nào hôm nay. Giá trị là bảo trì: nếu `onBrand` của dark theme đổi,
12 vị trí này sẽ đi theo thay vì âm thầm đứng lại. Đã xác nhận bằng ảnh chụp
Dashboard: thẻ ``Nhập bằng Chat AI'' vẫn là chữ trắng trên nền nâu brand.

## L-21 (ghi nhận, không sửa) — token `spacing` chết

`SPACING = {xs:4, sm:8, md:12, lg:16, xl:20, xxl:28}` được định nghĩa
(`tokens.js:7`), đưa vào `buildTheme()` thành `theme.spacing`, và re-export qua
`utils/constants.js:45`. Số lần tiêu thụ thực tế:

| Token | Số lần dùng |
|---|---|
| `theme.radius` | 147 |
| `theme.typo` | 49 |
| `theme.shadows` | 49 |
| `theme.spacing` | **0** |

Thay vào đó có 777 giá trị padding/margin/gap hard-code, trong đó **464 nằm
ngoài thang** `SPACING` (các giá trị 5, 7, 9, 11, 13, 14…). Không sửa trong
vòng này vì: (i) đổi 464 giá trị về thang gần nhất **sẽ** làm dịch bố cục thật
trên cả 12 màn hình, tức là một refactor thị giác chứ không phải sửa lỗi;
(ii) không có snapshot test bố cục để chứng minh không hồi quy — UI smoke chỉ
kiểm tra overflow ngang, không phát hiện lệch 1--2 px. Đây là món nợ kỹ thuật
cần một vòng riêng có ảnh chụp before/after từng màn hình.

Không đồng bộ báo cáo LaTeX: `spacing` là chi tiết nội bộ của demo, không phải
tuyên bố nào trong báo cáo.

## Kiểm chứng

| Hạng mục | Kết quả |
|---|---|
| Metro bundle | HTTP 200, 4.264.375 byte, 0 transform error |
| `onBrand` trong bundle | 61 tham chiếu |
| UI smoke | 4/4 PASS, exit 0 |
| Backend `npm test` | 182/182 pass, 0 fail |
| Ảnh chụp Dashboard | thẻ brand hiển thị đúng chữ trắng trên nền nâu |
| Hex hard-code ngoài `tokens.js` | 19 → 7 (7 còn lại có lý do ngữ nghĩa) |

## Ghi chú phương pháp

`node --check` báo `SyntaxError` cho cả 7 tệp — đây là **dương tính giả**: công
cụ không parse được JSX. Đã xác nhận bằng brace/paren delta = 0 trên mọi tệp và
bằng bundle Metro compile thành công. Không dùng `node --check` cho tệp JSX ở
các vòng sau.

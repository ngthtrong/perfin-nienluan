# Loop 10 — Xử lý lỗi, trạng thái rỗng và thao tác phá hủy

## Phạm vi lop này

**Vùng kiểm mới (chưa từng kiểm ở loop 1–9):** xử lý lỗi & trạng thái rỗng —
độ phủ `EmptyState`/`ErrorState` trên 12 màn hình, xác nhận trước thao tác
xóa, chất lượng thông báo lỗi, trợ năng của trạng thái lỗi. Kèm rà soát vùng
chạm còn sót từ loop7.

**Bỏ qua:** LaTeX (loop8), skeleton (loop9), bảo mật SQL (loop5), sơ đồ (loop7).

**Môi trường:** tiếp tục chạy demo thật (PostgreSQL + backend :3000 + Expo :8081).

---

## Phần 2 — Demo

### D-08 (mức 3) — Xóa đặc điểm cá nhân hóa không hỏi lại

Kiểm toàn bộ 7 thao tác xóa trong ứng dụng:

| Thao tác | Hỏi lại? | Chất lượng |
|---|---|---|
| Xóa giao dịch | Có | + hoàn tác 30 giây |
| Xóa danh mục | Có | + báo trước số giao dịch bị ảnh hưởng, báo lại số đã chuyển |
| Xóa ngân sách | Có | nêu rõ danh mục + kỳ |
| Xóa lãi/lỗ | Có | cảnh báo số dư ví sẽ điều chỉnh |
| Xóa chi phí cố định | Có | nêu rõ lịch sử thanh toán được giữ |
| Xóa file export | Có | "không thể hoàn tác" |
| **Xóa đặc điểm cá nhân hóa** | **KHÔNG** | một chạm là mất |

`src/screens/SettingsScreen.js:119` (trước sửa) — gọi API xóa ngay trong
`onPress`, không có `showAlert`:

```js
async function removeTrait(traitType) {
  if (removingTrait) return;
  setRemovingTrait(traitType);
  await api.deletePersonalizationTrait(traitType);   // mất dữ liệu ngay
```

Đúng loại lỗi mà prompt Bước 1 mục 3 xếp mức 3: "mất dữ liệu, chạm nhầm,
không xác nhận khi xóa". Nút lại chỉ 34pt và nằm sát nội dung nên nguy cơ chạm
nhầm là thật, không lý thuyết.

### D-09 (mức 3) — Tám vùng chạm dưới 44pt còn sót sau loop7

Loop7 thêm token `HIT_SLOP` nhưng chưa quét hết. Rà lại toàn bộ file có
`TouchableOpacity` kèm kích thước nhỏ, tách phần trang trí khỏi phần bấm được:

| Vị trí | Kích thước | Là nút? |
|---|---|---|
| `BudgetScreen:270,277` điều hướng tháng trước/sau | 38pt | Có — thiếu hitSlop |
| `CashflowScreen:515,583,592` đổi tên ví, sửa/xóa lãi-lỗ | 38pt | Có — thiếu |
| `CategoryScreen:333,342` đổi tên/xóa danh mục | 40pt | Có — thiếu |
| `ChatScreen:685` bỏ ảnh đã chọn | 36pt | Có — thiếu |
| `SettingsScreen:280` xóa đặc điểm | 34pt | Có — thiếu |
| `forecastIcon`, `catIcon`, `aiAvatar`, `filterIcon`, `infoIcon`, `headerIcon`×2 | 28–38pt | **Không** — là `View` trang trí, đúng khi không có hitSlop |

Phân biệt được nút thật khỏi icon trang trí là phần quan trọng: nếu thêm
hitSlop cho `View` trang trí thì vô nghĩa, còn bỏ sót 8 nút thật thì người
dùng ngón tay lớn hoặc tay không vững sẽ bấm trượt.

### D-10 (mức 3) — Trạng thái lỗi không được công bố cho trình đọc màn hình

```
$ grep -c "accessib|role=" src/components/ui/ErrorState.js src/components/ui/EmptyState.js
ErrorState.js:0
EmptyState.js:0
```

`ErrorState` là thứ **quan trọng nhất** phải công bố: người dùng cần biết ngay
là đã lỗi, chứ không phải đoán từ việc màn hình trống. Ngoài ra emoji trang trí
trong `EmptyState` bị đọc lên trước nội dung thật (trình đọc màn hình đọc tên
emoji, ví dụ "phong bì đóng").

Cùng nhóm nguyên nhân với D-07 (loop9) nhưng ở component khác; loop9 chỉ xử lý
skeleton.

### Đã kiểm và ĐẠT (lop sau không cần kiểm lại)

- **Độ phủ trạng thái lỗi/rỗng: ĐẠT.** 9/12 màn hình có `ErrorState` + `onRetry`;
  9/12 có `EmptyState`. Ba màn hình không có (Chat, More, Settings) là **đúng**:
  Chat báo lỗi bằng tin nhắn hệ thống trong luồng hội thoại (đúng mẫu cho UI
  đối thoại, 20 chỗ `catch` đều đẩy `push({role:'system'})`), Settings dùng
  `profileError` tại chỗ theo từng khối, More là menu tĩnh.
- **`ErrorState`/`EmptyState` viết tốt.** Đều có CTA (`Thử lại` / `actionLabel`),
  màu lấy từ token (`c.expenseSoft`, `c.brandSoft`), không hardcode hex —
  nhất quán với kết luận D-02 của loop3.
- **Chuẩn hóa lỗi mạng ở tầng service: ĐẠT.** `src/services/api.service.js`
  không để lộ stack trace: lỗi kết nối được đổi thành câu tiếng Việt kèm gợi ý
  (`:157`, `:229`, `:375`), lỗi API dùng `data.error` từ backend (`:140`) chứ
  không phải chuỗi HTTP thô.
- **Sáu thao tác xóa còn lại: ĐẠT và chất lượng cao.** Xem bảng D-08 — có
  hoàn tác 30 giây, có báo trước hệ quả lan tỏa (số giao dịch bị chuyển danh
  mục), có cảnh báo điều chỉnh số dư ví. Đây là mức chăm sóc trên mức cần thiết
  cho niên luận cơ sở ngành.

### Về sơ đồ

Không đề xuất hình mới. Vùng kiểm là hành vi runtime; báo cáo không có khẳng
định nào về xử lý lỗi UI cần hình hỗ trợ.

---

## Phần 1 — Báo cáo LaTeX

Không kiểm mới. **Không phát sinh lệch cần đồng bộ**: D-08/D-09/D-10 là sửa UI
demo; báo cáo không tuyên bố gì về xác nhận xóa, vùng chạm hay a11y. Giữ nguyên
lý do đã nêu ở loop9: bảng NFR không có mục UX/trợ năng, phù hợp §Phạm vi ch1
dòng 77.

---

## Bước 3 — Bảng chốt danh sách sửa

| Mã | Mô tả | Mức | Quyết định |
|---|---|---|---|
| D-08 | Xóa đặc điểm cá nhân hóa không hỏi lại, mất dữ liệu sau một chạm | 3 | **SỬA NGAY** |
| D-09 | 8 nút bấm 34–40pt thiếu `hitSlop`, dưới ngưỡng 44pt | 3 | **SỬA NGAY** |
| D-10 | `ErrorState` không công bố lỗi cho trình đọc màn hình; emoji trang trí bị đọc | 3 | **SỬA NGAY** |
| — | 7 `View` trang trí 28–38pt không có hitSlop | — | **GIỮ NGUYÊN** — không phải nút; thêm hitSlop là sai |
| — | Chat/More/Settings không có `ErrorState` toàn màn | — | **GIỮ NGUYÊN** — đã có cơ chế báo lỗi đúng mẫu riêng |

---

## Bước 4 — Kết quả thực thi và xác minh

### Đã sửa

**D-08** — `SettingsScreen.js`: tách `doRemoveTrait` (thực thi) khỏi
`removeTrait` (hỏi lại). Hộp thoại nêu rõ hệ quả: "Trợ lý sẽ không dùng đặc
điểm này nữa. Thao tác không thể hoàn tác.", nút `Xoá` dùng
`style: 'destructive'` giống 6 thao tác xóa còn lại. Truyền thêm nhãn dễ đọc
để hộp thoại hiện tên đặc điểm thay vì mã `trait_type`.

**D-09** — thêm `hitSlop={HIT_SLOP}` cho 8 nút, kèm `import { HIT_SLOP }` vào
4 file chưa có (`BudgetScreen`, `CashflowScreen`, `CategoryScreen`,
`ChatScreen`). Không đổi hình học bố cục — chỉ mở rộng vùng nhận chạm, nên
không có rủi ro hồi quy layout.

**D-10** — `ErrorState.js`: bọc tiêu đề + mô tả trong một `View` với
`accessibilityRole="alert"` + `accessibilityLiveRegion="polite"`; icon cảnh báo
được ẩn khỏi cây trợ năng. **Nút `Thử lại` để NGOÀI vùng `accessible`** — nếu
bọc chung, iOS sẽ gộp cả nhóm thành một phần tử và nút mất khả năng focus riêng
(đã cân nhắc và chọn phương án này chủ ý, có comment trong code).
`EmptyState.js`: ẩn emoji trang trí khỏi cây trợ năng.

Xác minh attribute đến được DOM:

```
$ grep -o 'accessibilityRole: *"alert"' bundle
      1 accessibilityRole: "alert"
```

### Xác minh

```
$ npm run ui:smoke
exit=0
PASS dashboard-mobile: no horizontal overflow
PASS report-mobile:    no horizontal overflow
PASS chat-mobile:      no horizontal overflow
PASS chat-image:       1184x2560 rendered
UI SMOKE PASS

$ cd demo/backend && npm test
ℹ tests 178   ℹ pass 178   ℹ fail 0   ℹ duration_ms 3053
```

Metro bundle biên dịch sạch qua cả 3 vòng sửa (4.263.843 → 4.264.307 byte).
Lưu ý khi tự kiểm: `grep -i "SyntaxError\|Failed to compile"` trên bundle trả
về kết quả **không phải lỗi build** — đó là chính regex
`BABEL_TRANSFORM_ERROR_FORMAT` của Metro nằm trong bundle. Phải soi ngữ cảnh
trước khi kết luận.

Không chạm LaTeX nên không chạy `make`.

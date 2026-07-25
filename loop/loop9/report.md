# Loop 9 — Hiệu năng cảm nhận của demo (loading / skeleton)

## Phạm vi lop này

**Vùng kiểm mới (chưa từng kiểm ở loop 1–8):** hiệu năng cảm nhận —
trạng thái tải của 12 màn hình, chất lượng skeleton, và trợ năng của
trạng thái tải.

**Bỏ qua:** LaTeX (loop8 vừa xử lý 4 lỗi mức 2 và build sạch), bảo mật SQL
(loop5), sơ đồ (loop7).

**Ghi chú môi trường:** lop này lần đầu chạy demo *thật* — PostgreSQL live,
backend `npm start` trên :3000, Expo web trên :8081 — thay vì chỉ đọc code.

---

## Phần 2 — Demo

### D-06 (mức 3) — RecurringScreen dùng spinner giữa màn hình, lệch với 8 màn hình còn lại

Kiểm trực tiếp cả 12 màn hình:

| Kiểu trạng thái tải | Màn hình |
|---|---|
| Skeleton theo hình khối nội dung | Dashboard, Report, Transaction, Category, Budget, Goals, Cashflow, Export (8) |
| **Spinner trần giữa màn hình** | **Recurring (1)** |
| Không có trạng thái tải toàn màn | Chat, Settings, More (3 — hợp lý, xem phần ĐẠT) |

`src/screens/RecurringScreen.js:180` (trước sửa):

```js
if (loading) {
  return <View style={styles.centered}><ActivityIndicator color={c.brand} size="large" /></View>;
}
```

Hai vấn đề thật, không phải thẩm mỹ:

1. **Nhảy layout.** Spinner căn giữa rồi biến mất, nội dung thật đổ từ trên
   xuống — người dùng thấy trang "giật" một nhịp. 8 màn hình kia không bị vì
   skeleton giữ đúng chỗ của khối nội dung.
2. **Bất nhất trong cùng hệ thống.** Prompt Bước 2 đặt chuẩn "đồng nhất toàn
   hệ thống"; đây là 1/9 màn hình lệch khỏi mẫu mà chính dự án đã thiết lập.

### D-07 (mức 3) — Toàn bộ skeleton vô hình với trình đọc màn hình

`grep` trên toàn frontend trước sửa:

```
$ grep -rn "accessibilityElementsHidden|importantForAccessibility|accessibilityRole=\"progressbar\"" src/
(không kết quả)
```

Hệ quả với người dùng dùng trình đọc màn hình: khi màn hình đang tải, họ gặp
một vùng gồm 3–5 hộp rỗng **không được công bố là gì cả** — không có "đang
tải", không có trạng thái busy. Trải nghiệm là "màn hình trống, không rõ đang
chờ hay đã lỗi".

Đây là phần còn thiếu của công việc loop7 (loop7 sửa nhãn cho nút biểu tượng và
vùng chạm, chưa xét trạng thái tải). Không phải đảo kết luận loop7.

### Đã kiểm và ĐẠT (lop sau không cần kiểm lại)

- **Component `Skeleton` chất lượng tốt.** `src/components/ui/Skeleton.js`:
  animation dùng `useNativeDriver: true` (không chặn JS thread), có
  `loop.stop()` khi unmount (không rò rỉ), màu lấy từ `theme.colors.surfaceAlt`
  (không hardcode hex — nhất quán với kết luận D-02 của loop3).
- **3 màn hình không có skeleton toàn màn là ĐÚNG, không phải lỗi:**
  Chat/Settings/More không tải một khối dữ liệu lớn; chúng dùng spinner nhỏ
  *tại chỗ* (trong nút, trong dòng) — đúng mẫu. Đã đối chiếu 16 lượt dùng
  `ActivityIndicator` còn lại: tất cả đều là spinner nhỏ inline
  (`size="small"`, trong `Button`, trong row, trong modal). Không còn spinner
  trần toàn màn nào sau khi sửa D-06.
- **Backend khởi động và readiness đúng như báo cáo mô tả.** Chạy thật:
  ```
  GET /api/health/ready → {"ready":true,"status":"degraded",
    "dependencies":{"database":{"ok":true},"redis":{"ok":false,"status":"unavailable"}},
    "capabilities":{"ephemeral_state":"in_memory_fallback"}}
  ```
  Khớp chính xác điều §NFR-05 và ch4 §Hạn chế mục 7 đã tự nêu (Redis chưa
  live, có fallback). **Báo cáo trung thực ở điểm này.**

### Về sơ đồ

Không đề xuất hình mới. Vùng kiểm của lop này là hành vi runtime của UI; báo
cáo không có khẳng định nào về trạng thái tải cần hình hỗ trợ.

---

## Phần 1 — Báo cáo LaTeX

Không kiểm mới. **Không phát sinh lệch cần đồng bộ**: D-06/D-07 là sửa UI của
demo, và báo cáo không có tuyên bố nào về skeleton, trạng thái tải hay a11y để
phải cập nhật theo. Bảng NFR (`chapter3.tex:307-316`) có 10 mục, không mục nào
về UX/trợ năng — điều này **phù hợp** với §Phạm vi ch1 dòng 77 ("giao diện di
động đóng vai trò thu nhận đầu vào và minh họa khả năng sử dụng; độ đầy đủ CRUD
không phải thước đo đóng góp học thuật chính"). Không thêm NFR mới để tránh
phình phạm vi.

---

## Bước 3 — Bảng chốt danh sách sửa

| Mã | Mô tả | Mức | Quyết định |
|---|---|---|---|
| D-06 | RecurringScreen dùng spinner trần toàn màn, gây nhảy layout, lệch 8 màn hình còn lại | 3 | **SỬA NGAY** |
| D-07 | Skeleton không công bố trạng thái tải cho trình đọc màn hình; khối trang trí không bị ẩn khỏi cây trợ năng | 3 | **SỬA NGAY** |
| — | Spinner nhỏ inline ở Chat/Settings/Export/Transaction/Recurring-modal | — | **GIỮ NGUYÊN** — đúng mẫu cho tải cục bộ; đổi sang skeleton sẽ sai |
| — | Thêm NFR về UX/a11y vào báo cáo | 4 | **GIỮ NGUYÊN** — ngoài trọng tâm dữ liệu–giải thuật của niên luận cơ sở ngành |

---

## Bước 4 — Kết quả thực thi và xác minh

### Đã sửa

**D-06** — `src/screens/RecurringScreen.js`: thay spinner bằng skeleton theo
đúng bố cục thật (1 khối tổng quan 104px + 3 hàng bill 88px), kèm comment giải
thích lý do chống nhảy layout.

**D-07** — `src/components/ui/Skeleton.js`:
- Từng `Skeleton` nhận `accessibilityElementsHidden` +
  `importantForAccessibility="no-hide-descendants"` (khối trang trí, không đọc).
- Thêm `<SkeletonGroup>`: bọc một nhóm và công bố **đúng một** trạng thái
  (`accessibilityRole="progressbar"`, `accessibilityState={{busy:true}}`,
  nhãn tiếng Việt). Export qua `src/components/ui/index.js`.
- Nối vào cả 9 khối tải, mỗi màn một nhãn riêng: "Đang tải tổng quan" /
  "giao dịch" / "danh mục" / "ngân sách" / "mục tiêu" / "dòng tiền" /
  "khoản định kỳ" / "trang xuất dữ liệu" / "báo cáo tháng".

Xác minh attribute thật đến được DOM (RN-web ánh xạ sang ARIA), soi trong
bundle đã biên dịch:

```
$ grep -o 'role="progressbar"|aria-busy' bundle
      2 "progressbar"
      6 aria-busy
```

### Xác minh

Frontend — chạy với PostgreSQL + backend + Expo web thật:

```
$ npm run ui:smoke
exit=0
PASS dashboard-mobile: no horizontal overflow
PASS report-mobile:    no horizontal overflow
PASS chat-mobile:      no horizontal overflow
PASS chat-image:       1184x2560 rendered
UI SMOKE PASS; screenshots=/tmp/perfin-ui-smoke; image=rendered
```

Backend (chạy lại để chắc không hồi quy dù không chạm):

```
$ cd demo/backend && npm test
ℹ tests 178   ℹ pass 178   ℹ fail 0
```

Metro bundle biên dịch sạch, 4.262.370 byte, không lỗi build; `SkeletonGroup`
xuất hiện 16 lần trong bundle.

**Cạm bẫy đã gặp, ghi lại để lop sau không mất thời gian:** hai lần chạy
`ui:smoke` đầu tiên FAIL với `dashboard-mobile render timeout` rồi
`page load timeout`. **Không phải lỗi code** — `waitFor` mặc định 20 s
(`scripts/mobile-web-smoke.js:117`) trong khi Metro biên dịch nguội mất lâu
hơn. Cách chạy đúng: bật backend + Expo, nạp trước bundle
(`curl 'localhost:8081/index.bundle?platform=web&dev=true&hot=false'`, ~11 s)
rồi mới chạy smoke. Đã ghi nguyên văn cả hai lần fail theo yêu cầu Bước 4.

Không chạm LaTeX nên không chạy `make`.

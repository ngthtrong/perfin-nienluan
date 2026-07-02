# 03 — Kế hoạch cải thiện trải nghiệm giao dịch (UX) theo phong cách tối giản hiện đại

> Mục tiêu: nâng trải nghiệm nhập & quản lý giao dịch lên ngang các app fintech hiện đại
> (Wise, Revolut, Monzo, Cake) với tinh thần **tối giản, nhanh, ít thao tác**. Dựa trên design
> system sẵn có ở `frontend/src/utils/constants.js` (indigo `#5B5FEF`, semantic colors, SHADOWS,
> RADIUS) nên không cần đổi nền tảng thiết kế, chỉ tinh chỉnh và bổ sung.

## 1. Hiện trạng (điểm cần cải thiện)

- Nhập giao dịch tản mát: chat ở 1 tab, danh sách ở tab khác; không có "quick add" nổi.
- `TransactionScreen` là danh sách phẳng, chưa nhóm theo ngày, chưa có empty state đẹp.
- Xóa giao dịch: backend đã có **soft-delete + khôi phục 30 giây** (`transaction.model.js:
  softDelete/restore`) nhưng frontend chưa tận dụng bằng swipe + undo.
- Thiếu phản hồi xúc giác (haptic) và vi-animation khi thao tác.
- Chưa có dark mode dù palette đã sẵn sàng để mở rộng.

## 2. Nguyên tắc thiết kế áp dụng

1. **Một hành động chính rõ ràng** trên mỗi màn (primary action nổi bật, phần còn lại trầm).
2. **Giảm thao tác**: nhập nhanh ≤ 2 chạm hoặc 1 câu chat/giọng nói.
3. **Phân cấp thị giác**: số tiền là yếu tố nổi nhất; meta (ngày, ví) làm mờ.
4. **Phản hồi tức thì**: optimistic update + undo thay vì dialog xác nhận nặng nề.
5. **Khoảng trắng & bo góc lớn**: dùng `RADIUS.lg/xl`, tăng padding, bóng mềm `SHADOWS.sm`.

## 3. Đề xuất cụ thể

### 3.1 Quick-Add nổi (FAB) + nhập đa phương thức gom về một chỗ
- Nút **FAB** ở góc dưới phải xuyên suốt các tab chính, mở **bottom sheet nhập nhanh** gồm:
  ô gõ tự nhiên + nút mic + nút camera (tái dùng logic đã có trong `ChatScreen`).
- Lợi ích: người dùng ghi giao dịch từ bất kỳ màn nào, không phải nhảy về tab Chat.

### 3.2 Transaction card tối giản
- Layout: `[icon danh mục tròn] Mô tả (đậm) · meta mờ ………… Số tiền (lớn, màu semantic)`.
- Thu/chi phân biệt bằng màu chữ số tiền (`income`/`expense`) thay vì nhãn dài.
- Bỏ viền nặng, dùng nền `surface` + bóng mềm; spacing thoáng.

```
┌─────────────────────────────────────────────┐
│  🍜   Ăn phở                      − 50.000 ₫  │
│       Hôm nay · Tiền mặt                       │
└─────────────────────────────────────────────┘
```

### 3.3 Nhóm theo ngày (section list) + sticky header
- Gom giao dịch theo "Hôm nay / Hôm qua / 12 thg 6" với tiêu đề dính (sticky) và tổng chi mỗi ngày.
- Dùng `SectionList` thay `FlatList` phẳng.

### 3.4 Swipe-to-delete + Undo (tận dụng soft-delete sẵn có)
- Vuốt trái thẻ giao dịch → xóa mềm ngay (gọi `deleteTransaction`), hiện **snackbar "Đã xóa —
  Hoàn tác"** đếm ngược ~5s. Bấm Hoàn tác → gọi `restore` (backend cho 30s).
- Bỏ Alert xác nhận xóa thông thường → mượt hơn, ít gián đoạn.

### 3.5 Preview giao dịch dạng thẻ chỉnh sửa nhanh
- `TransactionPreviewCard` (đã có) nâng cấp: cho phép sửa nhanh số tiền/danh mục/ngày ngay trên
  thẻ trước khi xác nhận, thay vì phải gõ lại câu chat.
- Chip danh mục chọn nhanh; nếu AI gợi ý danh mục mới (Luồng 1) → hiện nút "Tạo danh mục".

### 3.6 Empty states & micro-interactions
- Empty state có hình minh họa + 1 câu CTA (đã làm ở `BudgetScreen`/`RecurringScreen`, áp cho
  Transaction).
- **Haptic feedback** (`expo-haptics`) khi lưu/xóa thành công; animation số dư đếm lên khi cập nhật.
- Skeleton loading thay spinner trống (mẫu `SkeletonBudget` đã có).

### 3.7 Dark mode
- Palette `constants.js` đã tách rõ token màu. Bổ sung biến thể tối (background `#0F0F23`, surface
  `#1A1A2E`, đảo text) + context `theme`. Là hạng mục nâng cao, làm sau cùng.

## 4. Roadmap theo giai đoạn

| Giai đoạn | Hạng mục | Ưu tiên | Phụ thuộc |
|---|---|---|---|
| 1 | Transaction card tối giản + nhóm theo ngày (SectionList) | Cao | Không |
| 1 | Swipe-to-delete + Undo (dùng soft-delete/restore sẵn có) | Cao | Không |
| 2 | FAB Quick-Add bottom sheet (gom chat/mic/camera) | Cao | Tách logic từ ChatScreen |
| 2 | Preview card chỉnh sửa nhanh + gợi ý danh mục mới | Trung bình | Luồng 1 (backend) |
| 3 | Haptic + micro-animation + skeleton | Trung bình | expo-haptics |
| 3 | Dark mode | Thấp | Theme context |

## 5. Lưu ý kỹ thuật

- Tuân thủ Expo SDK 54 — đọc `frontend/AGENTS.md` (yêu cầu xem docs versioned trước khi code).
- Swipe cần `react-native-gesture-handler` (kiểm tra đã có trong `package.json` trước khi thêm).
- Giữ nguyên API hiện có; phần lớn cải tiến nằm ở tầng trình bày, ít chạm backend (trừ Luồng 1).
- Đo lường: thời gian từ "mở app" đến "ghi xong 1 giao dịch" nên ≤ 5 giây — dùng làm tiêu chí
  nghiệm thu UX trong báo cáo.


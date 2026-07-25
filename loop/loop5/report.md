# Loop 5 — Báo cáo phản biện (Niên luận cơ sở ngành PERFIN)

Ngày: 2026-07-25. Người phản biện: đóng vai giảng viên hướng dẫn.
Phạm vi loop này: **kiểm chứng trực tiếp sản phẩm Demo** (backend) — bugs, an toàn
truy vấn, và đối chiếu tính đúng giải thuật giữa code và công thức trong Chương 2.
Đây là phần chưa được critique đầy đủ ở các loop trước (loop1 agent demo bị lỗi credit).

Nguồn đã chạy/đọc trực tiếp trong loop này (có căn cứ, không suy đoán):
- Chạy thật `node --test`: goal planner (12/12 pass), analytics + budget (34/34 pass)
- `demo/backend/models/transaction.model.js` (luồng transaction, phân trang, sort)
- `demo/backend/services/transactions/query.js` (validation sort_by/sort_order)
- `demo/backend/services/analytics/algorithms.js` (hằng số z=2,5; IQR=1,5)
- `demo/backend/index.js` (error middleware, bootstrap), `package.json` scripts

---

## PHẦN 1 — SẢN PHẨM DEMO (trọng tâm loop này)

### 1.1 Điểm đạt — đã kiểm chứng bằng chạy thật (ghi nhận)

**[D-04] (ĐẠT — verified) Test giải thuật thuần chạy được và pass.**
Chạy trực tiếp không cần DB: goal planner 12/12, analytics/budget 34/34. Các test phủ
negative amortization, off-track schedule, z-score/IQR outlier, runway null khi không
chi, subscription clustering, Pearson correlation, budget 50/30/20 và forecast. Đây là
bằng chứng runtime thật cho tuyên bố "100/100 backend test" ở mức các module thuần.

**[D-05] (ĐẠT — verified) Code khớp công thức Chương 2.**
`algorithms.js` có `Z_ANOMALY: 2.5` và `IQR_MULT: 1.5`, khớp chính xác công thức trong
báo cáo (§2.3.2: cờ khi $z_i\geq2{,}5$ hoặc $x_i>Q_3+1{,}5\,IQR$). Không có lệch
giữa lý thuyết trình bày và hiện thực — điểm cộng cho tính trung thực của báo cáo.

**[D-06] (ĐẠT — verified) Không có lỗ hổng SQL injection.**
131 placeholder `$1..$N` trong models. Một chỗ nội suy chuỗi duy nhất
(`transaction.model.js:226`, `WHERE ${where.join(' AND ')}`) chỉ ghép các mệnh đề
hard-code có sẵn `$N`; mọi giá trị người dùng đi qua mảng `params`. ORDER BY
(`:228`) nội suy `SORT_EXPRESSIONS[sort_by]` và `direction`, nhưng cả hai được
whitelist: `sort_by` kiểm qua `hasOwnProperty` trên object `Object.freeze`, `sort_order`
kiểm `['asc','desc']`. Kết luận: an toàn, không phải bug.

**[D-07] (ĐẠT — verified) Xử lý lỗi và giao dịch nguyên tử.**
`index.js` có global error middleware + 404 handler; routes dùng `next(error)`.
Model dùng `BEGIN/COMMIT/ROLLBACK` với rollback trong `catch` và `client.release()`
trong `finally`. Cập nhật ví kiểm `rowCount` và ném lỗi 400 nếu ví không thuộc user.

### 1.2 Điểm còn hạn chế (đã khai báo, không phải bug mới)

**[D-03, tồn từ loop1] user-scope theo ID.** `default_user`; một số thao tác theo ID
chưa kèm điều kiện user. Đã ghi ở Chương 4 Hạn chế. Chấp nhận ở mức niên luận cơ sở.

**[D-08] (THẤP) Thiếu README backend/frontend hướng dẫn build-run.**
`demo/backend` không có README riêng; chỉ có `.env.example` và scripts trong
`package.json`. Không chặn điểm nhưng nên có 1 đoạn "cách chạy" cho người chấm.

---

## PHẦN 2 — BÁO CÁO LATEX

Không mở finding LaTeX mới trong loop này. Các mục đã đóng: L-01 (loop1), L-02 (loop4),
L-07 (loop3). Còn lại L-04/L-05 (restyle + regen diagram theo palette) — thuần thẩm mỹ,
quy tắc đường thẳng/không chồng chéo đã đạt (xác minh loop2).

---

## XẾP HẠNG & KẾT LUẬN LOOP 5

Demo được kiểm chứng trực tiếp là **chắc chắn về kỹ thuật**: test thuần pass, code khớp
công thức, không injection, transaction nguyên tử, error handling đầy đủ. Không có bug
chặn điểm nào phát hiện được trong phạm vi chạy offline.

Bắt buộc sửa: không có mục mới ở loop này.
Tùy chọn (thấp): D-08 (README run demo).
Còn treo (thẩm mỹ): L-04/L-05 diagram palette — ứng viên cho loop6.

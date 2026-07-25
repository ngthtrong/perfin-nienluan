# Loop 11 — Bảo mật: phân quyền theo user (IDOR)

## Phạm vi lop này

**Vùng kiểm mới (chưa từng kiểm ở loop 1–10):** phân quyền theo người dùng —
mọi thao tác theo ID trên toàn bộ 8 route file, kiểm thử truy cập chéo thật.

Loop5 đã kiểm SQL injection và kết luận sạch (131 placeholder tham số hóa,
1 truy vấn nội suy được xác minh an toàn). Lop này kiểm **mặt còn lại của bảo
mật** mà loop5 không chạm: một ID hợp lệ nhưng **không thuộc về người gọi**.

**Bỏ qua:** LaTeX hình thức (loop8), skeleton (loop9), lỗi/rỗng (loop10).

**Điểm khởi phát:** chính báo cáo tự nêu ở ch4 §Hạn chế mục 8 — "một số thao tác
theo ID chưa luôn kèm điều kiện user". Lop này đi xác minh lời tự thú đó thay vì
tin ngay, và nó **đúng**.

---

## Phần 2 — Demo

### D-11 (mức 3, lỗi bảo mật) — 11 endpoint cho phép đọc/sửa/xóa bản ghi của người dùng khác

Rà toàn bộ `req.params.id` trên 8 route file. Kết quả rõ ràng — 6/8 file đã làm
đúng, 2 file không:

| Route file | Truyền `userId`? |
|---|---|
| transaction, category, account, cashflow, export, goal | Có, ở **mọi** thao tác |
| **budget** | **Không — 3 endpoint** |
| **recurring** | **Không — 8 endpoint** |

Bằng chứng mã, `routes/budget.routes.js:75,85,95` (trước sửa):

```js
const data = await BudgetModel.getById(req.params.id);   // không có userId
const data = await BudgetModel.update(req.params.id, req.body);
const data = await BudgetModel.delete(req.params.id);
```

và `models/budget.model.js:42` (trước sửa):

```sql
FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.id = $1
```

ID là số nguyên tăng dần, nên chỉ cần đổi số trên URL là chạm được bản ghi của
người khác. Không có tầng nào phía trên bù lại: không middleware, không service
chặn giữa.

Nghiêm trọng nhất là **5 lượt gọi trong `routes/chat.routes.js`** (`:438`,
`:473`, `:475`, `:486`, `:492`, `:506`, `:935`): ở đó `bill_id` đến từ **văn bản
người dùng do LLM bóc tách**. Đây đúng là ranh giới mà cả báo cáo lập luận phải
canh giữ — LLM được phép hiểu ý định nhưng không được vượt quyền dữ liệu.

**Xác minh trực tiếp trên PostgreSQL live** (không suy đoán): tạo hồ sơ thứ hai
`victim_user`, chèn 1 ngân sách (id=56) và 1 khoản định kỳ (id=7) thuộc hồ sơ
đó, rồi gọi API bằng `default_user` với đúng ID vừa tạo.

Sau khi sửa:

```
GET    /api/budgets/56            → 404 {"error":"Không tìm thấy ngân sách"}
PUT    /api/budgets/56            → 404
DELETE /api/budgets/56            → 404
GET    /api/recurring/7           → 404
PUT    /api/recurring/7           → 404
DELETE /api/recurring/7           → 404
POST   /api/recurring/7/pause     → 404
POST   /api/recurring/7/resume    → 404
POST   /api/recurring/7/pay       → 404
GET    /api/recurring/7/payments  → 404
Nhóm chứng: GET /api/budgets/11 → 200 · GET /api/recurring/3/payments → 200
```

10/10 lượt truy cập chéo bị chặn, 2/2 truy cập hợp lệ vẫn hoạt động. Đã xóa
sạch dữ liệu thử nghiệm (`remaining victim rows = 0`).

### D-12 (mức 3) — Endpoint lịch sử thanh toán tiết lộ sự tồn tại của ID

Trong quá trình xác minh D-11 phát hiện thêm: sau khi scope model,
`GET /api/recurring/7/payments` trả **200 với `payments: []`** thay vì 404 — vì
truy vấn lịch sử scope đúng theo `user_id` nên không rò dữ liệu, nhưng route
không kiểm tra quyền sở hữu hóa đơn trước. Kết quả là vẫn phân biệt được "ID
tồn tại nhưng của người khác" với "ID không tồn tại".

Đã thêm kiểm tra sở hữu ở route trước khi trả lịch sử.

### Đã kiểm và ĐẠT (lop sau không cần kiểm lại)

- **6/8 route file vốn đã đúng:** transaction, category, account, cashflow,
  export, goal đều truyền `userId` ở mọi thao tác theo ID.
  `models/transaction.model.js` là mẫu tham chiếu tốt: `getJoinedById`,
  `lockOwnedCategories`, `lockOwnedWallets` đều nhận `userId`.
- **Worker/scheduler không cần scope theo request:** `getJoined` giữ tham số
  `userId = null` cho các lượt gọi nội bộ (sau `create`, và trong transaction
  của `recordPayment`) vì các đường này đã tự biết chủ sở hữu. Chủ ý, có comment.
- **Không phát sinh lỗi SQL injection mới:** mọi điều kiện thêm vào đều dùng
  placeholder (`$2`, `$3`, `$12`), không nội suy chuỗi — giữ đúng kết luận loop5.

---

## Phần 1 — Báo cáo LaTeX

### L-14 (mức 2) — Báo cáo mô tả sai hiện trạng sau khi sửa

Sau D-11/D-12, **5 chỗ** trong báo cáo trở thành mô tả sai (mức 2: khẳng định
không khớp thực tế). Đã đồng bộ cả hai ngôn ngữ:

| Vị trí | Trước | Sau |
|---|---|---|
| ch4 §Hạn chế mục 8 | "một số thao tác theo ID chưa luôn kèm điều kiện user" | đã scoped + có test truy cập chéo, nhưng vẫn chưa có xác thực |
| ch3 §Bảo mật | "một số thao tác theo ID chưa kèm user scope" | đã rà soát toàn bộ, kèm bảng kết quả |
| ch3 Bảng trạng thái, dòng Auth | "`default_user`, ID chưa luôn scoped" | đã scoped, chưa có xác thực |
| ch4 §Hướng phát triển mục 1 | user scope là việc **cần làm** | user scope đã có; còn Redis worker + fault injection |
| ch3 Bảng kết quả đo | 178/178 test | 182/182 test, 38 tệp |

Điểm cần giữ đúng mức: **không** nâng thành "đã có phân quyền". Điều kiện
`user_id` là đường nâng cấp multi-user, **không** phải cơ chế xác thực — cả hai
bản đều diễn đạt đúng như vậy, và §Hạn chế vẫn giữ lời tự nhận chưa có
authentication.

### Hình mới: không cần

Thay vào đó thêm **một bảng** (`tab:idor-verification`) vì có khẳng định mới cần
bằng chứng: "đã kiểm thử truy cập chéo". Bảng trả lời đúng câu hỏi "thử những
endpoint nào, kết quả ra sao". Đây là dữ liệu dạng bảng, không phải quan hệ
không gian — nên bảng đúng hơn sơ đồ. 13 sơ đồ hiện có vẫn **đủ**.

---

## Bước 3 — Bảng chốt danh sách sửa

| Mã | Mô tả | Mức | Quyết định |
|---|---|---|---|
| D-11 | 11 endpoint budget/recurring cho phép đọc/sửa/xóa bản ghi người khác qua ID; 5 lượt trong số đó nằm trên đường LLM bóc tách | 3 (bảo mật) | **SỬA NGAY** |
| D-12 | `GET /recurring/:id/payments` trả 200 rỗng, tiết lộ ID tồn tại | 3 | **SỬA NGAY** |
| L-14 | 5 chỗ trong báo cáo mô tả sai hiện trạng sau khi sửa; số test lỗi thời | 2 | **SỬA NGAY** |
| — | Thêm authentication/JWT thật | — | **GIỮ NGUYÊN** — ch1 §Phạm vi đã tuyên bố rõ ngoài phạm vi; thêm vào sẽ phình quy mô niên luận cơ sở ngành |

---

## Bước 4 — Kết quả thực thi và xác minh

### Đã sửa (code thật)

**Model** — `budget.model.js`: `getById/update/delete` nhận `userId`, mọi truy
vấn thêm `AND user_id = $n`; `update` trả `null` nếu không có hàng khớp, và
**không ghi `budget_history`** khi bị từ chối (tránh để lại vết cho thao tác
thất bại). `recurringBill.model.js`: scope tại nguồn ở `getJoined` — một chỗ
sửa che 6 lượt gọi; thêm `userId` cho `update/delete/pause/resume/`
`recordPayment/getPaymentHistory`; SELECT khóa hàng trong `recordPayment`
(`FOR UPDATE OF b`) cũng được scope, nên không thể ép thanh toán lên hóa đơn
người khác.

**Route** — `budget.routes.js` 3 lượt, `recurring.routes.js` 8 lượt,
`chat.routes.js` 7 lượt (đường LLM). Thêm kiểm tra sở hữu cho endpoint
`/payments` (D-12).

**Test hồi quy** — `tests/user-idor-scope.test.js`, 4 ca. Điểm thiết kế quan
trọng: các ca này **assert trên câu SQL phát ra**, không chỉ giá trị trả về —
vì hệ thống chỉ có một hồ sơ demo nên truy vấn thiếu `user_id` vẫn trả đúng bản
ghi và test kiểu thông thường sẽ **pass giả**.

Đã tự kiểm test có thật sự bắt lỗi (negative control): xóa tay điều kiện
`user_id` khỏi `budget.model.js` →

```
✖ budget read and delete by id are scoped to the caller
ℹ pass 3   ℹ fail 1
```

rồi hoàn nguyên. Test không phải trang trí.

### Xác minh

```
$ cd demo/backend && npm test
ℹ tests 182   ℹ pass 182   ℹ fail 0   ℹ duration_ms 3397
```

Trong đó **2 test cũ đã fail và được sửa đúng cách**, báo nguyên văn theo yêu
cầu Bước 4:

```
✖ recordPayment rejects a stale expected period with a 409 and rolls back
  actual:   [ 'BEGIN', 'SELECT b.* ... WHERE b.id = $1 AND b.user_id = $2 FOR UPDATE OF b', 'ROLLBACK' ]
  expected: [ 'BEGIN', 'SELECT b.* ... WHERE b.id = $1 FOR UPDATE OF b', 'ROLLBACK' ]
✖ recordPayment requires an expected period so retries cannot pay the next cycle
  (cùng nguyên nhân)
```

Hai assertion này **pin nguyên văn câu SQL cũ**, tức là chúng đang khóa chính
lỗ hổng vào chỗ. Đã cập nhật assertion sang câu SQL đã scope — không phải nới
lỏng test để cho qua.

LaTeX:

```
$ cd latex && rm -f main-*.pdf && make          → exit 0
$ touch config/preamble.tex && make            → exit 0 (pass 2, ổn định TOC/LoT)
main-vi: overfull-hbox=0  undefined-ref=0
main-en: overfull-hbox=0  undefined-ref=0
```

PDF mới hơn nguồn (20:59:13 / 20:59:22 vs 20:56:44). 13 sơ đồ nhúng đủ.
Nhãn `tab:idor-verification` phân giải ở cả hai bản (`main-{vi,en}.aux`).

Đối chiếu song ngữ — **khớp tuyệt đối** sau khi thêm bảng mới:

| | section | subsection | subsubsection | label | ref | cite | caption |
|---|---|---|---|---|---|---|---|
| vi | 20 | 36 | 33 | 28 | 31 | 17 | 23 |
| en | 20 | 36 | 33 | 28 | 31 | 17 | 23 |

Danh mục bảng: 23 bảng ở cả hai bản.

Không chạm frontend nên không chạy `ui:smoke`.

### Đồng bộ tài liệu và artifact

`resource/Report.md` đã cập nhật 5 vị trí khớp LaTeX. Tạo artifact
`log/idor-verification_2026-07-25.json` (phương pháp, 11 endpoint, kết quả,
nhóm chứng, teardown, negative control) để mọi số trong bảng mới truy được về
`log/`. Cập nhật `log/backend-test-run_2026-07-25.json` thành 182/182 kèm mốc
lịch sử 100 → 178 → 182.

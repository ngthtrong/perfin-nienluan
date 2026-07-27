# loop17 — final holistic pass and stopping-condition assessment

## Mục đích

Vòng cuối không tìm defect mới theo một trục hẹp mà kiểm tra lại toàn bộ
bất biến mà 9 vòng trước đã dựa vào, rồi đánh giá xem còn đáng chạy thêm
vòng nữa hay không.

## Kết quả kiểm chứng (đã chạy, không suy luận)

| Cổng | Kết quả | Ghi chú |
|---|---|---|
| `make all` (LaTeX vi + en) | exit 0 | 0 undefined reference, 0 LaTeX error, 0 `??` |
| Overfull hbox | vi 2 / en 0 | Hai ca vi còn lại là 1,90 pt và 1,88 pt (≈0,07 mm), tồn tại từ trước loop8 |
| Parity song ngữ | trùng khớp | section 20, subsection 36, subsubsection 33, label 57, ref 50, cite 21, caption 23 |
| Hình / bảng | vi = en | LoF 13, LoT 23; hình đánh số liên tục 1..13 ở cả hai bản |
| Trích dẫn | 18/18 | Không còn tham chiếu định nghĩa mà không được trích (đã sửa ở loop13) |
| Từ viết tắt | 29 dòng mỗi bản | Danh sách sắp xếp đúng, không còn mục thừa/thiếu (loop15) |
| `npm test` (backend) | 182/182 | 0 fail; gồm 4 ca hồi quy IDOR thêm ở loop11 |
| `npm run test:ai` | 31/31 strict | exit 0 |
| `npm run ui:smoke` | 4/4 | exit 0, ảnh render thật trong chat |

Full API/DB/media smoke **không chạy** trong vòng này: lệnh ghi vào
PostgreSQL live và gọi provider có phí, và người dùng đã từ chối lệnh đó.
Kết quả 23/23 trong báo cáo vẫn là số của đợt 16/07/2026, không phải số
mới của phiên này — báo cáo đang mô tả đúng như vậy.

## Quan sát ngoài phạm vi công việc của tôi

`latex/config/preamble.tex` đã bị sửa ngoài chuỗi loop này: `\reportfigure`
giờ thêm `\clearpage` và đổi float sang `[p]` với `height=0.86\textheight`
(trước là `[H]`, `0.72`). Hệ quả: mỗi sơ đồ chiếm trọn một trang, nên số
trang tăng vi 75→80 và en 81→86 dù không có nguồn chương nào đổi. Đồng thời
có ba script chưa track: `latex/figures/{compact,split,seqsplit}.py`.

Tôi giữ nguyên các thay đổi này, không revert và không commit chúng, vì
chúng không thuộc defect nào tôi đang sửa và có vẻ là công việc đang làm dở
của người khác. Build vẫn sạch với chúng.

## Đánh giá điều kiện dừng

Chín vòng (8–16) tìm được 13 defect thật. Phân bố theo vòng:

- loop8: 4 (mất evidence `log/`, path chết, số test cũ, so sánh sai tập)
- loop9: 2 (skeleton, a11y busy)
- loop10: 3 (xác nhận xóa, hitSlop, a11y alert)
- loop11: 3 (**IDOR 11 endpoint**, 404 payments, đồng bộ báo cáo)
- loop12: 3 (cạnh bo, tràn bảng 81 pt, cross-ref hình)
- loop13: 1 (4 trích dẫn chưa dùng)
- loop14: 1 (15 cross-ref hardcode)
- loop15: 1 (danh sách viết tắt)
- loop16: 1 (12 màu hardcode)

Xu hướng rõ: bốn vòng đầu tìm được lỗi có hậu quả thật (mất bằng chứng,
IDOR, số liệu sai tập); năm vòng sau chỉ còn lỗi hình thức và nhất quán,
mỗi vòng một lỗi, không lỗi nào ảnh hưởng tới tính đúng của dữ liệu hay
kết luận. Đó là dấu hiệu vùng dễ kiểm bằng công cụ đã cạn.

**Khuyến nghị: dừng chuỗi loop tự động.** Việc còn lại cần đo thật chứ
không cần rà thêm:

1. Benchmark OCR/STT có ground truth (CER/WER) — hiện là khoảng trống lớn
   nhất và báo cáo đang thừa nhận đúng.
2. Numeric faithfulness checker cho grounded narration — NFR-03 vẫn là
   "thiết kế đích".
3. Redis worker chạy live + fault injection.
4. p50/p95 trên ≥30 lượt/luồng và UAT.

Ba việc đầu đều cần dữ liệu hoặc hạ tầng chưa có trong môi trường này
(tập ảnh/audio gán nhãn, Redis/Docker trên WSL), nên không vòng rà soát
tĩnh nào tạo ra được chúng.

## Nợ kỹ thuật đã ghi nhận, không sửa

- `theme.spacing` định nghĩa và export nhưng **0 lần được dùng**; 464/777
  giá trị padding/margin/gap nằm ngoài scale. Sửa hàng loạt là refactor
  lớn, không đổi pixel nào, rủi ro cao hơn lợi ích — nên để chủ dự án
  quyết định (loop16 đã ghi).
- 7 chỗ `#fff` còn lại nằm trên nền không thuộc họ brand (`income`,
  `chatUserBubble`, scrim mờ, thumb của Switch); đổi sang `onBrand` sẽ sai
  ngữ nghĩa nên giữ nguyên.
- Token API trong lịch sử git đã push: cần rotate ở phía nhà cung cấp.
  Đã untrack `.claude/settings.json` (`b09c2b6`) để không tái diễn.

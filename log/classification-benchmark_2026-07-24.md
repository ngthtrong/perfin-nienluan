# Thí nghiệm: Classification benchmark (local parser)

- Ngày chạy: 2026-07-24T14:22:14.963Z
- Commit: `5f03476` · Node v24.16.0
- Dataset: `dataFinance.csv` — 5265 dòng gán nhãn
- SHA-256 dữ liệu: `a9b7cf1b390227e532bf286623cd25d546b656bb7161e422079dd003027ca94f`

## Kết quả tổng hợp

| Chỉ số | Giá trị |
|---|---|
| Accuracy (micro) | 29.36% |
| Macro-F1 | 0.1770 |
| Weighted-F1 | 0.3013 |
| Số lớp có mẫu | 12 |
| Tổng mẫu | 5265 |
| Accuracy (loại "Khác") | 27.52% |
| Macro-F1 (loại "Khác") | 0.1856 |

## Chỉ số theo từng danh mục

| Danh mục | Support | Precision | Recall | F1 |
|---|---|---|---|---|
| Ăn uống | 2251 | 0.747 | 0.343 | 0.470 |
| Di chuyển | 491 | 0.593 | 0.984 | 0.740 |
| Đầu tư | 3 | 0.000 | 0.000 | 0.000 |
| Giải trí | 660 | 0.667 | 0.012 | 0.024 |
| Giáo dục | 342 | 0.409 | 0.053 | 0.093 |
| Hóa đơn & Dịch vụ | 356 | 0.087 | 0.006 | 0.011 |
| Khác | 433 | 0.073 | 0.499 | 0.128 |
| Lương | 67 | 1.000 | 0.134 | 0.237 |
| Mua sắm | 38 | 0.164 | 0.500 | 0.247 |
| Nhà cửa | 150 | 0.209 | 0.060 | 0.093 |
| Sức khỏe | 80 | 0.143 | 0.025 | 0.043 |
| Thể thao | 394 | 0.727 | 0.020 | 0.040 |

## Phân tích lỗi

- Tổng số sai: 3719 / 5265
- Số ca liên quan lớp "Khác": 2957

Ví dụ ca sai (tối đa 25):

| Câu | Gold | Dự đoán | Nhãn gốc |
|---|---|---|---|
| xin mẹ tiền ăn | Khác | Ăn uống | Family |
| lời MFS | Đầu tư | Khác | Invest |
| DNSE | Đầu tư | Khác | Invest |
| xin mẹ tiền ăn | Khác | Ăn uống | Family |
| xin mẹ tiền ăn | Khác | Ăn uống | Family |
| mẹ cho tiền tuần | Khác | Tạp hóa | Family |
| mẹ cho tiền đổ xăng | Khác | Di chuyển | Family |
| xin mẹ tiền ăn | Khác | Ăn uống | Family |
| dượng 3 + mợ 5 cho tiền | Khác | Tạp hóa | Clan |
| mẹ cho tiền chơi | Khác | Tạp hóa | Family |
| mẹ cho tiền đi ctho | Khác | Tạp hóa | Family |
| mẹ cho tiền ăn + tiền đóng ktx | Khác | Tạp hóa | Family |
| xin tiền trả xe để trả shopeee | Khác | Di chuyển | Family |
| mẹ cho tiền ăn + xin tiền trả xe để trả shopeee | Khác | Tạp hóa | Family |
| mẹ cho tiền đi chơi  | Khác | Tạp hóa | Family |
| xin tiền mẹ mua đồ ăn | Khác | Mua sắm | Family |
| mẹ cho tiền đánh cầu | Khác | Tạp hóa | Family |
| học phí 1-III | Khác | Giáo dục | Family |
| mẹ cho tiền ăn snags | Khác | Tạp hóa | Family |
| mẹ cho tiền chơi | Khác | Tạp hóa | Family |
| xin mẹ tiền học phí bù tiền mua ram | Khác | Giáo dục | Family |
| mẹ cho tiền đi Hoà An | Khác | Tạp hóa | Family |
| mẹ cho tiền đánh cầu | Khác | Tạp hóa | Family |
| mẹ cho tiền đánh cầu | Khác | Tạp hóa | Family |
| mẹ cho tiền đi chơi vs kiên | Khác | Tạp hóa | Family |

## Ma trận nhầm lẫn (hàng = gold, cột = dự đoán)

| gold\pred | Ăn uống | Di chuyển | Đầu tư | Giải trí | Giáo dục | Hóa đơn & Dịch vụ | Khác | Lương | Mua sắm | Nhà cửa | Sức khỏe | Thể thao |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ăn uống | 772 | 15 | 0 | 0 | 1 | 8 | 1414 | 0 | 7 | 15 | 0 | 1 |
| Di chuyển | 0 | 483 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 |
| Đầu tư | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 |
| Giải trí | 214 | 20 | 2 | 8 | 4 | 2 | 382 | 0 | 10 | 10 | 0 | 0 |
| Giáo dục | 4 | 233 | 0 | 0 | 18 | 0 | 80 | 0 | 3 | 0 | 1 | 2 |
| Hóa đơn & Dịch vụ | 0 | 5 | 1 | 2 | 2 | 2 | 312 | 0 | 22 | 2 | 0 | 0 |
| Khác | 39 | 27 | 3 | 2 | 13 | 0 | 216 | 0 | 7 | 5 | 11 | 0 |
| Lương | 0 | 0 | 0 | 0 | 1 | 0 | 49 | 9 | 8 | 0 | 0 | 0 |
| Mua sắm | 0 | 0 | 0 | 0 | 1 | 0 | 15 | 0 | 19 | 0 | 0 | 0 |
| Nhà cửa | 4 | 16 | 1 | 0 | 2 | 11 | 99 | 0 | 6 | 9 | 0 | 0 |
| Sức khỏe | 0 | 0 | 1 | 0 | 2 | 0 | 37 | 0 | 5 | 2 | 2 | 0 |
| Thể thao | 0 | 15 | 0 | 0 | 0 | 0 | 341 | 0 | 29 | 0 | 0 | 8 |

## Ghi chú phương pháp

Nhãn gold ánh xạ từ taxonomy lịch sử; alias parser trùng một phần lược đồ nên đánh giá độc lập về câu chữ, không hoàn toàn độc lập về lược đồ danh mục.

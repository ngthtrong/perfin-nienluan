# Thí nghiệm: Classification benchmark (local parser)

- Ngày chạy: 2026-08-02T09:08:38.438Z
- Commit: `4fddc64` · working tree dirty: yes · Node v24.16.0
- Dataset: `dataFinance.csv` — 5265 dòng gán nhãn
- SHA-256 dữ liệu: `a9b7cf1b390227e532bf286623cd25d546b656bb7161e422079dd003027ca94f`
- SHA-256 mapping: `a1c9758022eeced80600cc2be877c0cf88067ccd6d203ade52229528564c255c`
- SHA-256 mã runner/runtime: `402ac6ee36a509ada56ca6165e9518218016f62299f919e14d7c435ecefe3075`

## Kết quả chính: joint type/category

| Chỉ số | Giá trị |
|---|---|
| Accuracy (micro) | 26.12% |
| Macro-F1 | 0.1559 |
| Weighted-F1 | 0.2913 |
| Số lớp có mẫu | 13 |
| Tổng mẫu | 5265 |
| Accuracy (loại "Khác") | 27.52% |
| Macro-F1 (loại "Khác") | 0.1856 |

Metric chính ghép loại giao dịch với tên danh mục, ví dụ `expense/Khác`
và `income/Khác` là hai nhãn khác nhau.

## Đối chiếu phụ: category name only

| Chỉ số | Giá trị |
|---|---|
| Accuracy | 29.36% |
| Macro-F1 | 0.1770 |
| Weighted-F1 | 0.3013 |
| Accuracy (loại "Khác") | 27.52% |
| Macro-F1 (loại "Khác") | 0.1856 |

## Chỉ số theo từng nhãn joint

| Danh mục | Support | Precision | Recall | F1 |
|---|---|---|---|---|
| expense/Ăn uống | 2251 | 0.747 | 0.343 | 0.470 |
| expense/Di chuyển | 491 | 0.593 | 0.984 | 0.740 |
| expense/Giải trí | 660 | 0.667 | 0.012 | 0.024 |
| expense/Giáo dục | 342 | 0.409 | 0.053 | 0.093 |
| expense/Hóa đơn & Dịch vụ | 356 | 0.087 | 0.006 | 0.011 |
| expense/Khác | 83 | 0.015 | 0.542 | 0.030 |
| expense/Mua sắm | 38 | 0.164 | 0.500 | 0.247 |
| expense/Nhà cửa | 150 | 0.209 | 0.060 | 0.093 |
| expense/Sức khỏe | 80 | 0.143 | 0.025 | 0.043 |
| expense/Thể thao | 394 | 0.727 | 0.020 | 0.040 |
| income/Đầu tư | 3 | 0.000 | 0.000 | 0.000 |
| income/Khác | 350 | 0.000 | 0.000 | 0.000 |
| income/Lương | 67 | 1.000 | 0.134 | 0.237 |

## Phân tích lỗi

- Tổng số sai: 3890 / 5265
- Số ca liên quan lớp "Khác": 3128
- Sai loại giao dịch thu/chi (bất kể tên danh mục): 427
- Đúng tên danh mục nhưng sai loại thu/chi: 171

Ví dụ ca sai (tối đa 25):

| Câu | Gold | Dự đoán | Nhãn gốc |
|---|---|---|---|
| xin mẹ tiền ăn | income/Khác | expense/Ăn uống | Family |
| xin mẹ tiền tuần | income/Khác | expense/Khác | Family |
| xin mẹ tiền tuần | income/Khác | expense/Khác | Family |
| lời MFS | income/Đầu tư | expense/Khác | Invest |
| xin mẹ tiền tuần | income/Khác | expense/Khác | Family |
| xin mẹ tiền tuần | income/Khác | expense/Khác | Family |
| xin mẹ tiền tuần | income/Khác | expense/Khác | Family |
| xin mẹ tiền xnagw | income/Khác | expense/Khác | Family |
| tiền võng | income/Khác | expense/Khác | Sell old things |
| DNSE | income/Đầu tư | expense/Khác | Invest |
| xin mẹ tiền ăn | income/Khác | expense/Ăn uống | Family |
| xin tiền mẹ đánh cầu | income/Khác | expense/Khác | Family |
| xin mẹ tiền ăn | income/Khác | expense/Ăn uống | Family |
| mẹ cho tiền tuần | income/Khác | expense/Tạp hóa | Family |
| mẹ cho tiền đổ xăng | income/Khác | expense/Di chuyển | Family |
| xin mẹ tiền tuần | income/Khác | expense/Khác | Family |
| xin tiền mẹ đi chơi | income/Khác | expense/Khác | Family |
| vay vốn sinh viên 2024 | income/Khác | expense/Khác | Cho vay |
| xin mẹ tiền tuần | income/Khác | expense/Khác | Family |
| xin tiền mẹ bida | income/Khác | expense/Khác | Family |
| dì chín cho tiền học | income/Khác | expense/Khác | Clan |
| xin mẹ tiền tuần | income/Khác | expense/Khác | Family |
| xin mẹ tiền đi chơi | income/Khác | expense/Khác | Family |
| xin mẹ tiền ăn | income/Khác | expense/Ăn uống | Family |
| xin tiền mẹ đánh cầu | income/Khác | expense/Khác | Family |

## Ma trận nhầm lẫn (hàng = gold, cột = dự đoán)

| gold\pred | expense/Ăn uống | expense/Di chuyển | expense/Giải trí | expense/Giáo dục | expense/Hóa đơn & Dịch vụ | expense/Khác | expense/Mua sắm | expense/Nhà cửa | expense/Sức khỏe | expense/Thể thao | income/Đầu tư | income/Khác | income/Lương | expense/Điện tử | expense/Làm đẹp | expense/Tạp hóa | income/Thưởng |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| expense/Ăn uống | 772 | 15 | 0 | 1 | 8 | 1412 | 7 | 15 | 0 | 1 | 0 | 2 | 0 | 0 | 0 | 18 | 0 |
| expense/Di chuyển | 0 | 483 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| expense/Giải trí | 214 | 20 | 8 | 4 | 2 | 381 | 10 | 10 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 8 | 0 |
| expense/Giáo dục | 4 | 233 | 0 | 18 | 0 | 79 | 3 | 0 | 1 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| expense/Hóa đơn & Dịch vụ | 0 | 5 | 2 | 2 | 2 | 312 | 22 | 2 | 0 | 0 | 1 | 0 | 0 | 3 | 1 | 1 | 3 |
| expense/Khác | 9 | 8 | 1 | 0 | 0 | 45 | 1 | 0 | 11 | 0 | 2 | 1 | 0 | 0 | 0 | 5 | 0 |
| expense/Mua sắm | 0 | 0 | 0 | 1 | 0 | 15 | 19 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 |
| expense/Nhà cửa | 4 | 16 | 0 | 2 | 11 | 99 | 6 | 9 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 | 0 |
| expense/Sức khỏe | 0 | 0 | 0 | 2 | 0 | 37 | 5 | 2 | 2 | 0 | 1 | 0 | 0 | 0 | 31 | 0 | 0 |
| expense/Thể thao | 0 | 15 | 0 | 0 | 0 | 339 | 29 | 0 | 0 | 8 | 0 | 2 | 0 | 0 | 0 | 1 | 0 |
| income/Đầu tư | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| income/Khác | 30 | 19 | 1 | 13 | 0 | 170 | 6 | 5 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 104 | 1 |
| income/Lương | 0 | 0 | 0 | 1 | 0 | 49 | 8 | 0 | 0 | 0 | 0 | 0 | 9 | 0 | 0 | 0 | 0 |

## Ghi chú phương pháp

Nhãn gold ánh xạ từ taxonomy lịch sử; alias parser trùng một phần lược đồ nên đánh giá độc lập về câu chữ, không hoàn toàn độc lập về lược đồ danh mục.

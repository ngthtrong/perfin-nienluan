# Thí nghiệm: Classification benchmark (local parser)

- Ngày chạy: 2026-08-14T02:26:30.684Z
- Commit: `c18e160` · working tree dirty: yes · Node v24.16.0
- Dataset: `dataFinance.csv` — 5328 dòng gán nhãn
- SHA-256 dữ liệu: `418a943958f12ae13902680e530e0be92a71acdec4f10707e0a1c75684fbaed7`
- SHA-256 mapping: `8072dc3d5749932adbd17775867d1918ad58f7209d92771dc7a860743c6b573c`
- SHA-256 mã runner/runtime: `8f412e356eb3b85dbaa3c6cea1b74fc354a093fe40d36fc34450f96ca84af71d`

## Kết quả chính: joint type/category

| Chỉ số | Giá trị |
|---|---|
| Accuracy (micro) | 26.16% |
| Macro-F1 | 0.1565 |
| Weighted-F1 | 0.2913 |
| Số lớp có mẫu | 13 |
| Tổng mẫu | 5328 |
| Accuracy (loại "Khác") | 27.51% |
| Macro-F1 (loại "Khác") | 0.1860 |

Metric chính ghép loại giao dịch với tên danh mục, ví dụ `expense/Khác`
và `income/Khác` là hai nhãn khác nhau.

## Đối chiếu phụ: category name only

| Chỉ số | Giá trị |
|---|---|
| Accuracy | 29.47% |
| Macro-F1 | 0.1778 |
| Weighted-F1 | 0.3016 |
| Accuracy (loại "Khác") | 27.51% |
| Macro-F1 (loại "Khác") | 0.1860 |

## Chỉ số theo từng nhãn joint

| Danh mục | Support | Precision | Recall | F1 |
|---|---|---|---|---|
| expense/Ăn uống | 2276 | 0.746 | 0.343 | 0.470 |
| expense/Di chuyển | 497 | 0.596 | 0.984 | 0.743 |
| expense/Giải trí | 677 | 0.692 | 0.013 | 0.026 |
| expense/Giáo dục | 343 | 0.395 | 0.050 | 0.088 |
| expense/Hóa đơn & Dịch vụ | 358 | 0.087 | 0.006 | 0.011 |
| expense/Khác | 85 | 0.016 | 0.577 | 0.032 |
| expense/Mua sắm | 39 | 0.164 | 0.487 | 0.245 |
| expense/Nhà cửa | 152 | 0.227 | 0.066 | 0.102 |
| expense/Sức khỏe | 80 | 0.143 | 0.025 | 0.043 |
| expense/Thể thao | 397 | 0.727 | 0.020 | 0.039 |
| income/Đầu tư | 3 | 0.000 | 0.000 | 0.000 |
| income/Khác | 354 | 0.000 | 0.000 | 0.000 |
| income/Lương | 67 | 1.000 | 0.134 | 0.237 |

## Phân tích lỗi

- Tổng số sai: 3934 / 5328
- Số ca liên quan lớp "Khác": 3163
- Sai loại giao dịch thu/chi (bất kể tên danh mục): 431
- Đúng tên danh mục nhưng sai loại thu/chi: 176

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
| expense/Ăn uống | 780 | 15 | 0 | 1 | 8 | 1429 | 7 | 15 | 0 | 1 | 0 | 2 | 0 | 0 | 0 | 18 | 0 |
| expense/Di chuyển | 0 | 489 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| expense/Giải trí | 222 | 20 | 9 | 4 | 2 | 389 | 10 | 10 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 8 | 0 |
| expense/Giáo dục | 4 | 233 | 0 | 17 | 0 | 81 | 3 | 0 | 1 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| expense/Hóa đơn & Dịch vụ | 0 | 5 | 2 | 2 | 2 | 314 | 22 | 2 | 0 | 0 | 1 | 0 | 0 | 3 | 1 | 1 | 3 |
| expense/Khác | 7 | 8 | 1 | 0 | 0 | 49 | 1 | 0 | 11 | 0 | 2 | 1 | 0 | 0 | 0 | 5 | 0 |
| expense/Mua sắm | 0 | 0 | 0 | 1 | 0 | 16 | 19 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 |
| expense/Nhà cửa | 4 | 16 | 0 | 2 | 11 | 100 | 6 | 10 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 | 0 |
| expense/Sức khỏe | 0 | 0 | 0 | 2 | 0 | 37 | 5 | 2 | 2 | 0 | 1 | 0 | 0 | 0 | 31 | 0 | 0 |
| expense/Thể thao | 0 | 15 | 0 | 0 | 0 | 342 | 29 | 0 | 0 | 8 | 0 | 2 | 0 | 0 | 0 | 1 | 0 |
| income/Đầu tư | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| income/Khác | 29 | 19 | 1 | 12 | 0 | 175 | 6 | 5 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 105 | 1 |
| income/Lương | 0 | 0 | 0 | 2 | 0 | 48 | 8 | 0 | 0 | 0 | 0 | 0 | 9 | 0 | 0 | 0 | 0 |

## Ghi chú phương pháp

Nhãn gold ánh xạ từ taxonomy lịch sử; alias parser trùng một phần lược đồ nên đánh giá độc lập về câu chữ, không hoàn toàn độc lập về lược đồ danh mục.

# Thí nghiệm: Feedback before/after (correction retrieval)

- Ngày chạy: 2026-08-02T09:09:28.493Z
- Commit: `4fddc64` · working tree dirty: yes · Node v24.16.0
- Dataset: `dataFinance.csv` — 4832 câu nội dung (đã loại "Khác")
- Category-correction eligible: 4756; loại 76 ca parser sai transaction type
- SHA-256 dữ liệu: `a9b7cf1b390227e532bf286623cd25d546b656bb7161e422079dd003027ca94f`
- SHA-256 mapping: `a1c9758022eeced80600cc2be877c0cf88067ccd6d203ade52229528564c255c`
- SHA-256 mã runner/runtime: `4fdde99f1da9a58bad1a7e4b223ce48c7aa1c858d061e9cf780049bffa1f2edc`
- Tỷ lệ seed: 0.5

## Phân hoạch dữ liệu

| Nhóm | Số câu |
|---|---|
| Toàn bộ dataset | 5265 |
| Nội dung sau khi loại "Khác" | 4832 |
| Loại vì parser sai transaction type | 76 |
| Đủ điều kiện category correction | 4756 |
| Parser đoán sai (nguồn seed+holdout) | 3426 |
| — Seed (ghi correction) | 1714 |
| — Holdout (phát lại) | 1712 |
| Parser vốn đã đúng (toàn bộ trước split) | 1330 |
| Nhóm chứng trong evaluation | 900 |
| Tổng evaluation (holdout + control) | 2612 |
| Nhóm chuẩn hóa ở seed | 636 |
| Nhóm chuẩn hóa ở evaluation | 1115 |
| Thành viên cùng nhóm seed bị loại khỏi evaluation (không ghi correction) | 430 |
| Khóa (type, mô tả chuẩn hóa) xuất hiện ở cả hai phía | **0** |

## Kết quả chính trên toàn bộ evaluation

Evaluation là hợp của 1712 ca parser-sai holdout và 900 ca parser-đúng làm nhóm chứng.

| Chỉ số | Trước (parser) | Sau (correction→parser) | Δ |
|---|---|---|---|
| Accuracy | 34.46% | 61.22% | 26.76 điểm |
| Macro-F1 | 0.3080 | 0.5898 | 0.2818 |
| Weighted-F1 | 0.3990 | 0.7072 | 0.3082 |

## Coverage và tác động theo loại truy hồi

| Loại | Applied | Coverage | Helped | Harmed | Net |
|---|---|---|---|---|---|
| Tất cả correction | 891 | 34.11% | 740 | 41 | 699 |
| feedback_exact | 0 | 0.00% | 0 | 0 | 0 |
| feedback_fuzzy | 891 | 34.11% | 740 | 41 | 699 |

Net accuracy delta kiểm tra chéo từ chuyển trạng thái: 699/2612 = 26.76 điểm phần trăm.

## Kết quả theo cohort

| Cohort | N | Accuracy trước | Accuracy sau | Coverage | Helped | Harmed | Net |
|---|---|---|---|---|---|---|---|
| parser_wrong_holdout | 1712 | 0.00% | 43.22% | 46.50% | 740 | 0 | 740 |
| control_parser_correct | 900 | 100.00% | 95.44% | 10.56% | 0 | 41 | -41 |

## Kiểm tra không suy giảm (nhóm chứng)

Nhóm chứng gồm các câu mà parser vốn đã phân loại đúng. Correction lý tưởng
không được làm chúng sai đi. Số ca "suy giảm" được tách thành hai loại:

| Chỉ số | Giá trị |
|---|---|
| Câu chuyển sai → đúng (toàn evaluation) | 740 |
| Câu chuyển đúng → sai (toàn evaluation) | 41 |
| Nhóm chứng bị làm sai (tổng) | 41/900 |
| — do nhiễu nhãn (cùng câu chữ, >1 nhãn gold trong dữ liệu) | 1 |
| — suy giảm thực (câu đơn nghĩa nhưng correction gán sai) | 40 |

## Ví dụ correction áp dụng (tối đa 25)

| Câu | Cohort | Gold | Parser | Sau | Loại khớp | Độ tin cậy |
|---|---|---|---|---|---|---|
| đồ dùng trong nhà | control_parser_correct | Nhà cửa | Nhà cửa | Hóa đơn & Dịch vụ | feedback_fuzzy | 0.9 |
| sân cầu lông | parser_wrong_holdout | Thể thao | Khác | Thể thao | feedback_fuzzy | 0.891 |
| card điện thoại | parser_wrong_holdout | Hóa đơn & Dịch vụ | Khác | Hóa đơn & Dịch vụ | feedback_fuzzy | 0.9 |
| hủ tiếu IUH | parser_wrong_holdout | Ăn uống | Khác | Ăn uống | feedback_fuzzy | 0.892 |
| tiền nước | parser_wrong_holdout | Ăn uống | Hóa đơn & Dịch vụ | Nhà cửa | feedback_fuzzy | 0.889 |
| ức gà + trứng | parser_wrong_holdout | Ăn uống | Khác | Ăn uống | feedback_fuzzy | 0.9 |
| gửi xe sư phạm | parser_wrong_holdout | Giáo dục | Di chuyển | Giáo dục | feedback_fuzzy | 0.916 |
| gửi xe sư phạm | parser_wrong_holdout | Giáo dục | Di chuyển | Giáo dục | feedback_fuzzy | 0.916 |
| tiền nước | parser_wrong_holdout | Ăn uống | Hóa đơn & Dịch vụ | Nhà cửa | feedback_fuzzy | 0.889 |
| gửi xe sư phạm | parser_wrong_holdout | Giáo dục | Di chuyển | Giáo dục | feedback_fuzzy | 0.916 |
| tiền nước | parser_wrong_holdout | Ăn uống | Hóa đơn & Dịch vụ | Nhà cửa | feedback_fuzzy | 0.889 |
| gửi xe sư phạm | parser_wrong_holdout | Giáo dục | Di chuyển | Giáo dục | feedback_fuzzy | 0.916 |
| nước suối | parser_wrong_holdout | Hóa đơn & Dịch vụ | Khác | Ăn uống | feedback_fuzzy | 0.889 |
| hủ tiếu | parser_wrong_holdout | Ăn uống | Khác | Ăn uống | feedback_fuzzy | 0.9 |
| nước suối | parser_wrong_holdout | Hóa đơn & Dịch vụ | Khác | Ăn uống | feedback_fuzzy | 0.889 |
| lăng nách | parser_wrong_holdout | Hóa đơn & Dịch vụ | Khác | Hóa đơn & Dịch vụ | feedback_fuzzy | 0.889 |
| cơm sườn nha mân | parser_wrong_holdout | Ăn uống | Khác | Ăn uống | feedback_fuzzy | 0.91 |
| gửi xe | parser_wrong_holdout | Giáo dục | Di chuyển | Giáo dục | feedback_fuzzy | 0.857 |
| sữa tươi | parser_wrong_holdout | Ăn uống | Khác | Ăn uống | feedback_fuzzy | 0.9 |
| hủ tiếu iuh | parser_wrong_holdout | Ăn uống | Khác | Ăn uống | feedback_fuzzy | 0.892 |
| đan vợt | parser_wrong_holdout | Thể thao | Khác | Thể thao | feedback_fuzzy | 0.9 |
| hủ tiếu IUH | parser_wrong_holdout | Ăn uống | Khác | Ăn uống | feedback_fuzzy | 0.892 |
| nước suối | parser_wrong_holdout | Hóa đơn & Dịch vụ | Khác | Ăn uống | feedback_fuzzy | 0.889 |
| sữa tươi | parser_wrong_holdout | Ăn uống | Khác | Ăn uống | feedback_fuzzy | 0.9 |
| bàn phím | control_parser_correct | Giải trí | Giải trí | Hóa đơn & Dịch vụ | feedback_fuzzy | 0.9 |

## Ghi chú phương pháp

Loại nhãn "Khác" và các dòng parser đoán sai transaction type vì category correction không thể sửa type. Mọi dòng đủ điều kiện có cùng parser type và mô tả chuẩn hóa nằm hoàn toàn trong seed hoặc evaluation; exact match hợp lệ giữa hai phía vì vậy phải bằng 0. Kết quả chính đo category trên hợp của holdout parser-sai và nhóm chứng parser-đúng, đồng thời báo riêng exact/fuzzy, helped, harmed và net.

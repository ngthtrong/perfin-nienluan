# Thí nghiệm: Feedback before/after (correction retrieval)

- Ngày chạy: 2026-07-24T14:23:23.511Z
- Commit: `5f03476` · Node v24.16.0
- Dataset: `dataFinance.csv` — 4832 câu nội dung (đã loại "Khác")
- SHA-256 dữ liệu: `a9b7cf1b390227e532bf286623cd25d546b656bb7161e422079dd003027ca94f`
- Tỷ lệ seed: 0.5

## Phân hoạch dữ liệu

| Nhóm | Số câu |
|---|---|
| Parser đoán sai (nguồn seed+holdout) | 3502 |
| — Seed (ghi correction) | 1751 |
| — Holdout (phát lại) | 1751 |
| Parser vốn đã đúng (nhóm chứng) | 1330 |

## Kết quả trên tập holdout

| Chỉ số | Trước (parser) | Sau (correction→parser) | Δ |
|---|---|---|---|
| Accuracy | 0.00% | 68.19% | 68.19 điểm |
| Macro-F1 | 0.0000 | 0.5440 | 0.5440 |
| Weighted-F1 | 0.0000 | 0.7824 | 0.7824 |

## Kiểm tra không suy giảm (nhóm chứng)

Nhóm chứng gồm các câu mà parser vốn đã phân loại đúng. Correction lý tưởng
không được làm chúng sai đi. Số ca "suy giảm" được tách thành hai loại:

| Chỉ số | Giá trị |
|---|---|
| Câu chuyển sai → đúng (holdout) | 1194 |
| Nhóm chứng bị làm sai (tổng) | 466/1330 |
| — do nhiễu nhãn (cùng câu chữ, >1 nhãn gold trong dữ liệu) | 430 |
| — suy giảm thực (câu đơn nghĩa nhưng correction gán sai) | 36 |

Phần lớn "suy giảm" là nhiễu nhãn cố hữu của dữ liệu lịch sử (cùng một câu
"mẹ cho tiền ăn" xuất hiện với nhiều nhãn nguồn khác nhau) — không hệ thống
phân loại nào phân biệt được. Suy giảm thực trên câu đơn nghĩa mới là chỉ số
đáng quan tâm và ở mức thấp.

## Ví dụ correction áp dụng (tối đa 25)

| Câu | Gold | Parser | Sau | Loại khớp | Độ tin cậy |
|---|---|---|---|---|---|
| thịt kho , trứng | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| táo | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| shopeee | Lương | Khác | Lương | feedback_exact | 1 |
| cafe phan văn trị | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| Trứng | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| cầu lông | Thể thao | Khác | Thể thao | feedback_exact | 0.982 |
| gửi xe | Giáo dục | Di chuyển | Giáo dục | feedback_exact | 0.964 |
| cầu lông | Thể thao | Khác | Thể thao | feedback_exact | 0.982 |
| khẩu trang | Hóa đơn & Dịch vụ | Khác | Hóa đơn & Dịch vụ | feedback_exact | 1 |
| mì + sữa tươi | Ăn uống | Khác | Ăn uống | feedback_exact | 0.969 |
| nước đá | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| mì hảo hảo | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| bánh mì heo quay | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| quấn cán | Thể thao | Mua sắm | Thể thao | feedback_exact | 1 |
| mì ý mtt | Ăn uống | Khác | Ăn uống | feedback_fuzzy | 0.9 |
| mì ý + nc đá | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| cafe gói trung nguyên | Ăn uống | Khác | Ăn uống | feedback_fuzzy | 0.91 |
| bida với tường | Giải trí | Khác | Giải trí | feedback_exact | 1 |
| gửi xe | Giáo dục | Di chuyển | Giáo dục | feedback_exact | 0.964 |
| bánh mì heo quay | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| cà chua | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| xoi + nc đá | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| bánh mì | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| bánh mì que | Ăn uống | Khác | Ăn uống | feedback_exact | 1 |
| 4g tháng 2 | Hóa đơn & Dịch vụ | Khác | Hóa đơn & Dịch vụ | feedback_fuzzy | 0.9 |

## Ghi chú phương pháp

Loại nhãn "Khác". Seed = câu parser sai; holdout = câu còn lại (chủ yếu là biến thể tương tự). Correction được tra theo độ tương đồng văn bản (ngưỡng sản xuất), không phải khớp chính xác, nên đo được khả năng khái quát sang câu gần giống.

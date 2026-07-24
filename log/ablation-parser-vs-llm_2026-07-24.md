# Thí nghiệm: Ablation local parser vs LLM

- Ngày chạy: 2026-07-24T14:24:54.925Z
- Commit: `5f03476` · Node v24.16.0 · provider `gemini` · model `gemini-3.1-flash-lite`
- Dataset: `dataFinance.csv` — mẫu phân tầng 63 câu (5/lớp, seed 42)
- Trạng thái nhánh LLM: **measured** — Đo trên 63/63 câu gọi Gemini thành công.

## So sánh hai nhánh

| Nhánh | Accuracy | Macro-F1 | Weighted-F1 | Clarification rate | p50 latency (ms) | Số gọi API |
|---|---|---|---|---|---|---|
| Local parser | 22.2% | 0.204 | 0.204 | 84.1% | 0 | 0 |
| LLM (Gemini) | 59.5% | 0.607 | 0.593 | 95.2% | 964 | 63 |

## Ca hai nhánh bất đồng (tối đa 25)

| Câu | Gold | Local | LLM |
|---|---|---|---|
| chuối + đu đủ | Ăn uống | Khác | Tạp hóa |
| 5h30-8h30 | Lương | Khác | null |
| cầu lông | Thể thao | Khác | null |
| cầu lông | Thể thao | Khác | null |
| shopee | Lương | Khác | null |
| bida với ân | Giải trí | Ăn uống | Giải trí |
| thùng nước | Nhà cửa | Khác | Tạp hóa |
| vớ | Mua sắm | Khác | null |
| phí rút tiền | Hóa đơn & Dịch vụ | Khác | Hóa đơn & Dịch vụ |
| bida với béo | Giải trí | Khác | Giải trí |
| cf | Ăn uống | Khác | Ăn uống |
| bida với a thành, tiến | Giải trí | Khác | Giải trí |
| DNSE | Đầu tư | Khác | null |
| trà đá | Ăn uống | Khác | Ăn uống |
| ân: tân | Khác | Ăn uống | null |
| phsi thườn niên | Hóa đơn & Dịch vụ | Khác | null |
| bida với ân | Giải trí | Ăn uống | Giải trí |
| chapman | Khác | Khác | null |
| vệ sinh nam | Sức khỏe | Khác | Sức khỏe |
| bida với ân | Giải trí | Ăn uống | Giải trí |
| bia | Sức khỏe | Khác | Ăn uống |
| VNM | Đầu tư | Khác | null |
| shopee 02/02 | Lương | Khác | Mua sắm |
| shopee | Lương | Khác | null |
| dép | Mua sắm | Khác | null |

## Diễn giải

Nhánh parser cục bộ không gọi mạng, độ trễ gần như bằng 0 và chi phí bằng 0, nhưng chỉ mạnh trên câu hội thoại ngắn theo alias. Nhánh LLM đánh đổi độ trễ và chi phí gọi API để lấy khả năng khái quát trên câu tự do. Cả hai đều đi qua bước xác nhận của người dùng trước khi ghi, nên lớp LLM là hỗ trợ trích xuất chứ không phải nguồn chân lý.

# Bộ sơ đồ PERFIN

Thư mục `drawio/` chứa 26 tệp nguồn chỉnh sửa được bằng draw.io: 13 sơ đồ
kiến trúc/luồng/dữ liệu (`01`--`13`) và 13 sơ đồ ca sử dụng (`14`--`26`). Thư
mục `rendered/` chứa bản xuất PDF, PNG và SVG cùng basename; dự án LaTeX ưu
tiên dùng PDF để giữ chất lượng vector.

Hướng dẫn tự render PDF, PNG, SVG và biên dịch lại hai phiên bản báo cáo:
[RENDERING.md](RENDERING.md).

| Tệp | Nội dung | Mức |
|---|---|---|
| `01-system-context` | Ngữ cảnh và biên hệ thống | Hệ thống |
| `02-runtime-architecture` | Kiến trúc runtime dạng modular monolith | Hệ thống |
| `03-deployment` | Triển khai demo/thực nghiệm | Hệ thống |
| `04-domain-class` | Lớp miền nghiệp vụ | Thiết kế |
| `05-physical-erd` | 18 bảng vật lý từ migrations 001--008 | Dữ liệu |
| `06-llm-boundary` | Ranh giới LLM, giải thuật và side effect | Thiết kế trọng tâm |
| `07-conversation-state` | Trạng thái clarification/preview/confirm/TTL | Luồng |
| `08-text-sequence` | Nhập giao dịch bằng văn bản | Tuần tự |
| `09-multimodal-flow` | OCR/STT đến transaction schema | Luồng |
| `10-feedback-flow` | Correction, matching, clustering và re-tag | Giải thuật |
| `11-insight-sequence` | Facts xác định và grounded narration | Tuần tự |
| `12-goal-flow` | Saving/purchase/debt payoff và what-if | Giải thuật |
| `13-worker-sequence` | Scheduler, queue, worker và thông báo nội bộ | Tuần tự |
| `14-usecase-overview` | Ca sử dụng tổng thể FR-01--FR-12 theo tác nhân | Ca sử dụng |
| `15-usecase-fr01` | Ca sử dụng chi tiết FR-01 (nhập văn bản) | Ca sử dụng |
| `16-usecase-fr02` | Ca sử dụng chi tiết FR-02 (ảnh và giọng nói) | Ca sử dụng |
| `17-usecase-fr03` | Ca sử dụng chi tiết FR-03 (clarification/pending) | Ca sử dụng |
| `18-usecase-fr04` | Ca sử dụng chi tiết FR-04 (phân loại/phản hồi) | Ca sử dụng |
| `19-usecase-fr05` | Ca sử dụng chi tiết FR-05 (quản lý dữ liệu) | Ca sử dụng |
| `20-usecase-fr06` | Ca sử dụng chi tiết FR-06 (chuyển ví) | Ca sử dụng |
| `21-usecase-fr07` | Ca sử dụng chi tiết FR-07 (phân tích) | Ca sử dụng |
| `22-usecase-fr08` | Ca sử dụng chi tiết FR-08 (insight/persona) | Ca sử dụng |
| `23-usecase-fr09` | Ca sử dụng chi tiết FR-09 (ngân sách/dự báo) | Ca sử dụng |
| `24-usecase-fr10` | Ca sử dụng chi tiết FR-10 (mục tiêu/what-if) | Ca sử dụng |
| `25-usecase-fr11` | Ca sử dụng chi tiết FR-11 (khoản định kỳ/worker) | Ca sử dụng |
| `26-usecase-fr12` | Ca sử dụng chi tiết FR-12 (xuất dữ liệu/dọn tệp) | Ca sử dụng |

Nguồn sự thật kỹ thuật của ERD là chuỗi migration trong
`demo/backend/migrations/`, không phải các schema hoặc sơ đồ cũ trong
`resource/` và `archive/`. Khi sửa sơ đồ, mở tệp `.drawio`, giữ nguyên basename
và xuất lại cả ba định dạng vào `rendered/` với tùy chọn crop.

Màu dùng xuyên suốt:

- xanh dương `#EEF2F7 / #5B7290 / #22303F`: người dùng, giao diện và trạng thái tương tác;
- xanh lá `#E6F4EA / #2E7D46 / #1B4429`: dữ liệu và giải thuật xác định;
- tím `#F0EAF9 / #7C5CBF / #3A2A5F`: LLM, parser hoặc thành phần xác suất;
- vàng `#FBF3D9 / #B08900 / #5A4700`: kho trạng thái, queue, quyết định hoặc hạ tầng;
- đỏ `#FCEDED / #C97A7A / #5A2A2A`: nhánh từ chối hoặc rollback;
- xám `#EAEEF2 / #6B7A89 / #2C3440`: tác nhân hoặc thành phần phụ trợ;
- viền nét đứt: dịch vụ nằm ngoài biên tin cậy của hệ thống.

Trong sơ đồ ca sử dụng, liên kết association là đường thẳng không mũi tên;
`<<include>>` là bước bắt buộc và `<<extend>>` là nhánh tùy chọn/ngoại lệ, cả hai
vẽ bằng nét đứt mũi tên mở. Mọi liên kết `<<include>>/<<extend>>` toả ra từ một
điểm chung trên cạnh phải của ca sử dụng chính nên không cắt chéo nhau. Sơ đồ
ca sử dụng dùng cỡ chữ 17--18 pt cho actor/use case, 14 pt cho quan hệ và không
có legend hoặc khối chú thích phụ.

Các nguồn sinh tự động được giữ cạnh tệp `.drawio` để thay đổi có thể tái lập:

```bash
python3 core_gen.py
python3 usecase_gen.py
python3 <drawio-skill>/scripts/seqlayout.py specs/08-text-sequence.json -o drawio/08-text-sequence.drawio
python3 <drawio-skill>/scripts/seqlayout.py specs/11-insight-sequence.json -o drawio/11-insight-sequence.drawio
python3 <drawio-skill>/scripts/seqlayout.py specs/13-worker-sequence.json -o drawio/13-worker-sequence.drawio
python3 sequence_style.py
bash rerender-stale.sh
```

# Bộ sơ đồ PERFIN

Thư mục `drawio/` chứa 13 tệp nguồn chỉnh sửa được bằng draw.io. Thư mục
`rendered/` chứa bản xuất PDF, PNG và SVG cùng basename; dự án LaTeX ưu tiên
dùng PDF để giữ chất lượng vector.

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

Nguồn sự thật kỹ thuật của ERD là chuỗi migration trong
`demo/backend/migrations/`, không phải các schema hoặc sơ đồ cũ trong
`resource/` và `archive/`. Khi sửa sơ đồ, mở tệp `.drawio`, giữ nguyên basename
và xuất lại cả ba định dạng vào `rendered/` với tùy chọn crop.

Màu dùng xuyên suốt:

- xanh dương: người dùng/giao diện/trạng thái tương tác;
- xanh lá: dữ liệu và giải thuật xác định;
- tím: LLM, parser hoặc thành phần xác suất;
- vàng: kho trạng thái, queue, quyết định hoặc hạ tầng;
- viền nét đứt: dịch vụ nằm ngoài biên tin cậy của hệ thống.


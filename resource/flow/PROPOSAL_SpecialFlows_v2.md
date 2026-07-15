# Thiết kế lại các Luồng Xử lý Đặc biệt — PERFIN v2

> File này gợi ý lại từng luồng đặc biệt (đối chiếu `FlowSpecial.md` gốc) và các luồng MỚI.
> **Cách dùng:** với mỗi mục, đánh dấu quyết định của bạn vào cột **[ Chọn ]** — `[x] Giữ nguyên` / `[x] Cải tiến` / `[x] Bỏ` / `[x] Thêm mới`.
> Đọc kèm: `PROPOSAL_Backend_v2.md`.

---

## Phần A — Cải tiến các luồng đã có

### Luồng 1 — Nhập giao dịch bằng text

- **Hiện tại:** parse JSON tự do từ Gemini, fallback regex. Tốt.
- **Đề xuất cải tiến:**
  - Chuyển sang **function-calling** (`create_transaction` tool) → giảm lỗi parse JSON.
  - **Multi-transaction**: "ăn sáng 30k, grab 45k" → hiện tài liệu nói hỗ trợ nhưng code chỉ tạo 1 pending. Đề xuất trả **mảng preview**, xác nhận từng cái hoặc "xác nhận tất cả".
  - Cache câu lặp qua Redis (xem Backend v2 §3.1C).
- **[ Chọn ]:** `[ ] Giữ nguyên  [x ] Cải tiến  [ ] Bỏ`

### Luồng 2 — Voice → STT → Transaction

- **Hiện tại:** PhoWhisper offline / Google Speech; prompt voice riêng.
- **Đề xuất:** giữ nguyên kiến trúc, chỉ thêm **hiển thị transcript cho user xác nhận trước khi parse** (tránh STT sai làm giao dịch sai). Cân nhắc bỏ mock-fallback vì dễ tạo giao dịch rác.
- **[ Chọn ]:** `[ ] Giữ nguyên  [ x] Cải tiến  [ ] Bỏ`

### Luồng 3 — Image → OCR → Transaction

- **Hiện tại:** PaddleOCR/Vision → LLM bóc tách 1 giao dịch (prompt lấy dòng tổng).
- **Đề xuất:** hỗ trợ **hóa đơn nhiều mặt hàng** đúng như LLM.md §2.6: cho user chọn "ghi 1 giao dịch tổng" hay "tách từng mặt hàng". Trả preview dạng danh sách.
- **[ Chọn ]:** `[ ] Giữ nguyên  [x ] Cải tiến  [ ] Bỏ`

### Luồng 4 — Auto-categorization + Feedback loop

- **Hiện tại:** `matchCategory()` 3 tầng (exact → substring → alias → "Khác"). Feedback loop **chưa implement** (tài liệu ghi "future").
- **Đề xuất cải tiến (đáng làm):**
  - Ghi mỗi lần user sửa danh mục vào bảng `ai_feedback_logs` (có trong schema tài liệu nhưng thiếu trong DB thực).
  - Dùng lịch sử sửa làm **few-shot examples** cho lần parse sau: *"user thường xếp 'grab bệnh viện' vào Y tế"*.
  - Bổ sung so khớp mờ (fuzzy/Levenshtein) cho alias để bớt rơi về "Khác".
- **[ Chọn ]:** `[ ] Giữ nguyên  [ x] Cải tiến  [ ] Bỏ`

### Luồng 5 — Cảnh báo ngân sách proactive

- **Hiện tại:** ngưỡng 70/90/100%, format cứng, inject vào chat.
- **Đề xuất:** giữ ngưỡng; **format qua Persona Engine** (bà mẹ mắng ≠ chuyên gia). Thêm cảnh báo **dự báo**: "với đà này bạn sẽ vượt ngân sách vào ngày X" (dùng Cashflow runway từ Analytics Engine).
- **[ Chọn ]:** `[ ] Giữ nguyên  [ x] Cải tiến  [ ] Bỏ`

### Luồng 6 — Nhắc nhở recurring bill

- **Hiện tại:** chỉ chạy khi mở chat (`GET /messages`). Không có cron thật.
- **Đề xuất:** thêm **cron worker (BullMQ trên Redis)** chạy hằng ngày → tạo nhắc nhở kể cả khi user không mở app; kèm ngữ cảnh số dư (LLM.md §2.5: "ví chỉ còn 1.8tr, cần chuyển thêm 700k").
- **[ Chọn ]:** `[ ] Giữ nguyên  [x ] Cải tiến  [ ] Bỏ`

### Luồng 7 — Báo cáo & Insight cá nhân hóa

- **Hiện tại:** `report.service.js` chỉ SUM/GROUP BY. LLM diễn giải **chưa có**.
- **Đề xuất (QUAN TRỌNG):** nối vào **Analytics Engine** (Backend v2 §3.2). LLM nhận "insight facts" (số liệu đã tính) + persona → viết nhận xét. Đây là phần thể hiện rõ nhất giá trị LLM.
- **[ Chọn ]:** `[ ] Giữ nguyên  [x ] Cải tiến  [ ] Bỏ`

### Luồng 8 — Chat hỏi đáp tự do

- **Hiện tại:** `AIService.chat()` nhét context thô; persona chưa áp dụng.
- **Đề xuất:** đưa **tóm tắt tài chính có cấu trúc** (không phải dump JSON) + persona vào context; cho phép LLM gọi tool `query_report` khi cần số liệu chính xác thay vì tự đoán.
- **[ Chọn ]:** `[ ] Giữ nguyên  [ x] Cải tiến  [ ] Bỏ`

### Luồng 9 — Export qua chat

- **Hiện tại:** intent `export`, sinh CSV/PDF, lưu `exports/`, trả link.
- **Đề xuất:** giữ nguyên; thêm dọn file cũ (TTL) + gắn export vào user khi có multi-user.
- **[ Chọn ]:** `[ ] Giữ nguyên  [ x] Cải tiến  [ ] Bỏ`

### Luồng 10 — Transfer / Investment giữa ví

- **Hiện tại:** schema có transfer/investment; phân biệt Expense/Transfer/Investment.
- **Đề xuất:** đảm bảo **atomic 2 bản ghi** (debit+credit) + không tính vào Net Worth với transfer. Thêm intent `investment_pnl` (ghi lãi/lỗ) đã có enum nhưng luồng chat chưa khai thác.
- **[ Chọn ]:** `[ ] Giữ nguyên  [ x] Cải tiến  [ ] Bỏ`

### Luồng 11 — Auth

- **Hiện tại:** không có (hard-code `default_user`).
- **Đề xuất:** thêm JWT thật (Backend v2 §3.6). Ưu tiên trung bình cho niên luận.
- **[ Chọn ]:** `[ ] Giữ nguyên  [ ] Cải tiến  [ ] Bỏ`

### Luồng 12 — Clarification khi thiếu thông tin

- **Hiện tại:** 3 cơ chế (LLM flag / local parser / recurring thiếu field). **Không lưu state giữa các lượt** — điểm yếu.
- **Đề xuất:** lưu **clarification context trong Redis** (`clarify:{userId}` = {intent, đang thiếu field gì, dữ liệu đã có}). Khi user trả lời → merge vào context thay vì parse lại từ đầu → multi-turn ổn định, không mất mạch sau 5 phút một cách đột ngột.
- **[ Chọn ]:** `[ ] Giữ nguyên  [ x] Cải tiến  [ ] Bỏ`

### Luồng 13 — Clarification khi tên bill mơ hồ

- **Hiện tại:** `findBillByName()` exact→partial→substring; liệt kê lựa chọn.
- **Đề xuất:** giữ; thêm **đánh số lựa chọn** ("1. Tiền nhà Q7 / 2. Tiền nhà ba mẹ") để user trả lời "1" cho nhanh. Lưu candidate list vào Redis clarify-context.
- **[ Chọn ]:** `[ ] Giữ nguyên  [ x] Cải tiến  [ ] Bỏ`

### Luồng 14 — Gợi ý danh mục mới

- **Hiện tại:** chỉ fallback "Khác"; gợi ý tạo danh mục mới **chưa implement**.
- **Đề xuất:** dùng **Subscription/keyword miner** (Analytics Engine): khi ≥ N giao dịch cùng từ khóa rơi vào "Khác"/"Ăn uống" → AI chủ động đề xuất tách danh mục + **re-tag giao dịch cũ**. Đây là feedback loop có giá trị demo.
- **[ Chọn ]:** `[ ] Giữ nguyên  [ x] Cải tiến  [ ] Bỏ`

### Luồng 15 — Clarification đặc biệt trong chat (15A–15D)

- **Hiện tại:** intent kép (ghi trước hỏi sau), override amount, cancel, edit-loop. Đã khá đầy đủ.
- **Đề xuất:** giữ; chuẩn hóa tất cả về **conversation state trong Redis** để nhất quán với Luồng 12/13.
- **[ Chọn ]:** `[ ] Giữ nguyên  [ x] Cải tiến  [ ] Bỏ`

---

## Phần B — Luồng ĐẶC BIỆT MỚI đề xuất

Các luồng này chưa có trong `FlowSpecial.md`, khai thác Analytics Engine + Goal Planning.

### Luồng 16 (MỚI) — Lập kế hoạch mục tiêu tài chính

- **Trigger:** *"mình muốn tiết kiệm 300 triệu mua nhà trong 5 năm"* / *"lập kế hoạch trả hết nợ thẻ tín dụng 40tr"*.
- **Xử lý:** intent `goal_create` → tính surplus dòng tiền → planner đề xuất mức đóng góp/tháng → LLM diễn giải lộ trình theo persona → lưu `financial_goals`.
- **Điểm đặc biệt:** what-if ("nếu cắt 20% Giải trí thì sao?"); theo dõi tiến độ mỗi tháng; cảnh báo nếu lệch tiến độ.
- **[ Chọn ]:** `[ x] Thêm mới  [ ] Bỏ`

### Luồng 17 (MỚI) — Cảnh báo dòng tiền cạn (Cashflow Runway)

- **Trigger:** tự động sau giao dịch, hoặc *"tiền của mình đủ xài tới cuối tháng không?"*.
- **Xử lý:** tính tốc độ chi gần đây → ngày dự kiến hết tiền → so với ngày lương → cảnh báo nếu cạn trước.
- **[ Chọn ]:** `[x ] Thêm mới  [ ] Bỏ`

### Luồng 18 (MỚI) — Phát hiện subscription/chi tiêu ẩn

- **Trigger:** cron hằng tháng hoặc *"mình có đang tốn tiền phí định kỳ nào không?"*.
- **Xử lý:** miner gom giao dịch định kỳ nhỏ lẻ → tổng hợp → AI đặt vào ngữ cảnh ("tổng 512k/tháng ≈ 1 tuần tiền ăn").
- **[ Chọn ]:** `[x ] Thêm mới  [ ] Bỏ`

### Luồng 19 (MỚI) — Báo cáo định kỳ chủ động (cuối tháng)

- **Trigger:** cron cuối tháng (không cần user hỏi).
- **Xử lý:** Analytics Engine chạy full → LLM viết "báo cáo tháng" theo persona → inject vào chat + tùy chọn xuất PDF.
- **[ Chọn ]:** `[ x] Thêm mới  [ ] Bỏ`

### Luồng 20 (MỚI) — Đề xuất ngân sách tự động

- **Trigger:** *"đặt ngân sách giúp mình"* hoặc khi user chưa có budget.
- **Xử lý:** dựa chi tiêu trung bình theo danh mục 3 tháng → đề xuất hạn mức hợp lý (vd 50/30/20) → user chỉnh → lưu.
- **[ Chọn ]:** `[x ] Thêm mới  [ ] Bỏ`

---

## Phần C — Tổng hợp quyết định

Sau khi đánh dấu ở trên, điền bảng này để mình biết phạm vi triển khai:

| Nhóm                                         | Quyết định của bạn     |
| --------------------------------------------- | --------------------------- |
| Luồng ưu tiên cải tiến trước           | 12, 13, 14 , 15 ,1 ,2,3,4,5 |
| Luồng mới muốn thêm                       | 16, 17, 18, 19, 20          |
| Luồng giữ nguyên hoàn toàn               |                             |
| Luồng tạm bỏ / để "hướng phát triển" |                             |

> Ghi chú: theo phân tích ở `PROPOSAL_Backend_v2.md`, phần tạo giá trị học thuật & demo cao nhất là **Luồng 7 (insight thật) + các Luồng mới 16–19 (Analytics Engine)** kết hợp **Persona Engine (Luồng 5, 8)**.

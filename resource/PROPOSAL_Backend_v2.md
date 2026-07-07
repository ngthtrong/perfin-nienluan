# Đề xuất Cải tiến / Viết lại Backend — PERFIN v2

> Tài liệu phân tích thực trạng backend hiện tại (`demo/backend/`) và đề xuất lộ trình cải tiến.
> Đọc kèm: `PROPOSAL_SpecialFlows_v2.md` (thiết kế lại các luồng đặc biệt — cần bạn quyết định).
> Người phân tích: trợ lý AI — dựa trên source code thực tế + tài liệu trong `resource/`.

---

## 0. Tóm tắt cho người bận rộn (TL;DR)

Backend hiện tại là một **MVP chạy được** nhưng có 4 khoảng cách lớn so với tầm nhìn trong tài liệu:

1. **Không có multi-user thật** — toàn bộ hard-code `default_user`, không JWT, không isolate dữ liệu (trái NFR-07).
2. **AI chỉ dừng ở nhập liệu** — LLM parse giao dịch rất tốt, nhưng "bộ não phân tích" (LLM.md §2.4: phát hiện điểm mù, dự đoán dòng tiền, cross-category insight) gần như **chưa tồn tại**. Report chỉ là SUM/GROUP BY thuần SQL.
3. **Persona (REQ-09) là no-op** — `applyPersona()` chỉ `return text`. Đây là điểm bán hàng chính của sản phẩm nhưng chưa chạy.
4. **State mong manh** — pending transaction nằm trong Map in-memory; mất khi restart, không scale được nhiều instance.

**Khuyến nghị:** KHÔNG viết lại từ đầu. Cấu trúc phân tầng hiện tại (routes → services → models) đã sạch. Nên **cải tiến tiến hóa (evolve)** theo 4 giai đoạn bên dưới. Với phạm vi niên luận, ưu tiên phần "bộ não phân tích" + persona vì đó là phần tạo điểm nhấn học thuật và demo ấn tượng nhất.

---

## 1. Thực trạng backend hiện tại

### 1.1. Cấu trúc (đã tốt, giữ lại)

```
demo/backend/
├── index.js                 # Express app, bootstrap, alias routes
├── config/database.js       # pg.Pool
├── routes/       (10 files)  # HTTP layer — mỏng, gọi service/model
├── services/     (6 files)   # ai, parser, report, export, media-ai, pending
├── models/       (7 files)   # data-access, dùng transaction SQL đúng cách
├── prompts/      (1 file)    # prompt Gemini
├── middleware/               # error + validation
├── migrations/   (4 files)   # SQL thuần, idempotent
└── scripts/                  # migrate, seed, python OCR/STT
```

Điểm cộng:
- Tách tầng rõ ràng, model dùng `BEGIN/COMMIT/ROLLBACK` đúng cho thao tác cập nhật số dư ví.
- AI service có fallback nhiều tầng: Gemini → local regex parser. Đây là thiết kế phòng thủ tốt.
- Migration idempotent (`IF NOT EXISTS`, `DO $$ ... EXCEPTION`).

### 1.2. Khoảng cách nghiêm trọng

| # | Vấn đề | Bằng chứng trong code | Ảnh hưởng |
|---|--------|------------------------|-----------|
| G1 | **Schema thực tế ≠ schema tài liệu** | `migrations/001` dùng `default_user` VARCHAR, KHÔNG có bảng `users`, `ai_personalities`, `user_traits`, `ai_feedback_logs`. Còn `resource/perfin_schema.sql` mô tả 14 bảng đầy đủ. | Toàn bộ REQ-09 (persona), feedback loop (REQ-02), auth (NFR-07) không có nền tảng dữ liệu. |
| G2 | **Không auth / không multi-user** | `chat.routes.js:12` `const userId = 'default_user';` lặp lại ở mọi route. | Không thể triển khai thật; vi phạm NFR-07. |
| G3 | **Persona chưa chạy** | `chat.routes.js:20` `applyPersona()` = `return text;` | REQ-09 — điểm bán hàng chính — chưa tồn tại. |
| G4 | **Không có "bộ não phân tích"** | `report.service.js` chỉ SUM/GROUP BY. Không có phát hiện xu hướng, dự báo, anomaly. | LLM.md §2.4 (giá trị lớn nhất) chưa được hiện thực. |
| G5 | **Pending state in-memory** | `pendingTransaction.service.js:1` `const pending = new Map();` | Mất khi restart, không scale, không debug được. |
| G6 | **Chat mỗi lượt là request độc lập, không có "bộ nhớ hội thoại" ngữ nghĩa** | `chat()` chỉ nhét `recent_messages` thô vào context. | Clarification multi-turn dễ mất mạch (FlowSpecial Luồng 12). |
| G7 | **Không cache** | Mọi câu chat đều gọi Gemini; danh mục query lại mỗi request. | Chậm, tốn token/tiền, khó đạt NFR-02 (≤3s). |
| G8 | **Không có cron thật cho recurring/insight** | Nhắc nhở chỉ chạy khi user mở chat (`GET /messages`). | REQ-08 proactive reminder chỉ nửa vời. |
| G9 | **Recurring/report chưa tận dụng LLM persona** | text format cứng. | Trải nghiệm khô khan. |

---

## 2. Kiến trúc đề xuất cho v2

Giữ nguyên phong cách phân tầng, bổ sung 3 thành phần: **tầng cache (Redis)**, **tầng analytics (bộ não phân tích)**, và **tầng persona**.

```
                    ┌─────────────────────────────────────────┐
   Mobile App  ───► │  API Gateway (Express)                   │
                    │  + JWT auth middleware  + rate-limit      │
                    └───────────────┬──────────────────────────┘
                                    │
         ┌──────────────────────────┼───────────────────────────┐
         ▼                          ▼                            ▼
  ┌─────────────┐          ┌─────────────────┐        ┌───────────────────┐
  │ Core Svcs   │          │  AI Orchestrator │        │  Analytics Engine  │  ← MỚI
  │ tx/budget/  │          │  (intent router) │        │  (bộ não phân tích)│
  │ wallet/...  │          │  + Persona layer │◄──────►│  trend/forecast/   │
  └──────┬──────┘          └────────┬─────────┘        │  anomaly/goal-plan │
         │                          │                  └─────────┬──────────┘
         │                          │                            │
         ▼                          ▼                            ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Redis  (cache + pending state + rate-limit + job queue)   ← MỚI       │
  └──────────────────────────────────────────────────────────────────────┘
         │                                                        │
         ▼                                                        ▼
  ┌─────────────┐                                        ┌───────────────┐
  │ PostgreSQL  │                                        │ Cron / Worker  │  ← MỚI
  │ (đủ 14 bảng)│                                        │ reminders +    │
  └─────────────┘                                        │ monthly insight│
                                                         └───────────────┘
```

---

## 3. Đề xuất chi tiết theo chủ đề

### 3.1. Redis — Cache & State (giải quyết G5, G7)

Bạn đã nêu đúng nhu cầu. Redis phục vụ 4 việc, ưu tiên từ trên xuống:

**A. Pending transaction state (thay Map in-memory) — ưu tiên cao**
- Thay `pendingTransaction.service.js` bằng Redis key `pending:{userId}` với `EXPIRE 300` (TTL 5 phút tự động — không cần tự dọn như hiện tại).
- Lợi ích: sống sót qua restart, scale nhiều instance, TTL do Redis quản lý.

**B. Cache danh mục & dữ liệu ít đổi**
- `categories:{userId}`, `wallets:{userId}` — TTL 1 giờ, invalidate khi có CRUD.
- Hiện `CategoryModel.getAll()` bị gọi ở gần như mọi luồng chat → cache giảm tải DB rõ rệt.

**C. Cache kết quả LLM cho câu lặp (semantic-ish cache)**
- Key = hash(normalizeText(input) + categoryVersion). Câu "cà phê 30k" gõ lại → trả cache, không tốn token.
- TTL ngắn (vài phút) để tránh lệ thuộc dữ liệu cũ.

**D. Rate-limit + job queue**
- Rate-limit theo `userId` (sliding window) — chuẩn bị cho multi-user.
- Dùng BullMQ (trên Redis) cho cron nhắc nhở + báo cáo cuối tháng (giải quyết G8).

> Ghi chú học thuật: với niên luận, nên mô tả Redis như "tầng cache + state store", và benchmark trước/sau (thời gian phản hồi, số lần gọi Gemini). Đây là số liệu đẹp cho chương Kiểm thử (Report_v0 §3.3).

### 3.2. Bộ não phân tích — Analytics Engine (giải quyết G4 — QUAN TRỌNG NHẤT)

Đây là phần biến PERFIN từ "chatbot bọc bộ lọc" thành "trợ lý tài chính" (đúng luận điểm LLM.md §1). Ý tưởng cốt lõi: **thuật toán thống kê tính toán số liệu (deterministic, rẻ) → LLM diễn giải thành lời khuyên (persona)**. LLM KHÔNG tự bịa số.

Đề xuất một module `services/analytics/` gồm các thuật toán sau (thuần JS/SQL, không cần LLM để tính):

| Thuật toán | Đầu vào | Đầu ra | Dùng cho |
|-----------|---------|--------|----------|
| **Trend detection** (hồi quy tuyến tính đơn giản trên chuỗi tháng) | chi tiêu theo danh mục 3–6 tháng | slope %, "tăng đều 15%/tháng" | Cảnh báo leo thang (LLM.md §2.4) |
| **Anomaly detection** (z-score / IQR trên chi tiêu ngày) | giao dịch trong kỳ | các ngày/khoản bất thường | "hôm nay tiêu gấp 4 lần bình thường" |
| **Cashflow runway** (tốc độ chi 7–30 ngày → ngày cạn ví) | số dư + chi tiêu gần đây | ngày dự kiến hết tiền | Cảnh báo trước ngày lương |
| **Recurring/subscription miner** (gom giao dịch cùng tên+xấp xỉ tiền, chu kỳ đều) | lịch sử giao dịch | danh sách subscription ẩn + tổng | "11 subscription = 512k/tháng" |
| **Day-of-week pattern** (nhóm theo thứ trong tuần) | giao dịch | "thứ 6 chi gấp 4 lần" | Pattern hành vi |
| **Cross-category correlation** (Pearson giữa các danh mục theo tuần) | chuỗi chi theo danh mục | cặp danh mục tương quan | Insight liên danh mục |
| **Goal planner** (xem §3.3 riêng) | mục tiêu + dòng tiền | lộ trình tiết kiệm | Tính năng ngầm mới |

Luồng: `Analytics Engine tính → gom thành "insight facts" (JSON số liệu) → LLM nhận facts + persona → viết câu insight`. Cách này đảm bảo **số liệu luôn đúng** (thuật toán tính), còn **giọng văn cá nhân hóa** (LLM viết) — tránh hallucination về con số.

### 3.3. Tính năng mới: Lập kế hoạch mục tiêu tài chính (Goal Planning)

Đúng như bạn gợi ý (mua nhà, chuyển chỗ ở, trả nợ). Đây là tính năng "ngầm hữu dụng" và rất hợp làm điểm nhấn niên luận.

**Mô hình dữ liệu mới** — bảng `financial_goals`:
```sql
CREATE TABLE financial_goals (
  id, user_id, name,              -- "Mua nhà", "Trả nợ thẻ tín dụng"
  goal_type,                       -- 'saving' | 'debt_payoff' | 'purchase'
  target_amount, current_amount,
  target_date,                     -- deadline mong muốn (nullable)
  monthly_contribution,            -- mức đóng góp/tháng (do user hoặc AI đề xuất)
  linked_wallet_id,                -- ví tích lũy cho mục tiêu
  status                           -- active | achieved | paused
);
```

**Thuật toán planner** (deterministic, không cần LLM):
- Tính **surplus dòng tiền trung bình/tháng** = thu nhập TB − chi tiêu TB (từ 3–6 tháng gần nhất).
- Với mục tiêu tiết kiệm: `số tháng cần = (target − current) / monthly_contribution`; cảnh báo nếu vượt `target_date`.
- Với trả nợ: mô phỏng amortization (nợ gốc + lãi suất) → lịch trả, tổng lãi, ngày hết nợ. Có thể so sánh chiến lược "avalanche" (ưu tiên lãi cao) vs "snowball" (ưu tiên nợ nhỏ).
- **What-if**: "nếu cắt 20% chi tiêu Giải trí, mục tiêu về đích sớm 3 tháng" — chạy lại planner với input điều chỉnh.

**LLM diễn giải:** biến kết quả số thành lộ trình dễ hiểu theo persona:
> *"Với surplus trung bình 4.2tr/tháng, để đủ 300tr trả trước mua nhà trong 5 năm bạn cần để dành 5tr/tháng — hơi căng. Nếu giảm 800k/tháng tiền cà phê + ăn ngoài, bạn sẽ đạt đúng hạn."*

### 3.4. Persona Engine — hiện thực REQ-09 (giải quyết G3)

- Bổ sung bảng `ai_personalities` + `users.active_personality_id` (theo `resource/perfin_schema.sql`).
- `applyPersona(text, personaId)` → 2 chế độ:
  - **Rẻ (rule/template)**: các persona có prefix/hậu tố + emoji, dùng cho câu ngắn (đã lưu, đã hủy).
  - **Giàu (LLM rewrite)**: với insight/tư vấn, đưa text gốc + `style_prompt` của persona vào LLM để viết lại giọng. Có cache để tránh gọi lặp.
- Persona mẫu (theo LLM.md §2.3): Chuyên gia / Bà mẹ nghiêm khắc / Bạn thân / Huấn luyện viên.

### 3.5. AI Orchestrator — nâng cấp intent routing (giải quyết G6)

Hiện `parseTransaction` trả 1 intent phẳng. Đề xuất:
- **Intent router rõ ràng**: tách "extraction prompt" (bóc tách giao dịch) khỏi "conversation prompt" (chat/insight). Hiện đang trộn trong 1 system prompt lớn.
- **Function calling / tool-use** thay vì parse JSON tự do: khai báo các tool (`create_transaction`, `query_report`, `create_goal`, `pay_bill`...) cho Gemini. Model gọi tool đúng schema → giảm lỗi parse, dễ mở rộng intent mới. Đây là hướng chuẩn công nghiệp và là điểm cộng học thuật.
- **Conversation state trong Redis**: lưu ngữ cảnh clarification (đang hỏi gì, thiếu field nào) thay vì chỉ dựa vào history thô → multi-turn ổn định hơn.

### 3.6. Auth & Multi-user (giải quyết G1, G2)

- Thêm bảng `users`, JWT middleware, thay mọi `default_user` bằng `req.user.id`.
- Đây là việc "cày" nhưng cần thiết nếu muốn deploy thật. Với phạm vi niên luận có thể để **ưu tiên trung bình** (demo 1 user vẫn thuyết phục), nhưng nên nêu trong "hướng phát triển" nếu chưa làm kịp.

---

## 4. Đề xuất về schema dữ liệu

Hợp nhất 2 schema đang lệch nhau (G1). Quyết định cần bạn chọn:

- **Phương án A — chuẩn hóa theo `resource/perfin_schema.sql`**: đầy đủ 14 bảng, có users/persona/traits/feedback. Nhiều việc migrate nhưng đúng tài liệu báo cáo.
- **Phương án B — mở rộng dần schema MVP hiện tại**: chỉ thêm bảng khi tính năng cần (users, ai_personalities, financial_goals, ai_feedback_logs). Ít rủi ro, incremental.

Khuyến nghị **B** cho tiến độ, nhưng cập nhật `resource/perfin_schema.sql` cho khớp thực tế để báo cáo không mâu thuẫn.

Bảng cần thêm (tối thiểu, theo thứ tự ưu tiên):
1. `ai_personalities` + `users.active_personality_id` — cho REQ-09.
2. `financial_goals` — tính năng mới §3.3.
3. `ai_feedback_logs` — cho feedback loop REQ-02 (hiện chưa có).
4. `insights` (cache các insight đã sinh, tránh tính lại) — tùy chọn.

---

## 5. Lộ trình đề xuất (4 giai đoạn)

| GĐ | Nội dung | Tại sao trước | Rủi ro |
|----|----------|---------------|--------|
| **1. Nền tảng** | Redis (pending state + cache danh mục), tách prompt, conversation state | Gỡ nợ kỹ thuật, tăng tốc, nền cho phần sau | Thấp |
| **2. Bộ não phân tích** | Analytics engine (trend/anomaly/runway/subscription) + LLM diễn giải | Giá trị học thuật + demo cao nhất | Trung bình (cần dữ liệu mẫu đủ) |
| **3. Persona + Goal planning** | Hiện thực REQ-09, thêm `financial_goals` + planner + what-if | Điểm nhấn sản phẩm | Trung bình |
| **4. Multi-user + cron worker** | JWT auth, BullMQ cron nhắc nhở/insight định kỳ | Chuẩn bị deploy thật | Cao (nhiều thay đổi) |

Với niên luận, **GĐ 2 + 3 là phần nên đầu tư nhất** — chúng biến sản phẩm thành "trợ lý AI" đúng như luận điểm trong `LLM.md`, và tạo số liệu/demo ấn tượng cho báo cáo.

---

## 6. Câu hỏi cần bạn quyết định

1. **Viết lại hay cải tiến?** → Khuyến nghị cải tiến tiến hóa (GĐ 1→4), không viết lại.
2. **Schema: Phương án A (chuẩn hóa đủ) hay B (mở rộng dần)?**
3. **Redis: làm ngay GĐ 1 hay để sau?** (pending-state là phần đáng làm nhất trước tiên).
4. **Ưu tiên tính năng mới nào?** Goal planning (mua nhà/trả nợ) vs Subscription miner vs Cashflow runway — làm hết hay chọn 1–2 để demo sâu?
5. **AI: chuyển sang function-calling/tool-use hay giữ parse JSON?**

> Sau khi bạn chốt, mình sẽ dựng khung code cho các giai đoạn đã chọn. Các luồng đặc biệt (Flow 1–15) được đề xuất thiết kế lại riêng trong `PROPOSAL_SpecialFlows_v2.md`.

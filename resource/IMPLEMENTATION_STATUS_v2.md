# PERFIN v2 — Trạng thái triển khai

Ngày cập nhật: 2026-07-10

## Đã hoàn thành

- Redis KV abstraction, TTL state, category/wallet/LLM cache và rate limit. Có
  fallback memory cho môi trường phát triển; `demo/backend/compose.redis.yml`
  cung cấp Redis persistent cho runtime thật.
- Pending state và clarification state nhiều lượt cho giao dịch, recurring bill,
  lựa chọn bill mơ hồ và goal.
- Gemini function calling/tool-use, local intent fallback và multi-transaction.
- Voice transcript confirmation; OCR cho phép chọn tổng hóa đơn hoặc từng mặt hàng.
  Provider lỗi không còn sinh dữ liệu mock.
- Feedback loop phân loại, fuzzy matching, few-shot corrections, đề xuất danh mục
  mới và re-tag có xác nhận.
- Analytics: trend, anomaly, runway, subscription, day-of-week, correlation; LLM
  chỉ diễn giải facts đã tính và có kiểm soát đơn vị.
- Persona DB-backed, persona cho chat/notification/report và user traits có consent.
- Goal Planning: saving/purchase/debt amortization, deadline, progress và what-if.
- Budget recommendation, apply có xác nhận và dự báo ngày vượt ngân sách.
- Tool chat cho report/runway/subscription/goal/export/transfer/investment.
- BullMQ worker: recurring reminder, runway, subscription, month-end insight và
  export cleanup; retry/dedupe an toàn.
- Schema alignment: users, personalities, goals, feedback, traits, user-key foreign
  keys và compatibility views cho tên bảng trong tài liệu.

## Vận hành

```bash
cd demo/backend
docker compose -f compose.redis.yml up -d
npm run migrate
npm run dev
# terminal khác
npm run worker
```

Kiểm thử backend:

```bash
npm test
```

## Ngoài phạm vi đã chốt

Luồng 11 (JWT Auth/Multi-user) không được chọn trong
`PROPOSAL_SpecialFlows_v2.md`. Runtime hiện vẫn dùng `default_user`; schema sử dụng
`users.user_key` và foreign key để có đường nâng cấp an toàn khi Auth được chọn sau.

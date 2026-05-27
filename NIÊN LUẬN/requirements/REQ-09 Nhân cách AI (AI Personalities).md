---
tags:
  - nien-luan
---
# REQ-09: Tương tác với "Nhân cách AI" (AI Personalities)

## Metadata
- **Brief nguồn**: Yêu cầu tính năng.md (Tính năng #3)
- **Ngày tạo**: 25/05/2026
- **Lần cập nhật cuối**: 25/05/2026
- **Trạng thái**: DRAFT — chờ PO phê duyệt

## Tóm tắt
Rolly không chỉ là một cỗ máy khô khan mà có thể nhập vai thông qua tính năng "Nhân cách AI". Đây là một yếu tố Gamification và Tâm lý học hành vi (Behavioral Psychology) giúp tăng tương tác người dùng. Tùy thuộc vào nhân cách được chọn (Ví dụ: "Bà mẹ nghiêm khắc", "Chuyên gia tài chính", "Bạn thân"), AI sẽ có giọng điệu (tone), cách xưng hô, và phong cách nhắc nhở khác nhau khi người dùng chi tiêu hay tiết kiệm. Tính năng này áp dụng cho mọi phản hồi từ chatbot và các Push Notifications liên quan đến ngân sách/nhắc nhở.

## Phân tích yêu cầu

### Actors
- **User**: Chọn/thay đổi nhân cách AI.
- **AI Engine**: Áp dụng system prompt tương ứng với từng nhân cách để generate câu trả lời.
- **System**: Cung cấp danh sách nhân cách, thiết lập mặc định.

### Constraints
- Việc thay đổi nhân cách AI **tuyệt đối không được làm ảnh hưởng đến tính chính xác của logic nghiệp vụ** (Bóc tách giá tiền, phân loại danh mục, tính toán số dư).
- Mỗi user chỉ có 1 nhân cách AI active tại một thời điểm.

### Ambiguities
- ⚠️ AMBIGUOUS: Liệu AI có được phép sử dụng từ ngữ quá mạnh (Ví dụ: mang tính chất mắng mỏ nặng nề trong chế độ Angry Mom) có gây phản cảm với người dùng không? (Cần thiết lập ranh giới an toàn cho Prompt).

### Out of Scope sơ bộ
- Tính năng tự tạo Prompt nhân cách riêng cho người dùng (Chỉ cung cấp sẵn các mẫu mặc định trong MVP).
- Thay đổi avatar và theme UI của cả ứng dụng theo nhân cách AI (MVP chỉ tập trung vào giọng điệu chat).

---

## Yêu cầu Chức năng (FR)

### FR-09-01: Danh sách nhân cách AI có sẵn
**Mô tả**: Ứng dụng cung cấp sẵn một bộ sưu tập các Persona để người dùng chọn.

**Acceptance Criteria**:
- Given màn hình Cài đặt Nhân cách AI
  When người dùng mở lên
  Then hiển thị danh sách các nhân cách gồm: 
  1. "Chuyên gia tài chính" (Financial Expert) - Khách quan, chuyên nghiệp.
  2. "Bà mẹ nghiêm khắc" (Angry Mom) - Cằn nhằn khi tiêu hoang, soi xét.
  3. "Bạn thân" (Bestie) - Đồng cảm, khích lệ, dùng emoji và từ lóng genZ.
  4. "Huấn luyện viên kỷ luật" (Drill Sergeant) - Thẳng thắn, thúc đẩy mục tiêu gắt gao.

### FR-09-02: Thiết lập nhân cách AI mặc định
**Mô tả**: Khi người dùng mới đăng ký, hệ thống cần gán một nhân cách mặc định an toàn.

**Acceptance Criteria**:
- Given một người dùng vừa tạo tài khoản thành công
  When người dùng bắt đầu chat lần đầu tiên
  Then hệ thống sử dụng nhân cách mặc định là "Chuyên gia tài chính" (Financial Expert).

### FR-09-03: Chuyển đổi nhân cách bằng Chat hoặc Cài đặt
**Mô tả**: Người dùng có 2 cách để đổi nhân cách.

**Acceptance Criteria**:
- Given người dùng mở màn hình Cài đặt
  When chọn nhân cách "Bà mẹ nghiêm khắc" và lưu
  Then các phản hồi AI ngay sau đó sẽ đổi giọng điệu.
- Given người dùng chat trực tiếp `Hãy đóng vai một bà mẹ khó tính mắng tôi vì tiêu tiền`
  When AI nhận được câu lệnh
  Then AI tự động switch mode sang "Bà mẹ nghiêm khắc" và phản hồi lại bằng đúng tone giọng đó.

### FR-09-04: Ảnh hưởng đến giọng điệu phản hồi (Tone & Style)
**Mô tả**: Nhân cách AI quyết định văn phong, từ vựng, độ dài, và emoji của câu trả lời.

**Acceptance Criteria**:
- Given AI nhận diện giao dịch `Mua trà sữa 50k`
  When AI là "Bạn thân"
  Then trả lời: "Okee đã lưu trà sữa 50k nha 🧋 Ngon không để hôm nào đi chung nè!"
  When AI là "Bà mẹ nghiêm khắc"
  Then trả lời: "Lại trà sữa 50k? Uống lắm đường rồi bệnh nha. Mẹ lưu sổ rồi đó!"

### FR-09-05: Ảnh hưởng đến lời khuyên & nhắc nhở ngân sách
**Mô tả**: Khi ngân sách bị vượt hoặc cần tiết kiệm (REQ-03), nhân cách AI sẽ can thiệp.

**Acceptance Criteria**:
- Given ngân sách Ăn uống bị vượt 100%
  When AI là "Chuyên gia tài chính"
  Then cảnh báo: "Bạn đã vượt 100% ngân sách Ăn uống tháng này. Vui lòng kiểm soát chi phí trong các ngày tới để đảm bảo kế hoạch tài chính."
  When AI là "Bà mẹ nghiêm khắc"
  Then cảnh báo: "Trời đất ơi, chưa hết tháng mà tiêu sạch tiền ăn rồi kìa! Từ giờ đến cuối tháng ăn mì gói hả con?"

### FR-09-06: Tách bạch giữa Logic hệ thống và Tone AI (Safety Constraint)
**Mô tả**: Đảm bảo AI dù "đóng vai" vui vẻ đến đâu cũng không ghi sai số tiền hay phân loại nhầm.

**Acceptance Criteria**:
- Given người dùng yêu cầu `Ghi cho tao khoản tiền đi nhậu 5 củ`
  When nhân cách AI là "Bà mẹ nghiêm khắc"
  Then AI có thể "mắng" người dùng một đoạn dài về việc nhậu nhẹt tốn kém, NHƯNG phần System Entity được xuất ra (JSON hidden) VẪN PHẢI lưu chính xác: Amount=5.000.000, Category=Ăn uống/Giải trí.

### FR-09-07: Cá nhân hóa nhân cách (Personalization)
**Mô tả**: AI ghi nhớ tên người dùng hoặc các xưng hô đặc biệt để gọi cho thân mật.

**Acceptance Criteria**:
- Given người dùng bảo "Từ nay hãy gọi tao là Sếp"
  When nhân cách "Bạn thân" phản hồi ở các lần sau
  Then AI sẽ xưng hô là "Sếp" thay vì "Bạn".

---

## Yêu cầu Phi chức năng (NFR)
- **Prompt Engineering**: Hệ thống Prompt (System Instruction gửi cho LLM) phải được phân tách làm 2 phần: Phần 1 (Cố định) chứa rule trích xuất dữ liệu JSON cứng. Phần 2 (Linh động) chứa Persona definition để LLM sinh câu chữ text. Tránh việc Persona làm ảnh hưởng đến format JSON output.
- **Latency**: Việc thêm Persona Prompt không được làm chậm quá trình bóc tách giao dịch quá 1 giây so với bình thường.

## Open Questions
- [ ] List các nhân cách AI trên (FR-09-01) đã đủ/chuẩn theo ý PO chưa hay cần đổi tên?
- [ ] Ranh giới "Toxic": Có cần gắn cảnh báo cho người dùng khi chọn mode "Bà mẹ nghiêm khắc" hoặc "Drill Sergeant" để tránh họ bị tổn thương tâm lý không?

## Hướng dẫn phê duyệt
> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-09.md` → `REQ-09 Nhân cách AI (AI Personalities).md`

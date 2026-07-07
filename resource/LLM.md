
# Review 5 — Làm rõ vai trò của LLM trong hệ thống PERFIN

> *Tài liệu phân tích nội bộ — Nguyễn Thanh Trọng (B2305615) — PERFIN Niên luận Cơ sở ngành*

---

## 1. Đặt vấn đề — Tại sao không chỉ dùng bộ lọc?

Khi nhìn vào tính năng **chat với AI** trong PERFIN, một câu hỏi tự nhiên nảy sinh:

> *"Nếu người dùng hỏi 'tháng này tôi tiêu bao nhiêu?' hay 'danh mục nào tốn nhất?' — thì UI có bộ lọc và biểu đồ đã làm được điều đó rồi. Vậy LLM ở đây có thực sự cần thiết không?"*

Câu trả lời nằm ở ranh giới giữa hai khái niệm:

| Khả năng                                                                                         | Ai làm được?   |
| -------------------------------------------------------------------------------------------------- | ------------------ |
| **Hiển thị dữ liệu** — xem số tiền, biểu đồ tròn, bảng giao dịch                | UI + bộ lọc      |
| **Truy vấn dữ liệu đơn giản** — tổng tháng này, top 3 danh mục tốn nhất         | SQL + UI           |
| **Phân tích dữ liệu** — nhận ra xu hướng ẩn, bất thường, cảnh báo proactive    | **Cần LLM** |
| **Nhập liệu tự nhiên** — hiểu "ăn phở sáng nay 45k bằng Momo" thành giao dịch    | **Cần LLM** |
| **Cá nhân hóa sâu** — điều chỉnh giọng điệu, phong cách tư vấn theo từng user | **Cần LLM** |

Nếu PERFIN chỉ trả lời "Tháng 6 bạn chi 3.2 triệu" khi user hỏi → đó là chatbot **wrap bộ lọc**, không có giá trị thực. LLM trong PERFIN phải đóng vai trò lớn hơn nhiều: một **trợ lý tài chính siêu cá nhân hóa** biết nhìn ra điều mà người bình thường dễ bỏ sót.

---

## 2. Sáu vai trò cốt lõi của LLM trong PERFIN

### 2.1. Nhập liệu thông minh — NLP Entity Extraction (REQ-01)

Đây là điểm khởi đầu của toàn bộ hệ thống. Thay vì form thủ công (nhập số tiền → chọn danh mục → chọn ngày → chọn ví), người dùng chỉ cần nhắn:

> *"ăn phở sáng nay 45k bằng Momo"*

LLM tự bóc tách **5 thực thể** từ một câu:

| Entity                 | Giá trị              |
| ---------------------- | ---------------------- |
| Mô tả                | ăn phở               |
| Số tiền              | 45.000đ               |
| Thời điểm           | hôm nay (buổi sáng) |
| Ví                    | Momo                   |
| Danh mục (suy đoán) | Ăn uống              |

Điều quan trọng là LLM **hiểu ngữ cảnh**, không phải keyword matching. Nó xử lý được:

- Viết tắt tiền tệ Việt Nam: `30k`, `1.5tr`, `hai trăm nghìn`, `500 ngàn`
- Câu pha tiếng Việt - Anh: *"grab coffee 35k"*, *"lunch meeting 150k"*
- Một câu chứa nhiều giao dịch: *"ăn sáng 30k, grab đi làm 45k"*
- Thông tin ngầm định: *"tiền điện tháng này"* → tự biết đây là chi phí cố định

Không có LLM, không thể có giao diện nhập liệu bằng ngôn ngữ tự nhiên này.

---

### 2.2. Phân loại thông minh có ngữ cảnh — Auto-Categorization (REQ-02)

Rule-based hay keyword mapping đơn giản sẽ thất bại khi:

> *"grab đi bệnh viện 55k"*

- Keyword mapping: `grab` → **Di chuyển** ❌ (sai ngữ cảnh)
- LLM với ngữ cảnh: `grab` + `bệnh viện` → **Y tế** ✅

Thêm vào đó, LLM có thể **gợi ý danh mục mới** dựa trên thói quen của từng user:

> *Nếu user liên tục ghi "cà phê sáng Highlands 45k", "cà phê chiều The Coffee House 55k" trong 30 ngày → LLM gợi ý: "Bạn có muốn tách danh mục 'Cà phê' riêng khỏi 'Ăn uống' không? Tháng này bạn chi khoảng 800k cho cà phê."*

Tính năng **feedback loop** (REQ-02) cũng cần LLM: khi user sửa lại danh mục gợi ý, LLM ghi nhớ pattern đó và dùng làm context cho những lần sau — điều không thể làm với hệ thống rule cứng.

---

### 2.3. Persona / Nhân cách AI — Tâm lý hành vi (REQ-09)

Đây là yếu tố tạo sự khác biệt về **trải nghiệm người dùng**. Cùng một dữ liệu "chi tiêu ăn uống tháng này tăng 40%", ba nhân cách AI sẽ phản hồi hoàn toàn khác nhau:

**🏋️ Huấn luyện viên tài chính:**

> *"Ăn uống tháng này của bạn tăng 40% so với tháng trước. Đây là con số đáng chú ý. Tôi gợi ý bạn đặt mục tiêu giảm 20% tháng tới bằng cách nấu ăn ở nhà ít nhất 3 buổi/tuần."*

**👩 Bà mẹ nghiêm khắc:**

> *"Con ơi! Tháng này ăn uống tăng 40% rồi đó! Cứ đà này đến cuối tháng là cạn túi ngay! Mẹ nói hoài mà không nghe..."*

**👫 Bạn thân:**

> *"Ê, tháng này mày ăn nhiều dữ hén 😅 Tăng 40% so với tháng trước á. Hay tụi mình rủ nhau tự nấu ăn vài bữa để tiết kiệm hơn không?"*

LLM mới có khả năng **duy trì persona xuyên suốt** cuộc hội thoại, hiểu ngữ cảnh từng tin nhắn và phản hồi nhất quán. Hệ thống rule-based sẽ cho ra những câu cứng nhắc, lặp đi lặp lại và dễ đoán.

Tính năng này áp dụng **tâm lý hành vi (Behavioral Psychology)**: cú hích tâm lý (nudge) đúng lúc, đúng cách giúp người dùng tự ý thức và điều chỉnh thói quen chi tiêu.

---

### 2.4. Phát hiện điểm mù tài chính — Proactive Insights (REQ-04)

> **Đây là giá trị lớn nhất và độc đáo nhất của LLM trong PERFIN.**

Người dùng nhìn vào biểu đồ và thấy số liệu — nhưng **không nhìn ra được pattern**. LLM nhìn vào cùng dữ liệu đó và thấy câu chuyện ẩn đằng sau:

#### Phát hiện xu hướng leo thang ngầm

> *"Chi tiêu Grab của bạn đã tăng đều 15% mỗi tháng trong 3 tháng qua (tháng 4: 320k → tháng 5: 368k → tháng 6: 423k). Nếu tiếp tục, tháng tới sẽ vượt 480k chỉ cho việc di chuyển."*

Người dùng nhìn biểu đồ tháng 6 thấy "423k" — bình thường. Nhưng LLM thấy **trend tăng đều** và cảnh báo trước.

#### Phát hiện chi tiêu subscription bị bỏ quên

> *"Bạn có 11 giao dịch subscription hàng tháng, mỗi cái dưới 50k (Netflix 59k, Spotify 59k, iCloud 29k, YouTube Premium 79k...). Nhìn từng cái thấy nhỏ, nhưng tổng lại là **512k/tháng** — gần bằng 1 tuần tiền ăn của bạn."*

Không ai tự cộng những khoản nhỏ này lại. LLM thấy pattern và đặt nó vào ngữ cảnh để user "aha moment".

#### Cảnh báo dòng tiền trước khi cạn

> *"Với tốc độ chi tiêu 7 ngày qua (trung bình 280k/ngày), ví chính của bạn sẽ về 0 vào ngày 23 — tức là trước ngày lương (ngày 25) khoảng 2 ngày."*

Người dùng chỉ thấy "còn 1.2 triệu trong ví" — không tự tính được ngày hết tiền. LLM tính và cảnh báo.

#### Phát hiện pattern hành vi theo ngày/tuần

> *"Mỗi thứ 6, bạn chi trung bình 350k cho giải trí — nhiều hơn 4 lần so với các ngày thường trong tuần. Đây là pattern khá đều trong 2 tháng qua."*

#### Tương quan giữa các danh mục (Cross-category Insight)

> *"Những tuần bạn làm thêm giờ nhiều (chi nhiều cho ăn ngoài), bạn cũng chi nhiều hơn cho Grab và ít đi chợ hơn. Bức tranh này gợi ý: lịch làm việc ảnh hưởng trực tiếp đến chi tiêu sinh hoạt của bạn."*

Đây là loại phân tích mà **không có dashboard nào hiển thị được** — nó cần LLM để tổng hợp và diễn giải.

---

### 2.5. Nhắc nhở chủ động có ngữ cảnh — Smart Reminders (REQ-08)

Cron job thông thường chỉ làm được: *"Nhắc: hôm nay đến hạn trả tiền phòng."*

LLM làm được nhiều hơn:

> *"Hôm nay là mùng 5 — đến hạn trả tiền phòng 2.500.000đ. Tuy nhiên, ví chính của bạn hiện chỉ còn 1.800.000đ. Bạn cần chuyển thêm ít nhất 700k từ ví tiết kiệm trước khi thanh toán. Bạn có muốn mình nhắc lại lúc 9 giờ tối không?"*

LLM kết hợp **ba nguồn thông tin** trong một lời nhắc:

1. Lịch đến hạn (recurring bills)
2. Số dư hiện tại các ví
3. Số tiền cần trả

Kết quả là lời nhắc **có giá trị thực tế**, không phải chỉ thông báo thụ động.

Ngoài ra, LLM có thể **tự nhận diện chi phí cố định** từ lịch sử giao dịch (FR-08-02):

> *"Mình nhận thấy bạn trả 1.500.000đ vào ngày 5 hàng tháng trong 3 tháng qua — có vẻ là tiền phòng trọ. Bạn có muốn mình thêm vào danh sách nhắc nhở định kỳ không?"*

---

### 2.6. Xử lý đa phương thức — OCR + Voice → Structured Data (REQ-01)

Khi người dùng chụp ảnh hóa đơn, Google Vision API trả về text thô dạng:

```
VINMART
Bánh mì sandwich       25,000
Sữa Vinamilk 1L        28,000
Nước suối Lavie        12,000
Thuốc lá Vinataba     28,000
Thuế VAT (10%)          9,300
TỔNG CỘNG:            102,300
```

LLM **hiểu cấu trúc** và bóc tách:

- Tạo **4 giao dịch riêng biệt** theo từng mặt hàng, hoặc 1 giao dịch tổng tùy user setting
- Phân loại: Thực phẩm → Ăn uống, Sữa → Ăn uống, Thuốc lá → tự xây danh mục hoặc hỏi lại
- Nhận diện đây là **chi phí** (không phải thu nhập hay transfer)

Tương tự với voice, sau khi Speech-to-Text chuyển thành text:

> *"Mình vừa chuyển khoản 500 nghìn đóng tiền điện tháng này qua ví Momo, hôm qua hả, ừ hôm qua"*

LLM lọc bỏ từ đệm, nhận diện:

- Số tiền: 500.000đ
- Danh mục: Hóa đơn điện
- Phương thức: Momo
- Thời gian: hôm qua
- Type: Expense

Rule-based không thể xử lý câu nói tự nhiên như thế này.

---

## 3. So sánh "Có LLM" vs "Không có LLM"

| Tình huống              | Không có LLM             | Có LLM trong PERFIN                                |
| ------------------------- | -------------------------- | --------------------------------------------------- |
| Nhập giao dịch          | Form thủ công (6 bước) | Chat 1 câu tự nhiên                              |
| Phân loại danh mục     | Tự chọn từ dropdown     | Tự động, học theo thói quen                    |
| Xem chi tiêu tháng      | Biểu đồ, bộ lọc       | + Nhận xét, so sánh xu hướng, cảnh báo       |
| Phát hiện bất thường | ❌ Tự nhìn biểu đồ    | ✅ AI chủ động cảnh báo                        |
| Nhắc nhở thanh toán    | Thông báo đơn giản    | Nhắc kèm ngữ cảnh số dư, gợi ý hành động |
| Tư vấn cá nhân hóa   | ❌                         | ✅ Dựa trên data thực tế của user              |
| Dự đoán xu hướng     | ❌                         | ✅ Trend analysis từ lịch sử                     |
| Đọc hóa đơn          | ❌                         | ✅ Chụp ảnh → tự nhập                          |
| Nhập bằng giọng nói   | ❌                         | ✅ Nói → ghi nhận giao dịch                     |
| Phong cách giao tiếp    | Cứng nhắc, đồng nhất  | Đa dạng persona, giữ ngữ cảnh                  |

---

## 4. Kết luận — LLM là trái tim của hệ thống, không phải chatbot phụ

LLM trong PERFIN **không phải lớp chatbot bọc bên ngoài database**. Nó là thành phần trung tâm vận hành hầu hết các tính năng:

1. **Cổng vào dữ liệu:** Không có LLM, không có nhập liệu tự nhiên (text, voice, OCR)
2. **Bộ não phân tích:** LLM đọc hiểu pattern mà con người dễ bỏ sót
3. **Người tư vấn:** Đưa ra lời khuyên có giá trị thực, không chỉ echo lại data
4. **Nhân cách:** Duy trì trải nghiệm cá nhân hóa xuyên suốt

Mục tiêu cuối cùng: mỗi khi PERFIN phản hồi, đó phải là **một insight tài chính có giá trị** — không phải là bộ lọc biết nói chuyện.

> *"PERFIN không phải ứng dụng quản lý tài chính có chatbot. PERFIN là trợ lý tài chính AI được bổ sung màn hình quản lý."*

---

*Tài liệu này phục vụ làm rõ định hướng thiết kế và scope của LLM trong báo cáo Niên luận PERFIN.*

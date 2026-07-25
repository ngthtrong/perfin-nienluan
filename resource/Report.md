# TRANG BÌA

> **TRƯỜNG ĐẠI HỌC CẦN THƠ**  
> **TRƯỜNG CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG**
>
> ![Logo Trường Đại học Cần Thơ](../latex/images/ctu_logo.png)
>
> **NIÊN LUẬN CƠ SỞ NGÀNH**
>
> **ỨNG DỤNG DI ĐỘNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN CÓ HỖ TRỢ BỞI MÔ HÌNH NGÔN NGỮ LỚN — PERFIN**
>
> **Ngành:** Kỹ thuật phần mềm  
> **Khóa:** 49  
> **Lớp học phần:** CT239H M01
>
> **Giảng viên hướng dẫn:** TS. Phan Phương Lan
>
> **Sinh viên thực hiện:** Nguyễn Thanh Trọng  
> **MSSV:** B2305615
>
> **Học kỳ:** 3  
> **Năm học:** 2025–2026

---

# TÓM TẮT

PERFIN là nguyên mẫu quản lý tài chính cá nhân nhằm giảm thao tác nhập liệu, bảo toàn tính đúng đắn và khả năng kiểm chứng. Hệ thống tiếp nhận giao dịch từ văn bản, giọng nói và ảnh hóa đơn; chuẩn hóa, trích xuất bản ghi và yêu cầu xác nhận trước khi ghi PostgreSQL. SQL và các giải thuật xác định tính số dư, ngân sách, xu hướng, bất thường, dòng tiền, khoản định kỳ và mục tiêu; LLM chỉ hiểu ý định, điền tham số, hỏi lại khi mơ hồ và diễn giải facts đã tính. Đóng góp là kiến trúc tách lớp sinh ngôn ngữ khỏi lõi tài chính, dùng Redis quản lý trạng thái và BullMQ điều phối tác vụ, kèm giao thức đánh giá tính đúng và độ trung thực số liệu. Kết quả đạt 182/182 backend test, 31/31 local-parser quality gate (kiểm tra strict trên 31 câu cấu trúc rõ, đo tính đúng của luồng phân tích cú pháp, khác với đo chất lượng phân loại danh mục bên dưới) và 23/23 full smoke test; ứng dụng đóng gói trên web, Android; dữ liệu demo gồm 5.265 giao dịch có provenance. Trên chính tập gán nhãn này, ba thí nghiệm tái lập cho thấy: local parser đạt accuracy 29,36% / macro-F1 0,177 (khoảng cách phản ánh nhãn lịch sử theo nguồn tiền), LLM Gemini vượt parser khoảng 3,0× macro-F1 (0,607 so 0,204) trong ablation, và correction retrieval nâng accuracy holdout từ 0% lên 68,19%. Tuy nhiên, kết quả chưa chứng minh độ chính xác OCR/STT, numeric faithfulness hoặc mức sẵn sàng production; các chỉ số này vẫn phải được đo trên bộ dữ liệu tái lập.

**Từ khóa:** quản lý tài chính cá nhân, LLM, phân tích dữ liệu, trích xuất thực thể, PostgreSQL, Redis, hệ thống có kiểm chứng.

---

# MỤC LỤC

Mục lục chính thức được sinh tự động đến cấp 4 khi biên dịch dự án LaTeX. Bản Markdown này giữ nguyên hệ thống đánh số chương, mục, tiểu mục và tiểu-tiểu mục để đồng bộ với bản LaTeX.

---

# DANH MỤC BẢNG

| STT | Tên bảng |
|---|---|
| Bảng 1 | Quy ước mức độ xác nhận thông tin trong báo cáo |
| Bảng 2 | Mục tiêu và tiêu chí đánh giá của đề tài |
| Bảng 3 | Phạm vi thực hiện và nội dung ngoài phạm vi |
| Bảng 4 | Các giải thuật xác định và tính năng sử dụng |
| Bảng 5 | Ranh giới trách nhiệm giữa lõi xác định và LLM |
| Bảng 6 | Công nghệ, tiêu chí lựa chọn và phương án thay thế |
| Bảng 7 | Khoảng trống và hướng giải quyết của PERFIN |
| Bảng 8 | Tác nhân của hệ thống |
| Bảng 9 | Phân nhóm chức năng theo mức ưu tiên học thuật |
| Bảng 10 | Yêu cầu chức năng |
| Bảng 11 | Yêu cầu phi chức năng và cách đo |
| Bảng 12 | Thành phần kiến trúc và trách nhiệm |
| Bảng 13 | Nhóm thực thể dữ liệu chính |
| Bảng 14 | Điều kiện kiểm soát đối với các thao tác do LLM khởi tạo |
| Bảng 15 | Ma trận kiểm thử |
| Bảng 16 | Bộ chỉ số đánh giá |
| Bảng 17 | Kết quả đã đo và các phép đo còn thiếu |
| Bảng 18 | Trạng thái và hành vi đích của chức năng trọng yếu |
| Bảng 19 | Kết quả phân loại local parser trên dataFinance.csv |
| Bảng 20 | Ablation local parser vs LLM |
| Bảng 21 | Feedback before/after trên tập holdout |
| Bảng 22 | Đối chiếu mục tiêu với bằng chứng |

---

# DANH MỤC HÌNH

| STT | Tên hình | Tệp nguồn Draw.io |
|---|---|---|
| Hình 1 | Sơ đồ ngữ cảnh và phạm vi hệ thống PERFIN | `01-system-context` |
| Hình 2 | Kiến trúc vận hành của PERFIN | `02-runtime-architecture` |
| Hình 3 | Sơ đồ triển khai nguyên mẫu | `03-deployment` |
| Hình 4 | Mô hình miền theo aggregate nghiệp vụ | `04-domain-class` |
| Hình 5 | Sơ đồ quan hệ thực thể vật lý | `05-physical-erd` |
| Hình 6 | Ranh giới trách nhiệm của LLM | `06-llm-boundary` |
| Hình 7 | Máy trạng thái hội thoại và giao dịch chờ xác nhận | `07-conversation-state` |
| Hình 8 | Sơ đồ tuần tự nhập giao dịch bằng văn bản | `08-text-sequence` |
| Hình 9 | Luồng xử lý đầu vào đa phương thức | `09-multimodal-flow` |
| Hình 10 | Luồng phản hồi và cá nhân hóa phân loại | `10-feedback-flow` |
| Hình 11 | Sơ đồ tuần tự sinh insight có căn cứ | `11-insight-sequence` |
| Hình 12 | Luồng lập kế hoạch mục tiêu và mô phỏng what-if | `12-goal-flow` |
| Hình 13 | Sơ đồ tuần tự tác vụ chủ động | `13-worker-sequence` |

---

# DANH MỤC CÁC TỪ VIẾT TẮT

| Từ viết tắt | Giải thích |
|---|---|
| AI | Artificial Intelligence — Trí tuệ nhân tạo |
| API | Application Programming Interface — Giao diện lập trình ứng dụng |
| ASR | Automatic Speech Recognition — Nhận dạng tiếng nói tự động |
| CRUD | Create, Read, Update, Delete — Tạo, đọc, cập nhật, xóa |
| CSV | Comma-Separated Values |
| DB | Database — Cơ sở dữ liệu |
| ERD | Entity–Relationship Diagram — Sơ đồ quan hệ thực thể |
| F1 | F1-score — Trung bình điều hòa giữa precision và recall |
| FR | Functional Requirement — Yêu cầu chức năng |
| IQR | Interquartile Range — Khoảng tứ phân vị |
| JSON | JavaScript Object Notation |
| KV | Key–Value — Khóa–giá trị |
| LLM | Large Language Model — Mô hình ngôn ngữ lớn |
| NFR | Non-Functional Requirement — Yêu cầu phi chức năng |
| NLP | Natural Language Processing — Xử lý ngôn ngữ tự nhiên |
| OCR | Optical Character Recognition — Nhận dạng ký tự quang học |
| PII | Personally Identifiable Information — Dữ liệu định danh cá nhân |
| REST | Representational State Transfer |
| SRS | Software Requirements Specification — Đặc tả yêu cầu phần mềm |
| STT | Speech-to-Text — Chuyển giọng nói thành văn bản |
| TTL | Time To Live — Thời gian tồn tại của dữ liệu tạm |
| UI | User Interface — Giao diện người dùng |

---

# QUY ƯỚC VỀ TRẠNG THÁI VÀ KẾT QUẢ

Báo cáo này mô tả **kiến trúc đích (TO-BE)** của nguyên mẫu sau khi các lỗi đã biết trong phạm vi đề tài được sửa. Kiến trúc đích không đồng nghĩa mọi chỉ số đã được đo và cũng không mở rộng sang các chức năng đã chủ động loại khỏi phạm vi. Để tránh biến kỳ vọng thành kết quả, báo cáo sử dụng quy ước tại Bảng 1.

**Bảng 1. Quy ước mức độ xác nhận thông tin trong báo cáo**

| Nhãn | Ý nghĩa | Cách sử dụng |
|---|---|---|
| **Đã hiện thực** | Có thành phần tương ứng trong mã nguồn, migration hoặc test | Chứng minh sự tồn tại, chưa tự động chứng minh chất lượng |
| **Đã đo** | Có lệnh, thời điểm và kết quả chạy có thể tái lập | Được phép đưa số liệu vào phần kết quả |
| **Mục tiêu** | Ngưỡng mong muốn dùng làm tiêu chí nghiệm thu | Không được trình bày như kết quả đã đạt |
| **Thiết kế đích** | Hành vi dự kiến sau khi hoàn tất sửa lỗi trong phạm vi | Phải được kiểm thử trước khi chuyển thành “đã đo” |
| **Ngoài phạm vi** | Không phải mục tiêu của niên luận hiện tại | Chỉ nêu ở hạn chế hoặc hướng phát triển |

---

# CHƯƠNG 1: GIỚI THIỆU

## 1.1. ĐẶT VẤN ĐỀ

### 1.1.1. Bối cảnh

Quản lý tài chính cá nhân đòi hỏi người dùng ghi nhận giao dịch đều đặn, phân loại đúng và hiểu được ý nghĩa của lịch sử thu–chi. Kiến thức tài chính có liên quan trực tiếp đến khả năng lập kế hoạch và ra quyết định dài hạn [1]. Tuy nhiên, phần lớn công cụ ghi chép truyền thống yêu cầu nhiều thao tác: chọn loại giao dịch, nhập số tiền, chọn danh mục, ví và thời gian. Khi thao tác nhập liệu trở thành gánh nặng, dữ liệu dễ bị thiếu, sai danh mục hoặc không liên tục; báo cáo phía sau vì vậy cũng kém tin cậy.

Đầu vào tự nhiên như “ăn phở sáng nay 45k bằng Momo” giúp giảm số bước thao tác, nhưng tạo ra bài toán kỹ thuật khác: hệ thống phải hiểu đơn vị tiền Việt Nam, ngày tương đối, nhiều giao dịch trong một câu, tên ví gần đúng và ngữ cảnh phân loại. Ảnh hóa đơn và giọng nói còn bổ sung nhiễu OCR/STT. Nếu ghi thẳng kết quả suy đoán vào cơ sở dữ liệu, một lỗi nhỏ của mô hình có thể làm sai số dư, ngân sách và toàn bộ insight về sau.

### 1.1.2. Vấn đề về phân tích và diễn giải

Biểu đồ và bộ lọc trả lời tốt các câu hỏi xác định như “tháng này đã chi bao nhiêu”. Giá trị nghiên cứu của PERFIN không nằm ở việc bọc câu truy vấn SQL bằng một chatbot. Hệ thống cần phát hiện và kiểm chứng các hiện tượng khó quan sát bằng một con số đơn lẻ: xu hướng tăng dần, ngày chi bất thường, tốc độ cạn dòng tiền, khoản phí định kỳ nhỏ lẻ hoặc tiến độ mục tiêu bị lệch.

Các hiện tượng trên phải được tính bằng giải thuật có thể kiểm thử. LLM có thể hiểu câu hỏi và diễn giải kết quả, nhưng không phải nguồn chân lý cho phép tính tài chính. Nếu giao toàn bộ phân tích cho LLM, kết quả khó tái lập và có nguy cơ xuất hiện số liệu không có trong dữ liệu gốc.

### 1.1.3. Bài toán nghiên cứu

Đề tài tập trung trả lời ba câu hỏi:

1. Làm thế nào chuyển đầu vào văn bản, ảnh và giọng nói thành giao dịch có cấu trúc mà vẫn bảo vệ tính đúng đắn của dữ liệu?
2. Những giải thuật xác định nào phù hợp để tạo insight có thể giải thích từ lịch sử tài chính cá nhân?
3. LLM nên tham gia ở đâu để tăng tính tự nhiên và cá nhân hóa mà không chiếm quyền tính toán hay tự ý thay đổi dữ liệu?

![Hình 1. Sơ đồ ngữ cảnh và phạm vi hệ thống PERFIN](../latex/figures/rendered/01-system-context.png)

**Hình 1. Sơ đồ ngữ cảnh và phạm vi hệ thống PERFIN.** Người dùng tương tác với ứng dụng di động; PERFIN quản lý dữ liệu và giải thuật nội bộ; các nhà cung cấp LLM, OCR và STT chỉ là dịch vụ hỗ trợ. Biên hệ thống loại trừ ngân hàng, ví dùng chung và hệ thống xác thực production khỏi phạm vi niên luận.

## 1.2. MỤC TIÊU

Mục tiêu tổng quát là xây dựng và đánh giá một nguyên mẫu quản lý tài chính cá nhân trong đó dữ liệu có cấu trúc và giải thuật xác định là nền tảng, còn LLM là lớp hiểu ngôn ngữ và diễn giải có kiểm soát.

**Bảng 2. Mục tiêu và tiêu chí đánh giá của đề tài**

| Mã | Mục tiêu cụ thể | Bằng chứng cần có | Mục tiêu nghiệm thu, không phải kết quả hiện tại |
|---|---|---|---|
| O1 | Xây dựng mô hình dữ liệu tài chính có khóa, ràng buộc, chỉ mục và giao dịch nguyên tử | Migration, ERD vật lý, test rollback/validation | 100% tình huống cập nhật số dư quan trọng hoặc hoàn tất toàn bộ hoặc không thay đổi dữ liệu |
| O2 | Xây dựng pipeline trích xuất giao dịch đa phương thức có clarification và xác nhận | Bộ dữ liệu gán nhãn, log tool call, test preview/confirm | F1 thực thể và độ chính xác phân loại đạt ngưỡng được chốt trước khi nghiệm thu; không ghi DB khi thiếu trường bắt buộc |
| O3 | Hiện thực các giải thuật trend, anomaly, runway, recurring, correlation, ngân sách và mục tiêu | Unit test với dữ liệu biên, dữ liệu mẫu và kết quả tay | 100% test công thức và trường hợp biên trọng yếu vượt qua |
| O4 | Giới hạn LLM ở hiểu ý định, gọi công cụ và diễn giải facts | Lược đồ tool, kiểm tra numeric faithfulness, test fallback | Không xuất hiện số tiền/ngày/tỷ lệ ngoài tập facts được cấp trong bộ kiểm thử grounding |
| O5 | Đánh giá khả năng vận hành của nguyên mẫu | Test tích hợp, độ trễ p50/p95, cache hit, lỗi provider | Công bố số liệu thực đo kèm môi trường; không suy diễn từ test đơn vị |

## 1.3. PHẠM VI ĐỀ TÀI

### 1.3.1. Phạm vi thực hiện

**Bảng 3. Phạm vi thực hiện và nội dung ngoài phạm vi**

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| Giao dịch thu, chi, chuyển ví và lãi/lỗ đầu tư ở mức nguyên mẫu | Kết nối Open Banking và đồng bộ ngân hàng thật |
| Nhập văn bản, ảnh hóa đơn, giọng nói; preview và xác nhận | Huấn luyện một mô hình nền tảng hoặc mô hình OCR/STT mới |
| Danh mục, phản hồi sửa sai, gợi ý danh mục và re-tag có xác nhận | Ví dùng chung, chia nợ nhóm và cộng tác thời gian thực |
| Ngân sách, recurring bill, báo cáo, insight và mục tiêu tài chính | Tư vấn đầu tư, chấm điểm tín dụng hoặc quyết định tài chính thay người dùng |
| Một hồ sơ demo `default_user` có khóa ngoại và đường nâng cấp | Đăng ký, đăng nhập, JWT, phân quyền và cô lập multi-user production |
| Redis, worker và cơ chế fallback phục vụ demo/kiểm thử | Hạ tầng sẵn sàng cao, giám sát tập trung và cam kết uptime production |

### 1.3.2. Giả định và giới hạn

- Đơn vị tiền mặc định là VND; mọi phép tính tiền dùng kiểu số thập phân trong cơ sở dữ liệu, không dùng số do LLM sinh làm nguồn chuẩn.
- Dữ liệu phân tích đủ dài mới cho kết luận đáng tin. Hệ thống phải hạ mức tin cậy hoặc từ chối kết luận khi số quan sát quá ít.
- Persona chỉ thay đổi cách diễn đạt, không thay đổi facts, phép tính, quyền truy cập hoặc điều kiện xác nhận.
- Nguyên mẫu không thay thế chuyên gia tài chính; mọi gợi ý chỉ mang tính hỗ trợ quản lý dữ liệu cá nhân.

## 1.4. ĐÓNG GÓP CỦA ĐỀ TÀI

Đóng góp chính của đề tài gồm:

1. Mô hình dữ liệu tài chính có ràng buộc và các luồng cập nhật nguyên tử, làm nền cho báo cáo đáng tin cậy.
2. Pipeline kết hợp LLM, bộ phân tích cục bộ, fuzzy matching và con người trong vòng lặp để chuyển ngôn ngữ tự nhiên thành dữ liệu có kiểm chứng.
3. Bộ giải thuật phân tích thuần xác định, tách khỏi lớp sinh ngôn ngữ và có thể kiểm thử độc lập.
4. Cơ chế grounded narration: LLM chỉ nhận `insight facts` đã tính, từ đó diễn giải theo persona mà không được sửa số liệu.
5. Giao thức đánh giá phân biệt rõ tính đúng của thuật toán, chất lượng AI, hiệu năng hệ thống và trải nghiệm nhập liệu.

## 1.5. BỐ CỤC BÁO CÁO

Chương 1 trình bày bài toán, mục tiêu và phạm vi. Chương 2 xây dựng nền tảng lý thuyết về dữ liệu tài chính, LLM, OCR/STT và các giải thuật phân tích. Chương 3 đặc tả yêu cầu, thiết kế hệ thống, mô hình dữ liệu, luồng xử lý và kế hoạch kiểm thử. Chương 4 đối chiếu mục tiêu, nêu hạn chế và hướng phát triển.

---

# CHƯƠNG 2: CƠ SỞ LÝ THUYẾT

## 2.1. DỮ LIỆU TÀI CHÍNH VÀ TIỀN XỬ LÝ

### 2.1.1. Mô hình giao dịch, số dư và dòng tiền

Một giao dịch hợp lệ tối thiểu có số tiền $A>0$, loại giao dịch, ngày, mô tả, danh mục và ví thuộc phạm vi người dùng. PERFIN phân biệt `income`, `expense`, `transfer`, `investment_inflow`, `investment_outflow` và `investment_pnl` vì mỗi loại tạo tác động khác nhau lên số dư và báo cáo. Với ví $w$, biến thiên số dư do giao dịch thu hoặc chi là:

$$
\Delta B_w =
\begin{cases}
+A, & \text{nếu là thu nhập},\\
-A, & \text{nếu là chi phí}.
\end{cases}
$$

Trong kỳ $P$, tổng thu $I_P$, tổng chi $E_P$ và dòng tiền ròng $N_P$ được tính từ các giao dịch chưa bị xóa mềm:

$$
I_P=\sum_{t\in P,\,type(t)=income}A_t,\qquad
E_P=\sum_{t\in P,\,type(t)=expense}A_t,\qquad
N_P=I_P-E_P.
$$

Chuyển $A$ từ ví nguồn $s$ sang ví đích $d$ tạo $\Delta B_s=-A$ và $\Delta B_d=+A$, do đó $\Delta(B_s+B_d)=0$. Đây là invariant giúp chuyển ví không bị tính thành thu/chi. Nguyên mẫu cho phép số dư ví âm để phản ánh tiền mặt hoặc tài khoản bị thấu chi; vì vậy điều kiện nghiệp vụ là số tiền dương, hai ví khác nhau và cùng thuộc người dùng, không phải “đủ số dư”. Debit, credit và bản ghi lịch sử phải nằm trong cùng transaction `BEGIN/COMMIT`; nếu một bước lỗi, `ROLLBACK` khôi phục toàn bộ trạng thái [7].

### 2.1.2. Toàn vẹn và vòng đời dữ liệu

PERFIN áp dụng bốn lớp bảo vệ:

1. **Ràng buộc miền:** số tiền giao dịch, hạn mức và mức góp phải hợp lệ; ngày không vượt quá miền nghiệp vụ cho phép.
2. **Toàn vẹn tham chiếu:** giao dịch tham chiếu người dùng, danh mục và ví bằng khóa ngoại.
3. **Toàn vẹn nghiệp vụ:** không chuyển giữa cùng một ví; không ghi giao dịch thiếu trường bắt buộc; xóa mềm không làm mất khả năng phục hồi.
4. **Tính nguyên tử:** mọi thay đổi nhiều bảng hoặc thay đổi số dư kèm lịch sử được commit toàn bộ hoặc không commit.

Chỉ mục đặt trên các cột lọc thường xuyên như người dùng, ngày, danh mục, ví và trạng thái. Tiền được lưu bằng `DECIMAL(15,2)`; khi đưa sang JavaScript phải chuyển kiểu có kiểm soát để tránh nối chuỗi hoặc làm tròn ngoài ý muốn. Cache được vô hiệu hóa sau commit; lỗi cache sau commit không được trả thành lỗi nghiệp vụ vì có thể khiến client thử lại và tạo tác động lặp.

### 2.1.3. Chuẩn hóa trục thời gian và cửa sổ quan sát

Phân tích theo ngày, tuần hoặc tháng phải giữ đúng trục lịch. Gọi $x_j$ là tổng chi của kỳ lịch thứ $j$ trong cửa sổ $W$. Nếu kỳ đó không có giao dịch thì $x_j=0$, không được xóa kỳ khỏi chuỗi. Zero-fill ngăn hai sai lệch: nén khoảng cách thời gian làm tăng giả slope và chỉ lấy ngày có chi làm tăng giả tốc độ đốt tiền.

Cửa sổ quan sát luôn phải đi kèm kết quả. PERFIN hiện dùng 14 ngày cho runway, 30 ngày cho anomaly, 90 ngày cho khoản định kỳ, 6 tháng cho xu hướng và 12 tuần cho tương quan theo mặc định. Đây là tham số khởi đầu của nguyên mẫu, không phải ngưỡng tối ưu đã được chứng minh trên mọi người dùng.

### 2.1.4. Dữ liệu bền vững và trạng thái tạm

PostgreSQL lưu dữ liệu nghiệp vụ cần kiểm toán. Redis lưu trạng thái ngắn hạn: giao dịch chờ xác nhận, trường đang hỏi lại, danh sách lựa chọn mơ hồ, cache và bộ đếm rate limit. TTL làm hết hạn trạng thái hội thoại theo cơ chế `EXPIRE` [8]. Fallback bộ nhớ tiến trình chỉ phục vụ phát triển; dữ liệu mất khi khởi động lại và không phải cấu hình production.

## 2.2. CHUẨN HÓA VÀ PHÂN LOẠI ĐẦU VÀO

### 2.2.1. Chuẩn hóa số tiền, ngày và cấu trúc giao dịch

Đầu vào tự nhiên được chuyển thành typed draft trước khi validation. Các hậu tố `k`, `nghìn`, `ngàn` nhân giá trị với $10^3$; `tr`, `triệu` nhân với $10^6$. Ngày tương đối được quy đổi theo ngày cục bộ của request. Một câu có nhiều khoản phải tạo một mảng draft, trong đó mỗi phần tử có `amount`, `type`, `description`, `transaction_date`, `category` và `wallet` riêng. Parser hoặc LLM chỉ tạo draft; service mới kiểm tra số hữu hạn, miền ngày, danh mục/ví và quyền sở hữu trước khi tạo preview.

### 2.2.2. Độ tương đồng văn bản và chọn danh mục an toàn

Chuỗi được bỏ dấu, chuyển chữ thường, loại ký tự ngoài chữ/số và thu gọn khoảng trắng. Với hai chuỗi chuẩn hóa $a,b$, điểm chỉnh sửa dùng khoảng cách Levenshtein $D_{lev}$ [13]:

$$
s_{edit}=1-\frac{D_{lev}(a,b)}{\max(|a|,|b|)}.
$$

Gọi $T_a,T_b$ là hai tập token, hệ số Dice [14] là:

$$
s_{dice}=\frac{2|T_a\cap T_b|}{|T_a|+|T_b|}.
$$

Nếu tập token nhỏ hơn có ít nhất hai phần tử và nằm trọn trong tập lớn hơn, điểm containment $s_{contain}$ nằm trong khoảng $[0{,}82;0{,}94]$ theo tỷ lệ độ dài. Điểm chung của mã nguồn là:

$$
s=\max(s_{edit},\;0{,}92s_{dice},\;s_{contain}).
$$

Thứ tự chọn là exact tên danh mục, exact alias rồi mới fuzzy. Input dài dùng ngưỡng $\tau=0{,}82$, input không quá bốn ký tự dùng $\tau=0{,}90$. Ứng viên tốt nhất còn phải hơn ứng viên thứ hai ít nhất margin $m=0{,}08$. Nếu $s_1<\tau$ hoặc $s_1-s_2<m$, hệ thống chọn “Khác”/yêu cầu làm rõ thay vì tự gán một kết quả mơ hồ. Công thức này phục vụ FR-04 và không thay thế xác nhận của người dùng.

### 2.2.3. Học từ phản hồi

Khi người dùng sửa danh mục, hệ thống lưu cặp kết quả ban đầu–kết quả đúng cùng ngữ cảnh. Correction exact/fuzzy được xét trước alias và LLM ở lần sau; correction mâu thuẫn làm hạ độ tin cậy hoặc yêu cầu xác nhận. Đây là retrieval kết hợp quy tắc thích nghi, **không phải fine-tuning** mô hình. Tác dụng của feedback phải được đánh giá bằng accuracy/macro-F1 trước và sau trên cùng tập phát lại.

### 2.2.4. OCR, Speech-to-Text và adapter nhà cung cấp

OCR gồm tiền xử lý ảnh, phát hiện vùng chữ, nhận dạng và hậu xử lý [5]. STT chuyển âm thanh thành transcript; các mô hình đa ngôn ngữ như Whisper cho thấy khả năng học từ dữ liệu tiếng nói quy mô lớn [6]. Trong PERFIN, provider chỉ trả raw text/transcript cùng tên provider và trạng thái lỗi; kết quả tiếp tục đi qua pipeline draft–validation–preview như văn bản.

Ảnh hóa đơn có thể tạo một giao dịch tổng hoặc nhiều draft mặt hàng, nhưng phiên bản hiện tại **chưa có thuật toán tự động đối chiếu** tổng mặt hàng với tổng hóa đơn, thuế và giảm giá. Do đó người dùng phải kiểm tra preview; báo cáo không xem smoke test hai ảnh là phép đo OCR accuracy. Transcript cũng phải được hiển thị trước khi xác nhận để lỗi nhận dạng không âm thầm trở thành số tiền. Adapter cho phép thay PaddleOCR/PhoWhisper bằng provider cloud mà không sửa transaction service; khi provider lỗi, hệ thống trả lỗi hoặc cho nhập tay, không sinh dữ liệu mẫu.

## 2.3. CÁC GIẢI THUẬT PHÂN TÍCH VÀ LẬP KẾ HOẠCH

**Bảng 4. Các giải thuật xác định và tính năng sử dụng**

| Giải thuật | Đầu vào chuẩn hóa | Đầu ra | Tính năng sử dụng |
|---|---|---|---|
| Hồi quy tuyến tính | Chuỗi chi theo tháng có zero-fill | slope, $R^2$, dự báo | FR-07: xu hướng |
| Z-score và IQR | Chuỗi chi theo ngày/khoản | cờ, điểm và phương pháp | FR-07: bất thường |
| Cashflow runway | Tổng số dư và 14 ngày lịch | burn rate, số ngày, ngày cạn | FR-07/FR-11: cảnh báo dòng tiền |
| Khai phá khoản định kỳ | Mô tả, số tiền, ngày | cụm, cadence, ước tính tháng | FR-07/FR-11: subscription scan |
| Pearson | Hai chuỗi tuần có zero-fill | hệ số tương quan dương | FR-07: liên hệ danh mục |
| Budget recommender/forecast | Chi theo tháng, thu nhập, hạn mức | đề xuất và dự báo vượt | FR-09 |
| Goal planner | Mục tiêu, mức góp/trả, hạn, lãi suất | thời gian, thiếu hụt, what-if | FR-10 |

### 2.3.1. Hồi quy tuyến tính và dự báo xu hướng

Gọi $y_i$ là tổng chi của kỳ $i$, $x_i=i$ với $i=0,\ldots,n-1$, $\bar{x}$ và $\bar{y}$ là trung bình tương ứng. Đường bình phương tối thiểu (OLS) $\hat y_i=a+bx_i$ [15] có:

$$
b=\frac{\sum_{i=0}^{n-1}(x_i-\bar{x})(y_i-\bar{y})}
        {\sum_{i=0}^{n-1}(x_i-\bar{x})^2},
\qquad a=\bar{y}-b\bar{x}.
$$

Mức phù hợp và dự báo kỳ kế tiếp là:

$$
R^2=1-\frac{\sum_i(y_i-\hat y_i)^2}{\sum_i(y_i-\bar y)^2},
\qquad \hat y_n=\max(0,a+bn).
$$

Khi chuỗi hằng làm mẫu số của $R^2$ bằng 0, mã nguồn trả $R^2=0$ và không công bố xu hướng. Service chỉ đưa một xu hướng tăng vào facts khi có ít nhất ba tháng, $b>0$, $R^2\ge0{,}5$ và trung bình phần trăm thay đổi giữa các cặp có mẫu trước dương đạt ít nhất 10%. Zero-fill phải được thực hiện trước hồi quy. Kết quả mô tả xu hướng tuyến tính ngắn hạn, không mô hình hóa mùa vụ hoặc sự kiện tương lai.

### 2.3.2. Phát hiện bất thường bằng z-score và IQR

Với $n\ge4$ giá trị chi $x_i$, trung bình và độ lệch chuẩn mẫu là:

$$
\mu=\frac1n\sum_{i=1}^{n}x_i,
\qquad s=\sqrt{\frac{\sum_{i=1}^{n}(x_i-\mu)^2}{n-1}},
\qquad z_i=\frac{x_i-\mu}{s}.
$$

Quantile được nội suy tuyến tính trên dãy đã sắp xếp; đặt $IQR=Q_3-Q_1$ và ngưỡng trên $U=Q_3+kIQR$. PERFIN đánh dấu phía chi lớn khi:

$$
z_i\ge2{,}5\quad\lor\quad x_i>Q_3+1{,}5IQR.
$$

Nếu $s=0$ thì $z_i=0$; nếu $IQR=0$ thì nhánh IQR không phát cờ. Đầu ra gồm giá trị, ngày/nhãn, $z_i$, tỷ số so với trung bình và phương pháp `z`, `iqr` hoặc `z+iqr`. Kết quả chỉ yêu cầu người dùng rà soát; nó không chứng minh gian lận và ngưỡng cần được hiệu chỉnh trên dữ liệu đại diện. IQR được chọn vì bền vững hơn trước ngoại lệ [10].

### 2.3.3. Ước lượng thời gian cạn dòng tiền

Gọi $B=\sum_w B_w$ là tổng số dư hiện tại, $W=14$ là số ngày lịch quan sát và $e_j\ge0$ là chi tiêu ngày thứ $j$; ngày không chi có $e_j=0$. Burn rate và số ngày còn lại là:

$$
\bar e_W=\frac1W\sum_{j=1}^{W}e_j,
\qquad d=\left\lfloor\frac{B}{\bar e_W}\right\rfloor.
$$

Nếu $B\le0$, `daysLeft=0`; nếu $\bar e_W=0$, hệ thống không dự báo ngày cạn (`null`). Trường hợp còn lại, ngày cạn bằng ngày hiện tại cộng $d$. Khi có ngày lương, hệ thống tìm lần xuất hiện kế tiếp trong lịch và so sánh với ngày cạn. Ví dụ, $B=2{,}8$ triệu đồng và tổng chi 14 ngày là $1{,}4$ triệu đồng cho $\bar e=100.000$ đồng/ngày, nên $d=28$ ngày. Đây là ngoại suy giữ nguyên mức chi gần đây, chưa xét khoản thu hay chi bất thường sắp tới.

### 2.3.4. Khai phá khoản chi định kỳ

Chỉ các giao dịch `expense` không vượt 500.000 đồng được xét trong cấu hình hiện tại. Sau khi chuẩn hóa mô tả, các giao dịch có cùng khóa được gom thành cụm gồm $m$ số tiền $a_i$ và ngày $t_i$. Số tiền trung bình, độ lệch tương đối và cadence trung bình là:

$$
\bar a=\frac1m\sum_{i=1}^{m}a_i,
\qquad \delta_i=\frac{|a_i-\bar a|}{\bar a},
\qquad \bar\Delta=\frac1{m-1}\sum_{i=2}^{m}|t_i-t_{i-1}|.
$$

Cụm ổn định khi mọi $\delta_i\le0{,}15$. Cụm là ứng viên định kỳ khi ổn định và thỏa một trong hai điều kiện: $20\le\bar\Delta\le40$ ngày, hoặc có ít nhất ba lần xuất hiện. Với $m=2$, cadence vẫn phải nằm trong cửa sổ. Ước tính tháng hiện bằng $\bar a$ với giả định một lần thu mỗi tháng; tổng subscription là tổng các ước tính cụm. Exact grouping giúp hạn chế false positive nhưng có thể bỏ sót mô tả biến thể, do đó cần báo đây là “dấu hiệu định kỳ”, không tự tạo recurring bill hay hủy dịch vụ.

### 2.3.5. Tương quan chi tiêu liên danh mục

Với hai chuỗi chi theo tuần $X=(x_1,\ldots,x_n)$ và $Y=(y_1,\ldots,y_n)$ trên cùng trục tuần, tuần thiếu của một danh mục được điền 0. Hệ số tương quan Pearson [16] là:

$$
r=\frac{\sum_i(x_i-\bar{x})(y_i-\bar{y})}
{\sqrt{\sum_i(x_i-\bar{x})^2\sum_i(y_i-\bar{y})^2}}.
$$

Hàm trả 0 nếu $n<3$ hoặc một chuỗi có phương sai bằng 0. Phiên bản hiện tại chỉ xét danh mục có ít nhất bốn tuần quan sát và chỉ công bố cặp có tương quan **dương** $r\ge0{,}6$; chưa công bố tương quan âm. Hệ thống chọn cặp có $r$ lớn nhất và phải diễn giải là “đồng biến trong dữ liệu quan sát”, không suy ra quan hệ nhân quả.

### 2.3.6. Đề xuất và dự báo ngân sách

Gọi $s_{c,j}$ là chi của danh mục $c$ ở tháng $j$ trong $m$ tháng lịch; tháng không phát sinh có $s_{c,j}=0$. Trung bình và mức nền có buffer $\beta=5\%$ là:

$$
\bar s_c=\frac1m\sum_{j=1}^{m}s_{c,j},
\qquad b_c=(1+\beta)\bar s_c.
$$

Với thu nhập tháng $Y$, khung mặc định dành tối đa $C_{need}=0{,}50Y$ cho nhu cầu, $C_{want}=0{,}30Y$ cho mong muốn và đặt mục tiêu $0{,}20Y$ cho tiết kiệm. Ba chiến lược tạo hạn mức thô $L_c$:

$$
L_c=\begin{cases}
b_c, & \text{category\_average},\\
C_g\dfrac{b_c}{\sum_{k\in g}b_k}, & \text{50/30/20},\\
b_c\min\left(1,\dfrac{C_g}{\sum_{k\in g}b_k}\right), & \text{hybrid},
\end{cases}
$$

trong đó $g$ là nhóm nhu cầu hoặc mong muốn. Kết quả được làm tròn theo bước 10.000 đồng; giá trị dương nhỏ hơn một bước vẫn thành 10.000 đồng. Confidence theo số tháng có phát sinh của danh mục: cao khi ít nhất 6, trung bình khi 3–5, thấp khi dưới 3; toàn bộ đề xuất còn có cảnh báo nếu lịch sử quan sát dưới ba tháng.

Để dự báo vượt hạn mức trong tháng, với $S$ là số đã chi sau $d_e$ ngày và tháng có $D$ ngày:

$$
q=\frac{S}{d_e},\qquad \widehat S_D=qD,
\qquad d_{vượt}=\left\lceil\frac{L-S}{q}\right\rceil.
$$

Hệ thống gắn `likely_to_exceed` khi $\widehat S_D>L$. Công thức giả định tốc độ chi không đổi, nên chỉ là cảnh báo sớm; đề xuất hoặc thay đổi hạn mức luôn cần người dùng xác nhận.

### 2.3.7. Lập kế hoạch mục tiêu và trả nợ

Với mục tiêu tiết kiệm/mua sắm, gọi $T>0$ là số mục tiêu, $C\ge0$ là số hiện có, $R=\max(0,T-C)$ là phần còn thiếu và $M\ge0$ là mức góp tháng. Nếu $M>0$:

$$
n=\left\lceil\frac{R}{M}\right\rceil.
$$

Nếu hạn chót còn $n_D>0$ tháng, mức góp bắt buộc $M_D=\lceil R/n_D\rceil$, khoảng thiếu tháng $G=\max(0,M_D-M)$ và thiếu hụt tại hạn $H=\max(0,R-Mn_D)$. Khi $M=0$, thời gian hoàn thành không xác định; khi $R=0$, mục tiêu hoàn tất ngay. What-if chỉ chạy lại cùng hàm với $M'=M+E$, trong đó $E$ là phần chi được giải phóng, và không sửa kế hoạch gốc.

Với trả nợ, $L$ là dư nợ hiện tại, $i_a$ là lãi suất năm theo phần trăm, $r=i_a/(100\times12)$ là lãi suất tháng và $n$ là số tháng. Khoản trả đều để hoàn tất đúng hạn là:

$$
P=\begin{cases}
L/n, & r=0,\\[2mm]
\dfrac{Lr}{1-(1+r)^{-n}}, & r>0.
\end{cases}
$$

Mô phỏng dùng truy hồi $L_{k+1}=\max(0,L_k(1+r)-P)$ và cộng $L_kr$ vào tổng lãi. Nếu $P\le Lr$ ở tháng đầu, dư nợ không giảm và hệ thống trả cảnh báo `NEGATIVE_AMORTIZATION`. Nếu chưa tất toán trong giới hạn mô phỏng mặc định 600 tháng thì kế hoạch không khả thi trong horizon. Công thức giúp FR-10 tách rõ phép tính khỏi lời diễn giải của LLM.

## 2.4. PHƯƠNG PHÁP ĐÁNH GIÁ

### 2.4.1. Độ chính xác trích xuất và phân loại

Với một trường cần trích xuất, $TP$ là giá trị dự đoán đúng, $FP$ là giá trị dự đoán sai/thừa và $FN$ là giá trị chuẩn bị bỏ sót:

$$
Precision=\frac{TP}{TP+FP},\qquad
Recall=\frac{TP}{TP+FN},\qquad
F1=\frac{2\,Precision\,Recall}{Precision+Recall}.
$$

Exact match chỉ đạt khi toàn bộ trường bắt buộc của một giao dịch cùng đúng; macro-F1 lấy trung bình F1 của từng danh mục để lớp nhiều mẫu không che lớp ít mẫu. Các chỉ số phải tính trên tập đánh giá độc lập với prompt/quy tắc phát triển.

### 2.4.2. Sai số OCR, STT và tác động nghiệp vụ

Gọi $D$ là khoảng cách chỉnh sửa tối thiểu và $N$ là số ký tự/từ trong ground truth:

$$
CER=\frac{S_c+D_c+I_c}{N_c},\qquad
WER=\frac{S_w+D_w+I_w}{N_w}.
$$

Trong đó $S,D,I$ lần lượt là số phép thay thế, xóa và chèn. CER/WER đo raw text; transaction-field accuracy mới cho biết lỗi media có làm sai amount, date, merchant hoặc line item hay không. Vì vậy smoke test provider không được trình bày như accuracy.

### 2.4.3. Tính đúng giải thuật, grounding và hiệu năng

Giải thuật xác định được kiểm tra bằng expected value tính tay, sai số tuyệt đối $AE=|\hat y-y|$ và invariant như tổng tiền chuyển ví không đổi. Với narration, đặt $N_{all}$ là số biểu thức số trong phản hồi và $N_{supported}$ là số ánh xạ được tới facts hoặc phép định dạng tương đương:

$$
Numeric\ Faithfulness=\frac{N_{supported}}{N_{all}},\qquad
Unsupported\ Rate=1-Numeric\ Faithfulness.
$$

Đây là **phương pháp đánh giá đích**; checker bao phủ mọi số chưa được hiện thực đầy đủ. Độ trễ dùng percentile: p50 là trung vị, p95 là giá trị mà 95% mẫu không vượt quá; phải tách text/media, cache hit/miss và ghi rõ provider, phần cứng, số lượt.

## 2.5. VAI TRÒ HỖ TRỢ CÓ KIỂM SOÁT CỦA LLM

### 2.5.1. Function calling thay cho trao quyền nghiệp vụ

Transformer dùng attention để mô hình hóa quan hệ token và là nền tảng của LLM hiện đại [2]. PERFIN tận dụng khả năng hiểu cách diễn đạt đa dạng, nhưng không dùng mô hình để tính sổ cái hay thống kê. Tool được khai báo bằng schema; LLM đề xuất tên tool và đối số, còn ứng dụng validation, tạo preview, chờ xác nhận rồi mới thực thi [4]. Structured output chỉ bảo đảm hình dạng JSON, không bảo đảm danh mục đúng, hai ví khác nhau hoặc ngày thuộc miền hợp lệ.

### 2.5.2. Ranh giới trách nhiệm và grounding

**Bảng 5. Ranh giới trách nhiệm giữa lõi xác định và LLM**

| Nhiệm vụ | Thành phần chịu trách nhiệm | Lý do |
|---|---|---|
| Tổng thu–chi, số dư, hạn mức | SQL và service nghiệp vụ | Cần chính xác và lặp lại được |
| Trend, anomaly, runway, correlation | Hàm giải thuật xác định | Có công thức và test độc lập |
| Ngân sách và mục tiêu | Budget/Goal Planner | Có ràng buộc và mô phỏng |
| Hiểu ngày tương đối, đơn vị tiền, nhiều ý định | LLM hoặc parser cục bộ | Bài toán ngôn ngữ/ngữ cảnh |
| Chọn tool và điền tham số | LLM, sau đó service kiểm tra | Cầu nối từ câu nói sang API |
| Viết lời diễn giải/persona | LLM hoặc template fallback | Không được thay facts |
| Ghi, xóa, chuyển, re-tag | Service sau xác nhận | Có tác động dữ liệu và cần audit |

Insight facts phải gồm giá trị, đơn vị, cửa sổ quan sát, số mẫu, phương pháp và cảnh báo dữ liệu thiếu. Persona có thể thay giọng điệu [12] nhưng không đổi facts. Hiện hệ thống đã tách facts khỏi narrator và có template fallback; numeric checker toàn diện vẫn là thiết kế đích cần đánh giá ở mục 2.4.3. LLM không kết nối trực tiếp PostgreSQL và không tự thực thi tool.

### 2.5.3. Điều kiện để việc dùng LLM có ý nghĩa

LLM chỉ có giá trị nếu cải thiện đo được so với form và parser cục bộ: field F1/exact match cao hơn, ít lượt hỏi lại hoặc thao tác hơn, trong khi độ trễ, chi phí và unsupported-number rate nằm trong ngưỡng chấp nhận. Ablation phải dùng cùng dữ liệu và cùng nhiệm vụ. Nếu không tạo lợi ích đủ bù rủi ro, luồng trực tiếp hoặc parser cục bộ được ưu tiên. Cách tiếp cận này giữ trọng tâm niên luận ở dữ liệu và giải thuật, còn LLM là lớp giao tiếp có kiểm soát.

## 2.6. HẠ TẦNG, CÔNG NGHỆ VÀ LÝ DO LỰA CHỌN

**Bảng 6. Công nghệ, tiêu chí lựa chọn và phương án thay thế**

| Công nghệ | Lý do phù hợp bài toán | Ranh giới/phương án thay thế |
|---|---|---|
| React Native + Expo | Một mã nguồn cho lớp nhập text/ảnh/audio và hiển thị preview trên mobile | Không chứa công thức; native riêng chỉ cần khi có yêu cầu thiết bị đặc thù |
| Node.js + Express | API hướng I/O; dùng chung JavaScript với hàm thuần và `node:test`; phù hợp modular monolith quy mô niên luận | Không cần chi phí vận hành microservice |
| PostgreSQL | Khóa ngoại, `DECIMAL`, transaction và truy vấn tổng hợp phù hợp sổ cái [7] | File/NoSQL khó bảo đảm cùng mức ràng buộc và rollback |
| Redis | TTL, cache-aside, pending state và queue [8] | Không làm nguồn sự thật; memory fallback chỉ dùng phát triển |
| BullMQ | Lập lịch, retry và job ID phục vụ tác vụ chủ động idempotent [9] | Cron đơn giản không cung cấp cùng cơ chế queue/retry |
| Gemini hoặc parser cục bộ | LLM mở rộng độ bao phủ ngôn ngữ; parser bảo đảm fallback kiểm thử được | Provider được đặt sau adapter, không khóa logic nghiệp vụ |
| PaddleOCR/PhoWhisper hoặc cloud | Cho phép so sánh local/cloud theo accuracy, latency, chi phí và riêng tư | Raw output luôn qua cùng validation/preview |

Redis/BullMQ phục vụ recurring reminder, runway scan, subscription scan, báo cáo cuối tháng và dọn export. Job phải nhỏ và idempotent; unique event key ở thông điệp nội bộ ngăn hiệu ứng lặp khi retry, phù hợp khuyến nghị của BullMQ [9]. Auto-backup theo lịch chưa có worker tương ứng và không được xem là đã hoạt động.

## 2.7. NGHIÊN CỨU VÀ ỨNG DỤNG LIÊN QUAN

Nghiên cứu về hiểu biết tài chính chỉ ra vai trò của năng lực lập kế hoạch và ra quyết định dài hạn [1]. Hồi quy tuyến tính, z-score, IQR và tương quan là các kỹ thuật giải thích được, phù hợp mục tiêu niên luận vì đầu ra có thể kiểm tra độc lập; IQR đặc biệt hữu ích trong thăm dò dữ liệu có ngoại lệ [10]. OCR [5], STT [6] và LLM đa phương thức [3] mở rộng kênh nhập liệu nhưng không tự bảo đảm tính đúng của bản ghi tài chính.

Các hệ thống quản lý tài chính hiện có thường rơi vào ba nhóm. Nhóm thứ nhất là ứng dụng sổ chi tiêu dạng form/dashboard: Money Lover [17] và MISA MoneyKeeper [18] phổ biến tại Việt Nam, Mint và YNAB phổ biến ở thị trường quốc tế; các ứng dụng này có dữ liệu cấu trúc và báo cáo trực quan nhưng nhập liệu vẫn nhiều bước và phần lớn chưa hỗ trợ tốt cách diễn đạt tiếng Việt đời thường. Nhóm thứ hai là chatbot/trợ lý ngôn ngữ tự nhiên: cho phép nhập nhanh bằng câu tự do nhưng số liệu trả về thường khó truy vết về nguồn và dễ sai lệch (hallucination) khi mô hình tự tính toán. Nhóm thứ ba là mô hình phân tích chuyên sâu: mạnh về thống kê nhưng thiếu vòng xác nhận và lời giải thích cho người dùng phổ thông. PERFIN không cạnh tranh về độ đầy đủ thương mại với các sản phẩm trên. Khoảng trống được chọn là kết hợp sổ cái quan hệ, giải thuật xác định giải thích được, con người trong vòng lặp (human-in-the-loop) và lớp ngôn ngữ có ranh giới: LLM chỉ trích xuất và diễn giải, còn mọi số liệu đều bắt nguồn từ SQL và giải thuật kiểm chứng được.

**Bảng 7. Khoảng trống và hướng giải quyết của PERFIN**

| Khoảng trống | Rủi ro | Hướng giải quyết |
|---|---|---|
| Nhập tự nhiên nhưng dễ ghi sai | Dữ liệu bẩn lan sang mọi báo cáo | Typed draft + validation + preview + confirm |
| Media có raw text nhưng chưa chắc đúng trường | Sai amount/ngày/danh mục | Đo CER/WER và field accuracy; xác nhận trước ghi |
| Chatbot trả số không rõ nguồn | Hallucination và khó kiểm toán | Tool truy vấn + facts JSON + grounding checker đích |
| Dashboard có số nhưng thiếu diễn giải | Người dùng khó nhận ra pattern | Giải thuật xác định + narrator chỉ đọc facts |
| Phân loại không thích nghi | Lặp lại cùng lỗi | Correction retrieval + fuzzy threshold/margin |
| Retry tạo thông báo trùng | Trải nghiệm và dữ liệu sai | Job ID + unique event key + handler idempotent |

---

# CHƯƠNG 3: KẾT QUẢ ỨNG DỤNG

## 3.1. ĐẶC TẢ YÊU CẦU PHẦN MỀM

### 3.1.1. Mô tả tổng quan

PERFIN là nguyên mẫu ứng dụng di động phục vụ nhập, chuẩn hóa, quản lý và phân tích dữ liệu tài chính cá nhân. Trọng tâm của nguyên mẫu là bảo vệ chất lượng dữ liệu và kiểm chứng các giải thuật; giao diện chat chỉ là một cổng nhập bổ sung cho các màn hình trực tiếp. Mọi phép tính tài chính, kiểm tra ràng buộc và thay đổi dữ liệu đều do backend thực hiện. LLM, OCR và STT không truy cập trực tiếp PostgreSQL và không được xem là nguồn số liệu chuẩn.

Phiên bản hiện tại vận hành với một hồ sơ `default_user`. Các khóa ngoại theo người dùng tạo đường nâng cấp về sau nhưng chưa chứng minh hệ thống có xác thực, phân quyền hoặc cô lập nhiều người dùng ở mức production. PostgreSQL là nguồn dữ liệu nghiệp vụ bền vững; Redis lưu trạng thái có TTL, cache và dữ liệu queue, với bộ nhớ tiến trình làm fallback trong môi trường phát triển. Phần đặc tả dùng mã FR/NFR, điều kiện chấp nhận và mã ca kiểm thử để tạo khả năng truy vết theo tinh thần IEEE 830 [11].

**Bảng 8. Tác nhân của hệ thống**

| Tác nhân | Vai trò | Giới hạn |
|---|---|---|
| Người dùng | Nhập dữ liệu, sửa/xác nhận/hủy bản xem trước, quản lý ngân sách/mục tiêu và xem báo cáo | Chịu trách nhiệm kiểm tra dữ liệu suy ra từ ngôn ngữ hoặc media trước khi lưu |
| Ứng dụng di động | Thu nhận văn bản, ảnh, âm thanh; gọi REST API; hiển thị bản xem trước, dữ kiện và kết quả | Không trực tiếp truy cập cơ sở dữ liệu hoặc giữ khóa bí mật của nhà cung cấp AI |
| API và dịch vụ nghiệp vụ | Validation, transaction cơ sở dữ liệu, tính toán và trả kết quả có cấu trúc | Không giao phép tính hoặc quyền ghi dữ liệu cho LLM |
| Dịch vụ AI ngoài | Trả lời gọi công cụ, văn bản OCR hoặc transcript STT | Kết quả là đầu vào chưa tin cậy; không tự thực thi nghiệp vụ |
| Worker nền | Chạy nhắc định kỳ, quét runway/subscription, insight cuối tháng và dọn export | Phải giới hạn theo hồ sơ và chống hiệu ứng lặp khi retry |
| Quản trị viên phát triển | Cấu hình provider, migration và dữ liệu demo | Không phải tác nhân người dùng của sản phẩm |

Các mã `TC-FRxx-yy` dưới đây là định danh ca kiểm thử ở mức đặc tả. Một ca chỉ được xem là “đã đo” khi có dữ liệu đầu vào, kết quả mong đợi, môi trường và log tương ứng tại mục 3.3.

### 3.1.2. Yêu cầu cụ thể

#### 3.1.2.1. Giao diện và phụ thuộc bên ngoài

- Ứng dụng di động giao tiếp với backend Express qua REST/JSON; ứng dụng không kết nối trực tiếp PostgreSQL, Redis hoặc API của nhà cung cấp AI.
- Đầu vào media chấp nhận các định dạng ảnh/audio được backend cho phép, với kích thước tối đa 10 MB mỗi tệp. Transcript hoặc raw text phải được trả về để người dùng có thể kiểm tra.
- Gemini hoặc parser cục bộ đảm nhiệm hiểu ý định và trích xuất trường; PaddleOCR/Google Vision và PhoWhisper/Google Speech là các adapter có thể thay thế. Khi provider không khả dụng, API phải trả lỗi hoặc fallback thật, không dựng kết quả mẫu.
- PostgreSQL giữ giao dịch, ví, danh mục, ngân sách, mục tiêu và lịch sử cần kiểm toán. Redis giữ pending/clarification, cache và queue; mất Redis không được làm phát sinh dữ liệu tài chính giả.

#### 3.1.2.2. Quy tắc dữ liệu và nghiệp vụ dùng chung

1. Số tiền của giao dịch thu–chi, chuyển ví, ngân sách và khoản định kỳ phải là số hữu hạn dương. Giá trị lãi/lỗ đầu tư là số hữu hạn khác 0 và có thể mang dấu.
2. Ngày giao dịch, chuyển ví và thanh toán không được nằm trong tương lai; ngày mục tiêu không được nằm trong quá khứ tại thời điểm tạo kế hoạch.
3. Danh mục và ví được tham chiếu phải tồn tại và thuộc phạm vi hồ sơ hiện tại. Phiên bản demo chưa có authorization nhiều người dùng.
4. Số dư ví **được phép âm**. PERFIN ghi sổ và cảnh báo dòng tiền, không thực hiện kiểm soát tín dụng và không từ chối chi/chuyển chỉ vì số dư nguồn không đủ.
5. Thay đổi do chat hoặc media khởi tạo phải qua bản xem trước và xác nhận. Thao tác trực tiếp từ form có thể ghi sau khi backend validation thành công.
6. Một thao tác ảnh hưởng nhiều bản ghi hoặc nhiều số dư phải được bọc trong một transaction cơ sở dữ liệu. Lỗi cache/hydration sau `COMMIT` không được báo thành lỗi ghi để tránh người dùng lặp thao tác.
7. Giao dịch bị xóa theo cơ chế soft delete và có thể khôi phục; báo cáo mặc định không tính bản ghi đã xóa.
8. Kết quả phân tích phải mang kỳ dữ liệu, dữ kiện định lượng và phương pháp. Thiếu dữ liệu phải trả `null`/cảnh báo phù hợp, không suy diễn một kết luận mạnh.

#### 3.1.2.3. Phạm vi và mức ưu tiên

**Bảng 9. Phân nhóm chức năng theo mức ưu tiên học thuật**

| Nhóm | Chức năng | Vai trò trong niên luận |
|---|---|---|
| **Lõi dữ liệu** | Giao dịch, ví, danh mục, ngân sách, recurring, mục tiêu | Đối tượng nghiên cứu chính |
| **Lõi giải thuật** | Parsing, matching, feedback, analytics, budget/goal planner | Đóng góp chính cần mô tả và kiểm thử |
| **Lớp LLM** | Tool routing, extraction, clarification, narration, persona | Thành phần hỗ trợ có ranh giới |
| **Hỗ trợ demo** | Dashboard, màn hình quản lý, export | Chứng minh khả năng sử dụng, không phải trọng tâm |
| **Ngoài phạm vi** | Auth production, bank sync, shared wallet, high availability | Hướng phát triển |

### 3.1.3. Yêu cầu chức năng

**Bảng 10. Yêu cầu chức năng**

| Mã | Yêu cầu | Điều kiện chấp nhận cấp cao |
|---|---|---|
| FR-01 | Nhập giao dịch bằng văn bản tự nhiên | Chuẩn hóa một hoặc nhiều giao dịch, tạo bản xem trước và không ghi khi thiếu trường bắt buộc |
| FR-02 | Nhập bằng ảnh và giọng nói | Trả raw OCR/transcript thật; xác nhận trước pipeline giao dịch; chưa tuyên bố đối soát tổng hóa đơn |
| FR-03 | Clarification và giao dịch chờ | Lưu state 5 phút; cho phép bổ sung/sửa/xác nhận/hủy; một preview chỉ được claim một lần |
| FR-04 | Phân loại và học từ phản hồi | Ưu tiên exact/alias/fuzzy an toàn; ghi correction sau commit; không học khi kết quả mơ hồ/xung đột |
| FR-05 | Quản lý dữ liệu tài chính | CRUD có validation và soft delete; cập nhật số dư nguyên tử; cho phép số dư ví âm |
| FR-06 | Chuyển ví nguyên tử | Debit, credit và lịch sử cùng transaction; ví nguồn/đích khác nhau; không kiểm tra đủ số dư |
| FR-07 | Phân tích dữ liệu | Tính trend, anomaly, runway, recurring và tương quan dương bằng giải thuật xác định |
| FR-08 | Insight có căn cứ và persona | Trả cả facts và lời diễn giải; numeric grounding checker là thiết kế đích, chưa phải kết quả đã đo |
| FR-09 | Ngân sách và dự báo | Tính tiến độ/dự báo; đề xuất theo lịch sử hoặc khung tỷ lệ; chỉ áp dụng đề xuất khi xác nhận |
| FR-10 | Mục tiêu tài chính | Preview kế hoạch tiết kiệm/mua sắm/trả nợ và what-if; chỉ lưu đúng payload đã xem trước |
| FR-11 | Khoản định kỳ và tác vụ chủ động | Quản lý lịch, thanh toán nguyên tử; worker retry có dedup và user scope |
| FR-12 | Xuất dữ liệu | CSV hoạt động; luồng mang nhãn PDF hiện tạo HTML; lưu lịch sử và dọn file hết TTL |

#### 3.1.3.1. FR-01 — Nhập giao dịch bằng văn bản tự nhiên

**Mục đích.** Giảm số trường người dùng phải nhập thủ công nhưng vẫn tạo dữ liệu đúng schema và có thể kiểm tra trước khi ghi.

**Tác nhân và kích hoạt.** Người dùng gửi một câu qua chat hoặc endpoint phân tích giao dịch, ví dụ “ăn phở sáng nay 45k bằng Momo”; câu có thể chứa một hoặc nhiều giao dịch.

**Tiền điều kiện và đầu vào.** Văn bản không rỗng; hồ sơ có ít nhất một ví và các danh mục khả dụng. Các trường đích gồm mô tả, số tiền, loại `income/expense`, ngày, danh mục và ví; số tiền phải dương và ngày không được ở tương lai.

**Xử lý chính.** AI Orchestrator chọn LLM có structured output hoặc parser cục bộ, chuẩn hóa đơn vị tiền và ngày tương đối theo mục 2.2.1, sau đó ánh xạ danh mục/ví. Backend kiểm tra schema và quy tắc giao dịch ở mục 2.1; LLM chỉ đề xuất đối số theo ranh giới mục 2.5.1–2.5.2. Một câu chứa nhiều giao dịch được chuyển thành một danh sách và tạo bản xem trước theo FR-03. Khi xác nhận, batch giao dịch và các thay đổi số dư liên quan được ghi nguyên tử.

**Luồng thay thế và lỗi.** Nếu thiếu số tiền hoặc còn lựa chọn mơ hồ, hệ thống chuyển sang clarification thay vì ghi dữ liệu. Nếu provider lỗi, hệ thống dùng parser cục bộ cho trường hợp được hỗ trợ hoặc trả lỗi thật. Ngày tương lai, số tiền không hợp lệ, danh mục/ví ngoài phạm vi hoặc một phần tử sai trong batch làm toàn bộ thao tác bị từ chối.

**Đầu ra và hậu điều kiện.** Trước xác nhận, đầu ra là dữ liệu đã chuẩn hóa, cảnh báo và `pending_id`; PostgreSQL chưa đổi. Sau xác nhận thành công, giao dịch và số dư mới được trả về, pending được tiêu thụ và cache tài chính được vô hiệu hóa best-effort.

**Tiêu chí chấp nhận.**

- `TC-FR01-01`: câu đủ trường tạo đúng một preview, chưa tăng số giao dịch trong DB.
- `TC-FR01-02`: câu nhiều giao dịch được trích xuất đủ phần tử và commit theo nguyên tắc tất cả-hoặc-không.
- `TC-FR01-03`: câu thiếu amount tạo clarification, không tạo pending có thể ghi sai.
- `TC-FR01-04`: ngày tương lai hoặc tham chiếu ngoài phạm vi bị từ chối và không đổi số dư.

#### 3.1.3.2. FR-02 — Nhập giao dịch bằng ảnh và giọng nói

**Mục đích.** Chuyển ảnh hóa đơn hoặc âm thanh tiếng Việt thành văn bản có thể kiểm tra rồi tái sử dụng pipeline FR-01.

**Tác nhân và kích hoạt.** Người dùng tải ảnh lên OCR hoặc tệp âm thanh lên STT. Tệp phải thuộc loại backend hỗ trợ và không quá 10 MB.

**Tiền điều kiện và đầu vào.** Ảnh/audio đọc được; adapter media được cấu hình hoặc provider cục bộ khả dụng. Người dùng có thể kèm ngữ cảnh ngắn cho ảnh. Transcript STT phải được người dùng xác nhận trước khi phân tích, trừ khi lời gọi API chủ động yêu cầu tự động phân tích.

**Xử lý chính.** Provider trả raw OCR hoặc transcript cùng tên provider; hệ thống hiển thị dữ liệu này, sau đó trích xuất trường giao dịch và tạo lựa chọn/bản xem trước. Nền tảng OCR/STT và adapter được mô tả tại mục 2.2.4; CER/WER cùng transaction-field accuracy được định nghĩa tại mục 2.4.2. Phiên bản hiện tại có thể trả lựa chọn lưu tổng hóa đơn hoặc từng dòng được trích xuất, nhưng **chưa hiện thực phép đối soát tổng các mặt hàng với tổng hóa đơn**; vì vậy không được dùng quan hệ tổng này làm điều kiện xác nhận chất lượng.

**Luồng thay thế và lỗi.** File sai loại, quá kích thước hoặc upload bị ngắt bị từ chối. Provider không trả văn bản phải sinh lỗi `OCR_UNAVAILABLE`/lỗi STT tương ứng, không tạo raw text hay giao dịch mẫu. Kết quả media thiếu trường bắt buộc trả clarification có thể thử lại và không tạo pending không đầy đủ.

**Đầu ra và hậu điều kiện.** API trả raw text/transcript, provider, ngữ cảnh và dữ liệu trích xuất hoặc lựa chọn cần xác nhận. Chỉ sau bước xác nhận media và FR-03 mới được ghi giao dịch.

**Tiêu chí chấp nhận.**

- `TC-FR02-01`: ảnh hợp lệ trả raw OCR thật và provider, không tuyên bố tổng dòng hàng đã khớp tổng hóa đơn.
- `TC-FR02-02`: transcript được hiển thị, sửa/xác nhận được rồi mới đi vào parser.
- `TC-FR02-03`: provider lỗi trả trạng thái không khả dụng và không tạo mock/pending.
- `TC-FR02-04`: file sai loại hoặc lớn hơn 10 MB bị từ chối trước xử lý nghiệp vụ.

#### 3.1.3.3. FR-03 — Clarification và giao dịch chờ xác nhận

**Mục đích.** Thu thập trường còn thiếu qua nhiều lượt và tạo hàng rào chống ghi nhầm dữ liệu suy đoán.

**Tác nhân và kích hoạt.** FR-01/FR-02 phát hiện thiếu trường, nhiều lựa chọn hoặc đã có dữ liệu đủ để xem trước; người dùng trả lời câu hỏi, sửa, xác nhận hoặc hủy.

**Tiền điều kiện và đầu vào.** State gắn với hồ sơ hiện tại, gồm intent, trường đang chờ, dữ liệu đã thu, candidates và thời điểm tạo. Pending chứa một giao dịch hoặc một batch, metadata sửa sai và mã định danh.

**Xử lý chính.** Conversation state và pending được lưu trong KV store với TTL 5 phút. Câu trả lời mới được merge vào `collected` rồi validation lại. Sửa preview sử dụng thao tác lấy–cập nhật–đặt lại có kiểm soát; xác nhận sử dụng `claim` nguyên tử để một `pending_id` chỉ được tiêu thụ một lần. Luồng trạng thái tương ứng Hình 7, mục 3.2.3.2.

**Luồng thay thế và lỗi.** Pending hết hạn, sai ID hoặc đã được claim trả trạng thái không còn hiệu lực và không ghi DB. Sửa dữ liệu không hợp lệ phải giữ lại preview cũ khi có thể. Hủy xóa state. Một request cũ không được ghi đè preview mới.

**Đầu ra và hậu điều kiện.** Clarification trả câu hỏi và state tiếp tục; sửa trả preview mới; hủy/hết hạn đưa hệ thống về idle; xác nhận thành công xóa pending và chuyển dữ liệu hợp lệ cho transaction service.

**Tiêu chí chấp nhận.**

- `TC-FR03-01`: câu trả lời bổ sung đúng trường thiếu và làm mới TTL.
- `TC-FR03-02`: hai xác nhận đồng thời cùng ID chỉ có một request claim và ghi dữ liệu.
- `TC-FR03-03`: ID cũ không tiêu thụ preview mới.
- `TC-FR03-04`: sửa sai validation hoặc hết TTL không làm thay đổi PostgreSQL.

#### 3.1.3.4. FR-04 — Phân loại danh mục và học từ phản hồi

**Mục đích.** Chọn danh mục có thể giải thích, thích nghi với sửa sai cá nhân nhưng tránh tự học từ tín hiệu không chắc chắn.

**Tác nhân và kích hoạt.** Parser cần ánh xạ mô tả vào danh mục; hoặc người dùng sửa category của giao dịch do AI tạo.

**Tiền điều kiện và đầu vào.** Chuỗi mô tả, loại thu/chi, danh mục mặc định/danh mục người dùng, alias và các correction trước đây thuộc cùng hồ sơ.

**Xử lý chính.** Chuỗi được bỏ dấu, hạ chữ thường và chuẩn hóa khoảng trắng. Matcher ưu tiên tên chính xác, alias chính xác rồi điểm fuzzy theo công thức mục 2.2.2. Ngưỡng mặc định là 0,90 cho input rất ngắn, 0,82 cho input còn lại và khoảng cách tối thiểu 0,08 so với ứng viên thứ hai. Correction gần input có thể làm ngữ cảnh few-shot theo mục 2.2.3, nhưng kết quả cuối vẫn qua validation và xác nhận. Khi người dùng sửa một giao dịch không phải nguồn manual, hệ thống ghi cặp kết quả cũ–đúng theo cơ chế best-effort sau commit.

**Luồng thay thế và lỗi.** Không đạt ngưỡng, hai ứng viên quá gần, alias xung đột hoặc lịch sử correction không đồng thuận phải rơi về “Khác”/yêu cầu chọn; không tự chọn một danh mục. Lỗi ghi feedback sau commit không được biến giao dịch đã lưu thành thất bại giả.

**Đầu ra và hậu điều kiện.** Kết quả gồm danh mục, confidence, kiểu match và lý do fallback nếu có. Correction hợp lệ được dùng cho lần sau nhưng không sửa ngược dữ liệu cũ nếu người dùng chưa xác nhận re-tag.

**Tiêu chí chấp nhận.**

- `TC-FR04-01`: exact và alias exact được ưu tiên trước fuzzy.
- `TC-FR04-02`: hai ứng viên có chênh lệch dưới 0,08 trả ambiguous/fallback.
- `TC-FR04-03`: input ngắn không đạt 0,90 không được tự gán.
- `TC-FR04-04`: correction sau commit được truy xuất làm ví dụ, còn correction xung đột không ép phân loại.

#### 3.1.3.5. FR-05 — Quản lý giao dịch, ví và danh mục

**Mục đích.** Duy trì sổ cái cá nhân có thể sửa, xóa mềm, khôi phục và truy vấn mà không làm sai số dư.

**Tác nhân và kích hoạt.** Người dùng tạo trực tiếp, xem, lọc, sửa, đổi danh mục, xóa hoặc khôi phục giao dịch; đồng thời quản lý ví và danh mục thuộc phạm vi demo.

**Tiền điều kiện và đầu vào.** Giao dịch thu–chi có amount dương, ngày không ở tương lai, category và wallet hợp lệ. Bộ lọc hỗ trợ kỳ ngày, loại, danh mục, ví và phân trang theo contract API.

**Xử lý chính.** Quy tắc dòng tiền tại mục 2.1.1 được áp dụng xác định: `income` cộng số dư, `expense` trừ số dư. Tạo, sửa amount/type/wallet, soft delete và restore đều tính phần chênh lệch số dư trong cùng transaction cơ sở dữ liệu. Đổi danh mục không làm đổi số dư. Các truy vấn báo cáo loại bản ghi có `deleted_at`.

**Luồng thay thế và lỗi.** Dữ liệu sai miền, ngày tương lai hoặc category/wallet ngoài hồ sơ bị từ chối. **Số dư sau chi được phép âm** và không phải lỗi validation. Lỗi cache sau commit chỉ được ghi log; API vẫn trả dữ liệu đã ghi bền vững để tránh retry trùng.

**Đầu ra và hậu điều kiện.** API trả giao dịch đã hydrate, số dư ví mới hoặc kết quả phân trang. Soft delete giữ bản ghi để restore; restore áp lại tác động số dư đúng một lần.

**Tiêu chí chấp nhận.**

- `TC-FR05-01`: tạo income/expense làm số dư thay đổi lần lượt `+A`/`-A`.
- `TC-FR05-02`: sửa amount/type/wallet áp dụng đúng chênh lệch và rollback toàn bộ khi một bước lỗi.
- `TC-FR05-03`: expense lớn hơn số dư vẫn được ghi hợp lệ và ví có thể âm.
- `TC-FR05-04`: soft delete và restore đảo/áp lại số dư đúng một lần, báo cáo không tính bản ghi đã xóa.

#### 3.1.3.6. FR-06 — Chuyển ví và dòng tiền đặc biệt

**Mục đích.** Ghi chuyển tiền giữa ví và dòng tiền đầu tư mà không tạo trạng thái debit/credit dở dang.

**Tác nhân và kích hoạt.** Người dùng hoặc chat đã xác nhận yêu cầu `transfer`, `investment_inflow` hoặc `investment_outflow`.

**Tiền điều kiện và đầu vào.** Amount hữu hạn dương, ngày không ở tương lai và các ví tham chiếu thuộc hồ sơ. Chuyển giữa hai ví yêu cầu đủ cả ví nguồn/ví đích và hai ID khác nhau; dòng tiền đầu tư yêu cầu ít nhất một đầu ví phù hợp.

**Xử lý chính.** Service khóa các ví theo thứ tự, trừ `A` ở nguồn, cộng `A` ở đích và ghi `wallet_transfers` trong cùng `BEGIN/COMMIT`. Với chuyển nội bộ, bất biến là tổng thay đổi số dư bằng 0, như cơ sở dòng tiền ở mục 2.1.1. Ghi nhận lãi/lỗ đầu tư dùng giá trị khác 0 và chỉ áp dụng cho ví investment/savings.

**Luồng thay thế và lỗi.** Ví trùng, thiếu ví bắt buộc, amount/date sai hoặc ví không thuộc hồ sơ làm rollback. **Không có kiểm tra “đủ số dư”; ví nguồn được phép âm sau chuyển.** Lỗi vô hiệu cache/hydrate sau commit không được khuyến khích người dùng gửi lại giao dịch.

**Đầu ra và hậu điều kiện.** Trả lịch sử chuyển và tên ví liên quan; cả hai số dư cùng phản ánh một lần chuyển hoặc đều giữ nguyên khi transaction thất bại.

**Tiêu chí chấp nhận.**

- `TC-FR06-01`: chuyển nội bộ làm `B_s'=B_s-A`, `B_d'=B_d+A` và không đổi tổng số dư.
- `TC-FR06-02`: ví nguồn không đủ vẫn được phép âm, giao dịch không bị từ chối vì lý do này.
- `TC-FR06-03`: hai ví trùng hoặc không thuộc hồ sơ bị từ chối trước commit.
- `TC-FR06-04`: fault injection giữa debit, credit và insert làm rollback cả ba hiệu ứng.

#### 3.1.3.7. FR-07 — Phân tích dữ liệu tài chính

**Mục đích.** Biến lịch sử giao dịch thành các dữ kiện định lượng có thể kiểm thử, giúp người dùng nhận ra xu hướng, bất thường, nguy cơ cạn tiền, khoản chi lặp và mối liên hệ giữa danh mục.

**Tác nhân và kích hoạt.** Người dùng mở báo cáo/insight hoặc worker thực hiện quét định kỳ.

**Tiền điều kiện và đầu vào.** Giao dịch chưa xóa thuộc hồ sơ, được tổng hợp theo trục thời gian đầy đủ; tháng/tuần/ngày không phát sinh phải được chèn giá trị 0 khi giải thuật yêu cầu.

**Xử lý chính.** Analytics Engine áp dụng các công thức mục 2.3.1–2.3.5:

- **Trend:** hồi quy trên chuỗi tháng; chỉ công bố xu hướng tăng khi có ít nhất 3 tháng, slope dương, tăng trung bình ít nhất 10% và `R² >= 0,5`.
- **Anomaly:** dùng tối thiểu 4 điểm chi theo ngày; đánh dấu phía chi lớn khi `z >= 2,5` hoặc vượt hàng rào trên `Q3 + 1,5IQR`.
- **Runway:** lấy tổng số dư ví và đúng 14 ngày lịch gần nhất, kể cả ngày chi 0; số dư không dương cho 0 ngày còn lại, burn rate bằng 0 thì không dự báo ngày cạn.
- **Recurring/subscription:** xét giao dịch chi trong 90 ngày, chuẩn hóa mô tả, ngưỡng amount tối đa 500.000 VND, sai số tiền 15% và cadence 20–40 ngày; nhóm có ít nhất 3 lần có thể được giữ dù cadence chưa ổn định.
- **Correlation:** zero-fill chuỗi 12 tuần, chỉ xét danh mục có dữ liệu ở ít nhất 4 tuần và chỉ công bố cặp có tương quan **dương** `r >= 0,6`. Phiên bản hiện tại không công bố tương quan âm và không dùng `|r|`.

**Luồng thay thế và lỗi.** Thiếu dữ liệu trả `null` thay vì kết luận; mẫu số 0 hoặc burn rate 0 được xử lý bằng nhánh biên. Một thành phần phân tích lỗi không làm giả kết quả của thành phần khác; tên thành phần suy giảm được đưa vào `degraded_components`. Correlation không được diễn giải thành quan hệ nhân quả.

**Đầu ra và hậu điều kiện.** Kết quả là facts JSON có thời điểm sinh, giá trị, kỳ dữ liệu, phương pháp và cảnh báo. Cache insight hiện có TTL 10 phút và bị vô hiệu best-effort sau thay đổi tài chính.

**Tiêu chí chấp nhận.**

- `TC-FR07-01`: chuỗi biết trước trả slope, forecast và `R²` khớp kết quả tính tay.
- `TC-FR07-02`: z-score/IQR chỉ đánh dấu điểm phía trên và xử lý phương sai/IQR bằng 0.
- `TC-FR07-03`: runway dùng đủ 14 vị trí ngày, gồm ngày chi 0; số dư âm trả 0 ngày.
- `TC-FR07-04`: nhóm recurring tuân đúng điều kiện số lần, amount và cadence.
- `TC-FR07-05`: chỉ cặp có `r >= 0,6` được trả; cặp `r <= -0,6` không được công bố ở phiên bản hiện tại.

#### 3.1.3.8. FR-08 — Insight có căn cứ và persona

**Mục đích.** Diễn giải kết quả FR-07 bằng ngôn ngữ dễ hiểu mà không giao quyền tính số liệu cho LLM.

**Tác nhân và kích hoạt.** Người dùng yêu cầu insight hoặc mở báo cáo cá nhân hóa; hệ thống lấy persona đang hoạt động.

**Tiền điều kiện và đầu vào.** Facts đã được Analytics Engine tính, gồm kỳ dữ liệu và `degraded_components`; persona chỉ cung cấp style prompt. Endpoint facts thô phải sử dụng được độc lập với narrator.

**Xử lý chính.** Backend gửi facts có cấu trúc cho narrator, nhận lời diễn giải, đồng thời tạo lời khuyên tổng quan bằng quy tắc xác định. Persona chỉ trang trí cách diễn đạt; response luôn trả lại facts và metadata để đối chiếu. Cơ sở ranh giới được trình bày tại mục 2.5.2; phương pháp đo grounding được định nghĩa tại mục 2.4.3.

**Luồng thay thế và lỗi.** Khi LLM không khả dụng, narrator template được dùng hoặc API trả lỗi rõ ràng; không sinh số mock. **Bộ kiểm tra tự động mọi con số trong lời kể đều thuộc facts hiện mới là thiết kế đích**; báo cáo không được tuyên bố numeric faithfulness đã được bảo đảm hay đã đo chỉ từ prompt và schema.

**Đầu ra và hậu điều kiện.** Trả persona, `ai_comment`, lời khuyên, cơ sở lời khuyên, provider và facts gốc. Không có thao tác ghi giao dịch/ngân sách/mục tiêu trong luồng đọc này.

**Tiêu chí chấp nhận.**

- `TC-FR08-01`: thay persona không làm thay đổi facts cùng một lần phân tích.
- `TC-FR08-02`: provider lỗi dùng fallback thật và vẫn giữ facts, không chèn dữ liệu mẫu.
- `TC-FR08-03 (thiết kế đích)`: checker phát hiện số/đơn vị không được hỗ trợ trong narration; chỉ sau khi ca này có log mới công bố numeric faithfulness.

#### 3.1.3.9. FR-09 — Ngân sách, đề xuất và dự báo

**Mục đích.** Theo dõi hạn mức theo danh mục, dự báo nguy cơ vượt và đề xuất ngân sách dựa trên lịch sử thay vì để LLM tự chọn số tiền.

**Tác nhân và kích hoạt.** Người dùng tạo/sửa/xóa ngân sách, xem tiến độ/dự báo hoặc yêu cầu đề xuất theo `category_average`, `50-30-20` hay `hybrid`.

**Tiền điều kiện và đầu vào.** Category phải là danh mục chi, amount limit dương, tháng 1–12 và năm hợp lệ. Đề xuất nhận lịch sử mặc định 6 tháng, thu nhập tháng tùy chọn và các tỷ lệ cấu hình.

**Xử lý chính.** Progress tính `spent`, `remaining` và tỷ lệ trên hạn mức. Forecast lấy tốc độ chi trung bình theo số ngày đã qua và ngoại suy đến cuối tháng. Recommender thực hiện công thức mục 2.3.6: trung bình danh mục trên toàn bộ tháng trong cửa sổ kể cả tháng 0; buffer mặc định 5%; nhóm needs/wants có trần mặc định 50%/30% thu nhập và mục tiêu tiết kiệm 20%. Hybrid chỉ co tỷ trọng khi tổng nhóm vượt trần. Dữ liệu dưới 3 tháng tạo cảnh báo; confidence thấp/trung bình/cao theo số tháng hoạt động. Áp dụng danh sách đề xuất yêu cầu `confirmed=true` và upsert nguyên tử.

**Luồng thay thế và lỗi.** Thiếu dữ liệu thu nhập làm chiến lược tỷ lệ fallback về trung bình danh mục. Danh mục sai loại, kỳ sai, hạn mức không dương, danh sách rỗng/quá 50 phần tử hoặc thiếu xác nhận bị từ chối. Một item sai làm rollback toàn bộ batch áp dụng.

**Đầu ra và hậu điều kiện.** Trả tiến độ, trạng thái safe/warning/danger/exceeded, dự báo cuối tháng, ngày dự kiến vượt, danh sách đề xuất, rationale, confidence và warnings. Chỉ endpoint apply đã xác nhận mới thay đổi bảng `budgets`/`budget_history`.

**Tiêu chí chấp nhận.**

- `TC-FR09-01`: tháng không phát sinh vẫn nằm trong mẫu số trung bình lịch sử.
- `TC-FR09-02`: forecast khớp `spent / elapsed_days * days_in_month` và không chia 0.
- `TC-FR09-03`: dưới 3 tháng dữ liệu có cảnh báo; thiếu income fallback đúng chiến lược.
- `TC-FR09-04`: apply thiếu `confirmed=true` bị từ chối; batch có item sai rollback toàn bộ.

#### 3.1.3.10. FR-10 — Mục tiêu tài chính và mô phỏng what-if

**Mục đích.** Tính mức góp, thời gian hoàn thành và kịch bản thay đổi cho mục tiêu tiết kiệm, mua sắm hoặc trả nợ bằng hàm xác định.

**Tác nhân và kích hoạt.** Người dùng nhập mục tiêu mới, xem kế hoạch, cập nhật trường tài chính hoặc thử kịch bản giải phóng thêm tiền hàng tháng.

**Tiền điều kiện và đầu vào.** Goal type thuộc `saving/purchase/debt_payoff`; target amount dương; current amount/monthly contribution không âm; target date không ở quá khứ. Lãi suất năm chỉ áp dụng cho trả nợ. Surplus được tính từ trung bình thu trừ chi của tối đa 6 tháng gần đây.

**Xử lý chính.** Goal Planner dùng công thức mục 2.3.7 để tính phần còn thiếu, số tháng, mức góp bắt buộc đến hạn, tiến độ và cảnh báo lệch kế hoạch. Với nợ, lãi suất tháng bằng lãi suất năm chia 12, công thức niên kim có nhánh lãi suất 0 và mô phỏng từng tháng để tính tổng lãi/remaining balance; khoản trả không vượt lãi tháng đầu bị đánh dấu negative amortization. What-if cho tiết kiệm/mua sắm chạy lại cùng hàm với phần góp tăng thêm; kịch bản mặc định có thể dùng 20% chi trung bình.

Endpoint plan không ghi DB và cấp preview token ký theo đúng payload, có hiệu lực 15 phút. Tạo mới hoặc cập nhật trường kế hoạch chỉ thành công khi token còn hạn và fingerprint khớp; cập nhật chỉ trạng thái không cần token kế hoạch.

**Luồng thay thế và lỗi.** Ngày/lãi suất/số tiền sai miền, token hết hạn hoặc payload thay đổi sau preview bị từ chối. Mức góp 0 cho kết quả không có thời hạn; nợ không giảm hoặc vượt giới hạn mô phỏng trả cảnh báo, không dựng ngày hoàn thành.

**Đầu ra và hậu điều kiện.** Preview trả plan, progress, cashflow context, what-if và token nhưng không ghi dữ liệu. Sau xác nhận hợp lệ, mục tiêu được lưu và trả kế hoạch tính lại; what-if không sửa kế hoạch gốc.

**Tiêu chí chấp nhận.**

- `TC-FR10-01`: tiết kiệm có/không có deadline khớp công thức phần còn thiếu và mức góp.
- `TC-FR10-02`: lãi suất 0 và dương cho kết quả trả nợ khớp mô phỏng; negative amortization được phát hiện.
- `TC-FR10-03`: preview không tạo row; token hết hạn hoặc payload khác bị từ chối.
- `TC-FR10-04`: what-if chỉ thay kết quả kịch bản, không thay goal đã lưu.

#### 3.1.3.11. FR-11 — Khoản định kỳ và tác vụ chủ động

**Mục đích.** Quản lý lịch chi lặp, ghi thanh toán nhất quán và chủ động tạo nhắc nhở/insight mà không gây hiệu ứng trùng khi retry.

**Tác nhân và kích hoạt.** Người dùng tạo/sửa/tạm dừng/tiếp tục/xóa/thanh toán recurring bill; scheduler kích hoạt reminder, month-end insight, runway scan, subscription scan và export cleanup.

**Tiền điều kiện và đầu vào.** Khoản định kỳ có tên, amount dương, frequency thuộc weekly/monthly/quarterly/yearly và due day hợp lệ; weekly dùng 1–7, các chu kỳ khác dùng 1–31. Thanh toán phải mang `period_due_date` mà client vừa đọc để chống request cũ. Worker nhận job name hợp lệ và user scope.

**Xử lý chính.** Ngày đến hạn kế tiếp được tính theo chu kỳ và kẹp ngày vào cuối tháng khi cần. Gợi ý recurring sử dụng cadence/độ ổn định được mô tả tại mục 2.3.4. Khi thanh toán, service khóa bill, kiểm tra kỳ dự kiến, tạo expense, trừ số dư ví, ghi payment và dời `next_due_date` trong cùng transaction. Xóa kế hoạch vẫn giữ lịch sử payment theo ràng buộc dữ liệu.

Scheduler upsert lịch; job mặc định thử tối đa 3 lần với exponential backoff. Handler dùng event key/fingerprint và unique index để cùng sự kiện không tạo internal message/export lặp. Persona chỉ trang trí thông báo sau khi facts đã được tính.

**Luồng thay thế và lỗi.** Kỳ thanh toán thiếu hoặc đã thay đổi trả 400/409 và không ghi. Lịch sai, amount sai hoặc wallet/category không hợp lệ làm rollback. Handler không hỗ trợ phải thất bại rõ; retry phải giữ cùng khóa sự kiện. Số dư ví sau payment vẫn được phép âm.

**Đầu ra và hậu điều kiện.** Trả bill/lịch sử payment/giao dịch và kỳ kế tiếp; worker trả thống kê theo user và trạng thái có tạo thông báo hay không. Một kỳ chỉ gây một hiệu ứng nghiệp vụ.

**Tiêu chí chấp nhận.**

- `TC-FR11-01`: weekly/monthly/quarterly/yearly tạo đúng ngày đến hạn, gồm tháng không có ngày 29–31.
- `TC-FR11-02`: payment cập nhật bốn hiệu ứng trong một transaction và rollback toàn bộ khi lỗi.
- `TC-FR11-03`: request dùng kỳ cũ không thanh toán nhầm kỳ mới.
- `TC-FR11-04`: chạy lặp cùng job/event key không tăng số thông báo hoặc file lần thứ hai.

#### 3.1.3.12. FR-12 — Xuất dữ liệu, lịch sử tệp và dọn dẹp

**Mục đích.** Cho phép người dùng lấy dữ liệu theo bộ lọc, theo dõi tệp đã tạo và tự động loại tệp hết hạn.

**Tác nhân và kích hoạt.** Người dùng yêu cầu export trực tiếp hoặc qua chat; worker chạy cleanup theo lịch.

**Tiền điều kiện và đầu vào.** Định dạng và khoảng ngày hợp lệ; các category/wallet/type filter nếu có thuộc contract. Chỉ giao dịch chưa soft delete và thuộc hồ sơ được xuất.

**Xử lý chính.** CSV được tạo UTF-8 có BOM, escape dấu phẩy/dấu nháy/xuống dòng và ghi lịch sử với TTL mặc định 7 ngày. Luồng API mang tên `pdf` hiện tạo tệp `.html`, trả `Content-Type: text/html` và escape nội dung HTML; đây là báo cáo HTML có thể in, **không phải tệp PDF nhị phân**. Worker xóa file quá hạn và cập nhật khả dụng trong lịch sử.

Mã nguồn có endpoint tạo/khôi phục backup `.pfbak`, nhưng phạm vi và tính đầy đủ của backup/restore chưa được kiểm chứng end-to-end; chức năng này không được dùng làm bằng chứng FR-12 đã hoàn chỉnh hoặc dữ liệu đã có khả năng phục hồi production.

**Luồng thay thế và lỗi.** Không có giao dịch phù hợp thì không tạo file rỗng như kết quả thành công. Format/filter sai, file đã hết hạn hoặc ID không thuộc hồ sơ trả lỗi. Lỗi ghi file phải lưu trạng thái lỗi nếu có history tương ứng; không trả URL giả.

**Đầu ra và hậu điều kiện.** Trả file CSV hoặc HTML, số dòng/ID lịch sử và thời điểm hết hạn; cleanup làm file không còn tải được nhưng giữ metadata cần thiết theo chính sách.

**Tiêu chí chấp nhận.**

- `TC-FR12-01`: CSV lọc đúng dữ liệu, loại soft-delete và escape đúng ký tự đặc biệt.
- `TC-FR12-02`: endpoint mang nhãn PDF trả `.html`/`text/html`; tài liệu và UI không gọi đây là PDF thật.
- `TC-FR12-03`: file quá TTL bị dọn và history báo không còn khả dụng.
- `TC-FR12-04`: backup/restore chỉ được công bố sau khi có test toàn vẹn, checksum, rollback và đối soát đầy đủ các bảng.

### 3.1.4. Yêu cầu phi chức năng

Các ngưỡng dưới đây là tiêu chí nghiệm thu hoặc thiết kế đích, không mặc nhiên là kết quả hiện tại. Kết quả thực đo và những phép đo còn thiếu được tách riêng tại mục 3.3.2.

**Bảng 11. Yêu cầu phi chức năng và cách đo**

| Mã | Yêu cầu và phạm vi | Mục tiêu nghiệm thu | Cách đo và bằng chứng |
|---|---|---|---|
| NFR-01 | Tính đúng và nguyên tử của dữ liệu | Không có partial write ở create/update/delete/restore, transfer, recurring payment và batch apply; số dư âm hợp lệ không bị tính là lỗi | Fault injection từng bước, đối chiếu row/số dư trước–sau và kiểm tra rollback |
| NFR-02 | Độ chính xác trích xuất | Chốt ngưỡng riêng cho amount/type/date/category/wallet trên tập gán nhãn độc lập; không suy diễn từ 31 ca hard-coded | Precision, recall, F1 từng field, exact match và phân tích lỗi theo kiểu câu |
| NFR-03 | Tính trung thực số liệu | **Thiết kế đích:** narration không thêm/đổi số hoặc đơn vị ngoài facts; hiện chưa tuyên bố đã đạt | Checker facts–response, numeric faithfulness và unsupported-number rate trên tập khóa phiên bản |
| NFR-04 | Hiệu năng | Text p95 mục tiêu ≤ 3 giây; media p95 mục tiêu ≤ 8 giây trong môi trường được công bố | Tối thiểu 30 lượt mỗi luồng; ghi phần cứng, provider/model, cache hit/miss, p50/p95 và error rate |
| NFR-05 | Khả năng phục hồi | Provider lỗi không tạo dữ liệu giả; Redis lỗi có fallback phát triển; lỗi hậu commit không gây retry trùng | Test timeout/unavailable cho LLM/OCR/STT/Redis, kiểm tra HTTP response, pending và DB |
| NFR-06 | Riêng tư và phạm vi bảo mật | Không ghi credential; xóa file media tạm sau xử lý; traits chỉ dùng khi có consent | Kiểm tra log/config/file tạm và test consent; ghi rõ `default_user` chưa đạt cô lập multi-user production |
| NFR-07 | Khả năng kiểm thử | Giải thuật thuần không phụ thuộc DB/LLM; trường hợp thường và biên có expected tính tay | Unit test trend/anomaly/runway/correlation/budget/goal/matching và báo cáo coverage/ma trận truy vết |
| NFR-08 | Tính nhất quán tác vụ nền | Retry cùng event/job không tạo message/export hoặc thanh toán lặp | Chạy cùng fingerprint nhiều lần, giả lập lỗi giữa bước và so số bản ghi; Redis worker live cần đo riêng |
| NFR-09 | Khả năng truy vết | Insight trả facts, kỳ dữ liệu, phương pháp, provider và thành phần suy giảm | Contract test response và đối chiếu FR → công thức → test → artifact |
| NFR-10 | Khả năng bảo trì và thay thế | Module route–service–model, adapter provider và cấu hình ngưỡng không làm thay đổi contract nghiệp vụ | Review phụ thuộc, test thay provider/fallback và kiểm tra không để công thức trong route/narrator |

Các giới hạn nghiệm thu hiện tại gồm: chưa có authentication/authorization production; grounding checker mới là thiết kế đích; Redis worker chưa được smoke test live đầy đủ; luồng “PDF” mới trả HTML; backup/restore chưa đủ bằng chứng để tuyên bố hoàn chỉnh.

## 3.2. THIẾT KẾ PHẦN MỀM

### 3.2.1. Kiến trúc ứng dụng

PERFIN sử dụng modular monolith thay vì microservice. API server Express chứa các module nghiệp vụ độc lập ở mức mã nguồn nhưng cùng tiến trình triển khai. Worker là tiến trình riêng để xử lý job nền. Lựa chọn này phù hợp quy mô niên luận, giảm chi phí vận hành nhưng vẫn giữ ranh giới module để có thể tách sau này.

![Hình 2. Kiến trúc vận hành của PERFIN](../latex/figures/rendered/02-runtime-architecture.png)

**Hình 2. Kiến trúc vận hành của PERFIN.** Mobile gọi REST API; route chuyển sang service; service dùng model truy cập PostgreSQL. AI Orchestrator chỉ chọn tool và điều phối. Analytics Engine, Budget Engine và Goal Planner tạo kết quả xác định. Redis phục vụ cache/state/queue; worker xử lý tác vụ định kỳ. Các provider AI nằm ngoài biên tin cậy dữ liệu.

**Bảng 12. Thành phần kiến trúc và trách nhiệm**

| Thành phần | Trách nhiệm chính | Không chịu trách nhiệm |
|---|---|---|
| Mobile App | Thu input, preview, hiển thị và thao tác xác nhận | Tính insight, giữ bí mật provider |
| Express Routes | HTTP contract, validation ban đầu, mapping response | Chứa công thức phân tích |
| Core Services | Luật nghiệp vụ, transaction, xác nhận | Sinh câu trả lời tùy ý |
| AI Orchestrator | Tool routing, extraction, fallback | Truy cập DB không qua tool |
| Analytics Engine | Tính facts thống kê | Viết lời khuyên cá nhân hóa |
| Persona/Narrator | Viết lại facts theo giọng điệu | Thay số hoặc quyết định |
| PostgreSQL Models | Truy vấn, constraint, transaction | Lưu state hội thoại tạm |
| KV Store/Redis | TTL state, cache, rate count | Nguồn dữ liệu tài chính chuẩn |
| BullMQ Worker | Job định kỳ, retry, dedup | Xử lý request tương tác trực tiếp |

![Hình 3. Sơ đồ triển khai nguyên mẫu](../latex/figures/rendered/03-deployment.png)

**Hình 3. Sơ đồ triển khai nguyên mẫu.** Frontend Expo chạy trên thiết bị; API, worker, PostgreSQL và Redis chạy trong môi trường demo cục bộ/container; provider AI được gọi qua HTTPS. Sơ đồ là triển khai nguyên mẫu, không mô tả cụm production hay cam kết sẵn sàng cao.

### 3.2.2. Thiết kế dữ liệu

#### 3.2.2.1. Mô hình miền

![Hình 4. Mô hình miền theo aggregate nghiệp vụ](../latex/figures/rendered/04-domain-class.png)

**Hình 4. Mô hình miền theo aggregate nghiệp vụ.** Bốn cụm sổ cái, lập kế hoạch, khoản định kỳ và hội thoại–phản hồi được tách thành các aggregate dễ đọc. Thực thể `User` được vẽ một lần duy nhất và là gốc sở hữu của cả bốn aggregate; các quan hệ sở hữu cùng luồng đọc facts đều định tuyến vuông góc. Analytics/Budget/Goal Services đọc aggregate để tính facts hoặc kế hoạch nhưng không sở hữu entity tài chính.

#### 3.2.2.2. Mô hình vật lý

![Hình 5. Sơ đồ quan hệ thực thể vật lý](../latex/figures/rendered/05-physical-erd.png)

**Hình 5. Sơ đồ quan hệ thực thể vật lý.** ERD được đối chiếu với chuỗi migration runtime và dùng `users.user_key` làm cầu nối tương thích với `default_user`. Sơ đồ thể hiện đủ 18 bảng, PK, FK, unique và check. Mỗi bảng xuất hiện đúng một lần, kể cả `users`; các FK chéo mô-đun như wallet/category/personality được ghi ngay trong bảng con thay vì kéo đường dài, nhờ đó loại bỏ đường cong và phần lớn giao cắt mà không che giấu quan hệ.

**Bảng 13. Nhóm thực thể dữ liệu chính**

| Nhóm | Bảng/thực thể | Ý nghĩa |
|---|---|---|
| Người dùng và cá nhân hóa | `users`, `ai_personalities`, `user_traits` | Hồ sơ demo, persona, consent và traits |
| Sổ cái cá nhân | `wallets`, `categories`, `transactions` | Nguồn dữ liệu thu–chi cốt lõi |
| Ngân sách | `budgets`, `budget_history` | Hạn mức và lịch sử thay đổi |
| Chi định kỳ | `recurring_bills`, `recurring_bill_payments`, `recurring_suggestions_dismissed` | Lịch, thanh toán và lựa chọn đã bỏ qua |
| Phản hồi AI | `ai_feedback_logs` | Kết quả ban đầu và sửa của người dùng |
| Mục tiêu | `financial_goals` | Tiết kiệm, mua sắm, trả nợ và tiến độ |
| Dòng tiền đặc biệt | `wallet_transfers`, `investment_pnl` | Chuyển ví và lãi/lỗ đầu tư |
| Hội thoại và vận hành | `chat_messages`, `export_history`, `backup_config` | Lịch sử chat, export và cấu hình sao lưu |

#### 3.2.2.3. Quy tắc dữ liệu quan trọng

- `DECIMAL(15,2)` được dùng cho tiền; service chuyển đổi rõ kiểu khi tính trong JavaScript.
- Soft delete giao dịch giữ dữ liệu để phục hồi; truy vấn báo cáo mặc định loại bản ghi đã xóa.
- Xóa danh mục có giao dịch phải bị chặn hoặc chuyển có kiểm soát, không cascade làm mất lịch sử tài chính.
- `user_key` hiện là khóa tương thích, không phải bằng chứng hệ thống đã có authentication.
- Dữ liệu tạm như pending/clarification không nằm trong ERD bền vững; chúng có schema riêng trong Redis và TTL.

### 3.2.3. Thiết kế chi tiết

#### 3.2.3.1. Ranh giới LLM trong kiến trúc

![Hình 6. Ranh giới trách nhiệm của LLM trong PERFIN](../latex/figures/rendered/06-llm-boundary.png)

**Hình 6. Ranh giới trách nhiệm của LLM.** Vùng bên trái tạo dữ liệu và facts có thể kiểm chứng; vùng giữa là AI Orchestrator; vùng bên phải chỉ diễn giải. Mũi tên ngược từ người dùng biểu diễn bước xác nhận hoặc sửa sai. LLM không có kết nối trực tiếp tới PostgreSQL và không tự thực thi tool.

#### 3.2.3.2. Máy trạng thái hội thoại

![Hình 7. Máy trạng thái hội thoại và giao dịch chờ xác nhận](../latex/figures/rendered/07-conversation-state.png)

**Hình 7. Máy trạng thái hội thoại và giao dịch chờ xác nhận.** Trạng thái chính gồm `idle`, `parse`, `collecting`, `preview`, `confirmed`, `cancelled` và `expired`; lựa chọn ứng viên được giữ trong `collecting`. Redis lưu `intent`, trường đang chờ, dữ liệu đã thu và candidates trong 5 phút. Mọi nhánh ghi dữ liệu phải đi qua `preview → confirmed`; ba trạng thái cuối kết thúc phiên hiện tại, còn yêu cầu mới tạo một phiên `idle` khác.

#### 3.2.3.3. Nhập giao dịch bằng văn bản

![Hình 8. Sơ đồ tuần tự nhập giao dịch bằng văn bản](../latex/figures/rendered/08-text-sequence.png)

**Hình 8. Sơ đồ tuần tự nhập giao dịch bằng văn bản.** Trình tự gồm: nhận text; lấy categories/wallets và corrections đã cache; gọi LLM tool hoặc local router; chuẩn hóa và validation; hỏi lại nếu thiếu; tạo preview; người dùng sửa/xác nhận; service mở DB transaction; cập nhật số dư và kiểm tra ngân sách; trả kết quả. LLM không nằm trong transaction ghi dữ liệu.

#### 3.2.3.4. Đầu vào đa phương thức

![Hình 9. Luồng xử lý đầu vào đa phương thức](../latex/figures/rendered/09-multimodal-flow.png)

**Hình 9. Luồng xử lý đầu vào đa phương thức.** Voice đi qua STT và bước xác nhận transcript. Ảnh đi qua preprocessing/OCR và lựa chọn tổng hóa đơn hoặc từng mặt hàng. Cả hai hội tụ tại pipeline text chung. Lỗi provider trả trạng thái lỗi; không được thay bằng raw text giả.

#### 3.2.3.5. Phân loại và feedback loop

Chuỗi chuẩn hóa bỏ dấu, hạ chữ thường và thu gọn khoảng trắng. Độ tương đồng kết hợp Levenshtein chuẩn hóa, Dice token và điểm containment:

$$
s=\max(s_{edit}, 0{,}92s_{dice}, s_{containment}).
$$

Matcher ưu tiên exact, alias exact rồi fuzzy. Input ngắn dùng ngưỡng cao hơn; ứng viên tốt nhất phải vượt ngưỡng và cách ứng viên thứ hai một margin an toàn. Correction cũ được gom theo category; hệ thống chỉ dùng khi có đủ mức đồng thuận, tránh học từ lịch sử mâu thuẫn. Các correction gần input mới được chọn làm few-shot context, nhưng vẫn phải qua validation và xác nhận.

![Hình 10. Luồng phản hồi và cá nhân hóa phân loại](../latex/figures/rendered/10-feedback-flow.png)

**Hình 10. Luồng phản hồi và cá nhân hóa phân loại.** Khi người dùng sửa category, hệ thống lưu cặp kết quả AI–kết quả đúng. Lần sau, correction exact/fuzzy được xét trước, sau đó mới đến LLM/matcher. Các giao dịch lặp trong “Khác” được gom cụm để đề xuất category; tạo category và re-tag luôn là một kế hoạch chờ xác nhận.

#### 3.2.3.6. Sinh insight có căn cứ

![Hình 11. Sơ đồ tuần tự sinh insight có căn cứ](../latex/figures/rendered/11-insight-sequence.png)

**Hình 11. Sơ đồ tuần tự sinh insight có căn cứ.** `query_financial_data` gọi model SQL, Analytics Engine tính facts và gắn metadata. Guard kiểm tra đơn vị/số quan sát trước khi facts được gửi cho narrator. LLM chỉ viết câu giải thích theo persona; narrator fallback tạo template khi LLM lỗi. Response trả cả thông điệp và facts để truy vết.

#### 3.2.3.7. Lập kế hoạch mục tiêu

![Hình 12. Luồng lập kế hoạch mục tiêu và mô phỏng what-if](../latex/figures/rendered/12-goal-flow.png)

**Hình 12. Luồng lập kế hoạch mục tiêu và mô phỏng what-if.** User nhập mục tiêu; LLM chỉ trích xuất tham số. Goal Planner kiểm tra ngày/số, tính surplus, thời hạn, mức góp, lãi và cảnh báo. What-if tạo kịch bản mới mà không sửa kế hoạch gốc. Chỉ sau xác nhận mới lưu `financial_goals`.

#### 3.2.3.8. Tác vụ chủ động

![Hình 13. Sơ đồ tuần tự tác vụ chủ động](../latex/figures/rendered/13-worker-sequence.png)

**Hình 13. Sơ đồ tuần tự tác vụ chủ động.** Scheduler tạo job có định danh; worker lấy đúng user scope, gọi handler, tính facts và ghi internal message/export nếu cần. Retry dùng cùng fingerprint; lớp lưu trữ và unique index loại thông báo lặp. Các handler gồm recurring reminder, runway scan, subscription scan, month-end insight và export cleanup.

#### 3.2.3.9. Kiểm soát thao tác do LLM khởi tạo

**Bảng 14. Điều kiện kiểm soát đối với các thao tác do LLM khởi tạo**

| Thao tác | Validation bắt buộc | Xác nhận | Tính nguyên tử/idempotent |
|---|---|---|---|
| Tạo một/nhiều giao dịch | amount > 0, type/category/wallet hợp lệ | Có | DB transaction cho batch và số dư |
| Chuyển ví | amount > 0, ngày hợp lệ, hai ví khác nhau và cùng hồ sơ; số dư âm được phép | Có | Debit + credit + history cùng transaction |
| Tạo recurring bill | tên, số tiền, chu kỳ, ngày hợp lệ | Có | Không tạo trùng cùng kế hoạch |
| Áp dụng ngân sách đề xuất | dữ liệu lịch sử và tổng hạn mức hợp lệ | Có | Upsert theo user/category/kỳ |
| Tạo mục tiêu | type, target, date, interest phù hợp | Có | Lưu sau preview |
| Tạo category và re-tag | tên không generic, danh sách ID thuộc user | Có | Tạo/reuse + retag + feedback cùng kế hoạch |
| Truy vấn/insight | kỳ dữ liệu hợp lệ | Không, vì chỉ đọc | Facts truy vết được |
| Export | định dạng và khoảng ngày hợp lệ | Có khi gọi từ chat | Job cleanup có fingerprint |

### 3.2.4. Bảo mật, riêng tư và đạo đức

Nguyên mẫu không có authentication production; vì vậy không được tuyên bố đã bảo đảm cô lập nhiều người dùng. Dù schema có FK theo `user_key`, mọi route demo vẫn phải được xem trong phạm vi một hồ sơ. Mọi thao tác theo ID đã được rà soát để luôn kèm điều kiện `user_id` và có kiểm thử truy cập chéo (10/10 lượt truy cập chéo bị chặn, xem `log/idor-verification_2026-07-25.json`), nhưng điều kiện dữ liệu không thay cho xác thực: trước khi triển khai thật vẫn cần bổ sung authentication và authorization thực sự.

Credential AI, service account và chuỗi kết nối không được ghi vào Git hoặc chat log. Raw ảnh/audio cần chính sách xóa sau xử lý. `user_traits` chỉ được lưu và dùng khi `personalization_consent=true`. Persona không được gây áp lực, miệt thị hoặc biến gợi ý thành tư vấn đầu tư chắc chắn. Mọi insight cần nêu khoảng thời gian và giới hạn dữ liệu.

## 3.3. KIỂM THỬ

### 3.3.1. Kế hoạch kiểm thử

#### 3.3.1.1. Ma trận kiểm thử

**Bảng 15. Ma trận kiểm thử**

| Cấp kiểm thử | Đối tượng | Kỹ thuật | Bằng chứng |
|---|---|---|---|
| Unit | Analytics, matching, budget, goal, validation | Dữ liệu thường, biên, property/invariant | `node:test`, expected values tính tay |
| Integration | Route–service–model, Redis, PostgreSQL | DB test, transaction rollback, TTL | Log chạy và snapshot DB |
| Contract AI | Tool schema và parser | Tập câu gán nhãn, provider và local fallback | JSON kết quả từng case |
| Media | OCR/STT adapter | Ảnh/audio thật có ground truth | CER/WER hoặc field accuracy |
| Grounding | Narrator/persona | So số trong response với facts | Numeric faithfulness, hallucination count |
| Worker | Retry/dedup/schedule | Chạy lặp cùng event, giả lập lỗi | Số message/export trước–sau |
| System | Luồng text/voice/image đến DB | End-to-end trên thiết bị | Video/log và DB assertion |
| UAT | Người dùng mục tiêu | Nhiệm vụ có thời gian/số bước | Tỷ lệ hoàn thành, SUS/nhận xét |

#### 3.3.1.2. Thiết kế dữ liệu kiểm thử

Bộ dữ liệu văn bản phải tách tập phát triển và tập đánh giá, bao gồm:

- đơn vị `k`, `nghìn`, `ngàn`, `tr`, `triệu`, số bằng chữ và phép nhân;
- ngày tuyệt đối, “hôm nay/hôm qua”, câu không có ngày;
- thu, chi, transfer, investment và câu có nhiều giao dịch;
- danh mục gần nghĩa, typo, câu Việt–Anh và trường hợp mơ hồ;
- câu thiếu amount/wallet/category để kiểm tra clarification;
- các correction xung đột để kiểm tra hệ thống không học sai.

Tập media cần lưu ảnh/audio gốc, transcript hoặc bảng hóa đơn chuẩn và kết quả mong đợi. Dữ liệu tài chính dùng cho analytics phải là dữ liệu tổng hợp/ẩn danh, có kịch bản biết trước slope, outlier, cadence và correlation để đối chiếu công thức.

#### 3.3.1.3. Bộ chỉ số

**Bảng 16. Bộ chỉ số đánh giá**

| Nhóm | Chỉ số | Cách tính/diễn giải |
|---|---|---|
| Extraction | Precision, recall, F1 theo field; exact match | So amount/type/date/category/wallet với nhãn |
| Classification | Accuracy, macro-F1, confusion matrix | Đánh giá cả danh mục ít mẫu |
| Clarification | Completion rate, số lượt hỏi trung bình | Chỉ tính case ban đầu thiếu/mơ hồ |
| OCR/STT | CER/WER và transaction-field accuracy | Chất lượng raw và tác động nghiệp vụ |
| Grounding | Numeric faithfulness, unsupported-number rate | Mọi số trong câu phải map về facts |
| Analytics | Sai số tuyệt đối so với expected | Unit test từng công thức và điều kiện biên |
| Hiệu năng | p50, p95, error rate | Tách cache hit/miss và từng provider |
| Cache | Hit rate, số lần gọi LLM giảm | So baseline không cache |
| Worker | Duplicate-effect rate, retry success | Chạy cùng fingerprint nhiều lần |
| Trải nghiệm | Tỷ lệ hoàn thành, thời gian và số thao tác | So chat với form trên cùng nhiệm vụ |

### 3.3.2. Kết quả và phân tích

#### 3.3.2.1. Kết quả đã đo

Ngày 16/07/2026, tại workspace phát triển, các phép kiểm tra từ unit đến runtime được chạy. Bộ test, parser harness, API smoke và media smoke chạy từ `demo/backend`; phép đóng gói và mobile-web smoke chạy từ `demo/frontend`:

```bash
npm test
npm run test:ai
npm run smoke:full
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 npx expo export \
  --platform web --output-dir /tmp/perfin-expo-web-final
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 npx expo export \
  --platform android --output-dir /tmp/perfin-expo-android-final
npm run ui:smoke -- --output-dir /home/ngthtrong/perfin-ui-smoke-start-app
```

Baseline trước sửa lỗi có **13/13 tệp kiểm thử đạt** và local parser đạt **27/31 strict**, 2 partial, 2 fail. Hai lỗi amount là “1 triệu 5” và phép nhân “3 cái áo, mỗi cái 200k”; hai ca partial là ánh xạ `quần jeans` và `đi ăn`. Sau ổn định hóa, Node test runner báo **182/182 test đạt**, 0 thất bại (100/100 tại mốc 16/07/2026, trước khi bộ test được mở rộng); harness local parser đạt **31/31 strict (100%)**, 0 partial, 0 fail. Full smoke qua REST API, PostgreSQL và provider media thật đạt **23/23**. Expo đóng gói web thành công **653 module** và Android **960 module**. UI smoke ở viewport 390×844 xác nhận Dashboard, Report và Chat không tràn ngang; ảnh 1184×2560 hiển thị trực tiếp trong bubble chat.

Các test mới khóa các lỗi transaction/post-commit, pending race, recurring period, ngày local, parser, export và time-series zero-fill. Live smoke đã chứng minh luồng HTTP--PostgreSQL, chat preview/edit/cancel, OCR 2 ảnh và STT 1 tệp M4A hoạt động trong môi trường ghi nhận. Chúng **không** phải benchmark Gemini, không chứng minh độ chính xác OCR/STT, không đo API p95 và chưa kiểm chứng worker định kỳ với Redis thật. Tỷ lệ 100% của parser chỉ áp dụng cho 31 ca hard-coded, chưa phải kết quả khái quát hóa trên tập gán nhãn độc lập.

**Bảng 17. Kết quả đã đo và các phép đo còn thiếu**

| Hạng mục | Kết quả | Phân loại | Ghi chú |
|---|---|---|---|
| `npm test` sau ổn định hóa | 182/182 test pass; 0 fail | **Đã đo** | Unit/service trên 38 tệp test; gồm transaction, concurrency, recurring, health, importer, time-series và user scope. Mốc 16/07/2026 là 100/100 trước khi mở rộng bộ test (`log/backend-test-run_2026-07-25.json`) |
| Local parser trên harness cố định | 31/31 strict; 0 partial; 0 fail | **Đã đo sau sửa** | Không dùng Gemini; strict gate có exit code, nhưng 31 ca hard-coded chưa phải tập độc lập |
| Baseline trước sửa | 13/13 tệp test; parser 27/31 strict | **Đã đo baseline** | Giữ để phân tích lỗi và chứng minh tác động của bản sửa |
| Full API/DB/media smoke | 23/23 pass | **Đã đo** | PostgreSQL live, preview/edit/cancel, OCR 2 ảnh, STT 1 M4A; Redis worker không nằm trong kết quả này |
| Mobile-web UI smoke | 4/4 cổng pass ở 390×844 | **Đã đo** | Ba màn hình không overflow; ảnh tải lên hiển thị thật; Chromium, chưa phải thiết bị vật lý |
| Expo web/Android export | 653 / 960 module; hoàn tất | **Đã đo** | Chứng minh frontend đóng gói được, không phải chỉ số hiệu năng runtime |
| Import `dataFinance.csv` | 5.265 dòng, 0 reject, provenance đầy đủ | **Đã đo** | Đã chạy hai lần trên clone và đối soát live sau backup |
| Phân loại danh mục — local parser trên `dataFinance.csv` | Accuracy 29,36%; macro-F1 0,177 (12 lớp) | **Đã đo** | 5.265 dòng gán nhãn; nhãn lịch sử theo nguồn tiền nên chỉ độc lập một phần về lược đồ (xem §3.3.2.3) |
| Ablation local parser vs LLM (Gemini) | Parser 22,2% / macro-F1 0,204; LLM 59,5% / macro-F1 0,607 | **Đã đo** | Mẫu phân tầng 63 câu (5/lớp, seed 42); 63/63 gọi Gemini thành công; p50 964 ms |
| Feedback before/after (correction retrieval) | Accuracy 0% → 68,19%; macro-F1 0 → 0,544 trên holdout | **Đã đo** | 3.502 câu parser-sai chia seed/holdout; kiểm tra không suy giảm ở nhóm chứng |
| OCR field accuracy | Chưa công bố | **Chưa đo trong báo cáo** | Cần tập ảnh và ground truth |
| STT WER/field accuracy | Chưa công bố | **Chưa đo trong báo cáo** | Cần tập audio và transcript chuẩn |
| Numeric faithfulness của narrator | Chưa công bố | **Chưa đo trong báo cáo** | Cần checker trên facts/response |
| p50/p95 API và cache hit | Chưa công bố | **Chưa đo trong báo cáo** | Cần mô tả phần cứng, provider và số lượt |
| UAT | Chưa công bố | **Chưa thực hiện** | Không suy diễn từ demo nội bộ |

#### 3.3.2.2. Cách diễn giải kết quả hiện tại

Kết quả tự động hiện có là bằng chứng cho việc tách giải thuật thành hàm thuần và kiểm tra các tình huống như negative amortization, fuzzy ambiguity, job idempotency, state TTL, pending concurrency, zero-spend days và missing months. Tuy nhiên, chỉ số tổng “pass” không cho biết độ bao phủ nhánh, chất lượng dữ liệu thử hoặc hiệu quả trên người dùng thật. Bản nghiệm thu tiếp theo phải bổ sung:

**Bảng 18. Trạng thái và hành vi đích của chức năng trọng yếu**

| Chức năng | Hiện trạng | Khoảng trống chính | Điều kiện hoàn tất |
|---|---|---|---|
| Giao dịch và analytics | **Đã đo** | Transaction, post-commit, zero-fill và full DB smoke đã đạt; 5.265 dòng live đã đối soát | Dataset gán nhãn và fault-injection DB rộng hơn |
| Chat preview/confirm | **Đã đo** | Claim một lần, stale ID, edit/cancel race, history và HTTP–DB smoke đã đạt | Đo TTL/claim với Redis thật và tải đồng thời cao hơn |
| Local parser | **Đã đo trên tập độc lập** | 31/31 strict trên gate cố định; trên 5.265 dòng độc lập chỉ đạt 29,36% acc / macro-F1 0,177 | Cải thiện danh mục ít mẫu và câu nguồn-tiền mơ hồ |
| LLM tool routing | **Đã đo (ablation)** | Gemini 59,5% acc / macro-F1 0,607 so parser 22,2% / 0,204 trên cùng mẫu 63 câu | Mở rộng mẫu và khóa chi phí/độ trễ theo provider |
| OCR/STT | **Đã đo smoke** | Provider thật đạt với 2 ảnh và 1 M4A; chưa có ground truth | Adapter failure test, CER/WER và field accuracy trên tập ẩn danh |
| Ví/chuyển ví | **Hiện thực một phần** | Thiếu route/UI tạo ví trên fresh install; chưa có integration test transfer | CRUD tối thiểu và kiểm thử invariant số dư, gồm trường hợp số dư âm |
| Recurring và worker | **Đã đo một phần** | Payment đã khóa hàng, nguyên tử, có kỳ dự kiến và chat preview; notification vẫn là chat nội bộ | Live Redis/DB worker test và kênh nhắc ngoài ứng dụng nếu mở rộng |
| Export/backup | **Chưa đúng tên gọi/thiếu bằng chứng** | “PDF” vẫn là HTML; backup/restore chưa đủ test toàn vẹn | PDF thật hoặc đổi nhãn; backup/restore an toàn, có rollback/checksum |
| Auth/multi-user | **Ngoài phạm vi hiện tại** | `default_user`; mọi thao tác theo ID đã scoped và có test truy cập chéo (`log/idor-verification_2026-07-25.json`), nhưng chưa có xác thực | Không demo như đã có; bổ sung authentication/authorization trước production |

1. commit hash, phiên bản Node/PostgreSQL/Redis và cấu hình provider;
2. danh sách test case, dữ liệu đầu vào và log đầu ra;
3. độ bao phủ hoặc ít nhất ma trận yêu cầu–test;
4. phân tích lỗi, không chỉ tỷ lệ pass;
5. so sánh với baseline local parser/form thủ công khi đánh giá lợi ích LLM.

#### 3.3.2.3. Thí nghiệm định lượng trên tập gán nhãn

Ba thí nghiệm được thực hiện ngày 24/07/2026 trên chính `dataFinance.csv` (5.265 dòng, SHA-256 `a9b7cf1b…027ca94f`), commit `5f03476`, Node v24.16.0, provider `gemini`, model `gemini-3.1-flash-lite`. Mã và artifact (JSON + Markdown tái lập) nằm ở `demo/backend/tests/experiments/` và `log/`.

**a) Benchmark phân loại danh mục — local parser trên toàn tập**

Chạy `parseLocalTransaction` trên toàn bộ 5.265 dòng gán nhãn, so nhãn dự đoán với nhãn gold ánh xạ từ taxonomy lịch sử.

**Bảng 19. Kết quả phân loại local parser trên `dataFinance.csv`**

| Chỉ số | Giá trị |
|---|---|
| Accuracy (micro) | 29,36% |
| Macro-F1 (12 lớp có mẫu) | 0,177 |
| Weighted-F1 | 0,301 |
| Accuracy (loại lớp "Khác") | 27,52% |
| Số ca sai | 3.719 / 5.265 |
| Số ca sai liên quan lớp "Khác" | 2.957 |

Con số thấp là **phát hiện có ý nghĩa, không phải thất bại**: nhãn lịch sử phân loại theo *nguồn tiền* (ví dụ "mẹ cho tiền ăn" → nhãn gia đình "Khác") trong khi parser phân loại theo *nội dung* (→ "Ăn uống"). Hai lược đồ khác trục nên 79,5% (2.957/3.719) ca sai xoay quanh lớp "Khác". Đây chính là lý do thiết kế chọn LLM làm lớp trích xuất chính và giữ người dùng trong vòng xác nhận, thay vì tin vào so khớp alias.

**b) Ablation local parser vs LLM (Gemini)**

Trên mẫu phân tầng 63 câu (5 câu/lớp, seed 42), so hai nhánh trích xuất danh mục; nhánh LLM gọi `parseWithGemini` trực tiếp, bỏ qua cache và định tuyến cục bộ.

**Bảng 20. Ablation local parser vs LLM**

| Nhánh | Accuracy | Macro-F1 | Weighted-F1 | Clarification rate | p50 latency | Số gọi API |
|---|---|---|---|---|---|---|
| Local parser | 22,2% | 0,204 | 0,204 | 84,1% | 0 ms | 0 |
| LLM (Gemini) | 59,5% | 0,607 | 0,593 | 95,2% | 964 ms | 63 |

LLM khái quát tốt hơn khoảng 3,0× về macro-F1 trên câu tự do, đổi lấy độ trễ p50 964 ms và chi phí gọi API. Cả hai nhánh đều đi qua bước xác nhận trước khi ghi, nên LLM là lớp hỗ trợ trích xuất chứ không phải nguồn chân lý. Đo trên 63/63 câu gọi Gemini thành công; trong đó 42 câu nhận nhãn xác định và 21 câu LLM trả rỗng, tính là phân loại sai.

**c) Feedback before/after (correction retrieval)**

Loại lớp "Khác" còn 4.832 câu nội dung. Nhóm parser-sai (3.502 câu) chia đôi: seed (ghi corrections) và holdout (phát lại). Đo cải thiện trên holdout và kiểm tra không suy giảm ở nhóm chứng (1.330 câu parser vốn đúng).

**Bảng 21. Feedback before/after trên tập holdout**

| Chỉ số | Trước (parser) | Sau (correction→parser) | Δ |
|---|---|---|---|
| Accuracy | 0,00% | 68,19% | +68,19 điểm |
| Macro-F1 | 0,0000 | 0,5440 | +0,5440 |
| Weighted-F1 | 0,0000 | 0,7824 | +0,7824 |

1.194 câu chuyển sai→đúng qua tra cứu tương đồng văn bản (không phải khớp chính xác, nên đo được khả năng khái quát sang câu gần giống). Nhóm chứng có 466/1.330 câu bị correction làm sai, nhưng 430 trong số đó (92%) là **nhiễu nhãn cố hữu** của dữ liệu lịch sử — cùng một câu chữ xuất hiện với nhiều nhãn gold khác nhau, không hệ thống nào phân biệt được. Suy giảm thực trên câu đơn nghĩa chỉ 36 ca (2,7%), xác nhận correction không học sai một cách hệ thống.

**d) Grounded narration**

Chưa đo định lượng trong đợt này; giữ ở mức thiết kế (cấp cùng facts cho nhiều persona, kiểm tra số liệu giữ nguyên khi giọng điệu thay đổi) và là hướng mở rộng ưu tiên.

Ba kết quả (a)–(c) có log tái lập nên được phản ánh trong abstract và kết luận; (d) chưa đủ điều kiện.

---

# CHƯƠNG 4: KẾT LUẬN

## 4.1. KẾT QUẢ ĐẠT ĐƯỢC

Ở mức thiết kế và hiện thực nguyên mẫu, PERFIN đã hình thành kiến trúc tách dữ liệu, giải thuật và lớp LLM; có migration cho các thực thể chính; có các module analytics, feedback, budget, goal, state và worker; đồng thời có bộ test tự động chạy được. Điểm quan trọng nhất là vai trò LLM đã được làm rõ: LLM không thay SQL hoặc giải thuật thống kê, mà chuyển ngôn ngữ tự nhiên thành tool call và chuyển facts thành lời giải thích.

**Bảng 22. Đối chiếu mục tiêu với bằng chứng**

| Mục tiêu | Bằng chứng hiện có | Kết luận thận trọng |
|---|---|---|
| O1 — Mô hình dữ liệu | Migration, model, validation và luồng transaction | Đã hiện thực ở mức prototype; cần test DB fault-injection đầy đủ |
| O2 — Pipeline đa phương thức | Tool schema, parser, media adapter, preview/state; ablation parser vs LLM có số đo | Đã hiện thực luồng; text accuracy đã đo (LLM 59,5% vs parser 22,2% trên mẫu 63 câu), OCR/STT chưa có ground truth |
| O3 — Giải thuật phân tích | Hàm thuần và test analytics/goal/budget/feedback; classification và feedback đã benchmark trên 5.265 dòng | Có bằng chứng test tự động và số đo trên tập độc lập; cần mở rộng danh mục ít mẫu |
| O4 — Ranh giới LLM | Tool declarations, facts–narrator flow, fallback | Thiết kế rõ; numeric faithfulness chưa được đo hệ thống |
| O5 — Đánh giá vận hành | Regression, parser, full API/DB/media smoke, mobile UI smoke và Expo web/Android export đã chạy | Lõi demo có bằng chứng runtime; chưa đủ kết luận Redis worker, hiệu năng, LLM/media accuracy hoặc UAT |

Sau đợt ổn định hóa, các luồng tiền quan trọng đã có hàng rào rõ hơn: pending được claim một lần; recurring khóa hàng, dùng kỳ dự kiến và preview trước commit; lỗi cache/hydration sau commit không tạo phản hồi thất bại giả; runway/OLS dùng đủ trục lịch. Dữ liệu tổng hợp cũ đã được thay bằng 5.265 giao dịch gần bốn năm qua pipeline nguyên tử. Ba thí nghiệm định lượng trên tập này (§3.3.2.3) đã cho câu trả lời số cho câu hỏi "giải thuật chính xác đến đâu": parser cục bộ đạt macro-F1 0,177 trên toàn bộ 5.265 dòng; trong ablation trên mẫu phân tầng 63 câu, LLM đạt 0,607 so với 0,204 của parser trên *cùng mẫu* (khoảng 3,0×); và correction retrieval nâng accuracy holdout lên 68,19% — vừa lượng hóa được đóng góp lõi, vừa biện minh cho lựa chọn LLM-primary có người xác nhận. Do chưa có Redis worker live, benchmark OCR/STT/grounding, đo tải và UAT, báo cáo vẫn không khẳng định nguyên mẫu đã đạt các ngưỡng NFR production.

## 4.2. HẠN CHẾ

1. Runtime vẫn sử dụng `default_user`; hệ thống chưa có xác thực và phân quyền production.
2. Chất lượng trích xuất phụ thuộc provider, ngôn ngữ đời thường và chất lượng ảnh/audio.
3. Các ngưỡng anomaly, fuzzy, recurring và correlation hiện là cấu hình khởi đầu, chưa được tối ưu trên tập dữ liệu đại diện.
4. Runway và trend đã dùng ngày/tháng zero-fill nhưng vẫn là ngoại suy đơn giản, không mô hình hóa sự kiện tương lai, mùa vụ hoặc thu nhập bất thường.
5. Persona có thể làm phản hồi hấp dẫn hơn nhưng hiệu quả hành vi chưa được chứng minh bằng UAT.
6. Dataset đã dài hơn về thời gian nhưng taxonomy ánh xạ mất mát, có khoảng trống đầu chuỗi và năm 2026 chưa đầy đủ.
7. Luồng API--PostgreSQL và provider media đã smoke test; Redis worker, retry/idempotency live và nhiều thiết bị mobile vẫn chưa được kiểm chứng.

## 4.3. HƯỚNG PHÁT TRIỂN

- Xây dựng tập dữ liệu tiếng Việt được gán nhãn, ẩn danh và có phiên bản để đánh giá extraction/classification.
- Bổ sung authentication và authorization theo user trước khi deploy; điều kiện `user_id` ở mọi thao tác theo ID và kiểm thử truy cập chéo đã có.
- Hiệu chỉnh ngưỡng giải thuật theo dữ liệu thật; thêm khoảng tin cậy và giải thích mức độ chắc chắn.
- Xây dựng bộ kiểm tra tự động numeric grounding và theo dõi drift khi thay model/prompt.
- So sánh nhiều provider OCR/STT/LLM theo độ chính xác, độ trễ, chi phí và riêng tư.
- Bổ sung quan sát vận hành, audit log, mã hóa và chính sách lưu/xóa ảnh, audio, export.
- Chỉ sau khi phần lõi dữ liệu và giải thuật ổn định mới xem xét bank sync, shared wallet hoặc triển khai production.

---

# TÀI LIỆU THAM KHẢO

[1] A. Lusardi and O. S. Mitchell, “The Economic Importance of Financial Literacy: Theory and Evidence,” *Journal of Economic Literature*, vol. 52, no. 1, pp. 5–44, 2014.

[2] A. Vaswani *et al.*, “Attention Is All You Need,” in *Advances in Neural Information Processing Systems*, vol. 30, 2017, pp. 5998–6008. [Online]. Available: https://arxiv.org/abs/1706.03762

[3] Gemini Team, “Gemini: A Family of Highly Capable Multimodal Models,” *arXiv preprint arXiv:2312.11805*, 2023.

[4] Google AI for Developers, “Function calling with the Gemini API,” 2026. [Online]. Available: https://ai.google.dev/gemini-api/docs/function-calling. [Accessed: 15-Jul-2026].

[5] R. Smith, “An Overview of the Tesseract OCR Engine,” in *Proc. 9th International Conference on Document Analysis and Recognition*, vol. 2, 2007, pp. 629–633.

[6] A. Radford *et al.*, “Robust Speech Recognition via Large-Scale Weak Supervision,” *arXiv preprint arXiv:2212.04356*, 2022. [Online]. Available: https://arxiv.org/abs/2212.04356

[7] PostgreSQL Global Development Group, “PostgreSQL Documentation — Transactions and Data Definition,” 2026. [Online]. Available: https://www.postgresql.org/docs/current/tutorial-transactions.html and https://www.postgresql.org/docs/current/ddl.html. [Accessed: 15-Jul-2026].

[8] Redis Ltd., “EXPIRE,” *Redis Commands Documentation*, 2026. [Online]. Available: https://redis.io/docs/latest/commands/expire/. [Accessed: 15-Jul-2026].

[9] Taskforce.sh, “BullMQ Documentation: Idempotent Jobs and Retrying Failing Jobs,” 2026. [Online]. Available: https://docs.bullmq.io/patterns/idempotent-jobs and https://docs.bullmq.io/guide/retrying-failing-jobs. [Accessed: 15-Jul-2026].

[10] J. W. Tukey, *Exploratory Data Analysis*. Reading, MA, USA: Addison-Wesley, 1977.

[11] IEEE Computer Society, *IEEE Recommended Practice for Software Requirements Specifications*, IEEE Std 830-1998, 1998.

[12] R. H. Thaler and C. R. Sunstein, *Nudge: Improving Decisions About Health, Wealth, and Happiness*. New York, NY, USA: Penguin Books, 2009.

[13] V. I. Levenshtein, “Binary Codes Capable of Correcting Deletions, Insertions, and Reversals,” *Soviet Physics Doklady*, vol. 10, no. 8, pp. 707–710, 1966.

[14] L. R. Dice, “Measures of the Amount of Ecologic Association Between Species,” *Ecology*, vol. 26, no. 3, pp. 297–302, 1945.

[15] D. C. Montgomery, E. A. Peck, and G. G. Vining, *Introduction to Linear Regression Analysis*, 5th ed. Hoboken, NJ, USA: Wiley, 2012.

[16] K. Pearson, “Note on Regression and Inheritance in the Case of Two Parents,” *Proceedings of the Royal Society of London*, vol. 58, pp. 240–242, 1895.

[17] Money Lover, “Money Lover — Money Manager, Budget Expense Tracker,” 2026. [Online]. Available: https://moneylover.me. [Accessed: 24-Jul-2026].

[18] MISA JSC, “MISA MoneyKeeper — Ứng dụng quản lý chi tiêu cá nhân,” 2026. [Online]. Available: https://www.misa.vn/moneykeeper. [Accessed: 24-Jul-2026].

---

# PHỤ LỤC

## PHỤ LỤC A: DANH MỤC SƠ ĐỒ DRAW.IO

Mỗi hình có tệp nguồn `.drawio` và các bản render PNG, SVG, PDF cùng basename. Bản LaTeX sử dụng PDF tại `latex/figures/rendered/`; tệp nguồn chỉnh sửa đặt tại `latex/figures/drawio/`. Danh mục gồm:

1. `01-system-context`
2. `02-runtime-architecture`
3. `03-deployment`
4. `04-domain-class`
5. `05-physical-erd`
6. `06-llm-boundary`
7. `07-conversation-state`
8. `08-text-sequence`
9. `09-multimodal-flow`
10. `10-feedback-flow`
11. `11-insight-sequence`
12. `12-goal-flow`
13. `13-worker-sequence`

Sơ đồ phải dùng cùng thuật ngữ với báo cáo, có legend phân biệt thành phần xác định, LLM, dữ liệu bền vững, dữ liệu tạm và dịch vụ ngoài.

## PHỤ LỤC B: LỆNH TÁI LẬP KIỂM THỬ

```bash
cd demo/backend
docker compose -f compose.redis.yml up -d
npm run migrate
npm test
npm run test:ai
```

Khi ghi nhận kết quả cần bổ sung commit hash, phiên bản runtime, cấu hình provider, trạng thái Redis/PostgreSQL, timestamp, số case và toàn bộ log. Không đưa secret vào phụ lục.

## PHỤ LỤC C: MẪU BIÊN BẢN KẾT QUẢ

| Trường | Nội dung cần ghi |
|---|---|
| Commit | `[CẦN ĐIỀN]` |
| Thời gian chạy | `[CẦN ĐIỀN]` |
| Máy/OS/Node | `[CẦN ĐIỀN]` |
| PostgreSQL/Redis | `[CẦN ĐIỀN]` |
| Provider/model/prompt version | `[CẦN ĐIỀN]` |
| Dataset/version/số mẫu | `[CẦN ĐIỀN]` |
| Lệnh chạy | `[CẦN ĐIỀN]` |
| Kết quả thô | `[ĐƯỜNG DẪN ARTIFACT]` |
| Chỉ số tổng hợp | `[CẦN ĐIỀN]` |
| Phân tích lỗi | `[CẦN ĐIỀN]` |

## PHỤ LỤC D: NGUYÊN TẮC DEMO

1. Bắt đầu bằng dữ liệu seed có kịch bản và công bố rõ đây là dữ liệu giả lập.
2. Trình diễn cùng một giao dịch qua form và chat để làm rõ lợi ích nhập liệu.
3. Cố ý nhập câu thiếu số tiền để chứng minh clarification state.
4. Sửa category, lặp lại câu gần giống để chứng minh feedback loop.
5. Mở một insight và hiển thị đồng thời facts với lời diễn giải persona.
6. Tắt provider hoặc Redis có kiểm soát để chứng minh fallback, không sinh dữ liệu mock.
7. Không trình diễn auth, bank sync hoặc shared wallet như tính năng đã hoàn thành.

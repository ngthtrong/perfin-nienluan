# PERFIN — Bilingual Demo Presentation Script

*Kịch bản thuyết trình song ngữ Việt–Anh. English is the primary presentation language; Vietnamese is provided as a quick reference.*

## Contents

1. [System Overview](#1-system-overview)
2. [Feature Walkthrough](#2-feature-walkthrough)
3. [Main Chatbot Demo and Edge Cases](#3-main-chatbot-demo-and-edge-cases)
4. [Conclusion](#4-conclusion)

## 1. System Overview

*Giới thiệu tổng thể*

PERFIN is a personal finance management and analytics application. Users can record income and expenses using natural language, receipt or transfer images, and voice input. The system converts these inputs into structured financial data, then uses confirmed data for budgeting, cash-flow analysis, and financial planning.

*VI: PERFIN là ứng dụng quản lý và phân tích tài chính cá nhân. Người dùng có thể ghi thu chi bằng ngôn ngữ tự nhiên, ảnh hóa đơn/chuyển khoản hoặc giọng nói. Hệ thống chuẩn hóa đầu vào thành dữ liệu có cấu trúc, sau đó dùng dữ liệu đã xác nhận để quản lý ngân sách, phân tích dòng tiền và lập kế hoạch tài chính.*

### System structure

*Cấu trúc hệ thống*

1. **Input layer:** receives text, images, and audio.
   *VI: Lớp tiếp nhận: nhận văn bản, ảnh và audio.*
2. **Understanding and normalization layer:** a local parser, OCR, STT, or LLM extracts the description, amount, income/expense type, date, category, and wallet into a structured draft.
   *VI: Lớp hiểu và chuẩn hóa: parser cục bộ, OCR, STT hoặc LLM trích xuất các trường giao dịch thành draft có cấu trúc.*
3. **Business-control layer:** validates data and manages clarification, preview, editing, and confirmation.
   *VI: Lớp kiểm soát nghiệp vụ: validation dữ liệu và quản lý clarification, preview, chỉnh sửa, xác nhận.*
4. **Financial-ledger layer:** stores transactions, wallets, categories, budgets, goals, and recurring bills.
   *VI: Lớp sổ cái tài chính: lưu giao dịch, ví, danh mục, ngân sách, mục tiêu và khoản định kỳ.*
5. **Analytics and narration layer:** calculates deterministic facts; AI only turns these facts into readable explanations.
   *VI: Lớp phân tích và diễn giải: tính facts xác định; AI chỉ diễn giải facts thành lời giải thích dễ hiểu.*

Every data-changing request follows the same controlled path:

*VI: Mọi yêu cầu thay đổi dữ liệu đều đi theo cùng một luồng kiểm soát:*

```text
extract → normalize → validate → preview → user confirmation → commit
trích xuất → chuẩn hóa → validation → preview → người dùng xác nhận → commit
```

### Suggested opening

*Lời mở đầu đề xuất*

> PERFIN helps users record and understand their finances through natural input instead of relying only on traditional forms. However, AI never records money on its own. AI helps understand language and explain results; the backend enforces business rules, while the user keeps the final confirmation authority.
>
> *VI: PERFIN hỗ trợ người dùng ghi nhận và hiểu tình hình tài chính bằng đầu vào tự nhiên thay vì chỉ dùng biểu mẫu. Tuy nhiên AI không tự ghi tiền; AI hỗ trợ hiểu ngôn ngữ và diễn giải, backend kiểm tra quy tắc nghiệp vụ, còn người dùng giữ quyền xác nhận cuối cùng.*

> I will first introduce the main screens and their calculation logic. Then I will demonstrate the Chatbot workflows and important edge cases.
>
> *VI: Trước tiên em sẽ giới thiệu các màn hình chính và logic tính toán. Sau đó em sẽ demo các luồng Chatbot và các trường hợp biên quan trọng.*

### Bilingual glossary

*Thuật ngữ song ngữ*

| English | Tiếng Việt | Short meaning / Ý nghĩa ngắn |
|---|---|---|
| Draft | Bản nháp | Extracted data that has not been saved yet. / Dữ liệu đã trích xuất nhưng chưa được lưu. |
| Preview | Bản xem trước | A screen where the user reviews, edits, or cancels a draft. / Màn hình kiểm tra, sửa hoặc hủy draft. |
| Clarification | Làm rõ | A follow-up question for missing or ambiguous information. / Câu hỏi bổ sung khi thiếu hoặc mơ hồ dữ liệu. |
| Confirm / Commit | Xác nhận / Ghi sổ | User approval followed by a real database update. / Người dùng phê duyệt rồi hệ thống ghi dữ liệu thật. |
| Ledger | Sổ cái | Confirmed transactions, wallets, and balances. / Giao dịch, ví và số dư đã xác nhận. |
| Pending action | Thao tác chờ | A temporary action with an ID and expiry time. / Thao tác tạm có ID và thời hạn. |
| Facts | Dữ kiện tính toán | Deterministic numerical results. / Kết quả số do thuật toán xác định tạo ra. |
| Narration | Diễn giải | A human-readable explanation of facts. / Lời giải thích dễ hiểu dựa trên facts. |
| Cashflow runway | Đường băng dòng tiền | Estimated days that liquid cash can last. / Số ngày tiền thanh khoản còn có thể duy trì. |
| Recurring bill | Khoản chi định kỳ | A repeated weekly, monthly, or quarterly expense. / Khoản chi lặp theo tuần, tháng hoặc quý. |
| What-if scenario | Kịch bản giả định | A simulation that does not modify the original plan. / Mô phỏng không sửa dữ liệu gốc. |

## 2. Feature Walkthrough

*Các tính năng sẽ trình bày*

This section follows the application screens. For each feature, open the relevant interface, explain the data and the calculation logic, but do not run the detailed Chatbot scenarios yet.

*VI: Phần này đi theo các màn hình của ứng dụng. Với mỗi tính năng, mở giao diện, giải thích dữ liệu và công thức liên quan; chưa thực hiện các kịch bản Chatbot chi tiết.*

### 2.1. Financial Overview

*Tổng quan tài chính*

**Open:** the **Dashboard** tab.

*VI: Mở tab **Tổng quan**.*

**Present:** available balance, total income, total expenses, net change, and recent transactions. This screen aggregates all confirmed financial records.

*VI: Trình bày số dư khả dụng, tổng thu, tổng chi, chênh lệch và giao dịch gần đây. Đây là màn hình tổng hợp các dữ liệu đã xác nhận.*

**Explain briefly:** income increases a wallet balance; expenses decrease it. Only committed transactions affect the dashboard. A preview or a canceled transaction does not change any number. Internal wallet transfers are neither income nor expense, so they do not change net worth.

*VI: Thu làm tăng số dư ví, chi làm giảm số dư ví. Chỉ giao dịch đã commit mới tác động Dashboard. Preview hoặc giao dịch đã hủy không đổi số liệu. Chuyển nội bộ không phải thu/chi nên không đổi tài sản ròng.*

> The dashboard shows the financial state after confirmation. The Chatbot reduces data-entry effort, but its data appears here only after the user confirms it.
>
> *VI: Dashboard thể hiện trạng thái tài chính sau xác nhận. Chatbot giúp giảm thao tác nhập, nhưng dữ liệu chỉ xuất hiện ở đây sau khi người dùng xác nhận.*

### 2.2. Transactions, Wallets, and Categories

*Quản lý giao dịch, ví và danh mục*

**Open:** **More → Transactions**, **Categories**, and **Cash Flow & Assets**.

*VI: Mở **Khác → Giao dịch**, **Danh mục**, và **Dòng tiền & Tài sản**.*

**Present:** transaction viewing, editing, soft deletion, restoration, wallet management, and category management. Show that wallet balances stay synchronized with transactions.

*VI: Trình bày xem, sửa, xóa mềm, khôi phục giao dịch; quản lý ví và danh mục; đồng thời chỉ ra số dư ví thay đổi đồng bộ với giao dịch.*

**Logic:** a transaction contains at least an amount, type, date, description, category, and wallet. When it is edited, the system applies the difference between the old and new values to the wallet balance. Creating, editing, deleting, restoring, and updating the balance are performed in one database transaction; if any step fails, the entire operation rolls back.

*VI: Một giao dịch tối thiểu có số tiền, loại, ngày, mô tả, danh mục và ví. Khi sửa, hệ thống tính chênh lệch trạng thái cũ/mới để điều chỉnh số dư. Tạo, sửa, xóa, khôi phục và cập nhật số dư nằm trong cùng transaction; nếu một bước lỗi thì rollback toàn bộ.*

> This is the authoritative ledger layer. Chatbot, OCR, and voice are only alternative ways to create drafts for the same ledger.
>
> *VI: Đây là lớp sổ cái chuẩn. Chatbot, OCR và giọng nói chỉ là những cách khác nhau để tạo draft cho cùng lớp dữ liệu này.*

### 2.3. Budgets and Forecasting

*Ngân sách và dự báo*

**Open:** the **Budgets** tab.

*VI: Mở tab **Ngân sách**.*

**Present:** category limits, amount spent, remaining amount, utilization percentage, predicted overspending, and suggested budgets.

*VI: Trình bày hạn mức theo danh mục, số đã chi, số còn lại, tỷ lệ sử dụng, cảnh báo có thể vượt và đề xuất ngân sách.*

**Core formulas:**

*VI: Công thức chính:*

```text
remaining = max(limit − spent, 0)
utilization = spent / limit × 100%

còn lại = max(hạn mức − đã chi, 0)
tỷ lệ sử dụng = đã chi / hạn mức × 100%
```

The end-of-month forecast extrapolates the observed daily spending rate:

*VI: Dự báo cuối tháng ngoại suy tốc độ chi đã quan sát:*

```text
projected spending = (spent / elapsed days) × total days in month
chi dự báo = (đã chi / số ngày đã trôi qua) × tổng số ngày trong tháng
```

The historical baseline recommendation adds a 5% buffer:

*VI: Hạn mức nền theo lịch sử thêm buffer 5%:*

```text
baseline limit = average historical spending × 1.05
hạn mức nền = trung bình chi tiêu lịch sử × 1,05
```

The 50/30/20 strategy allocates income to needs, wants, and savings. If raw recommendations exceed the configured cap, the system scales them proportionally and reconciles the result after rounding. Suggestions always require confirmation.

*VI: Chiến lược 50/30/20 phân bổ thu nhập vào nhu cầu, mong muốn và tiết kiệm. Nếu tổng đề xuất vượt trần, hệ thống co tỷ trọng và đối soát sau làm tròn. Mọi đề xuất đều cần xác nhận trước khi áp dụng.*

> The budget screen does not only show past spending; it estimates the spending trajectory for the current period. It is a decision-support warning, not an automatic budget change.
>
> *VI: Budget không chỉ cho biết đã chi bao nhiêu mà còn ước tính xu hướng chi trong kỳ. Đây là cảnh báo hỗ trợ quyết định, không phải thay đổi ngân sách tự động.*

### 2.4. Evidence-based Reports and Analytics

*Báo cáo và phân tích có căn cứ*

**Open:** the **Reports** tab.

*VI: Mở tab **Báo cáo**.*

**Present:** total income and expenses, category breakdown, trends, anomalies, cashflow runway, recurring-spend signals, and category correlation when data is available.

*VI: Trình bày tổng thu–chi, breakdown theo danh mục, xu hướng, bất thường, runway, khoản chi lặp lại và tương quan danh mục nếu có dữ liệu.*

#### Cashflow runway

*Đường băng dòng tiền*

Runway includes only liquid VND balances from cash, bank, and e-wallet accounts:

*VI: Runway chỉ dùng số dư VND có tính thanh khoản của ví tiền mặt, ngân hàng và ví điện tử:*

```text
B = sum of liquid-wallet balances
average daily spend = total expenses in the last 14 days / 14
days left = floor(B / average daily spend)

B = tổng số dư các ví thanh khoản
chi trung bình ngày = tổng chi trong 14 ngày / 14
số ngày còn lại = floor(B / chi trung bình ngày)
```

If `B ≤ 0`, runway is zero. If daily spending is zero, the depletion date is undefined. This is an extrapolation based on recent spending, not a guaranteed forecast.

*VI: Nếu `B ≤ 0`, runway bằng 0. Nếu chi trung bình ngày bằng 0, ngày cạn tiền không xác định. Đây là ngoại suy từ nhịp chi gần đây, không phải dự báo chắc chắn.*

#### Trends, anomalies, and correlation

*Xu hướng, bất thường và tương quan*

- **Trend:** ordinary least squares (OLS) regression uses completed monthly periods to calculate a slope and `R²`. An upward trend is shown only when there is enough data, a positive slope, and sufficient fit.
  *VI: Xu hướng dùng hồi quy tuyến tính OLS trên các tháng hoàn tất để lấy slope và `R²`; chỉ báo tăng khi đủ dữ liệu, slope dương và độ phù hợp đủ cao.*
- **Anomaly:** z-score and IQR are applied over a 30-day window. A point is flagged when `z-score ≥ 2.5` or it exceeds `Q3 + 1.5 × IQR`. It is a review signal, not a fraud conclusion.
  *VI: Bất thường dùng z-score và IQR trên cửa sổ 30 ngày. Một điểm bị gắn cờ khi `z-score ≥ 2,5` hoặc vượt `Q3 + 1,5 × IQR`. Đây là tín hiệu cần rà soát, không phải kết luận gian lận.*
- **Correlation:** Pearson's coefficient compares category series over the same weekly window. Correlation does not prove causation.
  *VI: Tương quan dùng hệ số Pearson trên các chuỗi danh mục cùng cửa sổ tuần. Tương quan không chứng minh quan hệ nhân quả.*

> Reports follow a “facts first, narration second” principle. The Analytics Engine produces values, windows, and warnings; AI only explains those facts in natural language.
>
> *VI: Báo cáo theo nguyên tắc “facts trước, narration sau”. Analytics Engine tạo giá trị, kỳ tính và cảnh báo; AI chỉ diễn giải các facts đó bằng ngôn ngữ tự nhiên.*

### 2.5. Recurring Expenses

*Khoản chi định kỳ*

**Open:** **More → Recurring Expenses**, or the recurring section in Reports.

*VI: Mở **Khác → Khoản chi định kỳ** hoặc phần định kỳ trong Báo cáo.*

**Present:** fixed-expense schedules, bill list, payment history, paused status, and payment reminders.

*VI: Trình bày lịch chi cố định, danh sách khoản định kỳ, lịch sử thanh toán, trạng thái tạm dừng và reminder.*

**Logic:** a recurring candidate is detected from normalized descriptions, stable amounts, and regular date gaps. It needs at least three occurrences and a weekly, monthly, or quarterly cadence.

*VI: Một khoản lặp được nhận diện từ mô tả chuẩn hóa, số tiền ổn định và khoảng cách ngày đều. Cần ít nhất ba lần xuất hiện và cadence tuần, tháng hoặc quý.*

Monthly estimates are calculated as follows:

*VI: Ước tính theo tháng được tính như sau:*

```text
weekly    → average amount × 52 / 12
monthly   → average amount
quarterly → average amount / 3

hàng tuần  → số tiền trung bình × 52 / 12
hàng tháng → số tiền trung bình
hàng quý   → số tiền trung bình / 3
```

> A reminder is not a money-changing event. The user still confirms payment for the relevant billing period, and repeated confirmation does not create duplicates.
>
> *VI: Reminder không tự trừ tiền. Người dùng vẫn phải xác nhận payment cho đúng kỳ, và xác nhận lặp không tạo giao dịch trùng.*

### 2.6. Cash Flow, Transfers, and Net Worth

*Dòng tiền, chuyển ví và tài sản ròng*

**Open:** **More → Cash Flow & Assets**.

*VI: Mở **Khác → Dòng tiền & Tài sản**.*

**Present:** internal transfers between wallets and their effects on each wallet and on total net worth.

*VI: Trình bày chuyển tiền nội bộ giữa các ví và tác động lên từng ví cũng như tổng tài sản.*

```text
source-wallet balance -= A
destination-wallet balance += A
Δ net worth = -A + A = 0

số dư ví nguồn -= A
số dư ví đích  += A
Δ tài sản ròng = -A + A = 0
```

The source and destination wallets must be different, use the same currency, and belong to the user profile. A negative source balance is not automatically rejected because this records internal cash flow rather than performing credit scoring.

*VI: Ví nguồn và ví đích phải khác nhau, cùng tiền tệ và thuộc hồ sơ người dùng. Số dư nguồn âm không tự động bị từ chối vì đây là ghi nhận dòng tiền nội bộ, không phải cơ chế chấm điểm tín dụng.*

### 2.7. Financial Goals and What-if

*Mục tiêu tài chính và kịch bản giả định*

**Open:** **More → Financial Goals**.

*VI: Mở **Khác → Mục tiêu tài chính**.*

**Present:** saving, purchase, and debt-payoff goals; remaining amount, monthly contribution, projected completion date, and what-if scenarios.

*VI: Trình bày mục tiêu tiết kiệm, mua sắm, trả nợ; số còn thiếu, khoản góp tháng, ngày dự kiến hoàn thành và what-if.*

For saving or purchase goals:

*VI: Với mục tiêu tiết kiệm hoặc mua sắm:*

```text
remaining R = max(target − current amount, 0)
months needed = ceil(R / monthly contribution M)

còn thiếu R = max(mục tiêu − hiện có, 0)
số tháng cần = ceil(R / khoản góp tháng M)
```

- `M = 0` means that the user is not contributing yet, so completion time is undefined.
  *VI: `M = 0` nghĩa là người dùng chưa góp nên thời gian hoàn tất không xác định.*
- `M = null` means available surplus may be used; it differs from explicitly choosing zero.
  *VI: `M = null` nghĩa là có thể dùng surplus khả dụng; khác với việc chủ động chọn bằng 0.*
- A what-if scenario simulates a new contribution without modifying the original goal.
  *VI: What-if chỉ mô phỏng khoản góp mới, không sửa mục tiêu gốc.*

For debt payoff, with principal `L`, monthly interest rate `r`, and `n` months:

*VI: Với trả nợ, với dư nợ `L`, lãi suất tháng `r` và `n` tháng:*

```text
r = annual interest rate / (12 × 100)
P = L × r / (1 - (1 + r)^(-n))

r = lãi suất năm / (12 × 100)
P = L × r / (1 - (1 + r)^(-n))
```

When `r = 0`, the calculation becomes `P = L / n`. If the proposed payment is less than or equal to the first month's interest, the system warns that the debt will not decrease and does not invent a payoff date.

*VI: Khi `r = 0`, dùng `P = L / n`. Nếu khoản trả nhỏ hơn hoặc bằng lãi tháng đầu, hệ thống cảnh báo nợ không giảm và không bịa ngày tất toán.*

> Planning and saving a goal are separate steps. Changing an input invalidates the previous preview and requires a new calculation.
>
> *VI: Lập kế hoạch và lưu mục tiêu là hai bước tách biệt. Thay đổi đầu vào làm preview cũ mất hiệu lực và phải tính lại.*

### 2.8. Data Export

*Xuất dữ liệu*

**Open:** **More → Data Export**.

*VI: Mở **Khác → Xuất dữ liệu**.*

**Present:** select a period or filter and download a CSV file.

*VI: Trình bày chọn kỳ hoặc bộ lọc rồi tải file CSV.*

**Logic:** the export uses profile-scoped and filtered data. CSV cells are escaped to reduce unintended formula execution. Exporting does not analyze or modify the ledger.

*VI: File xuất dùng dữ liệu đã scope theo hồ sơ và bộ lọc. Ô CSV được escape để hạn chế công thức ngoài ý muốn. Xuất dữ liệu không phân tích hay thay đổi sổ cái.*

### 2.9. Transition to the Chatbot

*Chuyển sang Chatbot*

> I have now introduced the main screens, data, and calculation logic. Next, I will demonstrate the Chatbot, because it concentrates the natural-language, multimodal, and edge-case workflows.
>
> *VI: Em đã giới thiệu các màn hình, dữ liệu và công thức chính. Tiếp theo em sẽ demo Chatbot vì đây là nơi tập trung các luồng ngôn ngữ tự nhiên, đa phương thức và trường hợp biên.*

## 3. Main Chatbot Demo and Edge Cases

*Demo chính — Chatbot và các luồng đặc biệt*

The aim is to show that the Chatbot creates controlled drafts rather than recording transactions automatically. For every data-changing case, point out the preview, editing or cancellation option, and confirmation step.

*VI: Mục tiêu là chứng minh Chatbot tạo draft có kiểm soát chứ không tự ghi giao dịch. Với mọi ca thay đổi dữ liệu, cần chỉ rõ preview, sửa/hủy và xác nhận.*

### 3.1. Multiple Transactions in One Message

*Nhiều giao dịch trong một câu*

**Prompt:**

```text
ăn sáng 30k, grab 45k
```

1. The system separates the message into two transactions: Food 30,000 VND and Transport 45,000 VND.
   *VI: Hệ thống tách thành hai giao dịch: Ăn uống 30.000đ và Di chuyển 45.000đ.*
2. The preview shows the amount, type, description, date, category, and wallet.
   *VI: Preview hiển thị số tiền, loại, mô tả, ngày, danh mục và ví.*
3. Edit Grab from `45,000` to `50,000` VND, then select **Confirm all**.
   *VI: Sửa Grab từ `45.000` thành `50.000`, sau đó bấm **Xác nhận tất cả**.*
4. Only the edited payload is committed. Both transactions succeed together or roll back together on failure.
   *VI: Chỉ payload đã sửa được commit. Cả hai giao dịch cùng thành công hoặc cùng rollback nếu lỗi.*

### 3.2. Missing Context and Interrupting Questions

*Thiếu ngữ cảnh và câu hỏi chen ngang*

**Prompt sequence:**

```text
ăn phở
tôi có những ví nào?
tuần này tôi xài bao nhiêu?
```

- `ăn phở` has no amount, so the Chatbot asks for clarification instead of guessing.
  *VI: `ăn phở` thiếu số tiền nên Chatbot hỏi làm rõ thay vì tự đoán.*
- The wallet question is a read intent, so the old clarification is abandoned rather than consuming the new question as transaction data.
  *VI: Câu hỏi về ví là read intent nên clarification cũ bị bỏ, không dùng câu hỏi mới làm dữ liệu giao dịch.*
- The weekly spending question uses the correct weekly date range instead of expanding to the entire month.
  *VI: Câu hỏi chi tiêu theo tuần dùng đúng khoảng ngày của tuần, không bị mở rộng thành cả tháng.*
- No new transaction is created by these read-only questions.
  *VI: Không có giao dịch mới được tạo bởi các câu hỏi chỉ đọc.*

### 3.3. Relative Dates, Natural Amounts, and Mixed Income–Expense

*Ngày tương đối, số tiền tự nhiên và hỗn hợp thu–chi*

| Case / Trường hợp | Prompt | Expected outcome / Kết quả mong đợi |
|---|---|---|
| Relative past date<br>*Ngày quá khứ tương đối* | `Hôm qua tôi đổ xăng 200k` | A 200,000 VND expense preview dated yesterday.<br>*Preview chi 200.000đ ở ngày hôm qua.* |
| Earlier relative date<br>*Ngày xa hơn trong quá khứ* | `Hôm kia mua thuốc 85k` | A Health expense preview dated two days ago.<br>*Preview chi Sức khỏe ở ngày hai ngày trước.* |
| Future date<br>*Ngày tương lai* | `Ngày mai đóng học phí 2 triệu` | A draft may be shown, but confirmation is rejected because transaction dates cannot be in the future.<br>*Có thể tạo draft nhưng xác nhận bị từ chối vì ngày giao dịch không được ở tương lai.* |
| Short amount notation<br>*Số tiền viết tắt* | `Mua laptop 12tr5` | Normalize to 12,500,000 VND.<br>*Chuẩn hóa thành 12.500.000đ.* |
| Spoken amount<br>*Số tiền bằng lời* | `Mua bàn làm việc một triệu năm trăm nghìn` | Normalize to 1,500,000 VND.<br>*Chuẩn hóa thành 1.500.000đ.* |
| Mixed income and expenses<br>*Thu và chi hỗn hợp* | `Nhận thưởng 2 triệu, mua quà 500k, ăn tối 180k` | One income and two expenses are separated in preview.<br>*Preview tách một khoản thu và hai khoản chi.* |

### 3.4. Receipt Images, Transfer Images, and Voice Input

*Ảnh hóa đơn, ảnh chuyển khoản và giọng nói*

#### Receipt image

*Ảnh hóa đơn*

1. Upload a receipt image and inspect the OCR raw text.
   *VI: Gửi ảnh hóa đơn và quan sát raw text OCR.*
2. If both the total and line items are recognized, select **Record receipt total** or **Record line items**.
   *VI: Nếu nhận diện được tổng và các dòng hàng, chọn **Ghi tổng hóa đơn** hoặc **Ghi từng mặt hàng**.*
3. Review the preview, then confirm or cancel.
   *VI: Kiểm tra preview rồi xác nhận hoặc hủy.*

Only one recording mode is used, preventing double counting. OCR produces reviewable text; it never writes data directly.

*VI: Chỉ một cách ghi được dùng để tránh double counting. OCR chỉ tạo text để người dùng kiểm tra, không ghi dữ liệu trực tiếp.*

#### Transfer image

*Ảnh chuyển khoản*

Upload an image with this context:

*VI: Gửi ảnh kèm ngữ cảnh:*

```text
Đây là khoản tôi chuyển để trả tiền phòng tháng này.
```

The system combines OCR with the context to create an expense draft. The user still reviews the amount, date, and category before confirmation.

*VI: Hệ thống kết hợp OCR và ngữ cảnh để tạo draft khoản chi. Người dùng vẫn kiểm tra số tiền, ngày và danh mục trước khi xác nhận.*

#### Voice input

*Giọng nói*

Say:

*VI: Nói:*

```text
Hôm nay tôi đổ xăng hai trăm nghìn.
```

Speech-to-text returns a transcript. The user can correct the transcript before it is parsed into a transaction preview.

*VI: STT trả transcript. Người dùng có thể sửa transcript trước khi nó được parse thành preview giao dịch.*

### 3.5. Recurring Bills, Transfers, and Data Queries

*Khoản định kỳ, chuyển ví và câu hỏi dữ liệu*

| Case / Trường hợp | Prompt or action / Prompt hoặc thao tác | Expected outcome / Kết quả mong đợi |
|---|---|---|
| Create a recurring bill<br>*Tạo khoản định kỳ* | `Nhắc tiền phòng trọ 1,5 triệu mỗi tháng ngày 5` | Preview name, amount, frequency, and due day; save only after confirmation.<br>*Preview tên, số tiền, chu kỳ và ngày đến hạn; chỉ lưu sau xác nhận.* |
| Missing recurring fields<br>*Thiếu trường định kỳ* | `Nhắc tiền phòng trọ` | Ask for the missing amount and due date.<br>*Hỏi số tiền và ngày đến hạn còn thiếu.* |
| Confirm a reminder payment<br>*Xác nhận reminder* | From a reminder, enter `Đã thanh toán rồi` | Create a payment preview for the correct period; do not commit directly.<br>*Tạo preview payment đúng kỳ, không commit trực tiếp.* |
| Ambiguous recurring name<br>*Tên định kỳ mơ hồ* | `Đã thanh toán iCloud rồi` when similar bills exist | Ask the user to select a bill by number.<br>*Yêu cầu chọn khoản bằng số thứ tự.* |
| Wallet transfer<br>*Chuyển ví* | `Chuyển 2 triệu từ ví Tiền mặt sang ví Ngân hàng` | Preview the transfer; after confirmation, source decreases, destination increases, net worth is unchanged.<br>*Preview chuyển ví; sau xác nhận, nguồn giảm, đích tăng, tài sản ròng không đổi.* |
| Same-wallet transfer<br>*Chuyển cùng ví* | `Chuyển 500k từ ví Tiền mặt sang ví Tiền mặt` | Reject because the wallets must be different.<br>*Từ chối vì hai ví phải khác nhau.* |
| Missing category budget<br>*Không có ngân sách theo danh mục* | `Tôi có bao nhiêu ngân sách cho bida?` | State that no budget exists for billiards; do not list unrelated budgets.<br>*Báo chưa đặt ngân sách cho bida, không liệt kê nhầm toàn bộ ngân sách.* |

### 3.6. Safety Flows

*Các luồng an toàn cần biết*

| Case / Trường hợp | Action / Thao tác | Expected outcome / Kết quả mong đợi |
|---|---|---|
| Cancel a preview<br>*Hủy preview* | Enter `Cà phê 35k`, then select **Cancel**. | The pending item is removed and the balance stays unchanged.<br>*Pending bị xóa, số dư không đổi.* |
| Duplicate confirmation<br>*Xác nhận trùng* | Confirm the same preview twice. | Only the first confirmation commits; the second cannot create a duplicate record.<br>*Chỉ lần đầu commit; lần sau không tạo bản ghi trùng.* |
| Expired or invalid pending ID<br>*Pending hết hạn hoặc sai ID* | Confirm an old preview or use another ID. | Reject and require a new preview.<br>*Từ chối và yêu cầu tạo preview mới.* |
| OCR/STT failure<br>*OCR/STT thất bại* | Upload a blurred image or unrecognizable audio. | Show a real error; do not create fake text or a fake pending action.<br>*Báo lỗi thật, không tạo text hoặc pending giả.* |
| Insufficient analytics data<br>*Dữ liệu phân tích thiếu* | Request trend or anomaly analysis with too little history. | Return a warning, `no_signal`, or `degraded`; do not infer a result.<br>*Trả cảnh báo, `no_signal` hoặc `degraded`; không tự suy diễn.* |
| Zero goal contribution<br>*Góp mục tiêu bằng 0* | Create a goal with monthly contribution set to zero. | Do not invent a completion date.<br>*Không bịa ngày hoàn thành.* |
| Debt does not decrease<br>*Nợ không giảm* | Debt 10 million VND, 24% annual interest, 100,000 VND monthly payment. | Warn that the payment cannot cover first-month interest.<br>*Cảnh báo khoản trả không đủ bù lãi tháng đầu.* |
| AI-provider failure<br>*Provider lỗi* | The language provider is unavailable. | Use parser/template fallback when appropriate; never bypass validation or record data automatically.<br>*Dùng parser/template fallback nếu phù hợp; không bỏ qua validation hoặc tự ghi dữ liệu.* |

## 4. Conclusion

*Kết luận*

> PERFIN combines natural financial input with a controlled ledger and explainable financial algorithms. AI supports communication, while validation, formulas, data integrity, and commit authority remain with the backend and the user.
>
> *VI: PERFIN kết hợp nhập liệu tự nhiên với sổ cái có kiểm soát và các thuật toán tài chính giải thích được. AI hỗ trợ giao tiếp, còn validation, công thức, tính toàn vẹn dữ liệu và quyền commit thuộc về backend cùng quyết định cuối cùng của người dùng.*

Do not claim unmeasured results such as representative OCR/STT accuracy, production performance, live-worker validation, or comprehensive numeric grounding. When data is missing or a provider fails, demonstrate that the system stops safely and reports its limitation clearly.

*VI: Không nên tuyên bố các kết quả chưa được đo đầy đủ như độ chính xác OCR/STT đại diện, hiệu năng production, worker live hoặc numeric grounding toàn diện. Khi dữ liệu thiếu hoặc provider lỗi, cần chứng minh hệ thống dừng an toàn và nêu rõ giới hạn.*

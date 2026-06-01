---
tags:
  - nien-luan
---
  
 

## Metadata

- **Brief nguồn**: `Yêu cầu tính năng.md` — mục 2: Phân loại thông minh; tham chiếu `DRAFT-REQ-01.md`

- **Ngày tạo**: 25/05/2026

- **Lần cập nhật cuối**: 25/05/2026 — cập nhật theo phản hồi PO lần 3 cho REQ-02

- **Trạng thái**: DRAFT — chờ PO phê duyệt

  

## Tóm tắt

Tính năng Phân loại thông minh cho phép hệ thống tự động nhận diện loại giao dịch và xếp giao dịch vào danh mục phù hợp dựa trên tên giao dịch, nội dung chat, transcript giọng nói, nội dung hóa đơn/bill hoặc ngữ cảnh ảnh bối cảnh. Hệ thống hỗ trợ danh mục mặc định, danh mục tùy chỉnh và danh mục phụ 1 cấp. Người dùng có thể thêm, sửa, xóa danh mục theo nhu cầu riêng, ngoại trừ danh mục hệ thống bắt buộc `Khác`. Nếu AI không tìm được danh mục hợp lý trong danh sách hiện tại của người dùng, hệ thống lưu tạm giao dịch vào `Khác`, đồng thời gợi ý tạo danh mục mới trực tiếp trong chat để người dùng đồng ý hoặc chỉnh sửa tên trước khi thêm.

  

## Phân tích yêu cầu

  

### Actors

- **User**: Người dùng cuối tạo giao dịch, xem/chỉnh sửa phân loại, quản lý danh mục chính, quản lý danh mục phụ và xác nhận các gợi ý tạo danh mục mới.

- **AI Engine**: Thành phần phân tích tên giao dịch, nội dung chat, transcript giọng nói, hóa đơn/bill/ảnh bối cảnh và ngữ cảnh liên quan để suy đoán loại giao dịch, danh mục chính và danh mục phụ.

- **System**: Ứng dụng lưu danh mục, kiểm soát danh mục hệ thống bắt buộc, lưu giao dịch cùng phân loại, gợi ý tạo danh mục mới, hỏi lại khi cần, xóa dữ liệu theo quy tắc và ghi nhận phản hồi sửa sai.

- **Admin/Reviewer**: Người đánh giá thủ công các trường hợp AI phân loại sai để cải thiện chất lượng hệ thống.

  

### Features

- Tự động nhận diện loại giao dịch: chi phí, thu nhập hoặc giao dịch đặc biệt liên quan đến dòng tiền.

- Tự động gán danh mục phù hợp cho giao dịch dựa trên danh sách danh mục hiện tại của người dùng.

- Khởi tạo danh mục mặc định cho chi phí và thu nhập bằng **một nhãn duy nhất** cho mỗi danh mục.

- Cho phép người dùng thêm, sửa, xóa danh mục theo nhu cầu riêng, bao gồm cả danh mục mặc định, ngoại trừ danh mục hệ thống bắt buộc `Khác`.

- Cho phép người dùng thêm, sửa, xóa danh mục phụ 1 cấp dưới danh mục chính.

- Cho phép lưu giao dịch vào danh mục `Khác` cho cả chi phí và thu nhập khi chưa tìm được danh mục phù hợp.

- Nếu AI không tìm được danh mục hợp lý trong danh sách hiện tại, hệ thống gợi ý tạo danh mục mới trực tiếp trong chat.

- Khi gợi ý tạo danh mục mới, hệ thống ưu tiên gợi ý tạo **danh mục phụ** nếu giao dịch phù hợp với một danh mục chính đang tồn tại.

- Người dùng có thể chấp nhận nhanh danh mục được gợi ý hoặc chỉnh sửa tên danh mục được gợi ý trước khi thêm.

- Nhận diện các giao dịch đặc biệt liên quan đến dòng tiền gồm: quản lý món nợ, cho vay/vay mượn, tiết kiệm, ngân sách, đầu tư có lãi/lỗ và chuyển tiền đi đầu tư.

- Phân loại từng giao dịch chi tiết khi hóa đơn có nhiều mặt hàng.

- Phân loại trước các mặt hàng có thể phân loại được, sau đó hỏi lại hoặc gợi ý tạo danh mục mới cho các mặt hàng còn chưa rõ.

- Ghi nhận phản hồi sửa danh mục để đánh giá thủ công và cá nhân hóa phân loại về sau.

- Thông báo/xin phép người dùng trước khi sử dụng thói quen cá nhân để hỗ trợ phân loại.

  

### Constraints

- Danh mục phải thuộc về người dùng cụ thể; thay đổi danh mục của một người dùng không làm ảnh hưởng danh mục của người dùng khác.

- Mỗi danh mục chỉ có **một nhãn hiển thị duy nhất**. Không bắt buộc lưu song song nhãn tiếng Anh và tiếng Việt.

- Danh mục mặc định có thể được người dùng sửa hoặc xóa theo nhu cầu riêng, trừ danh mục hệ thống bắt buộc `Khác`.

- Danh mục `Khác` là danh mục hệ thống bắt buộc cho cả chi phí và thu nhập, không cho phép sửa tên hoặc xóa.

- Danh mục phụ chỉ hỗ trợ **1 cấp** dưới danh mục chính; không hỗ trợ danh mục phụ lồng nhiều cấp.

- Khi xóa danh mục chính, hệ thống xóa cứng toàn bộ danh mục phụ thuộc danh mục đó và xóa cứng tất cả giao dịch liên quan.

- Khi xóa danh mục phụ, hệ thống xóa cứng danh mục phụ và xóa cứng tất cả giao dịch liên quan đến danh mục phụ đó.

- Trước khi xóa danh mục có dữ liệu liên quan, hệ thống phải cảnh báo cho người dùng biết số lượng giao dịch sẽ bị xóa và yêu cầu xác nhận.

- Sau khi giao dịch bị xóa cứng, log phân loại liên quan phải được ẩn danh hóa.

- Danh mục cần gắn với loại giao dịch phù hợp, tối thiểu gồm nhóm `Expense` và `Income`.

- Ngữ cảnh chat thô chỉ được giữ trong 48 giờ theo REQ-01.

- Hệ thống không gửi toàn bộ lịch sử chat dài hạn cho LLM; chỉ sử dụng ngữ cảnh trong thời gian cho phép và các đặc điểm/thói quen đã được đánh dấu.

- Đầu vào cần hỗ trợ tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh theo REQ-01.

  

### Danh mục mặc định trong MVP

  

> Ghi chú BA: PO đã yêu cầu bỏ phần nhãn song ngữ bắt buộc. Vì vậy, hệ thống chỉ cần lưu một nhãn duy nhất cho mỗi danh mục. Bảng dưới đây dùng nhãn tiếng Việt làm nhãn mặc định ban đầu; tên tiếng Anh chỉ dùng để đối chiếu với danh sách PO đã cung cấp, không phải trường bắt buộc trong hệ thống.

  

#### Nhóm Chi phí — Expense

| Nhãn mặc định trong app | Tên gốc PO cung cấp |

|---|---|

| Ăn uống | Food & Drinks |

| Nhà cửa | Home |

| Mua sắm | Shopping |

| Di chuyển | Transportation |

| Giải trí | Entertainment |

| Tạp hóa | Grocery |

| Sức khỏe | Health |

| Giáo dục | Education |

| Điện tử | Electronics |

| Thể thao | Sports |

| Làm đẹp | Beauty |

| Khác | Other |

  

#### Nhóm Thu nhập — Income

| Nhãn mặc định trong app | Tên gốc PO cung cấp |

|---|---|

| Lương | Salary |

| Thưởng | Bonus |

| Đầu tư | Investment |

| Khác | Other |

  

### Danh sách giao dịch đặc biệt cần nhận diện trong REQ-02

- **Quản lý món nợ**.

- **Cho vay**.

- **Vay mượn**.

- **Tiết kiệm**.

- **Ngân sách**.

- **Đầu tư**, bao gồm trường hợp có lãi và lỗ.

- **Chuyển tiền đi đầu tư**.

  

REQ-02 chỉ chịu trách nhiệm nhận diện và phân loại ban đầu các giao dịch đặc biệt từ input người dùng. Các chi tiết quản lý dòng tiền, tài sản, ngân sách, lãi/lỗ và đối soát sẽ được mô tả chi tiết ở REQ liên quan, đặc biệt là REQ-06 theo phản hồi PO.

  

### Ambiguities

- ⚠️ AMBIGUOUS: Quy tắc tên hợp lệ của danh mục chưa được chốt, ví dụ độ dài tối đa, ký tự đặc biệt, emoji, trùng tên giữa Expense và Income.

- ⚠️ AMBIGUOUS: Danh sách đặc điểm/thói quen người dùng được phép dùng để cá nhân hóa phân loại chưa được PO chốt đầy đủ.

- ⚠️ AMBIGUOUS: Việc cập nhật lại báo cáo sau khi đổi/xóa danh mục thuộc phạm vi REQ-02 hay REQ-05 chưa được chốt.

- ⚠️ AMBIGUOUS: Các trường dữ liệu chi tiết cho từng giao dịch đặc biệt như nợ, vay, tiết kiệm, ngân sách, đầu tư chưa thuộc phạm vi chi tiết của REQ-02.

  

### Out of Scope sơ bộ

- Thiết kế báo cáo biểu đồ và insight tài chính.

- Thiết lập ngân sách và cảnh báo chi tiêu chi tiết.

- Đồng bộ giao dịch ngân hàng/ví điện tử tự động.

- Chia tiền nhóm hoặc split bill giữa nhiều người.

- Xây dựng mô hình AI phân loại riêng từ đầu.

- Quản lý chi tiết tài sản ròng, số dư ví, tài khoản đầu tư, nợ/vay hoặc đối soát dòng tiền chuyên sâu; REQ-02 chỉ nhận diện và gắn loại/danh mục ban đầu.

  

## Actors

- **User**: Người dùng cuối tạo giao dịch, quản lý danh mục, quản lý danh mục phụ và chỉnh sửa phân loại khi cần.

- **AI Engine**: Thành phần suy đoán loại giao dịch, danh mục chính và danh mục phụ từ dữ liệu giao dịch/ngữ cảnh liên quan.

- **System**: Ứng dụng lưu danh mục, kiểm soát việc phân loại, lưu `Khác`, gợi ý tạo danh mục mới, hỏi lại và ghi nhận phản hồi.

- **Admin/Reviewer**: Người đánh giá thủ công log phân loại sai để cải thiện chất lượng AI.

  

## Yêu cầu Chức năng

  

### FR-02-01: Khởi tạo danh mục mặc định

**Mô tả**: Khi người dùng sử dụng ứng dụng lần đầu, hệ thống tạo sẵn danh mục mặc định cho chi phí và thu nhập. Mỗi danh mục chỉ cần một nhãn hiển thị duy nhất; người dùng có thể chỉnh sửa nhãn theo nhu cầu, ngoại trừ `Khác`.

  

**Acceptance Criteria**:

- Given người dùng sử dụng ứng dụng lần đầu

  When hệ thống khởi tạo danh sách danh mục chi phí

  Then hệ thống tạo sẵn các danh mục chi phí mặc định gồm `Ăn uống`, `Nhà cửa`, `Mua sắm`, `Di chuyển`, `Giải trí`, `Tạp hóa`, `Sức khỏe`, `Giáo dục`, `Điện tử`, `Thể thao`, `Làm đẹp`, `Khác`.

  

- Given người dùng sử dụng ứng dụng lần đầu

  When hệ thống khởi tạo danh sách danh mục thu nhập

  Then hệ thống tạo sẵn các danh mục thu nhập mặc định gồm `Lương`, `Thưởng`, `Đầu tư`, `Khác`.

  

- Given hệ thống hiển thị danh mục cho người dùng

  When danh mục đã được khởi tạo hoặc chỉnh sửa

  Then hệ thống hiển thị một nhãn duy nhất của danh mục đó.

  

- Given người dùng muốn chỉnh sửa nhãn của danh mục mặc định không phải `Khác`

  When người dùng nhập nhãn mới hợp lệ và xác nhận

  Then hệ thống cập nhật nhãn danh mục đó trong danh sách danh mục của riêng người dùng.

  

### FR-02-02: Quản lý danh mục tùy chỉnh

**Mô tả**: Người dùng có thể tùy biến danh mục theo nhu cầu riêng bằng cách thêm, sửa hoặc xóa danh mục, bao gồm cả danh mục mặc định, ngoại trừ danh mục hệ thống `Khác`.

  

**Acceptance Criteria**:

- Given người dùng muốn thêm một danh mục mới

  When người dùng tạo danh mục với tên hợp lệ và chọn nhóm `Expense` hoặc `Income`

  Then hệ thống lưu danh mục mới vào danh sách danh mục của riêng người dùng đó.

  

- Given người dùng muốn sửa tên một danh mục hiện có không phải `Khác`

  When người dùng cập nhật tên danh mục hợp lệ

  Then hệ thống đổi tên danh mục trong danh sách danh mục của người dùng.

  

- Given người dùng sửa danh mục mặc định không phải `Khác`

  When thao tác được xác nhận thành công

  Then thay đổi chỉ áp dụng cho danh sách danh mục của người dùng đó, không làm thay đổi danh mục mặc định của người dùng khác.

  

- Given người dùng muốn tạo danh mục trùng tên với một danh mục đang tồn tại trong cùng nhóm giao dịch

  When người dùng xác nhận tạo danh mục

  Then hệ thống không tạo danh mục trùng và yêu cầu người dùng chọn tên khác hoặc dùng danh mục đã có.

  

- Given người dùng muốn xóa một danh mục không phải `Khác`

  When người dùng gửi yêu cầu xóa danh mục

  Then hệ thống chuyển sang luồng cảnh báo và xác nhận xóa danh mục trước khi xóa cứng dữ liệu.

  

⚠️ AMBIGUOUS: Quy tắc tên hợp lệ của danh mục chưa được chốt, ví dụ độ dài tối đa, ký tự đặc biệt, emoji, trùng tên giữa Expense và Income.

  

### FR-02-03: Quản lý danh mục phụ 1 cấp

**Mô tả**: Hệ thống cho phép người dùng thêm, sửa, xóa danh mục phụ dưới một danh mục chính. Danh mục phụ chỉ hỗ trợ 1 cấp, không hỗ trợ danh mục phụ lồng nhiều cấp.

  

**Acceptance Criteria**:

- Given người dùng muốn thêm danh mục phụ

  When người dùng chọn một danh mục chính và nhập tên danh mục phụ hợp lệ

  Then hệ thống tạo danh mục phụ dưới danh mục chính đã chọn.

  

- Given người dùng muốn tạo danh mục phụ bên dưới một danh mục phụ khác

  When người dùng gửi yêu cầu tạo danh mục phụ lồng cấp

  Then hệ thống từ chối thao tác và thông báo rằng MVP chỉ hỗ trợ danh mục phụ 1 cấp dưới danh mục chính.

  

- Given người dùng muốn sửa tên danh mục phụ

  When người dùng cập nhật tên danh mục phụ hợp lệ

  Then hệ thống đổi tên danh mục phụ trong danh sách danh mục của người dùng.

  

- Given người dùng muốn xóa một danh mục phụ

  When người dùng gửi yêu cầu xóa danh mục phụ

  Then hệ thống chuyển sang luồng cảnh báo và xác nhận xóa danh mục trước khi xóa cứng danh mục phụ và dữ liệu liên quan.

  

- Given giao dịch được gán vào danh mục phụ

  When hệ thống lưu giao dịch

  Then giao dịch phải lưu được cả danh mục chính và danh mục phụ tương ứng.

  

- Given AI Engine phân loại giao dịch `matcha latte 55k`

  When danh mục chính `Ăn uống` và danh mục phụ `Cà phê` đang tồn tại trong danh sách danh mục của người dùng

  Then hệ thống có thể gán giao dịch vào danh mục chính `Ăn uống` và danh mục phụ `Cà phê` nếu phù hợp với ngữ cảnh.

  

### FR-02-04: Bảo vệ danh mục hệ thống Khác

**Mô tả**: `Khác` là danh mục hệ thống bắt buộc cho cả chi phí và thu nhập. Người dùng không được phép sửa tên hoặc xóa danh mục này.

  

**Acceptance Criteria**:

- Given danh sách danh mục chi phí của người dùng

  When hệ thống kiểm tra danh mục hệ thống

  Then danh mục `Khác` thuộc nhóm chi phí phải luôn tồn tại.

  

- Given danh sách danh mục thu nhập của người dùng

  When hệ thống kiểm tra danh mục hệ thống

  Then danh mục `Khác` thuộc nhóm thu nhập phải luôn tồn tại.

  

- Given người dùng cố gắng sửa tên danh mục `Khác`

  When người dùng gửi yêu cầu sửa

  Then hệ thống từ chối thao tác và thông báo rằng đây là danh mục hệ thống bắt buộc.

  

- Given người dùng cố gắng xóa danh mục `Khác`

  When người dùng gửi yêu cầu xóa

  Then hệ thống từ chối thao tác và thông báo rằng đây là danh mục hệ thống bắt buộc.

  

### FR-02-05: Xóa cứng danh mục chính và dữ liệu liên quan

**Mô tả**: Khi người dùng xóa một danh mục chính không phải `Khác`, hệ thống phải cảnh báo số lượng giao dịch liên quan, yêu cầu xác nhận, sau đó xóa cứng danh mục chính, toàn bộ danh mục phụ thuộc danh mục đó và tất cả giao dịch liên quan.

  

**Acceptance Criteria**:

- Given người dùng yêu cầu xóa một danh mục chính không phải `Khác`

  When danh mục đó có giao dịch liên quan hoặc có danh mục phụ

  Then hệ thống hiển thị cảnh báo gồm số lượng giao dịch liên quan và thông tin rằng các danh mục phụ liên quan cũng sẽ bị xóa.

  

- Given hệ thống đã hiển thị cảnh báo xóa danh mục chính

  When người dùng hủy thao tác

  Then hệ thống không xóa danh mục chính, không xóa danh mục phụ và không xóa giao dịch liên quan.

  

- Given hệ thống đã hiển thị cảnh báo xóa danh mục chính

  When người dùng xác nhận xóa

  Then hệ thống xóa cứng danh mục chính, toàn bộ danh mục phụ thuộc danh mục đó và tất cả giao dịch liên quan.

  

- Given danh mục chính đã bị xóa cứng

  When AI Engine phân loại giao dịch mới

  Then hệ thống không được gán giao dịch mới vào danh mục chính hoặc danh mục phụ đã bị xóa.

  

- Given giao dịch bị xóa cứng do xóa danh mục chính

  When hệ thống xử lý log phân loại liên quan

  Then hệ thống ẩn danh hóa log phân loại liên quan đến giao dịch đã bị xóa cứng.

  

### FR-02-06: Xóa cứng danh mục phụ và dữ liệu liên quan

**Mô tả**: Khi người dùng xóa một danh mục phụ, hệ thống phải cảnh báo số lượng giao dịch liên quan, yêu cầu xác nhận, sau đó xóa cứng danh mục phụ và tất cả giao dịch liên quan đến danh mục phụ đó.

  

**Acceptance Criteria**:

- Given người dùng yêu cầu xóa một danh mục phụ

  When danh mục phụ đó có giao dịch liên quan

  Then hệ thống hiển thị cảnh báo gồm số lượng giao dịch sẽ bị xóa theo danh mục phụ đó.

  

- Given hệ thống đã hiển thị cảnh báo xóa danh mục phụ

  When người dùng hủy thao tác

  Then hệ thống không xóa danh mục phụ và không xóa giao dịch liên quan.

  

- Given hệ thống đã hiển thị cảnh báo xóa danh mục phụ

  When người dùng xác nhận xóa

  Then hệ thống xóa cứng danh mục phụ và tất cả giao dịch liên quan đến danh mục phụ đó.

  

- Given danh mục phụ đã bị xóa cứng

  When AI Engine phân loại giao dịch mới

  Then hệ thống không được gán giao dịch mới vào danh mục phụ đã bị xóa.

  

- Given giao dịch bị xóa cứng do xóa danh mục phụ

  When hệ thống xử lý log phân loại liên quan

  Then hệ thống ẩn danh hóa log phân loại liên quan đến giao dịch đã bị xóa cứng.

  

### FR-02-07: Tự động nhận diện loại giao dịch

**Mô tả**: Trước khi gán danh mục, hệ thống cần nhận diện giao dịch thuộc nhóm chi phí, thu nhập hoặc giao dịch đặc biệt liên quan đến dòng tiền.

  

**Acceptance Criteria**:

- Given người dùng nhập `trà sữa 50k`

  When AI Engine xử lý đầu vào

  Then hệ thống nhận diện đây là giao dịch `Expense`.

  

- Given người dùng nhập `lương tháng này 8 triệu`

  When AI Engine xử lý đầu vào

  Then hệ thống nhận diện đây là giao dịch `Income`.

  

- Given người dùng nhập `chuyển 1 triệu từ ví tiền mặt sang Momo`

  When AI Engine xử lý đầu vào

  Then hệ thống nhận diện đây là giao dịch đặc biệt liên quan đến dòng tiền, không tự xem là chi phí tiêu dùng thông thường.

  

- Given người dùng nhập `chuyển 10 triệu vào tài khoản MBS để đầu tư`

  When AI Engine xử lý đầu vào

  Then hệ thống nhận diện đây là giao dịch đặc biệt liên quan đến đầu tư/chuyển tiền đi đầu tư, không tự xem là chi phí sinh hoạt thông thường.

  

- Given người dùng nhập nội dung thể hiện lãi hoặc lỗ đầu tư, ví dụ `lãi đầu tư hôm nay 500k` hoặc `lỗ chứng khoán 300k`

  When AI Engine xử lý đầu vào

  Then hệ thống nhận diện đây là giao dịch đặc biệt liên quan đến đầu tư có lãi/lỗ.

  

- Given AI Engine không xác định được loại giao dịch là `Expense`, `Income` hay giao dịch đặc biệt

  When hệ thống xử lý kết quả phân loại

  Then hệ thống hỏi lại người dùng để làm rõ loại giao dịch trước khi lưu.

  

### FR-02-08: Nhận diện giao dịch đặc biệt liên quan đến dòng tiền

**Mô tả**: REQ-02 cần nhận diện các giao dịch đặc biệt ngay từ input của người dùng để tránh phân loại sai thành chi phí/thu nhập thông thường. Phần quản lý chi tiết sẽ được mô tả ở REQ liên quan, đặc biệt là REQ-06.

  

**Acceptance Criteria**:

- Given người dùng nhập nội dung thể hiện quản lý món nợ

  When AI Engine xử lý đầu vào

  Then hệ thống đánh dấu giao dịch là nhóm đặc biệt `Quản lý món nợ`.

  

- Given người dùng nhập nội dung thể hiện cho vay, ví dụ `cho An vay 500k`

  When AI Engine xử lý đầu vào

  Then hệ thống đánh dấu giao dịch là nhóm đặc biệt `Cho vay`.

  

- Given người dùng nhập nội dung thể hiện vay mượn, ví dụ `mượn Bình 1 triệu`

  When AI Engine xử lý đầu vào

  Then hệ thống đánh dấu giao dịch là nhóm đặc biệt `Vay mượn`.

  

- Given người dùng nhập nội dung thể hiện tiết kiệm, ví dụ `gửi tiết kiệm 2 triệu`

  When AI Engine xử lý đầu vào

  Then hệ thống đánh dấu giao dịch là nhóm đặc biệt `Tiết kiệm`.

  

- Given người dùng nhập nội dung liên quan đến ngân sách, ví dụ `đặt ngân sách ăn uống tháng này 2 triệu`

  When AI Engine xử lý đầu vào

  Then hệ thống đánh dấu đây là input liên quan đến `Ngân sách` thay vì tạo chi phí thông thường.

  

- Given người dùng nhập nội dung đầu tư có lãi hoặc lỗ

  When AI Engine xử lý đầu vào

  Then hệ thống đánh dấu giao dịch là nhóm đặc biệt `Đầu tư` kèm trạng thái lãi/lỗ nếu xác định được từ input.

  

- Given người dùng nhập nội dung chuyển tiền đi đầu tư, ví dụ `chuyển 10 triệu vào tài khoản MBS để đầu tư`

  When AI Engine xử lý đầu vào

  Then hệ thống đánh dấu đây là giao dịch đặc biệt `Chuyển tiền đi đầu tư`.

  

⚠️ AMBIGUOUS: REQ-02 chỉ nhận diện nhóm đặc biệt; các trường dữ liệu chi tiết của từng nhóm đặc biệt chưa được chốt trong spec này.

  

### FR-02-09: Tự động gán danh mục cho giao dịch chi phí

**Mô tả**: Khi giao dịch được nhận diện là chi phí, hệ thống tự động gán vào danh mục chi phí phù hợp từ danh sách danh mục hiện có của người dùng.

  

**Acceptance Criteria**:

- Given AI Engine đã bóc tách được tên giao dịch và giá tiền từ đầu vào của người dùng

  When hệ thống nhận diện giao dịch là `Expense` và tìm được danh mục phù hợp trong danh sách danh mục hiện tại của người dùng

  Then hệ thống gán danh mục chi phí phù hợp trước khi lưu giao dịch.

  

- Given người dùng nhập `trà sữa 50k`

  When danh mục `Ăn uống` đang tồn tại trong danh sách danh mục của người dùng

  Then hệ thống gán giao dịch vào danh mục `Ăn uống`.

  

- Given người dùng nhập `đổ xăng 80k`

  When danh mục `Di chuyển` đang tồn tại trong danh sách danh mục của người dùng

  Then hệ thống gán giao dịch vào danh mục `Di chuyển`.

  

- Given người dùng nhập `mua sách tiếng Anh 120k`

  When danh mục `Giáo dục` đang tồn tại trong danh sách danh mục của người dùng

  Then hệ thống gán giao dịch vào danh mục `Giáo dục`.

  

- Given AI Engine xác định đây là chi phí nhưng không tìm được danh mục hợp lý trong danh sách danh mục hiện tại của người dùng

  When giao dịch có đủ tên giao dịch và giá tiền

  Then hệ thống lưu giao dịch vào `Khác` thuộc nhóm chi phí và thực thi luồng gợi ý tạo danh mục mới trong chat.

  

### FR-02-10: Tự động gán danh mục cho giao dịch thu nhập

**Mô tả**: Khi giao dịch được nhận diện là thu nhập, hệ thống tự động gán vào danh mục thu nhập phù hợp từ danh sách danh mục hiện có của người dùng.

  

**Acceptance Criteria**:

- Given AI Engine đã bóc tách được tên giao dịch và số tiền từ đầu vào của người dùng

  When hệ thống nhận diện giao dịch là `Income` và tìm được danh mục phù hợp trong danh sách danh mục hiện tại của người dùng

  Then hệ thống gán danh mục thu nhập phù hợp trước khi lưu giao dịch.

  

- Given người dùng nhập `lương tháng 5 8 triệu`

  When danh mục `Lương` đang tồn tại trong danh sách danh mục của người dùng

  Then hệ thống gán giao dịch vào danh mục `Lương`.

  

- Given người dùng nhập `thưởng dự án 1 triệu`

  When danh mục `Thưởng` đang tồn tại trong danh sách danh mục của người dùng

  Then hệ thống gán giao dịch vào danh mục `Thưởng`.

  

- Given người dùng nhập `lãi đầu tư 500k`

  When danh mục `Đầu tư` đang tồn tại trong danh sách danh mục của người dùng

  Then hệ thống gán hoặc đánh dấu giao dịch theo nhóm `Đầu tư`, tùy theo luồng chi tiết của giao dịch đầu tư.

  

- Given AI Engine xác định đây là thu nhập nhưng không tìm được danh mục hợp lý trong danh sách danh mục hiện tại của người dùng

  When giao dịch có đủ tên giao dịch và giá tiền

  Then hệ thống lưu giao dịch vào `Khác` thuộc nhóm thu nhập và thực thi luồng gợi ý tạo danh mục mới trong chat.

  

⚠️ AMBIGUOUS: Với `Đầu tư`, REQ-02 nhận diện và phân loại ban đầu; chi tiết dòng tiền đầu tư, lãi/lỗ và tài sản sẽ được mô tả ở REQ-06.

  

### FR-02-11: Luồng lưu Khác và gợi ý tạo danh mục mới

**Mô tả**: Khi hệ thống xác định được giao dịch là chi phí hoặc thu nhập nhưng không tìm được danh mục hợp lý trong danh sách hiện tại của người dùng, hệ thống lưu tạm vào `Khác`, đồng thời gợi ý tạo danh mục mới trực tiếp trong chat. Nếu có thể gợi ý cả danh mục chính và danh mục phụ, hệ thống ưu tiên gợi ý danh mục phụ.

  

**Acceptance Criteria**:

- Given giao dịch có đủ tên giao dịch và giá tiền

  When hệ thống xác định được giao dịch là `Expense` nhưng không tìm được danh mục chi phí hợp lý

  Then hệ thống lưu giao dịch vào `Khác` thuộc nhóm chi phí.

  

- Given giao dịch có đủ tên giao dịch và giá tiền

  When hệ thống xác định được giao dịch là `Income` nhưng không tìm được danh mục thu nhập hợp lý

  Then hệ thống lưu giao dịch vào `Khác` thuộc nhóm thu nhập.

  

- Given hệ thống vừa lưu giao dịch vào `Khác`

  When hệ thống phản hồi cho người dùng trong chat

  Then hệ thống thông báo giao dịch đã được lưu tạm vào `Khác` và hiển thị gợi ý tạo danh mục mới phù hợp với giao dịch.

  

- Given hệ thống gợi ý tạo danh mục mới trong chat và có danh mục chính phù hợp đang tồn tại

  When hệ thống xác định giao dịch phù hợp hơn với một nhóm nhỏ bên trong danh mục chính đó

  Then hệ thống ưu tiên gợi ý tạo danh mục phụ dưới danh mục chính đang tồn tại.

  

- Given hệ thống gợi ý tạo danh mục mới trong chat và không có danh mục chính phù hợp đang tồn tại

  When hệ thống cần gợi ý danh mục mới

  Then hệ thống gợi ý tạo danh mục chính mới.

  

- Given hệ thống gợi ý tạo danh mục mới trong chat

  When người dùng nhấn đồng ý

  Then hệ thống tạo danh mục mới theo tên được gợi ý và cập nhật giao dịch từ `Khác` sang danh mục mới.

  

- Given hệ thống gợi ý tạo danh mục mới trong chat

  When người dùng chỉnh sửa lại tên danh mục được gợi ý và xác nhận

  Then hệ thống tạo danh mục mới theo tên đã chỉnh sửa và cập nhật giao dịch từ `Khác` sang danh mục mới.

  

- Given người dùng không phản hồi gợi ý tạo danh mục mới

  When ngữ cảnh hỏi lại vẫn còn hiệu lực hoặc đã hết hiệu lực

  Then giao dịch vẫn giữ danh mục `Khác` cho đến khi người dùng chỉnh sửa sau.

  

- Given hệ thống không xác định được giao dịch là `Expense` hay `Income`

  When giao dịch chưa đủ rõ về loại giao dịch

  Then hệ thống không lưu vào `Khác` và hỏi lại người dùng để làm rõ loại giao dịch trước.

  

### FR-02-12: Phân loại từ nhiều loại đầu vào

**Mô tả**: Hệ thống cần phân loại giao dịch từ các nguồn đầu vào đã được REQ-01 hỗ trợ, gồm văn bản, giọng nói sau khi chuyển thành transcript, hóa đơn, bill chuyển khoản và ảnh bối cảnh.

  

**Acceptance Criteria**:

- Given người dùng tạo giao dịch bằng văn bản tự nhiên

  When AI Engine bóc tách được tên giao dịch và giá tiền

  Then hệ thống sử dụng nội dung văn bản để suy đoán loại giao dịch và danh mục.

  

- Given người dùng tạo giao dịch bằng giọng nói

  When hệ thống đã chuyển giọng nói thành transcript thành công

  Then hệ thống sử dụng transcript để suy đoán loại giao dịch và danh mục.

  

- Given người dùng tạo giao dịch từ ảnh hóa đơn hoặc bill chuyển khoản

  When AI Engine trích xuất được nội dung giao dịch từ ảnh

  Then hệ thống sử dụng nội dung trích xuất để suy đoán loại giao dịch và danh mục.

  

- Given người dùng tạo giao dịch từ ảnh bối cảnh kèm mô tả ngắn, ví dụ ảnh rửa xe kèm `30k`

  When AI Engine nhận diện được bối cảnh ảnh và số tiền

  Then hệ thống sử dụng bối cảnh ảnh và mô tả kèm theo để suy đoán loại giao dịch và danh mục.

  

### FR-02-13: Phân loại từng giao dịch chi tiết từ hóa đơn nhiều mặt hàng

**Mô tả**: Khi REQ-01 bóc tách hóa đơn nhiều mặt hàng thành nhiều giao dịch chi tiết, REQ-02 phải gán danh mục riêng cho từng giao dịch chi tiết thay vì gán một danh mục chung cho toàn bộ hóa đơn.

  

**Acceptance Criteria**:

- Given người dùng tải lên hóa đơn có nhiều mặt hàng thuộc nhiều nhóm khác nhau

  When hệ thống bóc tách hóa đơn thành nhiều giao dịch chi tiết

  Then mỗi giao dịch chi tiết phải được gán danh mục riêng dựa trên tên mặt hàng tương ứng.

  

- Given hóa đơn có mặt hàng `rau củ` và `dầu gội`

  When hệ thống tạo các giao dịch chi tiết từ hóa đơn

  Then hệ thống có thể gán `rau củ` vào `Tạp hóa` và `dầu gội` vào `Làm đẹp` hoặc danh mục phù hợp đang tồn tại trong danh sách danh mục của người dùng.

  

- Given một hóa đơn có nhiều mặt hàng và chỉ một số mặt hàng phân loại được rõ

  When hệ thống xử lý hóa đơn

  Then hệ thống phân loại trước các mặt hàng có thể phân loại được, lưu các mặt hàng chưa rõ vào `Khác` theo loại giao dịch phù hợp, sau đó hỏi lại hoặc gợi ý tạo danh mục mới cho các mặt hàng chưa rõ.

  

- Given người dùng gửi hóa đơn nhiều món kèm ngữ cảnh chỉ muốn lưu một món cụ thể, ví dụ `matcha latte`

  When hệ thống chỉ tạo giao dịch cho món được người dùng nhắc đến

  Then hệ thống chỉ phân loại giao dịch của món đó, không phân loại các món không được lưu.

  

- Given một mặt hàng trên hóa đơn không xác định được là chi phí, thu nhập hay giao dịch đặc biệt

  When hệ thống không đủ thông tin để xác định loại giao dịch

  Then hệ thống hỏi lại người dùng trước khi lưu mặt hàng đó.

  

### FR-02-14: Chỉnh sửa phân loại bằng ngôn ngữ tự nhiên

**Mô tả**: Người dùng có thể chỉnh sửa danh mục chính hoặc danh mục phụ của giao dịch đã lưu bằng câu lệnh hội thoại tự nhiên.

  

**Acceptance Criteria**:

- Given người dùng đã có giao dịch `trà sữa 50.000đ` đang được gán danh mục `Ăn uống`

  When người dùng nhập `đổi trà sữa hôm nay sang Giải trí`

  Then hệ thống cập nhật danh mục của giao dịch tương ứng theo yêu cầu người dùng và phản hồi xác nhận.

  

- Given người dùng đã có giao dịch được gán danh mục chính

  When người dùng yêu cầu chuyển giao dịch sang một danh mục phụ đang tồn tại

  Then hệ thống cập nhật giao dịch với danh mục chính và danh mục phụ tương ứng.

  

- Given câu lệnh đổi danh mục có thể khớp với nhiều giao dịch

  When hệ thống không xác định được duy nhất giao dịch cần cập nhật

  Then hệ thống hỏi lại người dùng để chọn đúng giao dịch trước khi cập nhật danh mục.

  

- Given người dùng yêu cầu đổi sang một danh mục không tồn tại trong danh sách danh mục hiện có

  When hệ thống xử lý yêu cầu

  Then hệ thống hỏi người dùng muốn chọn danh mục hiện có hay tạo danh mục mới.

  

- Given người dùng xác nhận tạo danh mục mới từ câu lệnh đổi danh mục

  When tên danh mục mới hợp lệ và người dùng chọn nhóm giao dịch phù hợp

  Then hệ thống tạo danh mục mới và cập nhật giao dịch sang danh mục đó.

  

### FR-02-15: Ghi nhận phản hồi phân loại sai và ẩn danh hóa log

**Mô tả**: Khi người dùng sửa danh mục do AI phân loại sai, hệ thống cần lưu log để phục vụ đánh giá thủ công và cải thiện chất lượng phân loại. Khi giao dịch liên quan bị xóa cứng, log phân loại phải được ẩn danh hóa.

  

**Acceptance Criteria**:

- Given hệ thống đã tự động gán danh mục cho một giao dịch

  When người dùng chỉnh sửa danh mục đó

  Then hệ thống lưu log gồm danh mục AI gán ban đầu, danh mục người dùng sửa cuối cùng, giao dịch liên quan và thời điểm chỉnh sửa.

  

- Given Admin/Reviewer cần đánh giá lỗi phân loại

  When Admin/Reviewer xem log phản hồi phân loại

  Then hệ thống cung cấp dữ liệu đủ để so sánh danh mục AI gán ban đầu với danh mục sau khi người dùng chỉnh sửa.

  

- Given log phản hồi phân loại được ghi nhận

  When hệ thống lưu log

  Then log không được làm thay đổi dữ liệu giao dịch cuối cùng mà người dùng đã chỉnh sửa.

  

- Given một giao dịch bị xóa cứng theo chính sách dữ liệu

  When hệ thống xử lý log phản hồi liên quan đến giao dịch đó

  Then hệ thống ẩn danh hóa log phân loại liên quan để không còn gắn trực tiếp với giao dịch hoặc người dùng cụ thể.

  

- Given log đã được ẩn danh hóa sau khi giao dịch bị xóa cứng

  When Admin/Reviewer xem dữ liệu đánh giá AI

  Then hệ thống chỉ hiển thị dữ liệu đã ẩn danh hóa phục vụ thống kê/chất lượng, không hiển thị định danh giao dịch gốc hoặc định danh người dùng.

  

⚠️ AMBIGUOUS: Tiêu chí ẩn danh hóa cụ thể, ví dụ giữ lại trường nào và loại bỏ trường nào, cần được Tech Lead/PO chốt khi thiết kế dữ liệu.

  

### FR-02-16: Cá nhân hóa phân loại dựa trên thói quen người dùng

**Mô tả**: Hệ thống có thể sử dụng các đặc điểm/thói quen đã được đánh dấu từ lịch sử sử dụng để hỗ trợ phân loại chính xác hơn mà không cần gửi toàn bộ lịch sử chat dài hạn cho LLM. Hệ thống cần thông báo hoặc xin phép người dùng trước khi dùng thói quen cá nhân cho mục đích phân loại.

  

**Acceptance Criteria**:

- Given hệ thống muốn sử dụng thói quen cá nhân của người dùng để hỗ trợ phân loại

  When người dùng chưa từng được thông báo hoặc chưa cấp phép

  Then hệ thống hiển thị thông báo/xin phép trước khi áp dụng cá nhân hóa phân loại.

  

- Given người dùng đã đồng ý cho hệ thống sử dụng thói quen cá nhân để phân loại

  When hệ thống đã ghi nhận đặc điểm sử dụng lặp lại của người dùng, ví dụ từ hay dùng hoặc giao dịch hay chi

  Then hệ thống được sử dụng đặc điểm đã được đánh dấu để hỗ trợ suy đoán danh mục.

  

- Given người dùng nhiều lần sửa cùng một kiểu giao dịch sang cùng một danh mục

  When hệ thống gặp lại kiểu giao dịch tương tự

  Then hệ thống ưu tiên danh mục phù hợp với thói quen đã được ghi nhận của người dùng, nếu không mâu thuẫn với ngữ cảnh hiện tại.

  

- Given dữ liệu ngữ cảnh chat thô đã quá 48 giờ

  When hệ thống cần cá nhân hóa phân loại

  Then hệ thống không gửi toàn bộ nội dung chat cũ cho LLM mà chỉ sử dụng các đặc điểm/thói quen đã được đánh dấu.

  

- Given người dùng từ chối cho hệ thống dùng thói quen cá nhân để phân loại

  When hệ thống phân loại giao dịch mới

  Then hệ thống chỉ sử dụng ngữ cảnh hiện tại, dữ liệu giao dịch hiện tại và danh sách danh mục của người dùng.

  

⚠️ AMBIGUOUS: Danh sách đặc điểm/thói quen được phép dùng để cá nhân hóa phân loại chưa được PO chốt đầy đủ.

  

### FR-02-17: Đảm bảo dữ liệu phân loại phục vụ báo cáo về sau

**Mô tả**: Danh mục là dữ liệu đầu vào quan trọng cho báo cáo và phân tích tài chính. Hệ thống cần đảm bảo mỗi giao dịch được lưu có loại giao dịch và danh mục cuối cùng phù hợp, kể cả trường hợp tạm thời là `Khác`.

  

**Acceptance Criteria**:

- Given giao dịch được lưu thành công

  When hệ thống kiểm tra dữ liệu giao dịch

  Then giao dịch phải có loại giao dịch và danh mục cuối cùng, bao gồm cả trường hợp danh mục là `Khác`.

  

- Given giao dịch được gán vào danh mục phụ

  When hệ thống kiểm tra dữ liệu phân loại của giao dịch

  Then giao dịch phải có liên kết đến danh mục chính chứa danh mục phụ đó.

  

- Given giao dịch đang được lưu trong danh mục `Khác`

  When hệ thống tổng hợp dữ liệu cho báo cáo về sau

  Then giao dịch vẫn được đưa vào báo cáo theo nhóm `Khác` tương ứng cho đến khi người dùng cập nhật danh mục cụ thể.

  

- Given người dùng sửa danh mục của một giao dịch đã lưu

  When hệ thống cập nhật danh mục thành công

  Then các dữ liệu phụ thuộc vào danh mục phải sử dụng danh mục mới nhất của giao dịch.

  

- Given người dùng xóa cứng một danh mục có giao dịch liên quan

  When hệ thống xóa cứng các giao dịch liên quan

  Then các dữ liệu báo cáo về sau không còn tính các giao dịch đã bị xóa cứng đó.

  

⚠️ AMBIGUOUS: Việc cập nhật lại báo cáo sau khi đổi/xóa danh mục thuộc phạm vi triển khai của REQ-02 hay REQ-05 cần PO xác nhận.

  

## Yêu cầu Phi chức năng (NFR)

- **Ngôn ngữ đầu vào**: Phân loại cần hỗ trợ đầu vào tiếng Việt, tiếng Anh và câu pha trộn Việt - Anh theo REQ-01.

- **Nhãn danh mục**: Mỗi danh mục chỉ cần một nhãn hiển thị duy nhất; không bắt buộc lưu nhãn song ngữ Anh - Việt.

- **Danh mục tùy biến**: Người dùng có thể thêm, sửa, xóa danh mục theo nhu cầu riêng, bao gồm danh mục mặc định, ngoại trừ `Khác`.

- **Danh mục phụ**: Hệ thống cần hỗ trợ thêm và quản lý danh mục phụ 1 cấp dưới danh mục chính.

- **Không hỗ trợ danh mục lồng nhiều cấp**: MVP không hỗ trợ danh mục phụ bên dưới danh mục phụ.

- **Danh mục mặc định cho chi phí**: `Ăn uống`, `Nhà cửa`, `Mua sắm`, `Di chuyển`, `Giải trí`, `Tạp hóa`, `Sức khỏe`, `Giáo dục`, `Điện tử`, `Thể thao`, `Làm đẹp`, `Khác`.

- **Danh mục mặc định cho thu nhập**: `Lương`, `Thưởng`, `Đầu tư`, `Khác`.

- **Danh mục Khác**: Hệ thống cần hỗ trợ `Khác` cho cả chi phí và thu nhập; đây là danh mục hệ thống bắt buộc, không cho phép sửa hoặc xóa.

- **Gợi ý tạo danh mục mới**: Nếu AI không tìm được danh mục hợp lý trong danh sách hiện tại của người dùng, hệ thống cần gợi ý tạo danh mục mới trực tiếp trong chat, cho phép người dùng nhấn đồng ý hoặc chỉnh sửa tên trước khi thêm.

- **Ưu tiên gợi ý danh mục phụ**: Khi AI có thể gợi ý cả danh mục chính và danh mục phụ, hệ thống ưu tiên gợi ý danh mục phụ nếu có danh mục chính phù hợp đang tồn tại.

- **Xóa danh mục**: Khi người dùng xóa cứng một danh mục không phải `Khác`, hệ thống phải cảnh báo số lượng giao dịch bị ảnh hưởng, yêu cầu xác nhận, sau đó xóa cứng danh mục và tất cả giao dịch liên quan.

- **Xóa danh mục chính**: Khi xóa danh mục chính, hệ thống xóa cứng toàn bộ danh mục phụ thuộc danh mục đó và tất cả giao dịch liên quan.

- **Ẩn danh hóa log**: Sau khi giao dịch bị xóa cứng, log phân loại liên quan phải được ẩn danh hóa.

- **Tính nhất quán**: Mỗi giao dịch được lưu thành công cần có loại giao dịch và danh mục cuối cùng; nếu có danh mục phụ thì phải giữ liên kết với danh mục chính.

- **Giao dịch đặc biệt**: REQ-02 cần nhận diện quản lý món nợ, cho vay/vay mượn, tiết kiệm, ngân sách, đầu tư có lãi/lỗ và chuyển tiền đi đầu tư, nhưng không xử lý chi tiết nghiệp vụ dòng tiền như REQ-06.

- **Truy vết**: Giao dịch được AI phân loại cần lưu thông tin danh mục AI gán ban đầu và danh mục cuối cùng nếu người dùng có chỉnh sửa.

- **Bảo mật**: Dữ liệu giao dịch, danh mục, log phân loại sai và đặc điểm/thói quen cá nhân của người dùng phải được xem là dữ liệu nhạy cảm và chỉ hiển thị cho đúng người dùng sở hữu hoặc vai trò được phép.

- **Quản lý ngữ cảnh**: Nội dung chat thô chỉ được dùng trong thời hạn ngữ cảnh 48 giờ; sau đó hệ thống chỉ sử dụng đặc điểm/thói quen đã được đánh dấu nếu có.

- **Minh bạch cá nhân hóa**: Hệ thống phải thông báo hoặc xin phép trước khi sử dụng thói quen cá nhân của người dùng để hỗ trợ phân loại.

  

## Out of Scope

- Tạo báo cáo biểu đồ tuần/tháng/quý/năm.

- Đưa ra insight tài chính cá nhân hóa từ dữ liệu danh mục.

- Thiết lập ngân sách và cảnh báo vượt ngân sách chi tiết.

- Tự động đồng bộ giao dịch trực tiếp từ ngân hàng hoặc ví điện tử.

- Chia tiền nhóm hoặc split bill giữa nhiều người.

- Quản lý chi tiết tài sản ròng, số dư ví, tài khoản đầu tư, nợ/vay hoặc đối soát dòng tiền chuyên sâu.

- Xây dựng mô hình AI phân loại riêng từ đầu.

  

## Open Questions

- [ ] Quy tắc tên hợp lệ của danh mục gồm những gì: độ dài tối đa, ký tự đặc biệt, emoji, trùng tên giữa Expense và Income?

- [ ] Với giao dịch đặc biệt `Ngân sách`, hành vi sau nhận diện thuộc REQ-04 hay một REQ riêng?

- [ ] Danh sách trường dữ liệu chi tiết cho từng giao dịch đặc biệt sẽ được chốt ở REQ nào?

- [ ] Danh sách đặc điểm/thói quen người dùng được phép dùng để cá nhân hóa phân loại gồm những gì?

- [ ] Khi người dùng sửa/xóa danh mục của giao dịch đã lưu, việc cập nhật lại báo cáo liên quan thuộc phạm vi REQ-02 hay REQ-05?

- [ ] Tiêu chí ẩn danh hóa log sau khi giao dịch bị xóa cứng gồm những trường nào được giữ lại và những trường nào bắt buộc loại bỏ?

  

## Hướng dẫn phê duyệt

> Để phê duyệt spec này, PO đổi tên file từ `DRAFT-REQ-02.md` → `REQ-02.md`  

> Sau khi đổi tên, BA mới chuyển sang tạo DRAFT cho `REQ-03`.
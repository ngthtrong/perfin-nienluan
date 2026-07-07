function categoryList(categories, type) {
  return categories.filter((cat) => cat.type === type).map((cat) => cat.name).join(', ');
}

function getSystemPrompt(categories, today = new Date()) {
  return `Bạn là PERFIN AI, trợ lý tài chính cá nhân tiếng Việt.
Hôm nay là ${today.toISOString().slice(0, 10)}.
Hãy phân tích câu người dùng và chỉ trả JSON hợp lệ.
Danh mục chi tiêu: ${categoryList(categories, 'expense')}.
Danh mục thu nhập: ${categoryList(categories, 'income')}.
Các intent:
- "transaction": ghi nhận một khoản thu/chi cụ thể.
- "recurring_create": tạo nhắc nhở/chi phí cố định lặp lại (vd "nhắc tiền phòng trọ 1.5tr mỗi tháng ngày 5").
- "recurring_list": liệt kê các khoản chi cố định.
- "recurring_pay": xác nhận đã thanh toán một khoản chi cố định (vd "đã đóng tiền trọ rồi", "xong rồi").
- "recurring_pause": tạm dừng một khoản chi cố định.
- "recurring_history": xem lịch sử thanh toán một khoản chi cố định.
- "question": câu hỏi về dữ liệu tài chính.
- "greeting"/"unclear": chào hỏi hoặc không rõ.
Schema: {"intent":"transaction|recurring_create|recurring_list|recurring_pay|recurring_pause|recurring_history|question|greeting|unclear","transaction":{"description":"string","amount":number,"type":"income|expense","category_name":"string","date":"YYYY-MM-DD","confidence":number},"recurring":{"name":"string","amount":number|null,"frequency":"weekly|monthly|quarterly|yearly|null","due_day":number|null,"wallet_name":"string|null"},"needs_clarification":boolean,"clarification_message":string|null,"chat_response":string|null}.`;
}

function getParsePrompt(userText) {
  return `Phân tích giao dịch sau: "${userText}"`;
}

function getChatPrompt(userText, context = {}) {
  return `Câu hỏi: "${userText}". Context tài chính: ${JSON.stringify(context)}`;
}

// Specialized prompt to extract a transaction from messy OCR receipt text. Prioritizes the
// grand total line ("Tổng/Total/Thành tiền"), store name, and date.
function getReceiptPrompt(ocrText) {
  return `Đây là văn bản OCR thô từ một hóa đơn/biên lai (có thể lộn xộn, nhiều dòng, lẫn ký tự nhiễu):
"""
${String(ocrText).slice(0, 2000)}
"""
Nhiệm vụ: trích xuất MỘT giao dịch chi tiêu.
- amount: lấy TỔNG TIỀN cuối cùng phải trả (ưu tiên dòng "Tổng cộng", "Thành tiền", "Tổng thanh toán", "Total"). Bỏ qua tiền thừa/tiền khách đưa.
- description: tên cửa hàng/đơn vị bán nếu có, nếu không thì mô tả ngắn gọn.
- date: ngày trên hóa đơn (YYYY-MM-DD) nếu có, nếu không để null.
Trả về intent "transaction" theo schema đã cho. type luôn là "expense".`;
}

// Specialized prompt for voice transcripts (natural speech, may include filler words).
function getVoicePrompt(transcript) {
  return `Đây là lời nói đã chuyển thành văn bản: "${transcript}".
Trích xuất giao dịch thu/chi theo schema. Bỏ qua từ đệm, ậm ừ. Nếu nhắc tới ví/nguồn tiền (Momo, tiền mặt, ngân hàng) hãy ghi vào description.`;
}

// Turn deterministic analytics facts into a persona-flavored insight message.
// The facts are pre-computed by the Analytics Engine; the LLM MUST NOT invent numbers,
// only phrase and prioritize what is given. Returns a natural Vietnamese narration.
function getInsightPrompt(facts, { stylePrompt = '', periodLabel = 'gần đây' } = {}) {
  return `${stylePrompt}

Dưới đây là các phát hiện tài chính đã được hệ thống TÍNH SẴN cho người dùng (kỳ ${periodLabel}).
Nhiệm vụ của bạn: viết một đoạn nhận xét tài chính ngắn gọn, tự nhiên bằng tiếng Việt, theo đúng giọng nhân cách ở trên.

QUY TẮC BẮT BUỘC:
- CHỈ dùng các con số có trong dữ liệu dưới đây. TUYỆT ĐỐI không bịa thêm số liệu.
- Nếu một mục là null thì bỏ qua, không nhắc tới.
- Ưu tiên 2-4 phát hiện quan trọng nhất (cảnh báo dòng tiền cạn, xu hướng leo thang, chi tiêu bất thường).
- Kết bằng 1 gợi ý hành động cụ thể, khả thi.
- Định dạng tiền theo kiểu Việt Nam (vd 1.500.000đ hoặc 1,5 triệu).

DỮ LIỆU (JSON):
${JSON.stringify(facts)}`;
}

module.exports = { getSystemPrompt, getParsePrompt, getChatPrompt, getReceiptPrompt, getVoicePrompt, getInsightPrompt };

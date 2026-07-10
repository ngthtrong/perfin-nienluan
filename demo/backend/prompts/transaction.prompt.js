function categoryList(categories, type) {
  return categories.filter((cat) => cat.type === type).map((cat) => cat.name).join(', ');
}

function getSystemPrompt(categories, today = new Date()) {
  return `Bạn là PERFIN AI, trợ lý tài chính cá nhân tiếng Việt.
Hôm nay là ${today.toISOString().slice(0, 10)}.
Hãy chọn function phù hợp và điền đúng tham số. Function chỉ tạo bản xem trước;
không khẳng định đã lưu hoặc đã chuyển tiền. Nếu chỉ là trò chuyện thông thường,
trả lời ngắn gọn bằng tiếng Việt và không bịa dữ liệu tài chính.
Danh mục chi tiêu: ${categoryList(categories, 'expense')}.
Danh mục thu nhập: ${categoryList(categories, 'income')}.
Một câu có thể chứa nhiều giao dịch; khi đó gọi record_transactions một lần với đầy đủ mảng.
Khi người dùng hỏi số liệu, luôn gọi query_financial_data thay vì tự suy đoán.`;
}

function getParsePrompt(userText) {
  return `Phân tích giao dịch sau: "${userText}"`;
}

function getChatPrompt(userText, context = {}) {
  const style = context.persona_style || '';
  const safeContext = { ...context };
  delete safeContext.persona_style;
  return `${style}\nBạn là PERFIN AI. Trả lời câu hỏi: "${userText}".
Context có cấu trúc do hệ thống cung cấp: ${JSON.stringify(safeContext)}
Chỉ dùng số liệu trong context. Nếu context không đủ, nói rõ cần truy vấn thêm; không tự bịa số.`;
}

// Specialized prompt to extract a transaction from messy OCR receipt text. Prioritizes the
// grand total line ("Tổng/Total/Thành tiền"), store name, and date.
function getReceiptPrompt(ocrText) {
  return `Đây là văn bản OCR thô từ một hóa đơn/biên lai (có thể lộn xộn, nhiều dòng, lẫn ký tự nhiễu):
"""
${String(ocrText).slice(0, 2000)}
"""
Nhiệm vụ: trích xuất hóa đơn thành giao dịch chi tiêu.
- amount: lấy TỔNG TIỀN cuối cùng phải trả (ưu tiên dòng "Tổng cộng", "Thành tiền", "Tổng thanh toán", "Total"). Bỏ qua tiền thừa/tiền khách đưa.
- description: tên cửa hàng/đơn vị bán nếu có, nếu không thì mô tả ngắn gọn.
- date: ngày trên hóa đơn (YYYY-MM-DD) nếu có, nếu không để null.
- Nếu OCR thể hiện rõ nhiều mặt hàng, đưa từng mặt hàng vào record_transactions và thêm một
  giao dịch tổng có description bắt đầu bằng "Tổng hóa đơn:" ở cuối. Client sẽ cho người dùng
  chọn lưu tổng hoặc lưu từng mặt hàng. type luôn là "expense".`;
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

Ý NGHĨA FIELD (không được đổi đơn vị):
- runway.avgBurn: mức chi tiêu trung bình MỖI NGÀY, không phải mỗi tháng.
- runway.daysLeft: số ngày số dư còn duy trì được.
- runway.daysBeforePayday: số ngày bị cạn tiền trước kỳ lương.
- subscriptions.totalMonthly: tổng phí MỖI THÁNG.
- trend.avgPctChange: phần trăm thay đổi MỖI THÁNG.

DỮ LIỆU (JSON):
${JSON.stringify(facts)}`;
}

module.exports = { getSystemPrompt, getParsePrompt, getChatPrompt, getReceiptPrompt, getVoicePrompt, getInsightPrompt };

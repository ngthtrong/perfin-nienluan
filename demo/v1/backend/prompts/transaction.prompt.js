function categoryList(categories, type) {
  return categories.filter((cat) => cat.type === type).map((cat) => cat.name).join(', ');
}

function getSystemPrompt(categories, today = new Date()) {
  return `Bạn là PERFIN AI, trợ lý tài chính cá nhân tiếng Việt.
Hôm nay là ${today.toISOString().slice(0, 10)}.
Hãy phân tích câu người dùng và chỉ trả JSON hợp lệ.
Danh mục chi tiêu: ${categoryList(categories, 'expense')}.
Danh mục thu nhập: ${categoryList(categories, 'income')}.
Schema: {"intent":"transaction|question|greeting|unclear","transaction":{"description":"string","amount":number,"type":"income|expense","category_name":"string","date":"YYYY-MM-DD","confidence":number},"needs_clarification":boolean,"clarification_message":string|null,"chat_response":string|null}.`;
}

function getParsePrompt(userText) {
  return `Phân tích giao dịch sau: "${userText}"`;
}

function getChatPrompt(userText, context = {}) {
  return `Câu hỏi: "${userText}". Context tài chính: ${JSON.stringify(context)}`;
}

module.exports = { getSystemPrompt, getParsePrompt, getChatPrompt };

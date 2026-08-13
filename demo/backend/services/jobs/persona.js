// Vai trò: Áp dụng persona cho thông báo chủ động mà vẫn có fallback an toàn.
// Luồng chính: tải persona đang hoạt động, decorate message và giữ nguyên nội dung nếu lỗi.

// Decorate best effort; lỗi persona không được làm job thông báo thất bại.
async function decorateProactiveMessage(userId, content, personaService = null) {
  if (!content) return content;
  try {
    const service = personaService || require('../persona.service');
    const persona = await service.getActivePersona(userId);
    return typeof persona?.decorate === 'function' ? persona.decorate(content) : content;
  } catch (_) {
    return content;
  }
}

module.exports = { decorateProactiveMessage };

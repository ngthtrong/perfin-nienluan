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

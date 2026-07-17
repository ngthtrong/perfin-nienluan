// Persona Engine (REQ-09). Replaces the no-op applyPersona().
//
// Two modes:
//   - style_prompt: injected into LLM calls so generated text carries the persona voice.
//   - decorate(): a cheap, no-LLM wrapper (prefix/emoji) for short system lines where
//     spending an LLM call is not worth it (e.g. "Đã lưu", "Đã hủy").
//
// Personas are seeded from a built-in registry; when the DB has an ai_personalities
// table (schema Phương án A) the active persona can be loaded from there and cached.

const KVStore = require('./store/kv.store');

const identity = (text) => text;

const BUILTIN_PERSONAS = {
  expert: {
    id: 'expert',
    name: 'Chuyên gia tài chính',
    style_prompt:
      'Bạn là một chuyên gia tài chính điềm đạm, chuyên nghiệp. Giọng văn rõ ràng, ' +
      'khách quan, dùng số liệu để thuyết phục. Đưa lời khuyên cụ thể, khả thi. ' +
      'Không dùng emoji quá đà, tối đa 1 emoji nếu cần.',
    decorate: (text) => text,
  },
  strict_mom: {
    id: 'strict_mom',
    name: 'Bà mẹ nghiêm khắc',
    style_prompt:
      'Bạn nhập vai một bà mẹ Việt Nam nghiêm khắc nhưng thương con. Xưng "mẹ", gọi "con". ' +
      'Cằn nhằn, lo lắng khi con tiêu hoang, nhưng luôn kèm lời khuyên thiết thực. ' +
      'Giọng gần gũi, đôi chỗ trách yêu.',
    decorate: (text) => `Con à, ${text}`,
  },
  bestie: {
    id: 'bestie',
    name: 'Bạn thân',
    style_prompt:
      'Bạn là một người bạn thân vui tính, xưng "mình/tụi mình", gọi "cậu/mày" thân mật. ' +
      'Giọng tếu táo, dùng emoji tự nhiên, động viên nhẹ nhàng nhưng vẫn thẳng thắn về tiền bạc.',
    decorate: (text) => `Ê, ${text} 😄`,
  },
  coach: {
    id: 'coach',
    name: 'Huấn luyện viên tài chính',
    style_prompt:
      'Bạn là một huấn luyện viên tài chính đầy năng lượng, tạo động lực. ' +
      'Đặt mục tiêu rõ ràng, thách thức người dùng cải thiện, khen ngợi tiến bộ. Giọng tích cực, quyết đoán.',
    decorate: (text) => `💪 ${text}`,
  },
};

const DEFAULT_PERSONA_ID = 'expert';

function get(personaId) {
  return BUILTIN_PERSONAS[personaId] || BUILTIN_PERSONAS[DEFAULT_PERSONA_ID];
}

// Redis stores JSON, so functions must never be part of the cached value. Keep a
// serializable DTO and restore the short-message decorator from the trusted
// built-in registry on every read. Unknown/custom personas intentionally use an
// identity decorator while retaining their DB-provided style_prompt for LLM use.
function toCacheDTO(persona = {}) {
  const { decorate: _decorate, ...dto } = persona;
  const key = dto.key || (BUILTIN_PERSONAS[dto.id] ? dto.id : null);
  return { ...dto, key };
}

function hydratePersona(persona = {}) {
  const dto = toCacheDTO(persona);
  return {
    ...dto,
    decorate: BUILTIN_PERSONAS[dto.key]?.decorate || identity,
  };
}

// Resolve the active persona for a user. Tries DB (ai_personalities) if available,
// falls back to the built-in default. Cached briefly to avoid per-request lookups.
async function getActivePersona(userId = 'default_user') {
  const cacheKey = `cache:persona:${userId}`;
  const cached = await KVStore.get(cacheKey);
  if (cached) return hydratePersona(cached);

  let persona = get(DEFAULT_PERSONA_ID);
  try {
    // Lazy require so this module works even before the schema exists.
    const { query } = require('../config/database');
    const result = await query(
      `SELECT p.id, p.key, p.name, p.style_prompt
       FROM users u JOIN ai_personalities p ON p.id = u.active_personality_id
       WHERE u.user_key = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows[0]) {
      const row = result.rows[0];
      persona = {
        id: row.key || String(row.id),
        key: row.key || null,
        db_id: row.id,
        name: row.name,
        style_prompt: row.style_prompt,
      };
    }
  } catch (_) {
    // table not present yet → built-in default; this is expected pre-migration
  }
  const dto = toCacheDTO(persona);
  await KVStore.set(cacheKey, dto, 300);
  return hydratePersona(dto);
}

async function invalidate(userId = 'default_user') {
  await KVStore.del(`cache:persona:${userId}`);
}

module.exports = {
  BUILTIN_PERSONAS,
  DEFAULT_PERSONA_ID,
  get,
  hydratePersona,
  getActivePersona,
  invalidate,
  list: () => Object.values(BUILTIN_PERSONAS).map(({ id, name }) => ({ id, name })),
};

const { query } = require('../../config/database');

function safeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return JSON.parse(JSON.stringify(metadata));
}

async function persistInternalMessage({
  userId,
  content,
  type,
  eventKey,
  metadata = {},
  dedupeHours = 24 * 35,
}, queryFn = query) {
  const cleanContent = String(content || '').trim().slice(0, 10000);
  if (!cleanContent) return { created: false, reason: 'empty_content' };
  const cleanEventKey = String(eventKey || '').trim().slice(0, 255);
  if (!cleanEventKey) throw new Error('Proactive internal message requires an eventKey');

  const payload = safeMetadata({
    ...metadata,
    source: 'proactive_worker',
    notification_type: type,
    event_key: cleanEventKey,
  });
  const result = await queryFn(
    `INSERT INTO chat_messages (user_id, role, content, metadata)
     SELECT $1::varchar, 'assistant', $2::text, $3::jsonb
     WHERE NOT EXISTS (
       SELECT 1 FROM chat_messages
       WHERE user_id = $1::varchar
         AND metadata->>'event_key' = $4::text
         AND created_at >= NOW() - ($5::text || ' hours')::interval
     )
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [userId, cleanContent, JSON.stringify(payload), cleanEventKey, String(Math.max(1, Number(dedupeHours) || 1))]
  );
  return result.rows[0]
    ? { created: true, message: result.rows[0] }
    : { created: false, reason: 'duplicate' };
}

module.exports = { safeMetadata, persistInternalMessage };

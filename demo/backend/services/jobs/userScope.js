// Vai trò: Xác định tập người dùng và ngày nhận lương mà một proactive job được phép xử lý.
// Luồng chính: chuẩn hóa ID từ payload hoặc DB và fallback về cấu hình hồ sơ hiện tại.

const DEFAULT_USER = 'default_user';

function normalizeUserIds(values) {
  return [...new Set((Array.isArray(values) ? values : [values])
    .map((value) => String(value || '').trim())
    .filter(Boolean))];
}

async function resolveTargetUserIds(data = {}, queryFn = null) {
  const requested = normalizeUserIds(data.userIds || data.userId || []);
  if (requested.length) return requested;

  try {
    const query = queryFn || require('../../config/database').query;
    const result = await query('SELECT user_key FROM users ORDER BY id');
    const ids = normalizeUserIds(result.rows.map((row) => row.user_key));
    return ids.length ? ids : [DEFAULT_USER];
  } catch (_) {
    // The users bridge table may not exist before migration 005. The MVP still has
    // a well-known user key, so scheduled jobs remain useful on the older schema.
    return [DEFAULT_USER];
  }
}

async function resolveUserPayday(userId, requestedPayday = null, queryFn = null) {
  const explicit = Number(requestedPayday);
  if (Number.isInteger(explicit) && explicit >= 1 && explicit <= 31) return explicit;
  try {
    const query = queryFn || require('../../config/database').query;
    const result = await query('SELECT payday FROM users WHERE user_key = $1 LIMIT 1', [userId]);
    const payday = Number(result.rows[0]?.payday);
    return Number.isInteger(payday) && payday >= 1 && payday <= 31 ? payday : null;
  } catch (_) {
    return null;
  }
}

module.exports = { DEFAULT_USER, normalizeUserIds, resolveTargetUserIds, resolveUserPayday };

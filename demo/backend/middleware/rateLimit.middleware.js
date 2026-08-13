// Vai trò: Giới hạn tần suất gọi API theo cửa sổ thời gian bằng KV store.
// Luồng chính: xác định người gọi, tăng bộ đếm có TTL và từ chối khi vượt ngưỡng.

const KVStore = require('../services/store/kv.store');

function rateLimit({ prefix = 'api', limit = 60, windowSeconds = 60 } = {}) {
  return async function rateLimitMiddleware(req, res, next) {
    try {
      const identity = req.user?.id || req.ip || 'default_user';
      const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
      const state = await KVStore.increment(`rate:${prefix}:${identity}:${bucket}`, windowSeconds + 1);
      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - state.value)));
      res.setHeader('X-RateLimit-Reset', String(state.ttl));
      if (state.value > limit) {
        return res.status(429).json({ success: false, error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau.', code: 'RATE_LIMITED' });
      }
      next();
    } catch (error) {
      // Availability of the finance API is more important than rate limiting when
      // the ephemeral store itself is unavailable.
      next();
    }
  };
}

module.exports = { rateLimit };

// Vai trò: Chuẩn hóa mọi lỗi từ route thành response JSON nhất quán cho frontend.
// Luồng chính: chọn status/code an toàn, ghi log máy chủ và ẩn chi tiết lỗi production.

// Đây là điểm cuối của chuỗi lỗi Express, luôn trả contract success=false cho client.
function errorMiddleware(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR');
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' && status === 500 ? 'Có lỗi xảy ra. Vui lòng thử lại sau.' : err.message,
    code,
  });
}

module.exports = errorMiddleware;

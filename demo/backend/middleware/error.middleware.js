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

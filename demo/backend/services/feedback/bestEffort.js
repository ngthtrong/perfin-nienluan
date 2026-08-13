// Vai trò: Cô lập lỗi ghi feedback xảy ra sau khi dữ liệu tài chính đã commit.
// Luồng chính: chạy recorder, ghi cảnh báo nếu lỗi và không biến thao tác thành công thành HTTP 500.

async function recordFeedbackAfterCommit(label, recorder) {
  try {
    return await recorder();
  } catch (error) {
    // Financial data is already committed at this point. A learning/logging
    // outage must not turn a successful write into a 500 that invites retries.
    console.warn(`[transaction] post-commit ${label} feedback failed: ${error.message}`);
    return null;
  }
}

module.exports = { recordFeedbackAfterCommit };

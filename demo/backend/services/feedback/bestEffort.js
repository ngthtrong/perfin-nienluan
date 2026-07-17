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

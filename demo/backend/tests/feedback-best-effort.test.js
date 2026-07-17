const test = require('node:test');
const assert = require('node:assert/strict');

const { recordFeedbackAfterCommit } = require('../services/feedback/bestEffort');

test('post-commit feedback outage cannot turn a durable financial write into a failure', async () => {
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (message) => warnings.push(message);
  try {
    const result = await recordFeedbackAfterCommit('extraction', async () => {
      throw new Error('feedback database unavailable');
    });
    assert.equal(result, null);
    assert.match(warnings[0], /post-commit extraction feedback failed/);
  } finally {
    console.warn = originalWarn;
  }
});

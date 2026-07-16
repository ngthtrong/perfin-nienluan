const test = require('node:test');
const assert = require('node:assert/strict');

const { isEnabled, measure } = require('../services/health.service');

test('health flags accept explicit disable values and preserve defaults', () => {
  for (const value of ['0', 'false', 'NO', 'off']) assert.equal(isEnabled(value, true), false);
  for (const value of ['1', 'true', 'yes', 'on']) assert.equal(isEnabled(value, false), true);
  assert.equal(isEnabled(undefined, false), false);
  assert.equal(isEnabled(undefined, true), true);
});

test('health measurement reports successful dependency checks', async () => {
  const result = await measure(async () => ({ status: 'ready', marker: 1 }));
  assert.equal(result.ok, true);
  assert.equal(result.status, 'ready');
  assert.equal(result.marker, 1);
  assert.ok(result.latency_ms >= 0);
});

test('health measurement sanitizes dependency failures into a stable payload', async () => {
  const result = await measure(async () => {
    const error = new Error('connection details should not be required by callers');
    error.code = 'ECONNREFUSED';
    throw error;
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'ECONNREFUSED');
  assert.ok(result.latency_ms >= 0);
});

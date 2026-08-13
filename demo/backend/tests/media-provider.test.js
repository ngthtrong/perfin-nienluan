const test = require('node:test');
const assert = require('node:assert/strict');

const MediaAI = require('../services/media-ai.service');

test('media providers are fixed to local engines and ignore deprecated cloud settings', () => {
  const previous = {
    OCR_PROVIDER: process.env.OCR_PROVIDER,
    SPEECH_PROVIDER: process.env.SPEECH_PROVIDER,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  };
  process.env.OCR_PROVIDER = 'google';
  process.env.SPEECH_PROVIDER = 'google';
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/ignored-service-account.json';
  try {
    assert.equal(MediaAI.getOcrProvider(), 'paddleocr');
    assert.equal(MediaAI.getSpeechProvider(), 'phowhisper');
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

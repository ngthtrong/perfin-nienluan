const test = require('node:test');
const assert = require('node:assert/strict');

process.env.REDIS_ENABLED = 'false';

const KVStore = require('../services/store/kv.store');
const Persona = require('../services/persona.service');

test('hydrates a cached built-in persona after JSON serialization removed functions', async () => {
  const userId = 'persona-cache-test-user';
  const cacheKey = `cache:persona:${userId}`;
  const cached = JSON.parse(JSON.stringify({
    id: 'bestie',
    name: 'Bạn thân',
    style_prompt: 'Giọng thân thiện',
    decorate: (text) => `lost: ${text}`,
  }));

  await KVStore.set(cacheKey, cached, 30);
  try {
    const persona = await Persona.getActivePersona(userId);
    assert.equal(typeof persona.decorate, 'function');
    assert.equal(persona.decorate('Đã lưu'), 'Ê, Đã lưu 😄');
  } finally {
    await KVStore.del(cacheKey);
  }
});

test('unknown cached personas use a safe identity decorator', async () => {
  const userId = 'persona-custom-cache-test-user';
  const cacheKey = `cache:persona:${userId}`;
  await KVStore.set(cacheKey, { id: '17', key: null, name: 'Tùy chỉnh', style_prompt: 'Custom' }, 30);

  try {
    const persona = await Persona.getActivePersona(userId);
    assert.equal(typeof persona.decorate, 'function');
    assert.equal(persona.decorate('Đã lưu'), 'Đã lưu');
  } finally {
    await KVStore.del(cacheKey);
  }
});

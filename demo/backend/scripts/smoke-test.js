#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');
const demoRoot = path.resolve(backendRoot, '..');
const dataRoot = path.join(demoRoot, 'data');

function readOption(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const baseUrl = readOption('--base-url', process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const includeWrites = process.argv.includes('--write');
const includeMedia = process.argv.includes('--media');
const results = [];

function elapsed(startedAt) {
  return `${Date.now() - startedAt} ms`;
}

async function request(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    signal: AbortSignal.timeout(Number(process.env.SMOKE_TIMEOUT_MS || 360000)),
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok || body?.success === false) {
    const message = body?.error || `${response.status} ${response.statusText}`;
    throw new Error(`${options.method || 'GET'} ${route}: ${message}`);
  }
  return body;
}

async function check(name, run) {
  const startedAt = Date.now();
  try {
    const detail = await run();
    results.push({ name, ok: true, duration: elapsed(startedAt), detail });
    const printableDetail = ['string', 'number', 'boolean'].includes(typeof detail) ? String(detail) : '';
    console.log(`PASS ${name} (${elapsed(startedAt)})${printableDetail ? ` - ${printableDetail}` : ''}`);
    return detail;
  } catch (error) {
    results.push({ name, ok: false, duration: elapsed(startedAt), error: error.message });
    console.error(`FAIL ${name} (${elapsed(startedAt)}) - ${error.message}`);
    throw error;
  }
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function upload(route, fieldName, fixture) {
  const filePath = path.join(dataRoot, fixture.file);
  assert.equal(sha256(filePath), fixture.sha256, `Fixture ${fixture.file} đã thay đổi`);
  const form = new FormData();
  form.append(fieldName, new Blob([fs.readFileSync(filePath)], { type: fixture.media_type }), path.basename(filePath));
  return request(route, { method: 'POST', body: form });
}

async function cancelPending(data) {
  const pendingId = data?.pending_id;
  if (!pendingId) return false;
  await request('/api/chat/cancel', {
    method: 'POST',
    body: JSON.stringify({ pending_id: pendingId }),
  });
  return true;
}

async function runReadChecks() {
  await check('API liveness', async () => {
    const body = await request('/api/health/live');
    assert.equal(body.data.status, 'alive');
    return body.data.status;
  });

  await check('API readiness + PostgreSQL', async () => {
    const body = await request('/api/health/ready');
    assert.equal(body.data.ready, true);
    assert.equal(body.data.dependencies.database.ok, true);
    return `${body.data.status}; jobs=${body.data.capabilities.proactive_jobs}`;
  });

  const accountBody = await check('Wallet balance', async () => {
    const body = await request('/api/accounts/balance');
    assert.ok(Array.isArray(body.data.wallets));
    assert.ok(Number.isFinite(Number(body.data.total_balance)));
    return body;
  });
  const walletCount = accountBody.data.wallets.length;
  console.log(`INFO wallets=${walletCount} total_balance=${Number(accountBody.data.total_balance)}`);

  await check('Categories', async () => {
    const body = await request('/api/categories');
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.some((item) => item.type === 'expense'));
    assert.ok(body.data.some((item) => item.type === 'income'));
    return `${body.data.length} categories`;
  });

  await check('Transaction list + pagination', async () => {
    const body = await request('/api/transactions?limit=5&page=1');
    assert.ok(Array.isArray(body.data));
    assert.ok(Number.isInteger(body.pagination.total));
    return `${body.pagination.total} active transactions`;
  });

  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const readEndpoints = [
    ['Monthly summary', `/api/reports/summary?month=${month}&year=${year}`],
    ['Category report', `/api/reports/category-breakdown?month=${month}&year=${year}`],
    ['Yearly trend', `/api/reports/monthly-trend?year=${year}`],
    ['Deterministic insight facts', '/api/reports/insights/facts?fresh=1'],
    ['Budget progress', `/api/budgets/progress?month=${month}&year=${year}`],
    ['Budget forecast', `/api/budgets/forecast?month=${month}&year=${year}`],
    ['Cashflow report', '/api/cashflow/report?period=year'],
    ['Net worth', '/api/cashflow/net-worth'],
    ['Recurring bills', '/api/recurring'],
    ['Financial goals', '/api/goals'],
    ['Personas', '/api/personas'],
    ['Recent chat', '/api/chat/messages?limit=5'],
    ['AI status', '/api/ai/status'],
    ['Media provider status', '/api/ai/media/status'],
  ];

  for (const [name, route] of readEndpoints) {
    await check(name, async () => {
      const body = await request(route);
      assert.equal(body.success, true);
      return 'ok';
    });
  }
}

async function runWriteChecks() {
  await check('Chat preview -> edit -> cancel', async () => {
    const preview = await request('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ text: 'chi 45 nghìn tiền ăn trưa hôm nay' }),
    });
    assert.equal(preview.data.type, 'transaction_preview');
    assert.ok(preview.data.pending_id);
    const edited = await request('/api/chat/edit', {
      method: 'POST',
      body: JSON.stringify({ pending_id: preview.data.pending_id, updates: { amount: 46000 } }),
    });
    assert.equal(Number(edited.data.transaction.amount), 46000);
    assert.equal(edited.data.pending_id, preview.data.pending_id);
    await request('/api/chat/cancel', {
      method: 'POST',
      body: JSON.stringify({ pending_id: preview.data.pending_id }),
    });
    return 'no transaction committed';
  });

  await check('General chat identity and capabilities', async () => {
    const identity = await request('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ text: 'bạn là ai?' }),
    });
    assert.equal(identity.data.type, 'chat_response');
    assert.match(identity.data.message, /PERFIN/i);

    const capabilities = await request('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ text: 'bạn có thể làm gì?' }),
    });
    assert.equal(capabilities.data.type, 'chat_response');
    assert.match(capabilities.data.message, /thu chi|tài chính/i);
    return 'no transaction clarification created';
  });

  await check('Confirmed voice text -> safe preview or retry', async () => {
    const valid = await request('/api/ai/speech/confirm', {
      method: 'POST',
      body: JSON.stringify({ transcript: 'chi bốn mươi lăm nghìn mua hủ tiếu' }),
    });
    assert.equal(valid.data.type, 'transaction_preview');
    assert.equal(Number(valid.data.transaction.amount), 45000);
    assert.ok(valid.data.pending_id);
    await cancelPending(valid.data);

    const noisy = await request('/api/ai/speech/confirm', {
      method: 'POST',
      body: JSON.stringify({ transcript: 'một hai ba bốn bột heo bốn' }),
    });
    assert.equal(noisy.data.type, 'clarification');
    assert.equal(noisy.data.code, 'MEDIA_TRANSACTION_INCOMPLETE');
    assert.equal(noisy.data.pending_id, undefined);
    return 'valid preview; noisy transcript rejected';
  });
}

async function runMediaChecks() {
  const manifest = JSON.parse(fs.readFileSync(path.join(dataRoot, 'media-fixtures.json'), 'utf8'));
  const images = manifest.fixtures.filter((item) => item.media_type.startsWith('image/'));
  const audio = manifest.fixtures.find((item) => item.media_type.startsWith('audio/'));

  for (const fixture of images) {
    await check(`OCR ${fixture.file}`, async () => {
      const body = await upload('/api/ocr', 'image', fixture);
      assert.equal(body.provider, 'paddleocr');
      assert.ok(String(body.text || '').trim().length > 10);
      const expectedAmount = Number(fixture.expected?.amount || 0);
      if (expectedAmount) {
        const digits = String(body.text).replace(/\D/g, '');
        assert.ok(digits.includes(String(expectedAmount)), `OCR không chứa số tiền kỳ vọng ${expectedAmount}`);
      }

      let preview = body.data;
      if (!preview && body.receipt_options) {
        const confirmed = await request('/api/ai/ocr/confirm', {
          method: 'POST',
          body: JSON.stringify({ text: body.text, mode: 'total' }),
        });
        preview = confirmed.data;
      }
      await cancelPending(preview);
      return `${body.provider}; extracted_text=${String(body.text).trim().length} chars`;
    });
  }

  if (audio) {
    await check(`Speech ${audio.file}`, async () => {
      const body = await upload('/api/speech', 'audio', audio);
      assert.equal(body.provider, 'phowhisper');
      assert.equal(body.requires_confirmation, true);
      assert.ok(String(body.transcript || '').trim().length > 5);
      const confirmed = await request('/api/ai/speech/confirm', {
        method: 'POST',
        body: JSON.stringify({ transcript: body.transcript }),
      });
      assert.ok(['transaction_preview', 'transactions_preview', 'clarification'].includes(confirmed.data?.type));
      if (confirmed.data.type === 'clarification') {
        assert.match(String(confirmed.data.code || ''), /^MEDIA_TRANSACTION_/);
        assert.equal(confirmed.data.pending_id, undefined);
      } else {
        assert.ok(confirmed.data.pending_id);
        await cancelPending(confirmed.data);
      }
      return `${body.provider}; transcript=${String(body.transcript).trim().length} chars; result=${confirmed.data.type}`;
    });
  }
}

async function main() {
  console.log(`PERFIN smoke test: ${baseUrl}`);
  await runReadChecks();
  if (includeWrites) await runWriteChecks();
  if (includeMedia) await runMediaChecks();
  const passed = results.filter((item) => item.ok).length;
  console.log(`SMOKE PASS ${passed}/${results.length}`);
}

main().catch((error) => {
  const passed = results.filter((item) => item.ok).length;
  console.error(`SMOKE FAIL ${passed}/${results.length}: ${error.message}`);
  process.exitCode = 1;
});

#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const appUrl = option('--url', process.env.UI_SMOKE_URL || 'http://127.0.0.1:8081');
const outputDir = path.resolve(option('--output-dir', process.env.UI_SMOKE_OUTPUT || path.resolve(__dirname, '../../../latex/figures/screenshots')));
const chromiumBin = option('--chromium', process.env.CHROMIUM_BIN || 'chromium');
const viewportSpec = option('--viewport', process.env.UI_SMOKE_VIEWPORT || '390x844');
const viewportMatch = viewportSpec.match(/^(\d+)x(\d+)$/);
if (!viewportMatch) throw new Error(`Viewport không hợp lệ: ${viewportSpec}; dùng dạng WIDTHxHEIGHT`);
const viewport = {
  width: Number(viewportMatch[1]),
  height: Number(viewportMatch[2]),
  deviceScaleFactor: 2,
  mobile: true,
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function fetchJson(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw lastError || new Error(`Không đọc được ${url}`);
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.exceptions = [];
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP WebSocket timeout')), 10000);
      this.socket.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.socket.addEventListener('error', (event) => {
        clearTimeout(timer);
        reject(event.error || new Error('CDP WebSocket error'));
      }, { once: true });
    });
    this.socket.addEventListener('message', (event) => this.onMessage(event.data));
  }

  onMessage(raw) {
    const message = JSON.parse(String(raw));
    if (message.id) {
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(`${waiter.method}: ${message.error.message}`));
      else waiter.resolve(message.result || {});
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const detail = message.params?.exceptionDetails;
      this.exceptions.push(detail?.exception?.description || detail?.text || 'Runtime exception');
    }
    if (message.method === 'Log.entryAdded' && message.params?.entry?.level === 'error') {
      this.exceptions.push(message.params.entry.text || 'Browser log error');
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (response.exceptionDetails) {
      const detail = response.exceptionDetails;
      throw new Error(detail.exception?.description || detail.text || 'Runtime.evaluate failed');
    }
    return response.result?.value;
  }

  close() {
    this.socket?.close();
  }
}

async function waitFor(run, description, timeoutMs = 20000) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await run();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`${description} timeout${lastError ? `: ${lastError.message}` : ''}`);
}

function clickTextExpression(label) {
  return `(() => {
    const label = ${JSON.stringify(label)};
    const nodes = [...document.querySelectorAll('*')]
      .filter((node) => node.children.length === 0 && node.textContent.trim() === label);
    const leaf = nodes[nodes.length - 1];
    const target = leaf?.closest('[role="button"]') || leaf?.parentElement;
    if (!target) return false;
    target.click();
    return true;
  })()`;
}

function clickAccessibilityExpression(label) {
  return `(() => {
    const target = document.querySelector('[aria-label="' + ${JSON.stringify(label)} + '"]');
    if (!target) return false;
    // Schedule the React event outside Runtime.evaluate so an asynchronous
    // request rejection is captured by CDP and can be reported with the
    // screen-level assertion instead of being surfaced as an opaque "Uncaught".
    setTimeout(() => target.click(), 0);
    return true;
  })()`;
}

function fillPlaceholderExpression(placeholder, value) {
  return `(() => {
    const target = [...document.querySelectorAll('input, textarea')]
      .find((node) => node.getAttribute('placeholder') === ${JSON.stringify(placeholder)});
    if (!target) return false;
    const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(target, ${JSON.stringify(value)});
    else target.value = ${JSON.stringify(value)};
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    target.focus();
    return true;
  })()`;
}

async function pageFacts(client) {
  return client.evaluate(`(() => {
    const body = document.body;
    const root = document.documentElement;
    const scrollWidth = Math.max(body?.scrollWidth || 0, root?.scrollWidth || 0);
    return {
      title: document.title,
      readyState: document.readyState,
      width: innerWidth,
      height: innerHeight,
      scrollWidth,
      horizontalOverflow: scrollWidth > innerWidth + 1,
      text: body?.innerText || '',
      loadingMarkers: ['Đang tải', 'Đang phân tích', 'Đang xử lý', 'Skeleton'].filter((marker) => (body?.innerText || '').includes(marker)),
      busyCount: document.querySelectorAll('[aria-busy="true"]').length,
    };
  })()`);
}

async function capture(client, name) {
  const response = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true,
  });
  const filePath = path.join(outputDir, `${name}.png`);
  fs.writeFileSync(filePath, Buffer.from(response.data, 'base64'));
  return filePath;
}

async function scrollTextIntoView(client, label) {
  const scrolled = await client.evaluate(`(() => {
    const wanted = ${JSON.stringify(label)};
    const nodes = [...document.querySelectorAll('*')]
      .filter((node) => node.children.length === 0 && node.textContent.trim() === wanted);
    const target = nodes[nodes.length - 1];
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    return true;
  })()`);
  assert.equal(scrolled, true, `Không tìm thấy nội dung để cuộn: ${label}`);
}

async function auditScreen(client, name, expectedText) {
  const expected = Array.isArray(expectedText) ? expectedText : [expectedText];
  const facts = await waitFor(async () => {
    const current = await pageFacts(client);
    return expected.every((text) => current.text.includes(text))
      && current.loadingMarkers.length === 0
      && current.busyCount === 0 ? current : null;
  }, `${name} render`);
  assert.equal(facts.width, viewport.width, `${name}: viewport không đúng`);
  assert.equal(facts.horizontalOverflow, false, `${name}: tràn ngang ${facts.scrollWidth}px > ${facts.width}px`);
  const screenshot = await capture(client, name);
  console.log(`PASS ${name}: no horizontal overflow -> ${screenshot}`);
  return facts;
}

async function captureChatPreview(client) {
  const filled = await client.evaluate(fillPlaceholderExpression('Nhập giao dịch...', 'Chi 45 nghìn mua cà phê'));
  assert.equal(filled, true, 'Không tìm thấy ô nhập giao dịch');
  const draft = await waitFor(
    () => client.evaluate(`(() => {
      const input = [...document.querySelectorAll('input, textarea')]
        .find((node) => node.value.includes('45 nghìn'));
      const send = document.querySelector('[aria-label="Gửi tin nhắn"]');
      return input && send ? { value: input.value } : null;
    })()`),
    'chat draft',
    10000,
  );
  await delay(300);
  const sent = await client.evaluate(clickAccessibilityExpression('Gửi tin nhắn'));
  assert.equal(sent, true, 'Không gửi được bản nháp chat');
  await waitFor(async () => {
    const facts = await pageFacts(client);
    const hasDraft = facts.text.includes('Chi 45 nghìn mua cà phê');
    const hasPreview = facts.text.includes('Xác nhận giao dịch') || facts.text.includes('Xác nhận tất cả');
    return hasDraft && hasPreview && facts.loadingMarkers.length === 0 ? facts : null;
  }, 'chat transaction preview', 30000);
  const previewLabel = await client.evaluate(`(() => {
    const body = document.body?.innerText || '';
    return body.includes('Xác nhận giao dịch') ? 'Xác nhận giao dịch' : 'Xác nhận tất cả';
  })()`);
  await scrollTextIntoView(client, previewLabel);
  await delay(250);
  const screenshot = await capture(client, '02-chat-preview');
  console.log(`PASS chat preview: ${draft.value} -> ${screenshot}`);
  return screenshot;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const cacheRoot = path.join(os.homedir(), '.cache');
  fs.mkdirSync(cacheRoot, { recursive: true });
  const userDataDir = fs.mkdtempSync(path.join(cacheRoot, 'perfin-ui-smoke-'));
  const port = await freePort();
  let browserStderr = '';
  const browser = spawn(chromiumBin, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-background-networking',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${viewport.width},${viewport.height}`,
    appUrl,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  browser.stderr.on('data', (chunk) => {
    browserStderr = `${browserStderr}${chunk}`.slice(-12000);
  });

  let client;
  try {
    const targets = await fetchJson(`http://127.0.0.1:${port}/json`, 20000);
    const page = targets.find((target) => target.type === 'page');
    assert.ok(page?.webSocketDebuggerUrl, 'Chromium không cung cấp page CDP target');
    client = new CdpClient(page.webSocketDebuggerUrl);
    await client.connect();
    await Promise.all([
      client.send('Page.enable'),
      client.send('Runtime.enable'),
      client.send('DOM.enable'),
      client.send('Log.enable'),
    ]);
    await client.send('Emulation.setDeviceMetricsOverride', viewport);
    await client.send('Page.navigate', { url: appUrl });
    await waitFor(async () => (await pageFacts(client)).readyState === 'complete', 'page load');
    await delay(1500);

    await auditScreen(client, '01-dashboard', 'Giao dịch gần đây');
    assert.equal(await client.evaluate(clickTextExpression('Ngân sách')), true, 'Không mở được màn hình Ngân sách');
    await auditScreen(client, '03-budget', ['Ngân sách', 'đã dùng']);
    assert.equal(await client.evaluate(clickTextExpression('Báo cáo')), true, 'Không mở được tab Báo cáo');
    await auditScreen(client, '04-report', ['Xu hướng 12 tháng', 'Thu nhập', 'Chi tiêu']);
    assert.equal(await client.evaluate(clickTextExpression('Chat')), true, 'Không mở được tab Chat');
    await auditScreen(client, '02-chat-screen', 'Trò chuyện & nhập liệu');
    await captureChatPreview(client);
    assert.equal(await client.evaluate(clickTextExpression('Khác')), true, 'Không mở được tab Khác');
    assert.equal(await client.evaluate(clickTextExpression('Mục tiêu tài chính')), true, 'Không mở được Mục tiêu tài chính');
    await waitFor(async () => {
      const facts = await pageFacts(client);
      return facts.text.includes('Mục tiêu của bạn') && facts.loadingMarkers.length === 0 ? facts : null;
    }, 'goals render');
    assert.equal(await client.evaluate(clickTextExpression('Tạo mục tiêu mới')), true, 'Không mở được biểu mẫu mục tiêu');
    await waitFor(() => client.evaluate(`(() => document.body.innerText.includes('Mục tiêu mới'))()`), 'goal form');
    assert.equal(await client.evaluate(fillPlaceholderExpression('Ví dụ: Quỹ dự phòng 6 tháng', 'Quỹ dự phòng')), true, 'Không điền được tên mục tiêu');
    assert.equal(await client.evaluate(fillPlaceholderExpression('300,000,000', '30000000')), true, 'Không điền được số tiền mục tiêu');
    await client.evaluate(clickTextExpression('Xem kế hoạch'));
    await delay(800);
    const goalFacts = await pageFacts(client);
    assert.equal(goalFacts.loadingMarkers.length, 0, 'Goal plan vẫn đang loading');
    const goalScreenshot = await capture(client, '05-goal-plan');
    console.log(`PASS goal plan -> ${goalScreenshot}`);

    await delay(500);
    assert.deepEqual(client.exceptions, [], `Browser có runtime error: ${client.exceptions.join(' | ')}`);
    console.log(`UI SMOKE PASS; screenshots=${outputDir}; viewport=${viewport.width}x${viewport.height}; dpr=${viewport.deviceScaleFactor}`);
  } catch (error) {
    if (browserStderr) console.error(browserStderr);
    throw error;
  } finally {
    client?.close();
    browser.kill('SIGTERM');
    await delay(250);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`UI SMOKE FAIL: ${error.stack || error.message}`);
  process.exitCode = 1;
});

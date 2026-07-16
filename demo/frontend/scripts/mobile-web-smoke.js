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
const outputDir = path.resolve(option('--output-dir', process.env.UI_SMOKE_OUTPUT || path.join(os.tmpdir(), 'perfin-ui-smoke')));
const fixturePath = path.resolve(option('--image', path.join(__dirname, '../../data/img/chuyen-khoan.jpg')));
const chromiumBin = option('--chromium', process.env.CHROMIUM_BIN || 'chromium');
const viewport = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true };

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
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Runtime.evaluate failed');
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

async function auditScreen(client, name, expectedText) {
  const expected = Array.isArray(expectedText) ? expectedText : [expectedText];
  const facts = await waitFor(async () => {
    const current = await pageFacts(client);
    return expected.every((text) => current.text.includes(text)) ? current : null;
  }, `${name} render`);
  assert.equal(facts.width, viewport.width, `${name}: viewport không đúng`);
  assert.equal(facts.horizontalOverflow, false, `${name}: tràn ngang ${facts.scrollWidth}px > ${facts.width}px`);
  const screenshot = await capture(client, name);
  console.log(`PASS ${name}: no horizontal overflow -> ${screenshot}`);
  return facts;
}

async function selectImageFixture(client) {
  assert.ok(fs.existsSync(fixturePath), `Thiếu fixture ${fixturePath}`);
  // Expo ImagePicker dispatches a synthetic click on a temporary file input.
  // Headless Chromium immediately cancels that picker unless the click is held
  // for CDP to inject a fixture, so intercept only that synthetic file click.
  await client.evaluate(`(() => {
    if (window.__perfinFilePickerPatched) return true;
    window.__perfinFilePickerPatched = true;
    const original = HTMLInputElement.prototype.dispatchEvent;
    HTMLInputElement.prototype.dispatchEvent = function(event) {
      if (this.type === 'file' && event?.type === 'click') {
        window.__perfinPendingFileInput = this;
        return true;
      }
      return original.call(this, event);
    };
    return true;
  })()`);
  const clicked = await client.evaluate(`(() => {
    const target = document.querySelector('[aria-label="Chọn ảnh hóa đơn"]');
    if (!target) return false;
    target.click();
    return true;
  })()`);
  if (!clicked) {
    console.log('SKIP chat-image: chưa tìm thấy nút có accessibilityLabel "Chọn ảnh hóa đơn"');
    return { skipped: true };
  }

  const nodeId = await waitFor(async () => {
    const documentNode = await client.send('DOM.getDocument', { depth: 2, pierce: true });
    const result = await client.send('DOM.querySelector', {
      nodeId: documentNode.root.nodeId,
      selector: 'input[type="file"]',
    });
    return result.nodeId || null;
  }, 'file input', 10000);
  await client.send('DOM.setFileInputFiles', { nodeId, files: [fixturePath] });

  const preview = await waitFor(
    () => client.evaluate(`(() => {
      const root = [...document.querySelectorAll('[aria-label]')]
        .find((node) => node.getAttribute('aria-label')?.includes('Ảnh hóa đơn'));
      const image = root?.querySelector('img');
      const background = root
        ? [...root.querySelectorAll('div')].map((node) => getComputedStyle(node).backgroundImage)
          .find((value) => value && value !== 'none') || ''
        : '';
      const hasLoadingOverlay = (document.body.innerText || '').includes('Đang tải ảnh...');
      const hasReceiptBadge = [...document.querySelectorAll('*')]
        .some((node) => node.children.length === 0 && node.textContent.trim() === 'Hóa đơn');
      const receipt = root && image ? {
        label: root.getAttribute('aria-label') || image.alt || '',
        width: image.naturalWidth,
        height: image.naturalHeight,
        opacity: Number(getComputedStyle(root).opacity),
        source: image.currentSrc || image.src || '',
        background,
      } : null;
      return receipt && receipt.width > 0 && receipt.height > 0 && receipt.opacity > 0.9
        && receipt.background.includes('blob:') && !hasLoadingOverlay && hasReceiptBadge ? receipt : null;
    })()`),
    'chat image preview',
    30000,
  );
  assert.ok(preview.source.startsWith('blob:') || preview.source.startsWith('data:') || preview.source.startsWith('file:'), 'Preview không dùng dữ liệu ảnh thật');
  const screenshot = await capture(client, 'chat-image');
  console.log(`PASS chat-image: ${preview.width}x${preview.height} rendered -> ${screenshot}`);
  return { skipped: false, preview, screenshot };
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

    await auditScreen(client, 'dashboard-mobile', 'Giao dịch gần đây');
    assert.equal(await client.evaluate(clickTextExpression('Báo cáo')), true, 'Không mở được tab Báo cáo');
    await auditScreen(client, 'report-mobile', ['Xu hướng 12 tháng', 'Thu nhập', 'Chi tiêu']);
    assert.equal(await client.evaluate(clickTextExpression('Chat')), true, 'Không mở được tab Chat');
    await auditScreen(client, 'chat-mobile', 'Trò chuyện & nhập liệu');
    const imageResult = await selectImageFixture(client);

    await delay(500);
    assert.deepEqual(client.exceptions, [], `Browser có runtime error: ${client.exceptions.join(' | ')}`);
    console.log(`UI SMOKE PASS; screenshots=${outputDir}; image=${imageResult.skipped ? 'skipped' : 'rendered'}`);
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

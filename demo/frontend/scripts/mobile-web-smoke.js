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

function flag(name) {
  return process.argv.includes(name);
}

const appUrl = option('--url', process.env.UI_SMOKE_URL || 'http://127.0.0.1:8081');
const apiUrl = option('--api-url', process.env.UI_SMOKE_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const outputDir = path.resolve(option('--output-dir', process.env.UI_SMOKE_OUTPUT || path.resolve(__dirname, '../../../latex/figures/screenshots')));
const chromiumBin = option('--chromium', process.env.CHROMIUM_BIN || 'chromium');
const viewportSpec = option('--viewport', process.env.UI_SMOKE_VIEWPORT || '390x844');
const themeMode = option('--theme', process.env.UI_SMOKE_THEME || 'light');
const cleanChatHistory = flag('--clean-chat-history');
if (!['light', 'dark'].includes(themeMode)) throw new Error(`Theme không hợp lệ: ${themeMode}; dùng light hoặc dark`);
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
    let scrollParent = target.parentElement;
    while (scrollParent && scrollParent !== document.body) {
      const style = getComputedStyle(scrollParent);
      const scrollable = /(auto|scroll)/.test(style.overflowY)
        && scrollParent.scrollHeight > scrollParent.clientHeight + 1;
      if (scrollable) {
        const parentRect = scrollParent.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        scrollParent.scrollTop += targetRect.top - parentRect.top - (parentRect.height - targetRect.height) / 2;
        break;
      }
      scrollParent = scrollParent.parentElement;
    }
    return true;
  })()`);
  assert.equal(scrolled, true, `Không tìm thấy nội dung để cuộn: ${label}`);
}

async function cancelStaleChatWork(client) {
  const cancelled = await client.evaluate(`(async () => {
    const response = await fetch(${JSON.stringify(`${apiUrl}/api/chat/cancel`)}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    return response.ok;
  })()`);
  assert.equal(cancelled, true, 'Không hủy được pending/clarification cũ trước khi chụp Chat');
}

async function auditScreen(client, name, expectedText) {
  const navigationLabels = ['Tổng quan', 'Ngân sách', 'Chat', 'Báo cáo', 'Khác'];
  const expected = Array.isArray(expectedText) ? expectedText : [expectedText];
  const facts = await waitFor(async () => {
    const current = await pageFacts(client);
    return expected.every((text) => current.text.includes(text))
      && current.loadingMarkers.length === 0
      && current.busyCount === 0 ? current : null;
  }, `${name} render`);
  assert.equal(facts.width, viewport.width, `${name}: viewport không đúng`);
  assert.equal(facts.horizontalOverflow, false, `${name}: tràn ngang ${facts.scrollWidth}px > ${facts.width}px`);
  const tabs = await client.evaluate(`(() => {
    const navigationLabels = ['Tổng quan', 'Ngân sách', 'Chat', 'Báo cáo', 'Khác'];
    return [...document.querySelectorAll('[role="tab"]')]
      .filter((node) => navigationLabels.includes(node.getAttribute('aria-label')))
      .map((node) => {
    const rect = node.getBoundingClientRect();
    return {
      label: node.getAttribute('aria-label') || node.textContent.trim(),
      width: rect.width,
      height: rect.height,
    };
      });
  })()`);
  assert.equal(tabs.length, 5, `${name}: phải có đúng 5 tab`);
  assert.deepEqual(tabs.map((tab) => tab.label), ['Tổng quan', 'Ngân sách', 'Chat', 'Báo cáo', 'Khác'], `${name}: accessible name của tab không đúng`);
  assert.equal(tabs.every((tab) => tab.width >= 44 && tab.height >= 44), true, `${name}: có tab nhỏ hơn 44x44`);
  const selectedTabState = await client.send('Accessibility.getFullAXTree').then(({ nodes = [] }) => {
    const mainTabs = nodes.filter((node) => (
      node.role?.value === 'tab'
      && navigationLabels.includes(node.name?.value)
    ));
    return {
      count: mainTabs.length,
      selected: mainTabs.filter((node) => node.properties?.some((property) => (
        property.name === 'selected' && property.value?.value === true
      ))).length,
    };
  });
  assert.equal(selectedTabState.count, 5, `${name}: accessibility tree phải có 5 tab chính`);
  assert.equal(selectedTabState.selected, 1, `${name}: accessibility tree phải có đúng một tab đang chọn`);
  const screenshot = await capture(client, name);
  console.log(`PASS ${name}: no horizontal overflow -> ${screenshot}`);
  return facts;
}

async function returnToMoreHome(client) {
  const clicked = await client.evaluate(clickAccessibilityExpression('Khác'));
  assert.equal(clicked, true, 'Không nhấn được tab Khác để quay lại đầu stack');
  await waitFor(async () => {
    const facts = await pageFacts(client);
    return facts.text.includes('Công cụ & Cài đặt') && facts.loadingMarkers.length === 0 ? facts : null;
  }, 'More home render');
}

async function captureTransactionActions(client) {
  const opened = await client.evaluate(`(() => {
    const target = [...document.querySelectorAll('[role="button"]')]
      .find((node) => (node.getAttribute('aria-label') || '').includes('Mở thao tác giao dịch'));
    if (!target) return false;
    target.click();
    return true;
  })()`);
  assert.equal(opened, true, 'Không mở được thao tác của giao dịch đầu tiên');

  const actionState = await waitFor(() => client.evaluate(`(() => {
    const row = [...document.querySelectorAll('[role="button"]')]
      .find((node) => (node.getAttribute('aria-label') || '').includes('Ẩn thao tác giao dịch'));
    const labels = ['Đổi danh mục', 'Chỉnh sửa', 'Xoá'];
    const actions = labels.map((label) => {
      const node = [...document.querySelectorAll('[role="button"]')]
        .find((candidate) => candidate.getAttribute('aria-label')?.startsWith(label));
      const rect = node?.getBoundingClientRect();
      return { label, found: Boolean(node), height: rect?.height || 0 };
    });
    return row && actions.every((action) => action.found)
      ? { expanded: row.getAttribute('aria-expanded'), actions }
      : null;
  })()`), 'transaction actions');

  assert.equal(actionState.expanded, 'true', 'Hàng giao dịch phải công bố aria-expanded=true');
  assert.equal(actionState.actions.every((action) => action.height >= 44), true, 'Thao tác giao dịch nhỏ hơn 44px');
  const facts = await pageFacts(client);
  assert.equal(facts.horizontalOverflow, false, 'Thao tác giao dịch gây tràn ngang');
  const screenshot = await capture(client, '07-transactions-actions');
  console.log(`PASS transaction actions -> ${screenshot}`);
}

async function captureChatPreview(client) {
  await cancelStaleChatWork(client);
  const message = 'Chi 47 nghìn mua trà sữa';
  const filled = await client.evaluate(fillPlaceholderExpression('Nhập giao dịch...', message));
  assert.equal(filled, true, 'Không tìm thấy ô nhập giao dịch');
  const draft = await waitFor(
    () => client.evaluate(`(() => {
      const input = [...document.querySelectorAll('input, textarea')]
        .find((node) => node.value.includes('47 nghìn'));
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
    const hasDraft = facts.text.includes(message);
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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perfin-ui-smoke-'));
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
      client.send('Accessibility.enable'),
    ]);
    if (cleanChatHistory) {
      await client.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(() => {
          const originalFetch = window.fetch.bind(window);
          window.fetch = (input, init) => {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            if (/\\/api\\/chat\\/messages(?:\\?|$)/.test(url)) {
              return Promise.resolve(new Response(JSON.stringify({ success: true, data: [], reminders: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }));
            }
            return originalFetch(input, init);
          };
        })();`,
      });
    }
    await client.send('Emulation.setDeviceMetricsOverride', viewport);
    await client.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: themeMode }],
    });
    await client.send('Page.navigate', { url: appUrl });
    await waitFor(async () => (await pageFacts(client)).readyState === 'complete', 'page load');
    await delay(1500);

    await auditScreen(client, '01-dashboard', 'Giao dịch gần đây');
    assert.equal(await client.evaluate(clickTextExpression('Ngân sách')), true, 'Không mở được màn hình Ngân sách');
    await auditScreen(client, '03-budget', ['Ngân sách', 'đã dùng']);
    assert.equal(await client.evaluate(clickTextExpression('Báo cáo')), true, 'Không mở được tab Báo cáo');
    await auditScreen(client, '04-report', ['Xu hướng 12 tháng', 'Phân tích tổng quan', 'giao dịch']);
    assert.equal(await client.evaluate(clickTextExpression('Chat')), true, 'Không mở được tab Chat');
    await auditScreen(client, '02-chat-screen', 'Trò chuyện & nhập liệu');
    await captureChatPreview(client);
    assert.equal(await client.evaluate(clickTextExpression('Khác')), true, 'Không mở được tab Khác');
    await auditScreen(client, '06-more', 'Công cụ & Cài đặt');

    const moreRoutes = [
      ['Giao dịch', 'Bộ lọc giao dịch', '07-transactions'],
      ['Danh mục', 'Danh mục giúp báo cáo chính xác hơn', '08-categories'],
      ['Dòng tiền & Tài sản', 'Tài sản ròng (Net Worth)', '09-cashflow'],
      ['Chi phí cố định', 'Chi phí cố định hàng tháng', '10-recurring'],
      ['Mục tiêu tài chính', 'Mục tiêu của bạn', '11-goals'],
      ['Xuất & Sao lưu', 'Xuất dữ liệu nhanh', '12-export'],
      ['Cài đặt', 'Chế độ hiển thị', '13-settings'],
    ];
    for (const [label, expected, screenshotName] of moreRoutes) {
      assert.equal(await client.evaluate(clickTextExpression(label)), true, `Không mở được ${label}`);
      await auditScreen(client, screenshotName, expected);
      if (screenshotName === '07-transactions') await captureTransactionActions(client);
      await returnToMoreHome(client);
    }

    assert.equal(await client.evaluate(clickTextExpression('Mục tiêu tài chính')), true, 'Không mở được Mục tiêu tài chính');
    await waitFor(async () => {
      const facts = await pageFacts(client);
      return facts.text.includes('Mục tiêu của bạn') && facts.loadingMarkers.length === 0 ? facts : null;
    }, 'goals render');
    assert.equal(await client.evaluate(clickTextExpression('Tạo mục tiêu mới')), true, 'Không mở được biểu mẫu mục tiêu');
    await waitFor(() => client.evaluate(`(() => document.body.innerText.includes('Mục tiêu mới'))()`), 'goal form');
    assert.equal(await client.evaluate(fillPlaceholderExpression('Ví dụ: Quỹ dự phòng 6 tháng', 'Quỹ dự phòng')), true, 'Không điền được tên mục tiêu');
    assert.equal(await client.evaluate(fillPlaceholderExpression('300,000,000', '30000000')), true, 'Không điền được số tiền mục tiêu');
    assert.equal(await client.evaluate(fillPlaceholderExpression('Để trống để dùng dòng tiền có thể phân bổ', '5000000')), true, 'Không điền được khoản góp hàng tháng');
    assert.equal(await client.evaluate(clickTextExpression('Xem kế hoạch')), true, 'Không gửi được yêu cầu xem kế hoạch');
    await waitFor(async () => {
      const facts = await pageFacts(client);
      return facts.text.includes('Kế hoạch dự kiến') && facts.loadingMarkers.length === 0 ? facts : null;
    }, 'goal plan preview', 20000);
    await scrollTextIntoView(client, 'Kế hoạch dự kiến');
    await delay(300);
    const goalScreenshot = await capture(client, '05-goal-plan');
    console.log(`PASS goal plan -> ${goalScreenshot}`);

    await delay(500);
    assert.deepEqual(client.exceptions, [], `Browser có runtime error: ${client.exceptions.join(' | ')}`);
    console.log(`UI SMOKE PASS; screenshots=${outputDir}; viewport=${viewport.width}x${viewport.height}; theme=${themeMode}; dpr=${viewport.deviceScaleFactor}`);
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

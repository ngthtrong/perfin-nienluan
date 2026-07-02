import { NativeModules, Platform } from 'react-native';

function getDevServerHost() {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (!scriptURL) return null;

  const match = scriptURL.match(/^(?:https?|exp):\/\/([^/:]+)/);
  const host = match?.[1];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return null;
  return host;
}

function getBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (Platform.OS !== 'web') {
    const devHost = getDevServerHost();
    if (devHost) return `http://${devHost}:3000`;
  }

  return 'http://localhost:3000';
}

const BASE_URL = getBaseUrl();
const TUNNEL_HEADERS = {
  'bypass-tunnel-reminder': 'true',
  'ngrok-skip-browser-warning': 'true',
};

function getExtension(uri = '') {
  const cleanUri = uri.split('?')[0];
  const fileName = cleanUri.split('/').pop() || '';
  const match = fileName.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() || '';
}

function getMimeType(asset, fallbackMimeType) {
  if (asset.mimeType) return asset.mimeType;

  const extension = getExtension(asset.uri);
  const mimeByExtension = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    heic: 'image/heic',
    heif: 'image/heif',
    m4a: 'audio/m4a',
    mp4: 'audio/mp4',
    aac: 'audio/aac',
    wav: 'audio/wav',
  };

  return mimeByExtension[extension] || fallbackMimeType;
}

function getUploadName(fieldName, asset, mimeType) {
  const rawName = asset.fileName || asset.name || asset.uri.split('?')[0].split('/').pop();
  if (rawName && rawName.includes('.')) return rawName.replace(/\s+/g, '-');

  const extensionByMime = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'audio/m4a': 'm4a',
    'audio/mp4': 'mp4',
    'video/mp4': 'mp4',
    'audio/aac': 'aac',
    'audio/wav': 'wav',
  };
  const extension = extensionByMime[mimeType] || (fieldName === 'image' ? 'jpg' : 'm4a');
  return `${fieldName}-${Date.now()}.${extension}`;
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return {};

  const contentType = response.headers?.get?.('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`API trả về ${response.status} dạng ${contentType || 'không rõ'} từ ${BASE_URL}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`API trả về JSON lỗi từ ${BASE_URL}`);
  }
}

function apiError(message) {
  const error = new Error(message);
  error.fromApi = true;
  return error;
}

async function unwrapResponse(response) {
  const data = await parseJson(response);
  if (!response.ok || data.success === false) throw apiError(data.error || 'Có lỗi xảy ra');
  return data;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...TUNNEL_HEADERS, 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch (error) {
    throw new Error(`Không kết nối được API tại ${BASE_URL}. Kiểm tra backend và cùng mạng Wi-Fi.`);
  }

  return unwrapResponse(response);
}

function readBlobAsBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('Không đọc được file đã chọn'));
    reader.readAsDataURL(blob);
  });
}

async function readUriAsBase64(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return readBlobAsBase64(blob);
}

async function uploadBase64(path, name, mimeType, asset) {
  const base64 = await readUriAsBase64(asset.uri);
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { ...TUNNEL_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: name, mimeType, base64 }),
  });
  return unwrapResponse(response);
}

async function upload(path, fieldName, asset, fallbackMimeType) {
  const formData = new FormData();
  const mimeType = getMimeType(asset, fallbackMimeType);
  const name = getUploadName(fieldName, asset, mimeType);

  if (Platform.OS !== 'web') {
    try {
      return await uploadBase64(path, name, mimeType, asset);
    } catch (error) {
      if (error.fromApi) throw error;
      console.warn(`[api.upload] base64 upload failed, falling back to multipart: ${error.message}`);
    }
  }

  formData.append(fieldName, {
    uri: asset.uri,
    name,
    type: mimeType,
  });

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: TUNNEL_HEADERS,
      body: formData,
    });
  } catch (error) {
    throw new Error(`Không kết nối được API tại ${BASE_URL}. Kiểm tra backend và cùng mạng Wi-Fi.`);
  }

  return unwrapResponse(response);
}

export const api = {
  getBaseUrl: () => BASE_URL,
  getBalance: () => request('/api/accounts/balance'),
  getCategories: (type) => request(`/api/categories${type ? `?type=${type}` : ''}`),
  getTransactions: (query = '') => request(`/api/transactions${query}`),
  createTransaction: (data) => request('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  deleteTransaction: (id) => request(`/api/transactions/${id}`, { method: 'DELETE' }),
  getSummary: (month, year) => request(`/api/transactions/summary?month=${month}&year=${year}`),
  sendChat: (text) => request('/api/chat/message', { method: 'POST', body: JSON.stringify({ text }) }),
  transcribeAudio: (asset) => upload('/api/speech', 'audio', asset, 'audio/m4a'),
  extractImageText: (asset) => upload('/api/ocr', 'image', asset, 'image/jpeg'),
  confirmChat: () => request('/api/chat/confirm', { method: 'POST', body: '{}' }),
  cancelChat: () => request('/api/chat/cancel', { method: 'POST', body: '{}' }),
  editChat: (data) => request('/api/chat/edit', { method: 'POST', body: JSON.stringify(data) }),
  getBudgets: (month, year) => request(`/api/budgets?month=${month}&year=${year}`),
  getBudgetProgress: (month, year) => request(`/api/budgets/progress?month=${month}&year=${year}`),
  createBudget: (data) => request('/api/budgets', { method: 'POST', body: JSON.stringify(data) }),
  deleteBudget: (id) => request(`/api/budgets/${id}`, { method: 'DELETE' }),
  getReportSummary: (month, year) => request(`/api/reports/summary?month=${month}&year=${year}`),
  getCategoryBreakdown: (month, year) => request(`/api/reports/category-breakdown?month=${month}&year=${year}`),
  getMonthlyTrend: (year) => request(`/api/reports/monthly-trend?year=${year}`),
  getAIModels: () => request('/api/ai/models'),
  setAISelection: (data) => request('/api/ai/selection', { method: 'POST', body: JSON.stringify(data) }),

  // ── REQ-06: Cashflow & Asset Management ──────────────────────────────────────
  getNetWorth: () => request('/api/cashflow/net-worth'),
  getCashflowReport: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/api/cashflow/report${qs ? '?' + qs : ''}`);
  },
  createTransfer: (data) => request('/api/cashflow/transfers', { method: 'POST', body: JSON.stringify(data) }),
  getTransfers: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/api/cashflow/transfers${qs ? '?' + qs : ''}`);
  },
  getInvestmentPnL: (walletId) => request(`/api/cashflow/investment-pnl?wallet_id=${walletId}`),
  createInvestmentPnL: (data) => request('/api/cashflow/investment-pnl', { method: 'POST', body: JSON.stringify(data) }),
  updateInvestmentPnL: (id, data) => request(`/api/cashflow/investment-pnl/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvestmentPnL: (id) => request(`/api/cashflow/investment-pnl/${id}`, { method: 'DELETE' }),

  // ── REQ-07: Export & Backup ───────────────────────────────────────────────────
  exportCSV: (filters = {}) => request('/api/export/csv', { method: 'POST', body: JSON.stringify(filters) }),
  exportPDF: (filters = {}) => request('/api/export/pdf', { method: 'POST', body: JSON.stringify(filters) }),
  createBackup: () => request('/api/export/backup', { method: 'POST', body: '{}' }),
  getExportHistory: () => request('/api/export/history'),
  deleteExportHistory: (id) => request(`/api/export/history/${id}`, { method: 'DELETE' }),
  getBackupConfig: () => request('/api/export/backup-config'),
  updateBackupConfig: (data) => request('/api/export/backup-config', { method: 'PUT', body: JSON.stringify(data) }),
  exportFromIntent: (format, filters = {}) => request('/api/export/from-intent', { method: 'POST', body: JSON.stringify({ format, filters }) }),
  getDownloadUrl: (historyId) => `${BASE_URL}/api/export/history/${historyId}/download`,

  // ── REQ-08: Recurring Bills & Reminders ──────────────────────────────────────
  getRecurringBills: () => request('/api/recurring'),
  getRecurringDue: () => request('/api/recurring/due'),
  getRecurringSuggestions: () => request('/api/recurring/suggestions'),
  dismissRecurringSuggestion: (signature) => request('/api/recurring/suggestions/dismiss', { method: 'POST', body: JSON.stringify({ signature }) }),
  createRecurringBill: (data) => request('/api/recurring', { method: 'POST', body: JSON.stringify(data) }),
  updateRecurringBill: (id, data) => request(`/api/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecurringBill: (id) => request(`/api/recurring/${id}`, { method: 'DELETE' }),
  pauseRecurringBill: (id) => request(`/api/recurring/${id}/pause`, { method: 'POST', body: '{}' }),
  resumeRecurringBill: (id) => request(`/api/recurring/${id}/resume`, { method: 'POST', body: '{}' }),
  getRecurringPayments: (id) => request(`/api/recurring/${id}/payments`),
  payRecurringBill: (id, data = {}) => request(`/api/recurring/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
};

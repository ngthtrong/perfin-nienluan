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

async function parseJson(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`API không trả về JSON hợp lệ từ ${BASE_URL}`);
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch (error) {
    throw new Error(`Không kết nối được API tại ${BASE_URL}. Kiểm tra backend và cùng mạng Wi-Fi.`);
  }

  const data = await parseJson(response);
  if (!response.ok || data.success === false) throw new Error(data.error || 'Có lỗi xảy ra');
  return data;
}

async function upload(path, fieldName, asset, fallbackMimeType) {
  const formData = new FormData();
  const uriParts = asset.uri.split('/');
  const name = asset.fileName || uriParts[uriParts.length - 1] || `${fieldName}-${Date.now()}`;

  formData.append(fieldName, {
    uri: asset.uri,
    name,
    type: asset.mimeType || fallbackMimeType,
  });

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    throw new Error(`Không kết nối được API tại ${BASE_URL}. Kiểm tra backend và cùng mạng Wi-Fi.`);
  }

  const data = await parseJson(response);
  if (!response.ok || data.success === false) throw new Error(data.error || 'Có lỗi xảy ra');
  return data;
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
};

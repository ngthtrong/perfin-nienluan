const crypto = require('crypto');
const { GoogleGenAI, FunctionCallingConfigMode } = require('@google/genai');
const { getSystemPrompt, getParsePrompt, getChatPrompt, getReceiptPrompt, getVoicePrompt, getInsightPrompt } = require('../prompts/transaction.prompt');
const { fallbackInsightText } = require('./analytics/narrator.fallback');
const { matchCategory, normalizeText, parseLocalTransaction } = require('./parser.service');
const { routeLocalIntent } = require('./ai/localIntentRouter');
const { FINANCIAL_TOOL_DECLARATIONS, toolCallToIntent } = require('./ai/toolDeclarations');
const KVStore = require('./store/kv.store');

// Danh sách model Gemini được phép sử dụng
const ALLOWED_GEMINI_MODELS = [
  'gemini-3.1-flash-lite',   // Mặc định — nhanh, tiết kiệm token
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash-preview',  // gemini-3 flash
  'gemini-3.5-flash',        // gemini-3.5 flash
];

const DEFAULT_MODELS = {
  gemini: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
};

const FALLBACK_MODELS = {
  gemini: [
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.5-flash',
  ],
};
const MODEL_LIST_TIMEOUT_MS = Number(process.env.AI_MODEL_LIST_TIMEOUT_MS || 5000);

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), MODEL_LIST_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function normalizeTransaction(tx, categories) {
  const category = matchCategory(tx.category_name, categories, tx.type || 'expense');
  return {
    description: String(tx.description || '').trim(),
    amount: Number(tx.amount),
    type: tx.type || 'expense',
    category_id: category ? category.id : tx.category_id,
    category_name: category ? category.name : tx.category_name,
    category_icon: category ? category.icon : '📦',
    transaction_date: tx.transaction_date || tx.date || new Date().toISOString().slice(0, 10),
    confidence: Number(tx.confidence || 0.7),
  };
}

function normalizeAIResponse(parsed, categories) {
  if (!parsed) return parsed;
  const input = Array.isArray(parsed.transactions)
    ? parsed.transactions
    : parsed.transaction ? [parsed.transaction] : [];
  if (!input.length) return parsed;
  const transactions = input.map((tx) => normalizeTransaction(tx, categories));
  return {
    ...parsed,
    intent: transactions.length > 1 ? 'transactions' : 'transaction',
    transaction: transactions[0],
    transactions,
    needs_clarification: transactions.some((tx) => !tx.description || !(tx.amount > 0)),
  };
}

function parseCacheKey(text, categories, userPrompt) {
  const categoryVersion = categories.map((cat) => `${cat.id}:${cat.name}:${cat.type}`).join('|');
  const digest = crypto.createHash('sha256')
    .update(`${normalizeText(text)}\n${userPrompt || ''}\n${categoryVersion}`)
    .digest('hex');
  return `cache:ai-parse:${digest}`;
}

function enforceInsightUnits(text, facts) {
  let safe = String(text || '');
  if (facts?.runway?.avgBurn) {
    safe = safe
      .replace(/(mức chi tiêu trung bình)\s+(?:hàng|mỗi)\s+tháng/gi, '$1 mỗi ngày')
      .replace(/(chi tiêu trung bình[^\n.]{0,40})\/tháng/gi, '$1/ngày');
  }
  return safe;
}

class AIServiceManager {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'gemini';
    this.selected = {
      provider: this.provider === 'local' ? 'local' : 'gemini',
      models: { ...DEFAULT_MODELS },
    };
    this.gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
    this.modelCache = { gemini: null };
  }

  async parseWithGemini(text, categories, userPrompt) {
    const prompt = userPrompt || getParsePrompt(text);
    const response = await this.gemini.models.generateContent({
      model: this.selected.models.gemini,
      contents: [{ role: 'user', parts: [{ text: `${getSystemPrompt(categories)}\n${prompt}` }] }],
      config: {
        temperature: 0.1,
        maxOutputTokens: 1536,
        tools: [{ functionDeclarations: FINANCIAL_TOOL_DECLARATIONS }],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
      },
    });
    const calls = response.functionCalls || [];
    if (calls.length) {
      const commands = calls.map(toolCallToIntent).filter(Boolean);
      if (commands.length) {
        return normalizeAIResponse({ ...commands[0], follow_up: commands.slice(1) }, categories);
      }
    }
    return {
      intent: 'question',
      needs_clarification: false,
      chat_response: String(response.text || '').trim() || null,
    };
  }

  async parseTransaction(text, categories, userPrompt) {
    const cacheKey = parseCacheKey(text, categories, userPrompt);
    const cached = await KVStore.get(cacheKey);
    if (cached) return { ...cached, cache_hit: true };
    const providers = this.getProviderOrder();
    for (const provider of providers) {
      try {
        const started = Date.now();
        const parsed = await this.parseWithGemini(text, categories, userPrompt);
        console.log(`[AIService] ${provider} parse ok ${Date.now() - started}ms`);
        const result = { success: true, provider_used: provider, model: this.selected.models[provider], ...parsed };
        await KVStore.set(cacheKey, result, 180);
        return result;
      } catch (error) {
        console.warn(`[AIService] ${provider} parse failed: ${error.message}`);
      }
    }
    const result = { success: true, provider_used: 'local', ...routeLocalIntent(text, categories) };
    await KVStore.set(cacheKey, result, 60);
    return result;
  }

  // Extract a transaction from OCR receipt text or a voice transcript using a specialized
  // prompt, falling back to the regex parser when no LLM provider is available.
  async parseFromMedia(text, categories, sourceType = 'receipt') {
    const cleanText = String(text || '').trim();
    if (!cleanText) return { success: true, provider_used: 'local', ...parseLocalTransaction('', categories) };
    const userPrompt = sourceType === 'voice' ? getVoicePrompt(cleanText) : getReceiptPrompt(cleanText);
    return this.parseTransaction(cleanText, categories, userPrompt);
  }

  async chat(text, context = {}) {
    const providers = this.getProviderOrder();
    for (const provider of providers) {
      try {
        if (provider === 'gemini') {
          const response = await this.gemini.models.generateContent({
            model: this.selected.models.gemini,
            contents: getChatPrompt(text, context),
          });
          return { success: true, provider_used: 'gemini', model: this.selected.models.gemini, text: response.text };
        }
      } catch (error) {
        console.warn(`[AIService] ${provider} chat failed: ${error.message}`);
      }
    }
    return { success: true, provider_used: 'local', text: 'Mình có thể giúp bạn ghi nhận thu chi, xem số dư, ngân sách và báo cáo tháng này.' };
  }

  // Narrate pre-computed analytics facts in the given persona voice. Falls back to a
  // deterministic template when no LLM is available, so insights always render.
  async narrateInsights(facts, { stylePrompt = '', periodLabel = 'gần đây' } = {}) {
    const digest = crypto.createHash('sha256')
      .update(JSON.stringify({ version: 2, facts, stylePrompt, periodLabel }))
      .digest('hex');
    const cacheKey = `cache:ai-insight:${digest}`;
    const cached = await KVStore.get(cacheKey);
    if (cached) return { ...cached, cache_hit: true };
    const providers = this.getProviderOrder();
    for (const provider of providers) {
      try {
        if (provider === 'gemini') {
          const response = await this.gemini.models.generateContent({
            model: this.selected.models.gemini,
            contents: getInsightPrompt(facts, { stylePrompt, periodLabel }),
            config: { temperature: 0.4, maxOutputTokens: 1024 },
          });
          const result = { success: true, provider_used: 'gemini', model: this.selected.models.gemini, text: enforceInsightUnits(response.text, facts) };
          await KVStore.set(cacheKey, result, 300);
          return result;
        }
      } catch (error) {
        console.warn(`[AIService] ${provider} insight failed: ${error.message}`);
      }
    }
    const result = { success: true, provider_used: 'local', text: fallbackInsightText(facts) };
    await KVStore.set(cacheKey, result, 120);
    return result;
  }

  getProviderOrder() {
    if (this.selected.provider === 'local') return [];
    if (this.selected.provider === 'gemini' && this.gemini) return ['gemini'];
    return [];
  }

  async getGeminiModels() {
    if (!this.gemini) return [];
    if (this.modelCache.gemini) return this.modelCache.gemini;
    try {
      const allModels = await withTimeout(this.fetchGeminiModels(), 'Gemini model list');
      // Chỉ giữ lại models nằm trong danh sách cho phép
      const filtered = allModels.filter((m) => ALLOWED_GEMINI_MODELS.includes(m));
      this.modelCache.gemini = filtered.length ? filtered : FALLBACK_MODELS.gemini;
    } catch (error) {
      console.warn(`[AIService] gemini model list failed: ${error.message}`);
      this.modelCache.gemini = FALLBACK_MODELS.gemini;
    }
    return this.modelCache.gemini;
  }

  async fetchGeminiModels() {
    const result = await this.gemini.models.list();
    const models = [];
    for await (const model of result) {
      const name = String(model.name || model.id || '').replace(/^models\//, '');
      const actions = model.supportedActions || [];
      if (name && (!actions.length || actions.includes('generateContent'))) models.push(name);
    }
    return models;
  }

  async getModels() {
    const gemini = await this.getGeminiModels();
    return {
      gemini: { status: this.gemini ? 'available' : 'not_configured', selected: this.selected.models.gemini, models: gemini },
      local: { status: 'available', selected: 'local', models: ['local'] },
    };
  }

  async setSelection({ provider, model }) {
    const nextProvider = provider || this.selected.provider;
    if (!['gemini', 'local'].includes(nextProvider)) throw new Error('Provider không hợp lệ. Chỉ hỗ trợ: gemini, local');
    if (nextProvider === 'gemini' && !this.gemini) throw new Error('GEMINI_API_KEY chưa được cấu hình');

    if (nextProvider === 'gemini') {
      // Validate model nằm trong danh sách cho phép
      if (model && !ALLOWED_GEMINI_MODELS.includes(model)) {
        throw new Error(`Model không hợp lệ. Các model được phép: ${ALLOWED_GEMINI_MODELS.join(', ')}`);
      }
      const models = await this.getGeminiModels();
      if (model && !models.includes(model)) throw new Error('Model không có trong danh sách khả dụng');
      this.selected.models[nextProvider] = model || this.selected.models[nextProvider];
    }
    this.selected.provider = nextProvider;
    return this.getStatus();
  }

  getStatus() {
    return {
      mode: this.provider,
      selected_provider: this.selected.provider,
      selected_models: this.selected.models,
      gemini: this.gemini ? 'available' : 'not_configured',
      local: 'available',
      allowed_models: ALLOWED_GEMINI_MODELS,
    };
  }
}

module.exports = new AIServiceManager();
module.exports.AIServiceManager = AIServiceManager;
module.exports.normalizeAIResponse = normalizeAIResponse;
module.exports.enforceInsightUnits = enforceInsightUnits;

const { GoogleGenAI } = require('@google/genai');
const { getSystemPrompt, getParsePrompt, getChatPrompt, getReceiptPrompt, getVoicePrompt } = require('../prompts/transaction.prompt');
const { matchCategory, parseLocalTransaction } = require('./parser.service');

const DEFAULT_MODELS = {
  gemini: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  chatgpt: process.env.OPENAI_MODEL || 'gpt-4o-mini',
};

const FALLBACK_MODELS = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
  chatgpt: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
};
const MODEL_LIST_TIMEOUT_MS = Number(process.env.AI_MODEL_LIST_TIMEOUT_MS || 5000);

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), MODEL_LIST_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function normalizeAIResponse(parsed, categories) {
  if (parsed.intent !== 'transaction' || !parsed.transaction) return parsed;
  const tx = parsed.transaction;
  const category = matchCategory(tx.category_name, categories, tx.type || 'expense');
  return {
    ...parsed,
    transaction: {
      description: tx.description,
      amount: Number(tx.amount),
      type: tx.type || 'expense',
      category_id: category ? category.id : tx.category_id,
      category_name: category ? category.name : tx.category_name,
      category_icon: category ? category.icon : '📦',
      transaction_date: tx.transaction_date || tx.date || new Date().toISOString().slice(0, 10),
      confidence: Number(tx.confidence || 0.7),
    },
  };
}

class AIServiceManager {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'auto';
    this.selected = {
      provider: this.provider === 'local' ? 'local' : this.provider === 'chatgpt' ? 'chatgpt' : 'gemini',
      models: { ...DEFAULT_MODELS },
    };
    this.gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.modelCache = { gemini: null, chatgpt: null };
  }

  async parseWithGemini(text, categories, userPrompt) {
    const prompt = userPrompt || getParsePrompt(text);
    const response = await this.gemini.models.generateContent({
      model: this.selected.models.gemini,
      contents: [{ role: 'user', parts: [{ text: `${getSystemPrompt(categories)}\n${prompt}` }] }],
      config: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 1024 },
    });
    return normalizeAIResponse(JSON.parse(response.text), categories);
  }

  async parseWithChatGPT(text, categories, userPrompt) {
    const prompt = userPrompt || getParsePrompt(text);
    const response = await this.openAIRequest('/chat/completions', {
      model: this.selected.models.chatgpt,
      messages: [
        { role: 'system', content: getSystemPrompt(categories) },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1024,
    });
    const content = response.choices?.[0]?.message?.content || '{}';
    return normalizeAIResponse(JSON.parse(content), categories);
  }

  async parseTransaction(text, categories, userPrompt) {
    const providers = this.getProviderOrder();
    for (const provider of providers) {
      try {
        const started = Date.now();
        const parsed = provider === 'gemini'
          ? await this.parseWithGemini(text, categories, userPrompt)
          : await this.parseWithChatGPT(text, categories, userPrompt);
        console.log(`[AIService] ${provider} parse ok ${Date.now() - started}ms`);
        return { success: true, provider_used: provider, model: this.selected.models[provider], ...parsed };
      } catch (error) {
        console.warn(`[AIService] ${provider} parse failed: ${error.message}`);
      }
    }
    return { success: true, provider_used: 'local', ...parseLocalTransaction(text, categories) };
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
        const response = await this.openAIRequest('/chat/completions', {
          model: this.selected.models.chatgpt,
          messages: [{ role: 'user', content: getChatPrompt(text, context) }],
          temperature: 0.2,
          max_tokens: 1024,
        });
        return { success: true, provider_used: 'chatgpt', model: this.selected.models.chatgpt, text: response.choices?.[0]?.message?.content || '' };
      } catch (error) {
        console.warn(`[AIService] ${provider} chat failed: ${error.message}`);
      }
    }
    return { success: true, provider_used: 'local', text: 'Mình có thể giúp bạn ghi nhận thu chi, xem số dư, ngân sách và báo cáo tháng này.' };
  }

  getProviderOrder() {
    if (this.provider === 'local') return [];
    if (this.selected.provider === 'gemini' && this.gemini) return ['gemini'];
    if (this.selected.provider === 'chatgpt' && this.openaiApiKey) return ['chatgpt'];
    const order = [];
    if (this.gemini) order.push('gemini');
    if (this.openaiApiKey) order.push('chatgpt');
    return order;
  }

  async openAIRequest(path, body) {
    if (!this.openaiApiKey) throw new Error('OPENAI_API_KEY is not configured');
    const response = await fetch(`https://api.openai.com/v1${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `OpenAI HTTP ${response.status}`);
    return data;
  }

  async getGeminiModels() {
    if (!this.gemini) return [];
    if (this.modelCache.gemini) return this.modelCache.gemini;
    try {
      const models = await withTimeout(this.fetchGeminiModels(), 'Gemini model list');
      this.modelCache.gemini = models.length ? models : FALLBACK_MODELS.gemini;
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

  async getChatGPTModels() {
    if (!this.openaiApiKey) return [];
    if (this.modelCache.chatgpt) return this.modelCache.chatgpt;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_LIST_TIMEOUT_MS);
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${this.openaiApiKey}` },
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || `OpenAI HTTP ${response.status}`);
      this.modelCache.chatgpt = (data.data || [])
        .map((model) => model.id)
        .filter((id) => /^(gpt-|o[0-9]|chatgpt-)/.test(id))
        .sort();
    } catch (error) {
      console.warn(`[AIService] chatgpt model list failed: ${error.message}`);
      this.modelCache.chatgpt = FALLBACK_MODELS.chatgpt;
    } finally {
      clearTimeout(timer);
    }
    return this.modelCache.chatgpt;
  }

  async getModels() {
    const [gemini, chatgpt] = await Promise.all([this.getGeminiModels(), this.getChatGPTModels()]);
    return {
      gemini: { status: this.gemini ? 'available' : 'not_configured', selected: this.selected.models.gemini, models: gemini },
      chatgpt: { status: this.openaiApiKey ? 'available' : 'not_configured', selected: this.selected.models.chatgpt, models: chatgpt },
      local: { status: 'available', selected: 'local', models: ['local'] },
    };
  }

  async setSelection({ provider, model }) {
    const nextProvider = provider || this.selected.provider;
    if (!['gemini', 'chatgpt', 'local', 'auto'].includes(nextProvider)) throw new Error('Provider không hợp lệ');
    if (nextProvider === 'gemini' && !this.gemini) throw new Error('GEMINI_API_KEY chưa được cấu hình');
    if (nextProvider === 'chatgpt' && !this.openaiApiKey) throw new Error('OPENAI_API_KEY chưa được cấu hình');

    if (nextProvider === 'gemini' || nextProvider === 'chatgpt') {
      const models = nextProvider === 'gemini' ? await this.getGeminiModels() : await this.getChatGPTModels();
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
      chatgpt: this.openaiApiKey ? 'available' : 'not_configured',
      local: 'available',
    };
  }
}

module.exports = new AIServiceManager();

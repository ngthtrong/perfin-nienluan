// Vai trò: Chọn provider và hợp nhất parser cục bộ với Gemini cho các tác vụ AI.
// Luồng chính: ưu tiên intent an toàn, chuẩn hóa output rồi fallback mà không tự ghi dữ liệu.

const crypto = require('crypto');
const { GoogleGenAI, FunctionCallingConfigMode } = require('@google/genai');
const { getSystemPrompt, getParsePrompt, getChatPrompt, getReceiptPrompt, getVoicePrompt, getInsightPrompt } = require('../prompts/transaction.prompt');
const { fallbackInsightText } = require('./analytics/narrator.fallback');
const { matchCategory, normalizeText, parseLocalTransaction } = require('./parser.service');
const { routeLocalIntent } = require('./ai/localIntentRouter');
const { FINANCIAL_TOOL_DECLARATIONS, toolCallToIntent } = require('./ai/toolDeclarations');
const KVStore = require('./store/kv.store');
const { localDateKey } = require('./transactions/validation');

// Danh sách model Gemini được phép sử dụng
const ALLOWED_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

const configuredGeminiModel = process.env.GEMINI_MODEL;
const DEFAULT_MODELS = {
  gemini: ALLOWED_GEMINI_MODELS.includes(configuredGeminiModel)
    ? configuredGeminiModel
    : 'gemini-3.1-flash-lite',
};

const FALLBACK_MODELS = {
  gemini: [...ALLOWED_GEMINI_MODELS],
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
    transaction_date: tx.transaction_date || tx.date || localDateKey(),
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

function combineMediaContext(extractedText, contextText = '') {
  const extracted = String(extractedText || '').trim();
  const context = String(contextText || '').trim();
  if (!context) return extracted;
  return `Ngữ cảnh người dùng cung cấp cùng ảnh:\n${context}\n\nVăn bản OCR:\n${extracted}`;
}

function parseCacheKey(text, categories, userPrompt) {
  const categoryVersion = categories.map((cat) => `${cat.id}:${cat.name}:${cat.type}`).join('|');
  const digest = crypto.createHash('sha256')
    .update(`${normalizeText(text)}\n${userPrompt || ''}\n${categoryVersion}`)
    .digest('hex');
  return `cache:ai-parse:${digest}`;
}

// Only a local parse that is unambiguous may skip the LLM. The previous version
// pre-empted every query_transactions/query_insights parse, which meant a vague
// question ("tuần này tôi xài bao nhiêu") was answered from a weak regex parse
// even though the model routed it correctly. A short recurring acknowledgement
// stays deterministic: it answers a reminder the server itself just sent.
function isPriorityLocalIntent(parsed) {
  if (parsed?.intent === 'recurring_pay' && parsed?.recurring?.acknowledgement === true) return true;
  if (parsed?.intent !== 'query_transactions') return false;
  if (parsed.local_confidence === 'low') return false;
  const spec = parsed.query || {};
  // A filter the model could not invent on its own: an exact category, a
  // server-produced referent, or a period the user named explicitly.
  return Boolean(spec.category_id || spec.reference || spec.period || spec.month);
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

  // Parse giao dịch qua provider được chọn và tự fallback về parser cục bộ khi cần.
  async parseTransaction(text, categories, userPrompt) {
    // These intents are deterministic, high-confidence questions/answers rather
    // than transaction extraction. Resolve them before provider/cache lookup so
    // an enabled LLM cannot collapse a filtered listing into the whole-month
    // summary or interpret a short recurring acknowledgement as an incomplete
    // ad-hoc transaction. Actual writes still pass through preview + confirm.
    const localIntent = routeLocalIntent(text, categories);
    if (isPriorityLocalIntent(localIntent)) {
      return { success: true, provider_used: 'local', ...localIntent };
    }
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
  async parseFromMedia(text, categories, sourceType = 'receipt', contextText = '') {
    const cleanText = String(text || '').trim();
    if (!cleanText) return { success: true, provider_used: 'local', ...parseLocalTransaction('', categories) };
    const context = sourceType === 'receipt' ? String(contextText || '').trim() : '';
    const localExtractionText = context ? `${context}\n${cleanText}` : cleanText;
    const userPrompt = sourceType === 'voice' ? getVoicePrompt(cleanText) : getReceiptPrompt(cleanText, context);
    const parsed = await this.parseTransaction(cleanText, categories, userPrompt);
    const transactions = parsed?.transactions || (parsed?.transaction ? [parsed.transaction] : []);
    const hasUsableTransaction = transactions.some((transaction) => (
      String(transaction?.description || '').trim()
      && Number(transaction?.amount) > 0
      && ['income', 'expense'].includes(transaction?.type)
    ));
    if (hasUsableTransaction) return parsed;

    // A provider may answer the extraction prompt as ordinary prose instead of a
    // tool call. Media confirmation is transaction-only, so try the deterministic
    // parser before returning a structured clarification to the user.
    const local = parseLocalTransaction(localExtractionText, categories);
    return {
      success: true,
      provider_used: 'local',
      fallback_from: parsed?.provider_used || null,
      ...local,
    };
  }

  // Trả intent/lời đáp có cấu trúc; mọi side effect vẫn được chat route quyết định.
  async chat(text, context = {}) {
    const normalized = normalizeText(text);
    if (/(ban la ai|ban ten gi)/.test(normalized)) {
      return {
        success: true,
        provider_used: 'local',
        text: 'Mình là PERFIN, trợ lý quản lý tài chính cá nhân. Mình hỗ trợ bạn ghi nhận và phân tích dữ liệu; mọi thay đổi tiền bạc đều cần bạn xác nhận.',
      };
    }
    if (/(ban co the lam gi|ban giup duoc gi)/.test(normalized)) {
      return {
        success: true,
        provider_used: 'local',
        text: 'Mình có thể ghi thu chi từ văn bản, ảnh hoặc giọng nói; quản lý ví, ngân sách, mục tiêu và khoản định kỳ; đồng thời tạo phân tích từ số liệu đã lưu.',
      };
    }
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
  // Chỉ diễn giải facts có sẵn và cưỡng chế đơn vị để tránh thay đổi ý nghĩa con số.
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
module.exports.isPriorityLocalIntent = isPriorityLocalIntent;
module.exports.combineMediaContext = combineMediaContext;

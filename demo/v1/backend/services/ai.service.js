const { GoogleGenAI } = require('@google/genai');
const { getSystemPrompt, getParsePrompt, getChatPrompt } = require('../prompts/transaction.prompt');
const { matchCategory, parseLocalTransaction } = require('./parser.service');

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
    this.gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
  }

  async parseTransaction(text, categories) {
    if (this.gemini && this.provider !== 'local') {
      try {
        const started = Date.now();
        const response = await this.gemini.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: `${getSystemPrompt(categories)}\n${getParsePrompt(text)}` }] }],
          config: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 1024 },
        });
        const parsed = normalizeAIResponse(JSON.parse(response.text), categories);
        console.log(`[AIService] gemini parse ok ${Date.now() - started}ms`);
        return { success: true, provider_used: 'gemini', ...parsed };
      } catch (error) {
        console.warn(`[AIService] gemini failed, using local parser: ${error.message}`);
      }
    }
    return { success: true, provider_used: 'local', ...parseLocalTransaction(text, categories) };
  }

  async chat(text, context = {}) {
    if (this.gemini && this.provider !== 'local') {
      try {
        const response = await this.gemini.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: getChatPrompt(text, context),
        });
        return { success: true, provider_used: 'gemini', text: response.text };
      } catch (error) {
        console.warn(`[AIService] gemini chat failed: ${error.message}`);
      }
    }
    return { success: true, provider_used: 'local', text: 'Mình có thể giúp bạn ghi nhận thu chi, xem số dư, ngân sách và báo cáo tháng này.' };
  }

  getStatus() {
    return { mode: this.provider, gemini: this.gemini ? 'available' : 'not_configured', local: 'available' };
  }
}

module.exports = new AIServiceManager();

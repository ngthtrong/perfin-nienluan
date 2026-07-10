const AiFeedbackModel = require('../../models/aiFeedback.model');
const { normalizeForMatch, textSimilarity } = require('./textSimilarity');

function extractTransactionResult(result) {
  if (!result || typeof result !== 'object') return {};
  return result.transaction && typeof result.transaction === 'object' ? result.transaction : result;
}

function extractCategory(result) {
  const value = extractTransactionResult(result);
  const id = value.category_id ?? value.categoryId ?? null;
  const name = value.category_name ?? value.categoryName ?? null;
  if (id === null && !name) return null;
  return { category_id: id, category_name: name };
}

function correctionKey(category) {
  if (!category) return null;
  return category.category_id !== null && category.category_id !== undefined
    ? `id:${category.category_id}`
    : `name:${normalizeForMatch(category.category_name)}`;
}

function isUsefulClassificationCorrection(log) {
  if (!log || log.feedback_type !== 'classification' || !log.original_text) return false;
  const aiCategory = extractCategory(log.ai_result);
  const correctedCategory = extractCategory(log.corrected_result);
  return Boolean(correctedCategory && correctionKey(aiCategory) !== correctionKey(correctedCategory));
}

function rankFewShotExamples(logs = [], input = '', options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 5), 1), 20);
  const minimumScore = options.minimumScore ?? 0.35;
  const seen = new Set();
  return logs
    .filter(isUsefulClassificationCorrection)
    .map((log) => ({
      input: log.original_text,
      ai_category: extractCategory(log.ai_result),
      corrected_category: extractCategory(log.corrected_result),
      similarity: textSimilarity(input, log.original_text),
      created_at: log.created_at,
    }))
    .filter((example) => example.similarity >= minimumScore)
    .sort((left, right) => right.similarity - left.similarity || new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .filter((example) => {
      const key = `${normalizeForMatch(example.input)}:${correctionKey(example.corrected_category)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function lookupCategoryCorrection(logs = [], input = '', options = {}) {
  const normalizedInput = normalizeForMatch(input);
  if (!normalizedInput) return null;
  const candidates = logs
    .filter(isUsefulClassificationCorrection)
    .map((log) => ({
      log,
      category: extractCategory(log.corrected_result),
      score: textSimilarity(normalizedInput, log.original_text),
      exact: normalizedInput === normalizeForMatch(log.original_text),
    }))
    .filter((item) => item.score >= (item.exact ? 1 : (options.minimumScore ?? 0.88)));
  if (!candidates.length) return null;

  const grouped = new Map();
  for (const candidate of candidates) {
    const key = correctionKey(candidate.category);
    const current = grouped.get(key) || { category: candidate.category, weight: 0, support: 0, bestScore: 0, exact: false };
    current.weight += candidate.score;
    current.support += 1;
    current.bestScore = Math.max(current.bestScore, candidate.score);
    current.exact ||= candidate.exact;
    grouped.set(key, current);
  }
  const ranked = [...grouped.values()].sort((left, right) => right.weight - left.weight || right.bestScore - left.bestScore);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const totalWeight = ranked.reduce((sum, item) => sum + item.weight, 0);
  const agreement = totalWeight ? best.weight / totalWeight : 0;
  if (runnerUp && agreement < (options.minimumAgreement ?? 0.67)) return null;
  if (!best.exact && best.bestScore < (options.minimumScore ?? 0.88)) return null;

  return {
    ...best.category,
    confidence: Number((best.bestScore * agreement).toFixed(3)),
    support: best.support,
    match_kind: best.exact ? 'feedback_exact' : 'feedback_fuzzy',
  };
}

function formatFewShotExamples(examples = []) {
  return examples.map((example) => ({
    user_input: example.input,
    incorrect_category: example.ai_category?.category_name || example.ai_category?.category_id || null,
    correct_category: example.corrected_category?.category_name || example.corrected_category?.category_id || null,
  }));
}

const FeedbackService = {
  async recordClassificationCorrection({ userId, transactionId, originalText, aiResult, correctedResult }) {
    if (!extractCategory(correctedResult)) {
      const error = new Error('Phản hồi phân loại phải có category_id hoặc category_name');
      error.status = 400;
      throw error;
    }
    return AiFeedbackModel.create({
      userId,
      transactionId,
      feedbackType: 'classification',
      originalText,
      aiResult,
      correctedResult,
    });
  },

  async recordExtractionCorrection({ userId, transactionId, originalText, aiResult, correctedResult }) {
    return AiFeedbackModel.create({
      userId,
      transactionId,
      feedbackType: 'extraction',
      originalText,
      aiResult,
      correctedResult,
    });
  },

  async getFewShotExamples(userId, input, options = {}) {
    const logs = await AiFeedbackModel.getClassificationCandidates(userId, options.candidateLimit || 200);
    return rankFewShotExamples(logs, input, options);
  },

  async findCategoryCorrection(userId, input, options = {}) {
    const logs = await AiFeedbackModel.getClassificationCandidates(userId, options.candidateLimit || 200);
    return lookupCategoryCorrection(logs, input, options);
  },
};

module.exports = FeedbackService;
module.exports.extractCategory = extractCategory;
module.exports.isUsefulClassificationCorrection = isUsefulClassificationCorrection;
module.exports.rankFewShotExamples = rankFewShotExamples;
module.exports.lookupCategoryCorrection = lookupCategoryCorrection;
module.exports.formatFewShotExamples = formatFewShotExamples;


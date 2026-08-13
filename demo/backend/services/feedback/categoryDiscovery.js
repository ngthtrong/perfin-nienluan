// Vai trò: Phát hiện cụm giao dịch có thể cần danh mục mới và dựng kế hoạch retag.
// Luồng chính: chuẩn hóa mô tả, gom theo độ tương đồng, lọc bằng chứng rồi validation tên đề xuất.

const { normalizeForMatch, textSimilarity } = require('./textSimilarity');
const { findSafeCategoryMatch } = require('./categoryMatcher');

const GENERIC_DESCRIPTIONS = new Set([
  'giao dich',
  'chi tieu',
  'thanh toan',
  'mua hang',
  'khac',
  'expense',
]);

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum);
}

function validateCategoryType(value) {
  if (!['income', 'expense'].includes(value)) {
    const error = new Error('Loại danh mục phải là income hoặc expense');
    error.status = 400;
    throw error;
  }
  return value;
}

function cleanDescription(value = '') {
  return String(value)
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:k|nghìn|ngàn|triệu|tr|tỷ|vnd|đ|dong)?\b/gi, ' ')
    .replace(/\b(?:hôm nay|hôm qua|hôm kia)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;:!?-]+|[\s,.;:!?-]+$/g, '')
    .trim();
}

function canonicalizeDescription(value = '') {
  return normalizeForMatch(cleanDescription(value));
}

function titleFromEvidence(value = '') {
  const cleaned = cleanDescription(value).slice(0, 100);
  return cleaned ? cleaned.charAt(0).toLocaleUpperCase('vi-VN') + cleaned.slice(1) : '';
}

function monthKey(value) {
  if (!value) return null;
  const direct = String(value).match(/^(\d{4})-(\d{2})/);
  if (direct) return `${direct[1]}-${direct[2]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 7);
}

function clusterTransactions(transactions, threshold = 0.9) {
  const clusters = [];
  for (const transaction of transactions) {
    const canonical = canonicalizeDescription(transaction.description || transaction.original_text);
    if (canonical.length < 3 || GENERIC_DESCRIPTIONS.has(canonical)) continue;
    let cluster = clusters.find((item) => item.canonical === canonical);
    if (!cluster && canonical.length >= 6) {
      const ranked = clusters
        .map((item) => ({ item, score: textSimilarity(canonical, item.canonical) }))
        .sort((left, right) => right.score - left.score);
      if (ranked[0]?.score >= threshold && (!ranked[1] || ranked[0].score - ranked[1].score >= 0.05)) {
        cluster = ranked[0].item;
      }
    }
    if (!cluster) {
      cluster = { canonical, transactions: [], labels: new Map() };
      clusters.push(cluster);
    }
    cluster.transactions.push(transaction);
    const label = titleFromEvidence(transaction.description || transaction.original_text);
    cluster.labels.set(label, (cluster.labels.get(label) || 0) + 1);
  }
  return clusters;
}

// Tìm cluster đủ support mà chưa khớp an toàn với category hiện có.
function discoverCategorySuggestions(transactions = [], existingCategories = [], options = {}) {
  const type = validateCategoryType(options.type || 'expense');
  const minimumOccurrences = boundedInteger(options.minimumOccurrences, 3, 2, 20);
  const maxSuggestions = boundedInteger(options.maxSuggestions, 5, 1, 20);
  const candidates = transactions.filter((transaction) => !transaction.type || transaction.type === type);
  const totalCandidates = candidates.length || 1;

  return clusterTransactions(candidates, options.clusterThreshold || 0.9)
    .filter((cluster) => cluster.transactions.length >= minimumOccurrences)
    .map((cluster) => {
      const labels = [...cluster.labels.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'vi'));
      const suggestedName = labels[0]?.[0] || titleFromEvidence(cluster.canonical);
      const existingMatch = findSafeCategoryMatch(suggestedName, existingCategories, {
        type,
        aliases: options.aliases || {},
        minSimilarity: options.existingCategoryThreshold || 0.86,
        minMargin: 0.08,
      });
      if (existingMatch.category && normalizeForMatch(existingMatch.category.name) !== 'khac' && existingMatch.matchKind !== 'fallback') {
        return null;
      }
      const months = new Set(cluster.transactions.map((transaction) => monthKey(transaction.transaction_date)).filter(Boolean));
      const totalAmount = cluster.transactions.reduce((sum, transaction) => sum + Math.max(Number(transaction.amount) || 0, 0), 0);
      const confidence = Math.min(
        0.95,
        0.55 + Math.min(cluster.transactions.length - minimumOccurrences + 1, 5) * 0.05 + (months.size >= 2 ? 0.1 : 0)
      );
      return {
        suggested_name: suggestedName,
        type,
        transaction_ids: cluster.transactions.map((transaction) => Number(transaction.id)).filter(Number.isInteger),
        occurrences: cluster.transactions.length,
        total_amount: totalAmount,
        average_amount: cluster.transactions.length ? Math.round(totalAmount / cluster.transactions.length) : 0,
        observed_months: months.size,
        share_of_other: Number((cluster.transactions.length / totalCandidates).toFixed(3)),
        confidence: Number(confidence.toFixed(2)),
        evidence: labels.slice(0, 3).map(([description, count]) => ({ description, count })),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.occurrences - left.occurrences || right.total_amount - left.total_amount)
    .slice(0, maxSuggestions);
}

function validateSuggestedCategoryName(value) {
  const name = String(value || '').trim();
  const normalized = normalizeForMatch(name);
  if (name.length < 2 || name.length > 100 || GENERIC_DESCRIPTIONS.has(normalized) || normalized === 'khac') {
    const error = new Error('Tên danh mục đề xuất không đủ cụ thể');
    error.status = 400;
    throw error;
  }
  return name;
}

// Khóa suggestion thành danh sách transaction cụ thể để người dùng xem trước retag.
function buildRetagPlan(input, options = {}) {
  const ids = [...new Set((input.transaction_ids || input.transactionIds || [])
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) {
    const error = new Error('Kế hoạch re-tag phải có ít nhất một giao dịch');
    error.status = 400;
    throw error;
  }
  const name = validateSuggestedCategoryName(input.suggested_name || input.categoryName);
  const now = options.now ? new Date(options.now) : new Date();
  const ttlSeconds = boundedInteger(options.ttlSeconds, 900, 60, 3600);
  const type = validateCategoryType(input.type || 'expense');
  return {
    plan_id: options.planId,
    status: 'awaiting_confirmation',
    requires_confirmation: true,
    user_id: options.userId,
    type,
    target_category: {
      id: input.target_category_id || input.targetCategoryId || null,
      name,
      icon: input.icon || '📁',
    },
    transaction_ids: ids,
    transaction_count: ids.length,
    operations: [
      ...(input.target_category_id || input.targetCategoryId ? [] : [{ action: 'create_or_reuse_category', name }]),
      { action: 'retag_transactions', transaction_ids: ids },
      { action: 'record_classification_feedback', count: ids.length },
    ],
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
  };
}

module.exports = {
  GENERIC_DESCRIPTIONS,
  boundedInteger,
  validateCategoryType,
  cleanDescription,
  canonicalizeDescription,
  clusterTransactions,
  discoverCategorySuggestions,
  validateSuggestedCategoryName,
  buildRetagPlan,
};

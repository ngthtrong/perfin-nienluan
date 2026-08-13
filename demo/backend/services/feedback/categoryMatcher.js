// Vai trò: Ghép tên hoặc alias người dùng nhập với danh mục hợp lệ một cách thận trọng.
// Luồng chính: ưu tiên exact/alias, dùng fuzzy có ngưỡng và trả fallback khi kết quả mơ hồ.

const {
  normalizeForMatch,
  textSimilarity,
  containsNormalizedPhrase,
} = require('./textSimilarity');

function getFallback(categories, fallbackName = 'Khác') {
  const wanted = normalizeForMatch(fallbackName);
  return categories.find((category) => normalizeForMatch(category.name) === wanted)
    || categories[0]
    || null;
}

function aliasesByCategory(aliases = {}) {
  return Object.entries(aliases).map(([categoryName, values]) => ({
    categoryName,
    values: [categoryName, ...(Array.isArray(values) ? values : [])],
  }));
}

function inferCategoryFromText(text, aliases = {}, fallbackName = 'Khác') {
  const matches = [];
  for (const group of aliasesByCategory(aliases)) {
    for (const alias of group.values) {
      if (!containsNormalizedPhrase(text, alias)) continue;
      const normalizedAlias = normalizeForMatch(alias);
      matches.push({
        categoryName: group.categoryName,
        alias,
        tokenCount: normalizedAlias.split(' ').length,
        length: normalizedAlias.length,
      });
    }
  }
  if (!matches.length) return { categoryName: fallbackName, confidence: 0, matchKind: 'fallback' };

  matches.sort((left, right) => right.tokenCount - left.tokenCount || right.length - left.length);
  const best = matches[0];
  const tied = matches.filter((item) => item.tokenCount === best.tokenCount && item.length === best.length);
  const distinctCategories = new Set(tied.map((item) => normalizeForMatch(item.categoryName)));
  if (distinctCategories.size > 1) {
    return { categoryName: fallbackName, confidence: 0, matchKind: 'ambiguous_alias' };
  }

  return {
    categoryName: best.categoryName,
    confidence: best.tokenCount > 1 ? 0.96 : 0.9,
    matchKind: 'alias_phrase',
    matchedAlias: best.alias,
  };
}

// Trả match kèm loại bằng chứng hoặc fallback nếu điểm/margin chưa đủ an toàn.
function findSafeCategoryMatch(input, categories = [], options = {}) {
  const scoped = categories.filter((category) => !options.type || category.type === options.type);
  const fallback = getFallback(scoped, options.fallbackName);
  const wanted = normalizeForMatch(input);
  if (!wanted) {
    return { category: fallback, confidence: 0, matchKind: 'fallback', reason: 'empty_input' };
  }

  const exact = scoped.find((category) => normalizeForMatch(category.name) === wanted);
  if (exact) return { category: exact, confidence: 1, matchKind: 'exact' };

  const aliasGroups = aliasesByCategory(options.aliases);
  const exactAliasCategories = aliasGroups
    .filter((group) => group.values.some((value) => normalizeForMatch(value) === wanted))
    .map((group) => scoped.find((category) => normalizeForMatch(category.name) === normalizeForMatch(group.categoryName)))
    .filter(Boolean);
  const distinctExactAliases = new Map(exactAliasCategories.map((category) => [category.id || category.name, category]));
  if (distinctExactAliases.size === 1) {
    return { category: [...distinctExactAliases.values()][0], confidence: 0.98, matchKind: 'alias_exact' };
  }
  if (distinctExactAliases.size > 1) {
    return { category: fallback, confidence: 0, matchKind: 'fallback', reason: 'ambiguous_alias' };
  }

  const aliasesForName = new Map(aliasGroups.map((group) => [normalizeForMatch(group.categoryName), group.values]));
  const ranked = scoped
    .filter((category) => category !== fallback)
    .map((category) => {
      const candidates = [category.name, ...(aliasesForName.get(normalizeForMatch(category.name)) || [])];
      const score = Math.max(...candidates.map((candidate) => textSimilarity(wanted, candidate)));
      return { category, score };
    })
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  const runnerUp = ranked[1];
  const shortInput = wanted.length <= 4;
  const threshold = options.minSimilarity || (shortInput ? 0.9 : 0.82);
  const margin = options.minMargin ?? 0.08;
  if (!best || best.score < threshold) {
    return { category: fallback, confidence: best?.score || 0, matchKind: 'fallback', reason: 'below_threshold' };
  }
  if (runnerUp && best.score - runnerUp.score < margin) {
    return { category: fallback, confidence: best.score, matchKind: 'fallback', reason: 'ambiguous_fuzzy' };
  }

  return { category: best.category, confidence: best.score, matchKind: 'fuzzy' };
}

module.exports = {
  getFallback,
  inferCategoryFromText,
  findSafeCategoryMatch,
};

function removeDiacritics(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function normalizeForMatch(value = '') {
  return removeDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenize(value = '') {
  const normalized = normalizeForMatch(value);
  return normalized ? normalized.split(' ') : [];
}

function levenshteinDistance(left = '', right = '') {
  const a = String(left);
  const b = String(right);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length];
}

function diceCoefficient(leftTokens, rightTokens) {
  if (!leftTokens.length || !rightTokens.length) return 0;
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return (2 * overlap) / (left.size + right.size);
}

function textSimilarity(left, right) {
  const a = normalizeForMatch(left);
  const b = normalizeForMatch(right);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const edit = 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length);
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  const dice = diceCoefficient(aTokens, bTokens);
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  const smaller = aSet.size <= bSet.size ? aSet : bSet;
  const larger = aSet.size <= bSet.size ? bSet : aSet;
  const contained = smaller.size > 0 && [...smaller].every((token) => larger.has(token));
  const containmentScore = contained && smaller.size >= 2
    ? Math.min(0.94, 0.82 + (smaller.size / larger.size) * 0.12)
    : 0;

  return Math.max(edit, dice * 0.92, containmentScore);
}

function containsNormalizedPhrase(text, phrase) {
  const haystack = normalizeForMatch(text);
  const needle = normalizeForMatch(phrase);
  if (!haystack || !needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

module.exports = {
  removeDiacritics,
  normalizeForMatch,
  tokenize,
  levenshteinDistance,
  textSimilarity,
  containsNormalizedPhrase,
};


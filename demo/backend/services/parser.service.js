const { inferCategoryFromText, findSafeCategoryMatch } = require('./feedback/categoryMatcher');

const CATEGORY_ALIASES = {
  'Ăn uống': ['đồ ăn', 'ăn', 'an', 'thức ăn', 'cơm', 'phở', 'bún', 'cà phê', 'trà sữa', 'food'],
  'Di chuyển': ['đi lại', 'xe', 'xăng', 'grab', 'taxi', 'uber', 'xe buýt', 'gửi xe', 'transport'],
  'Mua sắm': ['mua đồ', 'shopping', 'mua hàng', 'shop', 'áo', 'giày'],
  'Giải trí': ['vui chơi', 'phim', 'game', 'karaoke', 'entertainment'],
  'Sức khỏe': ['y tế', 'thuốc', 'bệnh viện', 'khám bệnh', 'health'],
  'Giáo dục': ['học', 'sách', 'khóa học', 'học phí', 'education'],
  'Nhà cửa': ['nhà', 'phòng trọ', 'thuê nhà', 'tiền trọ', 'rent', 'housing'],
  'Hóa đơn & Dịch vụ': ['hóa đơn', 'bill', 'dịch vụ', 'tiền điện', 'tiền nước', 'tiền điện thoại', 'internet', 'điện thoại'],
  'Tạp hóa': ['siêu thị', 'chợ', 'grocery', 'đi chợ'],
  'Điện tử': ['công nghệ', 'tech', 'điện thoại', 'laptop', 'iphone', 'electronics'],
  'Thể thao': ['gym', 'fitness', 'sport', 'tập'],
  'Làm đẹp': ['mỹ phẩm', 'beauty', 'spa', 'tóc', 'nails'],
  Lương: ['salary', 'wage', 'lương tháng', 'nhận lương'],
  Thưởng: ['bonus', 'thưởng tết', 'thưởng cuối năm', 'thưởng dự án'],
  'Đầu tư': ['investment', 'lãi', 'cổ tức', 'dividend'],
};

const INCOME_CATEGORIES = new Set(['Lương', 'Thưởng', 'Đầu tư']);

function removeDiacritics(str = '') {
  return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function normalizeText(str = '') {
  return removeDiacritics(str).toLowerCase().trim();
}

function normalizeAmount(input) {
  if (typeof input === 'number') return Math.round(input);
  if (!input) return null;
  let text = normalizeText(input).replace(/,/g, '.').replace(/\s+/g, ' ');

  const multiply = text.match(/(.+?)\s*(x|\*)\s*(\d+)/);
  if (multiply) {
    const base = normalizeAmount(multiply[1]);
    return base ? base * Number(multiply[3]) : null;
  }

  const trDecimal = text.match(/(\d+)\s*tr\s*(\d+)/);
  if (trDecimal) return Number(trDecimal[1]) * 1000000 + Number(trDecimal[2].padEnd(3, '0')) * 1000;

  const millionWords = text.match(/(\d+(?:\.\d+)?)\s*(trieu|tr|cu)/);
  if (millionWords) return Math.round(Number(millionWords[1]) * 1000000);

  const billion = text.match(/(\d+(?:\.\d+)?)\s*ty/);
  if (billion) return Math.round(Number(billion[1]) * 1000000000);

  const thousand = text.match(/(\d+(?:\.\d+)?)\s*(k|nghin|ngan)/);
  if (thousand) return Math.round(Number(thousand[1]) * 1000);

  const plain = text.match(/\d+(?:\.\d{3})+|\d+/);
  if (!plain) return null;
  const normalized = plain[0].includes('.') ? plain[0].replace(/\./g, '') : plain[0];
  return Number(normalized);
}

function inferType(text) {
  const normalized = normalizeText(text);
  if (/(luong|thuong|lai|co tuc|freelance|nhan|duoc tra)/.test(normalized)) return 'income';
  return 'expense';
}

function inferCategoryName(text, type) {
  return inferCategoryWithMeta(text, type).categoryName;
}

function inferCategoryWithMeta(text, type) {
  const scopedAliases = Object.fromEntries(
    Object.entries(CATEGORY_ALIASES).filter(([name]) => (
      type === 'income' ? INCOME_CATEGORIES.has(name) : !INCOME_CATEGORIES.has(name)
    ))
  );
  return inferCategoryFromText(text, scopedAliases);
}

function inferDate(text, today = new Date()) {
  const normalized = normalizeText(text);
  const date = new Date(today);
  if (normalized.includes('hom qua')) date.setDate(date.getDate() - 1);
  if (normalized.includes('hom kia')) date.setDate(date.getDate() - 2);
  const short = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (short) {
    const year = short[3] ? Number(short[3].length === 2 ? `20${short[3]}` : short[3]) : date.getFullYear();
    return `${year}-${String(short[2]).padStart(2, '0')}-${String(short[1]).padStart(2, '0')}`;
  }
  return date.toISOString().slice(0, 10);
}

function matchCategory(categoryName, categories, type = 'expense') {
  return matchCategoryWithMeta(categoryName, categories, type).category;
}

function matchCategoryWithMeta(categoryName, categories, type = 'expense') {
  return findSafeCategoryMatch(categoryName, categories, {
    type,
    aliases: CATEGORY_ALIASES,
    fallbackName: 'Khác',
  });
}

function validateParsedTransaction(data) {
  const errors = [];
  if (!data.description) errors.push('Thiếu mô tả');
  if (!Number(data.amount) || Number(data.amount) <= 0) errors.push('Thiếu số tiền');
  if (!['income', 'expense'].includes(data.type)) errors.push('Loại giao dịch không hợp lệ');
  if (!data.category_name) errors.push('Thiếu danh mục');
  return { valid: errors.length === 0, errors };
}

function parseLocalTransaction(text, categories) {
  const amount = normalizeAmount(text);
  const type = inferType(text);
  const inferredCategory = inferCategoryWithMeta(text, type);
  const categoryName = inferredCategory.categoryName;
  const categoryMatch = matchCategoryWithMeta(categoryName, categories, type);
  const category = categoryMatch.category;
  const description = String(text)
    .replace(/\d+(?:[.,]\d+)?\s*(k|nghìn|ngàn|triệu|tr|củ|tỷ|vnd|đ|₫)?/gi, '')
    .replace(/\b(hôm nay|hôm qua|hôm kia)\b/gi, '')
    .trim() || (category ? category.name : 'Giao dịch');

  if (!amount) {
    return {
      intent: 'unclear',
      transaction: {
        description,
        amount: null,
        type,
        category_id: category ? category.id : null,
        category_name: category ? category.name : categoryName,
        category_icon: category ? category.icon : '📦',
        transaction_date: inferDate(text),
        confidence: 0.5,
        category_confidence: Math.min(categoryMatch.confidence, inferredCategory.confidence || 0),
        category_match_kind: inferredCategory.matchKind,
      },
      needs_clarification: true,
      clarification_message: 'Bạn muốn ghi nhận bao nhiêu tiền?',
    };
  }

  return {
    intent: 'transaction',
    transaction: {
      description,
      amount,
      type,
      category_id: category ? category.id : null,
      category_name: category ? category.name : categoryName,
      category_icon: category ? category.icon : '📦',
      transaction_date: inferDate(text),
      confidence: 0.8,
      category_confidence: Math.min(categoryMatch.confidence, inferredCategory.confidence || 0),
      category_match_kind: inferredCategory.matchKind === 'alias_phrase'
        ? categoryMatch.matchKind
        : inferredCategory.matchKind,
    },
    needs_clarification: false,
    chat_response: null,
  };
}

module.exports = {
  CATEGORY_ALIASES,
  removeDiacritics,
  normalizeText,
  normalizeAmount,
  inferCategoryName,
  inferCategoryWithMeta,
  matchCategory,
  matchCategoryWithMeta,
  validateParsedTransaction,
  parseLocalTransaction,
};

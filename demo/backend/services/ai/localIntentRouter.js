// Vai trò: Nhận diện nhanh các intent tài chính tiếng Việt mà không cần gọi LLM.
// Luồng chính: phân biệt câu hỏi với lệnh ghi tiền, trích tham số và trả intent có cấu trúc.

const { normalizeAmount, normalizeText, parseLocalTransaction } = require('../parser.service');
const { detectPeriodFromText } = require('./periodResolver');

// A question asks about existing data; it must never be turned into a money-changing
// draft (transaction/goal). Without this guard "tôi có bao nhiêu ngân sách cho bida?"
// was parsed as an expense in "Ăn uống", and the follow-up turn was captured by the
// clarification state machine instead of being answered.
const QUESTION_PATTERNS = [
  /\bbao nhieu\b/,
  /\bco\b.{0,20}\bnao\b/,
  /\b(?:la\s+)?(?:nhung\s+)?gi\b\s*$/,
  /\bgi\b.{0,12}\b(?:khong|vay|the|a)\b/,
  /\b(?:liet ke|danh sach|xem lai|cho (?:toi|minh) xem|thong ke|tra cuu)\b/,
  /\bthe nao\b|\bra sao\b|\bnhu the nao\b/,
  /\bcon lai\b|\bcon bao nhieu\b/,
  /\bda .{0,20}(?:chua)\b\s*\??$/,
];

function isQuestionLike(text) {
  const normalized = normalizeText(text).replace(/[!.]+$/g, '').trim();
  const sentence = normalized.replace(/\?+$/g, '').trim();
  if (QUESTION_PATTERNS.some((pattern) => pattern.test(sentence))) return true;
  // A trailing question mark alone is only a question when no amount is stated:
  // "ăn phở 50k?" is still a transaction the user wants to record.
  return /\?\s*$/.test(String(text || '')) && !normalizeAmount(text);
}

// Words that describe *how* the user is asking rather than *what* they bought.
// Keeping them in the search string made every aggregate question search the
// description column for the whole sentence and return zero rows.
const SEARCH_STOPWORDS = [
  'toi', 'minh', 'ban', 'tui', 'em', 'anh', 'chi',
  'da', 'dang', 'se', 'vua', 'moi', 'roi', 'con',
  'chi', 'tieu', 'thu', 'chi tieu', 'thu nhap', 'tien',
  'xai', 'ton', 'dung', 'mat',
  'bao nhieu', 'bao lau', 'tong', 'tong cong', 'tat ca', 'toan bo',
  'liet ke', 'danh sach', 'xem', 'cho', 'thong ke', 'tra cuu', 'kiem tra',
  'giao dich', 'khoan', 'lich su', 'hay', 'vui long', 'giup',
  'lon nhat', 'nho nhat', 'cao nhat', 'thap nhat', 'gan day', 'gan nhat',
  'hom nay', 'hom qua', 'hom kia', 'tuan nay', 'tuan truoc', 'tuan qua',
  'thang nay', 'thang truoc', 'thang roi', 'quy nay', 'quy truoc',
  'nam nay', 'nam truoc', 'nam ngoai', 'tu dau nam',
  'trong', 'vao', 'cua', 've', 'la', 'gi', 'nao', 'khong', 'a', 'vay', 'the',
  'ngay qua', 'ngay truoc', 'het',
];

function extractAllAmounts(text) {
  const source = String(text || '');
  const matches = [...source.matchAll(/\d+(?:[.,]\d+)?\s*(?:k|nghìn|ngàn|triệu|tr|củ|tỷ)?/gi)];
  return matches
    .filter((match) => !/^\s*(?:năm|tháng|ngày|tuần)\b/i.test(source.slice((match.index || 0) + match[0].length)))
    .map((match) => ({ value: normalizeAmount(match[0]), monetary: /(?:k|nghìn|ngàn|triệu|tr|củ|tỷ)/i.test(match[0]) }))
    .filter((item) => Number(item.value) > 0)
    .sort((left, right) => Number(right.monetary) - Number(left.monetary))
    .map((item) => item.value);
}

function splitTransactionClauses(text) {
  const parts = String(text || '')
    .split(/\s*(?:,|;|\bvà\b|\brồi\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return [];
  const withAmounts = parts.filter((part) => normalizeAmount(part));
  return withAmounts.length >= 2 ? withAmounts : [];
}

function inferGoal(text) {
  const normalized = normalizeText(text);
  const goalType = /(tra.*no|no the|debt)/.test(normalized)
    ? 'debt_payoff'
    : /(mua|dat coc|chuyen nha)/.test(normalized) ? 'purchase' : 'saving';
  const amounts = extractAllAmounts(text);
  const yearCount = normalized.match(/(?:trong\s+)?(\d+)\s*nam/);
  let targetDate = null;
  if (yearCount) {
    const date = new Date();
    date.setFullYear(date.getFullYear() + Number(yearCount[1]));
    targetDate = date.toISOString().slice(0, 10);
  }
  return {
    name: String(text).slice(0, 150),
    goal_type: goalType,
    target_amount: amounts[0] || null,
    target_date: targetDate,
  };
}

function looksLikeTransactionRequest(normalized) {
  return /\b(chi|tieu|mua|an|uong|tra|dong|thanh toan|nhan luong|nhan tien|thu nhap|ban hang|nap tien|rut tien)\b/.test(normalized);
}

function isRecurringPaymentAcknowledgement(text) {
  const normalized = normalizeText(text).replace(/[?!.]+$/g, '').trim();
  // Keep this deliberately narrow. A short acknowledgement is only a recurring
  // payment signal when it reads like an answer to "đã thanh toán chưa?". Longer
  // statements still go through the normal parser and never become an automatic
  // money-changing action.
  return /^(?:(?:toi|minh)\s+)?(?:da\s+)?(?:thanh toan|dong|tra)(?:\s+xong)?\s+(?:roi|r)$/.test(normalized);
}

const SEARCH_STOPWORD_SET = new Set(SEARCH_STOPWORDS);
const MAX_STOPWORD_PHRASE = Math.max(...SEARCH_STOPWORDS.map((phrase) => phrase.split(' ').length));

// Remove interrogative scaffolding wherever it appears, keeping only the words that
// plausibly describe a transaction. Prefix-stripping was not enough: "tháng này tôi
// chi bao nhiêu" kept the entire sentence and matched no description.
function transactionQuerySearchText(text) {
  const tokens = String(text || '')
    .replace(/[?!.,;]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const normalizedTokens = tokens.map((token) => normalizeText(token));
  const kept = [];
  let index = 0;
  while (index < tokens.length) {
    let matchedLength = 0;
    for (let size = Math.min(MAX_STOPWORD_PHRASE, tokens.length - index); size >= 1; size -= 1) {
      const phrase = normalizedTokens.slice(index, index + size).join(' ');
      if (SEARCH_STOPWORD_SET.has(phrase)) {
        matchedLength = size;
        break;
      }
    }
    if (matchedLength) {
      index += matchedLength;
      continue;
    }
    // Bare numbers in a question are period counts ("7 ngày qua") or list sizes
    // ("liệt kê 5 giao dịch"), never part of a description to search for.
    if (/^\d+$/.test(normalizedTokens[index])) {
      index += 1;
      continue;
    }
    kept.push(tokens[index]);
    index += 1;
  }
  const value = kept.join(' ').trim();
  return /^(?:đó|do|này|nay|vừa\s+nói|vua\s+noi)$/i.test(value) ? '' : value;
}

function parseTransactionQuery(text, categories = [], now = new Date()) {
  const normalized = normalizeText(text);
  const looksLikeQuery = (
    /(?:chi|tieu|xai|ton|dung|het)\b.{0,24}bao nhieu|bao nhieu.{0,24}(?:chi|tieu|xai|ton)\b/.test(normalized)
    || /(?:liet ke|danh sach|xem).{0,35}giao dich/.test(normalized)
    || /bao nhieu\s+giao dich|giao dich.{0,24}(?:nao|thang nay|gan day)/.test(normalized)
  );
  if (!looksLikeQuery) return null;

  const detectedPeriod = detectPeriodFromText(text, now);
  const explicitPeriod = normalized.match(/thang\s+(\d{1,2})(?:\s*[\/-]\s*(\d{4}))?/);
  const limitMatch = normalized.match(/(?:liet ke|xem)\s+(\d{1,3})|(?:toi da co|co)\s+(\d{1,3})\s+giao dich/);
  const requestedLimit = Number(limitMatch?.[1] || limitMatch?.[2] || 5);
  const mentionsIncome = /\b(?:thu|nhan luong|nhan tien|thu nhap)\b/.test(normalized);
  const mentionsExpense = /\b(?:chi|tieu)\b/.test(normalized);
  const reference = /\b(?:cac\s+)?giao dich\s+(?:do|nay|vua (?:phan loai|noi))\b/.test(normalized)
    ? 'last_category_retag'
    : null;
  const category = (categories || []).find((item) => (
    normalizeText(item.name).length > 1 && normalized.includes(normalizeText(item.name))
  ));
  const search = reference || category ? null : transactionQuerySearchText(text) || null;

  return {
    intent: 'query_transactions',
    query: {
      action: /bao nhieu|\btong\b/.test(normalized) ? 'aggregate' : 'list',
      type: mentionsExpense && !mentionsIncome ? 'expense' : mentionsIncome && !mentionsExpense ? 'income' : null,
      category_id: category?.id || null,
      category_name: category?.name || null,
      search,
      period: detectedPeriod?.period || null,
      days: detectedPeriod?.days || null,
      month: detectedPeriod?.month ?? (explicitPeriod ? Number(explicitPeriod[1]) : null),
      year: detectedPeriod?.year ?? (explicitPeriod?.[2] ? Number(explicitPeriod[2]) : null),
      current_month: !detectedPeriod,
      reference,
      limit: Math.min(Math.max(requestedLimit, 1), 20),
    },
    needs_clarification: false,
    // Only a parse that pinned down a real filter deserves to pre-empt the LLM.
    // A bare "tháng này tôi chi bao nhiêu" carries no discriminating signal, so
    // Gemini gets a chance at it instead.
    // A period alone is not discriminating — every question has one, explicit or
    // implied — so it does not raise confidence on its own.
    local_confidence: (category || reference || search) ? 'high' : 'low',
  };
}

// Wallet questions had no intent at all, so Gemini fell back to the closest enum
// value (summary) and answered with a whole-month income/expense report.
function parseWalletQuery(text) {
  const normalized = normalizeText(text);
  const mentionsWallet = /\b(?:vi|tai khoan|so du|balance|wallet)\b/.test(normalized);
  if (!mentionsWallet) return null;
  const asksList = /(co nhung|co bao nhieu|nhung|liet ke|danh sach|cac|xem|la gi|nao)/.test(normalized);
  const asksBalance = /(so du|con bao nhieu|bao nhieu tien|tong tien|balance)/.test(normalized);
  if (!asksList && !asksBalance) return null;
  if (/(chuyen|nap|rut)\s/.test(normalized)) return null;
  return { intent: 'query_wallets', query: { query: 'wallets' } };
}

function parseBudgetQuery(text, categories = []) {
  const normalized = normalizeText(text);
  if (!/\bngan sach\b/.test(normalized)) return null;
  if (/(goi y|de xuat|dat|tao|thiet lap)/.test(normalized)) return null;
  if (!isQuestionLike(text) && !/(xem|kiem tra|con lai|tinh hinh|tien do)/.test(normalized)) return null;
  const category = (categories || []).find((item) => (
    normalizeText(item.name).length > 1 && normalized.includes(normalizeText(item.name))
  ));
  // "ngân sách cho bida" — keep the subject even when it matches no category, so
  // the handler can say "bạn chưa đặt ngân sách cho bida" instead of listing all.
  const subject = String(text || '')
    .match(/ng[âa]n s[áa]ch\s+(?:cho|về|ve|danh mục|danh muc)\s+([\p{L}\d\s]{2,40})/iu);
  const detectedPeriod = detectPeriodFromText(text);
  return {
    intent: 'query_budgets',
    query: {
      query: 'budgets',
      category_name: category?.name || (subject ? subject[1].trim().split(/\s+(?:trong|thang|tuan|nam)\b/)[0].trim() : null),
      period: detectedPeriod?.period || null,
      month: detectedPeriod?.month ?? null,
      year: detectedPeriod?.year ?? null,
    },
  };
}

// The bill name inside "lịch sử tiền phòng" / "lịch sử hóa đơn internet". Passing the
// whole sentence made findBillByName match nothing and fall through to a generic reply.
function recurringSubject(text) {
  const match = String(text || '').match(
    /(?:l[ịi]ch s[ửu]|t[ạa]m d[ừu]ng|d[ừu]ng nh[ắa]c)\s+(?:c[ủu]a\s+)?(?:kho[ảa]n\s+)?(?:chi\s+)?(?:h[óo]a đơn\s+)?(?:ti[ềe]n\s+)?([\p{L}\d\s]{2,40})/iu
  );
  if (!match) return null;
  return match[1]
    .replace(/\b(?:hàng|hang|mỗi|moi)\s+(?:tuần|tuan|tháng|thang|quý|quy|năm|nam)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

// Goal questions used to be unreachable: the goal_create rule matched "muc tieu"
// first, so "tôi đang có các mục tiêu gì?" opened a create-goal clarification.
function parseGoalQuery(text) {
  const normalized = normalizeText(text);
  if (!/\b(?:muc tieu|ke hoach tai chinh)\b/.test(normalized)) return null;
  const asksProgress = /(tien do|den dau|the nao|con thieu|bao nhieu nua)/.test(normalized);
  const asksList = /(co nhung|dang co|co may|co bao nhieu|cac muc tieu|nhung muc tieu|muc tieu cua (?:toi|minh)|liet ke|danh sach|xem)/.test(normalized);
  if (!asksProgress && !asksList && !isQuestionLike(text)) return null;
  // "mình muốn đặt mục tiêu 50 triệu" is a create request even though it ends in "?"
  if (/(muon|dat|tao|lap|them)\s/.test(normalized) && normalizeAmount(text)) return null;
  return { intent: 'query_goals', query: { query: 'goals' } };
}

// Áp dụng thứ tự ưu tiên intent để câu hỏi tra cứu không bị biến thành lệnh ghi tiền.
function routeLocalIntent(text, categories) {
  const normalized = normalizeText(text);
  const normalizedSentence = normalized.replace(/[?!.]+$/g, '').trim();

  if (/(loi khuyen)/.test(normalized)
      || /^(?:(?:ban )?co the )?tu van(?: tai chinh)?(?: cho (?:toi|minh))?(?: giup (?:toi|minh))?(?: duoc khong)?$/.test(normalizedSentence)) {
    return { intent: 'query_insights', query: { query: 'insights' } };
  }
  if (/(ban la ai|ban ten gi|ban co the lam gi|ban giup duoc gi|xin chao|^chao\b|cam on|tam biet)/.test(normalized)) {
    return { intent: 'question', needs_clarification: false };
  }

  if (/(subscription|dang ky|phi dinh ky|chi tieu an|khoan chi lap lai)/.test(normalized)
      && /(co|nao|kiem tra|xem|an)/.test(normalized)) {
    return { intent: 'query_subscriptions', query: { query: 'subscriptions' } };
  }
  if (/(goi y|de xuat|tao).*(danh muc)|danh muc.*(?:moi|phu hop)/.test(normalized)) {
    return { intent: 'query_category_suggestions', query: { query: 'category_suggestions' } };
  }

  // Read-only questions are resolved before any write-shaped intent below, so a
  // question can never open a transaction/goal clarification flow.
  const walletQuery = parseWalletQuery(text);
  if (walletQuery) return walletQuery;

  const budgetQuery = parseBudgetQuery(text, categories);
  if (budgetQuery) return budgetQuery;

  const goalQuery = parseGoalQuery(text);
  if (goalQuery) return goalQuery;

  const transactionQuery = parseTransactionQuery(text, categories);
  if (transactionQuery) return transactionQuery;

  // An explicit export request must win over the generic "báo cáo" insight rule.
  if (/(xuat|export|tai ve|download)/.test(normalized) && /(csv|excel|pdf|bao cao|giao dich|du lieu)/.test(normalized)) {
    return { intent: 'export', export: { format: normalized.includes('pdf') ? 'pdf' : 'csv' } };
  }

  // "lịch sử tiền phòng" names no recurring keyword at all, yet it is a bill history
  // question. "lịch sử giao dịch" is deliberately excluded — that one is a transaction query.
  const looksLikeBillHistory = /\blich su\b/.test(normalized)
    && !/\bgiao dich\b/.test(normalized)
    && /\blich su\s+(?:cua\s+)?(?:khoan\s+)?(?:chi\s+)?(?:hoa don|tien|thanh toan|dong)\b/.test(normalized);

  if (looksLikeBillHistory || /(nhac|dinh ky|hang thang|moi thang|co dinh|hoa don)/.test(normalized)) {
    if (/(danh sach|liet ke|co nhung|cac khoan|nhung khoan|xem)/.test(normalized)) return { intent: 'recurring_list', recurring: {} };
    if (/(tam dung|dung nhac)/.test(normalized)) return { intent: 'recurring_pause', recurring: { name: text } };
    if (/(lich su)/.test(normalized)) return { intent: 'recurring_history', recurring: { name: recurringSubject(text) || text } };
    // Everything left in this branch creates a reminder. A question must not.
    if (isQuestionLike(text)) return { intent: 'recurring_list', recurring: {} };
    const amount = normalizeAmount(text);
    const due = normalized.match(/(?:ngay|moi)\s*(\d{1,2})/i);
    const name = String(text)
      .replace(/^\s*(?:nhắc|nhac)(?:\s+(?:tôi|toi|mình|minh))?\s*/i, '')
      .replace(/\d+(?:[.,]\d+)?\s*(?:k|nghìn|ngàn|triệu|tr|củ|tỷ)?/gi, ' ')
      .replace(/\b(?:hàng|hang|mỗi|moi)\s+(?:tuần|tuan|tháng|thang|quý|quy|năm|nam)\b/gi, ' ')
      .replace(/\bngày\s*\d{1,2}\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      intent: 'recurring_create',
      recurring: { name: (name || String(text)).slice(0, 150), amount, frequency: 'monthly', due_day: due ? Number(due[1]) : null },
    };
  }
  if (isRecurringPaymentAcknowledgement(text)) {
    return { intent: 'recurring_pay', recurring: { acknowledgement: true } };
  }
  if (/(da dong|da tra|thanh toan xong)/.test(normalized)) return { intent: 'recurring_pay', recurring: { name: text } };

  const transfer = normalized.match(/chuyen\s+(.+?)\s+tu\s+(?:vi\s+)?(.+?)\s+sang\s+(?:vi\s+)?(.+)/);
  if (transfer) {
    return {
      intent: 'transfer',
      transfer: {
        amount: normalizeAmount(transfer[1]),
        from_wallet_name: transfer[2].trim(),
        to_wallet_name: transfer[3].trim(),
      },
    };
  }
  if (/(lai|lo).*(dau tu|co phieu|crypto)|(?:dau tu|co phieu|crypto).*(lai|lo)/.test(normalized)) {
    const amount = normalizeAmount(text);
    return { intent: 'investment_pnl', investment: { wallet_name: String(text), amount: normalized.includes('lo') ? -amount : amount } };
  }

  // Creating a goal requires an intent to act, not merely mentioning one. A target
  // amount or an imperative verb is the evidence; a bare question is not.
  if (/(muc tieu|lap ke hoach|muon tiet kiem|tra het no|mua nha|mua xe|chuyen cho o)/.test(normalized)
      && !isQuestionLike(text)
      && (normalizeAmount(text) || /\b(muon|dat|tao|lap|them|len ke hoach|tiet kiem|mua|tra)\b/.test(normalized))) {
    const goal = inferGoal(text);
    return {
      intent: 'goal_create',
      goal,
      needs_clarification: !goal.target_amount,
      clarification_message: !goal.target_amount ? 'Mục tiêu của bạn cần bao nhiêu tiền?' : null,
    };
  }
  if (/(du xai|du dung|can tien|het tien|can vi|dong tien|ngay luong)/.test(normalized)) return { intent: 'query_runway', query: { query: 'runway' } };
  if (/(subscription|dang ky|phi dinh ky|chi tieu an|khoan chi lap lai)/.test(normalized)) return { intent: 'query_subscriptions', query: { query: 'subscriptions' } };
  if (/(goi y|de xuat|dat).*ngan sach|ngan sach.*giup/.test(normalized)) return { intent: 'budget_suggest', budget: { strategy: 'historical' } };
  if (/(bao cao|phan tich chi tieu|insight|tinh hinh tai chinh)/.test(normalized)) return { intent: 'query_insights', query: { query: 'insights' } };

  const clauses = splitTransactionClauses(text);
  if (clauses.length > 1) {
    const transactions = clauses.map((part) => parseLocalTransaction(part, categories)).filter((item) => item.transaction).map((item) => item.transaction);
    if (transactions.length > 1) {
      const needsClarification = transactions.some((transaction) => !(Number(transaction.amount) > 0));
      return {
        intent: 'transactions',
        transactions,
        transaction: transactions[0],
        needs_clarification: needsClarification,
        clarification_message: needsClarification
          ? 'Mỗi số tiền giao dịch phải lớn hơn 0. Bạn nhập lại giúp mình nhé.'
          : null,
      };
    }
  }
  // A question that reached this point is asking about data we could not classify.
  // Answering it as prose is always safer than drafting a transaction from it.
  if (isQuestionLike(text) && !normalizeAmount(text)) {
    return { intent: 'question', needs_clarification: false };
  }

  const parsed = parseLocalTransaction(text, categories);
  if (parsed.needs_clarification
      && parsed.transaction?.category_match_kind === 'fallback'
      && !looksLikeTransactionRequest(normalized)) {
    return { intent: 'question', needs_clarification: false };
  }
  return parsed;
}

module.exports = {
  extractAllAmounts,
  splitTransactionClauses,
  inferGoal,
  isQuestionLike,
  looksLikeTransactionRequest,
  isRecurringPaymentAcknowledgement,
  transactionQuerySearchText,
  parseTransactionQuery,
  parseWalletQuery,
  parseBudgetQuery,
  parseGoalQuery,
  routeLocalIntent,
};

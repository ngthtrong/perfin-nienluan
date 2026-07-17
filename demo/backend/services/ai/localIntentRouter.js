const { normalizeAmount, normalizeText, parseLocalTransaction } = require('../parser.service');

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

function routeLocalIntent(text, categories) {
  const normalized = normalizeText(text);

  if (/(loi khuyen|tu van tai chinh)/.test(normalized)) {
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

  if (/(nhac|dinh ky|hang thang|moi thang)/.test(normalized)) {
    if (/(danh sach|liet ke|co nhung)/.test(normalized)) return { intent: 'recurring_list', recurring: {} };
    if (/(tam dung|dung nhac)/.test(normalized)) return { intent: 'recurring_pause', recurring: { name: text } };
    if (/(lich su)/.test(normalized)) return { intent: 'recurring_history', recurring: { name: text } };
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

  if (/(muc tieu|lap ke hoach|muon tiet kiem|tra het no|mua nha|mua xe|chuyen cho o)/.test(normalized)) {
    const goal = inferGoal(text);
    return {
      intent: 'goal_create',
      goal,
      needs_clarification: !goal.target_amount,
      clarification_message: !goal.target_amount ? 'Mục tiêu của bạn cần bao nhiêu tiền?' : null,
    };
  }
  if (/(muc tieu cua toi|cac muc tieu|tien do muc tieu)/.test(normalized)) return { intent: 'query_goals', query: { query: 'goals' } };
  if (/(du xai|du dung|can tien|het tien|can vi|dong tien|ngay luong)/.test(normalized)) return { intent: 'query_runway', query: { query: 'runway' } };
  if (/(subscription|dang ky|phi dinh ky|chi tieu an|khoan chi lap lai)/.test(normalized)) return { intent: 'query_subscriptions', query: { query: 'subscriptions' } };
  if (/(goi y|de xuat|dat).*ngan sach|ngan sach.*giup/.test(normalized)) return { intent: 'budget_suggest', budget: { strategy: 'historical' } };
  if (/(bao cao|phan tich chi tieu|insight|tinh hinh tai chinh)/.test(normalized)) return { intent: 'query_insights', query: { query: 'insights' } };
  if (/(xuat|export).*(csv|excel|pdf)|(?:csv|pdf).*(bao cao|giao dich)/.test(normalized)) {
    return { intent: 'export', export: { format: normalized.includes('pdf') ? 'pdf' : 'csv' } };
  }

  const clauses = splitTransactionClauses(text);
  if (clauses.length > 1) {
    const transactions = clauses.map((part) => parseLocalTransaction(part, categories)).filter((item) => item.transaction).map((item) => item.transaction);
    if (transactions.length > 1) return { intent: 'transactions', transactions, transaction: transactions[0], needs_clarification: false };
  }
  const parsed = parseLocalTransaction(text, categories);
  if (parsed.needs_clarification
      && parsed.transaction?.category_match_kind === 'fallback'
      && !looksLikeTransactionRequest(normalized)) {
    return { intent: 'question', needs_clarification: false };
  }
  return parsed;
}

module.exports = { extractAllAmounts, splitTransactionClauses, inferGoal, looksLikeTransactionRequest, routeLocalIntent };

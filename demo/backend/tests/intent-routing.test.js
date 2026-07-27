// Behaviour freeze for the local intent router.
//
// Purpose: document which sentences are *questions* (read-only, must be answered)
// and which are *commands* (may open a money-changing preview). A question that
// routes to `transaction` or `goal_create` is the bug class this file exists to
// prevent: it silently captures the user's next turn into a clarification flow.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  routeLocalIntent,
  isQuestionLike,
  transactionQuerySearchText,
} = require('../services/ai/localIntentRouter');
const { resolvePeriod, detectPeriodFromText } = require('../services/ai/periodResolver');

const categories = [
  { id: 1, name: 'Ăn uống', type: 'expense', icon: '🍜' },
  { id: 2, name: 'Di chuyển', type: 'expense', icon: '🚗' },
  { id: 3, name: 'Giải trí', type: 'expense', icon: '🎮' },
  { id: 4, name: 'Nhà cửa', type: 'expense', icon: '🏠' },
  { id: 5, name: 'Khác', type: 'expense', icon: '📦' },
  { id: 6, name: 'Lương', type: 'income', icon: '💰' },
  { id: 7, name: 'Khác', type: 'income', icon: '📦' },
];

// Intents that create or modify money. A question must never land here.
const WRITE_INTENTS = new Set([
  'transaction',
  'transactions',
  'goal_create',
  'transfer',
  'investment_pnl',
  'recurring_create',
  'recurring_pay',
  'recurring_pause',
]);

const CORPUS = [
  // ── Period-bearing transaction questions (B1) ─────────────────────────────
  { text: 'tuần này tôi xài bao nhiêu', intent: 'query_transactions', period: 'this_week' },
  { text: 'tuần trước tôi chi bao nhiêu', intent: 'query_transactions', period: 'last_week' },
  { text: 'hôm nay tôi đã chi bao nhiêu tiền', intent: 'query_transactions', period: 'today' },
  { text: 'hôm qua tôi chi bao nhiêu', intent: 'query_transactions', period: 'yesterday' },
  { text: '7 ngày qua tôi chi bao nhiêu', intent: 'query_transactions', period: 'last_n_days' },
  { text: '30 ngày qua tôi tiêu bao nhiêu tiền', intent: 'query_transactions', period: 'last_n_days' },
  { text: 'quý này tôi chi bao nhiêu', intent: 'query_transactions', period: 'this_quarter' },
  { text: 'năm nay tôi chi bao nhiêu', intent: 'query_transactions', period: 'this_year' },
  { text: 'tháng trước tôi chi bao nhiêu', intent: 'query_transactions', period: 'last_month' },
  { text: 'tháng này tôi chi bao nhiêu', intent: 'query_transactions' },
  { text: 'tháng 5 tôi chi bao nhiêu', intent: 'query_transactions', period: 'month' },

  // ── Wallet questions (B2) ─────────────────────────────────────────────────
  { text: 'tôi có những ví nào?', intent: 'query_wallets' },
  { text: 'liệt kê các ví của tôi', intent: 'query_wallets' },
  { text: 'số dư các ví của tôi là bao nhiêu?', intent: 'query_wallets' },
  { text: 'tôi có bao nhiêu ví?', intent: 'query_wallets' },
  { text: 'xem số dư ví', intent: 'query_wallets' },

  // ── Budget questions (B3, B6) ─────────────────────────────────────────────
  { text: 'tôi có bao nhiêu ngân sách cho bida?', intent: 'query_budgets', categoryName: 'bida' },
  { text: 'ngân sách ăn uống còn lại bao nhiêu?', intent: 'query_budgets', categoryName: 'Ăn uống' },
  { text: 'ngân sách tháng này thế nào?', intent: 'query_budgets' },
  { text: 'xem tiến độ ngân sách', intent: 'query_budgets' },
  { text: 'tôi có những ngân sách nào?', intent: 'query_budgets' },
  { text: 'gợi ý ngân sách giúp mình', intent: 'budget_suggest' },

  // ── Goal questions vs goal creation (B5) ──────────────────────────────────
  { text: 'tôi đang có các mục tiêu gì?', intent: 'query_goals' },
  { text: 'mục tiêu của tôi tiến độ đến đâu?', intent: 'query_goals' },
  { text: 'liệt kê mục tiêu của mình', intent: 'query_goals' },
  { text: 'tôi có bao nhiêu mục tiêu?', intent: 'query_goals' },
  { text: 'mục tiêu tài chính của tôi thế nào?', intent: 'query_goals' },
  { text: 'trong 5 năm mình muốn tiết kiệm 300 triệu mua nhà', intent: 'goal_create' },
  { text: 'mình muốn đặt mục tiêu 50 triệu mua xe', intent: 'goal_create' },

  // ── Recurring bills (B10) ─────────────────────────────────────────────────
  { text: 'danh sách khoản chi cố định', intent: 'recurring_list' },
  { text: 'tôi có những khoản chi cố định nào?', intent: 'recurring_list' },
  { text: 'lịch sử tiền phòng', intent: 'recurring_history' },
  { text: 'nhắc tiền phòng trọ 1.5 triệu mỗi tháng ngày 5', intent: 'recurring_create' },
  { text: 'tạm dừng nhắc internet', intent: 'recurring_pause' },

  // ── Export vs insights (B4) ───────────────────────────────────────────────
  { text: 'xuất báo cáo csv', intent: 'export' },
  { text: 'xuất giao dịch ra pdf', intent: 'export' },
  { text: 'phân tích chi tiêu của tôi', intent: 'query_insights' },
  { text: 'bạn có lời khuyên nào cho tôi không?', intent: 'query_insights' },

  // ── Plain transactions must keep working ──────────────────────────────────
  { text: 'ăn sáng 30k', intent: 'transaction' },
  { text: 'ăn sáng 30k, grab 45k', intent: 'transactions' },
  { text: 'chuyển 2 triệu từ ví tiền mặt sang ví ngân hàng', intent: 'transfer' },

  // ── Conversational ────────────────────────────────────────────────────────
  { text: 'bạn là ai?', intent: 'question' },
  { text: 'thời tiết hôm nay thế nào?', intent: 'question' },
];

test('the 40-question corpus routes to its documented intent', () => {
  const failures = [];
  for (const item of CORPUS) {
    const actual = routeLocalIntent(item.text, categories);
    if (actual.intent !== item.intent) {
      failures.push(`"${item.text}" → ${actual.intent} (expected ${item.intent})`);
    }
  }
  assert.deepEqual(failures, []);
});

test('no question in the corpus can open a money-changing flow', () => {
  const offenders = CORPUS
    .filter((item) => item.intent.startsWith('query_') || item.intent === 'question')
    .map((item) => ({ item, actual: routeLocalIntent(item.text, categories) }))
    .filter(({ actual }) => WRITE_INTENTS.has(actual.intent) || actual.needs_clarification === true)
    .map(({ item, actual }) => `"${item.text}" → ${actual.intent}`);
  assert.deepEqual(offenders, []);
});

test('question detection separates asking from recording', () => {
  assert.equal(isQuestionLike('tôi có bao nhiêu ngân sách cho bida?'), true);
  assert.equal(isQuestionLike('tôi đang có các mục tiêu gì?'), true);
  assert.equal(isQuestionLike('tôi có những ví nào?'), true);
  assert.equal(isQuestionLike('liệt kê giao dịch tháng này'), true);
  // A stated amount is a record request even with a question mark.
  assert.equal(isQuestionLike('ăn phở 50k?'), false);
  assert.equal(isQuestionLike('ăn sáng 30k'), false);
});

test('the requested period reaches the query spec instead of collapsing to this month', () => {
  const week = routeLocalIntent('tuần này tôi xài bao nhiêu', categories);
  assert.equal(week.query.period, 'this_week');
  assert.equal(week.query.current_month, false);

  const days = routeLocalIntent('7 ngày qua tôi chi bao nhiêu', categories);
  assert.equal(days.query.period, 'last_n_days');
  assert.equal(days.query.days, 7);

  const month = routeLocalIntent('tháng này tôi chi bao nhiêu', categories);
  assert.equal(month.query.period, 'this_month');
});

test('budget questions carry the asked-about category, matched or not', () => {
  assert.equal(routeLocalIntent('tôi có bao nhiêu ngân sách cho bida?', categories).query.category_name, 'bida');
  assert.equal(routeLocalIntent('ngân sách ăn uống còn lại bao nhiêu?', categories).query.category_name, 'Ăn uống');
  assert.equal(routeLocalIntent('ngân sách tháng này thế nào?', categories).query.category_name, null);
});

test('search text keeps only the subject, wherever the scaffolding sits in the sentence', () => {
  assert.equal(transactionQuerySearchText('tháng này tôi chi bao nhiêu'), '');
  assert.equal(transactionQuerySearchText('tôi đã chi bao nhiêu tiền đánh bida trong tháng này?'), 'đánh bida');
  assert.equal(transactionQuerySearchText('liệt kê 5 giao dịch lớn nhất'), '');
  assert.equal(transactionQuerySearchText('tuần này tôi xài bao nhiêu cho cà phê'), 'cà phê');
});

test('a whole-sentence search no longer pre-empts the provider', () => {
  // Nothing discriminating was parsed, so the LLM must get a chance at it.
  assert.equal(routeLocalIntent('tháng này tôi chi bao nhiêu', categories).local_confidence, 'low');
  // A real filter was found, so local routing is trustworthy.
  assert.equal(
    routeLocalIntent('tôi đã chi bao nhiêu tiền đánh bida trong tháng này?', categories).local_confidence,
    'high'
  );
});

// ── Period resolver ──────────────────────────────────────────────────────────

const NOW = new Date(2026, 6, 27); // Monday 27 July 2026

test('week windows start on Monday and are labelled with real dates', () => {
  const week = resolvePeriod({ period: 'this_week' }, NOW);
  assert.equal(week.from, '2026-07-27');
  assert.equal(week.to, '2026-08-02');
  assert.equal(week.days, 7);
  assert.match(week.label, /tuần này/);
  assert.match(week.label, /27\/07\/2026/);
  assert.equal(week.is_month, false);

  const lastWeek = resolvePeriod({ period: 'last_week' }, NOW);
  assert.equal(lastWeek.from, '2026-07-20');
  assert.equal(lastWeek.to, '2026-07-26');
});

test('day, month, quarter and year windows are exact calendar boundaries', () => {
  assert.deepEqual(
    (({ from, to }) => ({ from, to }))(resolvePeriod({ period: 'yesterday' }, NOW)),
    { from: '2026-07-26', to: '2026-07-26' }
  );
  assert.deepEqual(
    (({ from, to }) => ({ from, to }))(resolvePeriod({ period: 'last_month' }, NOW)),
    { from: '2026-06-01', to: '2026-06-30' }
  );
  assert.deepEqual(
    (({ from, to }) => ({ from, to }))(resolvePeriod({ period: 'this_quarter' }, NOW)),
    { from: '2026-07-01', to: '2026-09-30' }
  );
  assert.deepEqual(
    (({ from, to }) => ({ from, to }))(resolvePeriod({ period: 'this_year' }, NOW)),
    { from: '2026-01-01', to: '2026-12-31' }
  );
  assert.deepEqual(
    (({ from, to }) => ({ from, to }))(resolvePeriod({ period: 'last_n_days', days: 7 }, NOW)),
    { from: '2026-07-21', to: '2026-07-27' }
  );
  // February in a leap year, via explicit month/year.
  assert.deepEqual(
    (({ from, to }) => ({ from, to }))(resolvePeriod({ month: 2, year: 2024 }, NOW)),
    { from: '2024-02-01', to: '2024-02-29' }
  );
});

test('an explicit from/to range wins over any named period', () => {
  const custom = resolvePeriod({ period: 'this_month', from: '2026-03-05', to: '2026-03-09' }, NOW);
  assert.equal(custom.kind, 'custom');
  assert.equal(custom.from, '2026-03-05');
  assert.equal(custom.to, '2026-03-09');
  // Reversed input is normalized rather than producing an empty window.
  const reversed = resolvePeriod({ from: '2026-03-09', to: '2026-03-05' }, NOW);
  assert.equal(reversed.from, '2026-03-05');
  assert.equal(reversed.to, '2026-03-09');
});

test('an unmentioned period defaults to this month but is marked non-explicit', () => {
  const fallback = resolvePeriod({}, NOW);
  assert.equal(fallback.is_month, true);
  assert.equal(fallback.month, 7);
  assert.equal(fallback.year, 2026);
  assert.equal(fallback.explicit, false);
  assert.equal(resolvePeriod({ period: 'this_month' }, NOW).explicit, true);
});

test('Vietnamese period phrases are detected without guessing', () => {
  assert.deepEqual(detectPeriodFromText('tuần này tôi xài bao nhiêu'), { period: 'this_week' });
  assert.deepEqual(detectPeriodFromText('hôm qua chi bao nhiêu'), { period: 'yesterday' });
  assert.deepEqual(detectPeriodFromText('15 ngày qua'), { period: 'last_n_days', days: 15 });
  assert.deepEqual(detectPeriodFromText('quý trước'), { period: 'last_quarter' });
  assert.deepEqual(detectPeriodFromText('từ đầu năm'), { period: 'year_to_date' });
  assert.deepEqual(detectPeriodFromText('tháng 5/2025'), { period: 'month', month: 5, year: 2025 });
  // No period mentioned → no guess, so callers can apply their own default.
  assert.equal(detectPeriodFromText('tôi có những ví nào'), null);
});

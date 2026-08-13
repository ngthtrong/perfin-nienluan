const test = require('node:test');
const assert = require('node:assert/strict');

const { toolCallToIntent, FINANCIAL_TOOL_DECLARATIONS } = require('../services/ai/toolDeclarations');
const {
  routeLocalIntent,
  extractAllAmounts,
  isRecurringPaymentAcknowledgement,
} = require('../services/ai/localIntentRouter');
const { enforceInsightUnits, AIServiceManager } = require('../services/ai.service');

const categories = [
  { id: 1, name: 'Ăn uống', type: 'expense', icon: '🍜' },
  { id: 2, name: 'Di chuyển', type: 'expense', icon: '🚗' },
  { id: 3, name: 'Khác', type: 'expense', icon: '📦' },
  { id: 4, name: 'Lương', type: 'income', icon: '💰' },
  { id: 5, name: 'Khác', type: 'income', icon: '📦' },
];

test('tool declarations have unique names and map multi-transaction calls', () => {
  assert.equal(new Set(FINANCIAL_TOOL_DECLARATIONS.map((tool) => tool.name)).size, FINANCIAL_TOOL_DECLARATIONS.length);
  const result = toolCallToIntent({
    name: 'record_transactions',
    args: { transactions: [
      { description: 'phở', amount: 40000, type: 'expense', category_name: 'Ăn uống' },
      { description: 'grab', amount: 50000, type: 'expense', category_name: 'Di chuyển' },
    ] },
  });
  assert.equal(result.intent, 'transactions');
  assert.equal(result.transactions.length, 2);

  const query = toolCallToIntent({
    name: 'query_financial_data',
    args: {
      query: 'transactions',
      transaction_type: 'expense',
      search: 'đánh bida',
      action: 'aggregate',
    },
  });
  assert.equal(query.intent, 'query_transactions');
  assert.equal(query.query.type, 'expense');
  assert.equal(query.query.search, 'đánh bida');
});

test('local router extracts multiple transactions without splitting a single combined item', () => {
  const multi = routeLocalIntent('ăn sáng 30k, grab 45k', categories);
  assert.equal(multi.intent, 'transactions');
  assert.deepEqual(multi.transactions.map((item) => item.amount), [30000, 45000]);

  const single = routeLocalIntent('cà phê và bánh 50k', categories);
  assert.equal(single.intent, 'transaction');
  assert.equal(single.transaction.amount, 50000);
});

test('goal amount extraction ignores duration numbers and prioritizes money units', () => {
  assert.deepEqual(extractAllAmounts('trong 5 năm tiết kiệm 300 triệu'), [300000000]);
  const result = routeLocalIntent('trong 5 năm mình muốn tiết kiệm 300 triệu mua nhà', categories);
  assert.equal(result.intent, 'goal_create');
  assert.equal(result.goal.target_amount, 300000000);
  assert.match(result.goal.target_date, /^\d{4}-\d{2}-\d{2}$/);
});

test('query and budget intents use deterministic local routing', () => {
  assert.equal(routeLocalIntent('tiền của mình đủ xài tới ngày lương không?', categories).intent, 'query_runway');
  assert.equal(routeLocalIntent('mình có phí định kỳ ẩn nào không?', categories).intent, 'query_subscriptions');
  assert.equal(routeLocalIntent('gợi ý ngân sách giúp mình', categories).intent, 'budget_suggest');
  assert.equal(routeLocalIntent('gợi ý danh mục mới phù hợp', categories).intent, 'query_category_suggestions');
  assert.equal(routeLocalIntent('bạn có lời khuyên nào cho tôi không?', categories).intent, 'query_insights');
  assert.equal(routeLocalIntent('tư vấn cho tôi', categories).intent, 'query_insights');
});

test('transaction questions retain their requested filter instead of becoming a monthly summary', () => {
  const amountQuery = routeLocalIntent('tôi đã chi bao nhiêu tiền đánh bida trong tháng này?', categories);
  assert.equal(amountQuery.intent, 'query_transactions');
  assert.equal(amountQuery.query.action, 'aggregate');
  assert.equal(amountQuery.query.type, 'expense');
  // "tháng này" is now a period the user named, not an implicit default.
  // current_month only stays true when no period was mentioned at all.
  assert.equal(amountQuery.query.period, 'this_month');
  assert.equal(amountQuery.query.current_month, false);
  assert.equal(amountQuery.query.search, 'đánh bida');

  const referent = routeLocalIntent('liệt kê 5 giao dịch đó', categories);
  assert.equal(referent.intent, 'query_transactions');
  assert.equal(referent.query.reference, 'last_category_retag');
  assert.equal(referent.query.limit, 5);
  assert.equal(referent.query.search, null);
});

test('short recurring payment replies are recognized without treating arbitrary payment text as acknowledgement', () => {
  assert.equal(isRecurringPaymentAcknowledgement('tôi đã thanh toán rồi'), true);
  assert.equal(isRecurringPaymentAcknowledgement('tôi đã thanh toán r.'), true);
  assert.equal(routeLocalIntent('tôi đã thanh toán r', categories).intent, 'recurring_pay');
  assert.equal(isRecurringPaymentAcknowledgement('tôi đã thanh toán tiền điện 500k'), false);
});

test('high-confidence chat intents bypass an enabled provider', async () => {
  const manager = new AIServiceManager();
  let providerCalls = 0;
  manager.selected.provider = 'gemini';
  manager.gemini = {
    models: {
      async generateContent() {
        providerCalls += 1;
        return { text: 'generic response' };
      },
    },
  };

  const transactionQuery = await manager.parseTransaction(
    'tôi đã chi bao nhiêu tiền đánh bida trong tháng này?',
    categories
  );
  const paid = await manager.parseTransaction('tôi đã thanh toán rồi', categories);

  assert.equal(transactionQuery.intent, 'query_transactions');
  assert.equal(transactionQuery.query.search, 'đánh bida');
  assert.equal(paid.intent, 'recurring_pay');
  assert.equal(providerCalls, 0);
});

test('an open-ended question reaches the provider instead of a weak local guess', async () => {
  const manager = new AIServiceManager();
  let providerCalls = 0;
  manager.selected.provider = 'gemini';
  manager.gemini = {
    models: {
      async generateContent() {
        providerCalls += 1;
        return { text: 'generic response' };
      },
    },
  };

  // Advice and unfiltered spending questions used to be answered from the local
  // regex parse. The model routes them better, so they no longer pre-empt it.
  await manager.parseTransaction('tư vấn cho tôi', categories);
  await manager.parseTransaction('tháng này tôi chi bao nhiêu', categories);

  assert.equal(providerCalls, 2);
});

test('general questions do not enter transaction clarification state', async () => {
  assert.equal(routeLocalIntent('bạn là ai?', categories).intent, 'question');
  assert.equal(routeLocalIntent('bạn có thể làm gì?', categories).intent, 'question');
  assert.equal(routeLocalIntent('thời tiết hôm nay thế nào?', categories).intent, 'question');

  const incompleteTransaction = routeLocalIntent('ăn phở', categories);
  assert.equal(incompleteTransaction.needs_clarification, true);
  assert.equal(incompleteTransaction.transaction.category_name, 'Ăn uống');

  const manager = new AIServiceManager();
  assert.match((await manager.chat('bạn là ai?')).text, /PERFIN/);
  assert.match((await manager.chat('bạn có thể làm gì?')).text, /ghi thu chi/i);
});

test('insight narration cannot relabel daily runway burn as monthly', () => {
  const text = enforceInsightUnits(
    'Với mức chi tiêu trung bình hàng tháng là 729.441đ, dòng tiền đang giảm.',
    { runway: { avgBurn: 729441 } }
  );
  assert.match(text, /trung bình mỗi ngày/i);
  assert.doesNotMatch(text, /trung bình hàng tháng/i);
});

test('provider order follows the current selection instead of startup mode', async () => {
  const manager = new AIServiceManager();
  manager.gemini = {};
  manager.getGeminiModels = async () => ['gemini-3.5-flash-lite'];

  assert.deepEqual(manager.getStatus().allowed_models, [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
  ]);

  await manager.setSelection({ provider: 'gemini', model: 'gemini-3.5-flash-lite' });
  assert.deepEqual(manager.getProviderOrder(), ['gemini']);

  await manager.setSelection({ provider: 'local' });
  assert.deepEqual(manager.getProviderOrder(), []);
});

test('empty OCR or voice text falls back without throwing', async () => {
  const manager = new AIServiceManager();
  const result = await manager.parseFromMedia('', categories, 'receipt');

  assert.equal(result.success, true);
  assert.equal(result.provider_used, 'local');
  assert.equal(result.intent, 'unclear');
  assert.equal(result.transaction.amount, null);
  assert.equal(result.needs_clarification, true);
});

test('media extraction falls back locally when provider returns prose without a tool call', async () => {
  const manager = new AIServiceManager();
  manager.parseTransaction = async () => ({
    success: true,
    provider_used: 'gemini',
    intent: 'question',
    chat_response: 'Bạn có thể nói rõ hơn không?',
  });

  const result = await manager.parseFromMedia('chi bốn mươi lăm nghìn mua hủ tiếu', categories, 'voice');
  assert.equal(result.provider_used, 'local');
  assert.equal(result.fallback_from, 'gemini');
  assert.equal(result.intent, 'transaction');
  assert.equal(result.transaction.amount, 45_000);
});

test('receipt extraction combines optional user context before the local fallback parses it', async () => {
  const manager = new AIServiceManager();
  manager.parseTransaction = async () => ({
    success: true,
    provider_used: 'gemini',
    intent: 'question',
  });

  const result = await manager.parseFromMedia(
    'TOTAL 100000',
    categories,
    'receipt',
    'Phần của mình là 50k tiền ăn'
  );
  assert.equal(result.provider_used, 'local');
  assert.equal(result.transaction.amount, 50_000);
  assert.equal(result.transaction.category_name, 'Ăn uống');
});

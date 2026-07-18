process.env.REDIS_ENABLED = 'false';

const test = require('node:test');
const assert = require('node:assert/strict');

const ChatMessage = require('../models/chatMessage.model');
const TransactionModel = require('../models/transaction.model');
const RecurringBillModel = require('../models/recurringBill.model');
const Persona = require('../services/persona.service');
const pending = require('../services/pendingTransaction.service');
const ConversationState = require('../services/conversationState.service');
const {
  categoryRetagTransactionIds,
  selectRelevantReminderBills,
  transactionMonthWindow,
  handleTransactionQuery,
  handleRecurringPay,
} = require('../routes/chat.routes');

const originals = {
  latestRetag: ChatMessage.getLatestCategoryRetagContext,
  latestReminder: ChatMessage.getLatestRecurringReminderContext,
  getByIds: TransactionModel.getByIds,
  getAll: TransactionModel.getAll,
  getFilteredTotals: TransactionModel.getFilteredTotals,
  getDueBills: RecurringBillModel.getDueBills,
  getPersona: Persona.getActivePersona,
};

test.afterEach(async () => {
  ChatMessage.getLatestCategoryRetagContext = originals.latestRetag;
  ChatMessage.getLatestRecurringReminderContext = originals.latestReminder;
  TransactionModel.getByIds = originals.getByIds;
  TransactionModel.getAll = originals.getAll;
  TransactionModel.getFilteredTotals = originals.getFilteredTotals;
  RecurringBillModel.getDueBills = originals.getDueBills;
  Persona.getActivePersona = originals.getPersona;
  await pending.clear('default_user');
  await ConversationState.clear('default_user');
});

test('category-retag referent keeps the exact server-produced transaction ids', async () => {
  Persona.getActivePersona = async () => ({ decorate: (text) => text });
  ChatMessage.getLatestCategoryRetagContext = async () => ({
    metadata: {
      category_retag: { transaction_ids: [42, 7, '42', 9] },
    },
  });
  TransactionModel.getAll = async () => {
    throw new Error('must not widen an exact referent into a filtered list');
  };
  TransactionModel.getByIds = async (ids, ownerId) => {
    assert.deepEqual(ids, [42, 7, 9]);
    assert.equal(ownerId, 'default_user');
    return ids.map((id) => ({
      id,
      description: `Giao dịch ${id}`,
      amount: id * 1000,
      type: 'expense',
      category_name: 'Vé số',
      transaction_date: '2026-07-10',
    }));
  };

  const response = await handleTransactionQuery({
    intent: 'query_transactions',
    query: { action: 'list', reference: 'last_category_retag', limit: 5 },
  });

  assert.deepEqual(response.transactions.map((item) => item.id), [42, 7, 9]);
  assert.deepEqual(response.filters.transaction_ids, [42, 7, 9]);
  assert.equal(response.summary.transaction_count, 3);
  assert.match(response.message, /nhóm vừa được phân loại/);
});

test('missing or malformed retag metadata never falls back to unrelated current-month transactions', () => {
  assert.deepEqual(categoryRetagTransactionIds(null), []);
  assert.deepEqual(categoryRetagTransactionIds({ metadata: { category_retag: { transaction_ids: ['x', -1] } } }), []);
});

test('transaction month windows are exact calendar boundaries', () => {
  assert.deepEqual(transactionMonthWindow({ month: 2, year: 2024 }), {
    month: 2,
    year: 2024,
    from: '2024-02-01',
    to: '2024-02-29',
  });
});

test('filtered expense question reports only matching transactions, not the whole-month summary', async () => {
  Persona.getActivePersona = async () => ({ decorate: (text) => text });
  let capturedFilters;
  TransactionModel.getAll = async (_ownerId, filters) => {
    capturedFilters = filters;
    return {
      data: [{
        id: 11,
        description: 'Đánh bida',
        amount: 120000,
        type: 'expense',
        category_name: 'Giải trí',
        transaction_date: '2026-07-12',
      }],
      pagination: { total: 1 },
    };
  };
  TransactionModel.getFilteredTotals = async (_ownerId, filters) => {
    assert.equal(filters.search, 'đánh bida');
    assert.equal(filters.type, 'expense');
    return { transaction_count: 1, total_income: 0, total_expense: 120000, total_amount: 120000 };
  };

  const response = await handleTransactionQuery({
    intent: 'query_transactions',
    query: {
      action: 'aggregate',
      type: 'expense',
      search: 'đánh bida',
      month: 7,
      year: 2026,
    },
  });

  assert.equal(capturedFilters.from, '2026-07-01');
  assert.equal(capturedFilters.to, '2026-07-31');
  assert.equal(response.type, 'transaction_summary');
  assert.equal(response.summary.total_expense, 120000);
  assert.match(response.message, /1 giao dịch.*đánh bida.*tổng chi/);
  assert.doesNotMatch(response.message, /chênh lệch/);
});

test('short paid reply resolves only the bill in the recent reminder and creates a confirmable preview', async () => {
  Persona.getActivePersona = async () => ({ decorate: (text) => text });
  const due = [
    {
      id: 73,
      name: 'Hủ tiếu',
      amount: 73046,
      category_id: 4,
      category_name: 'Ăn uống',
      category_icon: '🍜',
      wallet_id: 2,
      next_due_date: '2026-07-17',
    },
    {
      id: 99,
      name: 'Internet',
      amount: 250000,
      category_id: 5,
      wallet_id: 2,
      next_due_date: '2026-07-17',
    },
  ];
  RecurringBillModel.getDueBills = async () => due;
  ChatMessage.getLatestRecurringReminderContext = async () => ({
    metadata: { notification_type: 'recurring_bill_reminder', bill_ids: [73] },
  });

  const response = await handleRecurringPay({
    intent: 'recurring_pay',
    recurring: { acknowledgement: true },
  });

  assert.equal(response.type, 'transaction_preview');
  assert.equal(response.transaction.bill_id, 73);
  assert.equal(response.transaction.period_due_date, '2026-07-17');
  assert.ok(response.pending_id);

  const firstClaim = await pending.claim('default_user', response.pending_id);
  const duplicateClaim = await pending.claim('default_user', response.pending_id);
  assert.equal(firstClaim.kind, 'recurring_payment');
  assert.equal(duplicateClaim, null);
});

test('a stale reminder cannot advance and pay a new or unrelated period', async () => {
  Persona.getActivePersona = async () => ({ decorate: (text) => text });
  RecurringBillModel.getDueBills = async () => [{ id: 99, name: 'Internet' }];
  ChatMessage.getLatestRecurringReminderContext = async () => ({ metadata: { bill_ids: [73] } });

  const selection = selectRelevantReminderBills([{ id: 99 }], { metadata: { bill_ids: [73] } });
  assert.equal(selection.constrained, true);
  assert.deepEqual(selection.candidates, []);

  const response = await handleRecurringPay({
    intent: 'recurring_pay',
    recurring: { acknowledgement: true },
  });
  assert.equal(response.type, 'chat_response');
  assert.match(response.message, /không ghi thêm giao dịch trùng/);
  assert.equal(await pending.get('default_user'), null);
});

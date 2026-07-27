// Handler-level checks for read-only chat queries.
//
// The router picking the right intent is only half the fix: the handler then has to
// honour the parameters it was given. These tests pin the two failures that made
// four different questions produce the same monthly report — a reply label taken
// from the calendar instead of the request, and a budget listing that ignored the
// category it was asked about.

const test = require('node:test');
const assert = require('node:assert/strict');

const personaPath = require.resolve('../services/persona.service');
const budgetPath = require.resolve('../models/budget.model');
const accountPath = require.resolve('../models/account.model');
const transactionPath = require.resolve('../models/transaction.model');
const reportPath = require.resolve('../services/report.service');
const routesPath = require.resolve('../routes/chat.routes');

const Persona = require(personaPath);
const BudgetModel = require(budgetPath);
const AccountModel = require(accountPath);
const TransactionModel = require(transactionPath);
const ReportService = require(reportPath);

const originals = {
  persona: Persona.getActivePersona,
  budgets: BudgetModel.getProgress,
  wallets: AccountModel.getAll,
  totals: TransactionModel.getFilteredTotals,
  summary: ReportService.getMonthlySummary,
};

// Stubs shared by every case; individual tests overwrite what they care about.
let budgetRows = [];
let budgetCallArgs = null;
let walletRows = [];
let totalsCallArgs = null;

Persona.getActivePersona = async () => null;
BudgetModel.getProgress = async (...args) => {
  budgetCallArgs = args;
  return budgetRows;
};
AccountModel.getAll = async () => walletRows;
TransactionModel.getFilteredTotals = async (userId, filters) => {
  totalsCallArgs = { userId, filters };
  return { total_income: 0, total_expense: 320000, transaction_count: 4, total_amount: 320000 };
};
ReportService.getMonthlySummary = async (userId, month, year) => ({
  month,
  year,
  total_income: 0,
  total_expense: 0,
  net: 0,
});

delete require.cache[routesPath];
const { handleFinancialQuery, queryWindow, abandonsConversation } = require(routesPath);

test.after(() => {
  Persona.getActivePersona = originals.persona;
  BudgetModel.getProgress = originals.budgets;
  AccountModel.getAll = originals.wallets;
  TransactionModel.getFilteredTotals = originals.totals;
  ReportService.getMonthlySummary = originals.summary;
  delete require.cache[routesPath];
});

test('a budget question about an untracked category says so instead of listing every budget', async () => {
  budgetRows = [
    { category_name: 'Ăn uống', amount_limit: 3000000, spent: 1200000, remaining: 1800000, percentage: 40 },
    { category_name: 'Di chuyển', amount_limit: 1000000, spent: 400000, remaining: 600000, percentage: 40 },
  ];

  const result = await handleFinancialQuery({
    intent: 'query_budgets',
    query: { query: 'budgets', category_name: 'bida' },
  });

  assert.equal(result.type, 'budget_progress');
  assert.deepEqual(result.budgets, []);
  assert.match(result.message, /chưa đặt ngân sách cho “bida”/);
  // The user still learns what *is* tracked, without a 14-row dump.
  assert.match(result.message, /Ăn uống, Di chuyển/);
});

test('a budget question about a tracked category returns only that category', async () => {
  budgetRows = [
    { category_name: 'Ăn uống', amount_limit: 3000000, spent: 1200000, remaining: 1800000, percentage: 40 },
    { category_name: 'Di chuyển', amount_limit: 1000000, spent: 400000, remaining: 600000, percentage: 40 },
  ];

  const result = await handleFinancialQuery({
    intent: 'query_budgets',
    query: { query: 'budgets', category_name: 'Ăn uống' },
  });

  assert.equal(result.budgets.length, 1);
  assert.equal(result.budgets[0].category_name, 'Ăn uống');
});

test('a budget question carries its requested month into the model call', async () => {
  budgetRows = [];
  budgetCallArgs = null;

  await handleFinancialQuery({
    intent: 'query_budgets',
    query: { query: 'budgets', period: 'month', month: 3, year: 2026 },
  });

  assert.deepEqual(budgetCallArgs, ['default_user', 3, 2026]);
});

test('wallet questions list wallets with balances instead of a monthly summary', async () => {
  walletRows = [
    { id: 1, name: 'Tiền mặt', type: 'cash', balance: 500000, is_default: true },
    { id: 2, name: 'Vietcombank', type: 'bank', balance: 12000000, is_default: false },
  ];

  const result = await handleFinancialQuery({ intent: 'query_wallets', query: { query: 'wallets' } });

  assert.equal(result.type, 'wallet_list');
  assert.equal(result.total_balance, 12500000);
  assert.match(result.message, /2 ví/);
  assert.match(result.message, /Tiền mặt \(tiền mặt\)/);
  assert.match(result.message, /Vietcombank \(ngân hàng\)/);
});

test('an empty wallet list offers a first wallet rather than reporting zero income', async () => {
  walletRows = [];
  const result = await handleFinancialQuery({ intent: 'query_wallets', query: { query: 'wallets' } });
  assert.equal(result.type, 'chat_response');
  assert.match(result.message, /chưa có ví nào/);
});

test('a weekly summary is totalled over its real dates, not widened to the month', async () => {
  totalsCallArgs = null;

  const result = await handleFinancialQuery({
    intent: 'query_summary',
    query: { query: 'summary', period: 'this_week' },
  });

  const expected = queryWindow({ period: 'this_week' });
  assert.equal(result.type, 'report');
  assert.deepEqual(totalsCallArgs.filters, { from: expected.from, to: expected.to });
  assert.equal(result.summary.from, expected.from);
  assert.equal(result.summary.to, expected.to);
  // The label must describe the week that was asked about, not the calendar month.
  assert.match(result.message, /Tổng kết tuần này/);
  assert.doesNotMatch(result.message, /^Tháng /);
});

test('a summary with no stated period still answers for the current month', async () => {
  const result = await handleFinancialQuery({ intent: 'query_summary', query: { query: 'summary' } });
  const now = new Date();
  assert.equal(result.summary.month, now.getMonth() + 1);
  assert.equal(result.summary.year, now.getFullYear());
});

// ── Stale clarification state ────────────────────────────────────────────────
//
// A pending slot-fill used to consume every following message for its 5-minute
// TTL, so an unrelated question came back as "mình chưa đọc được thông tin đó".

const categories = [
  { id: 1, name: 'Ăn uống', type: 'expense' },
  { id: 2, name: 'Di chuyển', type: 'expense' },
];

test('a new question abandons a half-finished clarification instead of feeding it', () => {
  const pendingAmount = { intent: 'transaction', awaiting: ['amount'], collected: {} };

  // Questions and read-only asks change the subject.
  assert.equal(abandonsConversation('tôi có những ví nào?', pendingAmount, categories), true);
  assert.equal(abandonsConversation('tuần này tôi xài bao nhiêu', pendingAmount, categories), true);
  assert.equal(abandonsConversation('danh sách khoản chi cố định', pendingAmount, categories), true);
  assert.equal(abandonsConversation('tôi đang có các mục tiêu gì?', pendingAmount, categories), true);

  // A bare value is the answer the flow is waiting for.
  assert.equal(abandonsConversation('50k', pendingAmount, categories), false);
  assert.equal(abandonsConversation('30 nghìn', pendingAmount, categories), false);
  assert.equal(abandonsConversation('tiền phòng', pendingAmount, categories), false);
});

test('a numbered bill choice is always an answer, never a change of subject', () => {
  const pendingChoice = {
    intent: 'recurring_history',
    awaiting: ['bill_choice'],
    candidates: [{ id: 1, name: 'iCloud' }, { id: 2, name: 'iCloud+' }],
    collected: {},
  };
  assert.equal(abandonsConversation('2', pendingChoice, categories), false);
  assert.equal(abandonsConversation('iCloud+', pendingChoice, categories), false);
});

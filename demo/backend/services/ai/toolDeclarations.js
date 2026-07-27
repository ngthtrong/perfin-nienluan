// Gemini function declarations used by PERFIN's intent router.
//
// The model only selects and fills a typed command here. Actual side effects remain in
// the chat orchestration layer, after validation and (where appropriate) user
// confirmation. This separation makes tool-use safe and keeps the local fallback usable.

const FINANCIAL_TOOL_DECLARATIONS = [
  {
    name: 'record_transactions',
    description: 'Extract one or more income/expense transactions for preview. Never saves them directly.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              amount: { type: 'number', exclusiveMinimum: 0 },
              type: { type: 'string', enum: ['income', 'expense'] },
              category_name: { type: 'string' },
              transaction_date: { type: ['string', 'null'], description: 'YYYY-MM-DD when known' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['description', 'amount', 'type', 'category_name'],
          },
        },
      },
      required: ['transactions'],
    },
  },
  {
    name: 'manage_recurring_bill',
    description: 'Create, list, pay, pause, or inspect the history of a recurring bill.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'list', 'pay', 'pause', 'history'] },
        name: { type: ['string', 'null'] },
        amount: { type: ['number', 'null'] },
        frequency: { type: ['string', 'null'], enum: ['weekly', 'monthly', 'quarterly', 'yearly', null] },
        due_day: { type: ['number', 'null'], minimum: 1, maximum: 31 },
        wallet_name: { type: ['string', 'null'] },
      },
      required: ['action'],
    },
  },
  {
    name: 'create_financial_goal',
    description: 'Preview a saving, purchase, or debt-payoff goal and its deterministic plan.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        goal_type: { type: 'string', enum: ['saving', 'purchase', 'debt_payoff'] },
        target_amount: { type: 'number', exclusiveMinimum: 0 },
        current_amount: { type: 'number', minimum: 0 },
        target_date: { type: ['string', 'null'], description: 'YYYY-MM-DD when specified' },
        monthly_contribution: { type: ['number', 'null'], minimum: 0 },
        annual_interest_rate: { type: ['number', 'null'], minimum: 0 },
      },
      required: ['name', 'goal_type', 'target_amount'],
    },
  },
  {
    name: 'query_financial_data',
    description: [
      'Request exact computed financial data instead of guessing numbers.',
      'Use query=transactions with search/type/category and action=list or aggregate when the user asks about matching transactions; do not replace it with a whole-month summary.',
      'Use query=wallets when the user asks which wallets/accounts they have or what their balances are — never answer that with summary.',
      'Always set period when the user names a time frame ("tuần này" → this_week, "hôm qua" → yesterday, "7 ngày qua" → last_n_days with days=7, "tháng trước" → last_month, "quý này" → this_quarter). Omit period only when no time frame is mentioned.',
      'For query=budgets, set category_name to the category the user named (e.g. "ngân sách cho bida" → category_name="bida") so the answer covers only that budget instead of every budget.',
    ].join(' '),
    parametersJsonSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          enum: ['summary', 'transactions', 'wallets', 'insights', 'runway', 'subscriptions', 'goals', 'budgets', 'category_suggestions'],
        },
        period: {
          type: ['string', 'null'],
          enum: [
            'today', 'yesterday', 'this_week', 'last_week', 'last_n_days',
            'this_month', 'last_month', 'this_quarter', 'last_quarter',
            'this_year', 'last_year', 'year_to_date', 'custom', null,
          ],
          description: 'Time frame the user asked about. Use custom together with from/to for anything else.',
        },
        days: { type: ['number', 'null'], minimum: 1, maximum: 730, description: 'Number of days when period=last_n_days' },
        from: { type: ['string', 'null'], description: 'YYYY-MM-DD start date when period=custom' },
        to: { type: ['string', 'null'], description: 'YYYY-MM-DD end date when period=custom' },
        month: { type: ['number', 'null'], minimum: 1, maximum: 12 },
        year: { type: ['number', 'null'], minimum: 2020, maximum: 2100 },
        transaction_type: { type: ['string', 'null'], enum: ['income', 'expense', null] },
        category_name: { type: ['string', 'null'], description: 'Category or subject the user named, e.g. the category of a budget question' },
        search: { type: ['string', 'null'], description: 'Words from the requested transaction description/merchant/activity' },
        action: { type: ['string', 'null'], enum: ['list', 'aggregate', null] },
        limit: { type: ['number', 'null'], minimum: 1, maximum: 20 },
      },
      required: ['query'],
    },
  },
  {
    name: 'suggest_budget',
    description: 'Calculate category budget recommendations from historical spending.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        strategy: { type: 'string', enum: ['historical', 'balanced', '50_30_20'] },
        month: { type: ['number', 'null'], minimum: 1, maximum: 12 },
        year: { type: ['number', 'null'], minimum: 2020, maximum: 2100 },
      },
    },
  },
  {
    name: 'export_financial_data',
    description: 'Prepare a CSV or PDF export and return a download URL.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['csv', 'pdf'] },
        from: { type: ['string', 'null'] },
        to: { type: ['string', 'null'] },
      },
      required: ['format'],
    },
  },
  {
    name: 'transfer_money',
    description: 'Preview a transfer between two wallets. Never executes without confirmation.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        from_wallet_name: { type: 'string' },
        to_wallet_name: { type: 'string' },
        amount: { type: 'number', exclusiveMinimum: 0 },
        note: { type: ['string', 'null'] },
        transaction_date: { type: ['string', 'null'] },
      },
      required: ['from_wallet_name', 'to_wallet_name', 'amount'],
    },
  },
  {
    name: 'record_investment_pnl',
    description: 'Preview an investment profit or loss entry.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        wallet_name: { type: 'string' },
        amount: { type: 'number', description: 'Positive for profit, negative for loss' },
        note: { type: ['string', 'null'] },
        recorded_at: { type: ['string', 'null'] },
      },
      required: ['wallet_name', 'amount'],
    },
  },
];

function toolCallToIntent(call) {
  const args = call?.args || call?.arguments || {};
  switch (call?.name) {
    case 'record_transactions': {
      const transactions = Array.isArray(args.transactions) ? args.transactions : [];
      return {
        intent: transactions.length > 1 ? 'transactions' : 'transaction',
        transactions,
        transaction: transactions[0] || null,
        needs_clarification: transactions.length === 0,
      };
    }
    case 'manage_recurring_bill':
      return {
        intent: `recurring_${args.action}`,
        recurring: {
          name: args.name || null,
          amount: args.amount || null,
          frequency: args.frequency || null,
          due_day: args.due_day || null,
          wallet_name: args.wallet_name || null,
        },
      };
    case 'create_financial_goal':
      return { intent: 'goal_create', goal: args };
    case 'query_financial_data':
      return {
        intent: `query_${args.query}`,
        query: {
          ...args,
          type: args.transaction_type || args.type || null,
        },
      };
    case 'suggest_budget':
      return { intent: 'budget_suggest', budget: args };
    case 'export_financial_data':
      return { intent: 'export', export: args };
    case 'transfer_money':
      return { intent: 'transfer', transfer: args };
    case 'record_investment_pnl':
      return { intent: 'investment_pnl', investment: args };
    default:
      return null;
  }
}

module.exports = { FINANCIAL_TOOL_DECLARATIONS, toolCallToIntent };

process.env.REDIS_ENABLED = 'false';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  preparePendingTransactionUpdates,
  recordPendingClassificationFeedback,
  updateClassificationCorrectionMetadata,
  validatePendingTransactionDates,
} = require('../routes/chat.routes');

const current = {
  description: 'Cà phê',
  amount: 45_000,
  type: 'expense',
  category_id: 2,
  category_name: 'Ăn uống',
  wallet_id: 1,
  transaction_date: '2026-07-17',
};

const categories = [
  { id: 2, name: 'Ăn uống', icon: '🍜', type: 'expense' },
  { id: 3, name: 'Di chuyển', icon: '🚗', type: 'expense' },
  { id: 4, name: 'Lương', icon: '💰', type: 'income' },
];

test('pending transaction edit accepts date and hydrates a user-owned category', async () => {
  const updates = await preparePendingTransactionUpdates(current, {
    category_id: 3,
    transaction_date: '2026-07-18',
  }, {
    categories,
    today: new Date(2026, 6, 18, 10),
  });

  assert.deepEqual(updates, {
    category_id: 3,
    category_name: 'Di chuyển',
    category_icon: '🚗',
    transaction_date: '2026-07-18',
  });
});

test('pending transaction edit rejects future dates and mismatched categories', async () => {
  await assert.rejects(() => preparePendingTransactionUpdates(current, {
    transaction_date: '2026-07-19',
  }, {
    categories,
    today: new Date(2026, 6, 18, 23, 59),
  }), /không được nằm trong tương lai/);

  await assert.rejects(() => preparePendingTransactionUpdates(current, {
    categoryId: 4,
  }, { categories }), /không khớp với loại giao dịch/);
});

test('pending confirmation preflight rejects a future date before the preview is claimed', () => {
  assert.throws(() => validatePendingTransactionDates({
    kind: 'transaction',
    data: { ...current, transaction_date: '2026-07-19' },
  }, new Date(2026, 6, 18, 23, 59)), /không được nằm trong tương lai/);

  assert.throws(() => validatePendingTransactionDates({
    kind: 'transfer',
    data: { transaction_date: '2026-07-19' },
  }, new Date(2026, 6, 18, 23, 59)), /Ngày chuyển tiền không được nằm trong tương lai/);

  assert.throws(() => validatePendingTransactionDates({
    kind: 'investment_pnl',
    data: { recorded_at: '2026-07-19' },
  }, new Date(2026, 6, 18, 23, 59)), /Ngày ghi nhận lãi\/lỗ không được nằm trong tương lai/);
});

test('pending metadata tracks category corrections but not date edits and removes reverted corrections', () => {
  const corrected = { category_id: 3, category_name: 'Di chuyển', category_icon: '🚗' };
  const metadata = updateClassificationCorrectionMetadata(
    { follow_up: [{ intent: 'query_insights' }] },
    current,
    { ...corrected, transaction_date: '2026-07-18' },
    0
  );

  assert.deepEqual(metadata.classification_corrections, {
    0: {
      original_category: { category_id: 2, category_name: 'Ăn uống', type: 'expense' },
      corrected_category: { category_id: 3, category_name: 'Di chuyển', type: 'expense' },
    },
  });
  const dateOnly = updateClassificationCorrectionMetadata(metadata, { ...current, ...corrected }, {
    transaction_date: '2026-07-16',
  }, 0);
  assert.equal(dateOnly, metadata);

  const reverted = updateClassificationCorrectionMetadata(metadata, { ...current, ...corrected }, {
    category_id: 2,
    category_name: 'Ăn uống',
  }, 0);
  assert.equal(reverted.classification_corrections, undefined);
  assert.deepEqual(reverted.follow_up, [{ intent: 'query_insights' }]);
});

test('classification learning is recorded only from committed AI previews with a category correction', async () => {
  const calls = [];
  const item = {
    kind: 'transaction',
    data: {
      ...current,
      source: 'ai_chat',
      original_text: 'cà phê sáng 45k',
      category_id: 3,
      category_name: 'Di chuyển',
    },
    metadata: {
      classification_corrections: {
        0: {
          original_category: { category_id: 2, category_name: 'Ăn uống', type: 'expense' },
          corrected_category: { category_id: 3, category_name: 'Di chuyển', type: 'expense' },
        },
      },
    },
  };
  const recorded = await recordPendingClassificationFeedback(item, [{
    id: 91,
    category_id: 3,
    category_name: 'Di chuyển',
    type: 'expense',
  }], {
    feedbackService: {
      async recordClassificationCorrection(payload) {
        calls.push(payload);
        return payload;
      },
    },
    recordAfterCommit: async (label, recorder) => {
      assert.equal(label, 'classification');
      return recorder();
    },
  });

  assert.equal(recorded, 1);
  assert.deepEqual(calls, [{
    userId: 'default_user',
    transactionId: 91,
    originalText: 'cà phê sáng 45k',
    aiResult: { category_id: 2, category_name: 'Ăn uống', type: 'expense' },
    correctedResult: { category_id: 3, category_name: 'Di chuyển', type: 'expense' },
  }]);

  assert.equal(await recordPendingClassificationFeedback(
    { ...item, metadata: {} },
    [{ id: 92, category_id: 3, category_name: 'Di chuyển' }],
    { feedbackService: { async recordClassificationCorrection() { throw new Error('must not record'); } } }
  ), 0);
});

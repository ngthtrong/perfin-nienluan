const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildReceiptOptions,
  createMediaPendingPreview,
  readImageContext,
} = require('../routes/ai.routes');
const { combineMediaContext } = require('../services/ai.service');

test('receipt preview offers total versus itemized choices', () => {
  const options = buildReceiptOptions({
    transactions: [
      { description: 'Sữa', amount: 30000 },
      { description: 'Bánh', amount: 20000 },
      { description: 'Tổng hóa đơn: Siêu thị', amount: 50000 },
    ],
  });
  assert.equal(options.mode, 'choose_total_or_items');
  assert.equal(options.total.amount, 50000);
  assert.equal(options.items.length, 2);
  assert.equal(options.suggested, 'total');
});

test('single receipt transaction needs no mode choice', () => {
  assert.equal(buildReceiptOptions({ transaction: { description: 'Quán ăn', amount: 50000 } }), null);
});

test('incomplete media extraction returns a retryable clarification without pending data', async () => {
  const result = await createMediaPendingPreview({
    intent: 'unclear',
    transaction: { description: 'một hai ba bốn', amount: null, type: 'expense' },
  }, 'một hai ba bốn', 'voice');

  assert.equal(result.type, 'clarification');
  assert.equal(result.code, 'MEDIA_TRANSACTION_INCOMPLETE');
  assert.deepEqual(result.missing_fields, ['amount']);
  assert.equal(result.pending_id, undefined);
  assert.match(result.message, /45 nghìn/);
});

test('image upload accepts optional context aliases and combines them with OCR provenance', () => {
  assert.equal(readImageContext({ context: '  chia đôi hóa đơn với Minh  ' }), 'chia đôi hóa đơn với Minh');
  assert.equal(readImageContext({ message: 'đây là tiền ăn nhóm' }), 'đây là tiền ăn nhóm');
  assert.equal(readImageContext({ text: 'ghi vào công tác' }, { allowTextAlias: true }), 'ghi vào công tác');
  assert.equal(readImageContext({}), '');

  const combined = combineMediaContext('TOTAL 100000', 'Mình chỉ trả 50k');
  assert.match(combined, /Mình chỉ trả 50k/);
  assert.match(combined, /TOTAL 100000/);
  assert.throws(() => readImageContext({ context: 'x'.repeat(1001) }), /1000 ký tự/);
});

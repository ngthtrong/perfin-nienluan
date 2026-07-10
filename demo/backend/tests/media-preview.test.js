const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReceiptOptions } = require('../routes/ai.routes');

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

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.TZ = 'Asia/Ho_Chi_Minh';

const { normalizeAmount, inferDate, parseLocalTransaction } = require('../services/parser.service');

const categories = [
  { id: 1, name: 'Ăn uống', type: 'expense', icon: '🍜' },
  { id: 2, name: 'Mua sắm', type: 'expense', icon: '🛒' },
  { id: 3, name: 'Khác', type: 'expense', icon: '📦' },
];

test('normalizes spoken million fractions and per-item prices', () => {
  assert.equal(normalizeAmount('shopping 1 triệu 5'), 1_500_000);
  assert.equal(normalizeAmount('mua 3 cái áo mỗi cái 200k'), 600_000);
  assert.equal(normalizeAmount('50k x 2 ly cà phê'), 100_000);
  assert.equal(normalizeAmount('chi bốn mươi lăm nghìn mua hủ tiếu'), 45_000);
  assert.equal(normalizeAmount('hai trăm ba mươi nghìn tiền chợ'), 230_000);
  assert.equal(normalizeAmount('một triệu hai trăm nghìn tiền nhà'), 1_200_000);
  assert.equal(normalizeAmount('một triệu rưỡi tiền trọ'), 1_500_000);
  assert.equal(normalizeAmount('một hai ba bốn bột heo bốn'), null);
});

test('recognizes clothing and eating phrases with deterministic aliases', () => {
  const clothing = parseLocalTransaction('mua quần jeans 450 nghìn', categories);
  assert.equal(clothing.transaction.category_name, 'Mua sắm');

  const eating = parseLocalTransaction('đi ăn hết 250k cho 2 người', categories);
  assert.equal(eating.transaction.category_name, 'Ăn uống');
});

test('keeps explicitly negative natural-language amounts invalid instead of flipping their sign', () => {
  const parsed = parseLocalTransaction('ăn phở -50k', categories);
  assert.equal(parsed.transaction.amount, -50_000);
  assert.equal(parsed.needs_clarification, true);
  assert.match(parsed.clarification_message, /lớn hơn 0/);
});

test('uses the local calendar day instead of the previous UTC day', () => {
  const localAfterMidnight = new Date(2026, 6, 16, 0, 30, 0, 0);
  assert.equal(inferDate('hôm nay', localAfterMidnight), '2026-07-16');
  assert.equal(inferDate('hôm qua', localAfterMidnight), '2026-07-15');
});

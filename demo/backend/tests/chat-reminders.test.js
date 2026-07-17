const test = require('node:test');
const assert = require('node:assert/strict');
const { coveredRecurringBillIds } = require('../routes/chat.routes');

test('recurring fallback recognizes bill IDs already persisted by today worker', () => {
  const covered = coveredRecurringBillIds([
    {
      metadata: {
        source: 'proactive_worker',
        notification_type: 'recurring_bill_reminder',
        local_date: '2026-07-17',
        bill_ids: [1, '2'],
      },
    },
    {
      metadata: {
        source: 'proactive_worker',
        notification_type: 'recurring_bill_reminder',
        local_date: '2026-07-16',
        bill_ids: [3],
      },
    },
  ], '2026-07-17');

  assert.deepEqual([...covered], ['1', '2']);
});

test('recurring fallback safely handles JSON metadata and unrelated messages', () => {
  const covered = coveredRecurringBillIds([
    { metadata: '{"source":"proactive_worker","notification_type":"recurring_bill_reminder","local_date":"2026-07-17","bill_ids":[7]}' },
    { metadata: '{not-json' },
    { metadata: { type: 'transaction_preview', bill_ids: [8] } },
  ], '2026-07-17');

  assert.deepEqual([...covered], ['7']);
});

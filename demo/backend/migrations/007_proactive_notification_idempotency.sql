-- Proactive worker notification idempotency
-- Version: 007
--
-- BullMQ can retry jobs and multiple workers may process separately enqueued scans.
-- A stable event_key makes internal chat notification creation race-safe. Interactive
-- chat messages do not carry source=proactive_worker and are unaffected.

CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_messages_proactive_event
ON chat_messages (user_id, (metadata->>'event_key'))
WHERE metadata->>'source' = 'proactive_worker'
  AND metadata ? 'event_key';

# PERFIN proactive worker

The proactive worker is a separate BullMQ process. It schedules financial checks,
runs deterministic analytics, and writes safe assistant messages to `chat_messages`.
It does not send email, push notifications, SMS, or any other external message.

## Start

Run the migrations first, configure PostgreSQL and Redis, then start the API and
worker as separate processes:

```bash
docker compose -f compose.redis.yml up -d
npm run migrate
npm run dev
npm run worker
```

Use `.env.example` as the configuration reference. If Redis is missing,
unreachable, or `REDIS_ENABLED=false`, `npm run worker` logs that proactive jobs are
disabled and exits with status 0. The API continues to use its in-memory KV fallback.

## Default schedules

All times use `JOBS_TIMEZONE` (`Asia/Bangkok` by default).

| Job | Default schedule | Result |
| --- | --- | --- |
| `recurring-reminders` | Daily 08:00 | Aggregates unpaid bills in their reminder window into one internal message per user/day. |
| `runway-scan` | Daily 08:15 | Warns when projected cash runway is at or below `JOB_RUNWAY_ALERT_DAYS`. |
| `subscription-scan` | Monday 08:30 | Finds subscription-like spending and stores a message only when its fingerprint is new. |
| `month-end-insights` | 20:00 on days 28–31 | The handler runs only on the actual last local day, narrates fresh analytics using the active persona, and optionally generates an HTML report. |
| `cleanup-exports` | Daily 03:00 | Deletes expired files inside `exports/` and clears their stored path while retaining history. |

Every schedule has an `*_ENABLED` and `*_CRON` setting. `JOBS_ENABLED=false`
disables the whole worker. Scheduler definitions are upserted at startup, so starting
another worker does not create duplicate schedules. Stored messages also use a stable
`metadata.event_key` for retry-safe deduplication.

`JOB_MONTH_END_AUTO_EXPORT=false` is the safe default. Enable it to generate the
existing HTML-based PDF report at month end; no file is sent externally.

## Integration contract

The API may enqueue an immediate scan after an in-scope event without depending on
Redis availability:

```js
const { enqueueJob, JOB_NAMES } = require('./services/jobs');

const result = await enqueueJob(JOB_NAMES.RUNWAY_SCAN, {
  userId: 'default_user',
  trigger: 'transaction_created',
});
// Redis absent: { queued: false, reason: 'redis_unavailable' }
// Redis ready:  { queued: true, jobId, name }
```

Supported names are exported in `JOB_NAMES`:

- `RECURRING_REMINDERS`
- `RUNWAY_SCAN`
- `SUBSCRIPTION_SCAN`
- `MONTH_END_INSIGHTS`
- `CLEANUP_EXPORTS`

`userId` or `userIds` narrows user-scoped jobs. Without either, the worker reads all
rows from `users`; before migration 005 it safely falls back to `default_user`.

For an administrative/manual month-end run, enqueue
`{ userId, force: true }`. Add `autoExport: true` only when an internal report file is
desired. This is intentionally a module contract rather than a public unauthenticated
HTTP endpoint.

## Operations

- BullMQ retries failed jobs three times with exponential backoff.
- Completed and failed jobs are retained with bounded counts for diagnosis.
- `SIGINT` and `SIGTERM` stop intake and wait for active work before closing.
- Notification writes are atomic (`INSERT ... WHERE NOT EXISTS`) and safe across
  retries and multiple worker instances.
- Export cleanup rejects paths outside the configured export directory.

Run the pure scheduling/handler tests with:

```bash
npm run test:jobs
```

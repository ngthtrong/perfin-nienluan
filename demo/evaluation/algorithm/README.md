# Algorithm evaluation artifacts

This directory stores reproducible evidence for the algorithm-focused part of
the PERFIN report. The runners are executed from `demo/backend` with Redis and
background jobs disabled; they do not require PostgreSQL, external model APIs or
media runtimes.

## Commands

```bash
cd demo/backend
REDIS_ENABLED=false JOBS_ENABLED=false AI_PROVIDER=local npm run test:algorithm
REDIS_ENABLED=false JOBS_ENABLED=false AI_PROVIDER=local npm run benchmark:algorithms
REDIS_ENABLED=false JOBS_ENABLED=false AI_PROVIDER=local npm run benchmark:classification
```

Each run records the source snapshot, Node.js version, environment, timestamp
and relevant checksums. The performance runner uses synthetic data generated
with seed `20260814`, sizes 100/1,000/5,000/10,000, five warm-up runs and thirty
measured runs per algorithm and size. Its reported statistics are median and
p95 wall-clock time in milliseconds.

The manual functional cases belong to the report protocol and require the
author to record observed results and screenshots separately. This directory
contains no user-study data.

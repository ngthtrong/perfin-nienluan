# Algorithm performance benchmark

- Run: 2026-08-14T02:26:29.175Z
- Commit: `c18e160` · working tree dirty: yes
- Node.js: `v24.16.0`
- Environment: AMD Ryzen 5 5500U with Radeon Graphics; linux/x64; 12 logical CPUs
- Synthetic data seed: `20260814` · dataset SHA-256: `1031f58763c424429f7db49b3a41ba2f4b13013ff39b8030585c656157e3d6ee`
- Warm-up: 5 · measured runs: 30

| Algorithm | n | Expected complexity | Median (ms) | p95 (ms) |
|---|---:|---|---:|---:|
| linearTrend | 100 | O(n) | 0.084 | 0.296 |
| linearTrend | 1000 | O(n) | 0.055 | 0.387 |
| linearTrend | 5000 | O(n) | 0.174 | 1.827 |
| linearTrend | 10000 | O(n) | 0.265 | 0.515 |
| detectAnomalies | 100 | O(n log n) | 0.028 | 0.075 |
| detectAnomalies | 1000 | O(n log n) | 0.312 | 1.459 |
| detectAnomalies | 5000 | O(n log n) | 1.654 | 2.417 |
| detectAnomalies | 10000 | O(n log n) | 3.6 | 4.197 |
| completeMonthlyCashflow | 100 | O(n + w) | 0.063 | 0.155 |
| completeMonthlyCashflow | 1000 | O(n + w) | 0.113 | 0.197 |
| completeMonthlyCashflow | 5000 | O(n + w) | 0.25 | 1.423 |
| completeMonthlyCashflow | 10000 | O(n + w) | 0.512 | 0.956 |

Interpretation is limited to relative growth in this fixed local environment. The measurements do not establish a production latency target, live database/queue behavior, memory capacity or usability.

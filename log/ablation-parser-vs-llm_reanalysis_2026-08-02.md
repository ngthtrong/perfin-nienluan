# Reanalysis: local parser vs Gemini ablation

- Source artifact: `log/ablation-parser-vs-llm_2026-07-24.json`
- Source commit: `5f03476`
- Reanalysis date: 2026-08-02

The original runner filtered out null LLM categories before computing classification metrics. Its reported Gemini accuracy 59.52% and macro-F1 0.6068 therefore apply only to the 42 answered samples, not all 63 samples.

| Arm | Coverage | Full-set accuracy | Full-set macro-F1 | Conditional accuracy | Conditional macro-F1 | p50 |
|---|---:|---:|---:|---:|---:|---:|
| Local parser | 63/63 (100%) | 22.22% | 0.2039 | 22.22% | 0.2039 | 0 ms |
| Gemini | 42/63 (66.67%) | 25/63 (39.68%) | unavailable | 25/42 (59.52%) | 0.6068 | 964 ms |

All 63 provider calls completed without a recorded provider error, but 21 outputs contained no category and are treated as abstentions. The source artifact does not retain every sample-level prediction, so a full-set Gemini macro-F1 cannot be reconstructed honestly. The updated runner now retains records, counts abstentions as incorrect in full-set metrics, and reports conditional metrics only alongside coverage.

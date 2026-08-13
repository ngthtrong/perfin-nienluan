# PERFIN plan audit — 2026-08-10

This note records the implementation snapshot for the report revision. It is
not a clean release tag: the worktree remains intentionally dirty so the user
can review all changes before committing.

## Snapshot

- `HEAD`: `feae84b19cb5507a4be90b3c904acb30c7f020a6`
- Working tree: dirty (`59` paths reported before this note was added)
- Tracked working-tree diff SHA-256 at this audit point (untracked audit and
  template files are excluded by `git diff`):
  `d44351d751abfd4439226e759685119f329f919fbf68791bf56d0dfb20f66ebc`
- Dataset: `demo/data/dataFinance.csv`
- Dataset SHA-256:
  `418a943958f12ae13902680e530e0be92a71acdec4f10707e0a1c75684fbaed7`
- Category-map SHA-256:
  `8072dc3d5749932adbd17775867d1918ad58f7209d92771dc7a860743c6b573c`
- Dataset profile: 5,328 source/importable rows, 0 validation errors, 24
  exact duplicate rows in 23 groups, 615 IQR flags, date range
  2022-01-01--2026-08-10.

## Verification completed

- `REDIS_ENABLED=false JOBS_ENABLED=false npm test`: **247/247 pass**.
- `npm prune --ignore-scripts --no-audit --no-fund`: removed stale extraneous
  Google Vision/Speech packages from `node_modules`; `npm ls --depth=0` now
  reports both media SDKs absent.
- Node 24 built-in coverage over all loaded backend files: **68.12% line,
  72.77% branch, 72.27% function**. The planned component thresholds are not
  claimed as achieved; the table in Chapter 3 records this gap.
- Focused analytics/property/media boundary command: **21/21 pass**.
- Node syntax checks for changed JavaScript: pass.
- `npm run data:profile`: pass; totals and checksum agree with the profile
  above.
- Chromium Expo-web smoke: **5/5 synthetic captures pass** at CSS viewport
  `390x844`, device scale factor `2`; this is web viewport evidence, not
  native-device or UAT evidence.
- XeLaTeX EN and VI: both PDFs build successfully (92 English pages and 91
  Vietnamese pages including appendices). Main content remains within the
  intended 50--60-page range;
  appendix page counters restart with Arabic numbers. Final log scan found no
  LaTeX errors, undefined references, duplicate destinations, overfull boxes or
  rerun warnings (ordinary underfull/font warnings remain).

## Evidence boundary

Current classification, Gemini ablation, temporal correction, OCR/STT
accuracy, PostgreSQL/Redis live integration, numeric grounding, p50/p95 and
UAT are intentionally **Not measured** in the report. Their runners/protocols
are prepared, but they require a frozen clean snapshot and/or the controlled
20-image, 20-audio and five-participant inputs. Historical artifacts using the
5,265-row dataset remain for traceability only and are marked superseded.

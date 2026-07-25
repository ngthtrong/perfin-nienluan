# PERFIN review loops — DURABLE PLAN (survives compaction)

User directive: after finishing diagram restyle, run 5-6 review loops per
`archive/promt-loop.md`. Role = university lecturer grading a "Niên luận cơ sở
ngành" (undergrad basic-topic project, data+algorithms focus, NOT a thesis).
Tone: constructive, calibrated to course level.

## The 4 steps per loop (from archive/promt-loop.md)
1. Comprehensive critique of LaTeX report + demo, against resource/Guideline-report.md.
2. Write honest issue report → `loop/loopX/` (X = iteration). Two parts:
   - LaTeX: logic/clarity/length/vagueness errors; image quality; MISSING diagrams
     (auto-create with drawio/excalidraw skill); 
   - Demo: bugs + UI/UX (modern, muted/elegant colors, consistent, no basic mistakes).
3. Assess severity, lock the must-fix list for a good grade.
4. Execute fixes directly. RULES:
   - Bilingual sync: edit BOTH vi + en LaTeX in parallel.
   - Doc sync: after editing LaTeX + compiling, update resource/Report.md to match.
   - Demo: apply code fixes for bugs + UI/UX.

## Ground truth
- LaTeX: `latex/` builds main-vi.pdf / main-en.pdf. `cd latex && make` (or pdflatex).
- Chapters: latex/chapters/{vi,en}/chapter1-4.tex, references.tex, appendices.tex
- Frontmatter: latex/frontmatter/{vi,en}/
- Markdown mirror: resource/Report.md (must stay synced).
- Diagrams: 13 in archive/latex/figures/drawio/ + latex/figures/drawio/, rendered
  to both */figures/rendered/ (pdf+png+svg). Restyle plan: /tmp/drawio-app/RESTYLE-PLAN.md
  (01+02 done/synced; 03-13 exist & render, polish folds into loop fixes).
- Demo: demo/backend (Express/Node), demo/frontend (RN/Expo). No DB to run live.

## Status
- loop1: DONE. Report at loop/loop1/report.md. Fixes applied: L-01 (abstract parser-metric
  clarification, synced vi+en+Report.md, both PDFs compile). L-03 verified NOT a defect
  (18 tables is correct across migrations 001-008).
- loop2: DONE. Report at loop/loop2/report.md. Reviewed ch3 §3.2 (design). vi↔en verified
  parallel (46/46 anchors, 12/12 fig refs). L-04 DOWNGRADED to cosmetic: inspected
  08-text-sequence directly — straight arrows, aligned lifelines, no overlap already met
  (guideline line 130 satisfied); only color palette differs on 03-13. Not a legibility defect.
- loop3: DONE. Report at loop/loop3/report.md. Reviewed ch2 algorithms (strong: OLS/z-score/
  IQR/Pearson w/ citations, guards, worked examples) + ch3 testing. FIXED L-07 concretely:
  resource/Report.md carried a STALE 51-sentence ablation run (0.561/0.192/897ms) in 6 places;
  LaTeX had the newer authoritative 63-sentence run (0.607/0.204/964ms, verified vs log/*.json).
  Synced all 6 spots. Verified D-02: 0 hardcoded hex in 12 frontend screens (all use tokens).
- loop4: DONE. Report at loop/loop4/report.md. Fixed L-02 (abstract length: VI 290→211
  syllable-tokens ~150 words, EN 243→166 words; synced vi+en+Report.md; both PDFs compile).
  Verified PASS: cover double-border (1.5pt+0.5pt), IEEE refs (18=18), abbreviations (32),
  metadata complete. Fix-list status: L-01/L-02/L-03/L-06/L-07 all resolved. Remaining:
  L-04/L-05 (cosmetic palette on diagrams 03-13; straight-arrow rule already met).
- loop5: DONE. Report at loop/loop5/report.md. Demo verification pass (no code changes):
  ran pure-function tests — goal planner 12/12, analytics+budget 34/34 pass; code constants
  (z>=2.5, IQR_MULT 1.5) match ch2 formulas exactly. Security: 131 parameterized $1
  placeholders, atomic BEGIN/COMMIT/ROLLBACK, global error middleware; the 1 interpolated
  query (transaction.model.js:226 where.join + :228 SORT_EXPRESSIONS) verified SAFE —
  clauses hard-coded, sort_by whitelisted via hasOwnProperty on frozen obj, sort_order in
  [asc,desc]. No SQL injection. Backend genuinely solid.
- loop6: DONE. Report at loop/loop6/report.md. Final holistic pass + grade summary: text
  sources verified clean of stale numbers, both PDFs current, vi/en parallel. NOTE: loop6
  justified skipping diagram work with "render headless >120s/hình" — that claim is WRONG
  (measured 4.1s/figure in loop7). Don't reuse it as a reason to skip figure fixes.
- loop7: DONE. Report at loop/loop7/report.md. Opened two areas never checked directly in
  loops 1-6 and both yielded real defects.
  FIXED L-08 (severe, formatting compliance): Guideline lines 9-12 mandate heading colors
  #00B0F0 (H1) / #2F5496 (H2-H4); grep across latex/ returned ZERO hits — all headings were
  black. Added \definecolor{HeadingOne}/{HeadingTwo} + \color{} on all 5 \titleformat blocks
  in config/preamble.tex. Preamble is in COMMON so one edit covers vi+en (bilingual rule met).
  Also removed a dead \graphicspath entry pointing at the deleted archive/ tree.
  FIXED L-09 (figure typography): 7/13 .drawio files declared
  fontFamily=Trebuchet MS,...; the other 6 declare none (per RESTYLE-PLAN "Body font:
  default"). Stripped the declaration from those 7 (785→0 occurrences, XML still well-formed)
  so all 13 inherit one font; re-rendered all 21 pdf/png/svg outputs. Verified: all 13 SVGs
  now report one uniform font-family; all 13 figure PDFs images=0 (still true vector).
  CAUTION on verification: drawio PDF export converts text to vector outlines, so pdffonts
  reports NONE and pdftotext returns 0 words for ALL 13 figures — that is NOT a defect.
  Verify figure fonts on the SVGs, which retain real text.
  FIXED L-10 (margin overflow): EN build had 22 overfull hboxes (worst 43pt ≈ 1.5cm of text
  outside the margin) vs 3 in VI, because fixed L{} column widths were tuned for the shorter
  Vietnamese strings. Widened 3 ch3 tables (mirrored in both languages), narrowed the EN
  feedback table's first column, and raised \emergencystretch 2em→3em. Result: EN 22→0,
  VI 3→2 (both remaining are 1.9pt ≈ 0.07mm, below visual threshold).
  FIXED D-04/D-05 (demo a11y): 14 icon-only buttons had no accessible name — added
  accessibilityRole + Vietnamese accessibilityLabel across 6 files; touch targets were
  32-38pt with hitSlop grep = 0 app-wide — added a shared HIT_SLOP token in theme/tokens.js
  reaching ≥44pt without changing layout geometry.
  Verified no regressions: backend 178/178, mobile-web UI smoke PASS, both PDFs build with
  exit 0, 0 warnings, 13 figures embedded each, heading colors present.
  MAKEFILE TRAP (cost time — remember): figures/rendered/*.pdf are NOT prerequisites of the
  PDF targets, so after re-rendering figures a plain `make` reports "up to date" and silently
  skips re-embedding them. Force it (touch config/preamble.tex, or rm main-{vi,en}.pdf).

- loop8: DONE. Report at loop/loop8/report.md. Areas newly checked: TOC 4 levels, ch1
  objectives, ch4 conclusion/limits, and evidence traceability to log/*.json.
  FIXED P-01 (severe): commit c688762 DELETED the whole log/ directory — all 12 evidence
  artifacts that every "measured" number must trace to. Same commit added loop/promt-loop.md
  which mandates that traceability. Restored via `git checkout c688762^ -- log/`.
  IMPORTANT: log/ is NOT in .gitignore; if it vanishes again, restore from c688762^.
  FIXED L-11: report cited artifacts at `resource/report/evidence/`, a path that no longer
  exists — loop1's commit d5c9eab renamed it (R100) to `log/` without updating the prose.
  Fixed in ch3 vi+en:596 and Report.md:1149.
  FIXED L-12 (stale number): report published "100/100" backend tests in 7 places; actual
  run is 178/178 across 37 test files (suite grew, incl. loop7's user-scope tests). Created
  log/backend-test-run_2026-07-25.json with a `supersedes` field so the 100/100 milestone
  stays traceable rather than erased. Updated all 7 sites + latex/README.md.
  FIXED L-13 (wrong-set comparison): abstract + ch4 said parser macro-F1 0.177 vs LLM 0.607
  "on the same stratified sample". Wrong: 0.177 is the 5,265-row benchmark; the ablation's
  own parser arm on the 63-sentence sample is 0.204. Ratio was inflated 3.4x vs the true
  3.0x. §3.3.2.3's detail tables were already correct — only the summaries mixed the sets,
  so this does NOT reverse loop3/loop6. Rewrote 6 sites to bind each number to its set.
  Verified PASS (don't recheck): TOC depth is correct — tocdepth=3 yields exactly 4 printed
  levels; the 4 `\contentsline{paragraph}` lines in .toc are suppressed at typeset time and
  are NOT a 5th level. ch1 O1-O5 all have testable acceptance criteria. ch4 lists 8
  self-declared limits (incl. admitting un-scoped ID lookups). Cover metadata 100% complete
  per Guideline 2.1. Abstract still in range after edits: VI 219 syllable-tokens (~156
  words), EN 172 words.
  Verification: both PDFs exit 0, 0 overfull hboxes, 0 undefined refs, 13 figures each;
  vi/en anchor counts identical (20/36/33/26/29/17); backend 178/178.

## Credit note
Subagent fan-out hit "credit limit exceeded" (429) in loop1. Prefer direct main-context
work; spawn agents sparingly and with tight, findings-only prompts.

## Anti-loop reminder
Re-read THIS file after compaction. Check status. Resume. Don't re-derive from scratch.

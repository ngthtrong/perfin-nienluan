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

- loop9: DONE. Report at loop/loop9/report.md. Area newly checked: perceived performance
  (loading/skeleton) across all 12 screens. First loop to run the demo LIVE (PostgreSQL +
  backend :3000 + Expo web :8081) instead of only reading code.
  FIXED D-06: RecurringScreen was the only screen using a bare centered ActivityIndicator
  for full-screen load (8 others use content-shaped skeletons) — caused a layout jump and
  broke system-wide consistency. Replaced with a skeleton matching the real layout.
  FIXED D-07: ALL skeletons were invisible to screen readers — grep for
  accessibilityElementsHidden / importantForAccessibility / role=progressbar returned ZERO
  app-wide. Added those attrs to each Skeleton (decorative, hidden) plus a new
  <SkeletonGroup> wrapper announcing exactly one busy state with a Vietnamese label; wired
  into all 9 loading blocks. Verified attrs reach the DOM: bundle contains role="progressbar"
  and aria-busy (RN-web maps them). This completes loop7's a11y work (loop7 did icon-button
  labels + hit targets, not loading states) — NOT a reversal of loop7.
  Verified PASS (don't recheck): Skeleton.js is well-built (useNativeDriver, loop.stop on
  unmount, token color — no hardcoded hex). The 16 remaining ActivityIndicator uses are all
  small INLINE spinners (in-button/in-row/in-modal) — correct pattern, do NOT convert to
  skeletons. Chat/Settings/More correctly have no full-screen skeleton. Backend readiness
  live-verified: database ok, redis unavailable → in_memory_fallback, exactly as NFR-05 and
  ch4 limit #7 already state (report is honest here).
  No LaTeX sync needed: report makes no claim about loading states or a11y, and the NFR
  table deliberately has no UX entry (consistent with ch1 scope line 77).
  SMOKE TEST TRAP (cost 2 failed runs — remember): `npm run ui:smoke` needs backend + Expo
  running AND a pre-warmed Metro bundle. waitFor defaults to 20s
  (scripts/mobile-web-smoke.js:117) which a cold Metro compile exceeds → misleading
  "render timeout"/"page load timeout" that is NOT a code defect. Pre-warm with
  `curl 'localhost:8081/index.bundle?platform=web&dev=true&hot=false'` (~11s) first.
  Verification: ui:smoke 4/4 PASS exit 0; backend 178/178.

- loop10: DONE. Report at loop/loop10/report.md. Area newly checked: error handling, empty
  states, destructive-action confirmation, plus a sweep for hit targets loop7 missed.
  FIXED D-08: of 7 delete actions in the app, 6 confirm properly (transaction even offers
  30s undo, category reports how many rows get reassigned) but SettingsScreen:119 deleted a
  personalization trait immediately on tap — one-tap data loss on a 34pt button. Split into
  doRemoveTrait/removeTrait with a destructive-style confirm naming the trait.
  FIXED D-09: 8 real buttons at 34-40pt still lacked hitSlop after loop7 (BudgetScreen
  month nav x2, CashflowScreen x3, CategoryScreen x2, ChatScreen remove-attachment,
  SettingsScreen trait delete). Added HIT_SLOP + the missing imports in 4 files. IMPORTANT
  distinction: 7 similarly-sized elements (forecastIcon, catIcon, aiAvatar, filterIcon,
  infoIcon, headerIcon x2) are decorative <View>s — correctly have NO hitSlop, do not "fix".
  FIXED D-10: ErrorState/EmptyState had zero a11y attrs. Wrapped ErrorState title+message in
  accessibilityRole="alert" + accessibilityLiveRegion="polite"; hid the decorative warning
  icon and EmptyState emoji from the a11y tree (screen readers were reading emoji names
  before real content). DESIGN NOTE: the "Thử lại" button is deliberately OUTSIDE the
  accessible wrapper — wrapping it would collapse the group into one element on iOS and cost
  the button its own focus. Same root cause as D-07 but different components.
  Verified PASS (don't recheck): 9/12 screens have ErrorState+onRetry and EmptyState. The 3
  without (Chat/More/Settings) are CORRECT — Chat surfaces errors as system chat messages
  (right pattern for conversational UI, all 20 catch blocks do this), Settings uses per-block
  profileError, More is a static menu. api.service.js does not leak stack traces: network
  errors become Vietnamese sentences with hints (:157/:229/:375), API errors use backend's
  data.error (:140). The 6 other delete flows are high quality.
  No LaTeX sync needed (same reasoning as loop9).
  BUNDLE-GREP TRAP: grepping the Metro bundle for "SyntaxError|Failed to compile" matches
  Metro's own BABEL_TRANSFORM_ERROR_FORMAT regex — NOT a build error. Check context first.
  Verification: ui:smoke 4/4 PASS exit 0; backend 178/178; role="alert" confirmed in DOM.

- loop11: DONE. Report at loop/loop11/report.md. Area newly checked: per-user authorization
  (IDOR) — the other half of security that loop5 (SQL injection) did not touch. Trigger was
  ch4 limit #8's own admission; verified it instead of trusting it, and it was TRUE.
  FIXED D-11 (security): 11 endpoints let any caller read/modify/delete another user's rows
  by changing the id in the URL. 6 of 8 route files were already correct (transaction,
  category, account, cashflow, export, goal all pass userId everywhere); budget (3 endpoints)
  and recurring (8) did not, with no middleware compensating. Worst were 7 call sites in
  chat.routes.js where bill_id comes from LLM-parsed user text — exactly the boundary the
  report argues must hold. Scoped budget.model getById/update/delete and recurringBill's
  getJoined (one fix covered 6 callers) + update/delete/pause/resume/recordPayment/
  getPaymentHistory, including the FOR UPDATE lock in recordPayment.
  FIXED D-12: after scoping the model, GET /recurring/:id/payments returned 200 with an empty
  list instead of 404 — no data leak but it still revealed the id existed. Added an ownership
  check at the route.
  FIXED L-14: 5 places in the report became factually wrong after the fix (ch4 limit #8, ch3
  security prose, ch3 status-table Auth row, ch4 future-work item 1, test counts). Synced
  bilingually. Deliberately did NOT upgrade the claim to "has authorization" — a user_id
  predicate is a multi-user upgrade path, not authentication, and ch4 still admits no auth.
  Added table tab:idor-verification (both languages) because the new claim "cross-access was
  tested" needs evidence; tabular data, so a table not a diagram. 13 figures still enough.
  LIVE VERIFICATION (not inference): created a second user in the live PostgreSQL, inserted
  a budget (id=56) and bill (id=7) owned by it, called the API as default_user with those
  ids. 10/10 cross-access attempts → 404; 2/2 own-record controls → 200. Test rows deleted
  afterwards (remaining victim rows = 0). Artifact: log/idor-verification_2026-07-25.json.
  Added tests/user-idor-scope.test.js (4 cases). KEY DESIGN POINT: they assert on the EMITTED
  SQL, not the return value — with a single demo profile, a query missing user_id still
  returns the expected row, so a conventional test would pass falsely. Negative control run:
  manually removing the predicate made the test fail, then reverted.
  TWO PRE-EXISTING TESTS FAILED and were fixed correctly (not loosened): recurring-bill.test
  cases pinned the literal old SQL 'WHERE b.id = $1 FOR UPDATE OF b' — i.e. they were locking
  the vulnerability in. Updated the assertions to the scoped SQL.
  Suite grew 178 → 182 (38 files). Updated that count in ch3 vi+en, ch4, Report.md,
  latex/README.md, and both log artifacts.
  Verification: both PDFs exit 0, 0 overfull, 0 undefined refs, 13 figures, idor label
  resolved in both .aux; vi/en parity exact (20/36/33/28/31/17/23), 23 tables each;
  backend 182/182.

- loop12: DONE. Report at loop/loop12/report.md. Reviewed DIAGRAM QUALITY & NECESSITY
  (never checked directly before — loop2 only saw 08, loop6 skipped with a false reason).
  CONCLUSION: 13 diagrams are SUFFICIENT — all 13 have source+3 renders+bilingual labels,
  numbered 1..13 sequentially in both .lof, none unreferenced (no surplus), each has an
  explanatory paragraph (Guideline line 92). DO NOT propose new diagrams in later loops.
  FIXED L-16 (severe, Guideline line 130): partially REVERSES loop2's L-04 downgrade.
  loop2 checked only `curved=1` (0 hits) and concluded the straight-arrow rule was met.
  But `edgeStyle=orthogonalEdgeStyle;rounded=1` on an EDGE rounds the corners at bends —
  36 such edges across 01 (5), 02 (11), 10 (20). Set rounded=0 on those edges only
  (vertex rounded=1 = rounded boxes, left alone deliberately). All 13 files now
  edges_rounded=0, XML valid. Re-rendered 9 outputs, all images=0 (still true vector).
  MEASURED ~2.4s/format — loop6's ">120s/hình" claim is wrong, never reuse it.
  FIXED L-17 (self-inflicted in loop11): the new IDOR table overflowed 81pt (2.9cm)
  because \code{} uses \detokenize so /api/recurring/:id/pause|resume|pay had no break
  point. Split into several short \code{} spans + stated the base path. EN 2→0 overfull;
  VI 5→2 (the 2 remaining are the pre-existing 1.9pt ones).
  FIXED L-15 (cosmetic): figures 10 and 13 were the only 2 of 13 not named by number in
  their own explanatory paragraph (only \ref'd from the appendix index). ref 31→33.
  Verified: both PDFs exit 0, 13 distinct figures each, vi/en anchors identical
  (20/36/33/28/33/17/23), lot=23 lof=13 both. No doc sync needed (presentation-only).

## Credit note
Subagent fan-out hit "credit limit exceeded" (429) in loop1. Prefer direct main-context
work; spawn agents sparingly and with tight, findings-only prompts.

## Anti-loop reminder
Re-read THIS file after compaction. Check status. Resume. Don't re-derive from scratch.
- loop13: DONE. Report at loop/loop13/report.md. Reviewed ch2 against Guideline note #2
  (technology-choice justification) + verified every ch2 constant against real code.
  FIXED L-18 (IEEE compliance): 4/18 bibliography entries were NEVER cited anywhere
  (bullmq2026, geminifunctioncalling, postgresql2026, redisexpire). IEEE numbers refs by
  order of first in-text citation, so an uncited entry has no valid position. All 4 are
  the official docs of exactly the technologies tab:technology-rationale justifies —
  i.e. the rationale table asserted technical properties (TTL, retry+jobID, transactions,
  function calling) with no source. Added \cite at the point of assertion, bilingual.
  Now vi/en both defined=18 cited=18. resource/Report.md ALREADY had all 4 inline
  ([4],[7],[8],[9]) — LaTeX was the deficient copy, so this fix aligned LaTeX TO the
  Markdown; no reverse sync needed.
  VERIFIED PASS — ch2 formula fidelity, 27/27 constants match code exactly:
  z>=2.5, IQR k=1.5, n<4 -> [], sd==0 -> z=0, iqr>0 guard, method z/iqr/z+iqr,
  quantile 0.25/0.75, OLS slope/intercept/R2, ssTot==0 -> r2=0, forecast max(0,..),
  trend gate (>=3 months, avgPctChange>=10, r2>=0.5, slope>0), runway W=14,
  burn==0 -> null, similarity max(edit, 0.92*dice, contain), contain in [0.82,0.94],
  smaller.size>=2, tau 0.82/0.90, margin 0.08, recurring tol 0.15 / 20-40d / >=3 occ /
  <=500k / minOcc 2, pearson n<3 -> 0, den==0 -> 0, >=4 weeks, r>=0.6 max-r.
  This is a genuine strength for a data+algorithms niên luận: the report's formulas ARE
  the running code, including boundary guards.
  ALSO PASS: §2.6 rationale table gives reason + alternative for all 7 technologies
  (Guideline note #2 satisfied); 21 equations parallel vi/en; every equation has a
  corresponding code constant (no decorative math).
  NOTE: loop13 commit necessarily carries pre-existing uncommitted cover-border work
  (config/preamble.tex TikZ \coverborder + frontmatter/{vi,en}/cover.tex) because the
  rebuilt PDFs embed it. Not a loop13 change.

## loop14 — ch3 SRS/FR-NFR traceability (2026-07-25)
- L-19 FIXED: 15 hardcoded "mục 2.x.y"/"Section~2.x.y" cross-refs per language
  replaced with \label/\ref (28 labels added to ch2, 4 intra-chapter refs in ch3/ch4).
  All 15 resolved to exactly their former values -> numbers were correct but fragile.
- Parity gap FIXED: EN ch4 cited Section~\ref{subsec:results}, VI did not.
- PASS: 12 FRs, 10 NFRs, 48 TC ids identical vi/en, no numbering gaps.
- PASS: TC ids correctly framed as specification-level (not execution claims).
- Report.md hardcoded refs left as-is (Markdown has no \ref mechanism; all resolve).

## loop15 — frontmatter compliance (abbreviations/TOC/lists)
- L-20 FIXED: abbreviations list violated Guideline §2.5 both ways — 9 used-but-unlisted
  acronyms added (FR 43x, PERFIN 18x, CER/WER 10x, PDF, SQL, IEEE, HTML, HTTP) + TC (49x);
  4 listed-but-never-used removed (ASR, NLP, PII, SRS). 23 -> 29 entries per language.
- Self-inflicted regression caught: sed spliced 3 status-convention rows (3-col) into the
  2-col abbreviations table in en/abbreviations.tex. Repaired. LaTeX would NOT have errored.
- PASS: tocdepth=3 -> 4 displayed levels (§2.3); tables 1-23 + figures 1-13 sequential (§2.4);
  alphabetical order; vi/en parity 57 labels / 50 refs / 23 captions.
- Tooling note: no latexmk, no pdftotext, and no main-vi.tex — build via `make vi en` (single
  main.tex + -jobname). Page counts / .aux / .toc are the reliable evidence.
- SECURITY (automated commit review): .claude/settings.json untracked in b09c2b6 (.gitignore:42
  already listed .claude/). Current token in unpushed bfe863c only; 4 older tokens already in
  PUSHED public history. User chose rotate-only, no history rewrite. All 5 tokens need rotation.

## loop16 — UI/UX design-token consistency (25/07/2026)

- D-13 (đã sửa): 12 vị trí `'#fff'` → token `onBrand` trên nền họ brand; 7 vị trí
  còn lại giữ nguyên vì nền không thuộc họ brand (income/chatUserBubble/scrim/Switch).
  Không đổi pixel hôm nay (`onBrand` = `#FFFFFF` ở cả hai palette); giá trị là bảo trì.
- L-21 (ghi nhận, không sửa): token `spacing` chết — dùng 0 lần so với radius 147 /
  typo 49 / shadows 49; 464/777 giá trị spacing hard-code nằm ngoài thang. Cần một
  vòng riêng có ảnh before/after vì sửa sẽ dịch bố cục thật.
- Kiểm chứng: bundle 200 (0 transform error), UI smoke 4/4, backend 182/182,
  ảnh chụp Dashboard xác nhận thẻ brand đúng.
- Phương pháp: `node --check` cho dương tính giả trên JSX — không dùng lại.

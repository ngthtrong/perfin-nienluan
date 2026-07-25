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
- loop4-6: pending. Candidates: L-02 (abstract density — but adding L-01 clause grew it,
  reassess), ch1/ch2 prose critique, demo runtime bug hunt (needs care re credit),
  cosmetic diagram palette (low priority per loop2 finding), appendices/references check.

## Credit note
Subagent fan-out hit "credit limit exceeded" (429) in loop1. Prefer direct main-context
work; spawn agents sparingly and with tight, findings-only prompts.

## Anti-loop reminder
Re-read THIS file after compaction. Check status. Resume. Don't re-derive from scratch.

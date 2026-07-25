# loop15 — frontmatter compliance (abbreviations, TOC, lists)

Focus: Guideline §2.3 (TOC to four levels), §2.4 (List of Tables/Figures, sequential
numbering), §2.5 (a list of **all** abbreviations used in the report).

## Defect found and fixed

**L-20 — abbreviations list violated §2.5 in both directions.**
The list had 23 entries. Checked both directions mechanically against chapter bodies:

*Used in the report but missing from the list* (9): `FR` (43×), `PERFIN` (18×),
`CER`/`WER` (10× each), `PDF` (10×), `SQL` (7×), `IEEE` (4×), `HTML` (4×),
`HTTP` (3×). `FR` was the clearest miss — `NFR` was listed while `FR`, used 43 times
and forming the spine of the SRS, was not.

*Listed but never used anywhere in the body* (4): `ASR`, `NLP`, `PII`, `SRS`. Each
appeared exactly once in the whole project — inside the abbreviations table itself.

Also added `TC` (49×). It is explained inline at first use
(`chapter3.tex:30`), but §2.5 asks for all abbreviations, so it belongs in the list.

Result: 23 → 29 entries per language, alphabetically sorted, identical across vi/en.

## Self-inflicted regression, caught and repaired

The `sed` I used to insert rows was anchored on `\\` and matched the *second*
longtable in the same file (the status-conventions table). Three of its 3-column rows
(`Implemented`, `Measured`, `Target`) were spliced into the 2-column abbreviations
table in `frontmatter/en/abbreviations.tex`. Detected by comparing per-language row
counts (vi=28 vs en=31), then confirmed by reading the line range. Removed the three
rows and verified 0 three-column rows remain in either abbreviations table.

Worth recording because the build would **not** have caught this: LaTeX tolerates an
extra `&` in a longtable row, so it renders as visible garbage rather than an error.
Structural parity checks are what caught it.

## Verified PASS (no change needed)

- **§2.3 TOC depth** — `tocdepth=3` produces exactly the four displayed levels
  (chapter/section/subsection/subsubsection). The 4 `paragraph` entries written to
  `.toc` are suppressed at typeset time, so they are not a fifth level.
- **§2.4 sequential numbering** — tables 1–23 and figures 1–13 with no gaps, in both
  languages; LoF/LoT both present and complete.
- **Alphabetical order** — verified programmatically after the edit, both languages.
- **Structural parity** — 20/36/33 headings, 57 labels, 50 refs, 21 cites, 23 captions:
  identical vi/en.
- Backend 182/182; build exit 0; 0 undefined refs; 0 `??` markers.

## Tooling correction

Three build attempts failed on `latexmk` (not installed) and on a guessed
`main-vi.tex` (does not exist). The project builds from a single `main.tex` via
`make vi en`, which passes `-jobname` per language. Likewise `pdftotext` is absent, so
"rendered text" greps return 0 for lack of a tool rather than lack of content —
page counts and `.aux`/`.toc`/`.lot`/`.lof` are the reliable evidence here.

## Residual (unchanged, pre-existing)

VI keeps 2 overfull hboxes at 1.90pt and 1.88pt (~0.07 mm). Below visual threshold;
documented since loop7.

## Security findings from automated commit review (addressed this loop)

Two real findings against `.claude/settings.json`, both predating this session:

1. `ANTHROPIC_AUTH_TOKEN` in a tracked file. The current token appears only in the
   unpushed commit `bfe863c`; **four older tokens are already in pushed public
   history**. Untracked the file in `b09c2b6` — `.gitignore:42` already listed
   `.claude/`, so it should never have been tracked, and that is exactly how loop14's
   commit picked it up.
2. `ANTHROPIC_BASE_URL` points at a `trycloudflare.com` host. This is the running
   session's own gateway config, so it was surfaced rather than silently repointed.

User decision: leave git history as-is, rotate tokens at the provider. All five tokens
need rotation; the four in pushed history are the urgent ones. History rewrite was
offered and declined.

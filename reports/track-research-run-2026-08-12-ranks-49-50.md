# Track research run — 2026-08-12 (ranks 49–50)

- Recomputed substantive-guide coverage from the live catalog and encyclopedia. The lowest gaps are rank 46 (*Ramones*), rank 48 (*Aquemini*), rank 49 (*The Great Twenty-Eight*), and rank 50 (*Station to Station*).
- Rank 46 and rank 48 remain unmodified. The inspected candidate direct sources did not provide three adequate, track-specific guides for either album, so they were not padded.
- Added six substantive, track-specific guides: “Maybellene,” “Roll Over Beethoven,” and “Johnny B. Goode” for rank 49; “Station to Station,” “Golden Years,” and “TVC15” for rank 50. All six direct Songfacts URLs resolved HTTP 200 during research. Claims are limited to the facts those pages state.
- TDD: `scripts/test-ranks-49-50-track-research.mjs` was written first and failed as expected at `0` qualifying guides. `scripts/enrich-ranks-49-50-track-research.mjs` then applied the minimal six-note update; the regression passed at `6` guides across two albums. The regression was added to `npm run test:all`.
- Verification: `npm run test:all` passed, including all existing research regressions; `npm run build` passed. Vite emitted its pre-existing large-chunk advisory only. `dist/gym` was restored from `HEAD` immediately after the build.
- Catalog coverage after this batch: 134/243 albums meet the substantive three-guide gate used by the regression tests. Next eligible coverage gap after deferred ranks 46 and 48 is rank 85 (*Bitches Brew*).
- Work remains local: no commit, push, deployment, Netlify change, or cron pause.

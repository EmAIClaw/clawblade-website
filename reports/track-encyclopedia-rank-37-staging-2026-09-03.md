# Track Encyclopedia rank 37 staging — Dr. Dre, The Chronic

Date: 2026-09-03
Album ID: `037-dr-dre-the-chronic-08e42779`
Branch: `accel/rank-037`
Edition: 1
Published: false
Content hash: `403cd09823975de0`

## Outcome

Rank 37 is staged as an immutable unpublished Track Encyclopedia edition.

- Exact committed catalog tracks: 16
- Documented tracks: 16
- Insufficient-evidence tracks: 0
- Unresearched tracks: 0
- Verified claims retained: 16
- Independent review decisions: 16 supported, 0 unsupported, 0 uncertain
- Apple collection, artwork, and preview values: unchanged; all existing null values were preserved

Every track retains one narrow sample, source-audio, or performer-credit claim. Titles, durations, sequence descriptions, generic album prose, lyric interpretation, and inferred musical analysis were not used as evidence.

## Research coverage and source provenance

Queries covered track-by-track samples, performers, credits, and liner-note-style attribution for all 16 catalog tracks. The fetched source body was the Wikipedia article and its cited track-credit table; only distinct track-specific credit facts were retained.

- Source artifact: `f7c4a6352d5d1450c4bd0f75499633fe7086d2942ce391e08038cd371f53f153`
- Canonical URL: `https://en.wikipedia.org/wiki/The_Chronic`
- Fetch status: HTTP 200
- Checked date: 2026-09-03
- Fetched-response SHA-256: `821d0abb44cf316d832b019d8de1c0ef42c5101799dcc1707c10088163807f57`
- Collection method: `http-fetch` with `albumvault-http-collector` version `1.0.0`
- Collector run: `rank37-the-chronic-http-collector-20260903`

Each claim stores an exact verbatim extract and mechanically verified character offsets inside the content-addressed retained source artifact.

## Independent semantic review

- Review artifact: `71ae08c5fc9a9e24e00950b20cb3ff7563a15d77fa0af45f08f4b2aafd11e546`
- Reviewer: `codex-independent-evidence-reviewer`
- Process: `codex exec --sandbox read-only`
- Run ID: `rank37-final-readonly-review-20260903`
- Candidate content hash: `6e15ac52ea0170b406dee9430fd0d9c124e1c5d9d6ec84c5e98de39dee680554`

The separate read-only reviewer checked artifact existence, canonical URL binding, exact offset containment, and direct entailment for every candidate. All 16 decisions were supported and imported through `import-track-encyclopedia-review.mjs`; no claim was self-approved.

## Track dispositions

1. The Chronic (intro) — documented
2. Fuck Wit Dre Day (And Everybody’s Celebratin’) — documented
3. Let Me Ride — documented
4. The Day the Niggaz Took Over — documented
5. Nuthin’ but a “G” Thang — documented
6. Deeez Nuuuts — documented
7. Lil’ Ghetto Boy — documented
8. A Nigga Witta Gun — documented
9. Rat-Tat-Tat-Tat — documented
10. The $20 Sack Pyramid — documented
11. Lyrical Gangbang — documented
12. High Powered — documented
13. The Doctor’s Office — documented
14. Stranded on Death Row — documented
15. The Roach (The Chronic Outro) — documented
16. Bitches Ain’t Shit — documented

## Focused verification

- RED: `node scripts/test-rank-37-chronic-acceptance.mjs` failed with `ENOENT` before rank-37 authoring existed.
- GREEN: the focused acceptance passed with 16 documented tracks, exact catalog identity, supported independent review bindings, and unpublished edition 1.
- Edition persistence created immutable edition 1 with `published=false` and content hash `403cd09823975de0`.
- A second persistence run returned `alreadyPresent=true`, verifying byte-identical immutable-edition idempotency.

## Scope

This staging branch contains only additive per-album evidence, authoring, independent review, immutable edition, focused test, narrowly scoped collection/generation scripts, and this report. Aggregate runtime outputs are intentionally deferred to the downstream integration task. No push, deployment, publication, catalog mutation, Gym change, provider change, or external messaging was performed.

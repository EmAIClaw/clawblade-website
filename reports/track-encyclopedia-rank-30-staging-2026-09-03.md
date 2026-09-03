# Track Encyclopedia rank 30 staging — The Jimi Hendrix Experience, Are You Experienced

Date: 2026-09-03
Album ID: `030-the-jimi-hendrix-experience-are-you-experienced-f4ea672f`
Branch: `accel/rank-030`
Edition: 1
Published: false
Content hash: `3c37e6fdea505510`

## Outcome

Rank 30 is staged as an immutable unpublished Track Encyclopedia edition.

- Catalog tracks: 17
- Documented tracks: 17
- Insufficient-evidence tracks: 0
- Unresearched tracks: 0
- Verified claims retained: 17
- Final independent review decisions: 17 supported, 0 unsupported, 0 uncertain

Track dispositions:

1. Purple Haze — documented
2. Manic Depression — documented
3. Hey Joe — documented
4. Love or Confusion — documented
5. May This Be Love — documented
6. I Don't Live Today — documented
7. The Wind Cries Mary — documented
8. Fire — documented
9. Third Stone from the Sun — documented
10. Foxey Lady — documented
11. Are You Experienced? — documented
12. Stone Free — documented
13. 51st Anniversary — documented
14. Highway Chile — documented
15. Can You See Me — documented
16. Remember — documented
17. Red House — documented

All 17 catalog tracks retain one narrow, track-specific production, songwriting, personnel, or release-history claim. Musical-character and listening-analysis fields remain empty.

## Source provenance

One official primary editorial source supports the 17 retained claims:

- Source artifact: `ec300d8491b7234b8cbe0f01763320559548eff4679df06bd780c4038b53a9a9`
- Canonical/final URL: `https://www.jimihendrix.com/editorial/have-you-ever-been-experienced-celebrating-55-years-the-making-of-are-you-experienced`
- Publisher: Experience Hendrix / official Jimi Hendrix site
- Retrieval: `2026-09-03T17:59:07.563Z`, HTTP 200, `text/html; charset=UTF-8`, Brotli response
- Collection method: `http-fetch` with `albumvault-http-collector` 1.0.0
- Collector run: `item1-9e659dcc-7265-4ce3-870c-0f84bd13c049`
- Fetched-response SHA-256: `a3dc2a8b8df9d5a7d9e82dffe99d16bcbae0949831e121d924a90aec36976ca5`
- Retained normalized window: source characters 3502–28384 of 28672

Each source reference stores an exact verbatim extract with mechanically derived character offsets inside the content-addressed retained source window.

## Independent semantic review

- Final review artifact: `b6d6d35a6526b6ae401e34e6f25b52c9549b2f16141f5a4e25c7b1d5a3a14dd0`
- Reviewer identity: `codex-independent-evidence-reviewer`
- Process: `codex exec --sandbox read-only`
- Run ID: `rank30-final-readonly-review-v3-20260903`
- Candidate content hash: `2558f78fb3b7f11c35644d22c25c26567093b61d46661b4a54b52b0741c803e2`
- Decisions: 17 supported, 0 unsupported, 0 uncertain

Two preliminary read-only review passes identified over-broad wording or insufficient local excerpt context. Those candidates were not imported. The authoring was narrowed or its exact fetched context expanded, and the final candidate was reviewed in full as a new immutable subject.

## Immutable file hashes

- Authoring SHA-256: `a7a8eac6c1e7729d5fe3cb107c24cf400735a026d63af130eb40667a7f5d4f08`
- Edition SHA-256: `4875669a765ce30896978e4907402547c79ef7cec8a72c10cea32b04e425e307`
- Source-artifact file SHA-256: `69fc1b40eea841336c612ab5b208572b1ff0ad653db2a2e36869bad1a8be1a90`
- Review-artifact file SHA-256: `109d225cb2d4d219195c8814aeb8440299b2c6aef236552a007ad68cc9213802`

## Verification

Passed focused staging gates:

- Strict RED observed before authoring: focused rank-30 acceptance failed with `ENOENT` for the absent authoring file.
- GREEN: `node scripts/test-rank30-are-you-experienced-acceptance.mjs` passed with 17 documented tracks, exact catalog identity, supported immutable review bindings, and unpublished edition 1.
- Provenance lifecycle: `node scripts/test-track-encyclopedia-provenance.mjs` passed 35/35.
- `git diff --check` passed.

This parallel research branch intentionally does not build or commit aggregate runtime outputs. Batch integration owns generated objects, releases, manifests, progress, full suites, production build, and browser smoke.

## Scope and safety

No push, deployment, publication, external messaging, catalog mutation, Apple/iTunes preview mutation, Gym change, provider/hosting change, or aggregate runtime generation was performed. The commit is restricted to the per-album authoring and edition, one referenced source artifact, one final review artifact, the focused acceptance test, and this report.

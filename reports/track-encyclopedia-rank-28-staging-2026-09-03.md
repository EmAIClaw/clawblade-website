# Track Encyclopedia rank 28 staging — D'Angelo, Voodoo

Date: 2026-09-03
Album ID: `028-d-angelo-voodoo-b6406009`
Branch: `accel/rank-028`
Edition: 1
Published: false
Content hash: `8fea22b5d1aab2a4`

## Outcome

Rank 28 is prepared as a conflict-safe, immutable unpublished Track Encyclopedia staging edition.

- Catalog tracks: 13
- Documented tracks: 13
- Insufficient-evidence tracks: 0
- Unresearched tracks: 0
- Verified claims retained: 13
- Independent review decisions: 13 supported, 0 unsupported, 0 uncertain

Every catalog track retains one narrow, track-specific claim. Unsupported musical analysis, listening prose, generic album description, sequence facts, durations, and repeated templates were not imported.

## Catalog identity

The edition preserves the exact committed catalog identity for all 13 tracks: album ID, disc number, track number, and title. The task does not modify `src/data/catalog.generated.json`, so its Apple collection identity, Apple artwork data, durations, and iTunes preview URLs remain byte-for-byte unchanged.

## Source provenance

Five live HTTPS source bodies were fetched and retained as content-addressed artifacts.

The Voodoo album page supports nine tracks.[5]

The dedicated Devil's Pie page supports that track's claim.[6]

The dedicated The Root page supports that track's claim.[7]

The Untitled page supports its reviewed claim.[8]

The Feel Like Makin' Love page supports its reviewed claim.[9]

- `5de829d2d864e1bdc86c59ec147ad45ed584ffa5c3c1323204d43a965e012a1f`
  - Canonical URL: `https://en.wikipedia.org/wiki/Voodoo_(D%27Angelo_album)`
  - Fetched-response SHA-256: `dc89bc2536ac577a2839b077e311d0623f5217c39deb5aff30851454556aa9c8`
  - Claims: Playa Playa; Left and Right; The Line; Send It On; Chicken Grease; One Mo'Gin; Spanish Joint; Greatdayndamornin' / Booty; Africa
- `374b72ae5a546488b250e817d56cc6a0a93600825ae9e41fd440de56e0907624`
  - Canonical URL: `https://en.wikipedia.org/wiki/Devil%27s_Pie`
  - Fetched-response SHA-256: `1ecdda497ca042e3c2248ab6029a6fd3b63e6995d38cd8bf74b8c6c616bce837`
  - Claim: Devil's Pie
- `b0adee0e9063ed97e473993d9094a38ed25147857c555aacf95fd89cfa4ea999`
  - Canonical URL: `https://en.wikipedia.org/wiki/The_Root`
  - Fetched-response SHA-256: `bb9e7919a12b2906d5308d1f3f5109e66a4684226113ccd913b79ea5a8e44cb9`
  - Claim: The Root
- `8f2ef3568ec8b53007ecbadf2b9c5cab4eb058c463f30adf165cbefeb7ad4699`
  - Canonical URL: `https://en.wikipedia.org/wiki/Untitled_(How_Does_It_Feel)`
  - Fetched-response SHA-256: `665be39ad94581dc046097c90ef59103afa492dd1fff1248ed84d6858496f6bd`
  - Claim: Untitled (How Does It Feel)
- `e8b929d5e66906c8cf441eb6355ccee3c8c91519b06ce12ba7bce0b0ab19535f`
  - Canonical URL: `https://en.wikipedia.org/wiki/Feel_Like_Makin'_Love_(Roberta_Flack_song)`
  - Fetched-response SHA-256: `9e0735aeb511a152a047c11fc2f0568aa2973b9e6b04569b3e8fe29a7ed46d46`
  - Claim: Feel Like Makin' Love

Collection method: `http-fetch` with pandoc HTML extraction. Each verbatim extract was mechanically located in normalized fetched text and stored with exact character offsets, canonical/final URL, retrieval timestamp, HTTP status, content type, response SHA-256, and collector identity.

## Independent semantic review

- Review artifact: `859a238de010f8b0c411f17c27185e70d1ff7802ab8642714ad13be610759fcd`
- Reviewer identity: `codex-independent-evidence-reviewer`
- Process: `codex exec --sandbox read-only`
- Run ID: `rank28-final-readonly-review-20260903`
- Candidate content hash: `67fdcb45c97bdefbb6a68e631e41a769384eba499be8c9cf6d38a6089e66427b`

The separate read-only review decided every candidate exactly once: 13 supported, 0 unsupported, 0 uncertain. The importer validated candidate identity/hash, reviewer separation, decision coverage, artifact IDs, canonical URLs, and immutable claim bindings before attaching the review record.

## TDD and verification

- RED observed: `node scripts/test-ranks-28-voodoo-acceptance.mjs` failed with `ENOENT` because rank-28 authoring did not exist.
- GREEN observed after reviewed import: the focused acceptance test passed with 13 documented tracks, 0 insufficient-evidence tracks, exact catalog identity, supported review bindings, and unpublished edition 1.
- `prepare-track-encyclopedia-review.mjs` validated all source artifacts and exact reference offsets while producing the immutable review input.
- `import-track-encyclopedia-review.mjs` validated all 13 independent decisions and produced content hash `8fea22b5d1aab2a4`.
- `persist-track-encyclopedia-edition.mjs` validated and persisted immutable unpublished edition 1.

## Scope and safety

This staging commit contains only rank-28 additive source, review, authoring, edition, focused test, collection/generation script, and report files. It intentionally excludes aggregate runtime outputs, object/release trees, progress files, generated manifests, generated encyclopedia data, legacy catalog data, `dist/`, Gym, and hosting/provider files. No push, deployment, publication, or external message was performed.

## Sources

[5] https://en.wikipedia.org/wiki/Voodoo_(D%27Angelo_album)
[6] https://en.wikipedia.org/wiki/Devil%27s_Pie
[7] https://en.wikipedia.org/wiki/The_Root
[8] https://en.wikipedia.org/wiki/Untitled_(How_Does_It_Feel)
[9] https://en.wikipedia.org/wiki/Feel_Like_Makin'_Love_(Roberta_Flack_song)

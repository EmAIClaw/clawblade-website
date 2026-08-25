# Track Encyclopedia Item 1 provenance migration — 2026-08-25

Status: **complete locally; all gates passed; all nine editions remain unpublished**

## Scope completed

Migrated ranks **1, 2, 3, 4, 5, 6, 7, 54, and 92** from self-attested authoring evidence to the fail-closed provenance lifecycle:

- actual HTTP/PDF/archive fetch artifacts retained in the content-addressed source store;
- canonical HTTPS source identities;
- exact retained-text offsets and surrounding context for each claim;
- stable claim IDs bound to album, disc, track, and fact ordinal;
- separate read-only Codex evidence decisions imported into immutable review records;
- new immutable unpublished editions;
- deterministic content-addressed album objects and manifest output.

No legacy Track Guide content, rank-8 research, catalog data, Gym data, publication state, remote branch, deployment, or messaging was changed.

## Active unpublished editions

| Rank | Album | Edition | Tracks | Claims | Content hash | Review record |
|---:|---|---:|---:|---:|---|---|
| 1 | Marvin Gaye — What's Going On | 5 | 9 | 9 | `b35fcb8c1fb0a2a1` | `291b50dea9568e9ca400e4935ee1137c8e62c43c36e9c93f7aa95e707c05def1` |
| 2 | The Beach Boys — Pet Sounds | 2 | 13 | 13 | `087bfa79d706c8ae` | `80ccb9f4fa2556b6b791c896c0f723f99766e91acde7fe4424e21772be6679e5` |
| 3 | Joni Mitchell — Blue | 2 | 10 | 10 | `26b222e5aef9db55` | `bbebf41c0ccf36a149da5198f84582881a93492fae619301753dfa32d23dbca2` |
| 4 | Stevie Wonder — Songs in the Key of Life | 3 | 21 | 21 | `bc1413dab6a4d0ab` | `bc827de5afe0730fc5651452997ece8c61d4dda3ad3dc09e19585c0dafa1d4b0` |
| 5 | The Beatles — Abbey Road | 3 | 17 | 17 | `772df43eaad90b18` | `17c5c195592ad38d9ca4aca86fbf556515ca4d95618ddf14dbb3f1c49a6a9d49` |
| 6 | Nirvana — Nevermind | 2 | 13 | 13 | `2a86565a358580f0` | `aae31a4ae2e4a11febece052d312c8d6f97889059698ac7f0074055ff772ba45` |
| 7 | Fleetwood Mac — Rumours | 3 | 11 | 12 | `414abb016229da97` | `253b2a3bd110bb5be220f91513fac363089b419b8cd38af35273003481e495b2` |
| 54 | Liz Phair — Exile in Guyville | 5 | 18 | 18 | `c8496228067c3426` | `dcb8f331d5a1114608b005beca04d97906103514e21158a40a6127e9f2fa9d1a` |
| 92 | The Stooges — Fun House | 4 | 7 | 7 | `ffd3fa7023be2acf` | `ca14fd3aae123a8e43f22df0cc4c590923d91f94717bb5d4a899afacdb9ad99d` |

Totals: **9 albums, 119 tracks, 120 claims, 42 source artifacts, 11 review artifacts, and 23 immutable album objects**.

## Rank 7 correction

The first migrated Rumours edition exposed a Wayback final-URL normalization defect: generic path normalization collapsed the embedded original `https://` to `https:/`. The correction:

- preserves opaque embedded schemes in Wayback replay paths;
- rejects noncanonical authored source URLs;
- performed a fresh actual archive fetch;
- stored source artifact `5ab387b4c2a02b66b4f047184be68ce06efdd1b889a2508285a560460329515d` with the exact replay URL;
- obtained a fresh read-only Codex review, record `253b2a3bd110bb5be220f91513fac363089b419b8cd38af35273003481e495b2`;
- bound candidate1/candidate2 claims to distinct exact offsets in new unpublished edition 3.

Rumours editions 1 and 2, their source artifacts, and their review history remain unchanged and referenced.

## Integrity hardening

Item 1 also closed lifecycle gaps found by independent reviews:

- source/review artifacts reject unknown unhashed fields and noncanonical serialized bytes;
- canonical and final source URLs require HTTPS;
- canonical authored and review URLs are enforced, with narrow immutable-history exceptions only where needed to read preserved rank-4 editions 1–2 and one superseded review record;
- context is checked at the declared occurrence rather than the first duplicate excerpt;
- review claim sets and entry review metadata must exactly match the immutable review record;
- collector, author, and reviewer identities cannot collapse into one role;
- edition writes use hard-link new-only semantics, eliminating check-then-rename overwrite races;
- normal build and standalone persistence compare full canonical edition bytes, including metadata;
- persisted unpublished editions cannot be rewritten into published editions in place.

Only source artifacts created by failed/retry migration collection and proven unreferenced were removed. Referenced artifacts, prior editions/releases, and unrelated historical reports were retained.

## Final verification

All commands completed successfully on the final tree:

- provenance: **35/35**;
- backend: **51/51**;
- core Track Encyclopedia: **72/72**;
- object store: **13/13**;
- UI state/evidence labels: **5/5**;
- migration acceptance: all nine authoring files;
- lifecycle validation: all nine active editions valid and unpublished;
- data integrity: **243 albums**;
- full `npm run test:all`;
- `npx tsc --noEmit`;
- two consecutive zero-growth builds: no source, review, or album-object additions/removals/byte changes;
- production Vite build: **1574 modules transformed**, nine immutable Track Encyclopedia JSON assets;
- Google Chrome production-preview smoke: all nine ranks loaded, correct track counts, zero integrity/browser errors;
- `git diff --check`.

Fresh separate read-only Codex reviews after all fixes:

- specification review: **PASS — no critical or important findings**;
- adversarial review: **PASS — no critical or important findings**.

## Publication boundary

This report records local research/lifecycle completion only. It does not authorize publication, push, deployment, or catalog expansion.

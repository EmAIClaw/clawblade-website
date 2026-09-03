# Track Encyclopedia rank 16 completion — The Clash, London Calling

Date: 2026-09-03
Album ID: `016-the-clash-london-calling-7d75cf05`
Edition: 1
Published: false
Content hash: `580f5f2a45b44176`

## Outcome

Rank 16 is complete in an immutable unpublished Track Encyclopedia edition.

- Catalog tracks (committed baseline): 40
- Documented tracks: 32
- Contextual tracks: 0
- Limited tracks: 0
- Insufficient-evidence tracks: 8
- Unresearched tracks: 0
- Verified claims retained: 32
- Independent review decisions: 32 supported, 0 unsupported, 0 uncertain

The 19 core album tracks and 13 Vanilla Tapes tracks retain one narrow, source-bound claim each. The remaining 8 Vanilla Tapes demo tracks carry completion-eligible insufficient-evidence dispositions with explicit search coverage and limitations.

## Source provenance

Source artifact count for this album: 3

- Source artifact (Wikipedia): `0b8906b6e8907945af442dd035396ee7808049eeee1ee99f8afa637ae659af8c`
  - Canonical URL: `https://en.wikipedia.org/wiki/London_Calling`
  - Source identity: `en.wikipedia.org|London Calling album article`
- Source artifact (Rolling Stone): `3b930611ed995cd6da381149b585c83d99cbef407e657915d21ba237c988e1ce`
  - Canonical URL: `https://www.rollingstone.com/music/music-news/the-clash-serve-vanilla-248698`
  - Source identity: `rollingstone.com|The Clash Serve Vanilla 2004`
- Source artifact (The Ringer): `f2d9afc0a2c6fb5821fb79b54be3471477fd4eb589e39f55e1fb9571093223b4`
  - Canonical URL: `https://www.theringer.com/2019/12/17/music/the-clash-london-calling-40th-anniversary`
  - Source identity: `theringer.com|Elizabeth Nelson London Calling 40th anniversary`

Collection method: http-fetch + pandoc HTML extraction (albumvault-http-collector), all HTTP 200. Every retained claim extract was located mechanically inside the fetched source artifact and stored with exact character offsets.

## Independent semantic review

Review artifact count for this album: 1

- Review artifact: `2ec3e6acd719848b60ce2088b61d39df224893065974015d9c799862f7257e56`
- Review artifact SHA-256: `64f6d5a1657117dcc5b784f206bcaab9458d10f86051a564aa0f590a3693ca50`
- Reviewer identity: `codex-independent-evidence-reviewer`
- Process: `codex exec --sandbox read-only`
- Run ID: `rank16-final-readonly-review-20260903`
- Candidate content hash: `7a1143fde323507596b97294b185abf8f1b008b2f0ccc48b4800a2f317976537`

The read-only review returned all 32 candidate claims supported with evidence-specific rationales.

## Immutable edition and object-store identity

- Authoring SHA-256: `779fe360c0615d193a8384c1cefc324786157450904c157e76d3ce7fc0194a0c`
- Edition SHA-256: `794d596bf97f0c3686e7a1d78404b66205558b680a83a4422a1171b5eaac71a7`
- Album object: `f82ff368c3d69342d6db0c0d81e05fe0c20064c766c4c65979f862736f4b0662`
- Release hash: `6394192a43c8c67f`
- Build report totals: 18 entries, 262 completed tracks
- Committed baseline remains explicit: 3,366 catalog tracks; this milestone adds 40 completed baseline tracks, moving progress from 222 to 262 completed tracks.

## Verification

Passed gates:

- RED observed: `node scripts/test-ranks-16-london-calling-acceptance.mjs` failed before review/import on missing semantic content hash.
- Focused rank-16 acceptance: `node scripts/test-ranks-16-london-calling-acceptance.mjs`
- Lifecycle validation: rank-16 edition 1 valid=true, published=false
- Full regression: `npm run test:all` passed (provenance, object-store, core, backend, UI, data-integrity 243 albums, and all research suites)
- TypeScript: `npx tsc --noEmit` passed
- Production build: `npm run build` passed; 32 immutable album objects emitted
- Zero-growth/byte-identity: two consecutive `scripts/build-track-encyclopedia.mjs` runs produced byte-identical rank-16 stats and object identity
- GC dry-run: `deleted=false`, releases=26, current release `6394192a43c8c67f` referenced=true
- Git diff check: passed
- Real Chrome production-preview smoke: rank-16 London Calling rendered in headless Chrome with track evidence visible and zero captured runtime exceptions

## Scope and safety

No push, deployment, publication, provider edit, Gym edit, external messaging, or live-data mutation was performed. The edition remains local and unpublished.

Pre-existing unrelated working-tree changes were preserved and not staged as part of this milestone: `scripts/test-data-integrity.mjs`, `src/data/catalog.generated.json`, `src/data/encyclopedia.generated.json`, prior untracked research reports, and pre-existing untracked source artifacts. The 10 pre-existing uncommitted bonus-disc tracks remain isolated and were not silently rewritten into the committed baseline.

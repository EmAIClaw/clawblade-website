# Track Encyclopedia rank 20 completion — Radiohead, Kid A

Date: 2026-09-03
Album ID: `020-radiohead-kid-a-ce842ff2`
Edition: 1
Published: false
Content hash: `7b4ca61faf5f76ba`

## Outcome

Rank 20 is complete in an immutable unpublished Track Encyclopedia edition.

- Catalog tracks (committed baseline): 11
- Documented tracks: 11
- Contextual tracks: 0
- Limited tracks: 0
- Insufficient-evidence tracks: 0
- Unresearched tracks: 0
- Verified claims retained: 11
- Independent review decisions: 11 supported, 0 unsupported, 0 uncertain

All 11 catalog tracks retain one narrow, source-bound claim each.

## Source provenance

Source artifact count for this album: 3

- Source artifact (Wikipedia album article): `716563c68aa1c0c46fd01ea40a949a93500a4b6d2b0ed26c3f558b79c7675807`
  - Canonical URL: `https://en.wikipedia.org/wiki/Kid_A`
  - Source identity: `en.wikipedia.org|Kid A album article`
- Source artifact (Songfacts In Limbo): `c67136984ae5de6da9fd2b976b9beea4f2ca892edca5c13d7d521a8b21af08b1`
  - Canonical URL: `https://www.songfacts.com/facts/radiohead/in-limbo`
  - Source identity: `songfacts.com|In Limbo by Radiohead`
- Source artifact (Citizen Insane Untitled): `ed7e5bed3af1b3c9e32132994eeb7e86a6ba0ae4bd80bbef969d3399eabe91c1`
  - Canonical URL: `https://citizeninsane.eu/music/kam/untitled.html`
  - Source identity: `citizeninsane.eu|Untitled`

Collection method: http-fetch + pandoc HTML extraction (albumvault-http-collector), all HTTP 200. Every retained claim extract was located mechanically inside the fetched source artifact and stored with exact character offsets. 9 tracks are sourced from the Wikipedia album article; track 7 ("In Limbo") is sourced from Songfacts, which states its original title was "Lost At Sea"; track 11 ("Untitled") is sourced from Citizen Insane, which states it is the official name for the instrumental hidden track after "Motion Picture Soundtrack".

## Independent semantic review

Review artifact count for this album: 1

- Review artifact: `26675231edb379789d345bd359c9fb1fc66898efbf87b40d10a4645c597a84d7`
- Reviewer identity: `codex-independent-evidence-reviewer`
- Process: `codex exec --sandbox read-only`
- Run ID: `rank20-final-readonly-review-20260903`
- Candidate content hash: `490aaf73a1374ce684d894165dc738f7d87dce6109ef08e26d23380505d20f07`

The read-only review returned all 11 candidate claims supported with evidence-specific rationales.

## Immutable edition and object-store identity

- Content hash: `7b4ca61faf5f76ba`
- Album object: `f54beefad08d7932d7557958986787320eb85d7b47fd5f52fcf4974ae61c056c`
- Release hash: `6203a138f2a6f500`
- Build report totals: 22 entries, 312 completed tracks
- Committed baseline remains explicit: 3,366 catalog tracks; this milestone adds 11 completed baseline tracks, moving progress from 301 to 312 completed tracks.

## Verification

Passed gates:

- Focused rank-20 acceptance: `node scripts/test-ranks-20-kid-a-acceptance.mjs` (11 documented, 0 insufficient-evidence, exact catalog identity, unpublished edition 1)
- Lifecycle validation: rank-20 edition 1 valid=true, published=false
- Full regression: `npm run test:all` passed (provenance, object-store, core, backend, UI, data-integrity 243 albums, and all research suites)
- TypeScript: `npx tsc --noEmit` passed
- Production build: `npm run build` passed; 36 immutable album objects emitted
- Zero-growth/byte-identity: two consecutive `scripts/build-track-encyclopedia.mjs` runs produced byte-identical rank-20 stats and object identity
- GC dry-run: `deleted=false`, releases=30, current release `6203a138f2a6f500` referenced=true
- Git diff check: passed
- Real Chrome production-preview smoke: rank-20 Kid A rendered in headless Chrome with track evidence visible and zero captured runtime exceptions

## Scope and safety

No push, deployment, publication, provider edit, Gym edit, external messaging, or live-data mutation was performed. The edition remains local and unpublished.

Pre-existing unrelated working-tree changes were preserved and not staged as part of this milestone: `scripts/test-data-integrity.mjs`, `src/data/catalog.generated.json`, `src/data/encyclopedia.generated.json`, prior untracked research reports, and pre-existing untracked source artifacts. The 10 pre-existing uncommitted bonus-disc tracks remain isolated and were not silently rewritten into the committed baseline.

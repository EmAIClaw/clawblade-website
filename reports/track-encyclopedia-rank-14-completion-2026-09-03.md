# Track Encyclopedia rank 14 completion — The Rolling Stones, Exile on Main St.

Date: 2026-09-03
Album ID: `014-the-rolling-stones-exile-on-main-st-9d89aa7d`
Edition: 1
Published: false
Content hash: `1b0aa6d44c190623`

## Outcome

Rank 14 is complete in an immutable unpublished Track Encyclopedia edition.

- Catalog tracks (committed baseline): 18
- Documented tracks: 18
- Contextual tracks: 0
- Limited tracks: 0
- Insufficient-evidence tracks: 0
- Unresearched tracks: 0
- Verified claims retained: 18
- Independent review decisions: 18 supported, 0 unsupported, 0 uncertain

All retained claims are narrow track-specific recording/songwriting statements sourced to Rolling Stone's "Exile on Main St. Track By Track" article (September 21, 2006). Each track keeps one attributed claim with a verbatim source extract, exact character offsets, and an imported immutable semantic-review binding.

## Source provenance

Source artifact count for this album: 1

- Source artifact: `16b355e805fffd9f3d59c0f2954ad27752c6a9cda11bdc1f54a0ca38d3eab739`
- Source artifact SHA-256: `c1cea0ff9b0a4780c6c239266f2d633b449f668530fad7e413c73442a2594ed9`
- Canonical URL: `https://www.rollingstone.com/music/music-news/exile-on-main-st-track-by-track-242956`
- Source identity: `rollingstone.com|Exile on Main St. Track By Track 2006`
- Collection method: http-fetch + pandoc HTML extraction (albumvault-http-collector)
- Retrieval status: HTTP 200; fetched response SHA-256 `d46f8e5422634f6b80f9cef39a7ccf21c83b78857d8ad4268ef9d1dc40eff29e`

## Independent semantic review

Review artifact count for this album: 1

- Review artifact: `673adb8b30339afb1bb3d10a1f8fe9ccd7b9e141928f5f8a15e93a68a1c017e1`
- Review artifact SHA-256: `39de02730d152cdd26812c784e6f99a243cf968be283ce8ed86e5227b16ca1f6`
- Reviewer identity: `codex-independent-evidence-reviewer`
- Process: `codex exec --sandbox read-only`
- Run ID: `rank14-final-readonly-review-20260903`
- Candidate content hash: `cf982528d59a06c5bb77de099d4362fbb2227e0dfc1e850ff5ae1026051a9d8d`

The read-only review returned all 18 claims supported with evidence-specific rationales.

## Immutable edition and object-store identity

- Authoring SHA-256: `44caf19dbb11d8da8c8e543ed019c5d613fdb45ee1e5692a214b195255aa7df2`
- Edition SHA-256: `22db3a2ff0444bd5e478f3c6bd35c1cd07d85ac0a0867da148bf7ab9a5589522`
- Album object: `731966358eff8bdc1bfce6d106b63f3f24370084c77eb88511438a70f5161601`
- Release hash: `f2af0078bfdd332d`
- Build report totals: 16 entries, 206 documented tracks
- Committed baseline remains explicit: 3,366 catalog tracks; this milestone adds 18 completed baseline tracks, moving progress from 188 to 206 completed tracks.

## Verification

Passed gates:

- Focused rank-14 acceptance: `node scripts/test-ranks-14-exile-acceptance.mjs`
- Provenance suite: 35/35 passed
- Object-store suite: 13/13 passed
- Core Track Encyclopedia suite: 72/72 passed
- Backend lifecycle suite: 51/51 passed
- UI state/evidence suite: 5/5 passed
- Lifecycle validation: rank-14 edition 1 valid=true, published=false
- TypeScript: `npx tsc --noEmit` passed
- Data integrity: 243 albums passed
- Full regression: `npm run test:all` passed
- Production build: `npm run build` passed; 16 immutable JSON assets emitted
- Zero-growth/byte-identity: two consecutive `scripts/build-track-encyclopedia.mjs` runs produced byte-identical object sets (30 album objects, zero added/removed/changed)
- GC dry-run: `deleted=false`, releases=24, current release `f2af0078bfdd332d` referenced=true
- Git diff check: passed
- Real Chrome production-preview smoke: rank-14 Exile on Main St. rendered in headless Chrome with source evidence visible and zero captured runtime exceptions

## Scope and safety

No push, deployment, publication, provider edit, Gym edit, external messaging, or live-data mutation was performed. The edition remains local and unpublished.

Pre-existing unrelated working-tree changes were preserved and not staged as part of this milestone: `scripts/test-data-integrity.mjs`, `src/data/catalog.generated.json`, `src/data/encyclopedia.generated.json`, prior untracked research reports, and pre-existing untracked source artifacts. The 10 pre-existing uncommitted bonus-disc tracks (disc 2) remain isolated and were not included in this milestone's 18-track committed baseline.

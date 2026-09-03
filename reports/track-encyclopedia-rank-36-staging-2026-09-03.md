# Track Encyclopedia rank 36 staging — Michael Jackson, Off the Wall

Date: 2026-09-03
Album ID: `036-michael-jackson-off-the-wall-4752dab3`
Branch: `accel/rank-036`
Edition: 1
Published: false
Content hash: `85b7539bbffcb1cb`

## Outcome

Rank 36 is staged as an immutable unpublished Track Encyclopedia edition.

- Catalog tracks: 10
- Documented tracks: 10
- Insufficient-evidence tracks: 0
- Unresearched tracks: 0
- Verified claims retained: 10
- Independent review decisions: 10 supported, 0 unsupported, 0 uncertain

Exact catalog disc, track number, and title identity is preserved for every track. The canonical catalog and its Apple/iTunes preview URLs were not modified.

## Source provenance

Two live HTTPS response bodies were collected with HTTP status 200. Every retained extract is a verbatim substring of normalized fetched text with mechanically located character offsets, a fetched-response SHA-256, and a content-addressed immutable artifact.

- Billboard track-by-track review: `1d772d265dabc78988e3acc21846fc36bdf69331f077fd65e207a5c980c236e9`
  - Canonical URL: `https://www.billboard.com/music/reviews/michael-jacksons-off-the-wall-at-35-classic-track-by-track-6214222`
  - Fetched response SHA-256: `f4980571cc1f4eafd8924acc2ba9a4a46c49bffe4c23d1a4e03d14b8cf37c8c7`
  - Tracks supported: 9
- Albumism anniversary feature: `24b0cefcc9f1fda3cbe93bb264c25d393d68f90f10e433eca390ab8c481153e3`
  - Canonical URL: `https://albumism.com/features/michael-jackson-off-the-wall-album-anniversary`
  - Fetched response SHA-256: `26640069f57d7b5bbd40cfe239a166d6681ce465743a271c39e2227b44a27a93`
  - Tracks supported: 1

No search snippets, track durations, sequence descriptions, track-list rows, or generic album prose were used as evidence.

## Independent semantic review

- Review artifact: `010ab8802b19009caeef38a78bfaeac2212f5cfd271762effdbf822262c87e16`
- Reviewer: `codex-independent-evidence-reviewer`
- Process: `codex exec --sandbox read-only`
- Run ID: `rank36-final-readonly-review-20260903`
- Candidate content hash: `aaa2ef3f7377079eeac86937985be153c29b4748575e8cb30c5b391f520b17ef`
- Decisions: 10 supported, 0 unsupported, 0 uncertain

The authoring generator identity differs from the reviewer identity. Only supported claims were imported and bound to the immutable review record.

## Focused verification

- RED observed before authoring: `node scripts/test-ranks-36-off-the-wall-acceptance.mjs` failed with ENOENT for the absent rank-36 authoring file.
- GREEN: focused rank-36 acceptance passed for all 10 exact catalog tracks, 10 documented dispositions, supported review bindings, and unpublished edition 1.
- Provenance suite: 35 passed, 0 failed.
- `git diff --check`: passed.

## Scope

This staging branch intentionally does not integrate aggregate runtime outputs. It does not modify or commit build-report.json, manifest.generated.ts, track-encyclopedia.generated.json, objects, releases, canonical progress, catalog data, dist, Gym, or hosting/provider files. No push, deployment, publication, or external messaging was performed.

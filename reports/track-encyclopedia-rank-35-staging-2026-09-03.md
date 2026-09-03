# Track Encyclopedia rank 35 staging — The Beatles, Rubber Soul

Date: 2026-09-03
Album ID: `035-the-beatles-rubber-soul-e05eb313`
Branch: `accel/rank-035`
Edition: 1
Published: false
Content hash: `dfc32af7638ca11c`

## Outcome

Rank 35 is prepared as a conflict-safe, immutable unpublished Track Encyclopedia staging edition.

- Catalog tracks: 14
- Documented tracks: 14
- Insufficient-evidence tracks: 0
- Unresearched tracks: 0
- Verified claims retained: 14
- Independent review decisions: 14 supported, 0 unsupported, 0 uncertain

Each catalog track retains one narrow track-specific claim. Unsupported musical analysis, lyric interpretation, listening prose, and generic templates remain absent.

## Catalog identity

The focused acceptance test compares every authored `discNumber`, `trackNumber`, and `trackTitle` against the committed catalog and passes for all 14 tracks. The staging change does not modify `src/data/catalog.generated.json`; the existing Apple collection ID `1441164359`, Apple collection URL, artwork metadata, durations, and all 14 iTunes preview URLs remain byte-for-byte outside this additive authoring commit.

## Source provenance

- Source artifact: `025e24e6d515c5b8cde73732b0a8c0298e8537c24d572d0b98073f86a0982522`
- Canonical/final URL: `https://en.wikipedia.org/wiki/Rubber_Soul`
- Checked: 2026-09-03
- HTTP status: 200
- Collection method: `http-fetch`
- Collector: `albumvault-http-collector` 1.0.0
- Collector run: `rank35-rubber-soul-http-collector-v2-20260903`
- Fetched-response SHA-256: `7fbe1dfecf9d758e63896f0d2a1bc8a6805e44a6501d90aa3ab2d47879c13fc9`
- Retained source characters: 16,384 of 145,598 normalized fetched characters

The collector fetched the live HTTPS response, converted the article body through pandoc, located every evidence phrase mechanically, expanded each retained extract to its track heading so the extract is independently track-specific, and recorded exact character offsets within the content-addressed artifact.

## Independent semantic review

- Review artifact: `2ec3378e10d9dc6d6e70cf56ef33778619676690e8c8159f91d1d4ee0cdbff5d`
- Candidate content hash: `05383a0a9bb445c857c9acd40788c43ff018841085a6e4b3c942b2502f1accd3`
- Reviewer: `codex-independent-evidence-reviewer`
- Process: `codex exec --sandbox read-only`
- Run ID: `rank35-final-readonly-review-20260903`
- Decisions: 14 supported, 0 unsupported, 0 uncertain

The reviewer independently checked artifact existence, URL binding, exact offset containment, semantic entailment, and track specificity for every candidate claim. Only the 14 final supported decisions were imported.

## TDD and focused verification

RED was observed before authoring: `node scripts/test-ranks-35-rubber-soul-acceptance.mjs` failed with `ENOENT` for the absent rank-35 authoring file.

GREEN and focused staging gates:

- `node scripts/test-ranks-35-rubber-soul-acceptance.mjs` — passed: 14 documented, 0 insufficient-evidence, exact catalog identity, unpublished edition 1.
- `node scripts/persist-track-encyclopedia-edition.mjs 035-the-beatles-rubber-soul-e05eb313` — passed idempotently with `alreadyPresent=true`, content hash `dfc32af7638ca11c`.
- `node scripts/build-track-encyclopedia.mjs validate --album-id 035-the-beatles-rubber-soul-e05eb313` — passed: `valid=true`, `published=false`.
- `node scripts/test-track-encyclopedia-provenance.mjs` — passed: 35 tests, 0 failed.

## Scope

This staging work is additive and unpublished. It does not integrate aggregate runtime outputs and does not modify generated manifests, aggregate JSON, object/release stores, canonical progress, catalog/legacy data, `dist/`, `/gym`, hosting/provider files, or unrelated artifacts. No push, deployment, publication, or external messaging was performed.

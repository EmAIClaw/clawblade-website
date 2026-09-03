# Track Encyclopedia rank 26 staging — Patti Smith, Horses

Date: 2026-09-03
Album ID: `026-patti-smith-horses-2807d0f1`
Edition: 1
Published: false
Content hash: `01b63ff001da020d`

## Outcome

Rank 26 is staged as an immutable unpublished Track Encyclopedia edition covering the exact eight-track catalog identity.

- Catalog tracks: 8
- Documented tracks: 8
- Insufficient-evidence tracks: 0
- Unresearched tracks: 0
- Verified claims retained: 8
- Independent final review: 8 supported, 0 unsupported, 0 uncertain

Track dispositions: Gloria — documented; Redondo Beach — documented; Birdland — documented; Free Money — documented; Kimberly — documented; Break It Up — documented; Land — documented; Elegie — documented.

## Research and provenance

Research covered all eight tracks across participant oral history, official-artist material, reputable interview/editorial archives, and track-specific searches. Only the New York Times oral history was retained because it supplied narrow, track-specific first-person testimony from Patti Smith or Lenny Kaye for every catalog track. Search snippets, durations, sequence descriptions, generic album prose, and listening-based inference were not retained.

The live New York Times URL returned HTTP 403 to the repository collector. Blocked-page recovery selected a Wayback snapshot dated 2025-11-10 (`20251110153406`), and the edition labels that snapshot provenance explicitly.

- Canonical URL: `https://www.nytimes.com/interactive/2025/11/07/arts/music/patti-smith-horses-anniversary.html`
- Archived final URL: `https://web.archive.org/web/20251110153406/https://www.nytimes.com/interactive/2025/11/07/arts/music/patti-smith-horses-anniversary.html`
- Collection method: `archive-http-fetch`
- Checked date: `2026-09-03`
- HTTP status: 200
- Fetched-response SHA-256: `db53cbb74cca5d15c8d527c05f9d70872b1872b9e4499f2476bfff0bf8c0e24e`
- Content-addressed source artifact: `f251527f34cf2b79c91cb2d0efeb5c4f933f424993ca2aac6b2f4d777280883a`

Every source reference preserves an exact verbatim extract and character offsets mechanically checked against the retained normalized response body.

## Independent semantic review

A separate Codex process ran with `--sandbox read-only`. Earlier review passes rejected overbroad/context-dependent formulations; those claims were narrowed or their extracts expanded before the final candidate was prepared. Only the final all-supported review was imported.

- Reviewer identity: `codex-independent-evidence-reviewer`
- Process: `codex exec --sandbox read-only`
- Run ID: `rank26-final-readonly-review-20260903`
- Candidate content hash: `fc19a66856e843f34c993d1d48f03f4daf7b09392d29b255a8cc4874fe4b94a5`
- Review artifact: `c97bebd647431f86b2b39b0881be64b1ac76e3b6884bfb0c3f6a10ba573ef7c9`
- Decisions: 8 supported, 0 unsupported, 0 uncertain

## TDD and focused verification

RED was observed before authoring: `node scripts/test-ranks-26-horses-acceptance.mjs` failed with `ENOENT` for the absent rank-26 authoring file.

GREEN was observed after independent review import:

- `node scripts/test-ranks-26-horses-acceptance.mjs` passed.
- `node scripts/test-track-encyclopedia-provenance.mjs` passed: 35 tests, 0 failures.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- Exact catalog disc/track/title identity passed for all 8 tracks.
- Edition 1 is immutable and unpublished.
- Each documented claim binds to one supported immutable review decision and one content-addressed source artifact.
- `node scripts/persist-track-encyclopedia-edition.mjs 026-patti-smith-horses-2807d0f1` persisted edition 1 with content hash `01b63ff001da020d`.

The catalog and its Apple collection/artwork URLs, durations, and all eight iTunes preview URLs were not modified. Aggregate build outputs were intentionally not generated or committed on this parallel staging branch.

## Scope and safety

This staging change is additive and conflict-safe: rank-26 source, review, authoring, immutable edition, focused acceptance, collection/generation scripts, and this report only. It excludes aggregate manifests, generated runtime data, objects, releases, progress files, catalog/legacy data, dist, Gym, and hosting/provider files. No push, deployment, publication, or external messaging occurred.

# Track Encyclopedia rank 25 staging — Carole King, Tapestry

Date: 2026-09-03
Album ID: `025-carole-king-tapestry-b29b056b`
Edition: 1
Published: false
Content hash: `d33beea7c440089d`

## Outcome

Rank 25 is staged as an immutable unpublished Track Encyclopedia edition covering the exact 12-track catalog baseline.

- Documented tracks: 8
- Insufficient-evidence tracks: 4
- Unresearched tracks: 0
- Retained verified claims: 8
- Independent review decisions: 8 supported, 0 unsupported, 0 uncertain

Documented: “I Feel the Earth Move,” “So Far Away,” “It’s Too Late,” “Beautiful,” “You’ve Got a Friend,” “Where You Lead,” “Will You Love Me Tomorrow?,” and “Smackwater Jack.”

Completion-eligible insufficient-evidence dispositions: “Home Again,” “Way Over Yonder,” “Tapestry,” and “(You Make Me Feel Like) A Natural Woman.” Each records explicit queries, consulted source classes, outcome, and limitations; lyrics, titles, durations, sequence descriptions, and generic album prose were not promoted as evidence.

## Catalog preservation

The authoring identity is an exact match for the committed catalog’s disc number, track number, and title multiset. This staging commit does not modify `src/data/catalog.generated.json`; all existing Apple collection, artwork, duration, and iTunes preview URL fields therefore remain byte-for-byte untouched.

## Source provenance

Eight live HTTPS source bodies were fetched through `albumvault-http-collector` with HTTP status, retrieval timestamp, final canonical URL, fetched-response SHA-256, normalized retained context, and exact mechanically verified character offsets.

Referenced source artifacts:

- `3268dba4222380cba110474e432ed6a47636634cc1352791457645511fffcd47`
- `4c0ac35704fc4c1ecf23fd51e37c504b16159c5bbcd2c6ffe631ea5ecefd3672`
- `4e7f193e89acb0b98319dc7f09e43f00ee8b9728f564719034842099a226dce4`
- `510f236365e3669e9be685d0be0a9f6d25bf88fa9750406314b2a4fd0bb18d70`
- `ba7930eac96522e7426188eca64f73b653ec4854a52a05792f16a6faecb2fb82`
- `db76a67da1f0f16297133757971b6e8049c6c36c77076382b78e52b78097e63b`
- `f28c84958930e67433a6c52b0aad8b9930506e1e3844776c378bc45772b74a94`
- `f3a616f9b5d7455a99279f00be4d34101fdb0f69a853de912b867d18f8b151e1`

Collection details and per-claim offsets are in `reports/rank25-tapestry-source-collection.json`.

## Independent semantic review

- Review artifact: `98b01cf278c520d33cf453cf0c88232165e42faf0ec84d36d3da34c4c42cc691`
- Candidate content hash: `fb361c9c20a2c980882a419b59e7deeee189ad8b121ee0ab04e647b9ee89420d`
- Reviewer: `codex-independent-evidence-reviewer`
- Process: `codex exec --sandbox read-only`
- Run ID: `rank25-final-readonly-review-20260903`

The separate read-only reviewer checked artifact existence, canonical source binding, exact offset slicing, track specificity, and semantic claim support. All eight candidates were supported before import.

## Focused verification

- RED observed first: `node scripts/test-ranks-25-tapestry-acceptance.mjs` failed with `ENOENT` because rank-25 authoring did not exist.
- Review import validated all source and review bindings.
- Edition persistence: edition 1 persisted with `published=false`, content hash `d33beea7c440089d`.
- GREEN: `node scripts/test-ranks-25-tapestry-acceptance.mjs` passed — 12 exact catalog tracks, 8 documented, 4 insufficient-evidence.
- Provenance suite: `node scripts/test-track-encyclopedia-provenance.mjs` passed, 35/35.
- Object-store suite: `node scripts/test-track-encyclopedia-object-store.mjs` passed, 13/13.

Aggregate generated runtime outputs were intentionally not built or staged. They belong to the downstream ranks 22–29 integration task.

## Scope and safety

Only additive rank-25 staging artifacts are included: source artifacts, independent review artifact and audit files, album authoring, immutable edition, focused test, scoped collection/generation scripts, and this report. No push, deployment, publication, external messaging, Gym change, hosting/provider change, aggregate object/release/manifest/progress mutation, or catalog/legacy data edit was performed.

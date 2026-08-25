# AlbumVault Project State

Updated: 2026-08-25

## Canonical workspace

- Repository: `/Users/ai/.hermes/workspace/projects/albumvault`
- Branch: `main`
- Production: `https://clawblade.ai`
- Policy: local-first; no push or deployment without Arnaud's approval.

## Current mission

Complete only catalog rank 5, The Beatles — *Abbey Road*, across its exact current 17-track catalog edition. Do not expand to another album.

## Rank-5 completion status

- Authoritative album ID: `005-the-beatles-abbey-road-1955f3c5`.
- Exact identity preserved: disc 1 tracks 1-17, with current catalog titles unchanged.
- Preserved immutable draft edition 1 SHA-256: `d798de5f42b565705aa2722336b0fc561162810ab089c434bb0aef2d16334e7c`.
- New immutable draft edition: 2.
- Draft content hash: `60c8394ddd63bf3d`.
- Edition file SHA-256: `8a753fc521d63b84242d598d749cd4b5fbc06b03fa8a5f01952f9a39ad0317db`.
- Immutable object hash: `76853d41c445d9dea3e3e95c3d8110bb63b8303e0ae599181d150688848d667f`.
- Generated release hash: `24546b928acb2ed8`.
- Publication state: `published: false`.
- Track dispositions: 17 documented, 0 contextual, 0 insufficient-evidence, 0 unresearched.
- Every displayed claim has an explicit claim-to-source link, canonical HTTPS URL, retained minimum verbatim excerpt, retrieval/check metadata, self-describing project-hashed snapshot, and supported independent semantic review decision.
- Unsupported musical-character, album-context, listening-note, and audio-analysis prose is absent.
- Rank 5 is completion-eligible as an unpublished draft.

## Independent evidence audit

- Full audit ID: `audit-005-abbey-road-20260825-semantic-independent-final-candidate2`.
- Targeted follow-up audit ID: `audit-005-abbey-road-20260825-semantic-independent-final-candidate3`.
- Parent independent postcommit audit ID: `audit-005-abbey-road-20260825-parent-independent-postcommit-verification`.
- Parent final edition-2 audit ID: `audit-005-abbey-road-20260825-parent-independent-final-edition2`.
- Final decisions: 17 supported, 0 unsupported, 0 uncertain.
- Actual-page and snapshot exact containment: parent audit passed live-page/snapshot/hash containment and aggregate integrity for the committed candidate.
- Parent editorial findings fixed in edition 2: important `B-sides climactic medley` -> `B-side's climactic medley`; minor `Harrisons` -> `Harrison's`; `Maxwells` -> `Maxwell's`; `Octopuss` -> `Octopus's`; `Shes` -> `She's`; `Abbey Roads` -> `Abbey Road's`.
- Project snapshot-hash and lifecycle validation: passed.
- Exact catalog identity/order/title: 17/17.
- Evidence borrowing: none.
- Unsupported listening/audio analysis: none.
- Critical or important findings remaining: none.
- Final edition-2 audit findings: 0 critical, 0 important, 0 minor.

## Verification status

All required gates passed after the final audited candidate:

- Lifecycle validator — valid; edition 2; unpublished.
- Backend tests — 49/49.
- Authoring completion acceptance — 7 authoring files.
- UI evidence/state tests — 5/5.
- Core track-encyclopedia tests — 71/71.
- Object-store tests — 13/13 via full `test:all`.
- TypeScript — passed.
- Data integrity — 243 albums.
- Full `npm run test:all` — passed.
- Track build — 7 albums, 95 tracks; 95 documented, 0 contextual/limited/insufficient-evidence/unresearched.
- Unchanged track rebuild — 8 objects before/after, zero added/removed, byte-identical generated outputs.
- Production build — passed; 1,574 modules transformed.
- Prior-edition hash verification — 15/15 unchanged, including preserved rank-5 edition 1.
- `git diff --check` — passed after report/state/manifest updates.

## Cumulative counts

- Catalog: 243 albums, 3,366 tracks.
- Versioned/completed: 7 albums, 95 tracks.
- Completion-disposition tracks: 95 (95 documented, 0 contextual, 0 insufficient-evidence).
- Catalog tracks still unresearched for completion accounting: 3,271.

## Safety / deployment

- No catalog or Gym data was modified.
- No edition was marked published.
- No push or deployment occurred.
- No external communication occurred.
- Historical valid generated releases and prior edition history remain retained.
- Unrelated untracked historical research reports remain untouched and must be excluded from the focused commit.

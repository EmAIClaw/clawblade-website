# AlbumVault Project State

Updated: 2026-08-25

## Canonical workspace

- Repository: `/Users/ai/.hermes/workspace/projects/albumvault`
- Branch: `main`
- Production: `https://clawblade.ai`
- Policy: local-first; no push or deployment without Arnaud's approval.

## Current mission

Complete only catalog rank 7, Fleetwood Mac — *Rumours*, across its exact current 11-track catalog edition. Do not expand to another album.

## Rank-7 completion status

- Authoritative album ID: `007-fleetwood-mac-rumours-bc57e04c`.
- Exact identity preserved: disc 1 tracks 1-11, with current catalog titles unchanged.
- New immutable unpublished draft edition: 1.
- Draft content hash: `60db2f9ccccfa002`.
- Edition file SHA-256: `cf5ad0aa7aa278ce1f7eb3f04c6c02bda64e2f7252d47ba3f65c27c8ddb1c4e5`.
- Immutable object hash: `f5858be0fadccba67ace1e50494045a2778666a0e58ab2f421019cb3976d929d`.
- Generated release hash: `be0dde5d9b55407a`.
- Publication state: `published: false`.
- Track dispositions: 11 documented, 0 contextual, 0 insufficient-evidence, 0 unresearched.
- Every displayed claim has an explicit claim-to-source link, canonical HTTPS URL, retained minimum verbatim excerpt, retrieval/check metadata, self-describing project-hashed snapshot, and supported independent semantic review decision.
- Unsupported musical-character, album-context, listening-note, and audio-analysis prose is absent.
- Rank 7 is completion-eligible as an unpublished draft.

## Independent evidence audit

- First audit ID: `audit-007-rumours-20260825-independent-final-candidate1`.
- First audit decisions: 7 supported, 2 unsupported, 2 uncertain; 2 critical, 2 important findings.
- Critical findings (tracks 7 and 11): non-contiguous verbatim excerpts; fixed by making excerpts contiguous and splitting track 11 into two facts.
- Important findings (tracks 2 and 5): claims going beyond excerpt scope; fixed by narrowing claims and extending excerpts.
- Final audit ID: `audit-007-rumours-20260825-independent-final-candidate2`.
- Final decisions: 11 supported, 0 unsupported, 0 uncertain.
- Actual-page and snapshot exact containment: passed for all 12 facts across 11 tracks after NFKC/whitespace normalization.
- Snapshot identity/hash reproduction: 12/12 passed.
- Exact catalog identity/order/title: 11/11.
- Evidence borrowing: none; each track retains its own distinct relevant excerpt and snapshot.
- Unsupported listening/audio analysis: none.
- Boilerplate: none substantive.
- Critical, important, or minor findings remaining: none.

## Verification status

All required gates passed against the final audited candidate:

- Lifecycle validator — valid; edition 1; unpublished.
- Backend tests — 49/49.
- Authoring completion acceptance — 9 authoring files.
- UI evidence/state tests — 5/5.
- Core track-encyclopedia tests — 71/71.
- Object-store tests — 13/13 via full `test:all`.
- TypeScript — passed.
- Data integrity — 243 albums.
- Full `npm run test:all` — passed.
- Track build — 9 albums, 119 tracks; 119 documented, 0 contextual/limited/insufficient-evidence/unresearched.
- Unchanged track rebuild — 12 objects before/after, zero object or generated-output hash differences.
- Production build — passed.
- Prior-edition hash verification — 17/17 unchanged.
- `git diff --check` — passed after final report/state/completion-manifest updates.

## Cumulative counts

- Catalog: 243 albums, 3,366 tracks.
- Versioned/completed: 9 albums, 119 tracks.
- Completion-disposition tracks: 119 (119 documented, 0 contextual, 0 insufficient-evidence).
- Catalog tracks still unresearched for completion accounting: 3,247.

## Safety / deployment

- No catalog or Gym data was modified.
- No edition was marked published.
- No push or deployment occurred.
- No external communication occurred.
- Historical valid generated releases and prior edition history remain retained.
- Unrelated untracked historical research reports remain untouched and must be excluded from the focused commit.
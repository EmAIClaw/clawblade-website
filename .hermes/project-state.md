# AlbumVault Project State

Updated: 2026-08-25 00:35 CEST

## Canonical workspace

- Repository: `/Users/ai/.hermes/workspace/projects/albumvault`
- Branch: `main`
- Base HEAD: `10ad2548584d499a503549f83554762a55322ac2`
- Production: `https://clawblade.ai`
- Policy: local-first; no push or deployment without Arnaud's approval.

## Current mission

Complete only the versioned track-encyclopedia foundation and the three-pilot evidence repairs. Do not expand beyond the pilots.

## Foundation status

- Per-album authoring exists for exactly three pilots under `src/data/track-encyclopedia/authoring/`.
- Current draft editions: Marvin Gaye 3, Liz Phair 3, The Stooges 2.
- All draft editions remain `published: false`.
- Generated pilot result: 3 albums, 34 tracks; 4 documented, 2 contextual, 0 limited, 0 completed-insufficient-evidence, 28 unresearched.
- Exact catalog identity is enforced for lifecycle validation and publication and checked during normal builds whenever the catalog is available.
- Evidence snapshots are self-describing and strict loading no longer injects missing IDs.
- Publication requires explicit album ID, edition number, change note, and approval token.
- Authoring discovery, atomic release publication, dry-run GC planning, runtime hash fallback, and loading/missing/error/retry UI states have focused coverage.
- Unsupported listening-analysis prose without retained audio provenance was removed instead of counted as evidence.

## Verification status

All required gates passed:

- `node scripts/test-track-encyclopedia-backend.mjs` — 49/49
- `node scripts/test-track-encyclopedia-pilot-repairs.mjs`
- `node scripts/test-track-encyclopedia-ui.mjs` — 5/5
- `node scripts/test-track-encyclopedia.mjs` — 71/71
- `npx tsc --noEmit`
- `npm run test:data` — 243 albums
- `npm run test:all`
- `npm run build:track-encyclopedia`
- `npm run build`
- `git diff --check`
- Real Chrome smoke: loaded, missing, error, and successful retry
- Independent final review: approved with no critical or important findings

The local foundation expansion gate is passed. Catalog expansion remains out of scope and was not started.

## Counts

- Catalog: 243 albums, 3,366 tracks.
- Versioned pilots: 3 albums, 34 tracks.
- Completion-eligible evidence tracks: 6 (4 documented, 2 contextual).
- Completed albums: 0.
- Catalog tracks still unresearched for completion accounting: 3,360.

## Safety / deployment

- No website or data lifecycle publication has occurred.
- No push or deployment has occurred.
- Historical generated releases and edition history remain retained.

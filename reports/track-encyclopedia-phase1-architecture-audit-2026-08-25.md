# Track encyclopedia Phase 1 architecture audit — 2026-08-25

Status: **resolved locally; content-addressed storage migration verified on 2026-08-25**

## Content-addressed generated storage (schema v2)

Catalog-wide expansion is now unblocked from the previous quadratic release-copy pattern.

- Canonical authoring and edition history remains under `authoring/<albumId>.json` and `editions/<albumId>/edition-N.json`.
- Runtime album payloads are immutable byte-addressed objects at `objects/albums/<sha256>.json`. The filename is the full SHA-256 of the exact JSON bytes, while the existing 16-character `contentHash` remains the semantic track-content hash used by runtime validation.
- `manifest.generated.ts` is still the runtime commit point. Each album record retains `releaseHash` and `contentHash`, adds `objectHash`, and loads `./objects/albums/<objectHash>.json` directly. The manifest is atomically renamed only after object verification, release identity, aggregate JSON, and build report publication.
- New releases use schema-v2 `releases/<releaseHash>/release.json` identity metadata only. They do not copy album or edition payloads. If the same release hash already names a legacy full release, the legacy directory is left byte-for-byte untouched and the manifest can still migrate to direct object loading.
- All pre-migration full release trees under `releases/` remain historical recovery artifacts. No legacy release was rewritten or removed.
- GC remains dry-run only. Its plan now classifies `legacy-full` and `content-addressed` releases, verifies current/release object references, reports object validity/reference state, and never deletes.
- Failure injection covers immutable-object publication, release identity publication, aggregate publication, report publication, and manifest swap. Every injected failure leaves the prior manifest usable.
- Growth regression builds N incremental completions and asserts N immutable objects rather than `N(N+1)/2` copied release payloads. Repeated unchanged builds add zero objects and preserve byte identity; one changed album adds one object.

Migration preserved the completed album semantic hashes exactly:

- rank 1: `449c11738b4a4676`
- rank 2: `b09e0a3f6b9d372f`
- rank 54: `13de9e97abdf754c`
- rank 92: `ee805c782c56bc4a`

Resolution summary:

- Expansion-gate items 1–7, 9, and 10 now have focused automated coverage.
- Item 8 is implemented as reference-aware dry-run planning only; no destructive cleanup ran.
- Publication is fail-closed and requires explicit album, edition, change note, approval token, catalog identity, retained evidence, and semantic review.
- The three pilots use deterministic per-album authoring and remain unpublished drafts.
- Real Chrome smoke checks passed for loaded, missing, error, and retry states.
- Catalog expansion was not performed by this mission.

Verified baseline:

- 71/71 core track-encyclopedia tests pass.
- 49/49 backend tests pass.
- 13/13 content-addressed object-store tests pass.
- Pilot repair acceptance passes for all 4 authoring files; 5/5 UI state/evidence-label tests pass.
- TypeScript compile is clean.
- Existing content and evidence snapshot hashes validate.
- Data integrity passes for 243 albums; pilot tracks align with the current catalog of 3,366 tracks.

## Final post-canonical-serialization gate — 2026-08-25

All final gates ran against the same working tree after canonical object serialization:

- `npm run test:all` passed in full, including security, data, listening, loading/recovery, taste, lazy-loading, 71 core track-encyclopedia tests, 13 object-store tests, and all existing research regression suites.
- Two consecutive unchanged `npm run build:track-encyclopedia` runs each produced 4 entries and 47 tracks. Object count stayed exactly 4 before, after build 1, and after build 2; zero files were added or removed and every object remained byte-identical by SHA-256.
- `npm run build` passed: Vite transformed 1,574 modules and emitted all four content-addressed JSON assets. The tracked `dist/gym` tree was restored unchanged after the local production-build check.
- Real Google Chrome production-preview smoke passed for ranks 1, 2, 54, and 92. Each album detail and Track Encyclopedia panel loaded, its exact immutable SHA-256 object asset returned HTTP 200 as `application/json`, and Chrome reported zero console errors and zero network failures.
- GC dry-run reported `deleted=false`, 6 preserved legacy-full releases, the manifest-referenced current release, and no deletion.
- Independent read-only review approved the change with no Critical or Important findings. It verified atomicity, legacy history, Vite URL handling, traversal controls, collision/concurrency handling, mixed-store GC behavior, and linear growth. Three informational minor notes require no pre-commit change: `editionPath` now aliases the object path; symlink detection remains a pre-existing non-worsened limitation; and a matching legacy release hash intentionally suppresses `release.json` creation to preserve history byte-for-byte.
- `git diff --check` and final scoped-status hygiene passed immediately before the focused local commit; unrelated historical research reports and all legacy release trees remained untouched.

## Blocking foundation work

### 1. Add an explicit publication lifecycle

Implement a tested CLI/subcommand that can validate and publish a specified album edition atomically. It must:

- fail closed on invalid album ID, edition, schema, source snapshots, hashes, or catalog alignment;
- never mutate an already published edition;
- require an explicit command and change note;
- build a new immutable edition for corrections;
- update the manifest only after every other generated artifact is durable;
- support dry-run/validation without publication.

**Policy:** The mechanism may be implemented locally, but no pilot/catalog edition is to be marked published without Arnaud's release approval. “Published” here is a data lifecycle state, not permission to deploy the website.

### 2. Make evidence snapshots self-describing

Each snapshot object must persist its own `id`, rather than relying on every consumer to inject the outer map key. Add RED/GREEN migration and validation tests, migrate the three pilot snapshots, and retain hash reproducibility.

### 3. Align strict evidence validation

Remove or explicitly isolate `allowLegacySelfAttestedEvidence: true`. New/versioned encyclopedia editions must always require retained snapshots for evidence-bearing claims. Legacy migration must be a separately named path and may not silently weaken normal loading/build validation.

### 4. Fix atomic generated-output publication

The manifest is the runtime commit point and must be swapped last. Aggregate JSON and build report must be written and made durable before the manifest swap. Add failure-injection tests covering every boundary between candidate payload, aggregate, report, and manifest publication.

### 5. Add user-visible load states

Track encyclopedia loading needs explicit `loading`, `loaded`, `missing`, and `error` states with a retry action. Hash/schema/load failures may not disappear as a missing panel. Add UI/state regression tests and browser verification.

### 6. Fail closed on runtime integrity verification

Do not silently skip the content-hash check when Web Crypto is unavailable. Either provide a tested deterministic fallback matching build-time canonical hashing or surface a user-visible integrity error. Localhost browser behavior must be covered.

### 7. Replace monolithic authoring input before scaling

Move from one `pilot-entries.json` authoring file to per-album authoring inputs. Requirements:

- deterministic sorted discovery;
- duplicate album ID rejection;
- independent album validation;
- atomic build behavior;
- exact catalog album/track identity checks;
- no full-catalog rewrite for one album edit;
- migration test proving pilot output remains byte/content-hash equivalent where semantics are unchanged.

### 8. Define release retention without losing history

Do not blindly delete old content-addressed releases. First define which artifacts are canonical history (`editions/` versus `releases/`), prove every published edition remains recoverable, then add a tested retention/garbage-collection command that defaults to dry-run and deletes only provably unreferenced candidate releases. Never run destructive cleanup automatically during build.

### 9. Distinguish evidence from references in the UI

Evidence-bearing claim links and bibliographic/reference-only links must be visibly different. The UI must not imply that a bare track source supports a displayed factual claim.

### 10. Add explicit research completion disposition

The schema must distinguish:

- documented track-specific evidence;
- contextual album-level evidence;
- research completed but no reliable track-specific public evidence found;
- genuinely unresearched.

A completed insufficient-evidence disposition must retain search metadata (queries/source classes/date) and explicit limitations. Existing `limited` listening-analysis entries do not count as completed unless actual audio analysis and provenance are retained.

## Design decisions / audit findings not accepted as stated

### Blank `contentHash` in authoring inputs

An authoring draft may omit a computed hash if it is explicitly documented as non-canonical input and every generated/edition payload carries a verified hash. Do not write hashes back merely to appear complete. Instead:

- formalize authoring versus generated schemas;
- reject a non-empty stale author-supplied hash;
- ensure immutable edition/generated outputs always contain verified hashes;
- make review tooling display the computed candidate hash.

### Runtime React crash risk

Deep runtime validation is the primary defense. Add an error boundary only if focused tests show a validated payload can still crash rendering; do not use optional chaining to mask schema defects.

### Historical release cleanup

Repository growth is real, but immutable provenance outranks size. Implement only dry-run, reference-aware garbage collection after canonical history is defined.

### Track-title capitalization

Exact current catalog identity wins. Do not change versioned track titles independently of the catalog/edition-verification workflow.

### `dist-gym` cleanup

Out of scope for the encyclopedia foundation. Preserve existing Gym artifacts.

## Non-blocking improvements

- Replace React array-index keys with stable composite identifiers when touching the panel.
- Document manifest metadata fields or remove them only if no history/debug workflow needs them.
- Keep exact-excerpt and hash gates, but require independent semantic claim review; term-overlap heuristics alone can never certify factual support.

## Expansion gate

No expansion beyond the three pilots until items 1–7, 9, and 10 pass focused tests, full tests, build, diff check, and browser smoke verification. Item 8 needs a safe design and tests but destructive cleanup need not run before expansion.

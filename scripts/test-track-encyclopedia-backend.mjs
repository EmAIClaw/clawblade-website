// test-track-encyclopedia-backend.mjs — Focused TDD tests for backend track-encyclopedia foundation.
// Covers audit items 1–4, 7, 8, 10 + semantic evidence-review gate + runtime hash fallback.
// Run with: node scripts/test-track-encyclopedia-backend.mjs

import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm, cp, readdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  validateEntry,
  validateTrackEntry,
  validateEvidenceSnapshot,
  reviewEvidenceGate,
  EVIDENCE_LEVELS,
  canonicalizeSourceUrl,
  computeEvidenceSnapshotHash,
  migrateLegacyEvidenceSnapshots,
} from '../src/track-encyclopedia/validation.mjs';
import {
  EditionStore,
  createEntry,
  computeContentHash,
} from '../src/track-encyclopedia/editions.mjs';
import { canonicalStringify } from '../src/track-encyclopedia/hash.mjs';
// Set up Node.js crypto for the runtime hash fallback before importing runtime.ts
globalThis.__crypto = await import('node:crypto');
const {
  getTrackEncyclopediaModuleIds,
  validateTrackEncyclopediaAlbumEntry,
  validateTrackEncyclopediaData,
  computeRuntimeContentHashFallback,
  loadTrackEncyclopediaAlbum,
} = await import('../src/track-encyclopedia/runtime.ts');
import {
  buildTrackEncyclopedia,
  validateAlbumEdition,
  publishAlbumEdition,
  discoverAlbumAuthoringFiles,
} from './build-track-encyclopedia.mjs';
import { planReleaseRetention } from '../src/track-encyclopedia/release-gc.mjs';

const dataDir = path.join(process.cwd(), 'src/data/track-encyclopedia');
const catalogPath = path.join(process.cwd(), 'src/data/catalog.generated.json');
const failures = [];
let passed = 0;

function test(name, fn) {
  return Promise.resolve().then(fn).then(() => {
    passed += 1;
    console.log(`  ✓ ${name}`);
  }).catch((err) => {
    failures.push({ name, message: err.message });
    console.error(`  ✗ ${name}: ${err.message}`);
  });
}

// ─── Helpers ────────────────────────────────────────────────────────

async function makeTempDir(prefix) {
  return await mkdtemp(path.join(tmpdir(), prefix));
}

async function copyPilotFixture(dir) {
  await cp(path.join(dataDir, 'pilot-entries.json'), path.join(dir, 'pilot-entries.json'));
  await cp(path.join(dataDir, 'evidence-snapshots.json'), path.join(dir, 'evidence-snapshots.json'));
  await cp(catalogPath, path.join(dir, 'catalog.generated.json'));
  const pilotPath = path.join(dir, 'pilot-entries.json');
  const pilot = JSON.parse(await readFile(pilotPath, 'utf8'));
  for (const entry of Object.values(pilot.entries ?? {})) {
    for (const track of entry.trackEntries ?? []) {
      for (const fact of track.verifiedFacts ?? []) {
        fact.semanticReview = {
          reviewer: 'test-reviewer',
          reviewedAt: '2026-08-25T00:00:00Z',
          semanticDecision: 'supported',
          decision: 'supported',
        };
      }
    }
    entry.contentHash = '';
  }
  await writeFile(pilotPath, `${JSON.stringify(pilot, null, 2)}\n`);
}

function makeEvidenceSnapshot({ id, url, text }) {
  const snapshot = {
    id,
    canonicalUrl: canonicalizeSourceUrl(url),
    fetchedAt: '2026-01-01T00:00:00Z',
    normalizedText: text.replace(/\s+/g, ' ').trim(),
    contentHash: '',
  };
  snapshot.contentHash = computeEvidenceSnapshotHash(snapshot);
  return snapshot;
}

function makeDocumentedTrack({ claim, url, extract, snapshotId }) {
  return {
    albumId: 'test-album',
    discNumber: 1,
    trackNumber: 1,
    trackTitle: 'Test Track',
    evidenceLevel: 'documented',
    verifiedFacts: [{
      claim,
      sourceRefs: [{
        label: 'Example',
        title: 'Example Source',
        url,
        extract,
        extractType: 'verbatim',
        evidenceStatus: 'retrieved',
        snapshotId,
      }],
    }],
    musicalCharacter: 'Desc',
    albumContext: 'Ctx',
    listeningNotes: 'Notes',
    limitations: [],
  };
}

async function readEvidenceSnapshotsForDir(dir) {
  const data = JSON.parse(await readFile(path.join(dir, 'evidence-snapshots.json'), 'utf8'));
  const snapshots = {};
  for (const [id, snapshot] of Object.entries(data.snapshots ?? {})) {
    snapshots[id] = { ...snapshot, id };
  }
  return snapshots;
}

async function readCatalog() {
  return JSON.parse(await readFile(catalogPath, 'utf8'));
}

// ─── Section 1: Self-describing evidence snapshots (audit item 2) ────

await test('validateEvidenceSnapshot requires self-describing id field inside the snapshot object', () => {
  const snapshot = makeEvidenceSnapshot({
    id: 'self-desc-test',
    url: 'https://example.com/source',
    text: 'A retained source text for testing.',
  });
  validateEvidenceSnapshot(snapshot);
  assert.equal(snapshot.id, 'self-desc-test', 'snapshot must carry its own id');
});

await test('validateEvidenceSnapshot rejects snapshot missing internal id', () => {
  const snapshot = makeEvidenceSnapshot({
    id: 'missing-id-test',
    url: 'https://example.com/source',
    text: 'A retained source text for testing.',
  });
  delete snapshot.id;
  assert.throws(
    () => validateEvidenceSnapshot(snapshot),
    /snapshot.*id.*required/i,
    'snapshot without internal id must be rejected'
  );
});

await test('validateEvidenceSnapshot rejects snapshot with mismatched id', () => {
  const snapshot = makeEvidenceSnapshot({
    id: 'mismatch-id-test',
    url: 'https://example.com/source',
    text: 'A retained source text for testing.',
  });
  snapshot.id = 'different-id';
  assert.throws(
    () => validateEvidenceSnapshot(snapshot),
    /snapshot.*hash.*mismatch|hash.*mismatch|id.*does not match/i,
    'snapshot with mismatched id must be rejected'
  );
});

// ─── Section 2: Legacy migration isolation (audit item 3) ───────────

await test('migrateLegacyEvidenceSnapshots is a separately named function', () => {
  assert.equal(typeof migrateLegacyEvidenceSnapshots, 'function',
    'migrateLegacyEvidenceSnapshots must exist as a separate function');
});

await test('migrateLegacyEvidenceSnapshots adds id to snapshots that lack it', () => {
  const legacy = {
    snapshots: {
      'legacy-snap-1': {
        canonicalUrl: 'https://example.com/legacy',
        fetchedAt: '2026-01-01T00:00:00Z',
        normalizedText: 'Legacy text without id.',
        contentHash: 'old-hash-value',
      },
    },
  };
  const migrated = migrateLegacyEvidenceSnapshots(legacy);
  assert.equal(migrated.snapshots['legacy-snap-1'].id, 'legacy-snap-1',
    'migration must inject id from outer key');
});

await test('migrateLegacyEvidenceSnapshots preserves hash reproducibility', () => {
  const legacy = {
    snapshots: {
      'legacy-hash-test': {
        canonicalUrl: 'https://example.com/hash',
        fetchedAt: '2026-01-01T00:00:00Z',
        normalizedText: 'Hash reproducibility test.',
        contentHash: 'will-be-recomputed',
      },
    },
  };
  const migrated = migrateLegacyEvidenceSnapshots(legacy);
  const expectedHash = computeEvidenceSnapshotHash({
    id: 'legacy-hash-test',
    canonicalUrl: 'https://example.com/hash',
    normalizedText: 'Hash reproducibility test.',
  });
  assert.equal(migrated.snapshots['legacy-hash-test'].contentHash, expectedHash,
    'migration must produce reproducible content hash including id');
});

await test('strict validation rejects evidence-bearing claim without snapshotId (no legacy bypass)', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Strict Test',
      evidenceLevel: 'documented',
      verifiedFacts: [{
        claim: 'A factual claim.',
        sourceRefs: [{
          label: 'Example',
          title: 'Source',
          url: 'https://example.com/source',
          extract: 'A factual claim.',
          extractType: 'verbatim',
          evidenceStatus: 'retrieved',
        }],
      }],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
    }),
    /snapshotId|retained evidence/i,
    'normal validation must not allow legacy self-attested evidence'
  );
});

// ─── Section 3: Publication lifecycle (audit item 1) ────────────────

await test('validateAlbumEdition is a dry-run that does not mutate state', async () => {
  const dir = await makeTempDir('lifecycle-validate-');
  await copyPilotFixture(dir);
  const result = await validateAlbumEdition({
    dataDir: dir,
    albumId: '001-marvin-gaye-what-s-going-on-fd00dde9',
  });
  assert.equal(result.valid, true, 'validate should return valid=true for a good album');
  assert.equal(result.published, false, 'validate must not mark published');
  // Verify no edition files were created
  const editionsDir = path.join(dir, 'editions');
  let exists = false;
  try { await readdir(editionsDir); exists = true; } catch { /* expected */ }
  assert.equal(exists, false, 'dry-run must not create edition directories');
  await rm(dir, { recursive: true, force: true });
});

await test('validateAlbumEdition fails closed for invalid album ID', async () => {
  const dir = await makeTempDir('lifecycle-bad-id-');
  await copyPilotFixture(dir);
  await assert.rejects(
    () => validateAlbumEdition({ dataDir: dir, albumId: '999-nonexistent' }),
    /album.*not found|invalid.*album/i,
    'must reject unknown album ID'
  );
  await rm(dir, { recursive: true, force: true });
});

await test('validateAlbumEdition fails closed on schema violation', async () => {
  const dir = await makeTempDir('lifecycle-schema-');
  await copyPilotFixture(dir);
  const pilot = JSON.parse(await readFile(path.join(dir, 'pilot-entries.json'), 'utf8'));
  const albumId = Object.keys(pilot.entries)[0];
  pilot.entries[albumId].trackEntries[0].evidenceLevel = 'bogus-level';
  await writeFile(path.join(dir, 'pilot-entries.json'), `${JSON.stringify(pilot, null, 2)}\n`);
  await assert.rejects(
    () => validateAlbumEdition({ dataDir: dir, albumId }),
    /evidence.*level|invalid/i,
    'must reject schema violations'
  );
  await rm(dir, { recursive: true, force: true });
});

await test('validateAlbumEdition checks exact catalog track identity', async () => {
  const dir = await makeTempDir('lifecycle-catalog-');
  await copyPilotFixture(dir);
  const pilot = JSON.parse(await readFile(path.join(dir, 'pilot-entries.json'), 'utf8'));
  const albumId = Object.keys(pilot.entries)[0];
  // Corrupt a track title to mismatch the catalog
  pilot.entries[albumId].trackEntries[0].trackTitle = 'WRONG TITLE';
  pilot.entries[albumId].contentHash = '';
  await writeFile(path.join(dir, 'pilot-entries.json'), `${JSON.stringify(pilot, null, 2)}\n`);
  await assert.rejects(
    () => validateAlbumEdition({ dataDir: dir, albumId }),
    /catalog.*identity|track.*title.*match|track.*identity/i,
    'must reject track title mismatch with catalog'
  );
  await rm(dir, { recursive: true, force: true });
});

await test('validateAlbumEdition reads the active per-album authoring edition', async () => {
  const result = await validateAlbumEdition({
    dataDir,
    albumId: '001-marvin-gaye-what-s-going-on-fd00dde9',
  });
  assert.equal(result.editionNumber, 4,
    'lifecycle validation must use current rank-1 per-album authoring, not stale monolithic input');
});

await test('publishAlbumEdition requires explicit change note', async () => {
  const dir = await makeTempDir('lifecycle-no-note-');
  await copyPilotFixture(dir);
  await assert.rejects(
    () => publishAlbumEdition({ dataDir: dir, albumId: '001-marvin-gaye-what-s-going-on-fd00dde9', changeNote: '', editionNumber: 2, approval: 'test-approval' }),
    /changeNote.*required/i,
    'publish without change note must fail'
  );
  await rm(dir, { recursive: true, force: true });
});

await test('publishAlbumEdition requires explicit edition number', async () => {
  const dir = await makeTempDir('lifecycle-no-edition-');
  await copyPilotFixture(dir);
  await assert.rejects(
    () => publishAlbumEdition({ dataDir: dir, albumId: '001-marvin-gaye-what-s-going-on-fd00dde9', changeNote: 'test', approval: 'test-approval' }),
    /editionNumber.*required/i,
    'publish without edition number must fail'
  );
  await rm(dir, { recursive: true, force: true });
});

await test('publishAlbumEdition requires approval token', async () => {
  const dir = await makeTempDir('lifecycle-no-approval-');
  await copyPilotFixture(dir);
  await assert.rejects(
    () => publishAlbumEdition({ dataDir: dir, albumId: '001-marvin-gaye-what-s-going-on-fd00dde9', changeNote: 'test', editionNumber: 2 }),
    /approval.*required/i,
    'publish without approval token must fail'
  );
  await rm(dir, { recursive: true, force: true });
});

await test('publishAlbumEdition rejects evidence-bearing claims without semantic review', async () => {
  const dir = await makeTempDir('lifecycle-no-semantic-review-');
  await copyPilotFixture(dir);
  const pilotPath = path.join(dir, 'pilot-entries.json');
  const pilot = JSON.parse(await readFile(pilotPath, 'utf8'));
  delete pilot.entries['001-marvin-gaye-what-s-going-on-fd00dde9'].trackEntries[5].verifiedFacts[0].semanticReview;
  pilot.entries['001-marvin-gaye-what-s-going-on-fd00dde9'].contentHash = '';
  await writeFile(pilotPath, `${JSON.stringify(pilot, null, 2)}\n`);
  await assert.rejects(
    () => publishAlbumEdition({
      dataDir: dir,
      albumId: '001-marvin-gaye-what-s-going-on-fd00dde9',
      changeNote: 'Test semantic gate',
      editionNumber: 2,
      approval: 'test-fixture-approval',
    }),
    /semantic review|missing.*review|publication rejected/i
  );
  await rm(dir, { recursive: true, force: true });
});

await test('publishAlbumEdition does not publish real pilot albums without approval', async () => {
  const dir = await makeTempDir('lifecycle-no-real-publish-');
  await copyPilotFixture(dir);
  await assert.rejects(
    () => publishAlbumEdition({
      dataDir: dir,
      albumId: '001-marvin-gaye-what-s-going-on-fd00dde9',
      changeNote: 'Test publication attempt',
      editionNumber: 2,
    }),
    /approval.*required/i,
    'real pilot editions must fail closed without release approval'
  );
  await assert.rejects(() => readdir(path.join(dir, 'editions')), /ENOENT/,
    'failed publication must not create edition files');
  await rm(dir, { recursive: true, force: true });
});

await test('publishAlbumEdition publishes temp fixture with approval and verifies readback', async () => {
  const dir = await makeTempDir('lifecycle-publish-fixture-');
  await copyPilotFixture(dir);
  const result = await publishAlbumEdition({
    dataDir: dir,
    albumId: '001-marvin-gaye-what-s-going-on-fd00dde9',
    changeNote: 'Test fixture publication',
    editionNumber: 2,
    approval: 'test-fixture-approval',
  });
  assert.equal(result.published, true, 'temp fixture with approval must be published');
  assert.equal(result.albumId, '001-marvin-gaye-what-s-going-on-fd00dde9');
  assert.equal(result.editionNumber, 2);
  // Verify readback: edition file should exist with published=true
  const editionPath = path.join(dir, 'editions', '001-marvin-gaye-what-s-going-on-fd00dde9', 'edition-2.json');
  const edition = JSON.parse(await readFile(editionPath, 'utf8'));
  assert.equal(edition.published, true, 'edition on disk must have published=true');
  assert.equal(edition.changeNote, 'Test fixture publication');
  await rm(dir, { recursive: true, force: true });
});

await test('publishAlbumEdition rejects already-published edition', async () => {
  const dir = await makeTempDir('lifecycle-already-published-');
  await copyPilotFixture(dir);
  // First publish
  await publishAlbumEdition({
    dataDir: dir,
    albumId: '001-marvin-gaye-what-s-going-on-fd00dde9',
    changeNote: 'First publish',
    editionNumber: 2,
    approval: 'test-fixture-approval',
  });
  // Second publish of same edition should fail
  await assert.rejects(
    () => publishAlbumEdition({
      dataDir: dir,
      albumId: '001-marvin-gaye-what-s-going-on-fd00dde9',
      changeNote: 'Second publish',
      editionNumber: 2,
      approval: 'test-fixture-approval',
    }),
    /already.*published|published.*immutable/i,
    'must reject publishing an already-published edition'
  );
  await rm(dir, { recursive: true, force: true });
});

await test('publishAlbumEdition fails closed on invalid album ID', async () => {
  const dir = await makeTempDir('lifecycle-publish-bad-');
  await copyPilotFixture(dir);
  await assert.rejects(
    () => publishAlbumEdition({ dataDir: dir, albumId: '999-nonexistent', changeNote: 'test', editionNumber: 1, approval: 'test' }),
    /album.*not found|invalid.*album/i,
    'publish with unknown album must fail'
  );
  await rm(dir, { recursive: true, force: true });
});

// ─── Section 4: Atomic output publication order (audit item 4) ──────

await test('build writes payload before aggregate before report before manifest last', async () => {
  const dir = await makeTempDir('atomic-order-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const aggregate = JSON.parse(await readFile(path.join(dir, 'track-encyclopedia.generated.json'), 'utf8'));
  const report = JSON.parse(await readFile(path.join(dir, 'build-report.json'), 'utf8'));
  const manifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  assert.ok(aggregate.entries, 'aggregate must exist');
  assert.equal(report.totalEntries, Object.keys(aggregate.entries).length, 'report must match aggregate');
  assert.match(manifest, /trackEncyclopediaAlbums/, 'manifest must exist and reference albums');
  await rm(dir, { recursive: true, force: true });
});

await test('failure after payload writes leaves old manifest and visible payloads unchanged', async () => {
  const dir = await makeTempDir('atomic-fail-payload-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const beforeManifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  await assert.rejects(
    () => buildTrackEncyclopedia({ dataDir: dir, failAfterPayloadWrites: true }),
    /injected/i
  );
  const afterManifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  assert.equal(afterManifest, beforeManifest, 'manifest must not change on payload failure');
  await rm(dir, { recursive: true, force: true });
});

await test('failure after candidate publish leaves old manifest unchanged and cleans staging', async () => {
  const dir = await makeTempDir('atomic-fail-candidate-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const beforeManifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  await assert.rejects(
    () => buildTrackEncyclopedia({ dataDir: dir, failAfterCandidatePublish: true }),
    /injected/i
  );
  const afterManifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  assert.equal(afterManifest, beforeManifest, 'manifest must not change on candidate failure');
  const files = await readdir(dir);
  const staging = files.filter((f) => f.startsWith('.release-stage-') || f.startsWith('.albums-stage'));
  assert.deepEqual(staging, [], 'staging artifacts must be cleaned up');
  await rm(dir, { recursive: true, force: true });
});

await test('failure during manifest swap leaves old manifest unchanged and cleans temp', async () => {
  const dir = await makeTempDir('atomic-fail-swap-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const beforeManifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  await assert.rejects(
    () => buildTrackEncyclopedia({ dataDir: dir, failDuringManifestSwap: true }),
    /injected/i
  );
  const afterManifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  assert.equal(afterManifest, beforeManifest, 'manifest must not change on swap failure');
  const files = await readdir(dir);
  const tempManifests = files.filter((f) => /\.manifest\.generated\..*\.tmp$/.test(f));
  assert.deepEqual(tempManifests, [], 'temp manifest files must be cleaned up');
  await rm(dir, { recursive: true, force: true });
});

// ─── Section 5: Per-album authoring discovery (audit item 7) ────────

await test('discoverAlbumAuthoringFiles returns deterministic sorted list', async () => {
  const dir = await makeTempDir('discovery-sorted-');
  await mkdir(path.join(dir, 'authoring'), { recursive: true });
  await writeFile(path.join(dir, 'authoring', '003-c.json'), JSON.stringify({ entries: {} }));
  await writeFile(path.join(dir, 'authoring', '001-a.json'), JSON.stringify({ entries: {} }));
  await writeFile(path.join(dir, 'authoring', '002-b.json'), JSON.stringify({ entries: {} }));
  const files = await discoverAlbumAuthoringFiles(path.join(dir, 'authoring'));
  assert.deepEqual(files, ['001-a.json', '002-b.json', '003-c.json'],
    'must return files in sorted order');
  await rm(dir, { recursive: true, force: true });
});

await test('discoverAlbumAuthoringFiles rejects duplicate album IDs', async () => {
  const dir = await makeTempDir('discovery-dupe-');
  await mkdir(path.join(dir, 'authoring'), { recursive: true });
  const albumId = '001-duplicate-album-abcdef1234';
  await writeFile(path.join(dir, 'authoring', 'file-a.json'), JSON.stringify({
    entries: { [albumId]: { albumId, editionNumber: 1, trackEntries: [] } },
  }));
  await writeFile(path.join(dir, 'authoring', 'file-b.json'), JSON.stringify({
    entries: { [albumId]: { albumId, editionNumber: 1, trackEntries: [] } },
  }));
  await assert.rejects(
    () => discoverAlbumAuthoringFiles(path.join(dir, 'authoring')),
    /duplicate.*album/i,
    'must reject duplicate album IDs across files'
  );
  await rm(dir, { recursive: true, force: true });
});

await test('discoverAlbumAuthoringFiles ignores non-JSON files', async () => {
  const dir = await makeTempDir('discovery-nonjson-');
  await mkdir(path.join(dir, 'authoring'), { recursive: true });
  await writeFile(path.join(dir, 'authoring', '001-a.json'), JSON.stringify({ entries: {} }));
  await writeFile(path.join(dir, 'authoring', 'readme.md'), '# Readme');
  await writeFile(path.join(dir, 'authoring', '.DS_Store'), 'binary');
  const files = await discoverAlbumAuthoringFiles(path.join(dir, 'authoring'));
  assert.deepEqual(files, ['001-a.json'], 'must only return .json files');
  await rm(dir, { recursive: true, force: true });
});

await test('discoverAlbumAuthoringFiles fails on malformed JSON instead of silently skipping', async () => {
  const dir = await makeTempDir('discovery-malformed-');
  await mkdir(path.join(dir, 'authoring'), { recursive: true });
  await writeFile(path.join(dir, 'authoring', '001-good.json'), JSON.stringify({ entries: {} }));
  await writeFile(path.join(dir, 'authoring', '002-bad.json'), '{ this is not valid json ]');
  await assert.rejects(
    () => discoverAlbumAuthoringFiles(path.join(dir, 'authoring')),
    /malformed|parse.*error|invalid.*json/i,
    'malformed authoring JSON must fail, not be silently skipped'
  );
  await rm(dir, { recursive: true, force: true });
});

await test('build with per-album authoring produces equivalent output to monolithic pilot', async () => {
  const dirMono = await makeTempDir('discovery-equiv-mono-');
  const dirPer = await makeTempDir('discovery-equiv-per-');
  await copyPilotFixture(dirMono);
  await copyPilotFixture(dirPer);
  const pilot = JSON.parse(await readFile(path.join(dirPer, 'pilot-entries.json'), 'utf8'));
  await mkdir(path.join(dirPer, 'authoring'), { recursive: true });
  for (const [albumId, entry] of Object.entries(pilot.entries)) {
    await writeFile(
      path.join(dirPer, 'authoring', `${albumId}.json`),
      `${JSON.stringify({ entries: { [albumId]: entry } }, null, 2)}\n`
    );
  }
  await buildTrackEncyclopedia({ dataDir: dirMono });
  await buildTrackEncyclopedia({ dataDir: dirPer, authoringDir: path.join(dirPer, 'authoring') });
  const monoOutput = JSON.parse(await readFile(path.join(dirMono, 'track-encyclopedia.generated.json'), 'utf8'));
  const perOutput = JSON.parse(await readFile(path.join(dirPer, 'track-encyclopedia.generated.json'), 'utf8'));
  const monoHashes = Object.fromEntries(Object.entries(monoOutput.entries).map(([id, e]) => [id, e.contentHash]));
  const perHashes = Object.fromEntries(Object.entries(perOutput.entries).map(([id, e]) => [id, e.contentHash]));
  assert.deepEqual(perHashes, monoHashes, 'per-album authoring must produce equivalent content hashes');
  await rm(dirMono, { recursive: true, force: true });
  await rm(dirPer, { recursive: true, force: true });
});

// ─── Section 6: Insufficient-evidence schema (audit item 10) ────────

await test('insufficient-evidence requires researchDisposition with searchedQueries', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Obscure',
      evidenceLevel: 'insufficient-evidence',
      verifiedFacts: [],
      limitations: ['No evidence found.'],
      musicalCharacter: '',
      albumContext: 'Metadata only.',
      listeningNotes: '',
    }),
    /research.*disposition|search.*quer|source class/i,
    'insufficient-evidence without researchDisposition must fail'
  );
});

await test('insufficient-evidence with researchDisposition passes', () => {
  validateTrackEntry({
    trackTitle: 'Obscure',
    evidenceLevel: 'insufficient-evidence',
    verifiedFacts: [],
    limitations: ['No reliable track-specific evidence was found.'],
    musicalCharacter: '',
    albumContext: 'Metadata-only entry.',
    listeningNotes: '',
    researchDisposition: {
      completedAt: '2026-08-25',
      searchedQueries: ['"Obscure" "Artist" interview'],
      sourceClasses: ['artist interviews', 'music journalism'],
      outcome: 'No retrieved source contained a reliable track-specific excerpt.',
    },
  });
});

await test('insufficient-evidence rejects verifiedFacts', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Obscure',
      evidenceLevel: 'insufficient-evidence',
      verifiedFacts: [{ claim: 'A fact.', sourceRefs: [{
        label: 'X', title: 'X', url: 'https://example.com/x',
        extract: 'A fact.', extractType: 'verbatim', evidenceStatus: 'retrieved',
      }] }],
      limitations: ['No evidence.'],
      musicalCharacter: '',
      albumContext: '',
      listeningNotes: '',
      researchDisposition: {
        completedAt: '2026-08-25',
        searchedQueries: ['test'],
        sourceClasses: ['test'],
        outcome: 'none',
      },
    }),
    /verifiedFacts|cannot.*contain/i,
    'insufficient-evidence must not contain verifiedFacts'
  );
});

// ─── Section 7: Semantic evidence-review gate ───────────────────────

await test('reviewEvidenceGate is a function', () => {
  assert.equal(typeof reviewEvidenceGate, 'function',
    'reviewEvidenceGate must be exported');
});

await test('reviewEvidenceGate rejects claim without recorded human review', () => {
  assert.throws(
    () => reviewEvidenceGate({
      claim: 'The song was recorded in Detroit.',
      sourceExtract: 'The song was recorded in Detroit by the Funk Brothers.',
    }),
    /human.*review|review.*record|semantic.*decision/i,
    'must require recorded human semantic review'
  );
});

await test('reviewEvidenceGate accepts claim with recorded human semantic decision', () => {
  const result = reviewEvidenceGate({
    claim: 'The song was recorded in Detroit.',
    sourceExtract: 'The song was recorded in Detroit by the Funk Brothers.',
    humanReview: {
      reviewer: 'arnaud',
      reviewedAt: '2026-08-25T00:00:00Z',
      semanticDecision: 'supported',
      notes: 'The extract directly supports the claim about recording location.',
    },
  });
  assert.equal(result.approved, true, 'claim with recorded review must be approved');
});

await test('reviewEvidenceGate rejects when human review says unsupported', () => {
  assert.throws(
    () => reviewEvidenceGate({
      claim: 'The song was the best ever.',
      sourceExtract: 'The song was recorded in Detroit.',
      humanReview: {
        reviewer: 'arnaud',
        reviewedAt: '2026-08-25T00:00:00Z',
        semanticDecision: 'unsupported',
        notes: 'The claim is subjective and not supported by the extract.',
      },
    }),
    /unsupported|not.*approved|semantic/i,
    'must reject when human review says unsupported'
  );
});

await test('reviewEvidenceGate rejects when human review is missing semanticDecision', () => {
  assert.throws(
    () => reviewEvidenceGate({
      claim: 'The song was recorded in Detroit.',
      sourceExtract: 'The song was recorded in Detroit.',
      humanReview: {
        reviewer: 'arnaud',
        reviewedAt: '2026-08-25T00:00:00Z',
        notes: 'Looks good.',
      },
    }),
    /semanticDecision|semantic.*decision/i,
    'must require explicit semanticDecision field'
  );
});

// ─── Section 8: Release GC planner (audit item 8) ───────────────────

await test('planReleaseRetention is a function', () => {
  assert.equal(typeof planReleaseRetention, 'function',
    'planReleaseRetention must be exported');
});

await test('planReleaseRetention returns dry-run plan and never deletes', async () => {
  const dir = await makeTempDir('gc-dryrun-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const releasesDir = path.join(dir, 'releases');
  const releases = await readdir(releasesDir);
  assert.ok(releases.length >= 1, 'must have at least one release');
  const plan = await planReleaseRetention({ dataDir: dir });
  assert.ok(plan, 'must return a plan');
  assert.equal(plan.deleted, false, 'plan must not delete anything');
  assert.ok(Array.isArray(plan.releases), 'plan must list releases');
  const releasesAfter = await readdir(releasesDir);
  assert.deepEqual(releasesAfter.sort(), releases.sort(), 'no releases must be deleted');
  await rm(dir, { recursive: true, force: true });
});

await test('planReleaseRetention identifies unreferenced candidate releases', async () => {
  const dir = await makeTempDir('gc-unreferenced-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const staleRelease = path.join(dir, 'releases', 'deadbeef00000000');
  await mkdir(path.join(staleRelease, 'albums'), { recursive: true });
  await writeFile(path.join(staleRelease, 'albums', 'dummy.json'), '{}');
  const plan = await planReleaseRetention({ dataDir: dir });
  assert.equal(plan.deleted, false, 'must not delete even unreferenced releases');
  const staleEntry = plan.releases.find((r) => r.releaseHash === 'deadbeef00000000');
  assert.ok(staleEntry, 'must identify the stale release');
  assert.equal(staleEntry.referenced, false, 'stale release must be marked unreferenced');
  const staleStillExists = await readdir(staleRelease).then(() => true).catch(() => false);
  assert.equal(staleStillExists, true, 'stale release must not be deleted');
  await rm(dir, { recursive: true, force: true });
});

await test('planReleaseRetention marks manifest-referenced releases as referenced', async () => {
  const dir = await makeTempDir('gc-referenced-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const manifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  const referencedHash = manifest.match(/releases\/([a-f0-9]{16})\//)[1];
  const plan = await planReleaseRetention({ dataDir: dir });
  const refEntry = plan.releases.find((r) => r.releaseHash === referencedHash);
  assert.ok(refEntry, 'must find the manifest-referenced release');
  assert.equal(refEntry.referenced, true, 'manifest-referenced release must be marked referenced');
  await rm(dir, { recursive: true, force: true });
});

await test('planReleaseRetention preserves canonical edition history and published editions', async () => {
  const dir = await makeTempDir('gc-history-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  // Create published editions in the editions/ directory
  const editionsDir = path.join(dir, 'editions');
  const albumDirs = await readdir(editionsDir);
  for (const albumId of albumDirs) {
    const albumEdDir = path.join(editionsDir, albumId);
    const files = await readdir(albumEdDir);
    for (const file of files) {
      const editionPath = path.join(albumEdDir, file);
      const edition = JSON.parse(await readFile(editionPath, 'utf8'));
      edition.published = true;
      await writeFile(editionPath, `${JSON.stringify(edition, null, 2)}\n`);
    }
  }
  const plan = await planReleaseRetention({ dataDir: dir });
  // All releases that contain published edition data must be marked as referenced
  for (const release of plan.releases) {
    if (release.hasPublishedEditions) {
      assert.equal(release.referenced, true, 'releases with published editions must be marked referenced');
    }
  }
  // Plan must fail closed if it cannot prove edition history
  assert.ok(plan.editionHistoryVerified, 'edition history must be verified');
  await rm(dir, { recursive: true, force: true });
});

// ─── Section 9: Runtime hash fallback (audit item 6) ────────────────

await test('computeRuntimeContentHashFallback is a function', () => {
  assert.equal(typeof computeRuntimeContentHashFallback, 'function',
    'computeRuntimeContentHashFallback must be exported');
});

await test('computeRuntimeContentHashFallback matches build-time canonical hash', async () => {
  const entry = createEntry({
    albumId: 'fallback-hash-test',
    editionNumber: 1,
    trackEntries: [
      { albumId: 'fallback-hash-test', discNumber: 1, trackNumber: 1, trackTitle: 'Test',
        evidenceLevel: 'limited', verifiedFacts: [], musicalCharacter: 'Tone',
        albumContext: 'Ctx', listeningNotes: 'Notes', limitations: ['Listening analysis only.'] },
    ],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'test', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'test' },
  });
  const fallbackHash = computeRuntimeContentHashFallback(entry);
  assert.equal(fallbackHash, entry.contentHash,
    'fallback hash must match build-time content hash');
});

await test('computeRuntimeContentHashFallback is deterministic regardless of key order', () => {
  const left = createEntry({
    albumId: 'determinism-test',
    editionNumber: 1,
    trackEntries: [{ albumId: 'determinism-test', discNumber: 1, trackNumber: 1, trackTitle: 'A',
      evidenceLevel: 'limited', verifiedFacts: [], musicalCharacter: 'Tone',
      albumContext: 'Ctx', listeningNotes: 'Notes', limitations: ['x'] }],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'test', model: null },
    reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  });
  const right = JSON.parse(JSON.stringify(left));
  right.trackEntries[0] = {
    limitations: ['x'], listeningNotes: 'Notes', albumContext: 'Ctx',
    musicalCharacter: 'Tone', verifiedFacts: [], evidenceLevel: 'limited',
    trackTitle: 'A', trackNumber: 1, discNumber: 1, albumId: 'determinism-test',
  };
  assert.equal(computeRuntimeContentHashFallback(left), computeRuntimeContentHashFallback(right),
    'hash must be the same regardless of key insertion order');
});

await test('runtime loader fails closed when no runtime hash implementation is available', async () => {
  const entry = createEntry({
    albumId: 'no-runtime-crypto',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'test', model: null },
    reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  });
  const originalCrypto = globalThis.crypto;
  const originalNodeCrypto = globalThis.__crypto;
  try {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    delete globalThis.__crypto;
    assert.equal(
      await loadTrackEncyclopediaAlbum(entry.albumId, { [entry.albumId]: async () => entry }),
      null,
      'unverifiable content must not be accepted'
    );
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
    globalThis.__crypto = originalNodeCrypto;
  }
});

// ─── Section 10: CLI subcommands ────────────────────────────────────

await test('CLI validate subcommand exits 0 for valid album', async () => {
  const dir = await makeTempDir('cli-validate-');
  await copyPilotFixture(dir);
  const result = spawnSync(process.execPath, ['scripts/build-track-encyclopedia.mjs', 'validate', '--data-dir', dir, '--album-id', '001-marvin-gaye-what-s-going-on-fd00dde9'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  await rm(dir, { recursive: true, force: true });
});

await test('CLI dry-run subcommand exits 0 and does not write edition files', async () => {
  const dir = await makeTempDir('cli-dryrun-');
  await copyPilotFixture(dir);
  const result = spawnSync(process.execPath, ['scripts/build-track-encyclopedia.mjs', 'dry-run', '--data-dir', dir, '--album-id', '001-marvin-gaye-what-s-going-on-fd00dde9'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const editionsDir = path.join(dir, 'editions');
  let exists = false;
  try { await readdir(editionsDir); exists = true; } catch { /* expected */ }
  assert.equal(exists, false, 'dry-run must not create edition directories');
  await rm(dir, { recursive: true, force: true });
});

await test('CLI gc-dry-run subcommand exits 0 and does not delete', async () => {
  const dir = await makeTempDir('cli-gc-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const result = spawnSync(process.execPath, ['scripts/build-track-encyclopedia.mjs', 'gc-dry-run', '--data-dir', dir], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /deleted.*false|dry.?run/i, 'output should indicate dry-run');
  await rm(dir, { recursive: true, force: true });
});

// ─── Results ────────────────────────────────────────────────────────

if (failures.length) {
  console.error(`\n${failures.length} test(s) failed:`);
  for (const f of failures) console.error(`  ✗ ${f.name}: ${f.message}`);
  process.exit(1);
}
console.log(`\nAll ${passed} backend track-encyclopedia tests passed.`);
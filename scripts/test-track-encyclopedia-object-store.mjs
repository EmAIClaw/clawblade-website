// Focused TDD regression tests for deduplicated generated track-encyclopedia storage.
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildTrackEncyclopedia } from './build-track-encyclopedia.mjs';
import { planReleaseRetention } from '../src/track-encyclopedia/release-gc.mjs';

const root = process.cwd();
const sourceDataDir = path.join(root, 'src/data/track-encyclopedia');
const catalogPath = path.join(root, 'src/data/catalog.generated.json');
const failures = [];
let passed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push({ name, message: error.message });
    console.error(`  ✗ ${name}: ${error.message}`);
  }
}

async function makeFixture(prefix = 'track-objects-') {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  await cp(path.join(sourceDataDir, 'pilot-entries.json'), path.join(dir, 'pilot-entries.json'));
  await cp(path.join(sourceDataDir, 'evidence-snapshots.json'), path.join(dir, 'evidence-snapshots.json'));
  await cp(catalogPath, path.join(dir, 'catalog.generated.json'));
  const pilotPath = path.join(dir, 'pilot-entries.json');
  const pilot = JSON.parse(await readFile(pilotPath, 'utf8'));
  for (const entry of Object.values(pilot.entries)) {
    for (const track of entry.trackEntries ?? []) {
      // Object-store tests isolate storage behavior; provenance is covered by
      // its own suite. Do not forge review approval for mutable fixtures.
      track.evidenceLevel = 'unresearched';
      track.verifiedFacts = [];
      track.sourceRefs = [];
      if (!track.limitations?.length) {
        track.limitations = ['Test fixture intentionally omits researched claims.'];
      }
    }
    entry.contentHash = '';
  }
  await writeFile(pilotPath, `${JSON.stringify(pilot, null, 2)}\n`);
  return dir;
}

async function objectFiles(dir) {
  try {
    return (await readdir(path.join(dir, 'objects', 'albums'))).filter((name) => name.endsWith('.json')).sort();
  } catch {
    return [];
  }
}

async function manifestObjectPaths(dir) {
  const manifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  return [...manifest.matchAll(/\.\/objects\/albums\/([a-f0-9]{64}\.json)/g)]
    .map((match) => path.join(dir, 'objects', 'albums', match[1]));
}

async function assertManifestUsable(dir, expectedManifest) {
  const manifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  assert.equal(manifest, expectedManifest, 'old manifest must remain the runtime commit point');
  const paths = await manifestObjectPaths(dir);
  assert.ok(paths.length > 0, 'manifest must resolve immutable object paths');
  for (const objectPath of paths) {
    const payload = JSON.parse(await readFile(objectPath, 'utf8'));
    assert.match(payload.contentHash, /^[a-f0-9]{16}$/);
  }
}

async function mutateOneDraft(dir, suffix) {
  const pilotPath = path.join(dir, 'pilot-entries.json');
  const pilot = JSON.parse(await readFile(pilotPath, 'utf8'));
  const albumId = Object.keys(pilot.entries).sort()[0];
  const entry = pilot.entries[albumId];
  const track = entry.trackEntries[0];
  track.limitations = [...(track.limitations ?? []), suffix];
  entry.editionNumber += 1;
  entry.changeNote = `Test-only ${suffix}`;
  entry.contentHash = '';
  await writeFile(pilotPath, `${JSON.stringify(pilot, null, 2)}\n`);
  return albumId;
}

await test('unchanged builds reuse one immutable object per album and add zero files', async () => {
  const dir = await makeFixture();
  await buildTrackEncyclopedia({ dataDir: dir });
  const firstObjects = await objectFiles(dir);
  const firstBytes = await Promise.all(firstObjects.map((name) => readFile(path.join(dir, 'objects', 'albums', name))));
  await buildTrackEncyclopedia({ dataDir: dir });
  const secondObjects = await objectFiles(dir);
  const secondBytes = await Promise.all(secondObjects.map((name) => readFile(path.join(dir, 'objects', 'albums', name))));
  assert.equal(firstObjects.length, 3, 'three unchanged albums need exactly three immutable objects');
  assert.deepEqual(secondObjects, firstObjects, 'unchanged build must add zero object files');
  assert.deepEqual(secondBytes, firstBytes, 'unchanged object bytes must remain identical');
  await rm(dir, { recursive: true, force: true });
});

await test('equivalent payload key order resolves to the same immutable object names', async () => {
  const left = await makeFixture('track-canonical-left-');
  const right = await makeFixture('track-canonical-right-');
  const rightPath = path.join(right, 'pilot-entries.json');
  const pilot = JSON.parse(await readFile(rightPath, 'utf8'));
  pilot.entries = Object.fromEntries(Object.entries(pilot.entries).map(([albumId, entry]) => [
    albumId,
    Object.fromEntries(Object.entries(entry).reverse()),
  ]));
  await writeFile(rightPath, `${JSON.stringify(pilot, null, 2)}\n`);
  await buildTrackEncyclopedia({ dataDir: left });
  await buildTrackEncyclopedia({ dataDir: right });
  assert.deepEqual(await objectFiles(right), await objectFiles(left), 'JSON insertion order must not create duplicate immutable content');
  await rm(left, { recursive: true, force: true });
  await rm(right, { recursive: true, force: true });
});

await test('changing one album adds only that album immutable object', async () => {
  const dir = await makeFixture();
  await buildTrackEncyclopedia({ dataDir: dir });
  const before = await objectFiles(dir);
  await mutateOneDraft(dir, 'single album object change');
  await buildTrackEncyclopedia({ dataDir: dir });
  const after = await objectFiles(dir);
  assert.equal(after.length - before.length, 1, 'one changed album must add exactly one object');
  assert.equal(before.filter((name) => after.includes(name)).length, before.length, 'all old objects remain immutable and recoverable');
  await rm(dir, { recursive: true, force: true });
});

await test('manifest imports immutable objects directly and new releases stay lightweight', async () => {
  const dir = await makeFixture();
  await buildTrackEncyclopedia({ dataDir: dir });
  const manifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  assert.doesNotMatch(manifest, /\.\/releases\/[a-f0-9]{16}\/albums\//, 'manifest must not load copied release albums');
  assert.equal((manifest.match(/\.\/objects\/albums\/[a-f0-9]{64}\.json/g) ?? []).length, 3);
  const releaseHash = manifest.match(/releaseHash: "([a-f0-9]{16})"/)[1];
  const releaseFiles = await readdir(path.join(dir, 'releases', releaseHash), { recursive: true });
  assert.deepEqual(releaseFiles.sort(), ['release.json'], 'new release contains identity metadata only');
  await rm(dir, { recursive: true, force: true });
});

await test('immutable object collision is verified and fails closed without replacing the manifest', async () => {
  const dir = await makeFixture();
  await buildTrackEncyclopedia({ dataDir: dir });
  const manifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  const [objectName] = await objectFiles(dir);
  await writeFile(path.join(dir, 'objects', 'albums', objectName), '{}\n');
  await assert.rejects(() => buildTrackEncyclopedia({ dataDir: dir }), /collision|immutable object|content.*mismatch/i);
  assert.equal(await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8'), manifest);
  await rm(dir, { recursive: true, force: true });
});

for (const [boundary, option] of [
  ['object publication', 'failAfterObjectWrites'],
  ['release identity publication', 'failAfterCandidatePublish'],
  ['aggregate publication', 'failAfterAggregateWrite'],
  ['report publication', 'failAfterReportWrite'],
  ['manifest swap', 'failDuringManifestSwap'],
]) {
  await test(`failure after ${boundary} leaves the old manifest usable`, async () => {
    const dir = await makeFixture(`track-failure-${option}-`);
    await buildTrackEncyclopedia({ dataDir: dir });
    const manifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
    await mutateOneDraft(dir, option);
    await assert.rejects(() => buildTrackEncyclopedia({ dataDir: dir, [option]: true }), /injected/i);
    await assertManifestUsable(dir, manifest);
    await rm(dir, { recursive: true, force: true });
  });
}

await test('incremental completion growth is linear rather than quadratic', async () => {
  const dir = await makeFixture('track-linear-growth-');
  const pilot = JSON.parse(await readFile(path.join(dir, 'pilot-entries.json'), 'utf8'));
  const entries = Object.entries(pilot.entries).sort(([a], [b]) => a.localeCompare(b));
  const authoringDir = path.join(dir, 'authoring');
  await mkdir(authoringDir, { recursive: true });
  const observed = [];
  for (let index = 0; index < entries.length; index += 1) {
    const [albumId, entry] = entries[index];
    await writeFile(path.join(authoringDir, `${albumId}.json`), `${JSON.stringify({ entries: { [albumId]: entry } }, null, 2)}\n`);
    await buildTrackEncyclopedia({ dataDir: dir, authoringDir });
    observed.push((await objectFiles(dir)).length);
  }
  const n = entries.length;
  const quadraticReleaseCopies = n * (n + 1) / 2;
  assert.deepEqual(observed, [1, 2, 3], 'each completion adds one immutable album object');
  assert.equal(observed.at(-1), n, 'immutable object growth must be O(N)');
  assert.ok(observed.at(-1) < quadraticReleaseCopies, 'object count must not follow cumulative release copies');
  await rm(dir, { recursive: true, force: true });
});

await test('a pre-existing empty candidate release directory is repaired instead of misclassified as legacy', async () => {
  const dir = await makeFixture('track-empty-release-');
  await buildTrackEncyclopedia({ dataDir: dir });
  const manifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  const releaseHash = manifest.match(/releaseHash: "([a-f0-9]{16})"/)[1];
  await rm(path.join(dir, 'releases', releaseHash, 'release.json'));
  await buildTrackEncyclopedia({ dataDir: dir });
  const identity = JSON.parse(await readFile(path.join(dir, 'releases', releaseHash, 'release.json'), 'utf8'));
  assert.equal(identity.releaseHash, releaseHash);
  assert.equal(identity.storageModel, 'content-addressed-objects');
  await rm(dir, { recursive: true, force: true });
});

await test('GC dry-run reports legacy full releases and current immutable objects without deleting either', async () => {
  const dir = await makeFixture('track-gc-objects-');
  await mkdir(path.join(dir, 'releases', 'deadbeef00000000', 'albums'), { recursive: true });
  await writeFile(path.join(dir, 'releases', 'deadbeef00000000', 'albums', 'legacy.json'), '{}\n');
  await buildTrackEncyclopedia({ dataDir: dir });
  const beforeObjects = await objectFiles(dir);
  const plan = await planReleaseRetention({ dataDir: dir });
  assert.equal(plan.deleted, false);
  assert.ok(plan.releases.some((release) => release.releaseHash === 'deadbeef00000000' && release.storageModel === 'legacy-full'));
  assert.equal(plan.objects.length, beforeObjects.length);
  assert.ok(plan.objects.every((object) => object.referenced === true));
  assert.deepEqual(await objectFiles(dir), beforeObjects, 'GC planning remains dry-run only');
  await rm(dir, { recursive: true, force: true });
});

if (failures.length > 0) {
  console.error(`\n${failures.length} object-store test(s) failed; ${passed} passed.`);
  process.exit(1);
}
console.log(`\nAll ${passed} track-encyclopedia object-store tests passed.`);

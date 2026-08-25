// build-track-encyclopedia.mjs — Data-driven build/import for the versioned track encyclopedia.
// Reads JSON input, validates entries, preserves edition files, and writes per-album payload modules.

import { link, open, readFile, writeFile, mkdir, rm, rename, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalizeSourceUrl,
  detectBoilerplate,
  validateEntry,
  validateEvidenceSnapshot,
} from '../src/track-encyclopedia/validation.mjs';
import { EditionStore, computeContentHash } from '../src/track-encyclopedia/editions.mjs';
import { canonicalStringify } from '../src/track-encyclopedia/hash.mjs';
import { createHash } from 'node:crypto';

const defaultRoot = process.cwd();
const defaultDataDir = path.join(defaultRoot, 'src/data/track-encyclopedia');

export async function buildTrackEncyclopedia({
  dataDir = defaultDataDir,
  authoringDir = path.join(dataDir, 'authoring'),
  failAfterPayloadWrites = false,
  failAfterObjectWrites = false,
  failAfterCandidatePublish = false,
  failAfterAggregateWrite = false,
  failAfterReportWrite = false,
  failDuringManifestSwap = false,
} = {}) {
  const inputPath = path.join(dataDir, 'pilot-entries.json');
  const snapshotsPath = path.join(dataDir, 'evidence-snapshots.json');
  const outputPath = path.join(dataDir, 'track-encyclopedia.generated.json');
  const reportPath = path.join(dataDir, 'build-report.json');
  const manifestPath = path.join(dataDir, 'manifest.generated.ts');

  const allEntries = {};
  let data = null;
  try {
    data = JSON.parse(await readFile(inputPath, 'utf8'));
  } catch {
    // Keep the report deterministic even when the input cannot be read.
  }
  const generatedAt = deterministicGeneratedAt(data);
  const report = {
    generatedAt,
    inputFiles: [],
    totalEntries: 0,
    totalTracks: 0,
    evidenceLevelCounts: { documented: 0, contextual: 0, limited: 0, 'insufficient-evidence': 0, unresearched: 0 },
    boilerplateDetections: [],
    preservedPublishedEditions: [],
    errors: [],
  };

  await mkdir(dataDir, { recursive: true });
  const evidenceSnapshots = await readEvidenceSnapshots(snapshotsPath);
  const store = await EditionStore.openWithLegacyHistory(dataDir, { evidenceSnapshots });

  try {
    data ??= JSON.parse(await readFile(inputPath, 'utf8'));

    // Per-album authoring is an alternative input source, not an overlay on the
    // legacy monolith. This permits an equivalence migration without treating
    // the same album represented in both layouts as a duplicate.
    if (authoringDir) {
      const authoringFiles = await discoverAlbumAuthoringFiles(authoringDir);
      if (authoringFiles.length > 0) {
        data.entries = {};
        for (const file of authoringFiles) {
          const filePath = path.join(authoringDir, file);
          const fileData = JSON.parse(await readFile(filePath, 'utf8'));
          const entries = Object.entries(fileData.entries || {});
          report.inputFiles.push({ file: path.relative(dataDir, filePath), entries: entries.length });
          for (const [albumId, entry] of entries) {
            data.entries[albumId] = entry;
          }
        }
      }
    }

    if (report.inputFiles.length === 0) {
      report.inputFiles.push({ file: path.basename(inputPath), entries: Object.keys(data.entries || {}).length });
    }

    const catalogAlbums = await readCatalogAlbums(dataDir);

    for (const [albumId, rawEntry] of Object.entries(data.entries || {})) {
      try {
        const entry = normalizeEntry(albumId, rawEntry, evidenceSnapshots);
        validateCatalogIdentity(entry, catalogAlbums);
        preserveEdition(store, entry, report);

        const latest = store.getLatest(albumId) ?? entry;
        validateEntry(latest, { evidenceSnapshots });
        allEntries[albumId] = latest;

        const boilerplate = detectBoilerplate(latest.trackEntries.map((track) => ({
          trackTitle: track.trackTitle,
          guide: track.musicalCharacter || track.albumContext || track.listeningNotes,
        })));
        if (boilerplate.length > 0) {
          report.boilerplateDetections.push({ albumId, detections: boilerplate });
        }

        for (const track of latest.trackEntries) {
          report.evidenceLevelCounts[track.evidenceLevel] = (report.evidenceLevelCounts[track.evidenceLevel] || 0) + 1;
          report.totalTracks += 1;
        }
        report.totalEntries += 1;
      } catch (err) {
        report.errors.push({ albumId, message: err.message });
      }
    }
  } catch (err) {
    report.errors.push({ file: inputPath, message: err.message });
  }

  if (report.errors.length > 0) {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    return finishWithErrors(report);
  }

  const sortedEntries = Object.fromEntries(Object.entries(allEntries).sort(([a], [b]) => a.localeCompare(b)));
  const output = {
    metadata: {
      version: '1.0.0-pilot',
      generatedAt,
      albumCount: Object.keys(sortedEntries).length,
    },
    entries: sortedEntries,
  };

  await store.persistAll();
  await publishGeneratedOutputs({
    dataDir,
    outputPath,
    reportPath,
    manifestPath,
    output,
    report,
    sortedEntries,
    failAfterPayloadWrites,
    failAfterObjectWrites,
    failAfterCandidatePublish,
    failAfterAggregateWrite,
    failAfterReportWrite,
    failDuringManifestSwap,
  });

  console.log(`Track encyclopedia build: ${report.totalEntries} entries, ${report.totalTracks} tracks.`);
  console.log(`Evidence levels: ${JSON.stringify(report.evidenceLevelCounts)}`);
  if (report.boilerplateDetections.length > 0) {
    console.log(`Boilerplate detections: ${report.boilerplateDetections.length} album(s) flagged.`);
  }
  return { output, report };
}

function normalizeEntry(albumId, rawEntry, evidenceSnapshots) {
  const entry = deepClone(rawEntry);
  entry.albumId = entry.albumId || albumId;
  if (entry.albumId !== albumId) {
    throw new Error(`Entry albumId "${entry.albumId}" does not match key "${albumId}".`);
  }
  const expectedHash = computeContentHash(entry);
  if (!entry.contentHash) {
    entry.contentHash = expectedHash;
  } else if (entry.contentHash !== expectedHash) {
    throw new Error(`contentHash mismatch for ${albumId}: supplied stale hash "${entry.contentHash}", expected "${expectedHash}".`);
  }
  validateEntry(entry, { evidenceSnapshots });
  return entry;
}

async function readEvidenceSnapshots(snapshotsPath) {
  let data;
  try {
    data = JSON.parse(await readFile(snapshotsPath, 'utf8'));
  } catch {
    return {};
  }
  const snapshots = {};
  for (const [id, rawSnapshot] of Object.entries(data.snapshots ?? {})) {
    const snapshot = { ...rawSnapshot };
    if (snapshot.id !== id) {
      throw new Error(`Evidence snapshot key "${id}" does not match internal id "${snapshot.id ?? ''}".`);
    }
    if (snapshot.canonicalUrl) {
      snapshot.canonicalUrl = canonicalizeSourceUrl(snapshot.canonicalUrl);
    }
    validateEvidenceSnapshot(snapshot);
    snapshots[id] = snapshot;
  }
  return snapshots;
}

async function readActiveAuthoringData(dataDir) {
  const inputPath = path.join(dataDir, 'pilot-entries.json');
  let data;
  try {
    data = JSON.parse(await readFile(inputPath, 'utf8'));
  } catch {
    throw new Error(`Cannot read pilot entries at "${inputPath}".`);
  }

  const authoringDir = path.join(dataDir, 'authoring');
  const authoringFiles = await discoverAlbumAuthoringFiles(authoringDir);
  if (authoringFiles.length === 0) return data;

  const entries = {};
  for (const file of authoringFiles) {
    const fileData = JSON.parse(await readFile(path.join(authoringDir, file), 'utf8'));
    for (const [albumId, entry] of Object.entries(fileData.entries ?? {})) {
      entries[albumId] = entry;
    }
  }
  return { ...data, entries };
}

function preserveEdition(store, entry, report) {
  const existing = store.getEdition(entry.albumId, entry.editionNumber);
  if (!existing) {
    const latest = store.getLatest(entry.albumId);
    if (latest && entry.editionNumber !== latest.editionNumber + 1) {
      throw new Error(`Entry ${entry.albumId} declares edition ${entry.editionNumber}; expected explicit next edition ${latest.editionNumber + 1}.`);
    }
    if (latest && (!entry.changeNote || entry.changeNote.trim() === '' || entry.changeNote === `Edition ${entry.editionNumber}`)) {
      throw new Error(`Entry ${entry.albumId} declares a new edition; supply a specific changeNote.`);
    }
    store.upsert(entry);
    return;
  }
  if (existing.contentHash === entry.contentHash) {
    if (existing.published) {
      report.preservedPublishedEditions.push({ albumId: entry.albumId, editionNumber: existing.editionNumber });
    }
    return;
  }
  if (existing.published) {
    throw new Error(`Source content changed for already-published ${entry.albumId} edition ${entry.editionNumber}; increment editionNumber and supply changeNote.`);
  }
  store.replaceDraft(entry);
}

function buildManifestSource(metadata, entries, releaseHash) {
  const lines = [
    '// Generated by scripts/build-track-encyclopedia.mjs. Do not edit by hand.',
    'import type { TrackEncyclopediaAlbumEntry } from "../../types";',
    '',
    `export const trackEncyclopediaMetadata = ${JSON.stringify(metadata, null, 2)} as const;`,
    '',
    'export const trackEncyclopediaAlbums = {',
  ];
  for (const [albumId, entry] of Object.entries(entries)) {
    const objectHash = computeObjectHash(entry);
    lines.push(`  ${JSON.stringify(albumId)}: {`);
    lines.push(`    albumId: ${JSON.stringify(albumId)},`);
    lines.push(`    editionNumber: ${entry.editionNumber},`);
    lines.push(`    contentHash: ${JSON.stringify(entry.contentHash)},`);
    lines.push(`    objectHash: ${JSON.stringify(objectHash)},`);
    lines.push(`    trackCount: ${entry.trackEntries.length},`);
    lines.push(`    releaseHash: ${JSON.stringify(releaseHash)},`);
    lines.push(`    editionPath: ${JSON.stringify(`objects/albums/${objectHash}.json`)},`);
    const albumPath = `./objects/albums/${objectHash}.json`;
    lines.push(`    load: async () => { const response = await fetch(new URL(${JSON.stringify(albumPath)}, import.meta.url), { cache: "no-store" }); if (!response.ok) throw new Error(\`Track encyclopedia request failed: \${response.status}\`); return (await response.json()) as TrackEncyclopediaAlbumEntry; },`);
    lines.push('  },');
  }
  lines.push('} as const;');
  lines.push('');
  lines.push('export type TrackEncyclopediaAlbumId = keyof typeof trackEncyclopediaAlbums;');
  return `${lines.join('\n')}\n`;
}

function finishWithErrors(report) {
  console.error(`Errors: ${report.errors.length}`);
  for (const err of report.errors) console.error(`  - ${err.albumId || err.file}: ${err.message}`);
  const details = report.errors.map((err) => `${err.albumId || err.file}: ${err.message}`).join('; ');
  const error = new Error(`Track encyclopedia build failed with ${report.errors.length} error(s): ${details}`);
  error.report = report;
  throw error;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deterministicGeneratedAt(data) {
  if (data?.metadata?.generatedAt && typeof data.metadata.generatedAt === 'string' && data.metadata.generatedAt.trim() !== '') {
    return data.metadata.generatedAt;
  }
  const generatedAts = Object.values(data?.entries ?? {})
    .map((entry) => entry?.generationMetadata?.generatedAt)
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .sort();
  return generatedAts[0] ?? '1970-01-01T00:00:00Z';
}

async function publishGeneratedOutputs({
  dataDir,
  outputPath,
  reportPath,
  manifestPath,
  output,
  report,
  sortedEntries,
  failAfterPayloadWrites,
  failAfterObjectWrites,
  failAfterCandidatePublish,
  failAfterAggregateWrite,
  failAfterReportWrite,
  failDuringManifestSwap,
}) {
  const releaseHash = computeReleaseHash(output);
  const releasesDir = path.join(dataDir, 'releases');
  const releaseDir = path.join(releasesDir, releaseHash);
  const objectsDir = path.join(dataDir, 'objects', 'albums');
  const manifestTempPath = `${manifestPath}.${releaseHash}.tmp`;
  try {
    for (const [albumId, entry] of Object.entries(sortedEntries)) {
      await writeImmutableAlbumObject(objectsDir, albumId, entry);
    }

    if (failAfterPayloadWrites || failAfterObjectWrites) {
      throw new Error('Injected failure after immutable object writes.');
    }

    await validateImmutableObjects(objectsDir, sortedEntries);
    await mkdir(releasesDir, { recursive: true });
    await publishReleaseIdentity(releaseDir, buildReleaseIdentity(output.metadata, sortedEntries, releaseHash));

    if (failAfterCandidatePublish) {
      throw new Error('Injected failure after immutable release identity publication.');
    }

    await writeJsonAtomic(outputPath, output);
    if (failAfterAggregateWrite) {
      throw new Error('Injected failure after aggregate publication.');
    }

    await writeJsonAtomic(reportPath, report);
    if (failAfterReportWrite) {
      throw new Error('Injected failure after report publication.');
    }

    await writeTextAtomic(manifestTempPath, buildManifestSource(output.metadata, sortedEntries, releaseHash));
    if (failDuringManifestSwap) {
      throw new Error('Injected failure during manifest pointer swap.');
    }
    await rename(manifestTempPath, manifestPath);
    await fsyncDirectory(dataDir);
  } finally {
    await rm(manifestTempPath, { force: true });
  }
}

function computeReleaseHash(output) {
  return createHash('sha256')
    .update(canonicalStringify(output))
    .digest('hex')
    .slice(0, 16);
}

function buildReleaseIdentity(metadata, sortedEntries, releaseHash) {
  return {
    schemaVersion: 2,
    storageModel: 'content-addressed-objects',
    releaseHash,
    metadata,
    albums: Object.fromEntries(Object.entries(sortedEntries).map(([albumId, entry]) => [albumId, {
      editionNumber: entry.editionNumber,
      contentHash: entry.contentHash,
      objectHash: computeObjectHash(entry),
      objectPath: `objects/albums/${computeObjectHash(entry)}.json`,
    }])),
  };
}

async function validateImmutableObjects(objectsDir, sortedEntries) {
  for (const [albumId, expected] of Object.entries(sortedEntries)) {
    const objectHash = computeObjectHash(expected);
    const albumPath = immutableAlbumObjectPath(objectsDir, objectHash);
    const entry = JSON.parse(await readFile(albumPath, 'utf8'));
    if (computeObjectHash(entry) !== objectHash || entry.contentHash !== expected.contentHash || computeContentHash(entry) !== expected.contentHash || entry.albumId !== albumId) {
      throw new Error(`Immutable object validation failed for ${albumId}.`);
    }
  }
}

async function publishReleaseIdentity(releaseDir, identity) {
  let created = false;
  try {
    await mkdir(releaseDir);
    created = true;
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
  }
  const releasePath = path.join(releaseDir, 'release.json');
  if (!created) {
    try {
      await readFile(releasePath, 'utf8');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      const children = await readdir(releaseDir);
      const legacyMarkers = new Set(['albums', 'editions', 'track-encyclopedia.generated.json', 'build-report.json']);
      if (children.some((child) => legacyMarkers.has(child))) {
        return; // Preserve a matching legacy full release untouched.
      }
      if (children.length > 0) {
        throw new Error(`Cannot publish release identity into unrecognized non-empty directory ${releaseDir}.`);
      }
    }
  }
  await writeJsonNewOnlyVerified(releasePath, identity, 'release identity');
}

function immutableAlbumObjectPath(objectsDir, objectHash) {
  if (!/^[a-f0-9]{64}$/.test(objectHash)) {
    throw new Error(`Unsafe immutable object hash rejected: ${objectHash}`);
  }
  return path.join(objectsDir, `${objectHash}.json`);
}

async function writeImmutableAlbumObject(objectsDir, albumId, entry) {
  if (entry.albumId !== albumId || computeContentHash(entry) !== entry.contentHash) {
    throw new Error(`Cannot publish invalid immutable object for ${albumId}.`);
  }
  const objectHash = computeObjectHash(entry);
  const objectPath = immutableAlbumObjectPath(objectsDir, objectHash);
  await writeTextNewOnlyVerified(objectPath, serializeImmutableObject(entry), `immutable object ${objectHash}`);
}

function computeObjectHash(entry) {
  return createHash('sha256')
    .update(serializeImmutableObject(entry))
    .digest('hex');
}

function serializeImmutableObject(entry) {
  return `${canonicalStringify(entry)}\n`;
}

async function writeJsonNewOnlyVerified(filePath, value, label) {
  return await writeTextNewOnlyVerified(filePath, `${JSON.stringify(value, null, 2)}\n`, label);
}

async function writeTextNewOnlyVerified(filePath, text, label) {
  try {
    const existing = await readFile(filePath, 'utf8');
    if (existing === text) return false;
    throw new Error(`${label} collision at ${filePath}; existing bytes do not match.`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  const handle = await open(tempPath, 'wx');
  try {
    await handle.writeFile(text);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(tempPath, filePath);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const existing = await readFile(filePath, 'utf8');
    if (existing !== text) {
      throw new Error(`${label} collision at ${filePath}; concurrently created bytes do not match.`);
    }
    return false;
  } finally {
    await rm(tempPath, { force: true });
  }
  await fsyncDirectory(dir);
  return true;
}

async function writeJsonAtomic(filePath, value) {
  await writeTextAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeTextAtomic(filePath, text) {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  const handle = await open(tempPath, 'w');
  try {
    await handle.writeFile(text);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tempPath, filePath);
  await fsyncDirectory(dir);
}

async function fsyncDirectory(dir) {
  let handle;
  try {
    handle = await open(dir, 'r');
    await handle.sync();
  } catch {
    // Directory fsync is not available on every platform.
  } finally {
    await handle?.close();
  }
}

// ─── Per-album authoring discovery (audit item 7) ───────────────

/**
 * Discover and return a deterministic sorted list of JSON authoring files.
 * Rejects duplicate album IDs across discovered files.
 * Fails on malformed JSON instead of silently skipping.
 *
 * @param {string} authoringDir
 * @returns {Promise<string[]>}
 */
export async function discoverAlbumAuthoringFiles(authoringDir) {
  if (!authoringDir || typeof authoringDir !== 'string') {
    throw new Error('discoverAlbumAuthoringFiles requires an authoringDir path.');
  }
  let names;
  try {
    names = await readdir(authoringDir);
  } catch {
    return [];
  }
  const jsonFiles = names.filter((f) => f.endsWith('.json')).sort();
  // Check for duplicate album IDs across files — fail on malformed JSON
  const seenAlbumIds = new Map(); // albumId -> file
  for (const file of jsonFiles) {
    const filePath = path.join(authoringDir, file);
    let data;
    try {
      data = JSON.parse(await readFile(filePath, 'utf8'));
    } catch (err) {
      throw new Error(`Malformed authoring JSON in "${file}": ${err.message}`);
    }
    if (!data || typeof data !== 'object' || !data.entries) continue;
    for (const albumId of Object.keys(data.entries)) {
      if (seenAlbumIds.has(albumId)) {
        throw new Error(`Duplicate album ID "${albumId}" found in both "${seenAlbumIds.get(albumId)}" and "${file}".`);
      }
      seenAlbumIds.set(albumId, file);
    }
  }
  return jsonFiles;
}

// ─── Catalog identity checks (audit item 7) ─────────────────────

async function readCatalogAlbums(dataDir) {
  const candidates = [
    path.join(dataDir, 'catalog.generated.json'),
    path.resolve(dataDir, '..', 'catalog.generated.json'),
  ];
  for (const catalogPath of candidates) {
    try {
      const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
      return new Map(catalog.albums.map((album) => [album.id, album]));
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw new Error(`Cannot validate catalog identity from "${catalogPath}": ${error.message}`);
      }
    }
  }
  return null;
}

function validateCatalogIdentity(entry, catalogAlbums) {
  if (!catalogAlbums) return; // No catalog available — skip
  const album = catalogAlbums.get(entry.albumId);
  if (!album) {
    throw new Error(`Catalog identity check failed: album "${entry.albumId}" not found in catalog.`);
  }
  const catalogKeys = new Set(album.tracks.map((track) =>
    `${entry.albumId}::${track.discNumber ?? 1}::${track.trackNumber}::${track.title}`
  ));
  for (const track of entry.trackEntries) {
    const key = `${entry.albumId}::${track.discNumber ?? 1}::${track.trackNumber}::${track.trackTitle}`;
    if (!catalogKeys.has(key)) {
      throw new Error(`Catalog identity check failed: track "${track.trackTitle}" (disc ${track.discNumber}, track ${track.trackNumber}) does not match catalog for album "${entry.albumId}".`);
    }
  }
}

// ─── Semantic evidence-review gate wiring (audit item 1 + non-blocking) ──

/**
 * Check that every evidence-bearing claim in an entry carries or resolves
 * a recorded semantic review. Draft build may report pending reviews;
 * publication cannot pass on term overlap alone.
 *
 * @param {object} entry
 * @param {{ requireReview: boolean }} options
 * @returns {{ pendingReviews: number, missingReviews: string[] }}
 */
export function checkSemanticReviews(entry, { requireReview = false } = {}) {
  const missingReviews = [];
  let pendingReviews = 0;

  for (const track of entry.trackEntries ?? []) {
    for (const fact of track.verifiedFacts ?? []) {
      if (!fact.semanticReview) {
        if (requireReview) {
          missingReviews.push(`${track.trackTitle}: ${fact.claim.slice(0, 60)}`);
        } else {
          pendingReviews += 1;
        }
      } else {
        // Validate the semantic review structure
        const review = fact.semanticReview;
        const decision = review.semanticDecision ?? review.decision;
        if (!review.reviewer || !review.reviewedAt || !decision) {
          if (requireReview) {
            missingReviews.push(`${track.trackTitle}: incomplete semantic review for "${fact.claim.slice(0, 60)}"`);
          } else {
            pendingReviews += 1;
          }
        } else if (decision !== 'supported') {
          if (requireReview) {
            missingReviews.push(`${track.trackTitle}: semantic review not "supported" for "${fact.claim.slice(0, 60)}"`);
          } else {
            pendingReviews += 1;
          }
        }
      }
    }
  }

  if (requireReview && missingReviews.length > 0) {
    throw new Error(`Publication rejected: missing or incomplete semantic reviews for ${missingReviews.length} evidence-bearing claim(s): ${missingReviews.join('; ')}`);
  }

  return { pendingReviews, missingReviews };
}

// ─── Publication lifecycle (audit item 1) ───────────────────────

/**
 * Validate an album edition without mutating any state (dry-run).
 * Fails closed on invalid album ID, edition, schema, source snapshots,
 * hashes, or catalog alignment.
 *
 * @param {{ dataDir: string, albumId: string }} options
 * @returns {Promise<{ valid: boolean, published: false, albumId: string, editionNumber: number }>}
 */
export async function validateAlbumEdition({ dataDir, albumId } = {}) {
  if (!dataDir) throw new Error('validateAlbumEdition requires a dataDir option.');
  if (!albumId) throw new Error('validateAlbumEdition requires an albumId option.');

  const snapshotsPath = path.join(dataDir, 'evidence-snapshots.json');
  const data = await readActiveAuthoringData(dataDir);

  const rawEntry = data.entries?.[albumId];
  if (!rawEntry) {
    throw new Error(`Album ID "${albumId}" not found in pilot entries.`);
  }

  const evidenceSnapshots = await readEvidenceSnapshots(snapshotsPath);
  const entry = normalizeEntry(albumId, rawEntry, evidenceSnapshots);
  validateEntry(entry, { evidenceSnapshots });

  // Check exact catalog album/track identity
  const catalogAlbums = await readCatalogAlbums(dataDir);
  if (!catalogAlbums) {
    throw new Error(`Catalog identity check failed: catalog.generated.json was not found for data directory "${dataDir}".`);
  }
  validateCatalogIdentity(entry, catalogAlbums);

  return {
    valid: true,
    published: false, // Dry-run never marks published
    albumId: entry.albumId,
    editionNumber: entry.editionNumber,
  };
}

/**
 * Publish an album edition atomically.
 * Requires explicit edition number, change note, and approval token.
 * Fails closed on invalid album ID, edition, schema, source snapshots, hashes, or catalog alignment.
 * Rejects already-published editions.
 * Does NOT publish real pilot/catalog editions without release approval token.
 * Verifies readback after atomic write.
 *
 * Policy: No pilot/catalog edition is to be marked published without Arnaud's
 * release approval. The approval token is the explicit release approval.
 * "Published" here is a data lifecycle state, not permission to deploy the website.
 *
 * @param {{ dataDir: string, albumId: string, editionNumber: number, changeNote: string, approval?: string }} options
 * @returns {Promise<{ published: boolean, albumId: string, editionNumber: number, changeNote: string }>}
 */
export async function publishAlbumEdition({ dataDir, albumId, editionNumber, changeNote, approval } = {}) {
  if (!dataDir) throw new Error('publishAlbumEdition requires a dataDir option.');
  if (!albumId) throw new Error('publishAlbumEdition requires an albumId option.');
  if (editionNumber === undefined || editionNumber === null || !Number.isInteger(editionNumber) || editionNumber < 1) {
    throw new Error('publishAlbumEdition editionNumber is required and must be an integer >= 1.');
  }
  if (changeNote === undefined || changeNote === null || typeof changeNote !== 'string' || changeNote.trim() === '') {
    throw new Error('publishAlbumEdition changeNote is required.');
  }
  if (!approval || typeof approval !== 'string' || approval.trim() === '') {
    throw new Error('publishAlbumEdition approval token is required.');
  }

  const snapshotsPath = path.join(dataDir, 'evidence-snapshots.json');
  const data = await readActiveAuthoringData(dataDir);

  const rawEntry = data.entries?.[albumId];
  if (!rawEntry) {
    throw new Error(`Album ID "${albumId}" not found in pilot entries.`);
  }

  const evidenceSnapshots = await readEvidenceSnapshots(snapshotsPath);
  const entry = normalizeEntry(albumId, rawEntry, evidenceSnapshots);
  validateEntry(entry, { evidenceSnapshots });
  if (entry.editionNumber !== editionNumber) {
    throw new Error(`Edition number mismatch for ${albumId}: active authoring is edition ${entry.editionNumber}, requested ${editionNumber}.`);
  }

  // Check exact catalog album/track identity
  const catalogAlbums = await readCatalogAlbums(dataDir);
  if (!catalogAlbums) {
    throw new Error(`Catalog identity check failed: catalog.generated.json was not found for data directory "${dataDir}".`);
  }
  validateCatalogIdentity(entry, catalogAlbums);

  // Check semantic reviews for evidence-bearing claims at publish gate
  checkSemanticReviews(entry, { requireReview: true });

  // With approval: perform the atomic publication
  const store = await EditionStore.openWithLegacyHistory(dataDir, { evidenceSnapshots });

  // Check if this edition is already published
  const existing = store.getEdition(albumId, editionNumber);
  if (existing && existing.published) {
    throw new Error(`Edition ${editionNumber} for ${albumId} is already published; published editions are immutable. Create a new edition.`);
  }

  // Set published=true and upsert
  const publishedEntry = { ...entry, editionNumber, published: true, changeNote };
  publishedEntry.contentHash = computeContentHash(publishedEntry);

  if (existing && !existing.published) {
    store.replaceDraft(publishedEntry);
  } else if (!existing) {
    store.upsert(publishedEntry);
  }

  await store.persist(albumId, editionNumber);

  // Verify readback
  const readback = store.getEdition(albumId, editionNumber);
  if (!readback || !readback.published) {
    throw new Error(`Publication readback verification failed for ${albumId} edition ${editionNumber}.`);
  }

  return {
    published: true,
    albumId: publishedEntry.albumId,
    editionNumber,
    changeNote,
  };
}

// ─── CLI subcommands ─────────────────────────────────────────────

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  const [subcommand, ...args] = process.argv.slice(2);
  const opts = parseCliArgs(args);

  try {
    if (subcommand === 'validate' || subcommand === 'dry-run') {
      const result = await validateAlbumEdition({
        dataDir: opts.dataDir || defaultDataDir,
        albumId: opts.albumId,
      });
      console.log(`${subcommand === 'validate' ? 'Validate' : 'Dry-run'}: ${result.albumId} edition ${result.editionNumber} — valid=${result.valid}, published=${result.published}`);
      process.exit(0);
    }

    if (subcommand === 'publish') {
      const result = await publishAlbumEdition({
        dataDir: opts.dataDir || defaultDataDir,
        albumId: opts.albumId,
        editionNumber: opts.editionNumber ? Number(opts.editionNumber) : undefined,
        changeNote: opts.changeNote,
        approval: opts.approval,
      });
      console.log(`Publish: ${result.albumId} edition ${result.editionNumber} — published=${result.published}`);
      process.exit(0);
    }

    if (subcommand === 'gc-dry-run') {
      const { planReleaseRetention } = await import('../src/track-encyclopedia/release-gc.mjs');
      const plan = await planReleaseRetention({ dataDir: opts.dataDir || defaultDataDir });
      console.log(`GC dry-run: deleted=${plan.deleted}, releases=${plan.releases.length}`);
      for (const r of plan.releases) {
        console.log(`  ${r.releaseHash}: referenced=${r.referenced}`);
      }
      process.exit(0);
    }

    // Default: run the full build
    buildTrackEncyclopedia({ dataDir: opts.dataDir || defaultDataDir }).catch((error) => {
      if (!error.report) console.error(error);
      process.exit(1);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

function parseCliArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]
      ?.replace(/^--/, '')
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = args[i + 1];
    if (key) opts[key] = value;
  }
  return opts;
}

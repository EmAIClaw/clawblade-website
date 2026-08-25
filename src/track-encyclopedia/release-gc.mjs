// Dry-run-only retention planner for legacy full releases and content-addressed objects.
// This module never deletes. Malformed history makes reference verification fail closed.

import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export async function planReleaseRetention({ dataDir }) {
  if (!dataDir || typeof dataDir !== 'string') {
    throw new Error('planReleaseRetention requires a dataDir option.');
  }

  const releasesDir = path.join(dataDir, 'releases');
  const editionsDir = path.join(dataDir, 'editions');
  const objectsDir = path.join(dataDir, 'objects', 'albums');
  const manifestPath = path.join(dataDir, 'manifest.generated.ts');

  let manifestReleaseHash = null;
  const manifestObjectHashes = new Set();
  let objectReferencesVerified = true;
  try {
    const manifest = await readFile(manifestPath, 'utf8');
    manifestReleaseHash = manifest.match(/releaseHash:\s*"([a-f0-9]{16})"/)?.[1]
      ?? manifest.match(/releases\/([a-f0-9]{16})\//)?.[1]
      ?? null;
    for (const match of manifest.matchAll(/objects\/albums\/([a-f0-9]{64})\.json/g)) {
      manifestObjectHashes.add(match[1]);
    }
  } catch {
    objectReferencesVerified = false;
  }

  let editionHistoryVerified = true;
  try {
    const albumDirs = await readdir(editionsDir, { withFileTypes: true });
    for (const albumDir of albumDirs) {
      if (!albumDir.isDirectory()) continue;
      const files = await readdir(path.join(editionsDir, albumDir.name));
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          JSON.parse(await readFile(path.join(editionsDir, albumDir.name, file), 'utf8'));
        } catch {
          editionHistoryVerified = false;
        }
      }
    }
  } catch {
    editionHistoryVerified = false;
  }

  let releaseDirs = [];
  try {
    releaseDirs = await readdir(releasesDir, { withFileTypes: true });
  } catch {
    // No releases is a valid empty history.
  }

  const releaseObjectHashes = new Set();
  const releases = [];
  for (const entry of releaseDirs) {
    if (!entry.isDirectory() || !/^[a-f0-9]{16}$/.test(entry.name)) continue;
    const releasePath = path.join(releasesDir, entry.name);
    let storageModel = 'unknown';
    let hasPublishedEditions = false;
    let identityValid = false;

    try {
      const identity = JSON.parse(await readFile(path.join(releasePath, 'release.json'), 'utf8'));
      if (identity.schemaVersion !== 2 || identity.storageModel !== 'content-addressed-objects' || identity.releaseHash !== entry.name) {
        throw new Error('invalid release identity');
      }
      for (const album of Object.values(identity.albums ?? {})) {
        if (!/^[a-f0-9]{64}$/.test(album.objectHash)
          || album.objectPath !== `objects/albums/${album.objectHash}.json`) {
          throw new Error('invalid release object reference');
        }
        releaseObjectHashes.add(album.objectHash);
      }
      storageModel = 'content-addressed';
      identityValid = true;
    } catch (error) {
      if (error?.code !== 'ENOENT') objectReferencesVerified = false;
    }

    if (!identityValid) {
      let legacyShape = false;
      for (const child of ['albums', 'editions', 'track-encyclopedia.generated.json']) {
        try {
          await readdir(path.join(releasePath, child));
          legacyShape = true;
          break;
        } catch (error) {
          if (error?.code === 'ENOTDIR') {
            legacyShape = true;
            break;
          }
        }
      }
      if (legacyShape) storageModel = 'legacy-full';
    }

    if (storageModel === 'legacy-full') {
      try {
        const albumDirs = await readdir(path.join(releasePath, 'editions'), { withFileTypes: true });
        for (const albumDir of albumDirs) {
          if (!albumDir.isDirectory()) continue;
          const files = await readdir(path.join(releasePath, 'editions', albumDir.name));
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
              const edition = JSON.parse(await readFile(path.join(releasePath, 'editions', albumDir.name, file), 'utf8'));
              if (edition.published === true) hasPublishedEditions = true;
            } catch {
              hasPublishedEditions = true;
            }
          }
        }
      } catch {
        // Legacy releases may predate edition snapshots.
      }
    }

    releases.push({
      releaseHash: entry.name,
      referenced: entry.name === manifestReleaseHash || hasPublishedEditions,
      hasPublishedEditions,
      storageModel,
      path: releasePath,
    });
  }
  releases.sort((left, right) => left.releaseHash.localeCompare(right.releaseHash));

  const referencedObjectHashes = new Set([...manifestObjectHashes, ...releaseObjectHashes]);
  let objectEntries = [];
  try {
    objectEntries = await readdir(objectsDir, { withFileTypes: true });
  } catch {
    // Pre-migration repositories legitimately have no object directory.
  }
  const objects = [];
  for (const entry of objectEntries) {
    if (!entry.isFile() || !/^[a-f0-9]{64}\.json$/.test(entry.name)) continue;
    const objectHash = entry.name.slice(0, 64);
    let valid = true;
    try {
      const text = await readFile(path.join(objectsDir, entry.name), 'utf8');
      const payload = JSON.parse(text);
      valid = createHash('sha256').update(text).digest('hex') === objectHash
        && typeof payload.contentHash === 'string'
        && /^[a-f0-9]{16}$/.test(payload.contentHash);
    } catch {
      valid = false;
    }
    if (!valid) objectReferencesVerified = false;
    objects.push({
      objectHash,
      referenced: referencedObjectHashes.has(objectHash),
      valid,
      path: path.join(objectsDir, entry.name),
    });
  }
  objects.sort((left, right) => left.objectHash.localeCompare(right.objectHash));

  for (const hash of referencedObjectHashes) {
    if (!objects.some((object) => object.objectHash === hash && object.valid)) {
      objectReferencesVerified = false;
    }
  }

  return {
    deleted: false,
    releases,
    objects,
    editionHistoryVerified,
    objectReferencesVerified,
  };
}

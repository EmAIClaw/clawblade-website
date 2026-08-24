// editions.mjs — Versioned, immutable edition management for track-encyclopedia entries.
// Published editions cannot be overwritten; corrections create a new edition.

import { open, readFile, rename, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { validateEntry } from './validation.mjs';
import { computeTrackEncyclopediaContentHash } from './hash.mjs';

export function computeContentHash(entry) {
  return computeTrackEncyclopediaContentHash(entry);
}

export function createEntry({ albumId, editionNumber, trackEntries, generationMetadata, reviewMetadata, changeNote }) {
  const entry = {
    albumId,
    editionNumber,
    published: false,
    contentHash: '',
    changeNote: changeNote ?? `Edition ${editionNumber}`,
    trackEntries: trackEntries ?? [],
    generationMetadata: generationMetadata ?? { generatedAt: new Date().toISOString(), generator: 'unknown', model: null },
    reviewMetadata: reviewMetadata ?? { reviewedAt: null, reviewer: null, notes: '' },
  };
  entry.contentHash = computeContentHash(entry);
  return entry;
}

export class EditionStore {
  constructor(directory, { evidenceSnapshots = null, allowLegacyHistory = false } = {}) {
    this.directory = directory;
    this.evidenceSnapshots = evidenceSnapshots;
    this.allowLegacyHistory = allowLegacyHistory;
    this._cache = new Map(); // albumId -> Map(editionNumber -> entry)
  }

  static async open(directory, options = {}) {
    const store = new EditionStore(directory, options);
    await store.loadFromDisk();
    return store;
  }

  static async openWithLegacyHistory(directory, options = {}) {
    const store = new EditionStore(directory, { ...options, allowLegacyHistory: true });
    await store.loadFromDisk();
    return store;
  }

  _filePath(albumId, editionNumber) {
    assertSafeAlbumId(albumId);
    const root = path.resolve(this.directory, 'editions');
    const filePath = path.resolve(root, albumId, `edition-${editionNumber}.json`);
    if (!filePath.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Unsafe albumId rejected to prevent path traversal: ${albumId}`);
    }
    return filePath;
  }

  async loadFromDisk() {
    // Load all edition files from disk into cache
    const albumDirs = await readdirSafe(path.join(this.directory, 'editions'));
    for (const albumId of albumDirs) {
      assertSafeAlbumId(albumId);
      const editionFiles = await readdirSafe(path.join(this.directory, 'editions', albumId));
      for (const file of editionFiles) {
        const match = file.match(/^edition-(\d+)\.json$/);
        if (!match) continue;
        const editionNumber = Number(match[1]);
        const filePath = path.join(this.directory, 'editions', albumId, file);
        const data = JSON.parse(await readFile(filePath, 'utf8'));
        try {
          validateEntry(data, { evidenceSnapshots: this.evidenceSnapshots });
        } catch (error) {
          if (!this.allowLegacyHistory) throw error;
          validateEntry(data, {
            evidenceSnapshots: this.evidenceSnapshots,
            allowLegacySelfAttestedEvidence: true,
          });
        }
        if (!this._cache.has(albumId)) this._cache.set(albumId, new Map());
        this._cache.get(albumId).set(editionNumber, deepClone(data));
      }
    }
  }

  upsert(entry) {
    // Synchronous in-memory upsert — validates and stores
    if (!entry.albumId) throw new Error('Entry must have albumId.');
    assertSafeAlbumId(entry.albumId);
    if (typeof entry.editionNumber !== 'number' || entry.editionNumber < 1) {
      throw new Error('Entry must have editionNumber >= 1.');
    }

    if (!this._cache.has(entry.albumId)) {
      this._cache.set(entry.albumId, new Map());
    }
    const editions = this._cache.get(entry.albumId);

    // Check for duplicate edition number
    const existing = editions.get(entry.editionNumber);
    if (existing) {
      if (existing.published) {
        throw new Error(`Cannot overwrite published edition ${entry.editionNumber} for ${entry.albumId}. Published editions are immutable; create a new edition.`);
      }
      throw new Error(`Duplicate edition number ${entry.editionNumber} for ${entry.albumId}. Use a new edition number for corrections.`);
    }

    // Validate the entry
    validateEntry(entry, { evidenceSnapshots: this.evidenceSnapshots });

    editions.set(entry.editionNumber, deepClone(entry));
  }

  upsertNewEdition(entry) {
    return this.upsert(entry);
  }

  replaceDraft(entry) {
    assertSafeAlbumId(entry.albumId);
    validateEntry(entry, { evidenceSnapshots: this.evidenceSnapshots });
    const editions = this._cache.get(entry.albumId);
    const existing = editions?.get(entry.editionNumber);
    if (!existing) throw new Error(`No draft edition ${entry.editionNumber} exists for ${entry.albumId}.`);
    if (existing.published) {
      throw new Error(`Cannot replace published edition ${entry.editionNumber} for ${entry.albumId}.`);
    }
    editions.set(entry.editionNumber, deepClone(entry));
  }

  getLatest(albumId) {
    assertSafeAlbumId(albumId);
    const editions = this._cache.get(albumId);
    if (!editions || editions.size === 0) return null;
    let latest = null;
    for (const entry of editions.values()) {
      if (!latest || entry.editionNumber > latest.editionNumber) {
        latest = entry;
      }
    }
    return latest ? deepClone(latest) : null;
  }

  getEdition(albumId, editionNumber) {
    assertSafeAlbumId(albumId);
    const editions = this._cache.get(albumId);
    if (!editions) return null;
    const entry = editions.get(editionNumber) ?? null;
    return entry ? deepClone(entry) : null;
  }

  getAllAlbumIds() {
    return [...this._cache.keys()];
  }

  async persist(albumId, editionNumber) {
    const entry = this.getEdition(albumId, editionNumber);
    if (!entry) throw new Error(`No entry found for ${albumId} edition ${editionNumber}.`);
    const filePath = this._filePath(albumId, editionNumber);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeJsonNewOnly(filePath, entry);
  }

  async persistAll() {
    for (const [albumId, editions] of this._cache) {
      for (const [editionNumber] of editions) {
        await this.persist(albumId, editionNumber);
      }
    }
  }
}

function assertSafeAlbumId(albumId) {
  if (typeof albumId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(albumId)) {
    throw new Error(`albumId must be a safe path segment; path traversal is not allowed: ${albumId}`);
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function readdirSafe(dirPath) {
  try {
    const { readdir } = await import('node:fs/promises');
    return await readdir(dirPath);
  } catch {
    return [];
  }
}

async function writeJsonAtomic(filePath, value) {
  const dir = path.dirname(filePath);
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  const handle = await open(tempPath, 'w');
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tempPath, filePath);
  await fsyncDirectory(dir);
}

async function writeJsonNewOnly(filePath, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  try {
    const existing = await readFile(filePath, 'utf8');
    if (existing === text) return;
    throw new Error(`Cannot overwrite immutable edition file ${filePath}. Create a new edition instead.`);
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
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    if (error?.code === 'EEXIST') {
      const existing = await readFile(filePath, 'utf8');
      if (existing === text) return;
    }
    throw error;
  }
  await fsyncDirectory(dir);
}

async function fsyncDirectory(dir) {
  let handle;
  try {
    handle = await open(dir, 'r');
    await handle.sync();
  } catch {
    // Directory fsync is not supported on every platform used by contributors.
  } finally {
    await handle?.close();
  }
}

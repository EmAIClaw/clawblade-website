import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTrackEncyclopediaState } from '../src/track-encyclopedia/load-state.mjs';
import { computeContentHash } from '../src/track-encyclopedia/editions.mjs';

const goodEntry = {
  albumId: 'pilot',
  editionNumber: 1,
  published: false,
  contentHash: '0123456789abcdef',
  changeNote: 'test',
  trackEntries: [],
  generationMetadata: { generatedAt: '2026-08-25T00:00:00Z', generator: 'test', model: null },
  reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
};
goodEntry.contentHash = computeContentHash(goodEntry);

const loaded = await loadTrackEncyclopediaState('pilot', {
  pilot: async () => goodEntry,
});
assert.equal(loaded.status, 'loaded');
assert.equal(loaded.entry?.albumId, 'pilot');

const missing = await loadTrackEncyclopediaState('missing', {});
assert.deepEqual(missing, { albumId: 'missing', status: 'missing' });

const error = await loadTrackEncyclopediaState('broken', {
  broken: async () => { throw new Error('integrity mismatch'); },
});
assert.equal(error.status, 'error');
assert.match(error.message, /failed|integrity/i);

let attempts = 0;
const modules = {
  retry: async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('temporary failure');
    const entry = { ...goodEntry, albumId: 'retry', contentHash: '' };
    entry.contentHash = computeContentHash(entry);
    return entry;
  },
};
assert.equal((await loadTrackEncyclopediaState('retry', modules)).status, 'error');
assert.equal((await loadTrackEncyclopediaState('retry', modules)).status, 'loaded');
assert.equal(attempts, 2);

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
assert.match(appSource, /Evidence for this claim/);
assert.match(appSource, /Reference only — not evidence for a displayed claim/);
assert.match(appSource, /sourceEvidence--\$\{kind\}/);
assert.match(appSource, /kind=\"claim\"/);
assert.match(appSource, /kind=\"reference\"/);
assert.match(stylesSource, /\.sourceEvidence--claim/);
assert.match(stylesSource, /\.sourceEvidence--reference/);

console.log('All 5 track-encyclopedia UI state and evidence-label tests passed.');

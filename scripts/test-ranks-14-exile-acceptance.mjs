// Focused acceptance test for rank 14 — The Rolling Stones, Exile on Main St.
// Verifies the completed immutable unpublished edition 1: exact catalog identity
// against the committed 18-track baseline, all-documented evidence, supported
// independent review, and source-artifact binding.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'src/data/track-encyclopedia');
const ALBUM_ID = '014-the-rolling-stones-exile-on-main-st-9d89aa7d';

const authoring = JSON.parse(await readFile(path.join(dataDir, 'authoring', `${ALBUM_ID}.json`), 'utf8'));
const entry = authoring.entries[ALBUM_ID];
const catalog = JSON.parse(await readFile(path.join(process.cwd(), 'src/data/catalog.generated.json'), 'utf8'));
const album = catalog.albums.find((a) => a.id === ALBUM_ID);

assert.ok(entry, 'rank-14 authoring entry must exist');
assert.equal(entry.editionNumber, 1, 'rank-14 must be edition 1');
assert.equal(entry.published, false, 'rank-14 edition must remain unpublished');
assert.match(entry.contentHash ?? '', /^[a-f0-9]{16}$/, 'rank-14 must carry a semantic content hash');

// Exact catalog identity against the committed 18-track baseline (disc 1 only).
// The 10 pre-existing uncommitted bonus-disc tracks (disc 2) are intentionally
// excluded from this milestone and must not appear in the authoring entry.
const catalogKeys = album.tracks
  .filter((t) => t.discNumber === 1)
  .map((t) => `${t.discNumber}:${t.trackNumber}:${t.title}`)
  .sort();
const entryKeys = entry.trackEntries.map((t) => `${t.discNumber}:${t.trackNumber}:${t.trackTitle}`).sort();
assert.deepEqual(entryKeys, catalogKeys, 'rank-14 track identities must exactly match the committed disc-1 catalog baseline');
assert.equal(entry.trackEntries.length, 18, 'rank-14 must preserve all eighteen committed baseline tracks');
assert.ok(entry.trackEntries.every((t) => t.discNumber === 1), 'rank-14 must not include bonus-disc (disc 2) tracks');

for (const track of entry.trackEntries) {
  assert.equal(track.evidenceLevel, 'documented', `${track.trackTitle}: evidence must be documented`);
  assert.equal(track.verifiedFacts?.length, 1, `${track.trackTitle}: one narrow verified fact required`);
  const fact = track.verifiedFacts[0];
  assert.match(fact.semanticReview?.recordId ?? '', /^[a-f0-9]{64}$/, `${track.trackTitle}: immutable review binding required`);
  assert.equal(fact.semanticReview?.decisionId, fact.claimId, `${track.trackTitle}: review decision must bind the stable claim ID`);
  const review = JSON.parse(await readFile(path.join(dataDir, 'review-artifacts', `${fact.semanticReview.recordId}.json`), 'utf8'));
  const decision = review.decisions.find((item) => item.decisionId === fact.semanticReview.decisionId);
  assert.equal(decision?.decision, 'supported', `${track.trackTitle}: supported immutable review decision required`);
  assert.match(fact.sourceRefs?.[0]?.artifactId ?? '', /^[a-f0-9]{64}$/, `${track.trackTitle}: retained source artifact required`);
  assert.equal(fact.sourceRefs?.[0]?.section?.kind, 'character-offsets', `${track.trackTitle}: exact offsets required`);
  assert.equal(track.musicalCharacter, '', `${track.trackTitle}: unsupported musical analysis must be absent`);
  assert.equal(track.listeningNotes, '', `${track.trackTitle}: unsupported listening prose must be absent`);
}

console.log('rank-14 Exile on Main St. acceptance test passed: 18 documented tracks, 18 supported review decisions, exact committed disc-1 catalog identity, unpublished edition 1.');

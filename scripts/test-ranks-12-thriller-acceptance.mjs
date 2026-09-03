// Focused acceptance test for rank 12 — Michael Jackson, Thriller.
// Verifies the completed immutable unpublished edition 1: exact catalog identity,
// all-documented evidence, supported independent review, and source-artifact binding.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'src/data/track-encyclopedia');
const ALBUM_ID = '012-michael-jackson-thriller-a46ba2f6';

const authoring = JSON.parse(await readFile(path.join(dataDir, 'authoring', `${ALBUM_ID}.json`), 'utf8'));
const entry = authoring.entries[ALBUM_ID];
const catalog = JSON.parse(await readFile(path.join(process.cwd(), 'src/data/catalog.generated.json'), 'utf8'));
const album = catalog.albums.find((a) => a.id === ALBUM_ID);

assert.ok(entry, 'rank-12 authoring entry must exist');
assert.equal(entry.editionNumber, 1, 'rank-12 must be edition 1');
assert.equal(entry.published, false, 'rank-12 edition must remain unpublished');
assert.match(entry.contentHash ?? '', /^[a-f0-9]{16}$/, 'rank-12 must carry a semantic content hash');

const catalogKeys = album.tracks.map((t) => `${t.discNumber}:${t.trackNumber}:${t.title}`).sort();
const entryKeys = entry.trackEntries.map((t) => `${t.discNumber}:${t.trackNumber}:${t.trackTitle}`).sort();
assert.deepEqual(entryKeys, catalogKeys, 'rank-12 track identities must exactly match catalog');
assert.equal(entry.trackEntries.length, 9, 'rank-12 must preserve all nine catalog tracks');

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

console.log('rank-12 Thriller acceptance test passed: 9 documented tracks, 9 supported review decisions, exact catalog identity, unpublished edition 1.');

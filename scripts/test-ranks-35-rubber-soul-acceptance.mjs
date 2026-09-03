// Focused acceptance test for rank 35 — The Beatles, Rubber Soul.
// Verifies the completed immutable unpublished edition 1: exact catalog identity
// against the committed 14-track baseline, zero unresearched tracks, and supported
// independent semantic review for every documented claim.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'src/data/track-encyclopedia');
const ALBUM_ID = '035-the-beatles-rubber-soul-e05eb313';

const authoring = JSON.parse(await readFile(path.join(dataDir, 'authoring', `${ALBUM_ID}.json`), 'utf8'));
const entry = authoring.entries[ALBUM_ID];
const catalog = JSON.parse(await readFile(path.join(process.cwd(), 'src/data/catalog.generated.json'), 'utf8'));
const album = catalog.albums.find((a) => a.id === ALBUM_ID);

assert.ok(entry, 'rank-35 authoring entry must exist');
assert.equal(entry.editionNumber, 1, 'rank-35 must be edition 1');
assert.equal(entry.published, false, 'rank-35 edition must remain unpublished');
assert.match(entry.contentHash ?? '', /^[a-f0-9]{16}$/, 'rank-35 must carry a semantic content hash');

const catalogKeys = album.tracks.map((t) => `${t.discNumber}:${t.trackNumber}:${t.title}`).sort();
const entryKeys = entry.trackEntries.map((t) => `${t.discNumber}:${t.trackNumber}:${t.trackTitle}`).sort();
assert.deepEqual(entryKeys, catalogKeys, 'rank-35 track identities must exactly match catalog');
assert.equal(entry.trackEntries.length, 14, 'rank-35 must preserve all fourteen catalog tracks');

let documented = 0;
let insufficient = 0;
for (const track of entry.trackEntries) {
  if (track.evidenceLevel === 'documented') {
    documented += 1;
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
  } else if (track.evidenceLevel === 'insufficient-evidence') {
    insufficient += 1;
    assert.equal(track.verifiedFacts?.length ?? 0, 0, `${track.trackTitle}: insufficient-evidence entry cannot carry verifiedFacts`);
    const d = track.researchDisposition;
    assert.ok(d && typeof d === 'object', `${track.trackTitle}: research disposition required`);
    assert.match(d.completedAt ?? '', /^\d{4}-\d{2}-\d{2}$/, `${track.trackTitle}: disposition completedAt required`);
    assert.ok(Array.isArray(d.searchedQueries) && d.searchedQueries.length > 0, `${track.trackTitle}: searchedQueries required`);
    assert.ok(Array.isArray(d.sourceClasses) && d.sourceClasses.length > 0, `${track.trackTitle}: sourceClasses required`);
    assert.ok(typeof d.outcome === 'string' && d.outcome.trim() !== '', `${track.trackTitle}: disposition outcome required`);
    assert.ok(Array.isArray(track.limitations) && track.limitations.length > 0, `${track.trackTitle}: limitations required`);
  } else {
    assert.fail(`${track.trackTitle}: unexpected evidence level ${track.evidenceLevel}`);
  }
}

assert.equal(documented + insufficient, 14, 'rank-35 must account for all 14 catalog tracks');
assert.ok(documented >= 1, 'rank-35 must retain at least one supported documented claim');

console.log(`rank-35 Rubber Soul acceptance test passed: 14 tracks (${documented} documented, ${insufficient} insufficient-evidence), exact catalog identity, unpublished edition 1.`);

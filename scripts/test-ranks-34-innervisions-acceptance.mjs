// Focused acceptance test for rank 34 — Stevie Wonder, Innervisions.
// Verifies immutable unpublished edition 1: exact catalog identity against the
// committed 9-track baseline, documented evidence with supported independent
// review for every documented track, and completion-eligible insufficient
// evidence dispositions when track-specific sources cannot support a claim.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'src/data/track-encyclopedia');
const ALBUM_ID = '034-stevie-wonder-innervisions-d09c9a35';

const authoring = JSON.parse(await readFile(path.join(dataDir, 'authoring', `${ALBUM_ID}.json`), 'utf8'));
const entry = authoring.entries[ALBUM_ID];
const catalog = JSON.parse(await readFile(path.join(process.cwd(), 'src/data/catalog.generated.json'), 'utf8'));
const album = catalog.albums.find((a) => a.id === ALBUM_ID);

assert.deepEqual(
  {
    id: album.id,
    rank: album.rank,
    title: album.title,
    artist: album.artist,
    year: album.year,
    appleCollectionId: album.appleCollectionId,
    appleCollectionUrl: album.appleCollectionUrl,
    appleArtworkUrl: album.appleArtworkUrl,
    tracks: album.tracks,
  },
  {
    id: ALBUM_ID,
    rank: 34,
    title: 'Innervisions',
    artist: 'Stevie Wonder',
    year: 1973,
    appleCollectionId: 1440806790,
    appleCollectionUrl: 'https://music.apple.com/us/album/innervisions/1440806790?uo=4',
    appleArtworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ff/c2/5f/ffc25f04-cb3b-b56e-dd28-8b77ae63e613/00602537070824.rgb.jpg/600x600bb.jpg',
    tracks: [
      { discNumber: 1, trackNumber: 1, title: 'Too High', durationMs: 275985, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/c4/0f/aa/c40faaa5-dad0-9c09-ca30-c80cd938a73a/mzaf_10702639296418700008.plus.aac.p.m4a' },
      { discNumber: 1, trackNumber: 2, title: 'Visions', durationMs: 323231, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/16/04/26/1604261c-1ca6-35da-7b62-6d85db1ce27a/mzaf_9966972676046111807.plus.aac.p.m4a' },
      { discNumber: 1, trackNumber: 3, title: 'Living For the City', durationMs: 441787, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/d4/7c/ae/d47cae0e-b06f-003c-0f50-9696a46b258e/mzaf_10406314703371413122.plus.aac.p.m4a' },
      { discNumber: 1, trackNumber: 4, title: 'Golden Lady', durationMs: 300991, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/ad/08/89/ad088961-eb71-ea72-787d-bee111db03a3/mzaf_13713709512498976368.plus.aac.p.m4a' },
      { discNumber: 1, trackNumber: 5, title: 'Higher Ground', durationMs: 222081, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/77/f0/91/77f0918f-11c6-509d-aa6f-1f284be5a37c/mzaf_764800984787521060.plus.aac.p.m4a' },
      { discNumber: 1, trackNumber: 6, title: 'Jesus Children of America', durationMs: 250157, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/da/65/92/da6592ab-956f-2ae1-2b18-26ed4dcbfbd9/mzaf_2759973099639607480.plus.aac.p.m4a' },
      { discNumber: 1, trackNumber: 7, title: 'All In Love Is Fair', durationMs: 221949, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/60/23/b0/6023b04a-2a2a-e3a8-fc42-e7f1f9240a8f/mzaf_7057281354777351837.plus.aac.p.m4a' },
      { discNumber: 1, trackNumber: 8, title: "Don't You Worry 'Bout a Thing", durationMs: 284885, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/8e/f4/93/8ef493ba-3f63-6231-69d8-63e039a7f5c1/mzaf_12037057971307116794.plus.aac.p.m4a' },
      { discNumber: 1, trackNumber: 9, title: "He's Misstra Know-It-All", durationMs: 334631, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/f7/23/8e/f7238e4a-0c7d-1024-5f5e-32670469d19c/mzaf_5383093407985817405.plus.aac.p.m4a' },
    ],
  },
  'rank-34 catalog and Apple/iTunes preview metadata must remain byte-for-value exact',
);

assert.ok(entry, 'rank-34 authoring entry must exist');
assert.equal(entry.editionNumber, 1, 'rank-34 must be edition 1');
assert.equal(entry.published, false, 'rank-34 edition must remain unpublished');
assert.match(entry.contentHash ?? '', /^[a-f0-9]{16}$/, 'rank-34 must carry a semantic content hash');

const catalogKeys = album.tracks.map((t) => `${t.discNumber}:${t.trackNumber}:${t.title}`).sort();
const entryKeys = entry.trackEntries.map((t) => `${t.discNumber}:${t.trackNumber}:${t.trackTitle}`).sort();
assert.deepEqual(entryKeys, catalogKeys, 'rank-34 track identities must exactly match catalog');
assert.equal(entry.trackEntries.length, 9, 'rank-34 must preserve all nine catalog tracks');

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

assert.equal(documented + insufficient, 9, 'rank-34 must research all 9 catalog tracks');
assert.equal(documented, 9, 'rank-34 must document all 9 catalog tracks');
assert.equal(insufficient, 0, 'rank-34 must carry zero insufficient-evidence tracks');

console.log(`rank-34 Innervisions acceptance test passed: 9 tracks (9 documented, 0 insufficient-evidence), exact catalog identity, unpublished edition 1.`);

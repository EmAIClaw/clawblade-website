import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'src/data/track-encyclopedia');
const authoringDir = path.join(dataDir, 'authoring');
const names = (await readdir(authoringDir)).filter((name) => name.endsWith('.json')).sort();

const entries = {};
for (const name of names) {
  const value = JSON.parse(await readFile(path.join(authoringDir, name), 'utf8'));
  assert.equal(Object.keys(value.entries ?? {}).length, 1, `${name} must contain exactly one album`);
  const [albumId, entry] = Object.entries(value.entries)[0];
  assert.equal(entry.albumId, albumId);
  assert.equal(entry.published, false, `${albumId} must remain an unpublished draft`);
  entries[albumId] = entry;
}

const marvinId = '001-marvin-gaye-what-s-going-on-fd00dde9';
const lizId = '054-liz-phair-exile-in-guyville-2b33a458';
const stoogesId = '092-the-stooges-fun-house-9896fe5c';
const petSoundsId = '002-the-beach-boys-pet-sounds-eabcc325';
const pilotIds = [marvinId, lizId, stoogesId].sort();
assert.ok(names.length >= pilotIds.length, 'at least the three pilot authoring files must exist');
for (const id of pilotIds) {
  assert.ok(entries[id], `pilot album ${id} must have an authoring entry`);
}
assert.equal(entries[marvinId].editionNumber, 5, 'Marvin provenance migration requires a new draft edition');
assert.equal(entries[lizId].editionNumber, 5, 'Liz provenance migration requires a new draft edition');
assert.equal(entries[stoogesId].editionNumber, 4, 'Fun House provenance migration requires a new draft edition');

const marvin = new Map(entries[marvinId].trackEntries.map((track) => [track.trackTitle, track]));
assert.equal(marvin.size, 9, 'rank-1 edition must preserve exactly nine catalog tracks');
for (const track of marvin.values()) {
  assert.ok(
    ['documented', 'contextual', 'insufficient-evidence'].includes(track.evidenceLevel),
    `${track.trackTitle}: rank-1 completion cannot retain unresearched or unsupported limited status`
  );
}
const whatsGoingOn = marvin.get("What's Going On");
assert.doesNotMatch(`${whatsGoingOn.musicalCharacter} ${whatsGoingOn.historicalContext ?? ''} ${whatsGoingOn.listeningNotes}`, /flute|1970 and 1971|West Hollywood/i);
const brother = marvin.get("What's Happening Brother");
assert.doesNotMatch(`${brother.musicalCharacter} ${brother.albumContext} ${brother.listeningNotes}`, /Frankie Gaye|Gaye's brother Frankie/i);
assert.match(`${brother.verifiedFacts[0].claim} ${brother.limitations.join(' ')}`, /Frankie Gaye.*Vietnam War/i);
for (const title of ['Mercy Mercy Me (The Ecology)', 'Inner City Blues (Make Me Wanna Holler)']) {
  const track = marvin.get(title);
  assert.equal(track.musicalCharacter, '', `${title} unsupported musical-character prose must be removed`);
  assert.equal(track.listeningNotes, '', `${title} unsupported listening prose must be removed`);
}
assert.match(entries[marvinId].changeNote, /errat|evidence|unsupported/i);
assert.match(entries[marvinId].reviewMetadata.notes, /immutable independent review/i);

const liz = new Map(entries[lizId].trackEntries.map((track) => [track.trackTitle, track]));
assert.equal(liz.size, 18, 'rank-54 edition must preserve exactly eighteen catalog tracks');
const lizArtifactIds = new Set();
for (const track of liz.values()) {
  assert.equal(track.evidenceLevel, 'documented', `${track.trackTitle}: rank-54 completion requires documented track-specific evidence`);
  assert.equal(track.verifiedFacts.length, 1, `${track.trackTitle}: retain one narrowly scoped verified fact`);
  assert.equal(track.musicalCharacter, '', `${track.trackTitle}: unsupported musical-character prose must be absent`);
  assert.equal(track.listeningNotes, '', `${track.trackTitle}: unsupported listening prose must be absent`);
  const ref = track.verifiedFacts[0].sourceRefs[0];
  assert.match(ref.url, /^https:\/\/www\.rollingstone\.com\/music\/music-features\/liz-phair-breaks-down-exile-in-guyville-track-by-track-628853$/);
  assert.match(ref.artifactId ?? '', /^[a-f0-9]{64}$/, `${track.trackTitle}: claim evidence requires a source artifact`);
  assert.equal(ref.section?.kind, 'character-offsets', `${track.trackTitle}: claim evidence requires exact offsets`);
  lizArtifactIds.add(ref.artifactId);
}
assert.equal(lizArtifactIds.size, 1, 'rank-54 may share one genuinely track-by-track fetched artifact with distinct excerpts');
const stratford = liz.get('Stratford-on-Guy');
assert.equal(stratford.evidenceLevel, 'documented');
assert.match(stratford.verifiedFacts[0].claim, /perspective shift/i);
const neverSaid = liz.get('Never Said');
assert.equal(neverSaid.musicalCharacter, '');
assert.equal(neverSaid.listeningNotes, '');
assert.equal(neverSaid.discoveryConnections?.length ?? 0, 0);

const stooges = new Map(entries[stoogesId].trackEntries.map((track) => [track.trackTitle, track]));
assert.equal(stooges.size, 7, 'rank-92 edition must preserve exactly seven catalog tracks');
const stoogesArtifactIds = new Set();
for (const track of stooges.values()) {
  assert.equal(track.evidenceLevel, 'documented', `${track.trackTitle}: rank-92 completion requires documented track-specific evidence`);
  assert.equal(track.verifiedFacts.length, 1, `${track.trackTitle}: retain one narrowly scoped verified fact`);
  assert.equal(track.musicalCharacter, '', `${track.trackTitle}: unsupported musical-character prose must be absent`);
  assert.equal(track.listeningNotes, '', `${track.trackTitle}: unsupported listening prose must be absent`);
  const ref = track.verifiedFacts[0].sourceRefs[0];
  assert.match(ref.url, /^https:\/\//, `${track.trackTitle}: evidence URL must use HTTPS`);
  assert.ok(ref.extract, `${track.trackTitle}: evidence requires a retained verbatim excerpt`);
  assert.match(ref.artifactId ?? '', /^[a-f0-9]{64}$/, `${track.trackTitle}: claim evidence requires a source artifact`);
  assert.equal(ref.section?.kind, 'character-offsets', `${track.trackTitle}: claim evidence requires exact offsets`);
  stoogesArtifactIds.add(ref.artifactId);
}
assert.equal(stoogesArtifactIds.size, 2, 'rank-92 uses two fetched track-specific source artifacts');

for (const [albumId, entry] of Object.entries(entries)) {
  for (const track of entry.trackEntries) {
    if (track.evidenceLevel === 'limited') {
      assert.ok(track.audioProvenance, `${albumId}/${track.trackTitle}: limited listening analysis requires retained audio provenance`);
    }
    if (track.evidenceLevel === 'insufficient-evidence') {
      assert.ok(track.researchDisposition?.completedAt);
      assert.ok(track.researchDisposition?.searchedQueries?.length);
      assert.ok(track.researchDisposition?.sourceClasses?.length);
      assert.ok(track.researchDisposition?.outcome);
      assert.ok(track.limitations?.length);
    }
    for (const fact of track.verifiedFacts ?? []) {
      assert.match(fact.claimId ?? '', new RegExp(`^${albumId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`), `${albumId}/${track.trackTitle}: stable claim ID is required`);
      assert.match(fact.semanticReview?.recordId ?? '', /^[a-f0-9]{64}$/, `${albumId}/${track.trackTitle}: immutable semantic review is required`);
      assert.equal(fact.semanticReview?.decisionId, fact.claimId);
      const review = JSON.parse(await readFile(path.join(dataDir, 'review-artifacts', `${fact.semanticReview.recordId}.json`), 'utf8'));
      const decision = review.decisions.find((item) => item.decisionId === fact.semanticReview.decisionId);
      assert.equal(decision?.decision, 'supported', `${albumId}/${track.trackTitle}: independent review must support the claim`);
      for (const ref of fact.sourceRefs ?? []) {
        assert.match(ref.artifactId ?? '', /^[a-f0-9]{64}$/, `${albumId}/${track.trackTitle}: claim evidence requires a source artifact`);
        assert.equal(ref.section?.kind, 'character-offsets');
      }
    }
  }
}

const catalog = JSON.parse(await readFile(path.join(root, 'src/data/catalog.generated.json'), 'utf8'));
const albums = new Map(catalog.albums.map((album) => [album.id, album]));
for (const [albumId, entry] of Object.entries(entries)) {
  const expected = albums.get(albumId).tracks.map((track) => `${track.discNumber}:${track.trackNumber}:${track.title}`);
  const actual = entry.trackEntries.map((track) => `${track.discNumber}:${track.trackNumber}:${track.trackTitle}`);
  assert.deepEqual(actual, expected, `${albumId}: catalog identity must be exact`);
}

console.log(`All provenance-migration acceptance tests passed for ${names.length} authoring file(s) (${pilotIds.length} completed pilots).`);

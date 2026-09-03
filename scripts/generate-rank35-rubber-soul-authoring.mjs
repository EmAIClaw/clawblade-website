// Generate rank-35 Rubber Soul authoring from the mechanically collected
// source artifact and the exact committed catalog track identities.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ALBUM_ID = '035-the-beatles-rubber-soul-e05eb313';
const CHECKED_AT = '2026-09-03';
const SOURCE_URL = 'https://en.wikipedia.org/wiki/Rubber_Soul';
const SOURCE_LABEL = 'Wikipedia Rubber Soul article';
const SOURCE_TITLE = 'Rubber Soul - Wikipedia';
const SOURCE_IDENTITY = 'en.wikipedia.org|Rubber Soul album article';
const COLLECTOR_RUN_ID = 'rank35-rubber-soul-http-collector-v2-20260903';
const root = process.cwd();
const dataDir = path.join(root, 'src/data/track-encyclopedia');

const claims = new Map([
  [1, { claim: 'Wikipedia states that George Harrison suggested arranging "Drive My Car" with a dual guitar–bass riff in the style of Otis Redding\'s contemporary recording of "Respect".', extract: 'Harrison, as the Beatles\' most knowledgeable soul-music enthusiast, contributed heavily to the recording by suggesting they arrange the song with a dual guitar–bass riff in the style of Otis Redding\'s contemporary single "Respect".' }],
  [2, { claim: 'Wikipedia states that John Lennon said he wrote "Norwegian Wood" about an extramarital affair and worded the narrative to conceal it from his wife, Cynthia.', extract: 'Lennon said he wrote "Norwegian Wood" about an extramarital affair and that he worded the narrative to hide the truth from his wife, Cynthia.' }],
  [3, { claim: 'Wikipedia states that Paul McCartney described the music of "You Won\'t See Me" as "very Motown-flavored", with a feel inspired by bassist James Jamerson.', extract: 'McCartney described its music as "very Motown-flavored", with a "feel" inspired by Motown bassist James Jamerson.' }],
  [4, { claim: 'Wikipedia states that Lennon recalled "Nowhere Man" coming to him fully formed one night at his home in Surrey.', extract: 'Lennon recalled that "Nowhere Man" came to him fully formed one night at his home in Surrey,' }],
  [5, { claim: 'Wikipedia characterizes the accusatory message of "Think for Yourself" as unprecedented in the Beatles\' work.', extract: 'The song\'s accusatory message was unprecedented in the Beatles\' work;' }],
  [6, { claim: 'Wikipedia states that the arrangement of "The Word" includes seven vocal parts and George Martin playing suspended chords on harmonium.', extract: 'The arrangement also includes seven vocal parts and Martin playing suspended chords on harmonium.' }],
  [7, { claim: 'Wikipedia states that Lennon added a new middle eight to "Michelle", partly drawn from Nina Simone\'s recent cover of "I Put a Spell on You".', extract: 'During a writing session for Rubber Soul, Lennon added a new middle eight, part of which was taken from Nina Simone\'s recent cover of "I Put a Spell on You".' }],
  [8, { claim: 'Wikipedia states that Lennon and McCartney reworked "What Goes On" as a vocal feature for Ringo Starr.', extract: 'With little time to complete Rubber Soul, the song was reworked by Lennon and McCartney as a vocal spot for Starr,' }],
  [9, { claim: 'Wikipedia states that "Girl" was the final track recorded for Rubber Soul.', extract: 'The song was the final track recorded for the album.' }],
  [10, { claim: 'Wikipedia states that the Beatles taped two versions of "I\'m Looking Through You" before achieving the final version.', extract: 'The Beatles had taped two versions of the song before achieving the final version,' }],
  [11, { claim: 'Wikipedia states that George Martin overdubbed the Bach-inspired piano solo on "In My Life" in the Beatles\' absence.', extract: 'Martin\'s Bach-inspired piano solo was overdubbed in the Beatles\' absence,' }],
  [12, { claim: 'Wikipedia states that the Beatles completed "Wait" on the final recording day, overdubbing tone-pedal lead guitar and percussion.', extract: 'The band completed the track on the final day of recording for the album, overdubbing tone-pedal lead guitar, percussion' }],
  [13, { claim: 'Wikipedia states that Harrison wrote "If I Needed Someone" as a love song to Pattie Boyd.', extract: 'Harrison wrote "If I Needed Someone" as a love song to Pattie Boyd, the English model to whom he became engaged in December 1965 and married the following month.' }],
  [14, { claim: 'Wikipedia states that "Run for Your Life" was the first track recorded for Rubber Soul and features Harrison playing a descending guitar riff and slide-guitar parts.', extract: 'it was the first track recorded for the album and features a descending guitar riff played by Harrison and slide guitar parts.' }],
]);

const artifactFiles = await readdir(path.join(dataDir, 'source-artifacts'));
let artifact;
for (const name of artifactFiles.filter((value) => value.endsWith('.json'))) {
  const candidate = JSON.parse(await readFile(path.join(dataDir, 'source-artifacts', name), 'utf8'));
  if (candidate.canonicalUrl === SOURCE_URL && candidate.collector?.runId === COLLECTOR_RUN_ID) artifact = candidate;
}
if (!artifact) throw new Error(`Missing source artifact from ${COLLECTOR_RUN_ID}. Run the rank-35 collector first.`);
if (artifact.httpStatus !== 200 || artifact.collectionMethod !== 'http-fetch') throw new Error('Rank-35 source artifact is not a successful live HTTP fetch.');

const catalog = JSON.parse(await readFile(path.join(root, 'src/data/catalog.generated.json'), 'utf8'));
const album = catalog.albums.find((item) => item.id === ALBUM_ID);
if (!album) throw new Error(`Missing catalog album ${ALBUM_ID}.`);
if (album.tracks.length !== 14) throw new Error(`Expected 14 catalog tracks, found ${album.tracks.length}.`);

const trackEntries = album.tracks.map((track) => {
  const item = claims.get(track.trackNumber);
  if (!item) throw new Error(`Missing researched claim for catalog track ${track.trackNumber}: ${track.title}`);
  const phraseStart = artifact.retainedText.indexOf(item.extract);
  if (phraseStart < 0) throw new Error(`Exact evidence phrase missing from retained artifact for ${track.title}.`);
  const articleTitle = track.trackNumber === 5 ? 'Think for Yourself' : (track.trackNumber === 14 ? 'Run for Your Life' : track.title);
  const heading = `"${articleTitle}" [edit]`;
  const start = artifact.retainedText.lastIndexOf(heading, phraseStart);
  if (start < 0) throw new Error(`Track heading missing before retained evidence for ${track.title}.`);
  const end = phraseStart + item.extract.length;
  const retainedExtract = artifact.retainedText.slice(start, end);
  return {
    albumId: ALBUM_ID,
    discNumber: track.discNumber,
    trackNumber: track.trackNumber,
    trackTitle: track.title,
    evidenceLevel: 'documented',
    verifiedFacts: [{
      claimId: `${ALBUM_ID}:${track.discNumber}:${track.trackNumber}:fact-1`,
      claim: item.claim,
      sourceRefs: [{
        label: SOURCE_LABEL,
        title: SOURCE_TITLE,
        url: SOURCE_URL,
        sourceIdentity: SOURCE_IDENTITY,
        extractType: 'verbatim',
        evidenceStatus: 'retrieved',
        checkedAt: CHECKED_AT,
        extract: retainedExtract,
        artifactId: artifact.artifactId,
        section: { kind: 'character-offsets', start, end },
      }],
    }],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    limitations: ['One attributed track-specific statement retained from the fetched album article; no independent musical analysis, lyric interpretation, or complete session reconstruction is claimed.'],
    sourceRefs: [{ label: SOURCE_LABEL, title: SOURCE_TITLE, url: SOURCE_URL }],
  };
});

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all fourteen Rubber Soul catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'hermes-rank35-track-encyclopedia-author',
    model: 'gpt-5.6-sol',
  },
  reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  contentHash: '',
};
const doc = {
  metadata: { version: '1.0.0-candidate', generatedAt: '2026-09-03T00:00:00.000Z', albumCount: 1 },
  entries: { [ALBUM_ID]: entry },
};
const outputPath = path.join(dataDir, 'authoring', `${ALBUM_ID}.json`);
await writeFile(outputPath, `${JSON.stringify(doc, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ outputPath, tracks: trackEntries.length, documented: trackEntries.length, artifactId: artifact.artifactId }));

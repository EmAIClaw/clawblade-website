// Generate rank-31 authoring from mechanically collected source evidence.
import { readFileSync, writeFileSync } from 'node:fs';

const ALBUM_ID = '031-miles-davis-kind-of-blue-2148074c';
const CHECKED_AT = '2026-09-03';
const SOURCE_URL = 'https://en.wikipedia.org/wiki/Kind_of_Blue';
const SOURCE_LABEL = 'Wikipedia Kind of Blue article';
const SOURCE_TITLE = 'Kind of Blue - Wikipedia';
const SOURCE_IDENTITY = 'en.wikipedia.org|Kind of Blue album article';
const collection = JSON.parse(readFileSync('reports/rank31-kind-of-blue-source-collection.json', 'utf8'));
const result = collection.results?.[0];
if (result?.status !== 'collected' || !result.artifactId || result.claims?.length !== 5) {
  throw new Error('Rank-31 source collection must contain one artifact and five located claims.');
}

const claimText = new Map([
  [1, 'Wikipedia, citing Bill Evans’ original liner notes, states that “So What” consists of two modes: sixteen measures of the first, eight of the second, then eight more of the first.'],
  [2, 'Wikipedia, citing Bill Evans’ original liner notes, describes “Freddie Freeloader” as a standard twelve-bar blues form.'],
  [3, 'Wikipedia, citing Bill Evans’ original liner notes, states that “Blue in Green” consists of a ten-measure cycle following a short four-measure introduction.'],
  [4, 'Wikipedia, citing Bill Evans’ original liner notes, describes “All Blues” as a twelve-bar blues form in 6/8 time.'],
  [5, 'Wikipedia, citing Bill Evans’ original liner notes, states that “Flamenco Sketches” consists of five scales, each played as long as the soloist wishes before completing the series.'],
]);

const trackEntries = result.claims.map((sourceClaim) => ({
  albumId: ALBUM_ID,
  discNumber: sourceClaim.discNumber,
  trackNumber: sourceClaim.trackNumber,
  trackTitle: sourceClaim.trackTitle,
  evidenceLevel: 'documented',
  verifiedFacts: [{
    claimId: `${ALBUM_ID}:${sourceClaim.discNumber}:${sourceClaim.trackNumber}:fact-1`,
    claim: claimText.get(sourceClaim.trackNumber),
    sourceRefs: [{
      label: SOURCE_LABEL,
      title: SOURCE_TITLE,
      url: SOURCE_URL,
      sourceIdentity: SOURCE_IDENTITY,
      extractType: 'verbatim',
      evidenceStatus: 'retrieved',
      checkedAt: CHECKED_AT,
      extract: sourceClaim.retainedExtract,
      artifactId: result.artifactId,
      section: sourceClaim.section,
    }],
  }],
  musicalCharacter: '',
  albumContext: '',
  listeningNotes: '',
  limitations: ['One attributed formal description is retained from a reputable secondary source citing the original liner notes; no interpretive listening analysis or complete session reconstruction is claimed.'],
  sourceRefs: [{ label: SOURCE_LABEL, title: SOURCE_TITLE, url: SOURCE_URL }],
})).sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber);

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all five Kind of Blue catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'rank31-track-encyclopedia-author',
    model: 'gpt-5.6-sol',
  },
  reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  contentHash: '',
};
const doc = {
  metadata: { version: '1.0.0-candidate', generatedAt: '2026-09-03T00:00:00.000Z', albumCount: 1 },
  entries: { [ALBUM_ID]: entry },
};
writeFileSync(`src/data/track-encyclopedia/authoring/${ALBUM_ID}.json`, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote rank-31 authoring with ${trackEntries.length} documented tracks using artifact ${result.artifactId}.`);

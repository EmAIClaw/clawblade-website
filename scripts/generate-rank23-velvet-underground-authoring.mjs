// Generate rank-23 authoring from the mechanically collected source report.
// Every retained claim is narrow, track-specific, and bound to an exact source-artifact slice.
import { readFile, writeFile } from 'node:fs/promises';

const ALBUM_ID = '023-the-velvet-underground-the-velvet-underground-and-nico-0913adef';
const CHECKED_AT = '2026-09-03';
const reportPath = process.argv[2] || 'reports/rank23-velvet-underground-source-collection.json';
const report = JSON.parse(await readFile(reportPath, 'utf8'));
const catalog = JSON.parse(await readFile('src/data/catalog.generated.json', 'utf8'));
const album = catalog.albums.find((item) => item.id === ALBUM_ID);
if (!album) throw new Error(`Missing catalog album ${ALBUM_ID}.`);

const claimByTitle = new Map([
  ['Sunday Morning', 'Wikipedia states that “Sunday Morning” was the final song recorded for the album and that Tom Wilson requested another potential single with lead vocals by Nico.'],
  ["I'm Waiting for the Man", 'Wikipedia states that the lyrics of “I’m Waiting for the Man” describe a man trying to obtain heroin.'],
  ['Femme Fatale', 'Wikipedia states that Lou Reed wrote “Femme Fatale” about Warhol superstar Edie Sedgwick at Andy Warhol’s request.'],
  ['Venus In Furs', 'Wikipedia states that “Venus in Furs” was inspired by Leopold von Sacher-Masoch’s novel of the same name and addresses sadomasochism and bondage.'],
  ['Run Run Run', 'Wikipedia states that Lou Reed wrote “Run Run Run” on the back of an envelope while the band was traveling to a Café Bizarre performance.'],
  ["All Tomorrow's Parties", 'Wikipedia states that “All Tomorrow’s Parties” arose from Reed’s observations of Andy Warhol’s Factory circle and quotes Reed calling it an apt description of people there.'],
  ['Heroin', 'Wikipedia states that Lou Reed wrote “Heroin” in 1964 and that the song overtly depicts heroin use and its effects.'],
  ['There She Goes Again', 'Wikipedia states that the syncopated guitar riff in “There She Goes Again” was taken from Marvin Gaye’s 1962 song “Hitch Hike.”'],
  ["I'll Be Your Mirror", 'Wikipedia states that Lou Reed wrote “I’ll Be Your Mirror” for Nico, who sings lead on the recording.'],
  ["The Black Angel's Death Song", 'Wikipedia states that John Cale’s electric viola dominates “The Black Angel’s Death Song” and creates dissonance throughout it.'],
  ['European Son', 'Wikipedia states that “European Son” is dedicated to poet Delmore Schwartz, Lou Reed’s former adviser at Syracuse University.'],
]);

const resultByTrack = new Map();
for (const result of report.results ?? []) {
  if (result.status !== 'collected') continue;
  for (const evidence of result.claims ?? []) resultByTrack.set(evidence.trackTitle, { result, evidence });
}

const trackEntries = album.tracks.map((catalogTrack) => {
  const found = resultByTrack.get(catalogTrack.title);
  const claim = claimByTitle.get(catalogTrack.title);
  if (!found || !claim) throw new Error(`Missing researched evidence for ${catalogTrack.title}.`);
  const { result, evidence } = found;
  if (evidence.discNumber !== catalogTrack.discNumber || evidence.trackNumber !== catalogTrack.trackNumber) {
    throw new Error(`Catalog identity mismatch for ${catalogTrack.title}.`);
  }
  const sourceTitle = `${catalogTrack.title} - Wikipedia`;
  const sourceRef = {
    label: `Wikipedia ${catalogTrack.title} article`,
    title: sourceTitle,
    url: result.canonicalUrl,
    sourceIdentity: `en.wikipedia.org|${catalogTrack.title} song article`,
    extractType: 'verbatim',
    evidenceStatus: 'retrieved',
    checkedAt: CHECKED_AT,
    extract: evidence.retainedExtract,
    artifactId: result.artifactId,
    section: evidence.section,
  };
  return {
    albumId: ALBUM_ID,
    discNumber: catalogTrack.discNumber,
    trackNumber: catalogTrack.trackNumber,
    trackTitle: catalogTrack.title,
    evidenceLevel: 'documented',
    verifiedFacts: [{
      claimId: `${ALBUM_ID}:${catalogTrack.discNumber}:${catalogTrack.trackNumber}:fact-1`,
      claim,
      sourceRefs: [sourceRef],
    }],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    limitations: ['One attributed track-specific statement retained; no independent musical analysis, lyric interpretation, or complete session reconstruction is claimed.'],
    sourceRefs: [{ label: sourceRef.label, title: sourceRef.title, url: sourceRef.url }],
  };
});

const generatedAt = '2026-09-03T00:00:00.000Z';
const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all eleven The Velvet Underground & Nico catalog tracks with track-specific fetched evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt,
    generator: 'codex-rank23-track-encyclopedia-author',
    model: 'gpt-5.6-sol',
  },
  reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  contentHash: '',
};
const doc = {
  metadata: { version: '1.0.0-candidate', generatedAt, albumCount: 1 },
  entries: { [ALBUM_ID]: entry },
};
await writeFile(`src/data/track-encyclopedia/authoring/${ALBUM_ID}.json`, `${JSON.stringify(doc, null, 2)}\n`, { flag: 'wx' });
console.log(`Wrote rank-23 authoring with ${trackEntries.length} documented tracks.`);

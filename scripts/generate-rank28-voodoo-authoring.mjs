// Generate rank-28 authoring for D'Angelo — Voodoo from collected evidence.
import { readFileSync, writeFileSync } from 'node:fs';

const ALBUM_ID = '028-d-angelo-voodoo-b6406009';
const CHECKED_AT = '2026-09-03';
const report = JSON.parse(readFileSync('reports/rank28-voodoo-source-collection.json', 'utf8'));

const sourceMeta = {
  'https://en.wikipedia.org/wiki/Voodoo_(D%27Angelo_album)': {
    label: "Wikipedia Voodoo (D'Angelo album) article",
    title: "Voodoo (D'Angelo album) - Wikipedia",
    identity: "en.wikipedia.org|Voodoo (D'Angelo album) article",
  },
  'https://en.wikipedia.org/wiki/Devil%27s_Pie': {
    label: "Wikipedia Devil's Pie article",
    title: "Devil's Pie - Wikipedia",
    identity: "en.wikipedia.org|Devil's Pie song article",
  },
  'https://en.wikipedia.org/wiki/The_Root': {
    label: 'Wikipedia The Root article',
    title: 'The Root - Wikipedia',
    identity: 'en.wikipedia.org|The Root song article',
  },
  'https://en.wikipedia.org/wiki/Untitled_(How_Does_It_Feel)': {
    label: 'Wikipedia Untitled (How Does It Feel) article',
    title: 'Untitled (How Does It Feel) - Wikipedia',
    identity: 'en.wikipedia.org|Untitled (How Does It Feel) song article',
  },
  "https://en.wikipedia.org/wiki/Feel_Like_Makin'_Love_(Roberta_Flack_song)": {
    label: "Wikipedia Feel Like Makin' Love article",
    title: "Feel Like Makin' Love (Roberta Flack song) - Wikipedia",
    identity: "en.wikipedia.org|Feel Like Makin' Love song article",
  },
};

const claims = {
  'Playa Playa': 'Wikipedia quotes bassist Pino Palladino recalling that for "Playa Playa" he was thinking about Stevie Wonder in the choruses and P-Funk in the verses.',
  "Devil's Pie": "Wikipedia states that DJ Premier originally made \"Devil's Pie\" for Canibus, then offered it to D'Angelo after Canibus rejected it.",
  'Left and Right (feat. Redman & Method Man)': 'Wikipedia describes "Left & Right" as a funky party jam featuring Method Man and Redman, who exchange verses while D\'Angelo sings the verses and chorus.',
  'The Line': 'Wikipedia describes "The Line" as an introspective, downtempo and spiritual track whose lyrics deal with unnamed adversity.',
  'Send It On': 'Wikipedia states that "Send It On" was co-written by Angie Stone, concerns honesty and faith in love, and features Roy Hargrove on flugelhorn.',
  'Chicken Grease': 'Wikipedia states that "Chicken Grease" takes its name from a Prince term for a guitarist playing a minor ninth chord in sixteenth notes.',
  "One Mo'Gin": 'Wikipedia states that the title "One Mo\'Gin" is a southern conflation of "One More Time" and "Again", and that its narrator reminisces about a former lover.',
  'The Root': 'Wikipedia states that Charlie Hunter simultaneously plays the bass line and guitar solo on "The Root".',
  'Spanish Joint': 'Wikipedia states that Roy Hargrove co-wrote "Spanish Joint" and describes it as a high-tempo, salsa-infused track about karma.',
  "Feel Like Makin' Love": "Wikipedia states that D'Angelo's recording of \"Feel Like Makin' Love\" was initially planned as a duet with Lauryn Hill.",
  "Greatdayndamornin' / Booty": 'Wikipedia states that "Greatdayndamornin\' / Booty" features Questlove placing double rimshots behind the beat.',
  'Untitled (How Does It Feel)': 'Wikipedia states that "Untitled (How Does It Feel)" was originally intended as a tribute to Prince.',
  'Africa': 'Wikipedia states that "Africa" was originally written in honor of D\'Angelo\'s son, Michael Archer Jr.',
};

const byTrack = new Map();
for (const result of report.results ?? []) {
  if (result.status !== 'collected') continue;
  const meta = sourceMeta[result.canonicalUrl];
  if (!meta) throw new Error(`Missing source metadata for ${result.canonicalUrl}`);
  for (const item of result.claims ?? []) {
    if (byTrack.has(item.trackTitle)) throw new Error(`Duplicate evidence for ${item.trackTitle}`);
    byTrack.set(item.trackTitle, { result, item, meta });
  }
}

const catalog = JSON.parse(readFileSync('src/data/catalog.generated.json', 'utf8'));
const album = catalog.albums.find((candidate) => candidate.id === ALBUM_ID);
if (!album) throw new Error(`Missing catalog album ${ALBUM_ID}`);
if (album.tracks.length !== 13) throw new Error(`Expected 13 catalog tracks, found ${album.tracks.length}`);

const trackEntries = album.tracks.map((track) => {
  const evidence = byTrack.get(track.title);
  const claim = claims[track.title];
  if (!evidence || !claim) throw new Error(`Missing researched evidence or claim for ${track.title}`);
  const { result, item, meta } = evidence;
  return {
    albumId: ALBUM_ID,
    discNumber: track.discNumber,
    trackNumber: track.trackNumber,
    trackTitle: track.title,
    evidenceLevel: 'documented',
    verifiedFacts: [{
      claimId: `${ALBUM_ID}:${track.discNumber}:${track.trackNumber}:fact-1`,
      claim,
      sourceRefs: [{
        label: meta.label,
        title: meta.title,
        url: result.canonicalUrl,
        sourceIdentity: meta.identity,
        extractType: 'verbatim',
        evidenceStatus: 'retrieved',
        checkedAt: CHECKED_AT,
        extract: item.retainedExtract,
        artifactId: result.artifactId,
        section: item.section,
      }],
    }],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    limitations: [
      'One attributed recording, songwriting, performance, or lyrical-context statement retained; no broader musical analysis or complete session reconstruction is claimed.',
    ],
    sourceRefs: [{ label: meta.label, title: meta.title, url: result.canonicalUrl }],
  };
});

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all thirteen Voodoo catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'hermes-rank28-track-encyclopedia-author',
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
console.log(`Wrote authoring file with ${trackEntries.length} documented tracks.`);

// Generate rank-27 authoring from the mechanically collected evidence report.
import { readFileSync, writeFileSync } from 'node:fs';

const ALBUM_ID = '027-wu-tang-clan-enter-the-wu-tang-36-chambers-bd9ce00b';
const CHECKED_AT = '2026-09-03';
const report = JSON.parse(readFileSync('reports/rank27-wutang-source-collection.json', 'utf8'));

const sourceMetadata = {
  'https://en.wikipedia.org/wiki/Enter_the_Wu-Tang_(36_Chambers)': {
    label: 'Wikipedia Enter the Wu-Tang (36 Chambers) article',
    title: 'Enter the Wu-Tang (36 Chambers) - Wikipedia',
    identity: 'en.wikipedia.org|Enter the Wu-Tang (36 Chambers) album article',
  },
  'https://en.wikipedia.org/wiki/Can_It_Be_All_So_Simple': {
    label: 'Wikipedia Can It Be All So Simple article',
    title: 'Can It Be All So Simple - Wikipedia',
    identity: 'en.wikipedia.org|Can It Be All So Simple song article',
  },
  'https://en.wikipedia.org/wiki/Method_Man_(song)': {
    label: 'Wikipedia Method Man song article',
    title: 'Method Man (song) - Wikipedia',
    identity: 'en.wikipedia.org|Method Man song article',
  },
  'https://en.wikipedia.org/wiki/Da_Mystery_of_Chessboxin%27': {
    label: 'Wikipedia Da Mystery of Chessboxin article',
    title: "Da Mystery of Chessboxin' - Wikipedia",
    identity: 'en.wikipedia.org|Da Mystery of Chessboxin song article',
  },
  'https://en.wikipedia.org/wiki/C.R.E.A.M.': {
    label: 'Wikipedia C.R.E.A.M. article',
    title: 'C.R.E.A.M. - Wikipedia',
    identity: 'en.wikipedia.org|C.R.E.A.M. song article',
  },
  'https://en.wikipedia.org/wiki/Protect_Ya_Neck': {
    label: 'Wikipedia Protect Ya Neck article',
    title: 'Protect Ya Neck - Wikipedia',
    identity: 'en.wikipedia.org|Protect Ya Neck song article',
  },
  'https://theface.com/music/rza-interview-wu-tang-clan-final-tour-london': {
    label: 'The Face RZA interview (archived 2026-04-11)',
    title: "RZA dissects Wu-Tang's early bangers - The Face",
    identity: 'theface.com|RZA dissects Wu-Tang early bangers|Wayback 20260411024618',
  },
};

const claims = new Map([
  ["Shame On a Nuh (feat. Raekwon, Ol' Dirty Bastard & Method Man)", 'For "Shame," The Face quotes RZA saying, "And he goes and do that shit in one fucking take, bro."'],
  ['Clan In Da Front (feat. RZA & GZA)', 'Wikipedia identifies GZA\'s "Clan in da Front" and "Method Man" as the only album songs that do not feature multiple rappers contributing verses.'],
  ['Can It Be All So Simple (Radio Edit)', 'Wikipedia states that RZA\'s production for "Can It Be All So Simple" samples Gladys Knight & the Pips\' cover of "The Way We Were."'],
  ['Method Man (feat. Method Man, Raekwon, GZA, RZA & Ghostface Killah)', 'Wikipedia states that Method Man wrote his rhymes after hearing Michael Jackson\'s cover of the Beatles\' "Come Together," on which he based half of the hook.'],
  ["Da Mystery of Chessboxin' (feat. Method Man, U-God, Inspectah Deck, Raekwon, Ol' Dirty Bastard, Ghostface Killah & Masta Killa) [Radio Edit]", 'Wikipedia states that Masta Killa wrote his first-ever rhyme for "Da Mystery of Chessboxin\'."'],
  ["Wu-Tang Clan Ain't Nuthing Ta F' Wit (feat. RZA, Inspectah Deck & Method Man)", 'Wikipedia states that Method Man received a co-production credit for "Wu-Tang Clan Ain\'t Nuthing ta F\' Wit."'],
  ['C.R.E.A.M. (feat. Method Man, Raekwon, Inspectah Deck & Buddha Monk)', 'Wikipedia states that "C.R.E.A.M." was originally titled "Lifestyles of the Mega-Rich."'],
  ["Protect Ya Neck (feat. RZA, Method Man, Inspectah Deck, Raekwon, U-God, Ol' Dirty Bastard, Ghostface Killah & GZA)", 'Wikipedia states that "Protect Ya Neck" was first recorded over a different beat and with its verses in a different order before RZA changed the beat and rearranged the verses.'],
  ['Tearz (feat. RZA & Ghostface Killah)', 'Wikipedia states that "Tearz" tells two stories: RZA\'s little brother being shot and Ghostface Killah recounting a man contracting HIV after unprotected sex.'],
]);

const collected = new Map();
for (const result of report.results ?? []) {
  if (result.status !== 'collected') throw new Error(`Source collection incomplete: ${result.canonicalUrl}`);
  const metadata = sourceMetadata[result.canonicalUrl];
  if (!metadata) throw new Error(`Unexpected collected source ${result.canonicalUrl}`);
  for (const item of result.claims ?? []) {
    if (collected.has(item.trackTitle)) throw new Error(`Duplicate collected evidence for ${item.trackTitle}`);
    collected.set(item.trackTitle, { result, item, metadata });
  }
}
if (collected.size !== claims.size) throw new Error(`Expected ${claims.size} collected track excerpts; found ${collected.size}`);

const trackEntries = [...claims].map(([trackTitle, claim], index) => {
  const evidence = collected.get(trackTitle);
  if (!evidence) throw new Error(`Missing collected evidence for ${trackTitle}`);
  const { result, item, metadata } = evidence;
  const sourceRef = {
    label: metadata.label,
    title: metadata.title,
    url: result.canonicalUrl,
    sourceIdentity: metadata.identity,
    extractType: 'verbatim',
    evidenceStatus: 'retrieved',
    checkedAt: CHECKED_AT,
    extract: item.retainedExtract,
    artifactId: result.artifactId,
    section: item.section,
  };
  return {
    albumId: ALBUM_ID,
    discNumber: 1,
    trackNumber: index + 1,
    trackTitle,
    evidenceLevel: 'documented',
    verifiedFacts: [{ claimId: `${ALBUM_ID}:1:${index + 1}:fact-1`, claim, sourceRefs: [sourceRef] }],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    limitations: ['One attributed track-specific statement retained; no unsupported musical analysis, lyric interpretation, or complete session reconstruction is claimed.'],
    sourceRefs: [{ label: metadata.label, title: metadata.title, url: result.canonicalUrl }],
  };
});

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all nine catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank27-track-encyclopedia-author',
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
console.log(`Wrote rank-27 authoring file with ${trackEntries.length} documented tracks.`);

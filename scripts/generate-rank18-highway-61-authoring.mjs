// Generate rank-18 authoring file for Bob Dylan — Highway 61 Revisited.
// Excerpts are verbatim from the fetched Wikipedia "Highway 61 Revisited"
// album article (pandoc extraction). All 9 catalog tracks are documented with
// one narrow track-specific claim each.
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '018-bob-dylan-highway-61-revisited-bd0599b4';
const CHECKED_AT = '2026-09-03';

const ALBUM_URL = 'https://en.wikipedia.org/wiki/Highway_61_Revisited';
const ALBUM_LABEL = 'Wikipedia Highway 61 Revisited article';
const ALBUM_TITLE = 'Highway 61 Revisited - Wikipedia';
const ALBUM_IDENTITY = 'en.wikipedia.org|Highway 61 Revisited album article';

const SOURCE_META = {
  album: { url: ALBUM_URL, label: ALBUM_LABEL, title: ALBUM_TITLE, identity: ALBUM_IDENTITY },
};

// Content-addressed source artifact (byte-identical on disk) and the exact
// character offsets of each retained excerpt within the artifact's retainedText.
const ALBUM_ARTIFACT = 'c028e72aecc11deff7768020936df05dfcf17e77f171dbbd0d92505fa1ee0e3e';

// Documented tracks: { disc, n, title, source, claim, excerpt, start, end }
const documented = [
  { disc: 1, n: 1, title: 'Like a Rolling Stone', source: 'album',
    claim: 'Wikipedia states that Highway 61 Revisited opens with "Like a Rolling Stone", which has been described as revolutionary in its combination of electric guitar licks, organ chords, and Dylan\'s voice.',
    excerpt: 'Highway 61 Revisited opens with "Like a Rolling Stone", which has been described as revolutionary in its combination of electric guitar licks, organ chords, and Dylan\'s voice,',
    start: 500, end: 675 },
  { disc: 1, n: 2, title: 'Tombstone Blues', source: 'album',
    claim: 'Wikipedia describes "Tombstone Blues" as a fast-paced, two-chord blues song driven by Michael Bloomfield\'s lead guitar that uses a parade of historical characters.',
    excerpt: 'The fast-paced, two-chord blues song "Tombstone Blues", driven by Michael Bloomfield\'s lead guitar, uses a parade of historical characters',
    start: 1712, end: 1850 },
  { disc: 1, n: 3, title: 'It Takes a Lot to Laugh, It Takes a Train to Cry', source: 'album',
    claim: 'Wikipedia states that, according to critic Andy Gill, "It Takes a Lot to Laugh, It Takes a Train to Cry" illustrates Dylan\'s creativity in the way it adapts an old blues song.',
    excerpt: 'According to critic Andy Gill, "It Takes A Lot To Laugh" illustrates Dylan\'s creativity, both in the way it adapts an old blues song,',
    start: 2756, end: 2889 },
  { disc: 1, n: 4, title: 'From a Buick 6', source: 'album',
    claim: 'Wikipedia states that AllMusic critic Bill Janovitz describes "From a Buick 6" as a "raucous, up-tempo blues" played "almost recklessly".',
    excerpt: 'AllMusic critic Bill Janovitz describes "From a Buick 6" as a "raucous, up-tempo blues", which is played "almost recklessly".',
    start: 3996, end: 4121 },
  { disc: 1, n: 5, title: 'Ballad of a Thin Man', source: 'album',
    claim: 'Wikipedia states that "Ballad of a Thin Man" is driven by Dylan\'s piano, which contrasts with "the spooky organ riffs" played by Al Kooper.',
    excerpt: '"Ballad of a Thin Man" is driven by Dylan\'s piano, which contrasts with "the spooky organ riffs" played by Al Kooper.',
    start: 4798, end: 4915 },
  { disc: 1, n: 6, title: 'Queen Jane Approximately', source: 'album',
    claim: 'Wikipedia states that Polizzotti, in his study of Highway 61 Revisited, writes that the opening track of Side Two, "Queen Jane Approximately", is in a similar vein to "Like a Rolling Stone".',
    excerpt: 'Polizzotti, in his study of Highway 61 Revisited, writes that the opening track of Side Two, "Queen Jane Approximately" is in a similar vein to "Like a Rolling Stone",',
    start: 5718, end: 5885 },
  { disc: 1, n: 7, title: 'Highway 61 Revisited', source: 'album',
    claim: 'Wikipedia states that Dylan commences the title song "Highway 61 Revisited" with the words "Oh God said to Abraham, \'Kill me a son\'/Abe says, \'Man, you must be puttin\' me on\'".',
    excerpt: 'Dylan commences the title song of his album, "Highway 61 Revisited", with the words "Oh God said to Abraham, \'Kill me a son\'/Abe says, \'Man, you must be puttin\' me on\'".',
    start: 6679, end: 6848 },
  { disc: 1, n: 8, title: "Just Like Tom Thumb's Blues", source: 'album',
    claim: 'Wikipedia states that "Just Like Tom Thumb\'s Blues" has six verses and no chorus.',
    excerpt: '"Just Like Tom Thumb\'s Blues" has six verses and no chorus.',
    start: 7653, end: 7712 },
  { disc: 1, n: 9, title: 'Desolation Row', source: 'album',
    claim: 'Wikipedia states that Gill has characterized "Desolation Row" as "an 11-minute epic of entropy, which takes the form of a Fellini-esque parade of grotesques and oddities featuring a huge cast of iconic characters".',
    excerpt: 'Gill has characterized "Desolation Row" as "an 11-minute epic of entropy, which takes the form of a Fellini-esque parade of grotesques and oddities featuring a huge cast of iconic characters".',
    start: 9112, end: 9304 },
];

const trackEntries = [];

for (const t of documented) {
  const src = SOURCE_META[t.source];
  const artifactId = ALBUM_ARTIFACT;
  trackEntries.push({
    albumId: ALBUM_ID,
    discNumber: t.disc,
    trackNumber: t.n,
    trackTitle: t.title,
    evidenceLevel: 'documented',
    verifiedFacts: [
      {
        claimId: `${ALBUM_ID}:${t.disc}:${t.n}:fact-1`,
        claim: t.claim,
        sourceRefs: [
          {
            label: src.label,
            title: src.title,
            url: src.url,
            sourceIdentity: src.identity,
            extractType: 'verbatim',
            evidenceStatus: 'retrieved',
            checkedAt: CHECKED_AT,
            extract: t.excerpt,
            artifactId,
            section: { kind: 'character-offsets', start: t.start, end: t.end },
          },
        ],
      },
    ],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    limitations: [
      'One attributed recording/songwriting statement retained; no musical analysis, lyric interpretation, or complete session reconstruction is claimed.',
    ],
    sourceRefs: [
      { label: src.label, title: src.title, url: src.url },
    ],
  });
}

// Sort to match catalog order (disc, then track number).
trackEntries.sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber);

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all nine Highway 61 Revisited catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank18-track-encyclopedia-author',
    model: 'gpt-5-codex',
  },
  reviewMetadata: {
    reviewedAt: null,
    reviewer: null,
    notes: '',
  },
  contentHash: '',
};

const doc = {
  metadata: {
    version: '1.0.0-candidate',
    generatedAt: '2026-09-03T00:00:00.000Z',
    albumCount: 1,
  },
  entries: {
    [ALBUM_ID]: entry,
  },
};

writeFileSync(
  `src/data/track-encyclopedia/authoring/${ALBUM_ID}.json`,
  `${JSON.stringify(doc, null, 2)}\n`,
);
console.log(`Wrote authoring file with ${trackEntries.length} tracks (${documented.length} documented).`);

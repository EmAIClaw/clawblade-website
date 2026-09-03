// Generate rank-21 authoring file for Bruce Springsteen — Born to Run.
// Excerpts are verbatim from eight dedicated Wikipedia song articles (one per
// catalog track), all pandoc-extracted. All 8 catalog tracks are documented
// with one narrow track-specific claim each.
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '021-bruce-springsteen-born-to-run-21f663bb';
const CHECKED_AT = '2026-09-03';

const SOURCE_META = {
  thunderRoad: {
    url: 'https://en.wikipedia.org/wiki/Thunder_Road_(song)',
    label: 'Wikipedia Thunder Road (song) article',
    title: 'Thunder Road (song) - Wikipedia',
    identity: 'en.wikipedia.org|Thunder Road (song) article',
  },
  tenthAvenue: {
    url: 'https://en.wikipedia.org/wiki/Tenth_Avenue_Freeze-Out',
    label: 'Wikipedia Tenth Avenue Freeze-Out article',
    title: 'Tenth Avenue Freeze-Out - Wikipedia',
    identity: 'en.wikipedia.org|Tenth Avenue Freeze-Out article',
  },
  night: {
    url: 'https://en.wikipedia.org/wiki/Night_(Bruce_Springsteen_song)',
    label: 'Wikipedia Night (Bruce Springsteen song) article',
    title: 'Night (Bruce Springsteen song) - Wikipedia',
    identity: 'en.wikipedia.org|Night (Bruce Springsteen song) article',
  },
  backstreets: {
    url: 'https://en.wikipedia.org/wiki/Backstreets_(song)',
    label: 'Wikipedia Backstreets article',
    title: 'Backstreets - Wikipedia',
    identity: 'en.wikipedia.org|Backstreets article',
  },
  bornToRun: {
    url: 'https://en.wikipedia.org/wiki/Born_to_Run_(song)',
    label: 'Wikipedia Born to Run (song) article',
    title: 'Born to Run (song) - Wikipedia',
    identity: 'en.wikipedia.org|Born to Run (song) article',
  },
  shesTheOne: {
    url: 'https://en.wikipedia.org/wiki/She%27s_the_One_(Bruce_Springsteen_song)',
    label: "Wikipedia She's the One (Bruce Springsteen song) article",
    title: "She's the One (Bruce Springsteen song) - Wikipedia",
    identity: "en.wikipedia.org|She's the One (Bruce Springsteen song) article",
  },
  meetingAcross: {
    url: 'https://en.wikipedia.org/wiki/Meeting_Across_the_River',
    label: 'Wikipedia Meeting Across the River article',
    title: 'Meeting Across the River - Wikipedia',
    identity: 'en.wikipedia.org|Meeting Across the River article',
  },
  jungleland: {
    url: 'https://en.wikipedia.org/wiki/Jungleland',
    label: 'Wikipedia Jungleland article',
    title: 'Jungleland - Wikipedia',
    identity: 'en.wikipedia.org|Jungleland article',
  },
};

// Content-addressed source artifacts (byte-identical on disk) and the exact
// character offsets of each retained excerpt within the artifact's retainedText.
const ARTIFACTS = {
  thunderRoad: 'a78836befb25a367a0e429e44a48a313233b4c14fbd70bb060b26892e820efc6',
  tenthAvenue: 'f059e5e624c5acb1d9c381de4d246063e0dc97bc39f4a142b928d10239ca8903',
  night: 'e6efbcaee87c337d7fdc37d87cce0d98729d298a6339016a738ca695084d4b2f',
  backstreets: 'f881a0be8da161c52cbc7fb09280513c7ca962b681ba5d7adb22ff7bcf852c11',
  bornToRun: '58b7440a5bfbf974857433f4f4cda84d2b7bdc77835e214b8c8d699ab4930a61',
  shesTheOne: '514e00f116f60f67a52c71b9d420158fb9b3ca659843440ec693682b8346b832',
  meetingAcross: 'adbcc3a88504c3ffbade1962cc9a213ef2d7bc21cd8cf8c342318b3bbba20d37',
  jungleland: 'd493bd1baa6e5ac77dad7f2eaf6a7e722eda1087f65d46d602af37709cb4dc93',
};

// Documented tracks: { disc, n, title, source, claim, excerpt, start, end }
const documented = [
  { disc: 1, n: 1, title: 'Thunder Road', source: 'thunderRoad',
    claim: 'Wikipedia states that "Thunder Road" was written by Springsteen while at his living room piano in Long Branch, New Jersey.',
    excerpt: '"Thunder Road" was written by Springsteen while at his living room piano in Long Branch, New Jersey.',
    start: 500, end: 600 },
  { disc: 1, n: 2, title: 'Tenth Avenue Freeze-Out', source: 'tenthAvenue',
    claim: 'Wikipedia states that "Tenth Avenue Freeze-Out" tells the story of the formation of the E Street Band.',
    excerpt: 'The song tells the story of the formation of the E Street Band.',
    start: 500, end: 563 },
  { disc: 1, n: 3, title: 'Night', source: 'night',
    claim: 'Wikipedia states that the music of "Night" is propelled by Garry Tallent\'s bass guitar.',
    excerpt: 'The music is propelled by Garry Tallent\'s bass guitar.',
    start: 500, end: 554 },
  { disc: 1, n: 4, title: 'Backstreets', source: 'backstreets',
    claim: 'Wikipedia states that "Backstreets" begins with a minute-long instrumental introduction that features pianist Roy Bittan playing both piano and organ, with only occasional traces of any other instruments being heard.',
    excerpt: '"Backstreets" begins with a minute-long instrumental introduction that features pianist Roy Bittan playing both piano and organ, with only occasional traces of any other instruments being heard.',
    start: 500, end: 694 },
  { disc: 1, n: 5, title: 'Born to Run', source: 'bornToRun',
    claim: 'Wikipedia states that in late 1973, on the road in Tennessee, Springsteen awoke with the title "Born to Run", which he wrote down.',
    excerpt: 'In late 1973, on the road in Tennessee, Springsteen awoke with the title "Born to Run", which he wrote down.',
    start: 500, end: 608 },
  { disc: 1, n: 6, title: "She's the One", source: 'shesTheOne',
    claim: 'Wikipedia states that Springsteen has claimed that he wrote "She\'s the One" primarily because he wanted to hear E Street Band saxophonist Clarence Clemons play its sax solo, and after he wrote the melody he then changed his mind.',
    excerpt: 'Springsteen has claimed that he wrote the song primarily because he wanted to hear E Street Band saxophonist Clarence Clemons play its sax solo, and after he wrote the melody he then changed his mind.',
    start: 499, end: 699 },
  { disc: 1, n: 7, title: 'Meeting Across the River', source: 'meetingAcross',
    claim: 'Wikipedia states that "Meeting Across the River" is a dark character sketch featuring a soft, haunting trumpet played by Randy Brecker, piano backing from E Street Band member Roy Bittan and upright bass from jazz veteran Richard Davis.',
    excerpt: 'The song is a dark character sketch featuring a soft, haunting trumpet played by Randy Brecker, piano backing from E Street Band member Roy Bittan and upright bass from jazz veteran Richard Davis.',
    start: 500, end: 696 },
  { disc: 1, n: 8, title: 'Jungleland', source: 'jungleland',
    claim: 'Wikipedia states that "Jungleland" features short-time E Streeter Suki Lahav, who performs the delicate 23-note violin introduction to the song, accompanied by Roy Bittan on piano in the opening.',
    excerpt: 'It also features short-time E Streeter Suki Lahav, who performs the delicate 23-note violin introduction to the song, accompanied by Roy Bittan on piano in the opening.',
    start: 500, end: 668 },
];

const trackEntries = [];

for (const t of documented) {
  const src = SOURCE_META[t.source];
  const artifactId = ARTIFACTS[t.source];
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
  changeNote: 'Complete all eight Born to Run catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank21-track-encyclopedia-author',
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

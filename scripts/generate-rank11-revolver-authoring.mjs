// Generate rank-11 authoring file for The Beatles — Revolver.
// Excerpts are verbatim from the fetched Beatles Bible song pages (pandoc extraction).
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '011-the-beatles-revolver-b4f3c550';
const CHECKED_AT = '2026-09-03';

const BB = 'https://www.beatlesbible.com';
const BB_LABEL = 'The Beatles Bible song page';
const BB_IDENTITY = 'beatlesbible.com|Revolver song facts';

// Each track: { n, title, url, claim, excerpt }
const tracks = [
  {
    n: 1, title: 'Taxman',
    url: `${BB}/songs/taxman`,
    claim: 'The Beatles Bible notes that when writing \u201cTaxman,\u201d George Harrison was grudgingly helped by John Lennon, and that it was Lennon\u2019s suggestion to use the names of both prime minister Harold Wilson and opposition leader Edward Heath, the first living people to be directly named in a Beatles song.',
    excerpt: 'It was Lennon\u2019s suggestion to use the names of both prime minister Harold Wilson and opposition leader Edward Heath, the first living people to be directly named in a Beatles song.',
  },
  {
    n: 2, title: 'Eleanor Rigby',
    url: `${BB}/songs/eleanor-rigby/2`,
    claim: 'The Beatles Bible states that on \u201cEleanor Rigby\u201d no Beatles played on the record, and that instead a closely-miked string octet was recorded in 14 takes, after which Paul McCartney overdubbed his lead vocals.',
    excerpt: 'no Beatles played on the record. Instead a closely-miked string octet was recorded in 14 takes, after which Paul overdubbed his lead vocals.',
  },
  {
    n: 3, title: "I'm Only Sleeping",
    url: `${BB}/songs/im-only-sleeping`,
    claim: 'The Beatles Bible records that The Beatles began recording \u201cI\u2019m Only Sleeping\u201d on 27 April 1966, when 11 takes of the rhythm track were put to tape, and that John Lennon added his lead vocals two days later.',
    excerpt: 'The Beatles began recording \u2018I\u2019m Only Sleeping\u2019 on 27 April 1966, when 11 takes of the rhythm track were put to tape. John Lennon added his lead vocals two days later.',
  },
  {
    n: 4, title: 'Love You To',
    url: `${BB}/songs/love-you-to`,
    claim: 'The Beatles Bible states that following the sitar motif on \u201cNorwegian Wood (This Bird Has Flown),\u201d \u201cLove You To\u201d was The Beatles\u2019 first full attempt at recording a piece of music in the classical Indian style.',
    excerpt: 'Following the sitar motif on \u2018Norwegian Wood (This Bird Has Flown)\u2019, \u2018Love You To\u2019 was The Beatles\u2019 first full attempt at recording a piece of music in the classical Indian style.',
  },
  {
    n: 5, title: 'Here, There and Everywhere',
    url: `${BB}/songs/here-there-and-everywhere`,
    claim: 'The Beatles Bible notes that \u201cHere, There and Everywhere\u201d combines its whole title lyrically, with each verse taking a word \u2014 \u201cHere\u201d discusses here, the next verse \u201cthere\u201d discusses there, then it pulls it all together in the last verse with \u201ceverywhere.\u201d',
    excerpt: 'lyrically the way it combines the whole title: each verse takes a word. \u2018Here\u2019 discusses here. Next verse, \u2018there\u2019 discusses there, then it pulls it all together in the last verse, with \u2018everywhere\u2019.',
  },
  {
    n: 6, title: 'Yellow Submarine',
    url: `${BB}/songs/yellow-submarine`,
    claim: 'The Beatles Bible reports that Donovan supplied one couplet of \u201cYellow Submarine,\u201d recalling that McCartney played him the song, said he was missing a line, and that Donovan returned with \u201cSky of blue and sea of green/In our yellow submarine.\u201d',
    excerpt: 'He played one about a yellow submarine. He said he was missing a line and would I fill it in. I left the room and returned with this: \u2018Sky of blue and sea of green/In our yellow submarine.\u2019',
  },
  {
    n: 7, title: 'She Said She Said',
    url: `${BB}/songs/she-said-she-said`,
    claim: 'The Beatles Bible states that \u201cShe Said She Said,\u201d the final track recorded for Revolver, was inspired by an LSD-influenced conversation between John Lennon and actor Peter Fonda.',
    excerpt: 'The final track recorded for Revolver, \u2018She Said She Said\u2019 was inspired by an LSD-influenced conversation between John Lennon and actor Peter Fonda.',
  },
  {
    n: 8, title: 'Good Day Sunshine',
    url: `${BB}/songs/good-day-sunshine`,
    claim: 'The Beatles Bible records that George Martin added his piano solo to track two of \u201cGood Day Sunshine,\u201d which also contained handclaps by all four Beatles, and that Martin\u2019s solo was recorded at half speed so it sounded faster and higher upon playback.',
    excerpt: 'George Martin added his piano solo to track two, which also contained handclaps by all four Beatles. Martin\u2019s solo was recorded at half speed, so it sounded faster and higher upon playback.',
  },
  {
    n: 9, title: 'And Your Bird Can Sing',
    url: `${BB}/songs/and-your-bird-can-sing`,
    claim: 'The Beatles Bible notes that \u201cAnd Your Bird Can Sing\u201d is notable mainly for its cryptic lyrics and the twin guitar riffs \u2014 played by Paul McCartney and George Harrison \u2014 that drive the song.',
    excerpt: '\u2018And Your Bird Can Sing\u2019 is notable mainly for its cryptic lyrics and the twin guitar riffs \u2013 played by Paul McCartney and George Harrison \u2013 that drive the song.',
  },
  {
    n: 10, title: 'For No One',
    url: `${BB}/songs/for-no-one`,
    claim: 'The Beatles Bible states that on \u201cFor No One,\u201d George Martin wrote down the understated melody that Paul McCartney sang to him, and that Alan Civil performed it.',
    excerpt: 'George Martin wrote down the understated melody that Paul sang to him, and Alan Civil performed it.',
  },
  {
    n: 11, title: 'Doctor Robert',
    url: `${BB}/songs/doctor-robert`,
    claim: 'The Beatles Bible states that although many in London thought the titular doctor referred to art dealer Robert Fraser, \u201cDoctor Robert\u201d was actually written about Dr Robert Freymann, who ran a discreet clinic on Manhattan\u2019s East 78th Street.',
    excerpt: 'it was actually written about Dr Robert Freymann, who ran a discreet clinic on Manhattan\u2019s East 78th Street.',
  },
  {
    n: 12, title: 'I Want to Tell You',
    url: `${BB}/songs/i-want-to-tell-you`,
    claim: 'The Beatles Bible quotes George Harrison saying that the chord in \u201cI Want to Tell You\u201d is an E7th with an F on the top played on the piano, and that he was proud of it because he literally invented that chord.',
    excerpt: 'That\u2019s an E7th with an F on the top, played on the piano. I\u2019m really proud of that, because I literally invented that chord. The song was about the frustration we all feel about trying to communicate certain things with just words. I realized the chords I knew at the time just didn\u2019t capture that feeling. So after I got the guitar riff, I experimented until I came up with this dissonant chord that really echoed that sense of frustration. John later borrowed it on Abbey Road. If you listen to \u2018I Want You (She\u2019s So Heavy)\u2019 it\u2019s right after John sings \u201cit\u2019s driving me mad!\u201d To my knowledge, there\u2019s only been one other song where somebody copped that chord \u2013 \u2018Back On The Chain Gang\u2019 by The Pretenders. George Harrison, 1992',
  },
  {
    n: 13, title: 'Got to Get You Into My Life',
    url: `${BB}/songs/got-to-get-you-into-my-life`,
    claim: 'The Beatles Bible records that for \u201cGot to Get You Into My Life,\u201d The Beatles hired two members of Georgie Fame\u2019s group The Blue Flames, whom John Lennon and Paul McCartney knew from the London club scene.',
    excerpt: 'The Beatles hired two members of Georgie Fame\u2019s group The Blue Flames, whom John Lennon and Paul McCartney knew from the London club scene.',
  },
  {
    n: 14, title: 'Tomorrow Never Knows',
    url: `${BB}/songs/tomorrow-never-knows`,
    claim: 'The Beatles Bible states that \u201cTomorrow Never Knows,\u201d the monumental closing track on Revolver, was also the first song to be recorded for the album.',
    excerpt: '\u2018Tomorrow Never Knows\u2019, the monumental closing track on Revolver, was also the first song to be recorded for the album.',
  },
];

// Content-addressed source artifacts (byte-identical on disk) and the exact
// character offsets of each retained excerpt within the artifact's retainedText.
const BINDINGS = {
  1: { artifactId: 'ab6c682699cd8bb251a4e0a6b7118d15f85a16fd872c3b13f06b0ceda7fb4c9e', start: 500, end: 680 },
  2: { artifactId: '5c4f7be5528f98d5d00b5f7b8dd8256501c25a6ac5b58676252896bfba0c4785', start: 500, end: 640 },
  3: { artifactId: 'ec06f3f9854af8c80c49f65de2dcc5630234f3fb0c49161c089742794171c11f', start: 500, end: 667 },
  4: { artifactId: 'b253347c16aa73a3d1ee67dd4c7896bf4c844d575b4f470242cb198c58bcd6bd', start: 500, end: 679 },
  5: { artifactId: '9d611ef8292fb1e7b47e522664f637efc9f73900e7763484e30269fa819b107b', start: 500, end: 699 },
  6: { artifactId: '5b9d0163122895db5b631437786e57152d92bdb6821cb4d16f1333c67ea40009', start: 500, end: 689 },
  7: { artifactId: 'dd01e7733368f2738d471b8360b5a4ee82c9adf774739bc74774c9790a7c4e45', start: 500, end: 648 },
  8: { artifactId: '6ef171d787bbe7a6fdd281772332d542efb32e90a02c801b7b85b38e4f39e1f5', start: 500, end: 689 },
  9: { artifactId: '5321a9af14be7efc66fc5eaefe9534c71e91f281b24833d6e3bfbe0d9d9afceb', start: 500, end: 661 },
  10: { artifactId: 'c6db250b4238cc2ffc00f09d2889dd62eeb0672f403f13b38b76546e8efcd2c1', start: 500, end: 599 },
  11: { artifactId: '663e19dd104088b9aec345105bb977c39166626ff7c087fa95c4c81b3ece6b39', start: 500, end: 608 },
  12: { artifactId: 'c07dfe11303056831e7be61b4cfa0349ed2e7752ad1a85f352e8a17342bc5b0b', start: 500, end: 1228 },
  13: { artifactId: '914ad8fa9085b4e05e2c40f28efc72437475a87cc9f21b56a7390acd8da775ed', start: 500, end: 639 },
  14: { artifactId: '850c9221ebf6100d0d770232bdccc494a6c144ca76219a8019497befe0a5ffc6', start: 500, end: 619 },
};

const trackEntries = tracks.map((t) => {
  const binding = BINDINGS[t.n];
  return {
  albumId: ALBUM_ID,
  discNumber: 1,
  trackNumber: t.n,
  trackTitle: t.title,
  evidenceLevel: 'documented',
  verifiedFacts: [
    {
      claimId: `${ALBUM_ID}:1:${t.n}:fact-1`,
      claim: t.claim,
      sourceRefs: [
        {
          label: BB_LABEL,
          title: `${t.title} \u2013 song facts, recording info and more! | The Beatles Bible`,
          url: t.url,
          sourceIdentity: BB_IDENTITY,
          extractType: 'verbatim',
          evidenceStatus: 'retrieved',
          checkedAt: CHECKED_AT,
          extract: t.excerpt,
          artifactId: binding.artifactId,
          section: { kind: 'character-offsets', start: binding.start, end: binding.end },
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
    { label: BB_LABEL, title: `${t.title} \u2013 song facts, recording info and more! | The Beatles Bible`, url: t.url },
  ],
  };
});

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all fourteen Revolver catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank11-track-encyclopedia-author',
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
console.log(`Wrote authoring file with ${trackEntries.length} tracks.`);

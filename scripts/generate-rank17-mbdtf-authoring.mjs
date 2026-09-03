// Generate rank-17 authoring file for Kanye West — My Beautiful Dark Twisted Fantasy.
// Excerpts are verbatim from three fetched Wikipedia sources (pandoc extraction):
//   - Wikipedia "My Beautiful Dark Twisted Fantasy" (12 disc-1 track annotations)
//   - Wikipedia "All of the Lights" (the interlude's relationship to the song)
//   - Wikipedia "See Me Now" (the disc-2 iTunes bonus track)
// All 14 catalog tracks are documented with one narrow track-specific claim each.
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '017-kanye-west-my-beautiful-dark-twisted-fantasy-6d18b087';
const CHECKED_AT = '2026-09-03';

const ALBUM_URL = 'https://en.wikipedia.org/wiki/My_Beautiful_Dark_Twisted_Fantasy';
const ALBUM_LABEL = 'Wikipedia My Beautiful Dark Twisted Fantasy article';
const ALBUM_TITLE = 'My Beautiful Dark Twisted Fantasy - Wikipedia';
const ALBUM_IDENTITY = 'en.wikipedia.org|My Beautiful Dark Twisted Fantasy album article';

const AOTL_URL = 'https://en.wikipedia.org/wiki/All_of_the_Lights';
const AOTL_LABEL = 'Wikipedia All of the Lights article';
const AOTL_TITLE = 'All of the Lights - Wikipedia';
const AOTL_IDENTITY = 'en.wikipedia.org|All of the Lights song article';

const SMN_URL = 'https://en.wikipedia.org/wiki/See_Me_Now';
const SMN_LABEL = 'Wikipedia See Me Now article';
const SMN_TITLE = 'See Me Now - Wikipedia';
const SMN_IDENTITY = 'en.wikipedia.org|See Me Now song article';

const SOURCE_META = {
  album: { url: ALBUM_URL, label: ALBUM_LABEL, title: ALBUM_TITLE, identity: ALBUM_IDENTITY },
  allofthelights: { url: AOTL_URL, label: AOTL_LABEL, title: AOTL_TITLE, identity: AOTL_IDENTITY },
  seemenow: { url: SMN_URL, label: SMN_LABEL, title: SMN_TITLE, identity: SMN_IDENTITY },
};

// Content-addressed source artifacts (byte-identical on disk) and the exact
// character offsets of each retained excerpt within the artifact's retainedText.
const ALBUM_ARTIFACT = '3e13511c15726ba6225229e6c68d7485708da89edc1a13ddefc7cb1f49fc737e';
const AOTL_ARTIFACT = '2f75d80a859c444101b8ed09f732deabf60c29f828dd6125048c809f8d829770';
const SMN_ARTIFACT = '6a658dfcab6f0d999a42ebf855c6274f8156e1112337a75a06b7f808abfc7c40';

// Documented tracks: { disc, n, title, source, claim, excerpt, start, end }
const documented = [
  { disc: 1, n: 1, title: 'Dark Fantasy', source: 'album',
    claim: 'Wikipedia states that the album begins with "Dark Fantasy", opened by rapper Nicki Minaj narrating a rework of Roald Dahl\'s 1982 poem Cinderella.',
    excerpt: 'The album begins with "Dark Fantasy", opened by rapper Nicki Minaj narrating a rework of Roald Dahl\'s 1982 poem Cinderella,',
    start: 500, end: 623 },
  { disc: 1, n: 2, title: 'Gorgeous (feat. Kid Cudi & Raekwon)', source: 'album',
    claim: 'Wikipedia describes "Gorgeous" as an uplifting blues-styled track.',
    excerpt: '"Gorgeous" is an uplifting blues-styled track,',
    start: 1173, end: 1219 },
  { disc: 1, n: 3, title: 'Power', source: 'album',
    claim: 'Wikipedia states that "Power" features a dark production that relies on a sample of King Crimson\'s "21st Century Schizoid Man" (1969).',
    excerpt: '"Power" features a dark production that relies on a sample of King Crimson\'s "21st Century Schizoid Man" (1969),',
    start: 1513, end: 1625 },
  { disc: 1, n: 4, title: 'All of the Lights (Interlude)', source: 'allofthelights',
    claim: 'Wikipedia states that "All of the Lights" is often played along with its accompanying interlude "All of the Lights (Interlude)", which precedes the song on the album\'s tracklist.',
    excerpt: 'It is often played along with its accompanying interlude "All of the Lights (Interlude)", which precedes the song on the album\'s tracklist.',
    start: 500, end: 639 },
  { disc: 1, n: 5, title: 'All of the Lights', source: 'album',
    claim: 'Wikipedia states that West enlisted 11 guest vocalists for "All of the Lights", including Alicia Keys, John Legend, Tony Williams, and Elly Jackson, with Rihanna singing the hook.',
    excerpt: 'West enlisted 11 guest vocalists for the song, including Alicia Keys, John Legend, Tony Williams, and Elly Jackson; Rihanna sings the hook.',
    start: 2169, end: 2308 },
  { disc: 1, n: 6, title: 'Monster (feat. JAŸ-Z, Rick Ross, Nicki Minaj & Bon Iver)', source: 'album',
    claim: 'Wikipedia describes "Monster" as a posse cut.',
    excerpt: '"Monster" is a posse cut,',
    start: 2608, end: 2633 },
  { disc: 1, n: 7, title: 'So Appalled (feat. JAŸ-Z, Pusha T, Prynce Cy Hi, Swizz Beatz & RZA)', source: 'album',
    claim: 'Wikipedia describes "So Appalled" as a fellow posse cut built around piano and strings.',
    excerpt: 'The fellow posse cut "So Appalled" is built around piano and strings,',
    start: 2953, end: 3022 },
  { disc: 1, n: 8, title: 'Devil In a New Dress (feat. Rick Ross)', source: 'album',
    claim: 'Wikipedia states that "Devil in a New Dress" is built on a sample of Smokey Robinson\'s "Will You Love Me Tomorrow" (1960).',
    excerpt: '"Devil in a New Dress" is built on a sample of Smokey Robinson\'s "Will You Love Me Tomorrow" (1960).',
    start: 3811, end: 3911 },
  { disc: 1, n: 9, title: 'Runaway (feat. Pusha T)', source: 'album',
    claim: 'Wikipedia states that "Runaway" contains a piano-based motif comprising a series of uninterrupted descending half and whole notes.',
    excerpt: '"Runaway" contains a piano-based motif comprising a series of uninterrupted descending half and whole notes,',
    start: 4287, end: 4395 },
  { disc: 1, n: 10, title: 'Hell of a Life', source: 'album',
    claim: 'Wikipedia states that "Hell of a Life", inspired by West\'s two-year relationship with model Amber Rose, samples the Mojo Men\'s "She\'s My Baby" (1966).',
    excerpt: 'Inspired by West\'s two-year relationship with model Amber Rose, "Hell of a Life" samples the Mojo Men\'s "She\'s My Baby" (1966)',
    start: 5031, end: 5157 },
  { disc: 1, n: 11, title: 'Blame Game (feat. John Legend)', source: 'album',
    claim: 'Wikipedia states that "Blame Game" is a low-key track built around a sample of Richard D. James\'s piano composition "Avril 14th" (2001).',
    excerpt: '"Blame Game" is a low-key track that is built around a sample of Richard D. James\'s piano composition "Avril 14th" (2001),',
    start: 5548, end: 5670 },
  { disc: 1, n: 12, title: 'Lost In the World (feat. Bon Iver)', source: 'album',
    claim: 'Wikipedia states that "Lost in the World" features tribal drums and prominent samples from the indie folk band Bon Iver\'s "Woods" (2009).',
    excerpt: '"Lost in the World" features tribal drums and prominent samples from the indie folk band Bon Iver\'s "Woods" (2009),',
    start: 5904, end: 6019 },
  { disc: 1, n: 13, title: 'Who Will Survive In America', source: 'album',
    claim: 'Wikipedia states that "Who Will Survive in America" serves as the album\'s coda and samples jazz poet Gil Scott-Heron\'s "Comment No. 1" (1970).',
    excerpt: 'It serves as the album\'s coda and samples jazz poet Gil Scott-Heron\'s "Comment No. 1" (1970),',
    start: 6536, end: 6629 },
  { disc: 2, n: 1, title: 'See Me Now (feat. Beyoncé, Charlie Wilson & Big Sean) [Bonus Track]', source: 'seemenow',
    claim: 'Wikipedia states that the album version of "See Me Now" includes a verse by Big Sean and is included on My Beautiful Dark Twisted Fantasy (2010) as an iTunes Store bonus track.',
    excerpt: 'The album version includes a verse by Big Sean and is included on West\'s fifth studio album My Beautiful Dark Twisted Fantasy (2010) as an iTunes Store bonus track.',
    start: 500, end: 664 },
];

const trackEntries = [];

for (const t of documented) {
  const src = SOURCE_META[t.source];
  const artifactId = t.source === 'album' ? ALBUM_ARTIFACT : t.source === 'allofthelights' ? AOTL_ARTIFACT : SMN_ARTIFACT;
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
  changeNote: 'Complete all fourteen My Beautiful Dark Twisted Fantasy catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank17-track-encyclopedia-author',
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

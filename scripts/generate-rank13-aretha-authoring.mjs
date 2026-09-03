// Generate rank-13 authoring file for Aretha Franklin — I Never Loved a Man the Way I Love You.
// Excerpts are verbatim from the fetched Best Classic Bands article (pandoc extraction).
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '013-aretha-franklin-i-never-loved-a-man-the-way-i-love-you-e41a23cf';
const CHECKED_AT = '2026-09-03';

const BCB_URL = 'https://bestclassicbands.com/aretha-franklin-i-never-loved-a-man-review-8-4-24';
const BCB_LABEL = 'Best Classic Bands album review by Mark Leviton';
const BCB_TITLE = "Aretha Franklin's 'I Never Loved a Man the Way I Love You' LP: R-E-S-P-E-C-T";
const BCB_IDENTITY = 'bestclassicbands.com|Mark Leviton I Never Loved a Man review';

// Each track: { n, title, claim, excerpt }
const tracks = [
  {
    n: 1, title: 'Respect',
    claim: 'Mark Leviton notes that Franklin, Wexler and Atlantic staff arranger Arif Mardin vastly improved on Otis Redding’s rough-hewn arrangement of “Respect,” and that the background singers were Aretha’s sisters Carolyn and Erma with Cissy Houston.',
    excerpt: 'Franklin, Wexler and Atlantic staff arranger Arif Mardin vastly improved on Redding’s rough-hewn arrangement. The background singers—Aretha’s sisters Carolyn and Erma with Cissy Houston—serve as a Greek chorus as the drama of the track spreads out during a fully packed 2:29 timing.',
  },
  {
    n: 2, title: 'Drown In My Own Tears',
    claim: 'Mark Leviton notes that Henry Glover’s “Drown In My Own Tears,” which had been cut by Ray Charles for Atlantic in 1956, begins with Aretha’s voice and piano laying down gospel licks with bassist Tommy Cogbill before Hawkins—or perhaps alternate Swamper Gene Chrisman—enters.',
    excerpt: 'Henry Glover’s “Drown In My Own Tears” which had been cut by Ray Charles for Atlantic in 1956, begins with a powerful starkness, Aretha’s voice and piano laying down gospel licks with bassist Tommy Cogbill before Hawkins—or perhaps alternate Swamper Gene Chrisman—enters.',
  },
  {
    n: 3, title: 'I Never Loved a Man (The Way I Love You)',
    claim: 'Mark Leviton notes that the title track was tracked with Aretha on acoustic piano and Dewey “Spooner” Oldham on electric piano, all musicians recording live, and that the song was written by Detroit’s Ronnie Shannon.',
    excerpt: 'With Aretha on acoustic piano and Dewey “Spooner” Oldham on electric piano, and all the other musicians recording live, “I Never Loved a Man (The Way I Love You)” was tracked. Written by Detroit’s Ronnie Shannon, the song and Franklin’s intense vocal performance electrified the musicians.',
  },
  {
    n: 4, title: 'Soul Serenade',
    claim: 'Mark Leviton notes that “Soul Serenade,” written by Luther Dixon and King Curtis, had often been performed as an instrumental since Curtis’ 1964 hit version for Capitol Records, and that this version with lyrics is not a highlight of the LP.',
    excerpt: 'The languid “Soul Serenade,” written by Luther Dixon and King Curtis, had often been performed as an instrumental ever since Curtis’ 1964 hit version for Capitol Records; this version with lyrics, while beautifully sung, is not a highlight of the LP.',
  },
  {
    n: 5, title: "Don't Let Me Lose This Dream",
    claim: 'Mark Leviton notes that “Don’t Let Me Lose This Dream,” written by Franklin and her husband, is a bossa-nova that sounds not unlike a Bacharach-David song for Dionne Warwick.',
    excerpt: '“Don’t Let Me Lose This Dream,” written by Franklin and her husband, is a bossa-nova that sounds not unlike a Bacharach-David song for Dionne Warwick.',
  },
  {
    n: 6, title: 'Baby, Baby, Baby',
    claim: 'Mark Leviton notes that “Baby, Baby, Baby” was written by Carolyn and Aretha Franklin, with Oldham’s organ supporting Franklin’s stately piano.',
    excerpt: '“Baby, Baby, Baby” was written by Carolyn and Aretha Franklin. Oldham’s organ is in support of Franklin’s stately piano once again.',
  },
  {
    n: 7, title: 'Dr. Feelgood (Love Is Serious Business)',
    claim: 'Mark Leviton notes that “Dr. Feelgood (Love Is a Serious Business)” leads off side two of the original LP and is a strong example of how Ted White and Franklin could co-write with real heat and from their attraction to each other.',
    excerpt: '“Dr. Feelgood (Love Is a Serious Business)” leads off side two of the original LP, and is wonderfully loose and unabashedly sexy. This is one of the best examples of how White and Franklin could co-write with real heat and from their attraction to each other.',
  },
  {
    n: 8, title: 'Good Times',
    claim: 'Mark Leviton notes that “Good Times” is one of two Sam Cooke tunes on side two, that it was a hit for Cooke in 1964, and that it has attracted dozens of cover versions.',
    excerpt: 'There are two Sam Cooke tunes on side two, “Good Times” and “A Change Is Gonna Come.” As a party anthem the first can’t be beat, and Franklin and company make short, potent work of it. A hit for Cooke in 1964, it’s attracted dozens of cover versions and had wide appeal',
  },
  {
    n: 9, title: 'Do Right Woman, Do Right Man',
    claim: 'Mark Leviton notes that “Do Right Woman–Do Right Man” was penned by the Muscle Shoals duo Dan Penn and Chips Moman.',
    excerpt: 'the regally impressive “Do Right Woman–Do Right Man,” penned by the Muscle Shoals duo Dan Penn and Chips Moman',
  },
  {
    n: 10, title: 'Save Me',
    claim: 'Mark Leviton notes that “Save Me” is a light confection that never strays from the same three chords that anchor Van Morrison’s “Gloria,” and that it is one of the only songs ever written by Carolyn, Aretha and King Curtis.',
    excerpt: '“Save Me,” a light confection that never strays from the same three chords that anchor Van Morrison’s “Gloria.” It’s one of the only songs ever written by Carolyn, Aretha and King Curtis, and is basically a short jam with a rock/boogaloo beat.',
  },
  {
    n: 11, title: 'A Change Is Gonna Come',
    claim: 'Mark Leviton notes that “A Change Is Gonna Come” is a Civil Rights anthem based on Sam Cooke’s experience of racism while on tour in the South, and that Aretha’s take, the longest cut on the album, is placed at the very end.',
    excerpt: '“A Change Is Gonna Come” is now of course a Civil Rights anthem, based on Cooke’s experience of racism while on tour in the South. His stirring version was released as a single B-side in early 1964. The longest cut on the album, Aretha’s take is placed at the very end, after all the playfulness and love songs, and is a deadly serious, focused, emotional masterpiece.',
  },
];

// Content-addressed source artifact (byte-identical on disk) and the exact
// character offsets of each retained excerpt within the artifact's retainedText.
const ARTIFACT_ID = '6890ca85f7228e85e58d4d611145026814d68544cecfe439149077abb4403396';
const BINDINGS = {
  1: { start: 3518, end: 3800 },
  2: { start: 4065, end: 4336 },
  3: { start: 499, end: 788 },
  4: { start: 5480, end: 5730 },
  5: { start: 5797, end: 5947 },
  6: { start: 6783, end: 6914 },
  7: { start: 7628, end: 7887 },
  8: { start: 8583, end: 8852 },
  9: { start: 9464, end: 9574 },
  10: { start: 9580, end: 9823 },
  11: { start: 8986, end: 9354 },
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
            label: BCB_LABEL,
            title: BCB_TITLE,
            url: BCB_URL,
            sourceIdentity: BCB_IDENTITY,
            extractType: 'verbatim',
            evidenceStatus: 'retrieved',
            checkedAt: CHECKED_AT,
            extract: t.excerpt,
            artifactId: ARTIFACT_ID,
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
      { label: BCB_LABEL, title: BCB_TITLE, url: BCB_URL },
    ],
  };
});

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all eleven I Never Loved a Man the Way I Love You catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank13-track-encyclopedia-author',
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

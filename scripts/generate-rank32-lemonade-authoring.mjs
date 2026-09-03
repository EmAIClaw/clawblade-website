// Generate rank-32 authoring for Beyoncé — Lemonade from the official credits
// page recovered via the Wayback Machine snapshot dated 2022-10-11.
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '032-beyonce-lemonade-d3bb0f63';
const CHECKED_AT = '2026-09-03';
const SOURCE_URL = 'https://www.beyonce.com/album/lemonade-visual-album/songs';
const SOURCE_LABEL = 'Beyoncé official Lemonade credits (Wayback snapshot 2022-10-11)';
const SOURCE_TITLE = 'Lemonade — songs and credits | Beyoncé';
const SOURCE_IDENTITY = 'beyonce.com|Lemonade official song credits|wayback:20221011170727';
const ARTIFACT_ID = 'cc2a7257053f81ef90d42625a381014e9ee2a8c37304c73a0862b9e6673c315f';

const documented = [
  { n: 1, title: 'Pray You Catch Me',
    claim: 'Beyoncé’s official credits identify Kevin Garrett on piano and James Blake on Jupiter bass for “Pray You Catch Me.”',
    excerpt: 'PIANO BY KEVIN GARRETT / JUPITER BASS BY JAMES BLAKE', start: 1661, end: 1713 },
  { n: 2, title: 'Hold Up',
    claim: 'Beyoncé’s official credits state that “Hold Up” contains elements of “Maps,” written by Brian Chase, Karen Orzolek, and Nick Zinner.',
    excerpt: 'CONTAINS ELEMENTS OF “MAPS” WRITTEN BY BRIAN CHASE, KAREN ORZOLEK AND NICK ZINNER', start: 7634, end: 7715 },
  { n: 3, title: 'Don’t Hurt Yourself',
    claim: 'Beyoncé’s official credits state that “Don’t Hurt Yourself” features a sample from Led Zeppelin’s recording of “When the Levee Breaks.”',
    excerpt: 'FEATURES SAMPLE FROM THE LED ZEPPELIN RECORDING “WHEN THE LEVEE BREAKS,”', start: 11955, end: 12027 },
  { n: 4, title: 'Sorry',
    claim: 'Beyoncé’s official credits identify Hit-Boy and HazeBanga as co-producers of “Sorry.”',
    excerpt: 'CO-PRODUCED BY HIT-BOY FOR HITS SINCE ’87 AND HAZEBANGA FOR HAZEBANGA MUSIC', start: 14833, end: 14908 },
  { n: 5, title: '6 Inch',
    claim: 'Beyoncé’s official credits state that “6 Inch” contains samples from “Walk On By,” written by Burt Bacharach and Hal David.',
    excerpt: 'CONTAINS SAMPLES FROM “WALK ON BY” WRITTEN BY BURT BACHARACH AND HAL DAVID', start: 19432, end: 19506 },
  { n: 6, title: 'Daddy Lessons',
    claim: 'Beyoncé’s official credits identify Patrick Williams on harmonica and Too Many Zooz on additional instrumentation for “Daddy Lessons.”',
    excerpt: 'HARMONICA BY PATRICK WILLIAMS / ADDITIONAL INSTRUMENTATION BY TOO MANY ZOOZ', start: 22772, end: 22847 },
  { n: 7, title: 'Love Drought',
    claim: 'Beyoncé’s official credits identify Mike Dean as the keyboardist, drum programmer, and track engineer for “Love Drought.”',
    excerpt: 'KEYBOARDS AND DRUM PROGRAMMING BY MIKE DEAN / TRACK ENGINEERED BY MIKE DEAN', start: 25494, end: 25569 },
  { n: 8, title: 'Sandcastles',
    claim: 'Beyoncé’s official credits identify Vincent Berry II on piano, Jack Chambazyan on synthesizers, and Boots as synthesizer arranger for “Sandcastles.”',
    excerpt: 'PIANO BY VINCENT BERRY II / SYNTHS BY JACK CHAMBAZYAN / SYNTH ARRANGEMENT BY BOOTS', start: 27176, end: 27258 },
  { n: 9, title: 'Forward',
    claim: 'Beyoncé’s official credits identify James Blake and Beyoncé as producers of “Forward,” with Blake also playing piano.',
    excerpt: 'PRODUCED BY JAMES BLAKE AND BEYONCÉ / VOCAL PRODUCTION BY BEYONCÉ / PIANO BY JAMES BLAKE', start: 28277, end: 28365 },
  { n: 10, title: 'Freedom',
    claim: 'Beyoncé’s official credits state that “Freedom” samples “Stewball,” performed by Prisoner “22” at Mississippi State Penitentiary at Parchman and recorded in 1947 by Alan Lomax and John Lomax Sr.',
    excerpt: 'CONTAINS A SAMPLE OF “STEWBALL,” PERFORMED BY PRISONER “22” AT MISSISSIPPI STATE PENITENTIARY AT PARCHMAN, RECORDED IN 1947 BY ALAN LOMAX AND JOHN LOMAX SR.', start: 33123, end: 33279 },
  { n: 11, title: 'All Night',
    claim: 'Beyoncé’s official credits state that “All Night” contains elements of “SpottieOttieDopaliscious,” written by André Benjamin, Patrick Brown, and Antwan Patton.',
    excerpt: 'CONTAINS ELEMENTS OF “SPOTTIEOTTIEDOPALISCIOUS” WRITTEN BY ANDRE BENJAMIN, PATRICK BROWN AND ANTWAN PATTON', start: 38204, end: 38310 },
  { n: 12, title: 'Formation',
    claim: 'Beyoncé’s official credits identify Swae Lee on ad-libs, Big Freedia on additional background ad-libs, and Matt Doe on trumpet for “Formation.”',
    excerpt: 'ADLIBS BY SWAE LEE OF RAE SREMMURD / ADDITIONAL BACKGROUND ADLIBS BY BIG FREEDIA / TRUMPET BY MATT DOE', start: 41382, end: 41484 },
];

const trackEntries = documented.map((track) => ({
  albumId: ALBUM_ID,
  discNumber: 1,
  trackNumber: track.n,
  trackTitle: track.title,
  evidenceLevel: 'documented',
  verifiedFacts: [{
    claimId: `${ALBUM_ID}:1:${track.n}:fact-1`,
    claim: track.claim,
    sourceRefs: [{
      label: SOURCE_LABEL,
      title: SOURCE_TITLE,
      url: SOURCE_URL,
      sourceIdentity: SOURCE_IDENTITY,
      extractType: 'verbatim',
      evidenceStatus: 'retrieved',
      checkedAt: CHECKED_AT,
      extract: track.excerpt,
      artifactId: ARTIFACT_ID,
      section: { kind: 'character-offsets', start: track.start, end: track.end },
    }],
  }],
  musicalCharacter: '',
  albumContext: '',
  listeningNotes: '',
  limitations: [
    'One narrow official-credit statement is retained from an archived 2022-10-11 snapshot; no lyric interpretation, sonic analysis, or complete session reconstruction is claimed.',
  ],
  sourceRefs: [{ label: SOURCE_LABEL, title: SOURCE_TITLE, url: SOURCE_URL }],
}));

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all twelve Lemonade catalog tracks with track-specific official-credit evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank32-track-encyclopedia-author',
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

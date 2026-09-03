// Generate rank-20 authoring file for Radiohead — Kid A.
// Excerpts are verbatim from the fetched Wikipedia "Kid A" album article
// (9 tracks), Songfacts "In Limbo" (track 7), and Citizen Insane "Untitled"
// (track 11), all pandoc-extracted. All 11 catalog tracks are documented with
// one narrow track-specific claim each.
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '020-radiohead-kid-a-ce842ff2';
const CHECKED_AT = '2026-09-03';

const ALBUM_URL = 'https://en.wikipedia.org/wiki/Kid_A';
const ALBUM_LABEL = 'Wikipedia Kid A article';
const ALBUM_TITLE = 'Kid A - Wikipedia';
const ALBUM_IDENTITY = 'en.wikipedia.org|Kid A album article';

const SONGFACTS_URL = 'https://www.songfacts.com/facts/radiohead/in-limbo';
const SONGFACTS_LABEL = 'Songfacts In Limbo';
const SONGFACTS_TITLE = 'In Limbo by Radiohead - Songfacts';
const SONGFACTS_IDENTITY = 'songfacts.com|In Limbo by Radiohead';

const CITIZENINSANE_URL = 'https://citizeninsane.eu/music/kam/untitled.html';
const CITIZENINSANE_LABEL = 'Citizen Insane Untitled';
const CITIZENINSANE_TITLE = 'Untitled - Citizen Insane';
const CITIZENINSANE_IDENTITY = 'citizeninsane.eu|Untitled';

const SOURCE_META = {
  album: { url: ALBUM_URL, label: ALBUM_LABEL, title: ALBUM_TITLE, identity: ALBUM_IDENTITY },
  songfacts: { url: SONGFACTS_URL, label: SONGFACTS_LABEL, title: SONGFACTS_TITLE, identity: SONGFACTS_IDENTITY },
  citizeninsane: { url: CITIZENINSANE_URL, label: CITIZENINSANE_LABEL, title: CITIZENINSANE_TITLE, identity: CITIZENINSANE_IDENTITY },
};

// Content-addressed source artifacts (byte-identical on disk) and the exact
// character offsets of each retained excerpt within the artifact's retainedText.
const ALBUM_ARTIFACT = '716563c68aa1c0c46fd01ea40a949a93500a4b6d2b0ed26c3f558b79c7675807';
const SONGFACTS_ARTIFACT = 'c67136984ae5de6da9fd2b976b9beea4f2ca892edca5c13d7d521a8b21af08b1';
const CITIZENINSANE_ARTIFACT = 'ed7e5bed3af1b3c9e32132994eeb7e86a6ba0ae4bd80bbef969d3399eabe91c1';

// Documented tracks: { disc, n, title, source, claim, excerpt, start, end }
const documented = [
  { disc: 1, n: 1, title: 'Everything In Its Right Place', source: 'album',
    claim: 'Wikipedia states that Yorke wrote "Everything in Its Right Place" about the depression he experienced on the OK Computer tour, feeling he could not speak.',
    excerpt: 'Yorke wrote "Everything in Its Right Place" about the depression he experienced on the OK Computer tour, feeling he could not speak.',
    start: 6695, end: 6827 },
  { disc: 1, n: 2, title: 'Kid A', source: 'album',
    claim: 'Wikipedia states that Yorke\'s vocals on the title track "Kid A" were spoken, then vocoded with the ondes Martenot to create the melody.',
    excerpt: 'his vocals on the title track were spoken, then vocoded with the ondes Martenot to create the melody.',
    start: 4089, end: 4190 },
  { disc: 1, n: 3, title: 'The National Anthem', source: 'album',
    claim: 'Wikipedia states that Yorke wrote an early version of "The National Anthem" when the band was still in school.',
    excerpt: 'Yorke wrote an early version of "The National Anthem" when the band was still in school.',
    start: 500, end: 588 },
  { disc: 1, n: 4, title: 'How to Disappear Completely', source: 'album',
    claim: 'Wikipedia states that the strings on "How to Disappear Completely" were performed by the Orchestra of St John\'s and recorded in Dorchester Abbey, a 12th-century church about five miles from Radiohead\'s Oxfordshire studio.',
    excerpt: 'The strings on "How to Disappear Completely" were performed by the Orchestra of St John\'s and recorded in Dorchester Abbey, a 12th-century church about five miles from Radiohead\'s Oxfordshire studio.',
    start: 1140, end: 1339 },
  { disc: 1, n: 5, title: 'Treefingers', source: 'album',
    claim: 'Wikipedia states that "Treefingers", an ambient instrumental, was created by digitally processing O\'Brien\'s guitar loops.',
    excerpt: '"Treefingers", an ambient instrumental, was created by digitally processing O\'Brien\'s guitar loops.',
    start: 3915, end: 4014 },
  { disc: 1, n: 6, title: 'Optimistic', source: 'album',
    claim: 'Wikipedia states that the refrain of "Optimistic" was an assurance by Yorke\'s partner, Rachel Owen, when Yorke was frustrated with the band\'s progress.',
    excerpt: 'The refrain of "Optimistic" ("try the best you can / the best you can is good enough") was an assurance by Yorke\'s partner, Rachel Owen, when Yorke was frustrated with the band\'s progress.',
    start: 7036, end: 7224 },
  { disc: 1, n: 7, title: 'In Limbo', source: 'songfacts',
    claim: 'Songfacts states that the original title of "In Limbo" was "Lost At Sea."',
    excerpt: 'The original title was "Lost At Sea."',
    start: 500, end: 537 },
  { disc: 1, n: 8, title: 'Idioteque', source: 'album',
    claim: 'Wikipedia states that "Idioteque" was built from a drum machine pattern Greenwood created with a modular synthesiser.',
    excerpt: '"Idioteque" was built from a drum machine pattern Greenwood created with a modular synthesiser.',
    start: 2044, end: 2139 },
  { disc: 1, n: 9, title: 'Morning Bell', source: 'album',
    claim: 'Wikipedia states that "Morning Bell" features repeated contrasting lines such as "Where\'d you park the car?" and "Cut the kids in half".',
    excerpt: '"Morning Bell" features repeated contrasting lines such as "Where\'d you park the car?" and "Cut the kids in half".',
    start: 5773, end: 5887 },
  { disc: 1, n: 10, title: 'Motion Picture Soundtrack', source: 'album',
    claim: 'Wikipedia states that "Motion Picture Soundtrack" was written before Radiohead\'s debut single, "Creep" (1992).',
    excerpt: '"Motion Picture Soundtrack" was written before Radiohead\'s debut single, "Creep" (1992)',
    start: 2588, end: 2675 },
  { disc: 1, n: 11, title: 'Untitled', source: 'citizeninsane',
    claim: 'Citizen Insane states that "Untitled" is the official name for the instrumental hidden track after "Motion Picture Soundtrack".',
    excerpt: '"Untitled" is the official name for the instrumental hidden track after "Motion Picture Soundtrack".',
    start: 260, end: 360 },
];

const trackEntries = [];

for (const t of documented) {
  const src = SOURCE_META[t.source];
  const artifactId = t.source === 'album' ? ALBUM_ARTIFACT : (t.source === 'songfacts' ? SONGFACTS_ARTIFACT : CITIZENINSANE_ARTIFACT);
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
  changeNote: 'Complete all eleven Kid A catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank20-track-encyclopedia-author',
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

// Generate rank-16 authoring file for The Clash — London Calling.
// Excerpts are verbatim from three fetched sources (pandoc extraction):
//   - Wikipedia "London Calling" (track annotations, Vanilla Tapes mapping, themes)
//   - The Ringer "The Siren Sound of the Clash's 'London Calling,' 40 Years Later"
//     (Elizabeth Nelson, Dec 17 2019) — track-by-track prose
//   - Rolling Stone "The Clash Serve 'Vanilla'" (Austin Scaggs, Aug 3 2004) — demo notes
// 32 tracks are documented (19 disc-1 + 13 disc-2 with track-specific evidence);
// 8 disc-2 demo tracks carry a completed insufficient-evidence disposition.
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '016-the-clash-london-calling-7d75cf05';
const CHECKED_AT = '2026-09-03';

const WIKI_URL = 'https://en.wikipedia.org/wiki/London_Calling';
const WIKI_LABEL = 'Wikipedia London Calling article';
const WIKI_TITLE = 'London Calling - Wikipedia';
const WIKI_IDENTITY = 'en.wikipedia.org|London Calling album article';

const RINGER_URL = 'https://www.theringer.com/2019/12/17/music/the-clash-london-calling-40th-anniversary';
const RINGER_LABEL = 'The Ringer Elizabeth Nelson 40th-anniversary essay';
const RINGER_TITLE = "The Siren Sound of the Clash's 'London Calling,' 40 Years Later - The Ringer";
const RINGER_IDENTITY = 'theringer.com|Elizabeth Nelson London Calling 40th anniversary';

const RS_URL = 'https://www.rollingstone.com/music/music-news/the-clash-serve-vanilla-248698';
const RS_LABEL = 'Rolling Stone Austin Scaggs Vanilla Tapes article';
const RS_TITLE = 'The Clash Serve "Vanilla" - Rolling Stone';
const RS_IDENTITY = 'rollingstone.com|The Clash Serve Vanilla 2004';

const SOURCE_META = {
  wikipedia: { url: WIKI_URL, label: WIKI_LABEL, title: WIKI_TITLE, identity: WIKI_IDENTITY },
  ringer: { url: RINGER_URL, label: RINGER_LABEL, title: RINGER_TITLE, identity: RINGER_IDENTITY },
  rollingstone: { url: RS_URL, label: RS_LABEL, title: RS_TITLE, identity: RS_IDENTITY },
};

// Content-addressed source artifacts (byte-identical on disk) and the exact
// character offsets of each retained excerpt within the artifact's retainedText.
const WIKI_ARTIFACT = '0b8906b6e8907945af442dd035396ee7808049eeee1ee99f8afa637ae659af8c';
const RINGER_ARTIFACT = 'f2d9afc0a2c6fb5821fb79b54be3471477fd4eb589e39f55e1fb9571093223b4';
const RS_ARTIFACT = '3b930611ed995cd6da381149b585c83d99cbef407e657915d21ba237c988e1ce';

// Documented tracks: { disc, n, title, source, claim, excerpt, start, end }
const documented = [
  // ── Disc 1 ────────────────────────────────────────────────────────────
  { disc: 1, n: 1, title: 'London Calling', source: 'wikipedia',
    claim: 'Wikipedia notes that "London Calling", the album\'s title track and opener, was partially influenced by the March 1979 accident at a nuclear reactor at Three Mile Island in Pennsylvania.',
    excerpt: '"London Calling", the album\'s title track and opener, was partially influenced by the March 1979 accident at a nuclear reactor at Three Mile Island in Pennsylvania.',
    start: 6423, end: 6587 },
  { disc: 1, n: 2, title: 'Brand New Cadillac', source: 'wikipedia',
    claim: 'Wikipedia states that "Brand New Cadillac" was the first track recorded for London Calling, and that the Clash had originally used it as a warm-up song before recording.',
    excerpt: 'The first track recorded for London Calling was "Brand New Cadillac", which the Clash had originally used as a warm-up song before recording.',
    start: 3426, end: 3567 },
  { disc: 1, n: 3, title: 'Jimmy Jazz', source: 'wikipedia',
    claim: 'Wikipedia describes "Jimmy Jazz" as featuring a narrative about an underworld criminal named Jimmy Jazz.',
    excerpt: 'an underworld criminal named Jimmy Jazz',
    start: 5245, end: 5284 },
  { disc: 1, n: 4, title: 'Hateful', source: 'ringer',
    claim: 'The Ringer\'s Elizabeth Nelson describes "Hateful" as a Bo Diddley-meets-Bowie drug panic.',
    excerpt: 'the Bo Diddley–meets-Bowie drug panic “Hateful.”',
    start: 499, end: 547 },
  { disc: 1, n: 5, title: "Rudie Can't Fail", source: 'wikipedia',
    claim: 'Wikipedia states that "Rudie Can\'t Fail" chronicles the life of a fun-loving young man who is criticised for his inability to act like a responsible adult.',
    excerpt: '"Rudie Can\'t Fail" chronicles the life of a fun-loving young man who is criticised for his inability to act like a responsible adult.',
    start: 5568, end: 5701 },
  { disc: 1, n: 6, title: 'Spanish Bombs', source: 'wikipedia',
    claim: 'Wikipedia notes that "Spanish Bombs" references the lingering effects of the Spanish Civil War.',
    excerpt: 'the lingering effects of the Spanish Civil War ("Spanish Bombs")',
    start: 6252, end: 6316 },
  { disc: 1, n: 7, title: 'The Right Profile', source: 'ringer',
    claim: 'The Ringer\'s Elizabeth Nelson describes "The Right Profile" as Strummer\'s wry and sad eulogy to actor Montgomery Clift, a rollicking anthem for a doomed figure who resembled producer Guy Stevens.',
    excerpt: '“The Right Profile,” Strummer’s wry and sad eulogy to Clift, is a rollicking anthem for a doomed figure who not coincidentally resembled Guy Stevens.',
    start: 3183, end: 3332 },
  { disc: 1, n: 8, title: 'Lost In the Supermarket', source: 'wikipedia',
    claim: 'Wikipedia states that Strummer wrote "Lost in the Supermarket" after imagining Mick Jones\' childhood growing up in a basement with his mother and grandmother.',
    excerpt: 'Strummer wrote "Lost in the Supermarket" after imagining Jones\' childhood growing up in a basement with his mother and grandmother.',
    start: 2099, end: 2230 },
  { disc: 1, n: 9, title: 'Clampdown', source: 'wikipedia',
    claim: 'Wikipedia states that "Clampdown" began as an instrumental track called "Working and Waiting".',
    excerpt: '"Clampdown" began as an instrumental track called "Working and Waiting".',
    start: 3579, end: 3651 },
  { disc: 1, n: 10, title: 'The Guns of Brixton', source: 'wikipedia',
    claim: 'Wikipedia states that "The Guns of Brixton" was the first of bassist Paul Simonon\'s compositions the band would record for an album, and the first to have him sing lead.',
    excerpt: '"The Guns of Brixton" was the first of bassist Paul Simonon\'s compositions the band would record for an album, and the first to have him sing lead.',
    start: 2238, end: 2385 },
  { disc: 1, n: 11, title: "Wrong 'Em Boyo", source: 'wikipedia',
    claim: 'Wikipedia credits "Wrong \'Em Boyo" to Clive Alphonso, originally performed by the Rulers, and notes it includes "Stagger Lee".',
    excerpt: '"Wrong \'Em Boyo"   Clive Alphonso; originally performed by the Rulers; including "Stagger Lee"',
    start: 28235, end: 28327 },
  { disc: 1, n: 12, title: 'Death or Glory', source: 'wikipedia',
    claim: 'Wikipedia states that on "Death or Glory", Strummer examines his life in retrospect and acknowledges the complications and responsibilities of adulthood.',
    excerpt: 'on "Death or Glory", Strummer examines his life in retrospect and acknowledges the complications and responsibilities of adulthood.',
    start: 5927, end: 6058 },
  { disc: 1, n: 13, title: 'Koka Kola', source: 'ringer',
    claim: 'The Ringer\'s Elizabeth Nelson describes "Koka Kola" as an act of comic revenge against the encroaching advertising world, in the style of early Who.',
    excerpt: 'The blink-and-you’ll-miss-it gem “Koka Kola” is an act of comic revenge against the encroaching advertising world, in the style of early Who, and its future colonization of both our whims and habits.',
    start: 7937, end: 8136 },
  { disc: 1, n: 14, title: 'The Card Cheat', source: 'wikipedia',
    claim: 'Wikipedia states that while working on "The Card Cheat", the band recorded each part twice to create a "sound as big as possible".',
    excerpt: 'While working on "The Card Cheat", the band recorded each part twice to create a "sound as big as possible".',
    start: 3659, end: 3767 },
  { disc: 1, n: 15, title: "Lover's Rock", source: 'wikipedia',
    claim: 'Wikipedia states that "Lover\'s Rock" advocates safe sex and planning.',
    excerpt: '"Lover\'s Rock" advocates safe sex and planning.',
    start: 6066, end: 6113 },
  { disc: 1, n: 16, title: 'Four Horsemen', source: 'ringer',
    claim: 'The Ringer\'s Elizabeth Nelson describes "Four Horsemen" as a straightforward reaffirmation of Joe Strummer, Topper Headon, Paul Simonon, and Mick Jones.',
    excerpt: '“Four Horsemen” is a straightforward reaffirmation of Joe, Topper Headon, Paul Simonon, and Mick: the men making the music happen.',
    start: 8704, end: 8834 },
  { disc: 1, n: 17, title: "I'm Not Down", source: 'ringer',
    claim: 'The Ringer\'s Elizabeth Nelson describes "I\'m Not Down" as the Jones-sung final word on the misery and possibility of the new great depression.',
    excerpt: '“I’m Not Down” is the brilliant Jones-sung final word on all the misery and magic and possibility of the new great depression: “I’ve been beaten up / I’ve been thrown around / But I’m not down.”',
    start: 8835, end: 9029 },
  { disc: 1, n: 18, title: 'Revolution Rock', source: 'ringer',
    claim: 'The Ringer\'s Elizabeth Nelson describes "Revolution Rock" as a transporting cover of the Danny Ray and Jackie Edwards reggae anthem.',
    excerpt: 'a transporting cover of the Danny Ray and Jackie Edwards reggae anthem “Revolution Rock,”',
    start: 9067, end: 9156 },
  { disc: 1, n: 19, title: 'Train In Vain', source: 'wikipedia',
    claim: 'Wikipedia states that the final track "Train in Vain" was originally excluded from the back cover\'s track listing.',
    excerpt: 'The final track, "Train in Vain", was originally excluded from the back cover\'s track listing.',
    start: 9383, end: 9477 },

  // ── Disc 2 — The Vanilla Tapes (13 documented) ────────────────────────
  { disc: 2, n: 3, title: "Paul's Tune (Vanilla Studios Demo Version)", source: 'wikipedia',
    claim: 'Wikipedia states that the instrumental track titled "Paul\'s Tune" would eventually be recorded for London Calling under the title "The Guns of Brixton".',
    excerpt: 'the instrumental track titled "Paul\'s Tune" would eventually be recorded for London Calling under the title "The Guns of Brixton"',
    start: 499, end: 628 },
  { disc: 2, n: 6, title: 'Koka Kola, Advertising & Cocaine (Vanilla Studios Demo Version)', source: 'wikipedia',
    claim: 'Wikipedia lists "Koka Kola, Advertising & Cocaine" as an early version of "Koka Kola" on the Vanilla Tapes.',
    excerpt: '"Koka Kola, Advertising & Cocaine" (Early version of "Koka Kola")',
    start: 29776, end: 29841 },
  { disc: 2, n: 7, title: 'Death or Glory (Vanilla Studios Demo Version)', source: 'rollingstone',
    claim: 'Rolling Stone notes that the Vanilla Tapes contain early versions of "London Calling" (with alternate lyrics) and "Death or Glory".',
    excerpt: 'early versions of “London Calling” (with alternate lyrics) and “Death or Glory.”',
    start: 500, end: 580 },
  { disc: 2, n: 9, title: 'Lonesome Me (Vanilla Studios Demo Version)', source: 'wikipedia',
    claim: 'Wikipedia describes "Lonesome Me" as a country-inflected Clash tune that does not appear on London Calling.',
    excerpt: 'the country-inflected "Lonesome Me."',
    start: 1126, end: 1162 },
  { disc: 2, n: 10, title: 'The Police Walked in 4 Jazz (Vanilla Studios Demo Version)', source: 'wikipedia',
    claim: 'Wikipedia lists "The Police Walked in 4 Jazz" as an instrumental early version of "Jimmy Jazz" on the Vanilla Tapes.',
    excerpt: '"The Police Walked in 4 Jazz" (Instrumental, early version of "Jimmy Jazz")',
    start: 29969, end: 30044 },
  { disc: 2, n: 12, title: 'Up-Toon (Instrumental) [Vanilla Studios Demo Version]', source: 'wikipedia',
    claim: 'Wikipedia states that the instrumental track titled "Up-Toon" would ultimately be released as "The Right Profile".',
    excerpt: 'the instrumental tracked titled "Up-Toon" would ultimately be released as "The Right Profile"',
    start: 636, end: 729 },
  { disc: 2, n: 13, title: 'Walking the Slidewalk (Vanilla Studios Demo Version)', source: 'wikipedia',
    claim: 'Wikipedia lists "Walking the Slidewalk" as an instrumental that does not appear on London Calling.',
    excerpt: '"Walking the Slidewalk" (Instrumental, does not appear on "London Calling")',
    start: 30161, end: 30236 },
  { disc: 2, n: 14, title: 'Where You Gonna Go (Soweto) [Vanilla Studios Demo Version]', source: 'wikipedia',
    claim: 'Wikipedia notes that the Vanilla Tapes include a cover of Sonny Okosun\'s "Where You Gonna Go (Soweto)" that did not make the final album.',
    excerpt: 'Sonny Okosun\'s "Where You Gonna Go (Soweto)"',
    start: 822, end: 866 },
  { disc: 2, n: 15, title: 'The Man In Me (Vanilla Studios Demo Version)', source: 'wikipedia',
    claim: 'Wikipedia notes that the Vanilla Tapes include a reggae version of Bob Dylan\'s "The Man in Me".',
    excerpt: 'a reggae version of Bob Dylan\'s "The Man in Me"',
    start: 871, end: 918 },
  { disc: 2, n: 16, title: 'Remote Control (Vanilla Studios Demo Version)', source: 'wikipedia',
    claim: 'Wikipedia lists "Remote Control" as a Vanilla Tapes track that does not appear on London Calling.',
    excerpt: '"Remote Control" (Does not appear on "London Calling")',
    start: 30419, end: 30473 },
  { disc: 2, n: 17, title: 'Working and Waiting (Vanilla Studios Demo Version)', source: 'wikipedia',
    claim: 'Wikipedia states that "Clampdown" began as an instrumental track called "Working and Waiting".',
    excerpt: '"Clampdown" began as an instrumental track called "Working and Waiting".',
    start: 3579, end: 3651 },
  { disc: 2, n: 18, title: 'Heart and Mind (Vanilla Studios Demo Version)', source: 'wikipedia',
    claim: 'Wikipedia describes "Heart and Mind" as a never-officially-released Clash tune, described by rock journalist Pat Gilbert as "a rocker".',
    excerpt: 'never-officially-released Clash tunes like "Heart and Mind" (described by rock journalist Pat Gilbert as "a rocker")',
    start: 1004, end: 1120 },
  { disc: 2, n: 20, title: 'London Calling (Vanilla Studios Demo Version)', source: 'rollingstone',
    claim: 'Rolling Stone notes that the Vanilla Tapes contain an early version of "London Calling" with alternate lyrics.',
    excerpt: 'early versions of “London Calling” (with alternate lyrics)',
    start: 500, end: 558 },
];

// Insufficient-evidence demo tracks (disc 2): early versions of album songs
// with no distinct track-specific annotation in any fetched source.
const insufficient = [
  { disc: 2, n: 1, title: 'Hateful (Vanilla Studios Demo Version)' },
  { disc: 2, n: 2, title: "Rudi Can't Fail (Vanilla Studios Demo Version)" },
  { disc: 2, n: 4, title: "I'm Not Down (Vanilla Studios Demo Version)" },
  { disc: 2, n: 5, title: 'Four Horsemen (Vanilla Studios Demo Version)' },
  { disc: 2, n: 8, title: "Lover's Rock (Vanilla Studios Demo Version)" },
  { disc: 2, n: 11, title: 'Lost In the Supermarket (Vanilla Studios Demo Version)' },
  { disc: 2, n: 19, title: 'Brand New Cadillac (Vanilla Studios Demo Version)' },
  { disc: 2, n: 21, title: 'Revolution Rock (Vanilla Studios Demo Version)' },
];

const DISPOSITION = {
  completedAt: '2026-09-03',
  searchedQueries: [
    'The Clash London Calling Vanilla Tapes track by track',
    'The Clash "Hateful" "Rudie Can\'t Fail" "I\'m Not Down" "Four Horsemen" "Lover\'s Rock" "Lost in the Supermarket" "Brand New Cadillac" "Revolution Rock" Vanilla demo',
    'London Calling 25th anniversary Legacy Edition Vanilla Tapes liner notes',
  ],
  sourceClasses: [
    'Wikipedia London Calling article (track listing and Vanilla Tapes annotations)',
    'The Ringer 40th-anniversary essay (Elizabeth Nelson)',
    'Rolling Stone "The Clash Serve Vanilla" (Austin Scaggs)',
    'Pitchfork 25th-anniversary review',
  ],
  outcome: 'No fetched source provides a distinct track-specific fact for this Vanilla Tapes demo beyond its status as an early version of the corresponding album track; the demo is documented only as a rehearsal recording of an already-documented song.',
};

const trackEntries = [];

for (const t of documented) {
  const src = SOURCE_META[t.source];
  const artifactId = t.source === 'wikipedia' ? WIKI_ARTIFACT : t.source === 'ringer' ? RINGER_ARTIFACT : RS_ARTIFACT;
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

for (const t of insufficient) {
  trackEntries.push({
    albumId: ALBUM_ID,
    discNumber: t.disc,
    trackNumber: t.n,
    trackTitle: t.title,
    evidenceLevel: 'insufficient-evidence',
    verifiedFacts: [],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    researchDisposition: DISPOSITION,
    limitations: [
      'This Vanilla Tapes demo is an early rehearsal version of a song already documented on disc 1; no fetched source provides a distinct track-specific fact for the demo itself.',
    ],
    sourceRefs: [],
  });
}

// Sort to match catalog order (disc, then track number).
trackEntries.sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber);

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all forty London Calling catalog tracks: 32 documented with track-specific evidence and independent semantic review, 8 Vanilla Tapes demos with completed insufficient-evidence dispositions.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank16-track-encyclopedia-author',
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
console.log(`Wrote authoring file with ${trackEntries.length} tracks (${documented.length} documented, ${insufficient.length} insufficient-evidence).`);

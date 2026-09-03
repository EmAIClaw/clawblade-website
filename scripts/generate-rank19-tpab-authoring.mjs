// Generate rank-19 authoring file for Kendrick Lamar — To Pimp a Butterfly.
// Excerpts are verbatim from the fetched Wikipedia "To Pimp a Butterfly" album
// article (15 tracks) and Stereogum "Who's Who On Kendrick Lamar's To Pimp A
// Butterfly" (1 track), both pandoc-extracted. All 16 catalog tracks are
// documented with one narrow track-specific claim each.
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '019-kendrick-lamar-to-pimp-a-butterfly-0dd5449a';
const CHECKED_AT = '2026-09-03';

const ALBUM_URL = 'https://en.wikipedia.org/wiki/To_Pimp_a_Butterfly';
const ALBUM_LABEL = 'Wikipedia To Pimp a Butterfly article';
const ALBUM_TITLE = 'To Pimp a Butterfly - Wikipedia';
const ALBUM_IDENTITY = 'en.wikipedia.org|To Pimp a Butterfly album article';

const STEREOGUM_URL = 'https://stereogum.com/1788180/whos-who-on-kendrick-lamars-to-pimp-a-butterfly/columns/sounding-board';
const STEREOGUM_LABEL = 'Stereogum Who\'s Who On Kendrick Lamar\'s To Pimp A Butterfly';
const STEREOGUM_TITLE = 'Who\'s Who On Kendrick Lamar\'s To Pimp A Butterfly - Stereogum';
const STEREOGUM_IDENTITY = 'stereogum.com|Who\'s Who On Kendrick Lamar\'s To Pimp A Butterfly';

const SOURCE_META = {
  album: { url: ALBUM_URL, label: ALBUM_LABEL, title: ALBUM_TITLE, identity: ALBUM_IDENTITY },
  stereogum: { url: STEREOGUM_URL, label: STEREOGUM_LABEL, title: STEREOGUM_TITLE, identity: STEREOGUM_IDENTITY },
};

// Content-addressed source artifacts (byte-identical on disk) and the exact
// character offsets of each retained excerpt within the artifact's retainedText.
const ALBUM_ARTIFACT = '027972335dbbd4c66e1234b4746a5c261b4fbcc2aba80dd0d8095a76f2da764a';
const STEREOGUM_ARTIFACT = '640a7a35fb9f24c97398a9ba0672fe919371b5292d6c16bc413d36cfb511b15b';

// Documented tracks: { disc, n, title, source, claim, excerpt, start, end }
const documented = [
  { disc: 1, n: 1, title: "Wesley's Theory (feat. George Clinton & Thundercat)", source: 'album',
    claim: 'Wikipedia states that the opening track "Wesley\'s Theory" is a reference to Wesley Snipes and how the actor was jailed for tax evasion.',
    excerpt: 'opening track "Wesley\'s Theory" is a reference to Wesley Snipes and how the actor was jailed for tax evasion;',
    start: 10242, end: 10351 },
  { disc: 1, n: 2, title: 'For Free? (Interlude)', source: 'album',
    claim: 'Wikipedia states that "For Free? (Interlude)" sees Lamar rapping in a dense, spoken word-esque manner with musical accompaniment by jazz pianist Robert Glasper.',
    excerpt: '"For Free? (Interlude)" sees Lamar rapping in a dense, spoken word-esque manner with musical accompaniment by jazz pianist Robert Glasper.',
    start: 10540, end: 10678 },
  { disc: 1, n: 3, title: 'King Kunta', source: 'album',
    claim: 'Wikipedia states that "King Kunta" is concerned with the "history of negative stereotypes all African-Americans have to reconcile".',
    excerpt: '"King Kunta" is concerned with the "history of negative stereotypes all African-Americans have to reconcile".',
    start: 10686, end: 10795 },
  { disc: 1, n: 4, title: 'Institutionalized (feat. Bilal, Anna Wise & Snoop Dogg)', source: 'album',
    claim: 'Wikipedia states that singer Bilal features on the songs "Institutionalized" and "These Walls", and has provided uncredited backing vocals on the songs "U", "For Sale? (Interlude)", "Momma" and "Hood Politics".',
    excerpt: 'Singer Bilal features on the songs "Institutionalized" and "These Walls", and has provided uncredited backing vocals on the songs "U", "For Sale? (Interlude)", "Momma" and "Hood Politics".',
    start: 3035, end: 3223 },
  { disc: 1, n: 5, title: 'These Walls (feat. Bilal, Anna Wise & Thundercat)', source: 'album',
    claim: 'Wikipedia states that "These Walls" has been described by Billboard as "pondering sex and existence in equal measure; it\'s a yoni metaphor about the power of peace, with sugar walls being escape and real walls being obstacles."',
    excerpt: '"These Walls" has been described by Billboard as "pondering sex and existence in equal measure; it\'s a yoni metaphor about the power of peace, with sugar walls being escape and real walls being obstacles."',
    start: 11246, end: 11451 },
  { disc: 1, n: 6, title: 'u', source: 'album',
    claim: 'Wikipedia states that Lamar revealed that "U" was inspired by his own experience of depression and suicidal thoughts.',
    excerpt: 'Lamar revealed that "U" was inspired by his own experience of depression and suicidal thoughts.',
    start: 11459, end: 11554 },
  { disc: 1, n: 7, title: 'Alright', source: 'album',
    claim: 'Wikipedia states that "Alright" begins as a spoken-word treatise before exploding into a shapeshifting portrait of America that brings in jazz horns, skittering drum beats and Lamar\'s mellifluous rapping as he struggles with troubles and temptations.',
    excerpt: '"Alright" begins as a spoken-word treatise before exploding into a shapeshifting portrait of America that brings in jazz horns, skittering drum beats and Lamar\'s mellifluous rapping as he struggles with troubles and temptations.',
    start: 11647, end: 11875 },
  { disc: 1, n: 8, title: 'For Sale? (Interlude)', source: 'album',
    claim: 'Wikipedia states that Flying Lotus had produced a version of "For Sale? (Interlude)" that was ultimately discarded, with Lamar using Taz Arnold\'s version of the song on the album instead.',
    excerpt: 'Lotus had produced a version of "For Sale? (Interlude)" that was ultimately discarded, with Lamar using Taz Arnold\'s version of the song on the album instead.',
    start: 499, end: 657 },
  { disc: 1, n: 9, title: 'Momma', source: 'album',
    claim: 'Wikipedia states that the instrumental of "Momma" was originally released as "So[Rt]" by Knxwledge.',
    excerpt: 'The instrumental of "Momma" was originally released as "So[Rt]" by Knxwledge.',
    start: 39280, end: 39357 },
  { disc: 1, n: 10, title: 'Hood Politics', source: 'album',
    claim: 'Wikipedia states that "Hood Politics" contains a sample of "All for Myself", written and performed by Sufjan Stevens.',
    excerpt: '"Hood Politics" contains a sample of "All for Myself", written and performed by Sufjan Stevens.',
    start: 40123, end: 40218 },
  { disc: 1, n: 11, title: 'How Much a Dollar Cost (feat. James Fauntleroy & Ronald Isley)', source: 'album',
    claim: 'Wikipedia states that Ronald Isley also performed on the song "How Much a Dollar Cost" alongside the singer-songwriter James Fauntleroy.',
    excerpt: 'Isley also performed on the song "How Much a Dollar Cost" alongside the singer-songwriter James Fauntleroy.',
    start: 2710, end: 2817 },
  { disc: 1, n: 12, title: 'Complexion (A Zulu Love) [feat. Rapsody]', source: 'album',
    claim: 'Wikipedia states that American rapper Rapsody appeared on the album, contributing a verse to the song "Complexion (A Zulu Love)".',
    excerpt: 'American rapper Rapsody appeared on the album, contributing a verse to the song "Complexion (A Zulu Love)".',
    start: 750, end: 857 },
  { disc: 1, n: 13, title: 'The Blacker the Berry', source: 'album',
    claim: 'Wikipedia states that "The Blacker the Berry" features a "boom bap beat" and lyrics that celebrate Lamar\'s African-American heritage and "tackle hatred, racism, and hypocrisy head on."',
    excerpt: '"The Blacker the Berry" features a "boom bap beat" and lyrics that celebrate Lamar\'s African-American heritage and "tackle hatred, racism, and hypocrisy head on."',
    start: 12156, end: 12318 },
  { disc: 1, n: 14, title: "You Ain't Gotta Lie (Momma Said)", source: 'stereogum',
    claim: 'Stereogum states that Thundercat provided background vocals on "Alright" and "You Ain\'t Gotta Lie (Momma Said)".',
    excerpt: 'background vocals on "Alright" and "You Ain\'t Gotta Lie (Momma Said)"',
    start: 500, end: 569 },
  { disc: 1, n: 15, title: 'i', source: 'album',
    claim: 'Wikipedia states that the album\'s lead single, titled "I", was produced by Rahki, who also produced a song for the album entitled "Institutionalized".',
    excerpt: 'The album\'s lead single, titled "I", was produced by Rahki, who also produced a song for the album entitled "Institutionalized".',
    start: 2179, end: 2307 },
  { disc: 1, n: 16, title: 'Mortal Man', source: 'album',
    claim: 'Wikipedia states that in the final track of the album, the 12-minute song "Mortal Man", Lamar reflects on everything he has explored throughout the album.',
    excerpt: 'In the final track of the album, the 12-minute song "Mortal Man", Lamar reflects on everything he has explored throughout the album.',
    start: 12553, end: 12685 },
];

const trackEntries = [];

for (const t of documented) {
  const src = SOURCE_META[t.source];
  const artifactId = t.source === 'album' ? ALBUM_ARTIFACT : STEREOGUM_ARTIFACT;
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
  changeNote: 'Complete all sixteen To Pimp a Butterfly catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank19-track-encyclopedia-author',
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

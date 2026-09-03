// Generate rank-26 authoring for Patti Smith — Horses.
// The source is a 2025 New York Times oral history featuring first-person
// testimony from Patti Smith and members of her band, recovered from the
// Wayback snapshot dated 2025-11-10 after the live page returned HTTP 403.
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '026-patti-smith-horses-2807d0f1';
const CHECKED_AT = '2026-09-03';
const SOURCE_URL = 'https://www.nytimes.com/interactive/2025/11/07/arts/music/patti-smith-horses-anniversary.html';
const SOURCE_LABEL = 'The New York Times Horses 50th-anniversary oral history (archived 2025-11-10)';
const SOURCE_TITLE = '50 Years of Patti Smith’s ‘Horses’';
const SOURCE_IDENTITY = 'nytimes.com|50 Years of Patti Smith’s Horses|Wayback 20251110153406';
const ARTIFACT_ID = 'f251527f34cf2b79c91cb2d0efeb5c4f933f424993ca2aac6b2f4d777280883a';

const documented = [
  {
    disc: 1, n: 1, title: 'Gloria',
    claim: 'In The New York Times oral history, Smith says Lenny Kaye suggested “Gloria” when she wanted another simple-chord song she could riff over, and that its male point of view did not constrain her.',
    excerpt: 'Patti Smith We had “Land.” Then one day we were in the practice room, making a set list, and I said, “I’d love it if we had another song that had simple chords.” I wanted something I could riff off of. And Lenny said, “Well, there’s ‘Gloria.’” And I was like, “Is that a good one?” And he said, “It’s the best.” It freed me up in a certain way to do a song like “Gloria,” and not be hung up with the fact that it was written from a male point of view.',
    start: 500, end: 951,
  },
  {
    disc: 1, n: 2, title: 'Redondo Beach',
    claim: 'Smith says “Redondo Beach” began as a poem after an argument with her sister at the Chelsea Hotel and evolved with Richard Sohl and Lenny Kaye into a reggae song.',
    excerpt: 'Side 1 Redondo Beach [] [] Patti Smith I wrote it at the Chelsea Hotel. I had a rare argument with my sister and she disappeared, I think she went to Coney Island. But I got this frightened feeling that something had happened to her. I wrote it as a poem and I used to read it in poetry readings. And then with Richard [Sohl] and Lenny, it evolved as a little reggae song.',
    start: 5946, end: 6318,
  },
  {
    disc: 1, n: 3, title: 'Birdland',
    claim: 'Smith recalls the producer, whom she calls John, challenging her to fully commit to improvising “Birdland.”',
    excerpt: 'Patti Smith I was completely green. I had never worked with a producer. If John couldn’t win, he would step back and challenge me. “OK, you want to improvise ‘Birdland’? You want to wing it? Then really do it.”',
    start: 8657, end: 8867,
  },
  {
    disc: 1, n: 4, title: 'Free Money',
    claim: 'Smith says “Free Money” was really for her mother and connects it to her family’s severe financial struggle.',
    excerpt: 'Side 1 Free Money [] [] Patti Smith So many people think it’s a love song. I wrote it as [] “Oh baby,” as if perhaps it is, but it was really for my mother. My family struggled financially, sometimes to the point of not having enough food on the table.',
    start: 11867, end: 12119,
  },
  {
    disc: 1, n: 5, title: 'Kimberly',
    claim: 'Lenny Kaye says “Kimberly” remembers the birth of Smith’s sister and began like a Booker T. & the M.G.’s-style song.',
    excerpt: 'Side 2 Side 2 Kimberly [] [] Lenny Kaye Patti’s remembering the birth of her sister Kimberly. I believe it started like a Booker T. & the M.G.’s kind of song.',
    start: 15734, end: 15892,
  },
  {
    disc: 1, n: 6, title: 'Break It Up',
    claim: 'Smith describes “Break It Up” as a homage to poetry, Jim Morrison, and dreaming, as well as a document of her friendship and creative process with Tom Verlaine.',
    excerpt: 'Side 2 Break It Up [] [] Patti Smith The song is a homage to poetry, to Jim [Morrison], to dreaming, but it also is a little document of my friendship with Tom [Verlaine] and our process together.',
    start: 18776, end: 18972,
  },
  {
    disc: 1, n: 7, title: 'Land',
    claim: 'Smith says the word “land” came from Chris Kenner’s “Land of 1000 Dances,” and says she loved “A Thousand and One Nights” and Scheherazade’s successive storytelling.',
    excerpt: 'Patti Smith The word “land” was from “Land of 1000 Dances” [the 1962 Chris Kenner song]. I loved “A Thousand and One Nights” and the idea of Scheherazade telling story after story.',
    start: 22009, end: 22189,
  },
  {
    disc: 1, n: 8, title: 'Elegie',
    claim: 'In the “Elegie” section, Smith says she wanted Chet Baker to play at the end, “sort of for Jimi,” but the proposed fee was beyond the album’s budget.',
    excerpt: 'Side 2 Elegie [] [] Jay Dee Daugherty The music was written by Allen Lanier, who was a skilled musician, and who actually knew things like, you know, scales and notes. [] Chords. [] Patti Smith It really was my dream to have Chet Baker play at the end, sort of for Jimi. But we couldn’t afford him. It was $5,000, but we didn’t have it. I think our whole budget was $20,000.',
    start: 26190, end: 26564,
  },
];

const trackEntries = documented.map((track) => ({
  albumId: ALBUM_ID,
  discNumber: track.disc,
  trackNumber: track.n,
  trackTitle: track.title,
  evidenceLevel: 'documented',
  verifiedFacts: [{
    claimId: `${ALBUM_ID}:${track.disc}:${track.n}:fact-1`,
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
    'One narrow attributed statement is retained from a dated archival snapshot; no unsupported musical analysis, lyric interpretation, or complete session reconstruction is claimed.',
  ],
  sourceRefs: [{ label: SOURCE_LABEL, title: SOURCE_TITLE, url: SOURCE_URL }],
}));

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all eight Horses catalog tracks with track-specific participant testimony and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank26-track-encyclopedia-author',
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

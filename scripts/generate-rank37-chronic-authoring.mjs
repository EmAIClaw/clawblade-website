// Generate rank-37 The Chronic authoring from the immutable collection report.
// All claims are narrow track-specific sample or source-audio credits from the
// fetched Wikipedia article body; no sequence, duration, or generic album prose
// is promoted as evidence.
import { readFileSync, writeFileSync } from 'node:fs';

const ALBUM_ID = '037-dr-dre-the-chronic-08e42779';
const CHECKED_AT = '2026-09-03';
const SOURCE_URL = 'https://en.wikipedia.org/wiki/The_Chronic';
const SOURCE_LABEL = 'Wikipedia The Chronic article';
const SOURCE_TITLE = 'The Chronic - Wikipedia';
const SOURCE_IDENTITY = 'en.wikipedia.org|The Chronic album article';
const SOURCE_ARTIFACT = 'f7c4a6352d5d1450c4bd0f75499633fe7086d2942ce391e08038cd371f53f153';

const evidenceByTrack = new Map([
  [1, { extract: '"Country Cooking" by Jim Dandy', start: 500, end: 530 }],
  [2, { extract: '"Atomic Dog" by George Clinton', start: 1026, end: 1056 }],
  [3, { extract: '"Mothership Connection (Star Child)", "Swing Down, Sweet Chariot (Live)" by Parliament', start: 1870, end: 1956 }],
  [4, { extract: 'Sampled from the LA uprising documentary, titled "Birth of a Nation 4x29x92", in which was directed by Matthew McDaniels.', start: 2623, end: 2744 }],
  [5, { extract: '"I Want\'a Do Something Freaky to You" by Leon Haywood', start: 3462, end: 3515 }],
  [6, { extract: '"Chestnuts" by Rudy Ray Moore', start: 4074, end: 4103 }],
  [7, { extract: '"Little Ghetto Boy" by Donny Hathaway', start: 4878, end: 4915 }],
  [8, { extract: '"Big Sur Suite" by Johnny "Hammond" Smith', start: 5520, end: 5561 }],
  [9, { extract: 'Contains an audio sample from The Mack', start: 6335, end: 6373 }],
  [10, { extract: '"Papa Was Too" by Joe Tex', start: 6991, end: 7016 }],
  [11, { extract: '"When the Levee Breaks" by Led Zeppelin', start: 7665, end: 7704 }],
  [12, { extract: '"Buffalo Gals" by Malcolm McLaren', start: 8310, end: 8343 }],
  [13, { extract: '"Back in Bed" by Jewell', start: 8864, end: 8887 }],
  [14, { extract: '"Do Your Thing (Live)" by Isaac Hayes', start: 9342, end: 9379 }],
  [15, { extract: '"P. Funk (Wants to Get Funked Up)", "Colour Me Funky" by Parliament', start: 10112, end: 10179 }],
  [16, { extract: '"Adolescent Funk" by Funkadelic', start: 10840, end: 10871 }],
]);

const claims = new Map([
  [1, 'The fetched track credits identify Jim Dandy’s “Country Cooking” as sampled material in “The Chronic (intro).”'],
  [2, 'The track credits list George Clinton’s “Atomic Dog” among the source recordings used for “Fuck Wit Dre Day (And Everybody’s Celebratin’).”'],
  [3, '“Let Me Ride” credits Parliament’s “Mothership Connection (Star Child)” and “Swing Down, Sweet Chariot (Live)” as source recordings.'],
  [4, '“The Day the Niggaz Took Over” uses audio from Matthew McDaniels’s Los Angeles uprising documentary “Birth of a Nation 4x29x92.”'],
  [5, 'The source credits Leon Haywood’s “I Want’a Do Something Freaky to You” on “Nuthin’ but a “G” Thang.”'],
  [6, '“Deeez Nuuuts” incorporates material from Rudy Ray Moore’s “Chestnuts.”'],
  [7, 'The credits connect “Lil’ Ghetto Boy” to Donny Hathaway’s recording “Little Ghetto Boy.”'],
  [8, '“A Nigga Witta Gun” credits Johnny “Hammond” Smith’s “Big Sur Suite” as source material.'],
  [9, '“Rat-Tat-Tat-Tat” contains an audio sample from the film The Mack.'],
  [10, 'The credits identify Joe Tex’s “Papa Was Too” as sampled material in “The $20 Sack Pyramid.”'],
  [11, '“Lyrical Gangbang” credits Led Zeppelin’s “When the Levee Breaks” among its source recordings.'],
  [12, '“High Powered” draws source material from Malcolm McLaren’s “Buffalo Gals.”'],
  [13, '“The Doctor’s Office” credits Jewell’s “Back in Bed.”'],
  [14, '“Stranded on Death Row” uses Isaac Hayes’s live recording of “Do Your Thing.”'],
  [15, '“The Roach (The Chronic Outro)” credits Parliament’s “P. Funk (Wants to Get Funked Up)” and “Colour Me Funky.”'],
  [16, 'The credits identify Funkadelic’s “Adolescent Funk” as source material for “Bitches Ain’t Shit.”'],
]);

const catalog = JSON.parse(readFileSync('src/data/catalog.generated.json', 'utf8'));
const album = catalog.albums.find((item) => item.id === ALBUM_ID);
if (!album) throw new Error('Rank-37 catalog identity is missing.');
if (album.tracks.length !== 16) throw new Error(`Expected 16 rank-37 catalog tracks, found ${album.tracks.length}.`);
const trackEntries = album.tracks.map((track) => {
  const key = `${track.discNumber}:${track.trackNumber}:${track.title}`;
  const evidence = evidenceByTrack.get(track.trackNumber);
  if (!evidence) throw new Error(`Missing collected evidence for exact catalog track ${key}.`);
  const claim = claims.get(track.trackNumber);
  if (!claim) throw new Error(`Missing authored claim for exact catalog track ${key}.`);
  return {
    albumId: ALBUM_ID,
    discNumber: track.discNumber,
    trackNumber: track.trackNumber,
    trackTitle: track.title,
    evidenceLevel: 'documented',
    verifiedFacts: [{
      claimId: `${ALBUM_ID}:${track.discNumber}:${track.trackNumber}:fact-1`,
      claim,
      sourceRefs: [{
        label: SOURCE_LABEL,
        title: SOURCE_TITLE,
        url: SOURCE_URL,
        sourceIdentity: SOURCE_IDENTITY,
        extractType: 'verbatim',
        evidenceStatus: 'retrieved',
        checkedAt: CHECKED_AT,
        extract: evidence.extract,
        artifactId: SOURCE_ARTIFACT,
        section: { kind: 'character-offsets', start: evidence.start, end: evidence.end },
      }],
    }],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    limitations: [
      'One attributed track-credit fact is retained; no musical analysis, lyric interpretation, or complete session reconstruction is claimed.',
    ],
    sourceRefs: [{ label: SOURCE_LABEL, title: SOURCE_TITLE, url: SOURCE_URL }],
  };
});
if (evidenceByTrack.size !== trackEntries.length) throw new Error('Evidence map contains unmatched rank-37 track evidence.');

const generatedAt = '2026-09-03T00:00:00.000Z';
const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all sixteen The Chronic catalog tracks with narrow track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt,
    generator: 'hermes-rank37-track-encyclopedia-author',
    model: 'gpt-5.6-sol',
  },
  reviewMetadata: {
    reviewedAt: null,
    reviewer: null,
    notes: '',
  },
  contentHash: '',
};
const doc = {
  metadata: { version: '1.0.0-candidate', generatedAt, albumCount: 1 },
  entries: { [ALBUM_ID]: entry },
};
const outputPath = `src/data/track-encyclopedia/authoring/${ALBUM_ID}.json`;
writeFileSync(outputPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, tracks: trackEntries.length, documented: trackEntries.length, artifactId: SOURCE_ARTIFACT }));

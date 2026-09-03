// Generate rank-34 authoring for Stevie Wonder — Innervisions.
// All nine catalog tracks retain one narrow claim from Billboard's fetched
// track-by-track review, with mechanically located verbatim source offsets.
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '034-stevie-wonder-innervisions-d09c9a35';
const CHECKED_AT = '2026-09-03';
const SOURCE_URL = 'https://www.billboard.com/music/rb-hip-hop/stevie-wonder-innervisions-classic-track-by-track-review-5638082';
const SOURCE_LABEL = 'Billboard Innervisions track-by-track review';
const SOURCE_TITLE = "Stevie Wonder, 'Innervisions': Classic Track-By-Track Review";
const SOURCE_IDENTITY = 'billboard.com|Stevie Wonder Innervisions track-by-track review';
const ARTIFACT_ID = '37e92a32898833562223d9623a604ceeda77ffebd6fbc04b600966300afc00ad';
const SONG_URL = 'https://en.wikipedia.org/wiki/All_in_Love_Is_Fair';
const SONG_LABEL = 'Wikipedia All in Love Is Fair article';
const SONG_TITLE = 'All in Love Is Fair - Wikipedia';
const SONG_IDENTITY = 'en.wikipedia.org|All in Love Is Fair song article';
const SONG_ARTIFACT_ID = '088191df73548e7b8ad5cde371f67a20d02a70719ce81e97dc81a76c016deba7';

const documented = [
  {
    n: 1,
    title: 'Too High',
    claim: 'Billboard describes “Too High” as a jazzy album opener about the pitfalls of drug use.',
    excerpt: 'The album opens with a jazzy number about the pitfalls of using drugs.',
    start: 500,
    end: 570,
  },
  {
    n: 2,
    title: 'Visions',
    claim: 'Billboard writes that on “Visions” Wonder sits at the piano while guitarists strum as he imagines a place where hate is a dream and love endures.',
    excerpt: 'Here Stevie sits back at his piano while guitarists pensively strum and he fantasizes about a place, “where hate’s a dream and love forever stands.”',
    start: 1071,
    end: 1219,
  },
  {
    n: 3,
    title: 'Living For the City',
    claim: 'Billboard states that each verse of “Living for the City” refers to an impoverished Black person trying to endure difficult circumstances.',
    excerpt: 'Each verse here refers to an impoverished Black person, trying to make it through rough times.',
    start: 1529,
    end: 1623,
  },
  {
    n: 4,
    title: 'Golden Lady',
    claim: 'Billboard describes “Golden Lady” as beginning with piano, guitar, and hi-hat before swelling into organ work.',
    excerpt: 'It begins with humble piano keys, a few guitar strums and high-hat taps, then swells to a bliss blast of organ work.',
    start: 3069,
    end: 3185,
  },
  {
    n: 5,
    title: 'Higher Ground',
    claim: 'Billboard calls “Higher Ground” a call to action that urges people to keep learning, challenges politicians while people die, and tells inactive listeners to stop sleeping.',
    excerpt: 'It’s a call to action (maybe the grooviest ever?), where he encourages people to “keep on learnin’,” outs politicians that talk while their “people keep on dyin’,” and those doing nothing to “stop sleepin’.”',
    start: 3303,
    end: 3510,
  },
  {
    n: 6,
    title: 'Jesus Children of America',
    claim: 'Billboard describes “Jesus Children of America” as pairing a dance-suggesting bounce with four minutes of Sunday-school admonishment.',
    excerpt: 'The bounce on this song suggests that it’s something to be danced to, but a close listen reveals that “Jesus Children of America” is really four minutes of Sunday school admonishment.',
    start: 3634,
    end: 3817,
  },
  {
    n: 7,
    title: 'All In Love Is Fair',
    source: 'song',
    claim: 'Wikipedia states that recording for “All in Love Is Fair” began on November 10, 1972, with Wonder on acoustic piano and Scott Edwards on guitar.',
    excerpt: 'Recording began for "All in Love is Fair" on November 10, 1972 at 2:30 A.M., with Wonder on acoustic piano and Scott Edwards on guitar.',
    start: 500,
    end: 635,
  },
  {
    n: 8,
    title: "Don't You Worry 'Bout a Thing",
    claim: 'Billboard describes the cut as Latin soul, with Stevie singing to a woman who is down on her luck and promising to stay by her side.',
    excerpt: 'This cut has a fun, Latin soul feel with Stevie singing to a lady that’s down on her luck. He encourages her and promises to be right by her side through all issues and at the ready when happy days return.',
    start: 4482,
    end: 4687,
  },
  {
    n: 9,
    title: "He's Misstra Know-It-All",
    claim: 'Billboard describes “He’s Misstra Know-It-All” as a cautionary tale about a hustler.',
    excerpt: 'The album’s closer is a cautionary tale about a hustler.',
    start: 4940,
    end: 4996,
  },
];

const trackEntries = documented.map((track) => {
  const source = track.source === 'song'
    ? { url: SONG_URL, label: SONG_LABEL, title: SONG_TITLE, identity: SONG_IDENTITY, artifactId: SONG_ARTIFACT_ID }
    : { url: SOURCE_URL, label: SOURCE_LABEL, title: SOURCE_TITLE, identity: SOURCE_IDENTITY, artifactId: ARTIFACT_ID };
  return ({
  albumId: ALBUM_ID,
  discNumber: 1,
  trackNumber: track.n,
  trackTitle: track.title,
  evidenceLevel: 'documented',
  verifiedFacts: [
    {
      claimId: `${ALBUM_ID}:1:${track.n}:fact-1`,
      claim: track.claim,
      sourceRefs: [
        {
          label: source.label,
          title: source.title,
          url: source.url,
          sourceIdentity: source.identity,
          extractType: 'verbatim',
          evidenceStatus: 'retrieved',
          checkedAt: CHECKED_AT,
          extract: track.excerpt,
          artifactId: source.artifactId,
          section: { kind: 'character-offsets', start: track.start, end: track.end },
        },
      ],
    },
  ],
  musicalCharacter: '',
  albumContext: '',
  listeningNotes: '',
  limitations: [
    'One attributed track-specific editorial observation retained; no independent listening analysis, lyric interpretation beyond the cited source, or complete session reconstruction is claimed.',
  ],
  sourceRefs: [{ label: source.label, title: source.title, url: source.url }],
  });
});

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all nine Innervisions catalog tracks with track-specific fetched evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank34-track-encyclopedia-author',
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
console.log(`Wrote authoring file with ${trackEntries.length} tracks (${documented.length} documented).`);

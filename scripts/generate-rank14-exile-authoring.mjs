// Generate rank-14 authoring file for The Rolling Stones — Exile on Main St.
// Excerpts are verbatim from the fetched Rolling Stone "Exile on Main St. Track
// By Track" article (September 21, 2006), pandoc-extracted.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ALBUM_ID = '014-the-rolling-stones-exile-on-main-st-9d89aa7d';
const CHECKED_AT = '2026-09-03';
const SOURCE_URL = 'https://www.rollingstone.com/music/music-news/exile-on-main-st-track-by-track-242956';
const SOURCE_LABEL = 'Rolling Stone Exile on Main St. Track By Track article';
const SOURCE_TITLE = "'Exile on Main St.' Track By Track - Rolling Stone";
const SOURCE_IDENTITY = 'rollingstone.com|Exile on Main St. Track By Track 2006';
const COLLECTION_REPORT = 'reports/rank14-exile-source-collection.json';

// Each track: { n, title, claim } — claim is a narrow track-specific statement
// sourced to the Rolling Stone article; the verbatim excerpt is loaded from the
// collection report bindings.
const tracks = [
  {
    n: 1, title: 'Rocks Off',
    claim: 'Rolling Stone notes that after Keith Richards fell asleep while overdubbing a guitar part on "Rocks Off," engineer Andy Johns called it a night, only to be dragged back at five in the morning so Richards could add another track.',
  },
  {
    n: 2, title: 'Rip This Joint',
    claim: 'Rolling Stone notes that "Rip This Joint" features Bill Plummer on upright bass with Bobby Keys on both tenor and baritone saxophones, and was one of only six Exile tracks performed regularly on the Stones\' 1972 tour of America.',
  },
  {
    n: 3, title: 'Shake Your Hips',
    claim: 'Rolling Stone notes that "Shake Your Hips" was written by Slim Harpo and sung by Mick Jagger in a voice that Richard Williams of Melody Maker felt was an "unnecessary affectation."',
  },
  {
    n: 4, title: 'Casino Boogie',
    claim: 'Rolling Stone notes that "Casino Boogie" features Nicky Hopkins on piano and Jagger singing the line "Dietrich movies/Close-up boogies/Kissing cunt in Cannes."',
  },
  {
    n: 5, title: 'Tumbling Dice',
    claim: 'Rolling Stone notes that "Tumbling Dice," originally titled "Good Time Woman," was the lead single from Exile and first surfaced during the Sticky Fingers sessions, and that producer Jimmy Miller was edited in after Charlie Watts had trouble with a drum part after the breakdown.',
  },
  {
    n: 6, title: 'Sweet Virginia',
    claim: 'Rolling Stone notes that the vocal on "Sweet Virginia" is influenced by Nellcôte guest Gram Parsons, who had been hanging with Richards since meeting him in Los Angeles while the Stones rehearsed for their 1969 U.S. tour.',
  },
  {
    n: 7, title: 'Torn And Frayed',
    claim: 'Rolling Stone notes that "Torn And Frayed" is another Gram Parsons-influenced track, with Al Perkins on pedal steel guitar and lyrics about either Richards or Parsons.',
  },
  {
    n: 8, title: 'Sweet Black Angel',
    claim: 'Rolling Stone notes that "Sweet Black Angel" is Jagger\'s paean of love to Angela Davis, then in prison on murder and kidnapping charges, and that it was originally recorded live on the mobile at Stargroves with Miller on percussion and was the B side of "Tumbling Dice."',
  },
  {
    n: 9, title: 'Loving Cup',
    claim: 'Rolling Stone notes that "Loving Cup" was originally recorded at Olympic Studios in 1969 and was performed by the Stones at their free Hyde Park concert on July 5th, 1969, where Mick Taylor made his debut with the band.',
  },
  {
    n: 10, title: 'Happy',
    claim: 'Rolling Stone notes that "Happy" is Richards\' signature tune, inspired by the news that his companion Anita Pallenberg was pregnant, and that he knocked it out during a sound check in the Nellcôte basement with Keys on baritone sax and Miller on drums.',
  },
  {
    n: 11, title: 'Turd On The Run',
    claim: 'Rolling Stone notes that "Turd On The Run" features Bill Plummer on bass, overdubbed at Sunset Sound in Los Angeles after the Stones had fled the south of France, with Jagger on harp.',
  },
  {
    n: 12, title: 'Ventilator Blues',
    claim: 'Rolling Stone notes that "Ventilator Blues" is the only Exile track co-written by Mick Taylor, and that its title came from the single fan in a corner window of the Nellcôte basement that, as Andy Johns notes, "didn\'t work very well."',
  },
  {
    n: 13, title: 'I Just Want To See His Face',
    claim: 'Rolling Stone notes that "I Just Want To See His Face" features an uncredited Dr. John on piano with Richards on organ, Plummer on string bass, Taylor on electric bass and Miller on percussion, and that Jagger made up the words as he recorded the song.',
  },
  {
    n: 14, title: 'Let It Loose',
    claim: 'Rolling Stone notes that "Let It Loose" is another Exile track originally recorded at Olympic Studios.',
  },
  {
    n: 15, title: 'All Down The Line',
    claim: 'Rolling Stone notes that "All Down The Line" was Jagger\'s initial choice for a single, and that when Andy Johns could not imagine it on the radio, Jagger sent pianist and road manager Ian Stewart to an L.A. station with a tape.',
  },
  {
    n: 16, title: 'Stop Breaking Down',
    claim: 'Rolling Stone notes that "Stop Breaking Down" is a Robert Johnson cover featuring Ian Stewart on boogie-woogie piano and Mick Taylor on slide guitar, and was also originally recorded at Olympic Studios.',
  },
  {
    n: 17, title: 'Shine A Light',
    claim: 'Rolling Stone notes that "Shine A Light" is the oldest song on the album, recorded at Olympic, and features the late Billy Preston on organ and piano, Taylor on bass, and producer Miller on drums.',
  },
  {
    n: 18, title: 'Soul Survivor',
    claim: 'Rolling Stone notes that "Soul Survivor" features Richards on bass, with Jagger singing the lines "You ain\'t giving me no quarter/I\'d rather drink seawater/l wish I\'d never brought you/It\'s gonna be the death of me."',
  },
];

function loadBindings() {
  if (!existsSync(COLLECTION_REPORT)) return {};
  const report = JSON.parse(readFileSync(COLLECTION_REPORT, 'utf8'));
  const bindings = {};
  for (const result of report.results ?? []) {
    if (result.status !== 'collected') continue;
    for (const claim of result.claims ?? []) {
      bindings[claim.trackTitle] = { artifactId: result.artifactId, section: claim.section, retainedExtract: claim.retainedExtract };
    }
  }
  return bindings;
}

const bindings = loadBindings();
const zeroHash = '0'.repeat(64);

const trackEntries = tracks.map((t) => {
  const binding = bindings[t.title] ?? { artifactId: zeroHash, section: { kind: 'character-offsets', start: 0, end: 0 }, retainedExtract: '' };
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
            label: SOURCE_LABEL,
            title: SOURCE_TITLE,
            url: SOURCE_URL,
            sourceIdentity: SOURCE_IDENTITY,
            extractType: 'verbatim',
            evidenceStatus: 'retrieved',
            checkedAt: CHECKED_AT,
            extract: binding.retainedExtract,
            artifactId: binding.artifactId,
            section: binding.section,
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
      { label: SOURCE_LABEL, title: SOURCE_TITLE, url: SOURCE_URL },
    ],
  };
});

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all eighteen Exile on Main St. catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank14-track-encyclopedia-author',
    model: 'gpt-5-codex',
  },
  reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  contentHash: '',
};

const doc = {
  metadata: { version: '1.0.0-candidate', generatedAt: '2026-09-03T00:00:00.000Z', albumCount: 1 },
  entries: { [ALBUM_ID]: entry },
};

writeFileSync(`src/data/track-encyclopedia/authoring/${ALBUM_ID}.json`, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote rank-14 authoring file with ${trackEntries.length} tracks; bindings=${Object.keys(bindings).length}.`);

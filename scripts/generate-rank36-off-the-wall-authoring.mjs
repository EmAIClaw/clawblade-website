// Generate the rank-36 Off the Wall authoring candidate from collected evidence.
import { readFileSync, writeFileSync } from 'node:fs';

const ALBUM_ID = '036-michael-jackson-off-the-wall-4752dab3';
const CHECKED_AT = '2026-09-03';
const report = JSON.parse(readFileSync('reports/rank36-off-the-wall-source-collection.json', 'utf8'));
const sources = new Map(report.results.flatMap((result) => [[result.canonicalUrl, result], [result.finalUrl, result]]));

const BILLBOARD_URL = 'https://www.billboard.com/music/reviews/michael-jacksons-off-the-wall-at-35-classic-track-by-track-6214222';
const ALBUMISM_URL = 'https://albumism.com/features/michael-jackson-off-the-wall-album-anniversary';
const sourceMeta = {
  [BILLBOARD_URL]: {
    label: 'Billboard Off the Wall track-by-track review',
    title: 'Michael Jackson’s ‘Off the Wall’ at 35: Classic Track-by-Track Album Review',
    identity: 'billboard.com|Off the Wall at 35 track-by-track review',
  },
  [ALBUMISM_URL]: {
    label: 'Albumism Off the Wall anniversary feature',
    title: 'Michael Jackson’s ‘Off The Wall’ Turns 45 | Album Anniversary',
    identity: 'albumism.com|Off the Wall album anniversary feature',
  },
};

const claims = [
  [1, "Don't Stop 'Til You Get Enough", BILLBOARD_URL, 'Billboard notes that Jackson sings self-penned lyrics over music he wrote himself on “Don’t Stop ‘Til You Get Enough.”'],
  [2, 'Rock With You', BILLBOARD_URL, 'Billboard characterizes “Rock With You” as slower and funkier than “Don’t Stop ‘Til You Get Enough.”'],
  [3, "Workin' Day and Night", BILLBOARD_URL, 'Billboard identifies “Workin’ Day and Night” as the second of three songs on the album written solely by Jackson.'],
  [4, 'Get On the Floor', ALBUMISM_URL, 'Albumism describes “Get On the Floor” as structured around co-writer Louis Johnson’s bass work, with a sparse arrangement of bass, strings, vocals, and percussion.'],
  [5, 'Off the Wall', BILLBOARD_URL, 'Billboard states that Rod Temperton wrote “Off the Wall,” the album’s third of four Top 10 pop hits.'],
  [6, 'Girlfriend', BILLBOARD_URL, 'Billboard states that Paul McCartney included “Girlfriend” on Wings’ 1978 album London Town but wrote it with Michael Jackson in mind.'],
  [7, "She's Out of My Life", BILLBOARD_URL, 'Billboard reports that Michael Jackson cried at the end of each take of “She’s Out of My Life.”'],
  [8, "I Can't Help It", BILLBOARD_URL, 'Billboard states that the tune was co-written by Stevie Wonder.'],
  [9, "It's the Falling in Love", BILLBOARD_URL, 'Billboard says the idea of romance and the mystery of thinking about what might be are better than the real thing.'],
  [10, 'Burn This Disco Out', BILLBOARD_URL, 'Billboard notes that Jackson affects a low bellow for the line “Keep the boogie alright” in “Burn This Disco Out.”'],
];

const trackEntries = claims.map(([trackNumber, trackTitle, url, claim]) => {
  const source = sources.get(url);
  if (!source || source.status !== 'collected') throw new Error(`Missing collected source ${url}`);
  const evidence = source.claims.find((item) => item.trackTitle === trackTitle);
  if (!evidence) throw new Error(`Missing collected evidence for ${trackTitle}`);
  const meta = sourceMeta[url];
  return {
    albumId: ALBUM_ID,
    discNumber: 1,
    trackNumber,
    trackTitle,
    evidenceLevel: 'documented',
    verifiedFacts: [{
      claimId: `${ALBUM_ID}:1:${trackNumber}:fact-1`,
      claim,
      sourceRefs: [{
        label: meta.label,
        title: meta.title,
        url,
        sourceIdentity: meta.identity,
        extractType: 'verbatim',
        evidenceStatus: 'retrieved',
        checkedAt: CHECKED_AT,
        extract: evidence.retainedExtract,
        artifactId: source.artifactId,
        section: evidence.section,
      }],
    }],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    limitations: ['One attributed track-specific statement retained; no complete session reconstruction or independent listening analysis is claimed.'],
    sourceRefs: [{ label: meta.label, title: meta.title, url }],
  };
});

const generatedAt = '2026-09-03T00:00:00.000Z';
const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all ten Off the Wall catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt,
    generator: 'gpt-5.6-sol-rank36-track-encyclopedia-author',
    model: 'gpt-5.6-sol',
  },
  reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  contentHash: '',
};
const doc = {
  metadata: { version: '1.0.0-candidate', generatedAt, albumCount: 1 },
  entries: { [ALBUM_ID]: entry },
};
writeFileSync(`src/data/track-encyclopedia/authoring/${ALBUM_ID}.json`, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote authoring file with ${trackEntries.length} documented tracks.`);

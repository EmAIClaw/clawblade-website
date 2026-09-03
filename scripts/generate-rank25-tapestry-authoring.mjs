// Generate rank-25 authoring for Carole King — Tapestry from collected source metadata.
import { readFileSync, writeFileSync } from 'node:fs';

const ALBUM_ID = '025-carole-king-tapestry-b29b056b';
const CHECKED_AT = '2026-09-03';
const report = JSON.parse(readFileSync('reports/rank25-tapestry-source-collection.json', 'utf8'));
const catalog = JSON.parse(readFileSync('src/data/catalog.generated.json', 'utf8'));
const album = catalog.albums.find((item) => item.id === ALBUM_ID);
if (!album) throw new Error(`Missing catalog album ${ALBUM_ID}`);
if (album.tracks.length !== 12) throw new Error(`Expected 12 catalog tracks, found ${album.tracks.length}`);

const claims = new Map([
  [1, 'Wikipedia reports James Perone’s analysis that accenting the end of “tumbling” produces a musical equivalent of a tumble.'],
  [2, 'Wikipedia identifies James Taylor on acoustic guitar, Carole King on piano, Russ Kunkel on drums, Charles Larkey on bass guitar, and Curtis Amy on flute for “So Far Away.”'],
  [3, 'Wikipedia notes that Danny Kortchmar and Curtis Amy each take an instrumental solo on “It’s Too Late.”'],
  [5, 'Wikipedia reports Carole King’s account that “Beautiful” came to her spontaneously rather than through a conscious attempt to write it.'],
  [7, 'Wikipedia reports James Taylor’s recollection that King described “You’ve Got a Friend” as a response to a line in his “Fire and Rain.”'],
  [8, 'Wikipedia reports that King had written the music and most of the lyric for “Where You Lead” before asking Toni Stern to supply the bridge for co-writing credit.'],
  [9, 'Wikipedia states that King’s Tapestry recording of “Will You Love Me Tomorrow?” used Joni Mitchell and James Taylor for background vocals on separate audio channels.'],
  [10, 'Wikipedia describes “Smackwater Jack” as telling of a confrontation between the outlaw Smackwater Jack and Big Jim the Chief.'],
]);

const sourceTitles = new Map([
  [1, 'I Feel the Earth Move - Wikipedia'],
  [2, 'So Far Away (Carole King song) - Wikipedia'],
  [3, "It's Too Late (Carole King song) - Wikipedia"],
  [5, 'Beautiful (Carole King song) - Wikipedia'],
  [7, "You've Got a Friend - Wikipedia"],
  [8, 'Where You Lead - Wikipedia'],
  [9, 'Will You Love Me Tomorrow - Wikipedia'],
  [10, 'Smackwater Jack (song) - Wikipedia'],
]);

const resultsByTrack = new Map();
for (const result of report.results ?? []) {
  const claim = result.claims?.[0];
  if (result.status !== 'collected' || !claim) continue;
  resultsByTrack.set(claim.trackNumber, { ...result, claim });
}
if (resultsByTrack.size !== claims.size) throw new Error(`Expected ${claims.size} collected track sources, found ${resultsByTrack.size}`);

const insufficientResearch = {
  4: {
    queries: ['Carole King Tapestry track by track interview Home Again', 'site:caroleking.com/discography/tracks/tapestry Home Again', 'Tapestry personnel Home Again Carole King'],
    outcome: 'Fetched official discography and album-level editorial sources exposed lyrics, credits, or generic album context, but no sufficiently informative source-body claim specific to the composition or recording of “Home Again.”',
  },
  6: {
    queries: ['Carole King Tapestry track by track interview Way Over Yonder', 'site:caroleking.com/discography/tracks/tapestry Way Over Yonder', 'Way Over Yonder Tapestry recording interview'],
    outcome: 'Fetched official discography and album-level editorial sources exposed lyrics, credits, or broad critical description, but no sufficiently informative source-body claim specific to the composition or recording of “Way Over Yonder.”',
  },
  11: {
    queries: ['Carole King Tapestry title track song story interview', 'site:caroleking.com/discography/tracks/tapestry Tapestry', 'Carole King Tapestry song meaning recording'],
    outcome: 'Fetched official discography and album-level editorial sources exposed lyrics and broad album commentary, but no sufficiently informative source-body claim specific to the composition or recording of the title track.',
  },
  12: {
    queries: ['Carole King Natural Woman Tapestry version recording interview', 'site:caroleking.com/discography/tracks/tapestry Natural Woman', 'Carole King Tapestry Natural Woman personnel'],
    outcome: 'Fetched official discography, Library of Congress, and encyclopedia sources established earlier authorship/performance history but did not provide a sufficiently informative claim specific to King’s Tapestry recording of “(You Make Me Feel Like) A Natural Woman.”',
  },
};

const trackEntries = album.tracks.map((catalogTrack) => {
  const base = {
    albumId: ALBUM_ID,
    discNumber: catalogTrack.discNumber,
    trackNumber: catalogTrack.trackNumber,
    trackTitle: catalogTrack.title,
  };
  const collected = resultsByTrack.get(catalogTrack.trackNumber);
  if (collected) {
    const sourceTitle = sourceTitles.get(catalogTrack.trackNumber);
    const label = `Wikipedia ${catalogTrack.title} article`;
    return {
      ...base,
      evidenceLevel: 'documented',
      verifiedFacts: [{
        claimId: `${ALBUM_ID}:${catalogTrack.discNumber}:${catalogTrack.trackNumber}:fact-1`,
        claim: claims.get(catalogTrack.trackNumber),
        sourceRefs: [{
          label,
          title: sourceTitle,
          url: collected.canonicalUrl,
          sourceIdentity: `en.wikipedia.org|${sourceTitle.replace(/ - Wikipedia$/, '')}`,
          extractType: 'verbatim',
          evidenceStatus: 'retrieved',
          checkedAt: CHECKED_AT,
          extract: collected.claim.retainedExtract,
          artifactId: collected.artifactId,
          section: collected.claim.section,
        }],
      }],
      musicalCharacter: '',
      albumContext: '',
      listeningNotes: '',
      limitations: ['One narrow attributed statement is retained; no broader lyric interpretation, listening analysis, or complete session reconstruction is claimed.'],
      sourceRefs: [{ label, title: sourceTitle, url: collected.canonicalUrl }],
    };
  }

  const research = insufficientResearch[catalogTrack.trackNumber];
  if (!research) throw new Error(`No final disposition for catalog track ${catalogTrack.trackNumber}: ${catalogTrack.title}`);
  return {
    ...base,
    evidenceLevel: 'insufficient-evidence',
    verifiedFacts: [],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    researchDisposition: {
      completedAt: CHECKED_AT,
      searchedQueries: research.queries,
      sourceClasses: [
        'Carole King official discography album and track pages',
        'Library of Congress National Recording Registry essay',
        'Wikipedia album and song articles',
        'reputable retrospective and interview search results',
      ],
      outcome: research.outcome,
    },
    limitations: [research.outcome],
    sourceRefs: [],
  };
});

const catalogIdentity = album.tracks.map((track) => `${track.discNumber}:${track.trackNumber}:${track.title}`);
const authoredIdentity = trackEntries.map((track) => `${track.discNumber}:${track.trackNumber}:${track.trackTitle}`);
if (JSON.stringify(catalogIdentity) !== JSON.stringify(authoredIdentity)) throw new Error('Generated track identity does not exactly match catalog order.');

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Research all twelve Tapestry catalog tracks; retain eight source-bound claims and four explicit insufficient-evidence dispositions after independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'gpt-5.6-sol-rank25-track-encyclopedia-author',
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
console.log(`Wrote rank-25 authoring: ${trackEntries.length} tracks (${claims.size} documented, ${trackEntries.length - claims.size} insufficient-evidence).`);

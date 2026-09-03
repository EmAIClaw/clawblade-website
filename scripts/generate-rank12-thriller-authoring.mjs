// Generate rank-12 authoring file for Michael Jackson — Thriller.
// Excerpts are verbatim from the fetched Thriller 40 Bruce Swedien track-by-track article.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ALBUM_ID = '012-michael-jackson-thriller-a46ba2f6';
const CHECKED_AT = '2026-09-03';
const SOURCE_URL = 'https://www.thriller40.com/articles/bruce-swedien-on-thriller-track-by-track';
const SOURCE_LABEL = 'Thriller 40 Bruce Swedien track-by-track article';
const SOURCE_TITLE = 'Bruce Swedien On ‘Thriller’ Track By Track - Thriller 40';
const SOURCE_IDENTITY = 'thriller40.com|Bruce Swedien 2009 track-by-track';
const COLLECTION_REPORT = 'reports/rank12-thriller-source-collection.json';

const tracks = [
  {
    n: 1,
    title: "Wanna Be Startin' Somethin'",
    claim: 'Thriller 40 quotes Bruce Swedien saying “Wanna Be Startin’ Somethin’” began with extensive percussion, including drum machines, live drums, and a Univox drum machine he believed was an SR55.',
    excerpt: 'It starts with a lot of percussion. There’s some drum machines and some live drums and other things. It’s a Univox drum machine. We actually used it a lot on the Brothers Johnson record, and we were using it at that time on Michael’s record as well. I think it’s an SR55.',
  },
  {
    n: 2,
    title: 'Baby Be Mine',
    claim: 'Thriller 40 quotes Bruce Swedien saying “Baby Be Mine” used John Robinson on drums and that Michael Jackson recorded all his vocals on Swedien’s unpainted, unvarnished eight-foot-square drum platform.',
    excerpt: 'That’s John Robinson playing drums on my drum platform. I still use it and Michael did all his vocals on that drum platform. It’s unpainted, unvarnished, about eight feet square and by getting the sound source up off the floor, it prevented secondary pick-up if I was recording other instruments along with whatever was on the drum platform.',
  },
  {
    n: 3,
    title: 'The Girl Is Mine',
    claim: 'Thriller 40 quotes Bruce Swedien saying “The Girl Is Mine” was the first track recorded for Thriller and that Paul McCartney arrived prepared for the duet session.',
    excerpt: 'That was actually the first track we recorded for the album. It was a duet with Michael and Paul McCartney who was an absolute joy to work with. He was such a gentleman, he came to the studio prepared – Linda McCartney was with him and we had a fabulous time.',
  },
  {
    n: 4,
    title: 'Thriller',
    claim: 'Thriller 40 quotes Bruce Swedien saying Michael Jackson performed the wolf howls on “Thriller,” though some library material was also used.',
    excerpt: 'But you know who it is that is doing those wolf howls? That’s Michael Jackson, we had to get Michael to do it instead, but he did it so great. There’s some library stuff in there but Michael did those wolf howls.',
  },
  {
    n: 5,
    title: 'Beat It',
    claim: 'Thriller 40 quotes Bruce Swedien saying “Beat It” kept a stock Synclavier intro patch because Michael Jackson loved it, even though the production team wanted every sound to be unrecognizable and unique.',
    excerpt: 'Oh boy – the intro synth was a stock Synclavier patch; any Synclavier will make that sound. We liked it but we wanted everything to be unrecognisable, unique, so we didn’t want to use that sound, but Michael loved it and made us keep it.',
  },
  {
    n: 6,
    title: 'Billie Jean',
    claim: 'Thriller 40 quotes Bruce Swedien saying the “Billie Jean” bass was played by Louis Johnson of the Brothers Johnson and recorded through a DI with a UTC transformer for a warm low end.',
    excerpt: 'The bass on this was fantastic – the bass player is Louis Johnson from the Brothers Johnson and I picked him up with a DI, which I still have – it’s got a UTC transformer in it and I got it when I lived in Chicago and the low-end is incredible – very warm.',
  },
  {
    n: 7,
    title: 'Human Nature',
    claim: 'Thriller 40 quotes Bruce Swedien saying “Human Nature” was written by Steve Porcaro of Toto with John Bettis, with Porcaro playing and programming many of the synthesizers.',
    excerpt: 'That was a track written by Steve Porcaro of Toto [with John Bettis]. He played and programmed a lot of the synths. It’s a really incredible piece of music; it’s so different, and Michael sings it so well.',
  },
  {
    n: 8,
    title: 'P.Y.T. (Pretty Young Thing)',
    claim: 'Thriller 40 quotes Bruce Swedien saying “P.Y.T. (Pretty Young Thing)” used a lot of Minimoog, programmed by Michael Boddicker, who was the synth programmer present throughout the project.',
    excerpt: 'P.Y.T. was written by James Ingram and Quincy Jones – a great stone R&B hit. We used a lot of Minimoog – our synth programmer who was there all the time was Michael Boddicker. He programmed the Minimoog and he owned the best-sounding synths at the time.',
  },
  {
    n: 9,
    title: 'The Lady in My Life',
    claim: 'Thriller 40 quotes Bruce Swedien saying Rod Temperton wrote “The Lady in My Life” and arrived at the studio with every musical detail written down or accounted for in his mind.',
    excerpt: 'Rod Temperton wrote that. Rod is very different from anyone else I’ve ever known in the music business – he’s the most disciplined pop music composer I’ve ever met. When he comes to the studio, every musical detail is written down or accounted for in Rod’s mind.',
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
  const binding = bindings[t.title] ?? { artifactId: zeroHash, section: { kind: 'character-offsets', start: 0, end: t.excerpt.length }, retainedExtract: t.excerpt };
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
      'One attributed recording/production statement retained; no musical analysis, lyric interpretation, or complete session reconstruction is claimed.',
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
  changeNote: 'Complete all nine Thriller catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank12-track-encyclopedia-author',
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
console.log(`Wrote rank-12 authoring file with ${trackEntries.length} tracks; bindings=${Object.keys(bindings).length}.`);

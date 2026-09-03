// Generate rank-10 authoring file for The Miseducation of Lauryn Hill.
// Excerpts are verbatim from the fetched sources (pandoc/PDFKit extraction).
import { readFileSync, writeFileSync } from 'node:fs';

const ALBUM_ID = '010-lauryn-hill-the-miseducation-of-lauryn-hill-57da212b';
const CHECKED_AT = '2026-09-03';

const RS_URL = 'https://www.rollingstone.com/music/music-news/inside-the-miseducation-of-lauryn-hill-252219';
const RS_LABEL = 'Rolling Stone oral history of The Miseducation of Lauryn Hill';
const RS_TITLE = "Inside 'The Miseducation of Lauryn Hill'";
const RS_IDENTITY = 'rollingstone.com|Miseducation of Lauryn Hill oral history';

const PF_URL = 'https://pitchfork.com/reviews/albums/22035-the-miseducation-of-lauryn-hill';
const PF_LABEL = 'Pitchfork Sunday Review by Carvell Wallace';
const PF_TITLE = 'Lauryn Hill: The Miseducation of Lauryn Hill Album Review';
const PF_IDENTITY = 'pitchfork.com|Carvell Wallace Miseducation review';

const GR_URL = 'https://www.grammy.com/news/the-miseducation-of-lauryn-hill-facts-cover-controversy-records-anniversary-tour';
const GR_LABEL = 'GRAMMY.com 25 facts about The Miseducation of Lauryn Hill';
const GR_TITLE = "'The Miseducation Of Lauryn Hill': 25 Facts About The Iconic Album, From Its Cover To Its Controversy";
const GR_IDENTITY = 'grammy.com|Miseducation 25 facts';

const LOC_URL = 'https://www.loc.gov/static/programs/national-recording-preservation-board/documents/MiseducationOfLaurynHill.pdf';
const LOC_LABEL = 'Library of Congress National Recording Registry essay by Paula Mejia';
const LOC_TITLE = 'The Miseducation of Lauryn Hill (National Recording Registry essay)';
const LOC_IDENTITY = 'loc.gov|National Recording Registry Miseducation essay';

// Each track: { n, title, claim, source, excerpt }
const tracks = [
  {
    n: 1, title: 'Intro', source: 'loc',
    claim: 'The Library of Congress National Recording Registry essay notes that the album opens with a teacher alphabetically calling roll, reaching Hill\u2019s name several times with no answer before beginning to teach, and that the teacher was Ras Baraka, a poet, eighth-grade teacher, and later mayor of Newark.',
    excerpt: 'Consider how the album kicks off with a teacher alphabetically calling roll. He reaches Hill\u2019s name, calling it out several times. She\u2019s nowhere to be found, so he moves on and begins to teach. Ras Baraka, a poet, eighth-grade teacher, and later mayor of Newark, led the lesson',
  },
  {
    n: 2, title: 'Lost Ones', source: 'rs',
    claim: 'Producer Vada Nobles says \u201cLost Ones\u201d was made at the Bob Marley Museum on 56 Hope Road, which is why Hill raps \u201cI was hopeless, now I\u2019m on Hope Road.\u201d',
    excerpt: 'Nobles: We stayed way up in the hills and Rohan would take us to the studio. He would fly in that BMW around curves, he was messing with us. I remember being scared for my life. \u201cForgive Them Father\u201d and \u201cLost Ones\u201d were made at the Bob Marley Museum on 56 Hope Road. That\u2019s why on \u201cLost Ones\u201d she says, \u201cI was hopeless, now I\u2019m on Hope Road.\u201d',
  },
  {
    n: 3, title: 'Ex-Factor', source: 'rs',
    claim: 'Producer Vada Nobles says there was a female group called Ex Factor signed to Arista and they did a song called \u201cEx Factor\u201d for them, and that it and \u201cLoved Real Hard Once\u201d (later retitled \u201cWhen It Hurts So Bad\u201d) were the first two records worked on.',
    excerpt: 'Nobles: There was a female group called Ex Factor signed to Arista and we did a song called \u201cEx Factor\u201d for them. And then we started working on a song called \u201cLoved Real Hard Once\u201d \u2014 the title got switched [to \u201cWhen It Hurts So Bad\u201d]. Those were the first two records that we worked on.',
  },
  {
    n: 4, title: 'To Zion (feat. Carlos Santana)', source: 'rs',
    claim: 'Producer Che Vicious says he made the \u201cZion\u201d track during one of his 20-minute sessions in a hot Brooklyn brownstone studio, and that Hill teared up saying she had the idea for a song about her baby but did not know what the music should sound like until she heard that track.',
    excerpt: 'Che Vicious: I\u2019d gotten into a bunch of Spanish records. I lived in a brownstone in Brooklyn and there was this little studio apartment on the top floor that didn\u2019t have air conditioning. I could only go in there for 20 minutes at a time to make tracks because it was too hot. And one of those 20 minutes is when I made \u201cZion.\u201d I came in with the track and Lauryn teared up and said, \u201cI have this idea to do a song about my baby and I didn\u2019t know what the music should sound like until I heard that track.\u201d',
  },
  {
    n: 5, title: 'Doo Wop (That Thing)', source: 'rs',
    claim: 'Producer Vada Nobles says the title \u201cDoo Wop (That Thing)\u201d came off a box set labeled \u201cdoo wop\u201d sitting on the floor, and that he added a heavy drum to give the music a hip-hop edge.',
    excerpt: 'Nobles: There was a box set that said \u201cdoo wop\u201d sitting on the floor \u2014 the title for her single \u201cDoo Wop (That Thing)\u201d came off that box. We were making a song warning women about slick men, but there\u2019s some bad girls out here, so we gotta tell both sides. I thought the music was cheesy, it wasn\u2019t hard enough, so I put a really heavy drum in there just to give it some edge, something hip-hop.',
  },
  {
    n: 6, title: 'Superstar', source: 'rs',
    claim: 'Engineer Commissioner Gordon Williams says that when James Poyser came in for \u201cSuperstar,\u201d they rented a harpsichord so old it fell out of tune quickly, requiring a tuner to be present.',
    excerpt: 'Commissioner Gordon: When I mixed \u201cDoo Wop\u201d at Sony Studios, it was 128 tracks \u2014 two 48-track machines plus two 24 two-inch machines all running at the same time. When James Poyser came in for \u201cSuperstar,\u201d we rented a harpsichord that was so old it fell out of tune really quickly so we had to have the tuner actually there. By the time James finished playing it once it was out of tune.',
  },
  {
    n: 7, title: 'Final Hour', source: 'loc',
    claim: 'The Library of Congress National Recording Registry essay says that on \u201cFinal Hour\u201d Hill breaks down why she is one of the finest wordsmiths of her generation, quoting \u201cI treat this like my thesis / Well-written topic, broken down into pieces / I introduce then produce.\u201d',
    excerpt: 'On the unstoppable \u201cFinal Hour,\u201d for instance, she breaks down exactly why it is that she\u2019s one of the finest wordsmiths of her generation: \u201cI treat this like my thesis / Well- written topic, broken down into pieces / I introduce then produce / Words so profuse it\'s abuse how I juice up this beat,\u201d she raps, showing us a glimpse into her process.',
  },
  {
    n: 8, title: 'When It Hurts so Bad', source: 'rs',
    claim: 'Producer Vada Nobles says the song \u201cLoved Real Hard Once\u201d had its title switched to \u201cWhen It Hurts So Bad.\u201d',
    excerpt: 'Nobles: There was a female group called Ex Factor signed to Arista and we did a song called \u201cEx Factor\u201d for them. And then we started working on a song called \u201cLoved Real Hard Once\u201d \u2014 the title got switched [to \u201cWhen It Hurts So Bad\u201d].',
  },
  {
    n: 9, title: 'I Used to Love Him (feat. Mary J. Blige)', source: 'rs',
    claim: 'Producer Vada Nobles says \u201cI Used to Love Him\u201d came about during a conversation about Hill\u2019s relationship in the little attic studio in South Orange, and that it was about \u2018Clef.',
    excerpt: 'Nobles: There was a female group called Ex Factor signed to Arista and we did a song called \u201cEx Factor\u201d for them. And then we started working on a song called \u201cLoved Real Hard Once\u201d \u2014 the title got switched [to \u201cWhen It Hurts So Bad\u201d]. Those were the first two records that we worked on. We were making songs for other people and the songs started becoming too personal and we were like, wait a minute, this is your story. We were having a conversation about her relationship in the little studio in her attic in South Orange, and that\u2019s how \u201cI Used to Love Him\u201d came about. It was about \u2018Clef.',
  },
  {
    n: 10, title: 'Forgive Them Father', source: 'rs',
    claim: 'Producer Vada Nobles says \u201cForgive Them Father\u201d was made at the Bob Marley Museum on 56 Hope Road.',
    excerpt: 'Nobles: We stayed way up in the hills and Rohan would take us to the studio. He would fly in that BMW around curves, he was messing with us. I remember being scared for my life. \u201cForgive Them Father\u201d and \u201cLost Ones\u201d were made at the Bob Marley Museum on 56 Hope Road.',
  },
  {
    n: 11, title: 'Every Ghetto, Every City', source: 'grammy',
    claim: 'GRAMMY.com notes that when Hill says \u201cJack ya, jack ya, jack ya body\u201d in \u201cEvery Ghetto, Every City,\u201d she is referencing the 1986 club anthem \u201cJack Your Body\u201d by Chicago DJ/producer Steve \u2018Silk\u2019 Hurley.',
    excerpt: 'When she says, "Jack ya, jack ya, jack ya body" in "Every Ghetto, Every City," she is referencing the 1986 club anthem "Jack Your Body" by Chicago DJ/producer Steve \'Silk\' Hurley.',
  },
  {
    n: 12, title: "Nothing Even Matters (feat. D'Angelo)", source: 'rs',
    claim: 'D\u2019Angelo says that when he and Hill went into the studio together, he laid down his vocals in the course of an hour.',
    excerpt: 'D\u2019Angelo: Collaborating with Lauryn was very cool. She was warm and sweet. Originally, we were going to swap tunes for each other\u2019s projects because I was working on Voodoo at the same time and my keyboardist James Poyser was also working with her. I went to her house in New Jersey, she played a lot of songs for me and gave me a rough copy to listen to. When Lauryn and I went into in the studio together, I laid down my vocals in the course of an hour.',
  },
  {
    n: 13, title: 'Everything Is Everything', source: 'rs',
    claim: 'John Legend says Hill asked him to play piano on \u201cEverything Is Everything,\u201d and that he was playing along with a string part that was already there.',
    excerpt: 'John Legend: I was in the spring of my junior year at University of Pennsylvania. A friend invited me to give her a ride to Lauryn\u2019s house in Jersey. Lauryn was working \u201cEverything Is Everything.\u201d I sang and played a couple songs for her. She asked me to play piano on the track. She guided me a little bit but it was pretty simple because I was playing along with a string part that was already there.',
  },
  {
    n: 14, title: 'The Miseducation of Lauryn Hill', source: 'pitchfork',
    claim: 'Pitchfork\u2019s Sunday Review writes that on the title track Hill \u201creaches the apogee of this cycle by learning love of self.\u201d',
    excerpt: 'On \u201cTo Zion\u201d she is breathless, learning love of God through love of her child; on \u201cWhen It Hurts So Bad,\u201d she learns (painfully) about the love others, and on the title track, she reaches the apogee of this cycle by learning love of self.',
  },
  {
    n: 15, title: "Can't Take My Eyes Off of You (I Love You Baby)", source: 'rs',
    claim: 'Engineer Commissioner Gordon Williams says \u201cCan\u2019t Take My Eyes Off of You\u201d was never meant to be a commercial single, and was originally recorded for the Conspiracy Theory soundtrack.',
    excerpt: 'Commissioner Gordon: \u201cCan\u2019t Take My Eyes Off of You\u201d was never meant to be a commercial single. It was originally recorded for [the soundtrack for the movie] Conspiracy Theory and ended up on the radio, became popular, and that\u2019s how it ended became a bonus track.',
  },
  {
    n: 16, title: 'Tell Him', source: 'rs',
    claim: 'Backup singer Candice Anderson says \u201cTell Him\u201d took a while because Hill is very particular about how she wants it to sound.',
    excerpt: 'Candice Anderson (backup singer): I came in during the last two songs. I had just auditioned at her house and they were like, come to Chung King. I had no clue what was going on but she told us what to sing. \u201cTell Him\u201d took a while because she\u2019s very particular about how she wants it to sound.',
  },
];

const SOURCE_META = {
  rs: { url: RS_URL, label: RS_LABEL, title: RS_TITLE, identity: RS_IDENTITY },
  pitchfork: { url: PF_URL, label: PF_LABEL, title: PF_TITLE, identity: PF_IDENTITY },
  grammy: { url: GR_URL, label: GR_LABEL, title: GR_TITLE, identity: GR_IDENTITY },
  loc: { url: LOC_URL, label: LOC_LABEL, title: LOC_TITLE, identity: LOC_IDENTITY },
};

// Content-addressed source artifacts (byte-identical on disk) and the exact
// character offsets of each retained excerpt within the artifact's retainedText.
const RS_ARTIFACT = '9f33202438635ae677b7703b05ae7cf9bf8549581da2e2b0e2816825206cbff9';
const LOC_ARTIFACT = '4459e910afed80582368cdb479548d62d79ce52ba70cd9e4011752d9fb2e6e03';
const GR_ARTIFACT = 'dcd10ce08663de2934022bcba18361828a3b3e0aee0349e463947e17987383ca';
const PF_ARTIFACT = '0fe8073b60d1f5907ce0d7b30846eadd58d6aa59fff506d0ec0b105c87b8fdb6';

const BINDINGS = {
  1: { artifactId: LOC_ARTIFACT, start: 3168, end: 3445 },
  2: { artifactId: RS_ARTIFACT, start: 4908, end: 5251 },
  3: { artifactId: RS_ARTIFACT, start: 500, end: 787 },
  4: { artifactId: RS_ARTIFACT, start: 2054, end: 2560 },
  5: { artifactId: RS_ARTIFACT, start: 3301, end: 3696 },
  6: { artifactId: RS_ARTIFACT, start: 4274, end: 4661 },
  7: { artifactId: LOC_ARTIFACT, start: 500, end: 848 },
  8: { artifactId: RS_ARTIFACT, start: 500, end: 735 },
  9: { artifactId: RS_ARTIFACT, start: 500, end: 1094 },
  10: { artifactId: RS_ARTIFACT, start: 4908, end: 5175 },
  11: { artifactId: GR_ARTIFACT, start: 500, end: 679 },
  12: { artifactId: RS_ARTIFACT, start: 7342, end: 7797 },
  13: { artifactId: RS_ARTIFACT, start: 8128, end: 8530 },
  14: { artifactId: PF_ARTIFACT, start: 499, end: 738 },
  15: { artifactId: RS_ARTIFACT, start: 8691, end: 8955 },
  16: { artifactId: RS_ARTIFACT, start: 9429, end: 9723 },
};

const trackEntries = tracks.map((t) => {
  const src = SOURCE_META[t.source];
  const binding = BINDINGS[t.n];
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
            label: src.label,
            title: src.title,
            url: src.url,
            sourceIdentity: src.identity,
            extractType: 'verbatim',
            evidenceStatus: 'retrieved',
            checkedAt: CHECKED_AT,
            extract: t.excerpt,
            artifactId: binding.artifactId,
            section: { kind: 'character-offsets', start: binding.start, end: binding.end },
          },
        ],
      },
    ],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    limitations: [
      'One attributed production/recording statement retained; no musical analysis, lyric interpretation, or complete session reconstruction is claimed.',
    ],
    sourceRefs: [
      { label: src.label, title: src.title, url: src.url },
    ],
  };
});

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all sixteen Miseducation catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank10-track-encyclopedia-author',
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
console.log(`Wrote authoring file with ${trackEntries.length} tracks.`);

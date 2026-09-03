// Generate rank-15 authoring file for Public Enemy — It Takes a Nation of Millions to Hold Us Back.
// Excerpts are verbatim from two fetched Chuck D primary sources (pandoc extraction):
//   - AllHipHop "Class Of '88" track-by-track commentary (tracks 2-16)
//   - uDiscover Music Chuck D interview (track 1, "Countdown To Armageddon")
import { writeFileSync } from 'node:fs';

const ALBUM_ID = '015-public-enemy-it-takes-a-nation-of-millions-to-hold-us-back-749205b0';
const CHECKED_AT = '2026-09-03';

const AHH_URL = 'https://allhiphop.com/reviews-music/class-of-88-public-enemys-it-takes-a-nation-of-millions-to-hold-us-back';
const AHH_LABEL = 'AllHipHop Class Of \'88 track-by-track commentary by Chuck D';
const AHH_TITLE = "Class Of '88: Public Enemy's It Takes A Nation Of Millions To Hold Us Back - AllHipHop";
const AHH_IDENTITY = 'allhiphop.com|Class Of 88 Chuck D track-by-track commentary';

const UD_URL = 'https://www.udiscovermusic.com/stories/chuck-d-public-enemy-it-takes-a-nation-of-millions-to-hold-us-back-interview';
const UD_LABEL = 'uDiscover Music Chuck D interview by Kyle Eustice';
const UD_TITLE = "Chuck D On Public Enemy's 'It Takes A Nation Of Millions To Hold Us Back'";
const UD_IDENTITY = 'udiscovermusic.com|Chuck D It Takes a Nation interview';

// Each track: { n, title, source, claim, excerpt }
const tracks = [
  {
    n: 1, title: 'Countdown to Armageddon', source: 'udiscover',
    claim: 'Chuck D says that the beginning of "Countdown To Armageddon" starts with audio from a London concert, which Public Enemy called the "London Invasion" from the Def Jam Tour.',
    excerpt: 'You hear that on the beginning of “Countdown To Armageddon.” It starts with audio from a London concert. We called it the ‘London Invasion’ when we went over there with the Def Jam Tour.',
  },
  {
    n: 2, title: 'Bring the Noise', source: 'allhiphop',
    claim: 'Chuck D says "Bring The Noise" was originally a song for the Less Than Zero soundtrack for Def Jam Records and was really Public Enemy\'s second B-sided street hit.',
    excerpt: 'Chuck D.: “Bring The Noise” was originally a song for the Less Than Zero soundtrack for Def Jam [Records] and when it came down to it, it was really our second B-sided street hit.',
  },
  {
    n: 3, title: "Don't Believe the Hype", source: 'allhiphop',
    claim: 'Chuck D says "Don\'t Believe The Hype" was actually made before "Bring The Noise" for the Less Than Zero soundtrack, and that Public Enemy thought it was rather slow so they put it in the can.',
    excerpt: 'Chuck D.: “Don’t Believe The Hype” actually was made before “Bring The Noise” for the Less Than Zero soundtrack. We actually thought it was rather slow so we put it in the can.',
  },
  {
    n: 4, title: "Cold Lampin' with Flavor", source: 'allhiphop',
    claim: 'Chuck D says "Cold Lampin\' With Flavor" was something Flavor Flav had in his mind all the time, and that it took about a year to write and put everything up in one nutshell.',
    excerpt: 'Chuck D.: “Cold Lampin’ With Flavor” was something that Flavor had in his mind all the time and it was an outlet we made that was fast, crazy, and quick enough and Flavor stepped up to the task. It took about a year to write and put everything up in one nutshell.',
  },
  {
    n: 5, title: 'Terminator X to the Edge of Panic', source: 'allhiphop',
    claim: 'Chuck D says that on "Terminator X To The Edge Of Panic" he and Terminator X took "Rebel [Without A Pause]" and ran it backwards, with Terminator contributing parts.',
    excerpt: '“Terminator X To The Edge Of Panic” Produced By The Bomb Squad Chuck D.: Myself and Terminator was trying to make a record that was indicative of the speed of the instrumentals and also the aspect of the DJ. So Terminator actually contributed parts; we just took “Rebel [Without A Pause]” and ran it backwards.',
  },
  {
    n: 6, title: 'Mind Terrorist', source: 'allhiphop',
    claim: 'Chuck D says "Mind Terrorist" was just an instrumental that Public Enemy wanted to break up in between songs, introducing instrumentals and concerts.',
    excerpt: 'Chuck D.: “Mind Terrorist” was just an instrumental that we wanted to break up in between songs. It introduced instrumentals, and introduced concerts.',
  },
  {
    n: 7, title: 'Louder Than a Bomb', source: 'allhiphop',
    claim: 'Chuck D says "Louder Than A Bomb" was one of those records Public Enemy never performed live because there were records that were faster and similar.',
    excerpt: 'Chuck D.: “Louder Than A Bomb” was one of those records we never performed live because there were records that were faster and similar.',
  },
  {
    n: 8, title: 'Caught, Can We Get a Witness?', source: 'allhiphop',
    claim: 'Chuck D says "Caught, Can We Get A Witness" was built from a couple of samples that set the rhythm, presenting a court room scene about sampling that later really became true.',
    excerpt: 'Chuck D.: “Caught, Can We Get A Witness” was a record we found a couple of samples that set the rhythm and we wanted to present a court room scene of going court because we were sampling and it all really became true (Laughs).',
  },
  {
    n: 9, title: "Show 'Em Whatcha Got", source: 'allhiphop',
    claim: 'Chuck D says "Show Em Whatcha Got" was actually the first song on the album, and that at the last minute Hank Shocklee flipped the sides so it introduces the B-side.',
    excerpt: '“Show Em Whatcha Got” Produced By The Bomb Squad Chuck D.: Actually “Show Em Whatcha Got” was the first song on the album. Back then you had A-sides and B-sides as far as cassettes and records were concerned. At the last minute Hank flipped the sides and said “Nah this should be the B-side.”',
  },
  {
    n: 10, title: 'She Watch Channel Zero?!', source: 'allhiphop',
    claim: 'Chuck D says "She Watch Channel Zero?!" was Public Enemy\'s second record to take on rock aspects, using a Slayer sample ("Angel Of Death") because Slayer was distributed by Def Jam.',
    excerpt: 'Chuck D.: “She Watch Channel Zero?!” was our second record that we actually took some Rock aspects and got down with it. We actually took a Slayer sample (“Angel Of Death”) because Slayer was distributed by Def Jam and I said “Well music is music.”',
  },
  {
    n: 11, title: 'Night of the Living Baseheads', source: 'allhiphop',
    claim: 'Chuck D says that on "Night Of The Living Baseheads" Public Enemy were attacking drug dealers and the drug trade, wanting to make drugs appear nasty to young people.',
    excerpt: '“Night Of The Living Baseheads” Produced By The Bomb Squad Chuck D.: We were attacking drug dealers and the drug trade at that time. We wanted to make drugs appear nasty to young people.',
  },
  {
    n: 12, title: 'Black Steel in the Hour of Chaos', source: 'allhiphop',
    claim: 'Chuck D says "Black Steel" is about being jailed for your beliefs for fighting for all the people, and that he was jailed because he didn\'t believe in the war.',
    excerpt: 'Chuck D.: “Black Steel” is the other side of that. If you going to be jailed, be jailed for your beliefs for fighting for all the people. I was jailed because I didn’t believe in the war and my thing was I deserve to be free.',
  },
  {
    n: 13, title: 'Security of the First World', source: 'allhiphop',
    claim: 'Chuck D says "Security Of The First World" is an instrumental that signifies the strength and intelligence of the S1W\'s.',
    excerpt: '“Security Of The First World” Produced By The Bomb Squad Chuck D.: An instrumental that signifies the strength, intelligence of the S1W’s.',
  },
  {
    n: 14, title: 'Rebel Without a Pause', source: 'allhiphop',
    claim: 'Chuck D says "Rebel Without A Pause" is Public Enemy\'s breakthrough single that was broke by Lady B. in Philadelphia and Chuck Chillout in New York.',
    excerpt: 'Chuck D.: “Rebel Without A Pause” is our breakthrough single that was broke by Lady B. in Philadelphia and Chuck Chillout in New York.',
  },
  {
    n: 15, title: 'Prophets of Rage', source: 'allhiphop',
    claim: 'Chuck D says he wrote "Prophets Of Rage" while being in traffic on the Kosciusko going into the city from Queens into Brooklyn.',
    excerpt: 'Chuck D.: “Prophets Of Rage” I wrote while being in traffic on the Kosciusko going into the city from Queens into Brooklyn.',
  },
  {
    n: 16, title: 'Party for Your Right to Fight', source: 'allhiphop',
    claim: 'Chuck D says "Party For Your Right To Fight" was a total quirky song made to be the reverse opposite of "Fight For Your Right To Party" by The Beastie Boys.',
    excerpt: '“Party For Your Right To Fight” Produced By The Bomb Squad Chuck D.: A total quirky song; we wanted to make a song that was reverse opposite of “Fight For Your Right To Party” by The Beastie Boys who are our great friends.',
  },
];

const SOURCE_META = {
  allhiphop: { url: AHH_URL, label: AHH_LABEL, title: AHH_TITLE, identity: AHH_IDENTITY },
  udiscover: { url: UD_URL, label: UD_LABEL, title: UD_TITLE, identity: UD_IDENTITY },
};

// Content-addressed source artifacts (byte-identical on disk) and the exact
// character offsets of each retained excerpt within the artifact's retainedText.
const AHH_ARTIFACT = '5f5a3badeacd4edbd130e43099a547f5996e84e44c7c6df19451608deb8ae87c';
const UD_ARTIFACT = '55b7f8806a51297577136c4dc809a0caa36505663cc62c2d9f53dc676d87ca9d';

const BINDINGS = {
  1: { artifactId: UD_ARTIFACT, start: 5617, end: 5803 },
  2: { artifactId: AHH_ARTIFACT, start: 500, end: 679 },
  3: { artifactId: AHH_ARTIFACT, start: 1472, end: 1648 },
  4: { artifactId: AHH_ARTIFACT, start: 2255, end: 2518 },
  5: { artifactId: AHH_ARTIFACT, start: 3687, end: 3997 },
  6: { artifactId: AHH_ARTIFACT, start: 4270, end: 4420 },
  7: { artifactId: AHH_ARTIFACT, start: 4612, end: 4748 },
  8: { artifactId: AHH_ARTIFACT, start: 5205, end: 5431 },
  9: { artifactId: AHH_ARTIFACT, start: 5658, end: 5950 },
  10: { artifactId: AHH_ARTIFACT, start: 6492, end: 6740 },
  11: { artifactId: AHH_ARTIFACT, start: 6848, end: 7034 },
  12: { artifactId: AHH_ARTIFACT, start: 8024, end: 8249 },
  13: { artifactId: AHH_ARTIFACT, start: 9212, end: 9350 },
  14: { artifactId: AHH_ARTIFACT, start: 9402, end: 9536 },
  15: { artifactId: AHH_ARTIFACT, start: 10681, end: 10804 },
  16: { artifactId: AHH_ARTIFACT, start: 11456, end: 11678 },
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
      'One attributed recording/songwriting statement retained; no musical analysis, lyric interpretation, or complete session reconstruction is claimed.',
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
  changeNote: 'Complete all sixteen It Takes a Nation of Millions to Hold Us Back catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: {
    generatedAt: '2026-09-03T00:00:00.000Z',
    generator: 'codex-rank15-track-encyclopedia-author',
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

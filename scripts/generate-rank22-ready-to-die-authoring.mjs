// Generate the rank-22 Ready to Die authoring candidate from immutable source artifacts.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ALBUM_ID = '022-the-notorious-b-i-g-ready-to-die-98945eb8';
const CHECKED_AT = '2026-09-03';
const dataDir = path.resolve('src/data/track-encyclopedia');

const sources = {
  xxl: {
    artifactId: 'ce76ddb92adbf34223b0a04a2839af142b61f5bdf5be2382e9efb71d8acb7fc3',
    label: 'XXL Ready to Die oral history',
    title: "The Making of The Notorious B.I.G.'s Ready to Die: Family Business",
    url: 'https://www.xxlmag.com/the-making-of-ready-to-diefamily-business',
    identity: 'xxlmag.com|Ready to Die track-by-track oral history',
  },
  who: {
    artifactId: 'b62f893c9784277f21abdbaa19eda0c03b60679e24d5b70d2c5713dc3167703b',
    label: 'Wikipedia Who Shot Ya article',
    title: 'Who Shot Ya? - Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Who_Shot_Ya%3F',
    identity: 'en.wikipedia.org|Who Shot Ya song article',
  },
  dreams: {
    artifactId: 'aa9fa5f08acfa7cec1b54d03e14cbefb6a4c977fbb038c35c72e308ea4504210',
    label: 'Wikipedia Just Playing (Dreams) article',
    title: 'Just Playing (Dreams) - Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Just_Playing_(Dreams)',
    identity: 'en.wikipedia.org|Just Playing Dreams song article',
  },
};

const facts = [
  { n: 1, title: 'Intro', source: 'xxl', claim: 'Easy Mo Bee says Puffy’s concept for the “Intro” was to create the album’s story line.', excerpt: 'The whole story line for the album—starting in the beginning when you hear the robbery happening on the train and “Rapper’s Delight” in the background and everything—that was Puff’s concept: to create a story line for the album.' },
  { n: 2, title: 'Things Done Changed', source: 'xxl', claim: 'Lil’ Cease told XXL that Biggie made “Things Done Changed” to represent Brooklyn and show how they grew up.', excerpt: 'Biggie made it to represent Brooklyn. To show how he grew up, how we grew up.' },
  { n: 3, title: 'Gimme the Loot', source: 'xxl', claim: 'Easy Mo Bee recalled that Biggie created the two character voices in “Gimme the Loot” by recording one voice, leaving gaps, and returning to fill them with the other.', excerpt: 'he went in the booth and then it just kind of happened. He just started doing it. He would do one voice, then come behind and do the other one later—just like, leave a gap so he could come back and fill the spaces.' },
  { n: 4, title: 'Machine Gun Funk', source: 'xxl', claim: 'Easy Mo Bee says Biggie picked the “Machine Gun Funk” beat in his car.', excerpt: 'Biggie picked that beat in my car.' },
  { n: 5, title: 'Warning', source: 'xxl', claim: 'Easy Mo Bee says the beat used for “Warning” was first offered to Big Daddy Kane.', excerpt: 'that beat was offered first to Big Daddy Kane.' },
  { n: 6, title: 'Ready To Die', source: 'xxl', claim: 'Easy Mo Bee described the title track’s extreme language as an intensified emotional expression of how Biggie felt.', excerpt: 'That was just his whole intensified approach to explaining just how much he felt. He was ready to die. It was just an emotional expression.' },
  { n: 7, title: 'One More Chance', source: 'xxl', claim: 'Lil’ Cease says his sister and her friends performed the women’s interlude heard before “One More Chance.”', excerpt: 'My sister did the interlude for “One More Chance”—with all the girls on it. The other girls on it, that’s just my sister’s friends.' },
  { n: 8, title: '#!*@ Me', source: 'xxl', claim: 'Lil’ Cease told XXL that Biggie and Lil’ Kim performed the interlude in a Daddy’s House studio booth containing a piano and its chair.', excerpt: 'Him and Lil’ Kim did it. What they did was, there was a piano in the booth of the studio we was working in, it was in Daddy’s House. It had the piano and the chair to the piano.' },
  { n: 9, title: 'The What', source: 'xxl', claim: 'Easy Mo Bee says he wrote “The What” on the beat’s disc and Puff approved it.', excerpt: 'So for whatever reason, I wrote on this disc, “The What.” Puff was like, “Yo, that shit is cool.”' },
  { n: 10, title: 'Juicy', source: 'xxl', claim: 'Producer Poke says he used an MPC60 on “Juicy,” reinforcing the bass line and drums around the loop to give it more hip-hop character.', excerpt: 'I used an MPC60. I just reinforced the bass lines and drums and tried to make it bigger than the original. But it was pretty much I just looped it and had the elements on top of it, to give it a little more hip-hop flavor.' },
  { n: 11, title: 'Everyday Struggle', source: 'xxl', claim: 'Digga says Biggie made a face while instruments were selected, indicating he wanted something similar for “Everyday Struggle.”', excerpt: 'When I was picking out the instruments he would make a face like, “Yeah, I want something similar to that.” The guy was always thinking about how he wanted to make something better.' },
  { n: 12, title: 'Me and My B*tch', source: 'xxl', claim: 'Digga says the original “Me & My Bitch” sample came from a Minnie Riperton song written by Stevie Wonder, who refused its use because of the cursing.', excerpt: 'The original sample that we used was from a Minnie Riperton song that Stevie Wonder wrote. When they sent it out to him, he was like, “I love the song. But this cursing, I’m not with it. You can’t use it.”' },
  { n: 13, title: 'Big Poppa', source: 'xxl', claim: 'Nashiem Myrick says the track that became “Big Poppa” was initially given to the Lost Boyz, then retrieved in a trade for another track.', excerpt: 'That song was actually [supposed to be] for Mr. Cheeks, the Lost Boyz. We gave that song to the Lost Boyz. And then something happened and Puff was like, “Get that song back, get it back from him.” We traded them for another track.' },
  { n: 14, title: 'Respect', source: 'xxl', claim: 'While discussing “Respect,” Banger recalled Biggie analyzing and absorbing situations and conversations from his life, then turning them into songs.', excerpt: 'How he’d do our situation or our conversation—he’d analyze it and absorb it and suck it up and then make a song about it. He absorbed his whole life.' },
  { n: 15, title: 'Friend of Mine', source: 'xxl', claim: 'Easy Mo Bee says the “Friend of Mine” hook samples Black Mambo’s “You’re no friend of mine/You know that ain’t right.”', excerpt: 'The thing about that record is [the hook I sampled]: “You’re no friend of mine/You know that ain’t right.” That’s Black Mambo.' },
  { n: 16, title: 'Unbelievable', source: 'xxl', claim: 'DJ Premier says “Unbelievable” was the final song recorded for Ready to Die.', excerpt: '“Unbelievable” was the final song [recorded for] Ready To Die.' },
  { n: 17, title: 'Suicidal Thoughts', source: 'xxl', claim: 'Engineer “Prince” Charles Alexander says the ending of “Suicidal Thoughts” was designed to include the phone dropping and a body thud after the character shoots himself.', excerpt: 'At the end of the song, he drops the phone and he falls, ’cause he has shot himself. So he shoots himself, the phone drops and there was supposed to be a body thud.' },
  { n: 18, title: 'Who Shot Ya', source: 'who', claim: 'Wikipedia reports that Wallace explained “Who Shot Ya” as portraying a rivalry between drug dealers.', excerpt: 'Wallace, when interviewed, explained his "Who Shot Ya" lyrics as simply portraying a rivalry between drug dealers.' },
  { n: 19, title: 'Just Playing (Dreams)', source: 'dreams', claim: 'Wikipedia states that “Just Playing (Dreams)” was produced by Rashad “Ringo” Smith and built on a sample of James Brown’s “Blues and Pants.”', excerpt: 'The song is built on a sample of "Blues and Pants" written by James Brown, and its production was done by Ringo.' },
];

const catalog = JSON.parse(readFileSync('src/data/catalog.generated.json', 'utf8'));
const album = catalog.albums.find((item) => item.id === ALBUM_ID);
if (!album || album.tracks.length !== 19) throw new Error('Rank-22 catalog identity is missing or no longer has 19 tracks.');

const artifacts = {};
for (const [key, source] of Object.entries(sources)) {
  artifacts[key] = JSON.parse(readFileSync(path.join(dataDir, 'source-artifacts', `${source.artifactId}.json`), 'utf8'));
  if (artifacts[key].canonicalUrl !== source.url) throw new Error(`${key}: canonical URL mismatch.`);
}

const trackEntries = facts.map((fact) => {
  const catalogTrack = album.tracks.find((track) => track.discNumber === 1 && track.trackNumber === fact.n);
  if (!catalogTrack || catalogTrack.title !== fact.title) throw new Error(`${fact.n}: exact catalog title mismatch (${catalogTrack?.title}).`);
  const source = sources[fact.source];
  const retainedText = artifacts[fact.source].retainedText;
  const start = retainedText.indexOf(fact.excerpt);
  if (start < 0) throw new Error(`${fact.title}: exact extract not found in retained source artifact.`);
  const end = start + fact.excerpt.length;
  return {
    albumId: ALBUM_ID,
    discNumber: catalogTrack.discNumber,
    trackNumber: catalogTrack.trackNumber,
    trackTitle: catalogTrack.title,
    evidenceLevel: 'documented',
    verifiedFacts: [{
      claimId: `${ALBUM_ID}:1:${fact.n}:fact-1`,
      claim: fact.claim,
      sourceRefs: [{
        label: source.label,
        title: source.title,
        url: source.url,
        sourceIdentity: source.identity,
        extractType: 'verbatim',
        evidenceStatus: 'retrieved',
        checkedAt: CHECKED_AT,
        extract: fact.excerpt,
        artifactId: source.artifactId,
        section: { kind: 'character-offsets', start, end },
      }],
    }],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    limitations: ['One attributed track-specific production or interpretation statement retained; no independent lyric interpretation or complete session reconstruction is claimed.'],
    sourceRefs: [{ label: source.label, title: source.title, url: source.url }],
  };
});

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all nineteen Ready to Die remaster catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: { generatedAt: '2026-09-03T00:00:00.000Z', generator: 'codex-rank22-track-encyclopedia-author', model: 'gpt-5.6-sol' },
  reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  contentHash: '',
};
const doc = { metadata: { version: '1.0.0-candidate', generatedAt: '2026-09-03T00:00:00.000Z', albumCount: 1 }, entries: { [ALBUM_ID]: entry } };
writeFileSync(path.join(dataDir, 'authoring', `${ALBUM_ID}.json`), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote rank-22 authoring candidate with ${trackEntries.length} documented tracks.`);

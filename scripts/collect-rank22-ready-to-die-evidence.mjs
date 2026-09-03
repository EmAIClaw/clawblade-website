// Collect source artifacts for rank 22 — The Notorious B.I.G., Ready to Die.
// The 17 original-album tracks use XXL's track-by-track oral history; the two
// remaster bonus tracks use dedicated Wikipedia song articles.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '022-the-notorious-b-i-g-ready-to-die-98945eb8';
const COLLECTOR_RUN_ID = 'rank22-ready-to-die-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const artifactDir = path.resolve('src/data/track-encyclopedia/source-artifacts');

const sources = {
  xxl: { canonicalUrl: 'https://www.xxlmag.com/the-making-of-ready-to-diefamily-business/' },
  who: { canonicalUrl: 'https://en.wikipedia.org/wiki/Who_Shot_Ya%3F' },
  dreams: { canonicalUrl: 'https://en.wikipedia.org/wiki/Just_Playing_(Dreams)' },
};

const tracks = [
  { disc: 1, n: 1, title: 'Intro', source: 'xxl', excerpt: 'The whole story line for the album—starting in the beginning when you hear the robbery happening on the train and “Rapper’s Delight” in the background and everything—that was Puff’s concept: to create a story line for the album.' },
  { disc: 1, n: 2, title: 'Things Done Changed', source: 'xxl', excerpt: 'Biggie made it to represent Brooklyn. To show how he grew up, how we grew up.' },
  { disc: 1, n: 3, title: 'Gimme the Loot', source: 'xxl', excerpt: 'he went in the booth and then it just kind of happened. He just started doing it. He would do one voice, then come behind and do the other one later—just like, leave a gap so he could come back and fill the spaces.' },
  { disc: 1, n: 4, title: 'Machine Gun Funk', source: 'xxl', excerpt: 'Biggie picked that beat in my car.' },
  { disc: 1, n: 5, title: 'Warning', source: 'xxl', excerpt: 'that beat was offered first to Big Daddy Kane.' },
  { disc: 1, n: 6, title: 'Ready To Die', source: 'xxl', excerpt: 'That was just his whole intensified approach to explaining just how much he felt. He was ready to die. It was just an emotional expression.' },
  { disc: 1, n: 7, title: 'One More Chance', source: 'xxl', excerpt: 'My sister did the interlude for “One More Chance”—with all the girls on it. The other girls on it, that’s just my sister’s friends.' },
  { disc: 1, n: 8, title: '#!*@ Me', source: 'xxl', excerpt: 'Him and Lil’ Kim did it. What they did was, there was a piano in the booth of the studio we was working in, it was in Daddy’s House. It had the piano and the chair to the piano.' },
  { disc: 1, n: 9, title: 'The What', source: 'xxl', excerpt: 'So for whatever reason, I wrote on this disc, “The What.” Puff was like, “Yo, that shit is cool.”' },
  { disc: 1, n: 10, title: 'Juicy', source: 'xxl', excerpt: 'I used an MPC60. I just reinforced the bass lines and drums and tried to make it bigger than the original. But it was pretty much I just looped it and had the elements on top of it, to give it a little more hip-hop flavor.' },
  { disc: 1, n: 11, title: 'Everyday Struggle', source: 'xxl', excerpt: 'When I was picking out the instruments he would make a face like, “Yeah, I want something similar to that.” The guy was always thinking about how he wanted to make something better.' },
  { disc: 1, n: 12, title: 'Me and My B*tch', source: 'xxl', excerpt: 'The original sample that we used was from a Minnie Riperton song that Stevie Wonder wrote. When they sent it out to him, he was like, “I love the song. But this cursing, I’m not with it. You can’t use it.”' },
  { disc: 1, n: 13, title: 'Big Poppa', source: 'xxl', excerpt: 'That song was actually [supposed to be] for Mr. Cheeks, the Lost Boyz. We gave that song to the Lost Boyz. And then something happened and Puff was like, “Get that song back, get it back from him.” We traded them for another track.' },
  { disc: 1, n: 14, title: 'Respect', source: 'xxl', excerpt: 'How he’d do our situation or our conversation—he’d analyze it and absorb it and suck it up and then make a song about it. He absorbed his whole life.' },
  { disc: 1, n: 15, title: 'Friend of Mine', source: 'xxl', excerpt: 'The thing about that record is [the hook I sampled]: “You’re no friend of mine/You know that ain’t right.” That’s Black Mambo.' },
  { disc: 1, n: 16, title: 'Unbelievable', source: 'xxl', excerpt: '“Unbelievable” was the final song [recorded for] Ready To Die.' },
  { disc: 1, n: 17, title: 'Suicidal Thoughts', source: 'xxl', excerpt: 'At the end of the song, he drops the phone and he falls, ’cause he has shot himself. So he shoots himself, the phone drops and there was supposed to be a body thud.' },
  { disc: 1, n: 18, title: 'Who Shot Ya', source: 'who', excerpt: 'Wallace, when interviewed, explained his “Who Shot Ya” lyrics as simply portraying a rivalry between drug dealers.' },
  { disc: 1, n: 19, title: 'Just Playing (Dreams)', source: 'dreams', excerpt: 'The song is built on a sample of “Blues and Pants” written by James Brown, and its production was done by Ringo.' },
];

const output = {};
for (const [sourceKey, source] of Object.entries(sources)) {
  const response = await fetch(source.canonicalUrl, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
      accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
    },
    signal: AbortSignal.timeout(45000),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${source.canonicalUrl}: HTTP ${response.status}`);
  const contentEncoding = response.headers.get('content-encoding');
  const decoded = decodeResponseBytes(bytes, contentEncoding);
  const html = decoded.toString(isUtf8(decoded) ? 'utf8' : 'latin1');
  const fragment = sourceKey === 'xxl' ? html : (extractParserOutputFragment(html) ?? html);
  const converted = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: fragment, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (converted.status !== 0) throw new Error(`pandoc failed for ${sourceKey}: ${converted.stderr}`);
  const normalized = normalizeEvidenceText(converted.stdout);
  const located = tracks.filter((track) => track.source === sourceKey).map((track) => {
    const span = locateExactOrTypographyEquivalent(normalized, normalizeEvidenceText(track.excerpt));
    if (!span) throw new Error(`Exact excerpt missing from ${sourceKey}: ${track.title}`);
    return { ...track, ...span };
  });
  let start = Math.max(0, Math.min(...located.map((item) => item.start)) - CONTEXT_RADIUS);
  let end = Math.min(normalized.length, Math.max(...located.map((item) => item.end)) + CONTEXT_RADIUS);
  while (start < end && normalized[start] === ' ') start += 1;
  while (end > start && normalized[end - 1] === ' ') end -= 1;
  const retainedText = normalized.slice(start, end);
  const completeSource = start === 0 && end === normalized.length;
  const artifact = createSourceArtifact({
    canonicalUrl: source.canonicalUrl,
    finalUrl: canonicalizeSourceUrl(response.url),
    retrievedAt: new Date().toISOString(),
    httpStatus: response.status,
    contentType: response.headers.get('content-type') || 'application/octet-stream',
    contentEncoding,
    collector: { identity: 'albumvault-http-collector', version: '1.0.0', runId: COLLECTOR_RUN_ID },
    collectionMethod: 'http-fetch',
    fetchedResponseSha256: createHash('sha256').update(bytes).digest('hex'),
    normalizationVersion: 'nfkc-whitespace-v1',
    retainedText,
    window: { kind: completeSource ? 'complete-source' : 'character-offsets', start, end, fetchedTextLength: normalized.length, completeSource },
  });
  await writeSourceArtifact(artifactDir, artifact);
  output[sourceKey] = {
    artifactId: artifact.artifactId,
    canonicalUrl: artifact.canonicalUrl,
    finalUrl: artifact.finalUrl,
    retrievedAt: artifact.retrievedAt,
    httpStatus: artifact.httpStatus,
    fetchedResponseSha256: artifact.fetchedResponseSha256,
    claims: located.map((item) => ({ title: item.title, excerpt: item.excerpt, start: item.start - start, end: item.end - start })),
  };
  console.log(JSON.stringify({ sourceKey, ...output[sourceKey] }));
}
console.log(JSON.stringify({ albumId: ALBUM_ID, sources: output }, null, 2));

function locateExactOrTypographyEquivalent(sourceText, authoredExcerpt) {
  const exactStart = sourceText.indexOf(authoredExcerpt);
  if (exactStart >= 0) return { start: exactStart, end: exactStart + authoredExcerpt.length, excerpt: sourceText.slice(exactStart, exactStart + authoredExcerpt.length) };
  const sourceComparable = comparableTypography(sourceText);
  const excerptComparable = comparableTypography(authoredExcerpt);
  const start = sourceComparable.indexOf(excerptComparable);
  if (start < 0) return null;
  return { start, end: start + authoredExcerpt.length, excerpt: sourceText.slice(start, start + authoredExcerpt.length) };
}

function comparableTypography(text) {
  return text.replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"').replace(/[‐‑‒–—―−]/g, '-').replace(/…/g, '.').replace(/\u00a0/g, ' ');
}

function decodeResponseBytes(bytes, contentEncoding) {
  const encoding = (contentEncoding ?? '').split(',')[0].trim().toLowerCase();
  if (!encoding || encoding === 'identity') return bytes;
  const decompress = { gzip: gunzipSync, 'x-gzip': gunzipSync, deflate: inflateSync, br: brotliDecompressSync, zstd: zstdDecompressSync }[encoding];
  if (!decompress) throw new Error(`Unsupported content encoding: ${contentEncoding}`);
  try { return decompress(bytes); } catch { return bytes; }
}

function extractParserOutputFragment(html) {
  const marker = 'mw-parser-output';
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const divOpen = html.lastIndexOf('<div', idx);
  if (divOpen < 0) return null;
  let depth = 0;
  for (let i = divOpen; i < html.length;) {
    if (html.startsWith('<div', i)) { depth += 1; i += 4; }
    else if (html.startsWith('</div>', i)) { depth -= 1; i += 6; if (depth === 0) return html.slice(divOpen, i); }
    else i += 1;
  }
  return null;
}

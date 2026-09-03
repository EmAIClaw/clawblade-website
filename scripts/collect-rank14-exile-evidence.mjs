// Collect the rank-14 Exile on Main St. source artifact from Rolling Stone's
// "Exile on Main St. Track By Track" article (September 21, 2006).
// Mirrors scripts/collect-rank13-aretha-evidence.mjs core logic, scoped to the
// single canonical URL, using http-fetch + pandoc HTML extraction (the same
// trusted albumvault-http-collector path used by ranks 9/10/11/13).
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '014-the-rolling-stones-exile-on-main-st-9d89aa7d';
const CANONICAL_URL = 'https://www.rollingstone.com/music/music-news/exile-on-main-st-track-by-track-242956';
const COLLECTOR_RUN_ID = 'rank14-exile-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank14-exile-source-collection.json';

// Each track: { n, title, excerpt } — excerpt is verbatim from the pandoc-extracted
// Rolling Stone "Exile on Main St. Track By Track" article.
const tracks = [
  {
    n: 1, title: 'Rocks Off',
    excerpt: 'After Keith Richards fell asleep while overdubbing a guitar part, recording engineer Andy Johns called it a night, only to be dragged back at five in the morning so Richards could add another track. "Absolutely brilliant," says Johns. "He knew what he wanted - oh, yeah."',
  },
  {
    n: 2, title: 'Rip This Joint',
    excerpt: 'Bill Plummer plays upright bass, with Bobby Keys on both tenor and baritone saxophones. One of only six Exile tracks performed regularly on the Stones\' tour of America in 1972.',
  },
  {
    n: 3, title: 'Shake Your Hips',
    excerpt: 'Written by Slim Harpo and sung by Mick Jagger in a voice that Richard Williams of Melody Maker felt was an "unnecessary affectation."',
  },
  {
    n: 4, title: 'Casino Boogie',
    excerpt: 'Nicky Hopkins on piano and Jagger singing "Dietrich movies/Close-up boogies/Kissing cunt in Cannes."',
  },
  {
    n: 5, title: 'Tumbling Dice',
    excerpt: 'Originally titled "Good Time Woman," this song - the lead single from Exile - first surfaced during the Sticky Fingers sessions. Charlie Watts had a hard time with a drum part after the breakdown, so producer Jimmy Miller was edited in.',
  },
  {
    n: 6, title: 'Sweet Virginia',
    excerpt: 'Jagger at his down-home country best. The vocal is influenced by Nellcôte guest Gram Parsons, who had been hanging with Richards since meeting him in Los Angeles while the Stones were rehearsing for their 1969 U.S. tour.',
  },
  {
    n: 7, title: 'Torn And Frayed',
    excerpt: 'Another Parsons-influenced track, with Al Perkins on pedal steel guitar and lyrics about either Richards or Parsons.',
  },
  {
    n: 8, title: 'Sweet Black Angel',
    excerpt: 'Jagger\'s paean of love to Angela Davis, then in prison on murder and kidnapping charges. She was found innocent during the Stones\' 1972 American tour. Originally recorded live on the mobile at Stargroves, Jagger\'s estate in England, with Miller on percussion, it was the B side of "Tumbling Dice."',
  },
  {
    n: 9, title: 'Loving Cup',
    excerpt: 'Originally recorded at Olympic Studios in 1969, the song was performed by the Stones during their free concert in London\'s Hyde Park on July 5th, 1969, where Mick Taylor made his debut with the band. The show began with Jagger reading a poem for Brian Jones, who was found dead in his swimming pool two days earlier.',
  },
  {
    n: 10, title: 'Happy',
    excerpt: 'Richards\' signature tune. Inspired by the news that his longtime companion Anita Pallenberg was pregnant, he walked into the basement at Nellcôte and knocked this out during a sound check, with Keys on baritone sax and Miller on drums.',
  },
  {
    n: 11, title: 'Turd On The Run',
    excerpt: 'Bill Plummer on bass, overdubbed at Sunset Sound in Los Angeles after the Stones had fled from the south of France. Jagger on harp. As Richards told journalist Lisa Robinson in 1989, "He\'s not thinking when he\'s playing harp. It comes from inside him. He always played like that, from the early days on."',
  },
  {
    n: 12, title: 'Ventilator Blues',
    excerpt: 'The only track co-written by Mick Taylor, who felt he deserved more songwriting credit than Jagger and Richards were willing to give. There was just a single fan in a corner window of the Nellcôte basement, which, as Johns notes, "didn\'t work very well. Therefore, \'Ventilator Blues.\' It\'s one of my favorite tunes. It\'s about the fan in the window."',
  },
  {
    n: 13, title: 'I Just Want To See His Face',
    excerpt: 'An uncredited Dr. John on piano with Richards on organ. Plummer on string bass, Taylor on electric bass and Miller on percussion. Jagger made up the words as he recorded the song.',
  },
  {
    n: 14, title: 'Let It Loose',
    excerpt: 'Let it Loose Another Exile track originally recorded at Olympic Studios.',
  },
  {
    n: 15, title: 'All Down The Line',
    excerpt: 'Jagger\'s initial choice for a single. Johns could not imagine it on the radio, so Jagger sent pianist and road manager Ian Stewart to an L.A. station with a tape. As Johns sat with Jagger, Richards and Watts in the back of a limo cruising up and down Sunset Boulevard, they listened to the song.',
  },
  {
    n: 16, title: 'Stop Breaking Down',
    excerpt: 'This Robert Johnson cover - with Stewart playing boogie-woogie piano and Taylor on slide guitar - was also originally recorded at Olympic Studios.',
  },
  {
    n: 17, title: 'Shine A Light',
    excerpt: 'The oldest song on the album, recorded at Olympic, it features the late Billy Preston on organ and piano, Taylor on bass (though Bill Wyman would later claim it was him) and producer Miller on drums.',
  },
  {
    n: 18, title: 'Soul Survivor',
    excerpt: 'Richards on bass. As though describing their relationship during the Nellcôte sessions, Jagger sings, "You ain\'t giving me no quarter/I\'d rather drink seawater/l wish I\'d never brought you/It\'s gonna be the death of me."',
  },
];

const response = await fetch(CANONICAL_URL, {
  redirect: 'follow',
  headers: {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'accept-language': 'en-US,en;q=0.9',
    accept: 'text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.1',
  },
  signal: AbortSignal.timeout(45000),
});
const bytes = Buffer.from(await response.arrayBuffer());
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const contentType = response.headers.get('content-type') || 'application/octet-stream';
const contentEncoding = response.headers.get('content-encoding');
const fetchedResponseSha256 = createHash('sha256').update(bytes).digest('hex');
const decodedBytes = decodeResponseBytes(bytes, contentEncoding);
const extracted = extractHtml(decodedBytes.toString(isUtf8(decodedBytes) ? 'utf8' : 'latin1'));
const normalized = normalizeEvidenceText(extracted.text);
if (!normalized) throw new Error('Fetched response produced no extractable text.');

const located = [];
for (const track of tracks) {
  const authoredExcerpt = normalizeEvidenceText(track.excerpt);
  const span = locateExactOrTypographyEquivalent(normalized, authoredExcerpt);
  if (!span) throw new Error(`Exact excerpt missing from fetched response: ${track.title}`);
  located.push({ ...track, excerpt: span.excerpt, start: span.start, end: span.end });
}

let start = Math.max(0, Math.min(...located.map((item) => item.start)) - CONTEXT_RADIUS);
let end = Math.min(normalized.length, Math.max(...located.map((item) => item.end)) + CONTEXT_RADIUS);
while (start < end && normalized[start] === ' ') start += 1;
while (end > start && normalized[end - 1] === ' ') end -= 1;
const retainedText = normalized.slice(start, end);
const completeSource = start === 0 && end === normalized.length;

const artifact = createSourceArtifact({
  canonicalUrl: CANONICAL_URL,
  finalUrl: canonicalizeSourceUrl(response.url),
  retrievedAt: new Date().toISOString(),
  httpStatus: response.status,
  contentType,
  contentEncoding,
  collector: { identity: 'albumvault-http-collector', version: '1.0.0', runId: COLLECTOR_RUN_ID },
  collectionMethod: 'http-fetch',
  fetchedResponseSha256,
  normalizationVersion: 'nfkc-whitespace-v1',
  retainedText,
  window: {
    kind: completeSource ? 'complete-source' : 'character-offsets',
    start,
    end,
    fetchedTextLength: normalized.length,
    completeSource,
  },
});
await writeSourceArtifact(artifactDir, artifact);

const report = {
  schemaVersion: 1,
  collectorRunId: COLLECTOR_RUN_ID,
  collectedAt: new Date().toISOString(),
  results: [
    {
      canonicalUrl: CANONICAL_URL,
      fetchUrl: CANONICAL_URL,
      finalUrl: artifact.finalUrl,
      status: 'collected',
      artifactId: artifact.artifactId,
      created: true,
      fetchedResponseSha256,
      contentType,
      retainedCharacters: retainedText.length,
      fetchedCharacters: normalized.length,
      claims: located.map((item) => ({
        albumId: ALBUM_ID,
        trackTitle: item.title,
        factIndex: 0,
        refIndex: 0,
        retainedExtract: item.excerpt,
        section: { kind: 'character-offsets', start: item.start - start, end: item.end - start },
      })),
    },
  ],
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`collected ${CANONICAL_URL} -> ${artifact.artifactId}`);
console.log(`report: ${reportPath}`);
console.log(`retainedCharacters=${retainedText.length} fetchedCharacters=${normalized.length} completeSource=${completeSource}`);
for (const item of located) {
  console.log(`  ${item.title}: [${item.start - start}, ${item.end - start})`);
}

function locateExactOrTypographyEquivalent(sourceText, authoredExcerpt) {
  const exactStart = sourceText.indexOf(authoredExcerpt);
  if (exactStart >= 0) return { start: exactStart, end: exactStart + authoredExcerpt.length, excerpt: sourceText.slice(exactStart, exactStart + authoredExcerpt.length) };
  const sourceComparable = comparableTypography(sourceText);
  const excerptComparable = comparableTypography(authoredExcerpt);
  const startIdx = sourceComparable.indexOf(excerptComparable);
  if (startIdx < 0) return null;
  return { start: startIdx, end: startIdx + authoredExcerpt.length, excerpt: sourceText.slice(startIdx, startIdx + authoredExcerpt.length) };
}

function comparableTypography(text) {
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/…/g, '.');
}

function decodeResponseBytes(bytes, contentEncoding) {
  const encoding = (contentEncoding ?? '').split(',')[0].trim().toLowerCase();
  if (!encoding || encoding === 'identity') return bytes;
  const decompress = {
    gzip: gunzipSync,
    'x-gzip': gunzipSync,
    deflate: inflateSync,
    br: brotliDecompressSync,
    zstd: zstdDecompressSync,
  }[encoding];
  if (!decompress) throw new Error(`Unsupported content encoding: ${contentEncoding}`);
  try {
    return decompress(bytes);
  } catch {
    return bytes;
  }
}

function extractHtml(html) {
  const temp = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: html, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (temp.status !== 0) throw new Error(`pandoc HTML extraction failed: ${temp.stderr || `exit ${temp.status}`}`);
  return { text: temp.stdout, pages: [] };
}

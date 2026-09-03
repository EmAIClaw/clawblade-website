// Collect the rank-13 Aretha Franklin source artifact from Best Classic Bands.
// Mirrors scripts/collect-track-evidence-artifacts.mjs core logic, scoped to the
// single canonical URL, using http-fetch + pandoc HTML extraction (the same
// trusted albumvault-http-collector path used by ranks 9/10/11).
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '013-aretha-franklin-i-never-loved-a-man-the-way-i-love-you-e41a23cf';
const CANONICAL_URL = 'https://bestclassicbands.com/aretha-franklin-i-never-loved-a-man-review-8-4-24/';
const COLLECTOR_RUN_ID = 'rank13-aretha-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank13-aretha-source-collection.json';

// Each track: { n, title, excerpt } — excerpt is verbatim from the pandoc-extracted
// Best Classic Bands article (Mark Leviton, "R-E-S-P-E-C-T").
const tracks = [
  {
    n: 1, title: 'Respect',
    excerpt: 'Franklin, Wexler and Atlantic staff arranger Arif Mardin vastly improved on Redding’s rough-hewn arrangement. The background singers—Aretha’s sisters Carolyn and Erma with Cissy Houston—serve as a Greek chorus as the drama of the track spreads out during a fully packed 2:29 timing.',
  },
  {
    n: 2, title: 'Drown In My Own Tears',
    excerpt: 'Henry Glover’s “Drown In My Own Tears” which had been cut by Ray Charles for Atlantic in 1956, begins with a powerful starkness, Aretha’s voice and piano laying down gospel licks with bassist Tommy Cogbill before Hawkins—or perhaps alternate Swamper Gene Chrisman—enters.',
  },
  {
    n: 3, title: 'I Never Loved a Man (The Way I Love You)',
    excerpt: 'With Aretha on acoustic piano and Dewey “Spooner” Oldham on electric piano, and all the other musicians recording live, “I Never Loved a Man (The Way I Love You)” was tracked. Written by Detroit’s Ronnie Shannon, the song and Franklin’s intense vocal performance electrified the musicians.',
  },
  {
    n: 4, title: 'Soul Serenade',
    excerpt: 'The languid “Soul Serenade,” written by Luther Dixon and King Curtis, had often been performed as an instrumental ever since Curtis’ 1964 hit version for Capitol Records; this version with lyrics, while beautifully sung, is not a highlight of the LP.',
  },
  {
    n: 5, title: "Don't Let Me Lose This Dream",
    excerpt: '“Don’t Let Me Lose This Dream,” written by Franklin and her husband, is a bossa-nova that sounds not unlike a Bacharach-David song for Dionne Warwick.',
  },
  {
    n: 6, title: 'Baby, Baby, Baby',
    excerpt: '“Baby, Baby, Baby” was written by Carolyn and Aretha Franklin. Oldham’s organ is in support of Franklin’s stately piano once again.',
  },
  {
    n: 7, title: 'Dr. Feelgood (Love Is Serious Business)',
    excerpt: '“Dr. Feelgood (Love Is a Serious Business)” leads off side two of the original LP, and is wonderfully loose and unabashedly sexy. This is one of the best examples of how White and Franklin could co-write with real heat and from their attraction to each other.',
  },
  {
    n: 8, title: 'Good Times',
    excerpt: 'There are two Sam Cooke tunes on side two, “Good Times” and “A Change Is Gonna Come.” As a party anthem the first can’t be beat, and Franklin and company make short, potent work of it. A hit for Cooke in 1964, it’s attracted dozens of cover versions and had wide appeal',
  },
  {
    n: 9, title: 'Do Right Woman, Do Right Man',
    excerpt: 'the regally impressive “Do Right Woman–Do Right Man,” penned by the Muscle Shoals duo Dan Penn and Chips Moman',
  },
  {
    n: 10, title: 'Save Me',
    excerpt: '“Save Me,” a light confection that never strays from the same three chords that anchor Van Morrison’s “Gloria.” It’s one of the only songs ever written by Carolyn, Aretha and King Curtis, and is basically a short jam with a rock/boogaloo beat.',
  },
  {
    n: 11, title: 'A Change Is Gonna Come',
    excerpt: '“A Change Is Gonna Come” is now of course a Civil Rights anthem, based on Cooke’s experience of racism while on tour in the South. His stirring version was released as a single B-side in early 1964. The longest cut on the album, Aretha’s take is placed at the very end, after all the playfulness and love songs, and is a deadly serious, focused, emotional masterpiece.',
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

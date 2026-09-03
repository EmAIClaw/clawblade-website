// Collect rank-25 Tapestry evidence from fetched, track-specific article bodies.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '025-carole-king-tapestry-b29b056b';
const COLLECTOR_RUN_ID = 'rank25-tapestry-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank25-tapestry-source-collection.json';

const tracks = [
  {
    n: 1,
    title: 'I Feel the Earth Move',
    url: 'https://en.wikipedia.org/wiki/I_Feel_the_Earth_Move',
    excerpt: 'This rhythm, putting the accent at the end of the word "tumbling" rather than at the beginning, produces a "musical equivalent of a tumble"',
  },
  {
    n: 2,
    title: 'So Far Away',
    url: 'https://en.wikipedia.org/wiki/So_Far_Away_(Carole_King_song)',
    excerpt: 'The recording features James Taylor on acoustic guitar. In addition to Taylor, and King on piano, instruments include Russ Kunkel on drums, Charles Larkey on bass guitar and Curtis Amy on flute.',
  },
  {
    n: 3,
    title: "It's Too Late",
    url: "https://en.wikipedia.org/wiki/It%27s_Too_Late_(Carole_King_song)",
    excerpt: 'Kortchmar and Amy each have an instrumental solo',
  },
  {
    n: 5,
    title: 'Beautiful',
    url: 'https://en.wikipedia.org/wiki/Beautiful_(Carole_King_song)',
    excerpt: 'she did not consciously attempt to write "Beautiful" but it came to her spontaneously',
  },
  {
    n: 7,
    title: "You've Got a Friend",
    url: "https://en.wikipedia.org/wiki/You%27ve_Got_a_Friend",
    excerpt: 'According to Taylor, King told him that the song was a response to a line in his earlier song "Fire and Rain" ("I’ve seen lonely times when I could not find a friend").',
  },
  {
    n: 8,
    title: 'Where You Lead',
    url: 'https://en.wikipedia.org/wiki/Where_You_Lead',
    excerpt: 'King had written the music and the majority of the lyric for "Where You Lead" when she solicited the assistance of Stern, saying: "I can’t write the bridge to this: if you can figure out the bridge you can get [co-writing] credit for the song."',
  },
  {
    n: 9,
    title: 'Will You Love Me Tomorrow',
    url: 'https://en.wikipedia.org/wiki/Will_You_Love_Me_Tomorrow',
    excerpt: 'In 1971, Carole King, who composed the music of the song, recorded a version of "Will You Love Me Tomorrow" for her second studio album Tapestry, with Joni Mitchell and James Taylor performing background vocals on separate audio channels.',
  },
  {
    n: 10,
    title: 'Smackwater Jack',
    url: 'https://en.wikipedia.org/wiki/Smackwater_Jack_(song)',
    excerpt: 'a confrontation between the outlaw Smackwater Jack and Big Jim the Chief',
  },
];

const results = [];
for (const track of tracks) {
  try {
    const response = await fetch(track.url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
      },
      signal: AbortSignal.timeout(45000),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentEncoding = response.headers.get('content-encoding');
    const fetchedResponseSha256 = createHash('sha256').update(bytes).digest('hex');
    const decodedBytes = decodeResponseBytes(bytes, contentEncoding);
    const html = decodedBytes.toString(isUtf8(decodedBytes) ? 'utf8' : 'latin1');
    const normalized = normalizeEvidenceText(extractHtml(html));
    if (!normalized) throw new Error('Fetched response produced no extractable text.');
    const authoredExcerpt = normalizeEvidenceText(track.excerpt);
    const span = locateExactOrTypographyEquivalent(normalized, authoredExcerpt);
    if (!span) throw new Error(`Exact excerpt missing from fetched response: ${track.title}`);

    let start = Math.max(0, span.start - CONTEXT_RADIUS);
    let end = Math.min(normalized.length, span.end + CONTEXT_RADIUS);
    while (start < end && normalized[start] === ' ') start += 1;
    while (end > start && normalized[end - 1] === ' ') end -= 1;
    const retainedText = normalized.slice(start, end);
    const completeSource = start === 0 && end === normalized.length;
    const artifact = createSourceArtifact({
      canonicalUrl: track.url,
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
      window: { kind: completeSource ? 'complete-source' : 'character-offsets', start, end, fetchedTextLength: normalized.length, completeSource },
    });
    await writeSourceArtifact(artifactDir, artifact);
    const claim = {
      albumId: ALBUM_ID,
      trackTitle: track.title,
      trackNumber: track.n,
      retainedExtract: span.excerpt,
      section: { kind: 'character-offsets', start: span.start - start, end: span.end - start },
    };
    results.push({
      canonicalUrl: track.url,
      finalUrl: artifact.finalUrl,
      status: 'collected',
      artifactId: artifact.artifactId,
      fetchedResponseSha256,
      contentType,
      retainedCharacters: retainedText.length,
      fetchedCharacters: normalized.length,
      claims: [claim],
    });
    console.log(`collected ${track.title} -> ${artifact.artifactId} [${claim.section.start}, ${claim.section.end})`);
  } catch (error) {
    results.push({ canonicalUrl: track.url, trackTitle: track.title, status: 'inaccessible', error: error.message });
    console.error(`FAILED ${track.title}: ${error.message}`);
  }
}
await writeFile(reportPath, `${JSON.stringify({ schemaVersion: 1, collectorRunId: COLLECTOR_RUN_ID, collectedAt: new Date().toISOString(), results }, null, 2)}\n`);
console.log(`report: ${reportPath}`);
console.log(`collected=${results.filter((item) => item.status === 'collected').length} inaccessible=${results.filter((item) => item.status !== 'collected').length}`);
if (results.some((item) => item.status !== 'collected')) process.exitCode = 2;

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
  return text.replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"').replace(/[‐‑‒–—―−]/g, '-').replace(/…/g, '.');
}

function decodeResponseBytes(bytes, contentEncoding) {
  const encoding = (contentEncoding ?? '').split(',')[0].trim().toLowerCase();
  if (!encoding || encoding === 'identity') return bytes;
  const decompress = { gzip: gunzipSync, 'x-gzip': gunzipSync, deflate: inflateSync, br: brotliDecompressSync, zstd: zstdDecompressSync }[encoding];
  if (!decompress) throw new Error(`Unsupported content encoding: ${contentEncoding}`);
  try { return decompress(bytes); } catch { return bytes; }
}

function extractHtml(html) {
  const fragment = extractParserOutputFragment(html) ?? html;
  const converted = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: fragment, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (converted.status !== 0) throw new Error(`pandoc HTML extraction failed: ${converted.stderr || `exit ${converted.status}`}`);
  return converted.stdout;
}

function extractParserOutputFragment(html) {
  const marker = 'class="mw-content-ltr mw-parser-output"';
  let index = html.indexOf(marker);
  if (index < 0) index = html.indexOf('mw-parser-output');
  if (index < 0) return null;
  const divOpen = html.lastIndexOf('<div', index);
  if (divOpen < 0) return null;
  let depth = 0;
  for (let i = divOpen; i < html.length;) {
    if (html.startsWith('<div', i)) { depth += 1; i += 4; }
    else if (html.startsWith('</div>', i)) { depth -= 1; i += 6; if (depth === 0) return html.slice(divOpen, i); }
    else i += 1;
  }
  return null;
}

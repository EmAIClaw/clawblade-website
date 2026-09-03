// Collect the rank-18 Highway 61 Revisited source artifact from the fetched
// Wikipedia "Highway 61 Revisited" album article (track annotations).
// Mirrors scripts/collect-rank17-mbdtf-evidence.mjs core logic, scoped to one
// canonical URL, using http-fetch + pandoc HTML extraction (the same trusted
// albumvault-http-collector path used by ranks 9/10/11/13/14/15/16/17).
//
// NOTE: the album article's HTML nests the infobox inside the parser-output div
// in a way that makes pandoc's --to=plain truncate at the infobox. We extract
// the mw-parser-output div fragment first, then pandoc it, so the full article
// body (including the "Songs" track annotations) is retained.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '018-bob-dylan-highway-61-revisited-bd0599b4';
const COLLECTOR_RUN_ID = 'rank18-highway-61-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank18-highway-61-source-collection.json';

// One canonical source. Each documented track maps to one verbatim excerpt
// (a contiguous substring of the pandoc-extracted text).
const SOURCES = {
  album: {
    canonicalUrl: 'https://en.wikipedia.org/wiki/Highway_61_Revisited',
  },
};

// Each documented track: { n, disc, title, source, excerpt }.
// Excerpts are verbatim contiguous substrings of the pandoc-extracted text.
const tracks = [
  { n: 1, disc: 1, title: 'Like a Rolling Stone', source: 'album',
    excerpt: 'Highway 61 Revisited opens with "Like a Rolling Stone", which has been described as revolutionary in its combination of electric guitar licks, organ chords, and Dylan\'s voice,' },
  { n: 2, disc: 1, title: 'Tombstone Blues', source: 'album',
    excerpt: 'The fast-paced, two-chord blues song "Tombstone Blues", driven by Michael Bloomfield\'s lead guitar, uses a parade of historical characters' },
  { n: 3, disc: 1, title: 'It Takes a Lot to Laugh, It Takes a Train to Cry', source: 'album',
    excerpt: 'According to critic Andy Gill, "It Takes A Lot To Laugh" illustrates Dylan\'s creativity, both in the way it adapts an old blues song,' },
  { n: 4, disc: 1, title: 'From a Buick 6', source: 'album',
    excerpt: 'AllMusic critic Bill Janovitz describes "From a Buick 6" as a "raucous, up-tempo blues", which is played "almost recklessly".' },
  { n: 5, disc: 1, title: 'Ballad of a Thin Man', source: 'album',
    excerpt: '"Ballad of a Thin Man" is driven by Dylan\'s piano, which contrasts with "the spooky organ riffs" played by Al Kooper.' },
  { n: 6, disc: 1, title: 'Queen Jane Approximately', source: 'album',
    excerpt: 'Polizzotti, in his study of Highway 61 Revisited, writes that the opening track of Side Two, "Queen Jane Approximately" is in a similar vein to "Like a Rolling Stone",' },
  { n: 7, disc: 1, title: 'Highway 61 Revisited', source: 'album',
    excerpt: 'Dylan commences the title song of his album, "Highway 61 Revisited", with the words "Oh God said to Abraham, \'Kill me a son\'/Abe says, \'Man, you must be puttin\' me on\'".' },
  { n: 8, disc: 1, title: "Just Like Tom Thumb's Blues", source: 'album',
    excerpt: '"Just Like Tom Thumb\'s Blues" has six verses and no chorus.' },
  { n: 9, disc: 1, title: 'Desolation Row', source: 'album',
    excerpt: 'Gill has characterized "Desolation Row" as "an 11-minute epic of entropy, which takes the form of a Fellini-esque parade of grotesques and oddities featuring a huge cast of iconic characters".' },
];

const results = [];
for (const [sourceKey, source] of Object.entries(SOURCES)) {
  const sourceTracks = tracks.filter((t) => t.source === sourceKey);
  const canonicalUrl = source.canonicalUrl;
  try {
    const response = await fetch(canonicalUrl, {
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
    const html = decodedBytes.toString(isUtf8(decodedBytes) ? 'utf8' : 'latin1');
    const extracted = extractHtml(html);
    const normalized = normalizeEvidenceText(extracted.text);
    if (!normalized) throw new Error('Fetched response produced no extractable text.');

    const located = [];
    for (const track of sourceTracks) {
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
      canonicalUrl,
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

    results.push({
      canonicalUrl,
      fetchUrl: canonicalUrl,
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
    });
    console.log(`collected ${canonicalUrl} -> ${artifact.artifactId}`);
    console.log(`  retainedCharacters=${retainedText.length} fetchedCharacters=${normalized.length} completeSource=${completeSource}`);
    for (const item of located) {
      console.log(`  ${item.title}: [${item.start - start}, ${item.end - start})`);
    }
  } catch (error) {
    results.push({ canonicalUrl, status: 'inaccessible', error: error.message });
    console.error(`FAILED ${canonicalUrl}: ${error.message}`);
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

// Extract the mw-parser-output article body fragment, then pandoc it to plain
// text. This avoids pandoc truncating at the nested infobox on the page.
function extractHtml(html) {
  const fragment = extractParserOutputFragment(html) ?? html;
  const temp = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: fragment, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (temp.status !== 0) throw new Error(`pandoc HTML extraction failed: ${temp.stderr || `exit ${temp.status}`}`);
  return { text: temp.stdout, pages: [] };
}

function extractParserOutputFragment(html) {
  // The main article body is the div carrying class "mw-content-ltr mw-parser-output".
  // (A separate "mw-parser-output" div wraps the good-article indicator and must be skipped.)
  const marker = 'class="mw-content-ltr mw-parser-output"';
  let idx = html.indexOf(marker);
  if (idx < 0) idx = html.indexOf('mw-parser-output');
  if (idx < 0) return null;
  const divOpen = html.lastIndexOf('<div', idx);
  if (divOpen < 0) return null;
  let depth = 0;
  let i = divOpen;
  while (i < html.length) {
    if (html.startsWith('<div', i)) {
      depth += 1;
      i += 4;
    } else if (html.startsWith('</div>', i)) {
      depth -= 1;
      i += 6;
      if (depth === 0) return html.slice(divOpen, i);
    } else {
      i += 1;
    }
  }
  return null;
}

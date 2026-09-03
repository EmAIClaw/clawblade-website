// Collect rank-37 The Chronic evidence from the fetched Wikipedia article body.
// Each retained excerpt is a track-specific performer, sample, or source-audio
// credit; titles, timings, sequence descriptions, and generic album prose are
// not used as evidence claims.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '037-dr-dre-the-chronic-08e42779';
const CANONICAL_URL = 'https://en.wikipedia.org/wiki/The_Chronic';
const COLLECTOR_RUN_ID = 'rank37-the-chronic-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const artifactDir = path.resolve('src/data/track-encyclopedia/source-artifacts');
const reportPath = process.argv[2] || 'reports/rank37-the-chronic-source-collection.json';

const tracks = [
  { n: 1, title: 'The Chronic (intro)', excerpt: '"Country Cooking" by Jim Dandy' },
  { n: 2, title: 'Fuck Wit Dre Day (And Everybody’s Celebratin’)', excerpt: '"Atomic Dog" by George Clinton' },
  { n: 3, title: 'Let Me Ride', excerpt: '"Mothership Connection (Star Child)", "Swing Down, Sweet Chariot (Live)" by Parliament' },
  { n: 4, title: 'The Day the Niggaz Took Over', excerpt: 'Sampled from the LA uprising documentary, titled "Birth of a Nation 4x29x92", in which was directed by Matthew McDaniels.' },
  { n: 5, title: 'Nuthin’ but a “G” Thang', excerpt: '"I Want\'a Do Something Freaky to You" by Leon Haywood' },
  { n: 6, title: 'Deeez Nuuuts', excerpt: '"Chestnuts" by Rudy Ray Moore' },
  { n: 7, title: 'Lil’ Ghetto Boy', excerpt: '"Little Ghetto Boy" by Donny Hathaway' },
  { n: 8, title: 'A Nigga Witta Gun', excerpt: '"Big Sur Suite" by Johnny "Hammond" Smith' },
  { n: 9, title: 'Rat-Tat-Tat-Tat', excerpt: 'Contains an audio sample from The Mack' },
  { n: 10, title: 'The $20 Sack Pyramid', excerpt: '"Papa Was Too" by Joe Tex' },
  { n: 11, title: 'Lyrical Gangbang', excerpt: '"When the Levee Breaks" by Led Zeppelin' },
  { n: 12, title: 'High Powered', excerpt: '"Buffalo Gals" by Malcolm McLaren' },
  { n: 13, title: 'The Doctor’s Office', excerpt: '"Back in Bed" by Jewell' },
  { n: 14, title: 'Stranded on Death Row', excerpt: '"Do Your Thing (Live)" by Isaac Hayes' },
  { n: 15, title: 'The Roach (The Chronic Outro)', excerpt: '"P. Funk (Wants to Get Funked Up)", "Colour Me Funky" by Parliament' },
  { n: 16, title: 'Bitches Ain’t Shit', excerpt: '"Adolescent Funk" by Funkadelic' },
];

const response = await fetch(CANONICAL_URL, {
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
const fragment = extractParserOutputFragment(html) ?? html;
const converted = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], {
  input: fragment,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (converted.status !== 0) throw new Error(`pandoc HTML extraction failed: ${converted.stderr || `exit ${converted.status}`}`);
const normalized = normalizeEvidenceText(converted.stdout);
if (!normalized) throw new Error('Fetched response produced no extractable text.');

const located = tracks.map((track) => {
  const span = locateExactOrTypographyEquivalent(normalized, normalizeEvidenceText(track.excerpt));
  if (!span) throw new Error(`Exact excerpt missing from fetched response: ${track.title}`);
  return { ...track, ...span };
});
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
const claims = located.map((item) => ({
  albumId: ALBUM_ID,
  discNumber: 1,
  trackNumber: item.n,
  trackTitle: item.title,
  retainedExtract: item.excerpt,
  section: { kind: 'character-offsets', start: item.start - start, end: item.end - start },
}));
const report = {
  schemaVersion: 1,
  collectorRunId: COLLECTOR_RUN_ID,
  collectedAt: new Date().toISOString(),
  researchCoverage: {
    searchedQueries: [
      'Dr. Dre The Chronic track by track samples performers credits',
      'The Chronic liner notes track samples personnel',
    ],
    sourceClasses: [
      'Wikipedia The Chronic article body and cited track-credit table',
      'album credits and sample attributions reproduced in the fetched article body',
    ],
    limitations: 'Retained claims are restricted to track-specific sample, source-audio, and performer-credit facts present in the fetched body; no lyric interpretation or musical analysis is inferred.',
  },
  results: [{
    canonicalUrl: CANONICAL_URL,
    finalUrl: artifact.finalUrl,
    status: 'collected',
    artifactId: artifact.artifactId,
    fetchedResponseSha256,
    httpStatus: response.status,
    contentType,
    retainedCharacters: retainedText.length,
    fetchedCharacters: normalized.length,
    claims,
  }],
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ reportPath, artifactId: artifact.artifactId, fetchedResponseSha256, tracks: claims.length }));

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
  try { return decompress(bytes); } catch { return bytes; }
}

function extractParserOutputFragment(sourceHtml) {
  const marker = 'class="mw-content-ltr mw-parser-output"';
  let idx = sourceHtml.indexOf(marker);
  if (idx < 0) idx = sourceHtml.indexOf('mw-parser-output');
  if (idx < 0) return null;
  const divOpen = sourceHtml.lastIndexOf('<div', idx);
  if (divOpen < 0) return null;
  let depth = 0;
  for (let i = divOpen; i < sourceHtml.length;) {
    if (sourceHtml.startsWith('<div', i)) {
      depth += 1;
      i += 4;
    } else if (sourceHtml.startsWith('</div>', i)) {
      depth -= 1;
      i += 6;
      if (depth === 0) return sourceHtml.slice(divOpen, i);
    } else {
      i += 1;
    }
  }
  return null;
}

// Collect the rank-34 "All In Love Is Fair" source artifact from its song article.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '034-stevie-wonder-innervisions-d09c9a35';
const canonicalUrl = 'https://en.wikipedia.org/wiki/All_in_Love_Is_Fair';
const excerpt = 'Recording began for “All in Love is Fair” on November 10, 1972 at 2:30 A.M., with Wonder on acoustic piano and Scott Edwards on guitar.';
const artifactDir = path.resolve('src/data/track-encyclopedia/source-artifacts');
const reportPath = process.argv[2] || 'reports/rank34-all-in-love-source-collection.json';
const response = await fetch(canonicalUrl, {
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
const contentEncoding = response.headers.get('content-encoding');
const decodedBytes = decodeResponseBytes(bytes, contentEncoding);
const html = decodedBytes.toString(isUtf8(decodedBytes) ? 'utf8' : 'latin1');
const fragment = extractParserOutputFragment(html) ?? html;
const extracted = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], {
  input: fragment,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (extracted.status !== 0) throw new Error(`pandoc HTML extraction failed: ${extracted.stderr || `exit ${extracted.status}`}`);
const normalized = normalizeEvidenceText(extracted.stdout);
const normalizedExcerpt = normalizeEvidenceText(excerpt);
const located = locateExactOrTypographyEquivalent(normalized, normalizedExcerpt);
if (!located) throw new Error('Exact All In Love Is Fair excerpt missing from fetched response.');
let start = Math.max(0, located.start - 500);
let end = Math.min(normalized.length, located.end + 500);
while (start < end && normalized[start] === ' ') start += 1;
while (end > start && normalized[end - 1] === ' ') end -= 1;
const retainedText = normalized.slice(start, end);
const artifact = createSourceArtifact({
  canonicalUrl,
  finalUrl: canonicalizeSourceUrl(response.url),
  retrievedAt: new Date().toISOString(),
  httpStatus: response.status,
  contentType: response.headers.get('content-type') || 'application/octet-stream',
  contentEncoding,
  collector: { identity: 'albumvault-http-collector', version: '1.0.0', runId: 'rank34-all-in-love-http-collector-20260903' },
  collectionMethod: 'http-fetch',
  fetchedResponseSha256: createHash('sha256').update(bytes).digest('hex'),
  normalizationVersion: 'nfkc-whitespace-v1',
  retainedText,
  window: {
    kind: start === 0 && end === normalized.length ? 'complete-source' : 'character-offsets',
    start,
    end,
    fetchedTextLength: normalized.length,
    completeSource: start === 0 && end === normalized.length,
  },
});
await writeSourceArtifact(artifactDir, artifact);
const result = {
  schemaVersion: 1,
  collectorRunId: 'rank34-all-in-love-http-collector-20260903',
  collectedAt: new Date().toISOString(),
  results: [{
    canonicalUrl,
    fetchUrl: canonicalUrl,
    finalUrl: artifact.finalUrl,
    status: 'collected',
    artifactId: artifact.artifactId,
    created: true,
    fetchedResponseSha256: artifact.fetchedResponseSha256,
    contentType: artifact.contentType,
    retainedCharacters: retainedText.length,
    fetchedCharacters: normalized.length,
    claims: [{
      albumId: ALBUM_ID,
      trackTitle: 'All In Love Is Fair',
      factIndex: 0,
      refIndex: 0,
      retainedExtract: located.excerpt,
      section: { kind: 'character-offsets', start: located.start - start, end: located.end - start },
    }],
  }],
};
await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ artifactId: artifact.artifactId, fetchedResponseSha256: artifact.fetchedResponseSha256, start: located.start - start, end: located.end - start, reportPath }));

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

function extractParserOutputFragment(htmlText) {
  const marker = 'class="mw-content-ltr mw-parser-output"';
  let index = htmlText.indexOf(marker);
  if (index < 0) index = htmlText.indexOf('mw-parser-output');
  if (index < 0) return null;
  const divOpen = htmlText.lastIndexOf('<div', index);
  if (divOpen < 0) return null;
  let depth = 0;
  let cursor = divOpen;
  while (cursor < htmlText.length) {
    if (htmlText.startsWith('<div', cursor)) {
      depth += 1;
      cursor += 4;
    } else if (htmlText.startsWith('</div>', cursor)) {
      depth -= 1;
      cursor += 6;
      if (depth === 0) return htmlText.slice(divOpen, cursor);
    } else {
      cursor += 1;
    }
  }
  return null;
}

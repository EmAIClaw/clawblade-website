// Collect the rank-35 Rubber Soul evidence artifact from the fetched Wikipedia
// album article. Every retained excerpt is located mechanically in the fetched
// response before the content-addressed artifact is written.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '035-the-beatles-rubber-soul-e05eb313';
const CANONICAL_URL = 'https://en.wikipedia.org/wiki/Rubber_Soul';
const COLLECTOR_RUN_ID = 'rank35-rubber-soul-http-collector-v2-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || '.hermes/tmp/rank35-rubber-soul-source-collection.json';

const tracks = [
  { n: 1, title: 'Drive My Car', excerpt: 'Harrison, as the Beatles\' most knowledgeable soul-music enthusiast, contributed heavily to the recording by suggesting they arrange the song with a dual guitar–bass riff in the style of Otis Redding\'s contemporary single "Respect".' },
  { n: 2, title: 'Norwegian Wood (This Bird Has Flown)', excerpt: 'Lennon said he wrote "Norwegian Wood" about an extramarital affair and that he worded the narrative to hide the truth from his wife, Cynthia.' },
  { n: 3, title: "You Won't See Me", excerpt: 'McCartney described its music as "very Motown-flavored", with a "feel" inspired by Motown bassist James Jamerson.' },
  { n: 4, title: 'Nowhere Man', excerpt: 'Lennon recalled that "Nowhere Man" came to him fully formed one night at his home in Surrey,' },
  { n: 5, title: 'Think For Yourself', excerpt: 'The song\'s accusatory message was unprecedented in the Beatles\' work;' },
  { n: 6, title: 'The Word', excerpt: 'The arrangement also includes seven vocal parts and Martin playing suspended chords on harmonium.' },
  { n: 7, title: 'Michelle', excerpt: 'During a writing session for Rubber Soul, Lennon added a new middle eight, part of which was taken from Nina Simone\'s recent cover of "I Put a Spell on You".' },
  { n: 8, title: 'What Goes On', excerpt: 'With little time to complete Rubber Soul, the song was reworked by Lennon and McCartney as a vocal spot for Starr,' },
  { n: 9, title: 'Girl', excerpt: 'The song was the final track recorded for the album.' },
  { n: 10, title: "I'm Looking Through You", excerpt: 'The Beatles had taped two versions of the song before achieving the final version,' },
  { n: 11, title: 'In My Life', excerpt: 'Martin\'s Bach-inspired piano solo was overdubbed in the Beatles\' absence,' },
  { n: 12, title: 'Wait', excerpt: 'The band completed the track on the final day of recording for the album, overdubbing tone-pedal lead guitar, percussion' },
  { n: 13, title: 'If I Needed Someone', excerpt: 'Harrison wrote "If I Needed Someone" as a love song to Pattie Boyd, the English model to whom he became engaged in December 1965 and married the following month.' },
  { n: 14, title: 'Run For Your Life', excerpt: 'it was the first track recorded for the album and features a descending guitar riff played by Harrison and slide guitar parts.' },
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
const normalized = normalizeEvidenceText(extractHtml(html));
if (!normalized) throw new Error('Fetched response produced no extractable text.');

const located = tracks.map((track) => {
  const evidencePhrase = normalizeEvidenceText(track.excerpt);
  const span = locateExactOrTypographyEquivalent(normalized, evidencePhrase);
  if (!span) throw new Error(`Exact excerpt missing from fetched response: ${track.title}`);
  const articleTitle = track.n === 5 ? 'Think for Yourself' : (track.n === 14 ? 'Run for Your Life' : track.title);
  const heading = `"${articleTitle}" [edit]`;
  const headingStart = normalized.lastIndexOf(heading, span.start);
  if (headingStart < 0) throw new Error(`Track heading missing before evidence phrase: ${track.title}`);
  return { ...track, excerpt: normalized.slice(headingStart, span.end), start: headingStart, end: span.end };
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
  window: { kind: completeSource ? 'complete-source' : 'character-offsets', start, end, fetchedTextLength: normalized.length, completeSource },
});
await writeSourceArtifact(artifactDir, artifact);
const result = {
  schemaVersion: 1,
  collectorRunId: COLLECTOR_RUN_ID,
  collectedAt: new Date().toISOString(),
  results: [{
    canonicalUrl: CANONICAL_URL,
    finalUrl: artifact.finalUrl,
    status: 'collected',
    httpStatus: response.status,
    artifactId: artifact.artifactId,
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
  }],
};
await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ artifactId: artifact.artifactId, fetchedResponseSha256, httpStatus: response.status, tracks: located.length, reportPath }));

function locateExactOrTypographyEquivalent(sourceText, excerpt) {
  const exactStart = sourceText.indexOf(excerpt);
  if (exactStart >= 0) return { start: exactStart, end: exactStart + excerpt.length, excerpt: sourceText.slice(exactStart, exactStart + excerpt.length) };
  const comparableSource = comparableTypography(sourceText);
  const comparableExcerpt = comparableTypography(excerpt);
  const startIndex = comparableSource.indexOf(comparableExcerpt);
  if (startIndex < 0) return null;
  return { start: startIndex, end: startIndex + excerpt.length, excerpt: sourceText.slice(startIndex, startIndex + excerpt.length) };
}

function comparableTypography(text) {
  return text.replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"').replace(/[‐‑‒–—―−]/g, '-').replace(/…/g, '.');
}

function decodeResponseBytes(body, encodingHeader) {
  const encoding = (encodingHeader ?? '').split(',')[0].trim().toLowerCase();
  if (!encoding || encoding === 'identity') return body;
  const decompress = { gzip: gunzipSync, 'x-gzip': gunzipSync, deflate: inflateSync, br: brotliDecompressSync, zstd: zstdDecompressSync }[encoding];
  if (!decompress) throw new Error(`Unsupported content encoding: ${encodingHeader}`);
  try { return decompress(body); } catch { return body; }
}

function extractHtml(sourceHtml) {
  const fragment = extractParserOutputFragment(sourceHtml) ?? sourceHtml;
  const result = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: fragment, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`pandoc HTML extraction failed: ${result.stderr || `exit ${result.status}`}`);
  return result.stdout;
}

function extractParserOutputFragment(sourceHtml) {
  const marker = 'class="mw-content-ltr mw-parser-output"';
  let index = sourceHtml.indexOf(marker);
  if (index < 0) index = sourceHtml.indexOf('mw-parser-output');
  if (index < 0) return null;
  const divOpen = sourceHtml.lastIndexOf('<div', index);
  if (divOpen < 0) return null;
  let depth = 0;
  for (let cursor = divOpen; cursor < sourceHtml.length;) {
    if (sourceHtml.startsWith('<div', cursor)) { depth += 1; cursor += 4; }
    else if (sourceHtml.startsWith('</div>', cursor)) {
      depth -= 1;
      cursor += 6;
      if (depth === 0) return sourceHtml.slice(divOpen, cursor);
    } else cursor += 1;
  }
  return null;
}

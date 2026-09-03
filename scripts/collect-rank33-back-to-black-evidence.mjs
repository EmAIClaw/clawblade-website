// Collect the rank-33 Back to Black source artifact from the fetched Wikipedia
// album article. The article carries track-specific recording, composition, and
// songwriting evidence for all eleven catalog tracks.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '033-amy-winehouse-back-to-black-4e0a725a';
const CANONICAL_URL = 'https://en.wikipedia.org/wiki/Back_to_Black';
const COLLECTOR_RUN_ID = 'rank33-back-to-black-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank33-back-to-black-source-collection.json';

const tracks = [
  { n: 1, title: 'Rehab', excerpt: 'The song also contains "spring reverbs" on the lead vocals and drums to obtain a "retro feel", live "handclaps", timpanis, bells, and "slight vintage effects" on the piano and bass.' },
  { n: 2, title: "You Know I'm No Good", excerpt: 'The lyrics also entail Winehouse as being "helpless" while trying to understand and resist her own self-destructive compulsions.' },
  { n: 3, title: 'Me & Mr. Jones', excerpt: 'In a Genius commentary, Island Records president Darcus Beese added that the original track was titled "Fuckery" from both Remi and Winehouse.' },
  { n: 4, title: 'Just Friends', excerpt: 'The fourth song on the album, "Just Friends", is about "[a woman] trying to pull away from an illicit affair", with lyrics indicating, "The guilt will kill you if she don\'t first".' },
  { n: 5, title: 'Back to Black', excerpt: 'So I came up with this little piano riff, which became the verse chords to \'Back to Black.\' Behind it I just put a kick drum and a tambourine and tons of reverb.' },
  { n: 6, title: 'Love Is a Losing Game', excerpt: '"Love Is a Losing Game" is a sentimental ballad that invokes Winehouse\'s chosen metaphor as a pastime that could be "addictive and destructive".' },
  { n: 7, title: 'Tears Dry On Their Own', excerpt: 'The song "Tears Dry on Their Own" samples the main chord progression from Marvin Gaye and Tammi Terrell\'s 1967 song "Ain\'t No Mountain High Enough".' },
  { n: 8, title: 'Wake Up Alone', excerpt: 'Winehouse spent a month in O\'Duffy\'s North London studio working on tracks of the album, and "Wake Up Alone" was the first song recorded during the sessions and the only tune that made it onto the album.' },
  { n: 9, title: 'Some Unholy War', excerpt: 'As she heard the term "holy war", a war being primarily caused or justified by differences in religion, Winehouse immediately thought of an idea to spin the religious conflict into her own personal issues with Fielder-Civil.' },
  { n: 10, title: 'He Can Only Hold Her', excerpt: '"He Can Only Hold Her" interpolates "(My Girl) She\'s a Fox" by brothers Robert and Richard Poindexter.' },
  { n: 11, title: 'Addicted', excerpt: '"Addicted", a bonus track included on the expanded versions of Back to Black, pertains to Winehouse\'s experiences with marijuana.' },
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
const extracted = extractHtml(html);
const normalized = normalizeEvidenceText(extracted);
if (!normalized) throw new Error('Fetched response produced no extractable text.');

const located = tracks.map((track) => {
  const authoredExcerpt = normalizeEvidenceText(track.excerpt);
  const span = locateExactOrTypographyEquivalent(normalized, authoredExcerpt);
  if (!span) throw new Error(`Exact excerpt missing from fetched response: ${track.title}`);
  return { ...track, excerpt: span.excerpt, start: span.start, end: span.end };
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
const created = await writeSourceArtifact(artifactDir, artifact);
const claims = located.map((item) => ({
  albumId: ALBUM_ID,
  trackTitle: item.title,
  factIndex: 0,
  refIndex: 0,
  retainedExtract: item.excerpt,
  section: { kind: 'character-offsets', start: item.start - start, end: item.end - start },
}));
const result = {
  schemaVersion: 1,
  collectorRunId: COLLECTOR_RUN_ID,
  collectedAt: new Date().toISOString(),
  results: [{
    canonicalUrl: CANONICAL_URL,
    finalUrl: artifact.finalUrl,
    status: 'collected',
    artifactId: artifact.artifactId,
    created,
    fetchedResponseSha256,
    httpStatus: response.status,
    contentType,
    retainedCharacters: retainedText.length,
    fetchedCharacters: normalized.length,
    claims,
  }],
};
await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, artifactId: artifact.artifactId, fetchedResponseSha256, tracks: claims.length, created }));

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
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/…/g, '.');
}

function decodeResponseBytes(bytes, contentEncoding) {
  const encoding = (contentEncoding ?? '').split(',')[0].trim().toLowerCase();
  if (!encoding || encoding === 'identity') return bytes;
  const decompress = { gzip: gunzipSync, 'x-gzip': gunzipSync, deflate: inflateSync, br: brotliDecompressSync, zstd: zstdDecompressSync }[encoding];
  if (!decompress) throw new Error(`Unsupported content encoding: ${contentEncoding}`);
  try { return decompress(bytes); } catch { return bytes; }
}

function extractHtml(html) {
  const marker = 'class="mw-content-ltr mw-parser-output"';
  let markerIndex = html.indexOf(marker);
  if (markerIndex < 0) markerIndex = html.indexOf('mw-parser-output');
  if (markerIndex < 0) throw new Error('Wikipedia parser output not found.');
  const divOpen = html.lastIndexOf('<div', markerIndex);
  let depth = 0;
  let end = -1;
  for (let i = divOpen; i < html.length;) {
    if (html.startsWith('<div', i)) { depth += 1; i += 4; }
    else if (html.startsWith('</div>', i)) { depth -= 1; i += 6; if (depth === 0) { end = i; break; } }
    else i += 1;
  }
  if (divOpen < 0 || end <= divOpen) throw new Error('Wikipedia article body extraction failed.');
  const result = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: html.slice(divOpen, end), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`pandoc HTML extraction failed: ${result.stderr || `exit ${result.status}`}`);
  return result.stdout;
}

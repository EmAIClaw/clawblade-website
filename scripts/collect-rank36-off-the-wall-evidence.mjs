// Collect rank-36 Off the Wall source artifacts from fetched source bodies.
// Sources are fetched over HTTP and retained with exact character-offset evidence.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '036-michael-jackson-off-the-wall-4752dab3';
const COLLECTOR_RUN_ID = 'rank36-off-the-wall-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank36-off-the-wall-source-collection.json';

const SOURCES = {
  billboard: { canonicalUrl: 'https://www.billboard.com/music/reviews/michael-jacksons-off-the-wall-at-35-classic-track-by-track-6214222/' },
  albumism: { canonicalUrl: 'https://albumism.com/features/michael-jackson-off-the-wall-album-anniversary' },
};

const tracks = [
  { n: 1, disc: 1, title: "Don't Stop 'Til You Get Enough", source: 'billboard', excerpt: '“Touch me,” he urges, singing self-penned lyrics over music he’s written himself.' },
  { n: 2, disc: 1, title: 'Rock With You', source: 'billboard', excerpt: 'As far as grooving goes, this one’s slower and funkier than “Don’t Stop.”' },
  { n: 3, disc: 1, title: "Workin' Day and Night", source: 'billboard', excerpt: 'The second of three tunes written solely by Jackson, “Working Day and Night” would have been a smash single on any other album.' },
  { n: 4, disc: 1, title: 'Get On the Floor', source: 'albumism', excerpt: 'Structured around the sublime bass work of Louis Johnson (co-writer on the track with Jackson) whose hands run all over the fret, Jackson builds the song into a flurry of funk with a sparse arrangement of bass, strings and vocals anchored on a percussion infused groove that fills the song with pure energy.' },
  { n: 5, disc: 1, title: 'Off the Wall', source: 'billboard', excerpt: 'Rod Temperton, the man behind “Rock With You,” penned this, the album’s third of four Top 10 pop hits.' },
  { n: 6, disc: 1, title: 'Girlfriend', source: 'billboard', excerpt: 'Even though Paul McCartney included this tune on the 1978 Wings album London Town, he penned it with Michael in mind.' },
  { n: 7, disc: 1, title: "She's Out of My Life", source: 'billboard', excerpt: 'As the story goes, Michael cried at the end of each take, and he certainly sounds like a man on the verge of tears.' },
  { n: 8, disc: 1, title: "I Can't Help It", source: 'billboard', excerpt: 'The tune Stevie Wonder co-wrote is among the ones people talk about the least.' },
  { n: 9, disc: 1, title: "It's the Falling in Love", source: 'billboard', excerpt: 'It’s all about how the idea of romance, the mystery of thinking about what might be, is better than the real thing.' },
  { n: 10, disc: 1, title: 'Burn This Disco Out', source: 'billboard', excerpt: 'In a few playful moments, he affects a low bellow and sings, “Keep the boogie alright.”' },
];

const results = [];
for (const [sourceKey, source] of Object.entries(SOURCES)) {
  const sourceTracks = tracks.filter((t) => t.source === sourceKey);
  if (sourceTracks.length === 0) continue;
  const canonicalUrl = source.canonicalUrl;
  const fetchUrl = canonicalUrl;
  try {
    const response = await fetch(fetchUrl, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        accept: 'application/json,text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
      },
      signal: AbortSignal.timeout(45000),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentEncoding = response.headers.get('content-encoding');
    const fetchedResponseSha256 = createHash('sha256').update(bytes).digest('hex');
    const decodedBytes = decodeResponseBytes(bytes, contentEncoding);
    const body = decodedBytes.toString(isUtf8(decodedBytes) ? 'utf8' : 'latin1');
    const extracted = extractHtml(body);
    const normalized = normalizeEvidenceText(extracted.text);
    if (!normalized) throw new Error('Fetched response produced no extractable text.');

    const located = [];
    for (const track of sourceTracks) {
      const authoredExcerpt = normalizeEvidenceText(track.excerpt);
      const span = locateExactOrTypographyEquivalent(normalized, authoredExcerpt);
      if (!span) throw new Error(`Exact excerpt missing from fetched response: ${track.title}: ${authoredExcerpt}`);
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
      window: { kind: completeSource ? 'complete-source' : 'character-offsets', start, end, fetchedTextLength: normalized.length, completeSource },
    });
    await writeSourceArtifact(artifactDir, artifact);

    results.push({
      canonicalUrl,
      fetchUrl,
      finalUrl: artifact.finalUrl,
      status: 'collected',
      artifactId: artifact.artifactId,
      created: true,
      fetchedResponseSha256,
      contentType,
      retainedCharacters: retainedText.length,
      fetchedCharacters: normalized.length,
      claims: located.map((item) => ({ albumId: ALBUM_ID, trackTitle: item.title, factIndex: 0, refIndex: 0, retainedExtract: item.excerpt, section: { kind: 'character-offsets', start: item.start - start, end: item.end - start } })),
    });
    console.log(`collected ${canonicalUrl} -> ${artifact.artifactId}`);
    for (const item of located) console.log(`  ${item.title}: [${item.start - start}, ${item.end - start})`);
  } catch (error) {
    results.push({ canonicalUrl, fetchUrl, status: 'inaccessible', error: error.message });
    console.error(`FAILED ${canonicalUrl}: ${error.message}`);
  }
}

await writeFile(reportPath, `${JSON.stringify({ schemaVersion: 1, collectorRunId: COLLECTOR_RUN_ID, collectedAt: new Date().toISOString(), results }, null, 2)}\n`);
console.log(`report: ${reportPath}`);
console.log(`collected=${results.filter((item) => item.status === 'collected').length} inaccessible=${results.filter((item) => item.status !== 'collected').length}`);
if (results.some((item) => item.status !== 'collected')) process.exitCode = 2;

function extractHtml(html) {
  const temp = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: html, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (temp.status !== 0) throw new Error(`pandoc HTML extraction failed: ${temp.stderr || `exit ${temp.status}`}`);
  return { text: temp.stdout, pages: [] };
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
    .replace(/…/g, '.')
    .replace(/\s+/g, ' ');
}

function decodeResponseBytes(bytes, contentEncoding) {
  const encoding = (contentEncoding ?? '').split(',')[0].trim().toLowerCase();
  if (!encoding || encoding === 'identity') return bytes;
  const decompress = { gzip: gunzipSync, 'x-gzip': gunzipSync, deflate: inflateSync, br: brotliDecompressSync, zstd: zstdDecompressSync }[encoding];
  if (!decompress) throw new Error(`Unsupported content encoding: ${contentEncoding}`);
  try { return decompress(bytes); } catch { return bytes; }
}

// Collect rank-34 Innervisions evidence from Billboard's track-by-track review.
// Each retained excerpt is a contiguous substring of the fetched, pandoc-extracted body.
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
const COLLECTOR_RUN_ID = 'rank34-innervisions-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const canonicalUrl = 'https://www.billboard.com/music/rb-hip-hop/stevie-wonder-innervisions-classic-track-by-track-review-5638082';
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank34-innervisions-source-collection.json';

const tracks = [
  {
    n: 1,
    title: 'Too High',
    excerpt: 'The album opens with a jazzy number about the pitfalls of using drugs.',
  },
  {
    n: 2,
    title: 'Visions',
    excerpt: 'Here Stevie sits back at his piano while guitarists pensively strum and he fantasizes about a place, “where hate’s a dream and love forever stands.”',
  },
  {
    n: 3,
    title: 'Living For the City',
    excerpt: 'Each verse here refers to an impoverished Black person, trying to make it through rough times.',
  },
  {
    n: 4,
    title: 'Golden Lady',
    excerpt: 'It begins with humble piano keys, a few guitar strums and high-hat taps, then swells to a bliss blast of organ work.',
  },
  {
    n: 5,
    title: 'Higher Ground',
    excerpt: 'It’s a call to action (maybe the grooviest ever?), where he encourages people to “keep on learnin’,” outs politicians that talk while their “people keep on dyin’,” and those doing nothing to “stop sleepin’.”',
  },
  {
    n: 6,
    title: 'Jesus Children of America',
    excerpt: 'The bounce on this song suggests that it’s something to be danced to, but a close listen reveals that “Jesus Children of America” is really four minutes of Sunday school admonishment.',
  },
  {
    n: 7,
    title: 'All In Love Is Fair',
    excerpt: 'Musically, this is the simplest cut on the album. But it’s damp with regret and grief caused by a breakup.',
  },
  {
    n: 8,
    title: "Don't You Worry 'Bout a Thing",
    excerpt: 'This cut has a fun, Latin soul feel with Stevie singing to a lady that’s down on her luck. He encourages her and promises to be right by her side through all issues and at the ready when happy days return.',
  },
  {
    n: 9,
    title: "He's Misstra Know-It-All",
    excerpt: 'The album’s closer is a cautionary tale about a hustler.',
  },
];

const results = [];
try {
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
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const contentEncoding = response.headers.get('content-encoding');
  const fetchedResponseSha256 = createHash('sha256').update(bytes).digest('hex');
  const decodedBytes = decodeResponseBytes(bytes, contentEncoding);
  const html = decodedBytes.toString(isUtf8(decodedBytes) ? 'utf8' : 'latin1');
  const extracted = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], {
    input: html,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (extracted.status !== 0) throw new Error(`pandoc HTML extraction failed: ${extracted.stderr || `exit ${extracted.status}`}`);
  const normalized = normalizeEvidenceText(extracted.stdout);
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
  for (const item of located) console.log(`  ${item.title}: [${item.start - start}, ${item.end - start})`);
} catch (error) {
  results.push({ canonicalUrl, status: 'inaccessible', error: error.message });
  console.error(`FAILED ${canonicalUrl}: ${error.message}`);
}

await writeFile(reportPath, `${JSON.stringify({ schemaVersion: 1, collectorRunId: COLLECTOR_RUN_ID, collectedAt: new Date().toISOString(), results }, null, 2)}\n`);
console.log(`report: ${reportPath}`);
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
  try {
    return decompress(bytes);
  } catch {
    return bytes;
  }
}

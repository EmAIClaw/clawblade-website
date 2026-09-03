// Collect rank-32 Lemonade evidence from Beyoncé's official track credits.
// The live credits page is unavailable; this collector uses the fixed Wayback
// snapshot from 2022-10-11 and records archive provenance in the final URL.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '032-beyonce-lemonade-d3bb0f63';
const CANONICAL_URL = 'https://www.beyonce.com/album/lemonade-visual-album/songs/';
const SNAPSHOT_TIMESTAMP = '20221011170727';
const FETCH_URL = `https://web.archive.org/web/${SNAPSHOT_TIMESTAMP}id_/${CANONICAL_URL}`;
const COLLECTOR_RUN_ID = 'rank32-lemonade-wayback-collector-20260903';
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank32-lemonade-source-collection.json';

const tracks = [
  { n: 1, title: 'Pray You Catch Me', excerpt: 'PIANO BY KEVIN GARRETT / JUPITER BASS BY JAMES BLAKE' },
  { n: 2, title: 'Hold Up', excerpt: 'CONTAINS ELEMENTS OF “MAPS” WRITTEN BY BRIAN CHASE, KAREN ORZOLEK AND NICK ZINNER' },
  { n: 3, title: 'Don’t Hurt Yourself', excerpt: 'FEATURES SAMPLE FROM THE LED ZEPPELIN RECORDING “WHEN THE LEVEE BREAKS,”' },
  { n: 4, title: 'Sorry', excerpt: 'CO-PRODUCED BY HIT-BOY FOR HITS SINCE ’87 AND HAZEBANGA FOR HAZEBANGA MUSIC' },
  { n: 5, title: '6 Inch', excerpt: 'CONTAINS SAMPLES FROM “WALK ON BY” WRITTEN BY BURT BACHARACH AND HAL DAVID' },
  { n: 6, title: 'Daddy Lessons', excerpt: 'HARMONICA BY PATRICK WILLIAMS / ADDITIONAL INSTRUMENTATION BY TOO MANY ZOOZ' },
  { n: 7, title: 'Love Drought', excerpt: 'KEYBOARDS AND DRUM PROGRAMMING BY MIKE DEAN / TRACK ENGINEERED BY MIKE DEAN' },
  { n: 8, title: 'Sandcastles', excerpt: 'PIANO BY VINCENT BERRY II / SYNTHS BY JACK CHAMBAZYAN / SYNTH ARRANGEMENT BY BOOTS' },
  { n: 9, title: 'Forward', excerpt: 'PRODUCED BY JAMES BLAKE AND BEYONCÉ / VOCAL PRODUCTION BY BEYONCÉ / PIANO BY JAMES BLAKE' },
  { n: 10, title: 'Freedom', excerpt: 'CONTAINS A SAMPLE OF “STEWBALL,” PERFORMED BY PRISONER “22” AT MISSISSIPPI STATE PENITENTIARY AT PARCHMAN, RECORDED IN 1947 BY ALAN LOMAX AND JOHN LOMAX SR.' },
  { n: 11, title: 'All Night', excerpt: 'CONTAINS ELEMENTS OF “SPOTTIEOTTIEDOPALISCIOUS” WRITTEN BY ANDRE BENJAMIN, PATRICK BROWN AND ANTWAN PATTON' },
  { n: 12, title: 'Formation', excerpt: 'ADLIBS BY SWAE LEE OF RAE SREMMURD / ADDITIONAL BACKGROUND ADLIBS BY BIG FREEDIA / TRUMPET BY MATT DOE' },
];

const response = await fetch(FETCH_URL, {
  redirect: 'follow',
  headers: {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,*/*;q=0.1',
  },
  signal: AbortSignal.timeout(60000),
});
const bytes = Buffer.from(await response.arrayBuffer());
if (!response.ok) throw new Error(`Wayback snapshot fetch failed: HTTP ${response.status}`);
const contentType = response.headers.get('content-type') || 'text/html';
const contentEncoding = response.headers.get('content-encoding');
const fetchedResponseSha256 = createHash('sha256').update(bytes).digest('hex');
const decodedBytes = decodeResponseBytes(bytes, contentEncoding);
const html = decodedBytes.toString(isUtf8(decodedBytes) ? 'utf8' : 'latin1');
const converted = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], {
  input: html,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (converted.status !== 0) throw new Error(`pandoc HTML extraction failed: ${converted.stderr || `exit ${converted.status}`}`);
const retainedText = normalizeEvidenceText(converted.stdout);
if (!retainedText) throw new Error('Wayback response produced no extractable text.');

const located = tracks.map((track) => {
  const exact = normalizeEvidenceText(track.excerpt);
  const start = retainedText.indexOf(exact);
  if (start < 0) throw new Error(`Exact official-credit excerpt missing for ${track.title}: ${exact}`);
  return { ...track, excerpt: retainedText.slice(start, start + exact.length), start, end: start + exact.length };
});

const artifact = createSourceArtifact({
  canonicalUrl: CANONICAL_URL,
  finalUrl: FETCH_URL,
  retrievedAt: new Date().toISOString(),
  httpStatus: response.status,
  contentType,
  contentEncoding,
  collector: { identity: 'albumvault-http-collector', version: '1.0.0', runId: COLLECTOR_RUN_ID },
  collectionMethod: 'archive-http-fetch',
  fetchedResponseSha256,
  normalizationVersion: 'nfkc-whitespace-v1',
  retainedText,
  window: { kind: 'complete-source', start: 0, end: retainedText.length, fetchedTextLength: retainedText.length, completeSource: true },
});
const created = await writeSourceArtifact(artifactDir, artifact);
const report = {
  schemaVersion: 1,
  albumId: ALBUM_ID,
  collectorRunId: COLLECTOR_RUN_ID,
  collectedAt: new Date().toISOString(),
  snapshotProvenance: { kind: 'wayback-snapshot', timestamp: SNAPSHOT_TIMESTAMP, canonicalUrl: CANONICAL_URL, fetchUrl: FETCH_URL },
  results: [{
    canonicalUrl: CANONICAL_URL,
    fetchUrl: FETCH_URL,
    finalUrl: artifact.finalUrl,
    status: 'collected',
    artifactId: artifact.artifactId,
    created,
    fetchedResponseSha256,
    contentType,
    retainedCharacters: retainedText.length,
    claims: located.map((item) => ({
      albumId: ALBUM_ID,
      discNumber: 1,
      trackNumber: item.n,
      trackTitle: item.title,
      retainedExtract: item.excerpt,
      section: { kind: 'character-offsets', start: item.start, end: item.end },
    })),
  }],
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, artifactId: artifact.artifactId, fetchedResponseSha256, snapshotTimestamp: SNAPSHOT_TIMESTAMP, tracks: located.length, created }));

function decodeResponseBytes(input, header) {
  const encoding = (header ?? '').split(',')[0].trim().toLowerCase();
  if (!encoding || encoding === 'identity') return input;
  const decompress = { gzip: gunzipSync, 'x-gzip': gunzipSync, deflate: inflateSync, br: brotliDecompressSync, zstd: zstdDecompressSync }[encoding];
  if (!decompress) throw new Error(`Unsupported content encoding: ${header}`);
  try { return decompress(input); } catch { return input; }
}

// Collect rank-31 evidence from Wikipedia's Kind of Blue article, whose formal
// descriptions explicitly attribute the underlying information to Bill Evans'
// original liner notes. One exact description is retained for each catalog track.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '031-miles-davis-kind-of-blue-2148074c';
const CANONICAL_URL = 'https://en.wikipedia.org/wiki/Kind_of_Blue';
const COLLECTOR_RUN_ID = 'rank31-kind-of-blue-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const artifactDir = path.resolve('src/data/track-encyclopedia/source-artifacts');
const reportPath = process.argv[2] || 'reports/rank31-kind-of-blue-source-collection.json';
const tracks = [
  { n: 1, title: 'So What', excerpt: '"So What" consists of two modes: sixteen measures of the first, followed by eight measures of the second, and then eight again of the first.' },
  { n: 2, title: 'Freddie Freeloader', excerpt: '"Freddie Freeloader" is a standard twelve-bar blues form.' },
  { n: 3, title: 'Blue In Green', excerpt: '"Blue in Green" consists of a ten-measure cycle following a short four-measure introduction.' },
  { n: 4, title: 'All Blues', excerpt: '"All Blues" is a twelve-bar blues form in 6 8 time.' },
  { n: 5, title: 'Flamenco Sketches', excerpt: '"Flamenco Sketches" consists of five scales, which are each played "as long as the soloist wishes until he has completed the series".' },
];

const response = await fetch(CANONICAL_URL, {
  redirect: 'follow',
  headers: {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
    'accept-language': 'en-US,en;q=0.9',
    accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
  },
  signal: AbortSignal.timeout(45000),
});
const bytes = Buffer.from(await response.arrayBuffer());
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const fetchedResponseSha256 = createHash('sha256').update(bytes).digest('hex');
const html = bytes.toString(isUtf8(bytes) ? 'utf8' : 'latin1');
const converted = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], {
  input: html,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (converted.status !== 0) throw new Error(`pandoc HTML extraction failed: ${converted.stderr || `exit ${converted.status}`}`);
const normalized = normalizeEvidenceText(converted.stdout);
if (!normalized) throw new Error('Fetched response produced no extractable text.');
const located = tracks.map((track) => {
  const excerpt = normalizeEvidenceText(track.excerpt);
  const start = normalized.indexOf(excerpt);
  if (start < 0) throw new Error(`Exact excerpt missing from fetched response: ${track.title}`);
  return { ...track, excerpt: normalized.slice(start, start + excerpt.length), start, end: start + excerpt.length };
});
let start = Math.max(0, Math.min(...located.map((item) => item.start)) - CONTEXT_RADIUS);
let end = Math.min(normalized.length, Math.max(...located.map((item) => item.end)) + CONTEXT_RADIUS);
while (start < end && normalized[start] === ' ') start += 1;
while (end > start && normalized[end - 1] === ' ') end -= 1;
const retainedText = normalized.slice(start, end);
const artifact = createSourceArtifact({
  canonicalUrl: CANONICAL_URL,
  finalUrl: canonicalizeSourceUrl(response.url),
  retrievedAt: new Date().toISOString(),
  httpStatus: response.status,
  contentType: response.headers.get('content-type') || 'application/octet-stream',
  contentEncoding: response.headers.get('content-encoding'),
  collector: { identity: 'albumvault-http-collector', version: '1.0.0', runId: COLLECTOR_RUN_ID },
  collectionMethod: 'http-fetch',
  fetchedResponseSha256,
  normalizationVersion: 'nfkc-whitespace-v1',
  retainedText,
  window: { kind: 'character-offsets', start, end, fetchedTextLength: normalized.length, completeSource: false },
});
await writeSourceArtifact(artifactDir, artifact);
const result = {
  canonicalUrl: CANONICAL_URL,
  finalUrl: artifact.finalUrl,
  status: 'collected',
  httpStatus: response.status,
  checkedAt: '2026-09-03',
  artifactId: artifact.artifactId,
  fetchedResponseSha256,
  contentType: artifact.contentType,
  retainedCharacters: retainedText.length,
  fetchedCharacters: normalized.length,
  claims: located.map((item) => ({
    albumId: ALBUM_ID,
    discNumber: 1,
    trackNumber: item.n,
    trackTitle: item.title,
    factIndex: 0,
    refIndex: 0,
    retainedExtract: item.excerpt,
    section: { kind: 'character-offsets', start: item.start - start, end: item.end - start },
  })),
};
await writeFile(reportPath, `${JSON.stringify({ schemaVersion: 1, collectorRunId: COLLECTOR_RUN_ID, collectedAt: new Date().toISOString(), results: [result] }, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, artifactId: artifact.artifactId, fetchedResponseSha256, claims: result.claims.length }));

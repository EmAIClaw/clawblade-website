// Collect rank-27 Enter the Wu-Tang (36 Chambers) evidence from fetched
// Wikipedia source bodies and a primary RZA interview published by The Face.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '027-wu-tang-clan-enter-the-wu-tang-36-chambers-bd9ce00b';
const COLLECTOR_RUN_ID = 'rank27-wutang-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank27-wutang-source-collection.json';

const SOURCES = {
  album: { canonicalUrl: 'https://en.wikipedia.org/wiki/Enter_the_Wu-Tang_(36_Chambers)' },
  canitbe: { canonicalUrl: 'https://en.wikipedia.org/wiki/Can_It_Be_All_So_Simple' },
  methodman: { canonicalUrl: 'https://en.wikipedia.org/wiki/Method_Man_(song)' },
  chessboxin: { canonicalUrl: 'https://en.wikipedia.org/wiki/Da_Mystery_of_Chessboxin%27' },
  cream: { canonicalUrl: 'https://en.wikipedia.org/wiki/C.R.E.A.M.' },
  protect: { canonicalUrl: 'https://en.wikipedia.org/wiki/Protect_Ya_Neck' },
  theface: {
    canonicalUrl: 'https://theface.com/music/rza-interview-wu-tang-clan-final-tour-london',
    fetchUrl: 'https://web.archive.org/web/20260411024618/https://theface.com/music/rza-interview-wu-tang-clan-final-tour-london',
    collectionMethod: 'archive-http-fetch',
    snapshotTimestamp: '20260411024618',
  },
};

const tracks = [
  { n: 1, disc: 1, title: "Shame On a Nuh (feat. Raekwon, Ol' Dirty Bastard & Method Man)", source: 'theface',
    excerpt: 'And he goes and do that shit in one fucking take, bro.' },
  { n: 2, disc: 1, title: 'Clan In Da Front (feat. RZA & GZA)', source: 'album',
    excerpt: 'With the exception of "Method Man" and GZA\'s "Clan in da Front", every song features multiple rappers contributing verses of varying lengths.' },
  { n: 3, disc: 1, title: 'Can It Be All So Simple (Radio Edit)', source: 'canitbe',
    excerpt: 'It features production from RZA (credited as Prince Rakeem) that samples Gladys Knight & the Pips\' cover of "The Way We Were".' },
  { n: 4, disc: 1, title: 'Method Man (feat. Method Man, Raekwon, GZA, RZA & Ghostface Killah)', source: 'methodman',
    excerpt: 'Method Man wrote his rhymes after hearing Michael Jackson\'s cover of "Come Together" by the Beatles, which he based half of the hook on.' },
  { n: 5, disc: 1, title: "Da Mystery of Chessboxin' (feat. Method Man, U-God, Inspectah Deck, Raekwon, Ol' Dirty Bastard, Ghostface Killah & Masta Killa) [Radio Edit]", source: 'chessboxin',
    excerpt: 'Masta Killa wrote his first rhyme ever on the song.' },
  { n: 6, disc: 1, title: "Wu-Tang Clan Ain't Nuthing Ta F' Wit (feat. RZA, Inspectah Deck & Method Man)", source: 'album',
    excerpt: 'Method Man is co-credited for "Wu-Tang Clan Ain\'t Nuthing ta F\' Wit"' },
  { n: 7, disc: 1, title: 'C.R.E.A.M. (feat. Method Man, Raekwon, Inspectah Deck & Buddha Monk)', source: 'cream',
    excerpt: 'The song was originally titled "Lifestyles of the Mega-Rich".' },
  { n: 8, disc: 1, title: "Protect Ya Neck (feat. RZA, Method Man, Inspectah Deck, Raekwon, U-God, Ol' Dirty Bastard, Ghostface Killah & GZA)", source: 'protect',
    excerpt: 'The song was originally recorded over a different beat and the verses in a different order before producer RZA decided to rearrange them and change the beat.' },
  { n: 9, disc: 1, title: 'Tearz (feat. RZA & Ghostface Killah)', source: 'album',
    excerpt: '"Tearz" tells two stories: RZA\'s little brother getting shot and Ghostface Killah recounting the story of a man who contracts HIV after having unprotected sex.' },
];

const results = [];
for (const [sourceKey, source] of Object.entries(SOURCES)) {
  const sourceTracks = tracks.filter((track) => track.source === sourceKey);
  const canonicalUrl = source.canonicalUrl;
  const fetchUrl = source.fetchUrl ?? canonicalUrl;
  try {
    const response = await fetch(fetchUrl, {
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
    const extracted = extractHtml(html, canonicalUrl);
    const normalized = normalizeEvidenceText(extracted);
    if (!normalized) throw new Error('Fetched response produced no extractable text.');

    const located = [];
    for (const track of sourceTracks) {
      const authoredExcerpt = normalizeEvidenceText(track.excerpt);
      const span = locateExactOrTypographyEquivalent(normalized, authoredExcerpt);
      if (!span) throw new Error(`Exact excerpt missing from fetched response: ${track.title}`);
      located.push({ ...track, excerpt: span.excerpt, start: span.start, end: span.end });
    }

    const contextRadius = sourceKey === 'theface' ? 3500 : CONTEXT_RADIUS;
    let start = Math.max(0, Math.min(...located.map((item) => item.start)) - contextRadius);
    let end = Math.min(normalized.length, Math.max(...located.map((item) => item.end)) + contextRadius);
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
      collectionMethod: source.collectionMethod ?? 'http-fetch',
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
    results.push({
      canonicalUrl,
      fetchUrl,
      finalUrl: artifact.finalUrl,
      provenance: source.snapshotTimestamp ? 'snapshot' : 'live',
      snapshotTimestamp: source.snapshotTimestamp,
      status: 'collected',
      artifactId: artifact.artifactId,
      created,
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

function extractHtml(html, canonicalUrl) {
  const fragment = canonicalUrl.includes('wikipedia.org') ? (extractParserOutputFragment(html) ?? html) : html;
  const result = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: fragment, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`pandoc HTML extraction failed: ${result.stderr || `exit ${result.status}`}`);
  return result.stdout;
}

function extractParserOutputFragment(html) {
  const marker = 'class="mw-content-ltr mw-parser-output"';
  let index = html.indexOf(marker);
  if (index < 0) index = html.indexOf('mw-parser-output');
  if (index < 0) return null;
  const open = html.lastIndexOf('<div', index);
  if (open < 0) return null;
  let depth = 0;
  let cursor = open;
  while (cursor < html.length) {
    if (html.startsWith('<div', cursor)) { depth += 1; cursor += 4; }
    else if (html.startsWith('</div>', cursor)) {
      depth -= 1;
      cursor += 6;
      if (depth === 0) return html.slice(open, cursor);
    } else cursor += 1;
  }
  return null;
}

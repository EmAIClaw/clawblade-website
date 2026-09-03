// Collect the rank-20 Kid A source artifacts from fetched sources:
//   - Wikipedia "Kid A" (track annotations for 9 of 11 tracks)
//   - Songfacts "In Limbo" (track 7 In Limbo original title)
//   - Citizen Insane "Untitled" (track 11 hidden track official name)
// Mirrors scripts/collect-rank19-tpab-evidence.mjs core logic, scoped to three
// canonical URLs, using http-fetch + pandoc HTML extraction (the same trusted
// albumvault-http-collector path used by ranks 9/10/11/13/14/15/16/17/18/19).
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '020-radiohead-kid-a-ce842ff2';
const COLLECTOR_RUN_ID = 'rank20-kid-a-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank20-kid-a-source-collection.json';

// Three canonical sources. Each documented track maps to one source and one
// verbatim excerpt (a contiguous substring of the pandoc-extracted text).
const SOURCES = {
  album: {
    canonicalUrl: 'https://en.wikipedia.org/wiki/Kid_A',
  },
  songfacts: {
    canonicalUrl: 'https://www.songfacts.com/facts/radiohead/in-limbo',
  },
  citizeninsane: {
    canonicalUrl: 'https://citizeninsane.eu/music/kam/untitled.html',
  },
};

// Each documented track: { n, disc, title, source, excerpt }.
// Excerpts are verbatim contiguous substrings of the pandoc-extracted text.
const tracks = [
  { n: 1, disc: 1, title: 'Everything In Its Right Place', source: 'album',
    excerpt: 'Yorke wrote "Everything in Its Right Place" about the depression he experienced on the OK Computer tour, feeling he could not speak.' },
  { n: 2, disc: 1, title: 'Kid A', source: 'album',
    excerpt: 'his vocals on the title track were spoken, then vocoded with the ondes Martenot to create the melody.' },
  { n: 3, disc: 1, title: 'The National Anthem', source: 'album',
    excerpt: 'Yorke wrote an early version of "The National Anthem" when the band was still in school.' },
  { n: 4, disc: 1, title: 'How to Disappear Completely', source: 'album',
    excerpt: 'The strings on "How to Disappear Completely" were performed by the Orchestra of St John\'s and recorded in Dorchester Abbey, a 12th-century church about five miles from Radiohead\'s Oxfordshire studio.' },
  { n: 5, disc: 1, title: 'Treefingers', source: 'album',
    excerpt: '"Treefingers", an ambient instrumental, was created by digitally processing O\'Brien\'s guitar loops.' },
  { n: 6, disc: 1, title: 'Optimistic', source: 'album',
    excerpt: 'The refrain of "Optimistic" ("try the best you can / the best you can is good enough") was an assurance by Yorke\'s partner, Rachel Owen, when Yorke was frustrated with the band\'s progress.' },
  { n: 7, disc: 1, title: 'In Limbo', source: 'songfacts',
    excerpt: 'The original title was "Lost At Sea."' },
  { n: 8, disc: 1, title: 'Idioteque', source: 'album',
    excerpt: '"Idioteque" was built from a drum machine pattern Greenwood created with a modular synthesiser.' },
  { n: 9, disc: 1, title: 'Morning Bell', source: 'album',
    excerpt: '"Morning Bell" features repeated contrasting lines such as "Where\'d you park the car?" and "Cut the kids in half".' },
  { n: 10, disc: 1, title: 'Motion Picture Soundtrack', source: 'album',
    excerpt: '"Motion Picture Soundtrack" was written before Radiohead\'s debut single, "Creep" (1992)' },
  { n: 11, disc: 1, title: 'Untitled', source: 'citizeninsane',
    excerpt: '"Untitled" is the official name for the instrumental hidden track after "Motion Picture Soundtrack".' },
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
    const extracted = extractHtml(html, sourceKey);
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

// Extract the article body fragment (Wikipedia only), then pandoc it to plain
// text. Non-Wikipedia sources are pandoc'd whole.
function extractHtml(html, sourceKey) {
  const fragment = sourceKey === 'album' ? (extractParserOutputFragment(html) ?? html) : html;
  const temp = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: fragment, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (temp.status !== 0) throw new Error(`pandoc HTML extraction failed: ${temp.stderr || `exit ${temp.status}`}`);
  return { text: temp.stdout, pages: [] };
}

function extractParserOutputFragment(html) {
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

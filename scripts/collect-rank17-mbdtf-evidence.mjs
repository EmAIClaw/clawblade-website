// Collect the rank-17 My Beautiful Dark Twisted Fantasy source artifacts from
// three fetched sources:
//   - Wikipedia "My Beautiful Dark Twisted Fantasy" (track annotations, samples)
//   - Wikipedia "All of the Lights" (interlude + song recording detail)
//   - Wikipedia "See Me Now" (disc-2 iTunes bonus track)
// Mirrors scripts/collect-rank16-london-calling-evidence.mjs core logic, scoped to
// three canonical URLs, using http-fetch + pandoc HTML extraction (the same
// trusted albumvault-http-collector path used by ranks 9/10/11/13/14/15/16).
//
// NOTE: the MBDTF album article's HTML nests the infobox inside the parser-output
// div in a way that makes pandoc's --to=plain truncate at the infobox. We extract
// the mw-parser-output div fragment first, then pandoc it, so the full article
// body (including the "Songs" track annotations) is retained.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '017-kanye-west-my-beautiful-dark-twisted-fantasy-6d18b087';
const COLLECTOR_RUN_ID = 'rank17-mbdtf-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank17-mbdtf-source-collection.json';

// Three canonical sources. Each documented track maps to one source and one
// verbatim excerpt (a contiguous substring of the pandoc-extracted text).
const SOURCES = {
  album: {
    canonicalUrl: 'https://en.wikipedia.org/wiki/My_Beautiful_Dark_Twisted_Fantasy',
  },
  allofthelights: {
    canonicalUrl: 'https://en.wikipedia.org/wiki/All_of_the_Lights',
  },
  seemenow: {
    canonicalUrl: 'https://en.wikipedia.org/wiki/See_Me_Now',
  },
};

// Each documented track: { n, disc, title, source, excerpt }.
// Excerpts are verbatim contiguous substrings of the pandoc-extracted text.
const tracks = [
  { n: 1, disc: 1, title: 'Dark Fantasy', source: 'album',
    excerpt: 'The album begins with "Dark Fantasy", opened by rapper Nicki Minaj narrating a rework of Roald Dahl\'s 1982 poem Cinderella,' },
  { n: 2, disc: 1, title: 'Gorgeous (feat. Kid Cudi & Raekwon)', source: 'album',
    excerpt: '"Gorgeous" is an uplifting blues-styled track,' },
  { n: 3, disc: 1, title: 'Power', source: 'album',
    excerpt: '"Power" features a dark production that relies on a sample of King Crimson\'s "21st Century Schizoid Man" (1969),' },
  { n: 4, disc: 1, title: 'All of the Lights (Interlude)', source: 'allofthelights',
    excerpt: 'It is often played along with its accompanying interlude "All of the Lights (Interlude)", which precedes the song on the album\'s tracklist.' },
  { n: 5, disc: 1, title: 'All of the Lights', source: 'album',
    excerpt: 'West enlisted 11 guest vocalists for the song, including Alicia Keys, John Legend, Tony Williams, and Elly Jackson; Rihanna sings the hook.' },
  { n: 6, disc: 1, title: 'Monster (feat. JAŸ-Z, Rick Ross, Nicki Minaj & Bon Iver)', source: 'album',
    excerpt: '"Monster" is a posse cut,' },
  { n: 7, disc: 1, title: 'So Appalled (feat. JAŸ-Z, Pusha T, Prynce Cy Hi, Swizz Beatz & RZA)', source: 'album',
    excerpt: 'The fellow posse cut "So Appalled" is built around piano and strings,' },
  { n: 8, disc: 1, title: 'Devil In a New Dress (feat. Rick Ross)', source: 'album',
    excerpt: '"Devil in a New Dress" is built on a sample of Smokey Robinson\'s "Will You Love Me Tomorrow" (1960).' },
  { n: 9, disc: 1, title: 'Runaway (feat. Pusha T)', source: 'album',
    excerpt: '"Runaway" contains a piano-based motif comprising a series of uninterrupted descending half and whole notes,' },
  { n: 10, disc: 1, title: 'Hell of a Life', source: 'album',
    excerpt: 'Inspired by West\'s two-year relationship with model Amber Rose, "Hell of a Life" samples the Mojo Men\'s "She\'s My Baby" (1966)' },
  { n: 11, disc: 1, title: 'Blame Game (feat. John Legend)', source: 'album',
    excerpt: '"Blame Game" is a low-key track that is built around a sample of Richard D. James\'s piano composition "Avril 14th" (2001),' },
  { n: 12, disc: 1, title: 'Lost In the World (feat. Bon Iver)', source: 'album',
    excerpt: '"Lost in the World" features tribal drums and prominent samples from the indie folk band Bon Iver\'s "Woods" (2009),' },
  { n: 13, disc: 1, title: 'Who Will Survive In America', source: 'album',
    excerpt: 'It serves as the album\'s coda and samples jazz poet Gil Scott-Heron\'s "Comment No. 1" (1970),' },
  { n: 1, disc: 2, title: 'See Me Now (feat. Beyoncé, Charlie Wilson & Big Sean) [Bonus Track]', source: 'seemenow',
    excerpt: 'The album version includes a verse by Big Sean and is included on West\'s fifth studio album My Beautiful Dark Twisted Fantasy (2010) as an iTunes Store bonus track.' },
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
    const extracted = extractHtml(html);
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

// Extract the mw-parser-output article body fragment, then pandoc it to plain
// text. This avoids pandoc truncating at the nested infobox on the MBDTF page.
function extractHtml(html) {
  const fragment = extractParserOutputFragment(html) ?? html;
  const temp = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: fragment, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (temp.status !== 0) throw new Error(`pandoc HTML extraction failed: ${temp.stderr || `exit ${temp.status}`}`);
  return { text: temp.stdout, pages: [] };
}

function extractParserOutputFragment(html) {
  // The main article body is the div carrying class "mw-content-ltr mw-parser-output".
  // (A separate "mw-parser-output" div wraps the good-article indicator and must be skipped.)
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

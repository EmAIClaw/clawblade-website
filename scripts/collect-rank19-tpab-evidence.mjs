// Collect the rank-19 To Pimp a Butterfly source artifacts from fetched sources:
//   - Wikipedia "To Pimp a Butterfly" (track annotations for 15 of 16 tracks)
//   - Stereogum "Who's Who On Kendrick Lamar's To Pimp A Butterfly" (You Ain't Gotta Lie)
// Mirrors scripts/collect-rank18-highway-61-evidence.mjs core logic, scoped to two
// canonical URLs, using http-fetch + pandoc HTML extraction (the same trusted
// albumvault-http-collector path used by ranks 9/10/11/13/14/15/16/17/18).
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '019-kendrick-lamar-to-pimp-a-butterfly-0dd5449a';
const COLLECTOR_RUN_ID = 'rank19-tpab-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank19-tpab-source-collection.json';

// Two canonical sources. Each documented track maps to one source and one
// verbatim excerpt (a contiguous substring of the pandoc-extracted text).
const SOURCES = {
  album: {
    canonicalUrl: 'https://en.wikipedia.org/wiki/To_Pimp_a_Butterfly',
  },
  stereogum: {
    canonicalUrl: 'https://stereogum.com/1788180/whos-who-on-kendrick-lamars-to-pimp-a-butterfly/columns/sounding-board',
  },
};

// Each documented track: { n, disc, title, source, excerpt }.
// Excerpts are verbatim contiguous substrings of the pandoc-extracted text.
const tracks = [
  { n: 1, disc: 1, title: "Wesley's Theory (feat. George Clinton & Thundercat)", source: 'album',
    excerpt: 'opening track "Wesley\'s Theory" is a reference to Wesley Snipes and how the actor was jailed for tax evasion;' },
  { n: 2, disc: 1, title: 'For Free? (Interlude)', source: 'album',
    excerpt: '"For Free? (Interlude)" sees Lamar rapping in a dense, spoken word-esque manner with musical accompaniment by jazz pianist Robert Glasper.' },
  { n: 3, disc: 1, title: 'King Kunta', source: 'album',
    excerpt: '"King Kunta" is concerned with the "history of negative stereotypes all African-Americans have to reconcile".' },
  { n: 4, disc: 1, title: 'Institutionalized (feat. Bilal, Anna Wise & Snoop Dogg)', source: 'album',
    excerpt: 'Singer Bilal features on the songs "Institutionalized" and "These Walls", and has provided uncredited backing vocals on the songs "U", "For Sale? (Interlude)", "Momma" and "Hood Politics".' },
  { n: 5, disc: 1, title: 'These Walls (feat. Bilal, Anna Wise & Thundercat)', source: 'album',
    excerpt: '"These Walls" has been described by Billboard as "pondering sex and existence in equal measure; it\'s a yoni metaphor about the power of peace, with sugar walls being escape and real walls being obstacles."' },
  { n: 6, disc: 1, title: 'u', source: 'album',
    excerpt: 'Lamar revealed that "U" was inspired by his own experience of depression and suicidal thoughts.' },
  { n: 7, disc: 1, title: 'Alright', source: 'album',
    excerpt: '"Alright" begins as a spoken-word treatise before exploding into a shapeshifting portrait of America that brings in jazz horns, skittering drum beats and Lamar\'s mellifluous rapping as he struggles with troubles and temptations.' },
  { n: 8, disc: 1, title: 'For Sale? (Interlude)', source: 'album',
    excerpt: 'Lotus had produced a version of "For Sale? (Interlude)" that was ultimately discarded, with Lamar using Taz Arnold\'s version of the song on the album instead.' },
  { n: 9, disc: 1, title: 'Momma', source: 'album',
    excerpt: 'The instrumental of "Momma" was originally released as "So[Rt]" by Knxwledge.' },
  { n: 10, disc: 1, title: 'Hood Politics', source: 'album',
    excerpt: '"Hood Politics" contains a sample of "All for Myself", written and performed by Sufjan Stevens.' },
  { n: 11, disc: 1, title: 'How Much a Dollar Cost (feat. James Fauntleroy & Ronald Isley)', source: 'album',
    excerpt: 'Isley also performed on the song "How Much a Dollar Cost" alongside the singer-songwriter James Fauntleroy.' },
  { n: 12, disc: 1, title: 'Complexion (A Zulu Love) [feat. Rapsody]', source: 'album',
    excerpt: 'American rapper Rapsody appeared on the album, contributing a verse to the song "Complexion (A Zulu Love)".' },
  { n: 13, disc: 1, title: 'The Blacker the Berry', source: 'album',
    excerpt: '"The Blacker the Berry" features a "boom bap beat" and lyrics that celebrate Lamar\'s African-American heritage and "tackle hatred, racism, and hypocrisy head on."' },
  { n: 14, disc: 1, title: "You Ain't Gotta Lie (Momma Said)", source: 'stereogum',
    excerpt: 'background vocals on "Alright" and "You Ain\'t Gotta Lie (Momma Said)"' },
  { n: 15, disc: 1, title: 'i', source: 'album',
    excerpt: 'The album\'s lead single, titled "I", was produced by Rahki, who also produced a song for the album entitled "Institutionalized".' },
  { n: 16, disc: 1, title: 'Mortal Man', source: 'album',
    excerpt: 'In the final track of the album, the 12-minute song "Mortal Man", Lamar reflects on everything he has explored throughout the album.' },
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

// Extract the article body fragment, then pandoc it to plain text.
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
